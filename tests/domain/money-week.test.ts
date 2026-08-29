import { describe, expect, it } from "vitest";

import { LAUNCH_MONEY_DAILY_ROUND_DATE } from "@/domain/content/launch-money-daily";
import {
  MONEY_WEEK_DAYS,
  MONEY_WEEK_PRINCIPLES,
  MONEY_WEEK_RESERVED_DATES,
  MONEY_WEEK_SEMANTIC_SIDES,
} from "@/domain/content/money-week";
import { isDailyRoundVisibleOnHome, buildDailyRoundProgress } from "@/domain/daily/round";
import { marshmallowRequiresPrediction } from "@/domain/daily/experiment";
import { todaysMarshmallowInvitation } from "@/domain/daily/todays-marshmallow";

describe("money week editorial contract", () => {
  it("defines six draft days with unique round ids and dates", () => {
    expect(MONEY_WEEK_DAYS).toHaveLength(6);
    const roundIds = MONEY_WEEK_DAYS.map((day) => day.roundId);
    const dates = MONEY_WEEK_DAYS.map((day) => day.roundDate);
    expect(new Set(roundIds).size).toBe(6);
    expect(new Set(dates).size).toBe(6);
    expect(dates).not.toContain(LAUNCH_MONEY_DAILY_ROUND_DATE);
  });

  it("avoids conflicting QA dates", () => {
    const blocked = ["2026-10-13", "2026-10-20", "2026-10-27"];
    for (const day of MONEY_WEEK_DAYS) {
      expect(blocked).not.toContain(day.roundDate);
      expect(MONEY_WEEK_RESERVED_DATES).toContain(day.roundDate);
    }
  });

  it("registers six durable belief principles", () => {
    expect(MONEY_WEEK_PRINCIPLES).toHaveLength(6);
    expect(new Set(MONEY_WEEK_PRINCIPLES.map((p) => p.slug)).size).toBe(6);
  });

  it("requires prediction only on flip for every day", () => {
    for (const day of MONEY_WEEK_DAYS) {
      for (const spec of day.stages) {
        const metadata = {
          experiment: {
            stage: spec.stage,
            requires_prediction: spec.requiresPrediction,
          },
        };
        expect(marshmallowRequiresPrediction(metadata)).toBe(spec.requiresPrediction);
      }
      expect(day.stages.filter((s) => s.requiresPrediction)).toHaveLength(1);
      expect(day.stages.find((s) => s.requiresPrediction)?.stage).toBe("flip");
    }
  });

  it("seeds five marshmallows and line choices per day", () => {
    for (const day of MONEY_WEEK_DAYS) {
      expect(day.marshmallowIds).toHaveLength(5);
      expect(day.lineChoices).toHaveLength(5);
      expect(day.stages).toHaveLength(5);
      expect(day.directQaPath).toMatch(/^\/m\//);
    }
  });

  it("uses distinct tensions across the week", () => {
    const slugs = MONEY_WEEK_DAYS.map((day) => day.tensionSlug);
    expect(new Set(slugs).size).toBe(6);
  });

  it("includes non-cash price dimensions on at least two days", () => {
    const nonCash = MONEY_WEEK_DAYS.filter((day) =>
      day.stages.some(
        (stage) =>
          stage.costType != null &&
          stage.costType !== "MONEY" &&
          stage.stage === "consequence",
      ),
    );
    expect(nonCash.length).toBeGreaterThanOrEqual(2);
  });

  it("hides draft-only rounds from home", () => {
    for (const day of MONEY_WEEK_DAYS) {
      const progress = buildDailyRoundProgress({
        roundId: day.roundId,
        title: day.title,
        subtitle: day.subtitle,
        topicName: "Love",
        tension: null,
        roundDate: day.roundDate,
        questions: day.marshmallowIds.map((id, index) => ({
          id,
          question: "Q",
          position: index + 1,
          sealed: false,
          openedReveal: false,
          status: "draft",
          revealsAt: `${day.roundDate}T22:00:00.000Z`,
        })),
        openedRevealIds: new Set(),
        isExperimentDaily: true,
        experimentArchetype: "price",
      });
      expect(progress.currentPlayId).toBeNull();
      expect(isDailyRoundVisibleOnHome(progress)).toBe(false);
    }
  });

  it("maps outside invitations to tension slugs", () => {
    for (const day of MONEY_WEEK_DAYS) {
      expect(todaysMarshmallowInvitation(day.tensionSlug)).toBe(day.outsideInvitation);
    }
  });

  it("documents semantic side definitions for every day", () => {
    for (const day of MONEY_WEEK_DAYS) {
      const semantic = MONEY_WEEK_SEMANTIC_SIDES[day.day];
      expect(semantic?.left.length).toBeGreaterThan(5);
      expect(semantic?.right.length).toBeGreaterThan(5);
    }
  });

  it("uses coherence-pass tension slugs for days 3 and 4", () => {
    expect(MONEY_WEEK_DAYS.find((d) => d.day === 3)?.tensionSlug).toBe("time-ambition");
    expect(MONEY_WEEK_DAYS.find((d) => d.day === 4)?.tensionSlug).toBe("gain-privacy");
    expect(MONEY_WEEK_DAYS.find((d) => d.day === 7)?.tensionSlug).toBe("forgiveness-self-respect");
  });
});
