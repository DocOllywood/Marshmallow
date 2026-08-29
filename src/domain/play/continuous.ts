import {
  CONTINUOUS_EXPERIMENT_CATALOG,
  isContinuousCatalogRound,
  isExcludedFromContinuousInventory,
} from "@/domain/content/continuous-experiments";
import { DAILY_ROUND_SIZE } from "@/domain/daily/round";

export type ContinuousRoundMarshmallow = {
  id: string;
  dailyRoundId: string;
  roundPosition: number;
  status: string;
  opensAt: string;
  closesAt: string;
};

export type ContinuousRoundUserState = {
  roundId: string;
  sealedCount: number;
  sealedMarshmallowIds: ReadonlySet<string>;
};

export function isContinuousRoundPlayableNow(
  marshmallows: readonly ContinuousRoundMarshmallow[],
  nowMs = Date.now(),
): boolean {
  if (marshmallows.length < DAILY_ROUND_SIZE) return false;
  return marshmallows.every((item) => {
    if (item.status !== "open") return false;
    const closes = Date.parse(item.closesAt);
    if (!Number.isNaN(closes) && nowMs >= closes) return false;
    const opens = Date.parse(item.opensAt);
    if (!Number.isNaN(opens) && nowMs < opens) return false;
    return true;
  });
}

export function continuousRoundSealedCount(
  marshmallows: readonly ContinuousRoundMarshmallow[],
  sealedMarshmallowIds: ReadonlySet<string>,
): number {
  return marshmallows.filter((item) => sealedMarshmallowIds.has(item.id)).length;
}

export function isContinuousRoundComplete(
  marshmallows: readonly ContinuousRoundMarshmallow[],
  sealedMarshmallowIds: ReadonlySet<string>,
): boolean {
  return continuousRoundSealedCount(marshmallows, sealedMarshmallowIds) >= DAILY_ROUND_SIZE;
}

export function continuousCurrentPlayMarshmallowId(
  marshmallows: readonly ContinuousRoundMarshmallow[],
  sealedMarshmallowIds: ReadonlySet<string>,
): string | null {
  const sorted = [...marshmallows].sort((a, b) => a.roundPosition - b.roundPosition);
  const next = sorted.find(
    (item) => item.status === "open" && !sealedMarshmallowIds.has(item.id),
  );
  return next?.id ?? sorted.find((item) => item.roundPosition === 1)?.id ?? null;
}

export function pickEligibleContinuousRoundId(input: {
  marshmallowsByRound: ReadonlyMap<string, readonly ContinuousRoundMarshmallow[]>;
  userStates: ReadonlyMap<string, ContinuousRoundUserState>;
  excludeRoundIds?: readonly string[];
  nowMs?: number;
}): string | null {
  const exclude = new Set(input.excludeRoundIds ?? []);
  const nowMs = input.nowMs ?? Date.now();

  for (const entry of CONTINUOUS_EXPERIMENT_CATALOG) {
    if (exclude.has(entry.roundId)) continue;
    if (isExcludedFromContinuousInventory(entry.roundId)) continue;

    const marshmallows = input.marshmallowsByRound.get(entry.roundId);
    if (!marshmallows || !isContinuousRoundPlayableNow(marshmallows, nowMs)) continue;

    const state = input.userStates.get(entry.roundId);
    const sealedIds = state?.sealedMarshmallowIds ?? new Set<string>();
    if (isContinuousRoundComplete(marshmallows, sealedIds)) continue;

    return entry.roundId;
  }

  return null;
}

export function isContinuousPlaySurface(
  roundId: string | null | undefined,
  featuredDailyRoundId: string | null | undefined,
): boolean {
  if (!roundId || !isContinuousCatalogRound(roundId)) return false;
  if (featuredDailyRoundId && roundId === featuredDailyRoundId) return false;
  return true;
}

export type EntrySurface = "daily" | "continuous";

export function resolveEntrySurface(
  roundId: string | null | undefined,
  featuredDailyRoundId: string | null | undefined,
): EntrySurface | null {
  if (!roundId) return null;
  if (isContinuousPlaySurface(roundId, featuredDailyRoundId)) return "continuous";
  return "daily";
}

/** Expected RLS/auth boundaries when optional continuous inventory is unavailable. */
export function isContinuousInventoryAccessError(error: unknown): boolean {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "object" &&
          error !== null &&
          "message" in error &&
          typeof (error as { message: unknown }).message === "string"
        ? (error as { message: string }).message
        : null;

  if (!message) return false;

  const lower = message.toLowerCase();
  return (
    lower.includes("permission denied for table entries") ||
    lower.includes("permission denied for table daily_rounds") ||
    lower.includes("42501")
  );
}
