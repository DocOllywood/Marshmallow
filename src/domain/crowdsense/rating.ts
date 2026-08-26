/**
 * CrowdSense is a Marshmallow forecasting rating.
 *
 * It is not IQ, intelligence, a diagnosis, or a personality score.
 * It is rebuilt only from official per-Marshmallow Accuracy (`scores.accuracy`).
 * Reveal Bonus, streaks, opens, time-in-app, and payments must never enter this formula.
 *
 * ## Adjusted Accuracy (Bayesian shrinkage toward a neutral prior)
 *
 *   adjusted = (PRIOR_WEIGHT × PRIOR_ACCURACY + Σ accuracy) / (PRIOR_WEIGHT + n)
 *
 * Prior (70, weight 5) is an average competent forecast. Early scores cannot
 * dominate; a lucky 100 with a tiny sample is pulled toward 70. Sustained
 * accuracy still wins over high-volume mediocre play.
 *
 * ## Rating map
 *
 *   rating = clamp(round(200 + 8 × adjusted), 500, 1000)
 *
 * Typical behavior:
 *   ~70 adjusted → ~760 (competent band)
 *   ~90 adjusted → ~920 (excellent)
 *   very poor play floors at 500 (never negative)
 *
 * Qualification: n >= 5 for lifetime/category, n >= 3 for the UTC-week board.
 * Unqualified players are Calibrating and are not ranked.
 */
export const CROWDSENSE_PRIOR_ACCURACY = 70;
export const CROWDSENSE_PRIOR_WEIGHT = 5;
export const CROWDSENSE_WEEKLY_PRIOR_WEIGHT = 3;
export const CROWDSENSE_QUALIFYING_SCORES = 5;
export const CROWDSENSE_WEEKLY_QUALIFYING_SCORES = 3;
export const CROWDSENSE_TAGLINE = "How well you read the room.";
export const CROWDSENSE_HEADER_BLURB = "How well you read the room.";
export const CROWDSENSE_MIN = 500;
export const CROWDSENSE_MAX = 1000;

export const CROWDSENSE_WORLD_SLUGS = [
  "love",
  "friendship",
  "dating-sex",
  "family",
  "human-nature",
] as const;

export type CrowdsenseWorldSlug = (typeof CROWDSENSE_WORLD_SLUGS)[number];

export const CROWDSENSE_WORLD_LABELS: Record<CrowdsenseWorldSlug, string> = {
  love: "Love",
  friendship: "Friendship",
  "dating-sex": "Dating & Sex",
  family: "Family",
  "human-nature": "Human Nature",
};

export type CrowdsenseSnapshot = {
  count: number;
  accuracySum: number;
  rawAverage: number | null;
  adjustedAccuracy: number | null;
  rating: number | null;
  qualified: boolean;
  remainingToQualify: number;
};

export function adjustedAccuracy(
  accuracySum: number,
  count: number,
  priorWeight: number = CROWDSENSE_PRIOR_WEIGHT,
  priorAccuracy: number = CROWDSENSE_PRIOR_ACCURACY,
): number {
  if (count < 0 || accuracySum < 0) {
    throw new Error("CrowdSense inputs must be non-negative");
  }
  return (priorWeight * priorAccuracy + accuracySum) / (priorWeight + count);
}

export function mapAdjustedToRating(adjusted: number): number {
  const mapped = Math.round(200 + 8 * adjusted);
  return Math.min(CROWDSENSE_MAX, Math.max(CROWDSENSE_MIN, mapped));
}

export function crowdsenseFromScores(
  accuracies: readonly number[],
  options?: { priorWeight?: number; qualifyAt?: number },
): CrowdsenseSnapshot {
  const priorWeight = options?.priorWeight ?? CROWDSENSE_PRIOR_WEIGHT;
  const qualifyAt = options?.qualifyAt ?? CROWDSENSE_QUALIFYING_SCORES;
  const count = accuracies.length;
  const accuracySum = accuracies.reduce((sum, value) => sum + value, 0);
  const rawAverage = count === 0 ? null : accuracySum / count;
  const adjusted = count === 0 ? null : adjustedAccuracy(accuracySum, count, priorWeight);
  const qualified = count >= qualifyAt;
  return {
    count,
    accuracySum,
    rawAverage,
    adjustedAccuracy: adjusted,
    rating: qualified && adjusted != null ? mapAdjustedToRating(adjusted) : null,
    qualified,
    remainingToQualify: Math.max(0, qualifyAt - count),
  };
}

export function crowdsenseDelta(
  before: CrowdsenseSnapshot,
  after: CrowdsenseSnapshot,
): number | null {
  if (before.rating == null || after.rating == null) {
    return null;
  }
  return after.rating - before.rating;
}

export function crowdsenseBand(rating: number | null): string {
  if (rating == null) {
    return "Calibrating";
  }
  if (rating >= 850) {
    return "Crowd Whisperer";
  }
  if (rating >= 700) {
    return "Sharp Read";
  }
  return "Crowd Reader";
}

export function utcWeekStart(now: Date = new Date()): string {
  const utc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = utc.getUTCDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  utc.setUTCDate(utc.getUTCDate() + mondayOffset);
  return utc.toISOString().slice(0, 10);
}

export function compareLeaderboardRows(
  a: { rating: number; scoredCount: number; adjustedAccuracy: number; username: string },
  b: { rating: number; scoredCount: number; adjustedAccuracy: number; username: string },
): number {
  if (b.rating !== a.rating) {
    return b.rating - a.rating;
  }
  if (b.adjustedAccuracy !== a.adjustedAccuracy) {
    return b.adjustedAccuracy - a.adjustedAccuracy;
  }
  if (b.scoredCount !== a.scoredCount) {
    return b.scoredCount - a.scoredCount;
  }
  return a.username.localeCompare(b.username);
}

export function isInUtcWeek(isoTimestamp: string, weekStart: string): boolean {
  const week = utcWeekStart(new Date(isoTimestamp));
  return week === weekStart;
}
