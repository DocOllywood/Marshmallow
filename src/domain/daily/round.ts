import { revealContextCopy } from "@/domain/scoring/copy";
import { formatRevealSummary } from "@/domain/scoring/presentation";
import { computeGap, type GapResult } from "@/domain/scoring/gap";
import type { TodaysRead } from "@/domain/daily/todays-read";
import type { HumanTension } from "@/domain/daily/tension";

export const DAILY_ROUND_SIZE = 5;

export type DailyRoundQuestion = {
  id: string;
  question: string;
  position: number;
  sealed: boolean;
  openedReveal: boolean;
  status: string;
  revealsAt: string;
};

export type DailyRoundProgress = {
  roundId: string;
  title: string;
  subtitle: string | null;
  topicName: string | null;
  tension: HumanTension | null;
  roundDate: string;
  questions: DailyRoundQuestion[];
  sealedCount: number;
  allSealed: boolean;
  allRevealed: boolean;
  anyRevealOpened: boolean;
  currentPlayId: string | null;
  revealHref: string;
  todaysRead: TodaysRead | null;
  isExperimentDaily: boolean;
};

export type DailyRoundQuestionReveal = {
  id: string;
  question: string;
  position: number;
  isLine: boolean;
  ownChoiceLabel: string | null;
  predictedPct: number | null;
  crowdPct: number;
  crowdLabel: string;
  crowdModeLabel: string | null;
  errorCopy: string | null;
  accuracy: number | null;
  gap: GapResult | null;
};

export type DailyRoundSummary = {
  strongReadCount: number;
  scoredQuestionCount: number;
  averageAccuracy: number;
  contextCopy: string | null;
  crowdsenseRating: number | null;
  crowdsenseDelta: number | null;
  isExperimentDaily: boolean;
  strongReadLabel: string;
};

export function buildDailyRoundProgress(input: {
  roundId: string;
  title: string;
  subtitle: string | null;
  topicName: string | null;
  tension: HumanTension | null;
  roundDate: string;
  questions: DailyRoundQuestion[];
  openedRevealIds: ReadonlySet<string>;
  isExperimentDaily?: boolean;
}): DailyRoundProgress {
  const sorted = [...input.questions].sort((a, b) => a.position - b.position);
  const sealedCount = sorted.filter((q) => q.sealed).length;
  const allSealed = sealedCount >= DAILY_ROUND_SIZE;
  const allRevealed =
    sorted.length >= DAILY_ROUND_SIZE &&
    sorted.every((q) => q.status === "revealed" || q.status === "archived");
  const anyRevealOpened = sorted.some((q) => input.openedRevealIds.has(q.id));
  const currentPlayId =
    sorted.find((q) => !q.sealed && q.status === "open")?.id ??
    sorted.find((q) => !q.sealed)?.id ??
    null;

  return {
    roundId: input.roundId,
    title: input.title,
    subtitle: input.subtitle,
    topicName: input.topicName,
    tension: input.tension,
    roundDate: input.roundDate,
    questions: sorted,
    sealedCount,
    allSealed,
    allRevealed,
    anyRevealOpened,
    currentPlayId,
    revealHref: `/daily/${input.roundId}/reveal`,
    todaysRead: null,
    isExperimentDaily: input.isExperimentDaily ?? false,
  };
}

export function nextDailyQuestionId(
  progress: DailyRoundProgress,
  currentId: string,
): string | null {
  const current = progress.questions.find((q) => q.id === currentId);
  if (!current) return progress.currentPlayId;
  const next = progress.questions.find(
    (q) => q.position > current.position && !q.sealed && q.status === "open",
  );
  return next?.id ?? progress.currentPlayId;
}

export type DailyHomeState =
  | "play"
  | "continue"
  | "sealed"
  | "ready"
  | "done";

export function dailyHomeState(progress: DailyRoundProgress): DailyHomeState {
  if (progress.allRevealed && progress.allSealed && !progress.anyRevealOpened) {
    return "ready";
  }
  if (progress.allRevealed && progress.anyRevealOpened) {
    return "done";
  }
  if (progress.allSealed) {
    return "sealed";
  }
  if (progress.sealedCount > 0) {
    return "continue";
  }
  return "play";
}

export function dailyRoundSummary(
  reveals: readonly DailyRoundQuestionReveal[],
  crowdsenseRating: number | null,
  crowdsenseDelta: number | null,
  options: { isExperimentDaily?: boolean } = {},
): DailyRoundSummary {
  const isExperimentDaily = options.isExperimentDaily ?? false;
  const scored = reveals.filter((item) => item.accuracy != null);
  const strongReadCount = scored.filter((item) => (item.accuracy ?? 0) >= 85).length;
  const averageAccuracy =
    scored.length > 0
      ? Math.round(
          scored.reduce((sum, item) => sum + (item.accuracy ?? 0), 0) / scored.length,
        )
      : 0;

  const avgError =
    scored.length > 0
      ? scored.reduce((sum, item) => {
          if (item.predictedPct == null) return sum;
          const error = Math.abs(item.predictedPct - item.crowdPct);
          return sum + error;
        }, 0) / scored.length
      : null;

  const contextCopy = revealContextCopy({
    errorPoints: avgError,
    accuracy: averageAccuracy,
    alignment:
      strongReadCount >= Math.ceil(scored.length / 2) ? "with" : "minority",
  });

  const strongReadLabel = isExperimentDaily
    ? scored.length === 1
      ? strongReadCount === 1
        ? "Strong read on today's experiment"
        : "Read the room on today's experiment"
      : `${strongReadCount} of ${scored.length} strong reads`
    : `${strongReadCount} of ${scored.length} strong reads`;

  return {
    strongReadCount,
    scoredQuestionCount: scored.length,
    averageAccuracy,
    contextCopy,
    crowdsenseRating,
    crowdsenseDelta,
    isExperimentDaily,
    strongReadLabel,
  };
}

export function questionRevealSummary(
  predictedPct: number | null,
  crowdPct: number,
): { errorCopy: string | null; errorPoints: number | null; gap: GapResult | null } {
  if (predictedPct == null) {
    return { errorCopy: null, errorPoints: null, gap: null };
  }
  const summary = formatRevealSummary(predictedPct, crowdPct);
  return {
    errorCopy: summary.errorCopy,
    errorPoints: summary.errorPoints,
    gap: computeGap(predictedPct, crowdPct),
  };
}
