import { compareQuickPriority, isPromotedQuick } from "@/domain/play/rotation";

export const QUICK_DEFAULT_MIN_SAMPLE = 5;
export const QUICK_INVENTORY_WARN_OPEN = 5;
export const HOME_QUICK_VISIBLE = 3;
export const HOME_QUICK_HERO = 1;
export const HOME_QUICK_MORE = 2;
export const HOME_COOKING_VISIBLE = 5;
export const HOME_RECENT_VISIBLE = 5;
export const CONSUMER_QUICK_FALLBACK = 24;
export const QUICK_CLOSE_MINUTES = 3;
export const QUICK_REVEAL_MINUTES = 4;
export const QUICK_HARD_MINUTES = 10;
export const LIVE_DEFAULT_MIN_SAMPLE = 0;
export const DAILY_DEFAULT_MIN_SAMPLE = 0;

export function defaultMinimumSample(mode: "quick" | "live" | "daily"): number {
  if (mode === "quick") return QUICK_DEFAULT_MIN_SAMPLE;
  return 0;
}

export function isReadyToFinalize(input: {
  status: string;
  cancelled: boolean;
  nowMs: number;
  revealsAtMs: number;
  hardRevealsAtMs: number;
  minimumSample: number;
  sealedCount: number;
}): boolean {
  if (input.cancelled || input.status !== "closed") {
    return false;
  }
  if (input.nowMs < input.revealsAtMs) {
    return false;
  }
  if (input.sealedCount >= Math.max(0, input.minimumSample)) {
    return true;
  }
  return input.nowMs >= input.hardRevealsAtMs;
}

export function isWaitingForSample(input: {
  status: string;
  nowMs: number;
  revealsAtMs: number;
  hardRevealsAtMs: number | null;
}): boolean {
  if (input.status !== "closed") {
    return false;
  }
  if (input.nowMs < input.revealsAtMs) {
    return false;
  }
  const hard = input.hardRevealsAtMs ?? input.revealsAtMs;
  return input.nowMs < hard;
}

export function crowdVoiceSubhead(totalVotes: number): string | null {
  if (totalVotes >= 1 && totalVotes <= 4) return "Early crowd";
  if (totalVotes >= 5 && totalVotes < 25) return `${totalVotes} players`;
  return null;
}

export function payoffDelaySeconds(
  sealedAtMs: number,
  openedAtMs: number,
  resultAvailableAtMs: number | null,
): number {
  const start = Math.max(sealedAtMs, resultAvailableAtMs ?? sealedAtMs);
  return Math.max(0, (openedAtMs - start) / 1000);
}

export function quickInventoryWarning(
  openCount: number,
  threshold = QUICK_INVENTORY_WARN_OPEN,
): boolean {
  return openCount < threshold;
}

export function consumerQuickPool<T extends { quick_priority?: number | null }>(
  cards: readonly T[],
): T[] {
  const promoted = cards.filter((card) => isPromotedQuick(card.quick_priority));
  if (promoted.length > 0) {
    return [...promoted].sort(compareQuickPriority);
  }
  return cards.slice(0, CONSUMER_QUICK_FALLBACK);
}

export function visibleHomeQuick<T extends { quick_priority?: number | null }>(
  cards: readonly T[],
  limit = HOME_QUICK_VISIBLE,
): T[] {
  return consumerQuickPool(cards).slice(0, Math.max(0, limit));
}

export function heroHomeQuick<T extends { quick_priority?: number | null }>(
  cards: readonly T[],
): T | undefined {
  return consumerQuickPool(cards)[0];
}

export function moreHomeQuick<T extends { quick_priority?: number | null }>(
  cards: readonly T[],
): T[] {
  return consumerQuickPool(cards).slice(HOME_QUICK_HERO, HOME_QUICK_HERO + HOME_QUICK_MORE);
}
