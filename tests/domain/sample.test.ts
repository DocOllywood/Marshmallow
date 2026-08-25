import { describe, expect, it } from "vitest";

import {
  crowdVoiceSubhead,
  defaultMinimumSample,
  isReadyToFinalize,
  isWaitingForSample,
  payoffDelaySeconds,
  QUICK_DEFAULT_MIN_SAMPLE,
  QUICK_HARD_MINUTES,
  QUICK_INVENTORY_WARN_OPEN,
  quickInventoryWarning,
  visibleHomeQuick,
} from "@/domain/play/sample";
import { parseModePayoffMetrics, parseQuickSampleHealth, parseQuickTestSession } from "@/domain/analytics/beta";

const baseReady = {
  status: "closed",
  cancelled: false,
  nowMs: Date.parse("2026-08-21T12:04:00Z"),
  revealsAtMs: Date.parse("2026-08-21T12:04:00Z"),
  hardRevealsAtMs: Date.parse("2026-08-21T12:10:00Z"),
  minimumSample: 5,
  sealedCount: 5,
};

describe("minimum sample policy", () => {
  it("defaults Quick to 5 and Live/Daily to 0 without hard-coding forever", () => {
    expect(defaultMinimumSample("quick")).toBe(QUICK_DEFAULT_MIN_SAMPLE);
    expect(defaultMinimumSample("live")).toBe(0);
    expect(defaultMinimumSample("daily")).toBe(0);
    expect(QUICK_DEFAULT_MIN_SAMPLE).toBe(5);
    expect(QUICK_HARD_MINUTES).toBe(10);
  });

  it("does not finalize before target reveal even with a full sample", () => {
    expect(
      isReadyToFinalize({
        ...baseReady,
        nowMs: Date.parse("2026-08-21T12:03:00Z"),
        sealedCount: 20,
      }),
    ).toBe(false);
  });

  it("finalizes at target reveal once minimum sample is met", () => {
    expect(isReadyToFinalize(baseReady)).toBe(true);
    expect(isReadyToFinalize({ ...baseReady, sealedCount: 4 })).toBe(false);
  });

  it("enters extension when sample is short, then finalizes at hard maximum", () => {
    expect(isReadyToFinalize({ ...baseReady, sealedCount: 2 })).toBe(false);
    expect(
      isReadyToFinalize({
        ...baseReady,
        sealedCount: 2,
        nowMs: Date.parse("2026-08-21T12:10:00Z"),
      }),
    ).toBe(true);
  });

  it("treats Live/Daily min 0 as time-based finalize", () => {
    expect(
      isReadyToFinalize({
        ...baseReady,
        minimumSample: 0,
        sealedCount: 0,
        hardRevealsAtMs: baseReady.revealsAtMs,
      }),
    ).toBe(true);
  });

  it("never reopens from the client waiting helper", () => {
    expect(
      isWaitingForSample({
        status: "closed",
        nowMs: Date.parse("2026-08-21T12:05:00Z"),
        revealsAtMs: Date.parse("2026-08-21T12:04:00Z"),
        hardRevealsAtMs: Date.parse("2026-08-21T12:10:00Z"),
      }),
    ).toBe(true);
    expect(
      isWaitingForSample({
        status: "open",
        nowMs: Date.parse("2026-08-21T12:05:00Z"),
        revealsAtMs: Date.parse("2026-08-21T12:04:00Z"),
        hardRevealsAtMs: Date.parse("2026-08-21T12:10:00Z"),
      }),
    ).toBe(false);
  });
});

describe("low-sample copy and inventory", () => {
  it("keeps honesty bands and Early crowd for tiny samples", () => {
    expect(crowdVoiceSubhead(0)).toBeNull();
    expect(crowdVoiceSubhead(1)).toBe("Early crowd");
    expect(crowdVoiceSubhead(4)).toBe("Early crowd");
    expect(crowdVoiceSubhead(5)).toBe("5 players");
    expect(crowdVoiceSubhead(24)).toBe("24 players");
    expect(crowdVoiceSubhead(25)).toBeNull();
  });

  it("warns below the configurable open Quick threshold without blocking", () => {
    expect(quickInventoryWarning(4)).toBe(true);
    expect(quickInventoryWarning(5)).toBe(false);
    expect(quickInventoryWarning(4, 3)).toBe(false);
    expect(QUICK_INVENTORY_WARN_OPEN).toBe(5);
  });

  it("shows only a few Quick cards on Home", () => {
    expect(
      visibleHomeQuick([
        { id: 1, quick_priority: null },
        { id: 2, quick_priority: null },
        { id: 3, quick_priority: null },
        { id: 4, quick_priority: null },
        { id: 5, quick_priority: null },
      ]).map((card) => card.id),
    ).toEqual([1, 2, 3]);
  });

  it("shows promoted Quicks on Home before the rest of inventory", () => {
    const cards = [
      { id: "q1", quick_priority: null },
      { id: "q2", quick_priority: 2 },
      { id: "q3", quick_priority: 1 },
      { id: "q4", quick_priority: 0 },
    ];
    expect(visibleHomeQuick(cards).map((card) => card.id)).toEqual(["q3", "q2"]);
  });

  it("caps unpromoted Quick inventory for consumer Home", () => {
    const cards = Array.from({ length: 20 }, (_, index) => ({
      id: `q${index}`,
      quick_priority: null,
    }));
    expect(visibleHomeQuick(cards)).toHaveLength(3);
  });

  it("starts payoff delay at result_available_at", () => {
    const sealed = Date.parse("2026-08-21T12:00:00Z");
    const available = Date.parse("2026-08-21T12:08:00Z");
    const opened = Date.parse("2026-08-21T12:08:20Z");
    expect(payoffDelaySeconds(sealed, opened, available)).toBe(20);
    expect(payoffDelaySeconds(sealed, opened, null)).toBe(500);
  });
});

describe("admin sample parsers", () => {
  it("parses inventory, sample health, and mode payoff without leaking aggregates", () => {
    const session = parseQuickTestSession({
      inventory: { open: 8, cooking: 3, ready: 2, warn_below: 5, warning: false },
      eligible_players: 10,
      board: [
        {
          id: "q1",
          question: "Who wins?",
          status: "open",
          sealed_count: 2,
          ready_to_finalize: false,
        },
      ],
    });
    expect(session.inventory.open).toBe(8);
    expect(session.inventory.promoted_target).toBe(3);
    expect(session.board[0]?.sealed_count).toBe(2);
    expect(session.board[0]?.quick_priority).toBeNull();
    const health = parseQuickSampleHealth({
      revealed_quicks: 4,
      median_sample: 3,
      reached_minimum_before_target: 1,
      required_extension: 2,
      hit_hard_maximum: 1,
      zero_response: 1,
      promoted: {
        revealed: 2,
        views: 10,
        sealed: 6,
        median_sample: 4,
        reached_minimum_before_hard: 1,
      },
    });
    expect(health.required_extension).toBe(2);
    expect(health.promoted.sealed).toBe(6);
    expect(JSON.stringify(session)).not.toContain("vote_pct");
    const modes = parseModePayoffMetrics({
      quick: { first_seal: 6, continued: 3, first_payoff: 2, avg_sample: 4.5 },
      daily: { seals: 4, eligible_reveals: 3, reveal_opens: 2 },
      live: { seals: 1, reveal_opens: 1, eligible_reveals: 1 },
    });
    expect(modes.quick.continued).toBe(3);
    expect(modes.daily.seals).toBe(4);
  });
});
