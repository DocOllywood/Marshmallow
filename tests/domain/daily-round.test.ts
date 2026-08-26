import { describe, expect, it } from "vitest";

import {
  buildDailyRoundProgress,
  dailyHomeState,
  dailyRoundSummary,
  DAILY_ROUND_SIZE,
  nextDailyQuestionId,
} from "@/domain/daily/round";

describe("daily round domain", () => {
  const baseQuestions = [
    { id: "q1", question: "One?", position: 1, sealed: false, openedReveal: false, status: "open", revealsAt: "" },
    { id: "q2", question: "Two?", position: 2, sealed: false, openedReveal: false, status: "open", revealsAt: "" },
    { id: "q3", question: "Three?", position: 3, sealed: false, openedReveal: false, status: "open", revealsAt: "" },
    { id: "q4", question: "Four?", position: 4, sealed: false, openedReveal: false, status: "open", revealsAt: "" },
    { id: "q5", question: "Five?", position: 5, sealed: false, openedReveal: false, status: "open", revealsAt: "" },
  ];

  it("tracks partial completion and next question", () => {
    const progress = buildDailyRoundProgress({
      roundId: "round-1",
      title: "Can love survive complete honesty?",
      subtitle: "5 questions about love, honesty, and trust.",
      topicName: "Love",
      tension: null,
      roundDate: "2026-08-25",
      questions: baseQuestions.map((question, index) =>
        index < 2 ? { ...question, sealed: true } : question,
      ),
      openedRevealIds: new Set(),
    });

    expect(progress.sealedCount).toBe(2);
    expect(dailyHomeState(progress)).toBe("continue");
    expect(nextDailyQuestionId(progress, "q2")).toBe("q3");
    expect(progress.currentPlayId).toBe("q3");
  });

  it("marks sealed and ready states", () => {
    const sealed = buildDailyRoundProgress({
      roundId: "round-1",
      title: "Theme",
      subtitle: null,
      topicName: "Love",
      tension: null,
      roundDate: "2026-08-25",
      questions: baseQuestions.map((question) => ({ ...question, sealed: true, status: "closed" })),
      openedRevealIds: new Set(),
    });
    expect(dailyHomeState(sealed)).toBe("sealed");

    const ready = buildDailyRoundProgress({
      roundId: "round-1",
      title: "Theme",
      subtitle: null,
      topicName: "Love",
      tension: null,
      roundDate: "2026-08-25",
      questions: baseQuestions.map((question) => ({
        ...question,
        sealed: true,
        status: "revealed",
      })),
      openedRevealIds: new Set(),
    });
    expect(dailyHomeState(ready)).toBe("ready");
  });

  it("summarizes round accuracy from official question scores", () => {
    const summary = dailyRoundSummary(
      [
        { id: "q1", question: "Q1", position: 1, isLine: false, ownChoiceLabel: "Yes", predictedPct: 60, crowdPct: 62, crowdLabel: "Yes", crowdModeLabel: "Yes", errorCopy: "Only 2 points off", accuracy: 92, gap: null },
        { id: "q2", question: "Q2", position: 2, isLine: false, ownChoiceLabel: "No", predictedPct: 40, crowdPct: 38, crowdLabel: "No", crowdModeLabel: "No", errorCopy: "Only 2 points off", accuracy: 88, gap: null },
      ],
      812,
      6,
    );
    expect(summary.strongReadCount).toBe(2);
    expect(summary.scoredQuestionCount).toBe(2);
    expect(summary.averageAccuracy).toBe(90);
    expect(summary.crowdsenseRating).toBe(812);
    expect(summary.crowdsenseDelta).toBe(6);
  });

  it("uses five questions per round", () => {
    expect(DAILY_ROUND_SIZE).toBe(5);
  });
});
