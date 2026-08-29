import { LAUNCH_MONEY_DAILY_ROUND_ID } from "@/domain/content/launch-money-daily";
import { MONEY_WEEK_DAYS } from "@/domain/content/money-week";
import type { ExperimentArchetype } from "@/domain/daily/experiment";

/** Price QA round — safe for always-on play; not Day 1 or Money Week editorial. */
export const PRICE_QA_CONTINUOUS_ROUND_ID = "40000000-0000-4000-8000-000000000008";
export const PRICE_QA_Q1_MARSHMALLOW_ID = "31000000-0000-4000-8000-000000000040";

/** Sentinel calendar slot — continuous inventory must never occupy a real Daily date. */
export const PRICE_QA_CONTINUOUS_ROUND_DATE = "2099-12-31";

/** Long-lived lifecycle for always-available play (migration 20260829240000). */
export const PRICE_QA_CONTINUOUS_LIFECYCLE = {
  opensAt: "2026-08-29T00:00:00.000Z",
  closesAt: "2099-12-31T00:00:00.000Z",
  revealsAt: "2099-12-31T23:59:59.000Z",
  hardRevealsAt: "2099-12-31T23:59:59.000Z",
} as const;

export type ContinuousExperimentCatalogEntry = {
  roundId: string;
  q1MarshmallowId: string;
  homeHeadline: string;
  homeTeaser: string;
  archetype: ExperimentArchetype;
};

/** Explicit allowlist — never infer from DB promotions or round_date. */
export const CONTINUOUS_EXPERIMENT_CATALOG: readonly ContinuousExperimentCatalogEntry[] = [
  {
    roundId: PRICE_QA_CONTINUOUS_ROUND_ID,
    q1MarshmallowId: PRICE_QA_Q1_MARSHMALLOW_ID,
    homeHeadline: "Would you sell what you promised to keep?",
    homeTeaser: "One situation. Five changes. Find your line.",
    archetype: "price",
  },
] as const;

const EXCLUDED_CONTINUOUS_ROUND_IDS = new Set<string>([
  LAUNCH_MONEY_DAILY_ROUND_ID,
  ...MONEY_WEEK_DAYS.map((day) => day.roundId),
]);

export function isContinuousCatalogRound(roundId: string | null | undefined): boolean {
  if (!roundId) return false;
  return CONTINUOUS_EXPERIMENT_CATALOG.some((entry) => entry.roundId === roundId);
}

export function isExcludedFromContinuousInventory(roundId: string): boolean {
  return EXCLUDED_CONTINUOUS_ROUND_IDS.has(roundId);
}

export function continuousCatalogEntry(
  roundId: string,
): ContinuousExperimentCatalogEntry | null {
  return CONTINUOUS_EXPERIMENT_CATALOG.find((entry) => entry.roundId === roundId) ?? null;
}
