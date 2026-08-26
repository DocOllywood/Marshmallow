import { describe, expect, it } from "vitest";

import { formatRevealSummary } from "@/domain/scoring/presentation";
import { revealBonusPoints, REVEAL_BONUS_WINDOW_HOURS, totalVisiblePoints } from "@/domain/reputation/points";
import { REVEAL_STREAK_UX_LABEL } from "@/domain/reputation/streaks";
import { MARSHMALLOW_STATUSES } from "@/domain/marshmallow/status";

describe("reveal presentation", () => {
  it("describes percentage-point error without Brier language", () => {
    const summary = formatRevealSummary(64, 61);

    expect(summary.errorPoints).toBe(3);
    expect(summary.errorCopy).toBe("Only 3 points off");
    expect(summary.errorCopy.toLowerCase()).not.toContain("brier");
  });

  it("uses singular copy for a one-point miss", () => {
    expect(formatRevealSummary(50, 49).errorCopy).toBe("Only 1 point off");
  });

  it("celebrates an exact call", () => {
    expect(formatRevealSummary(40, 40).errorCopy).toBe("Exact call");
  });
});

describe("reputation rules", () => {
  it("keeps base points when the reveal bonus is zero", () => {
    expect(
      totalVisiblePoints({ basePoints: 98, revealBonusPoints: 0 }),
    ).toBe(98);
  });

  it("adds reveal bonus on top of permanent base points", () => {
    expect(
      totalVisiblePoints({ basePoints: 98, revealBonusPoints: 5 }),
    ).toBe(103);
  });

  it("uses a 24-hour prompt window for the optional bonus", () => {
    expect(REVEAL_BONUS_WINDOW_HOURS).toBe(24);
  });

  it("rounds reveal bonus half away from zero and caps at 10", () => {
    expect(revealBonusPoints(100)).toBe(10);
    expect(revealBonusPoints(80)).toBe(8);
    expect(revealBonusPoints(47)).toBe(5);
    expect(revealBonusPoints(44)).toBe(4);
    expect(revealBonusPoints(45)).toBe(5);
  });

  it("exposes Reveal Streak as the consumer label", () => {
    expect(REVEAL_STREAK_UX_LABEL).toBe("Reveal Streak");
  });
});

describe("marshmallow statuses", () => {
  it("includes the approved lifecycle", () => {
    expect(MARSHMALLOW_STATUSES).toEqual([
      "draft",
      "scheduled",
      "open",
      "closed",
      "cancelled",
      "revealed",
      "archived",
    ]);
  });
});
