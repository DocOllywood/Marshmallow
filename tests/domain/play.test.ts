import { describe, expect, it } from "vitest";

import { applyAllocation, evenSplit, isValidSealDistribution } from "@/domain/play/allocations";
import { resolvePlayScreen } from "@/domain/play/view";

describe("play view resolution", () => {
  const times = {
    nowMs: Date.parse("2026-08-21T12:00:00Z"),
    opensAtMs: Date.parse("2026-08-21T11:00:00Z"),
    closesAtMs: Date.parse("2026-08-21T13:00:00Z"),
    revealsAtMs: Date.parse("2026-08-21T14:00:00Z"),
    openedReveal: false,
  };

  it("plays when open and unsealed", () => {
    expect(
      resolvePlayScreen({ status: "open", sealed: false, hasDraft: false, ...times }),
    ).toBe("play");
  });

  it("waits when sealed before reveal", () => {
    expect(
      resolvePlayScreen({ status: "open", sealed: true, hasDraft: false, ...times }),
    ).toBe("waiting");
    expect(
      resolvePlayScreen({ status: "closed", sealed: true, hasDraft: false, ...times }),
    ).toBe("waiting");
  });

  it("does not treat countdown expiry as reveal", () => {
    expect(
      resolvePlayScreen({
        status: "closed",
        sealed: true,
        hasDraft: false,
        ...times,
        nowMs: Date.parse("2026-08-21T15:00:00Z"),
      }),
    ).toBe("finishing");
  });

  it("shows still cooking while waiting for sample before hard reveal", () => {
    expect(
      resolvePlayScreen({
        status: "closed",
        sealed: true,
        hasDraft: false,
        ...times,
        nowMs: Date.parse("2026-08-21T14:30:00Z"),
        hardRevealsAtMs: Date.parse("2026-08-21T16:00:00Z"),
      }),
    ).toBe("still_cooking");
  });

  it("cancels without a waiting countdown", () => {
    expect(
      resolvePlayScreen({
        status: "cancelled",
        sealed: true,
        hasDraft: false,
        ...times,
      }),
    ).toBe("cancelled");
  });

  it("keeps naturally closed waiting until reveal", () => {
    expect(
      resolvePlayScreen({
        status: "closed",
        sealed: true,
        hasDraft: false,
        ...times,
      }),
    ).toBe("waiting");
  });

  it("does not show results until the player opens reveal", () => {
    expect(
      resolvePlayScreen({
        status: "revealed",
        sealed: true,
        hasDraft: false,
        ...times,
        openedReveal: false,
      }),
    ).toBe("reveal_ready");
    expect(
      resolvePlayScreen({
        status: "revealed",
        sealed: true,
        hasDraft: false,
        ...times,
        openedReveal: true,
      }),
    ).toBe("revealed");
  });
});

describe("allocations", () => {
  it("splits evenly to 100", () => {
    expect(evenSplit(2)).toEqual([50, 50]);
    expect(evenSplit(3).reduce((a, b) => a + b, 0)).toBe(100);
    expect(evenSplit(4)).toEqual([25, 25, 25, 25]);
  });

  it("rebalances a binary slider to 100", () => {
    expect(applyAllocation([50, 50], 0, 64)).toEqual([64, 36]);
  });

  it("rejects invalid seal mixes", () => {
    expect(isValidSealDistribution([70, 30])).toBe(true);
    expect(isValidSealDistribution([70, 20])).toBe(false);
    expect(isValidSealDistribution([10, 20, 30, 40])).toBe(true);
    expect(isValidSealDistribution([10])).toBe(false);
  });
});
