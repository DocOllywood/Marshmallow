import { describe, expect, it } from "vitest";

import {
  crowdVoiceHeading,
  crowdVoiceLabel,
  playModeBadge,
  playModeFromDailyFlag,
  playModeTimingCopy,
} from "@/domain/play/mode";
import { pickNextMarshmallowId } from "@/domain/play/next";
import { schedulePreset } from "@/domain/play/schedule";
import { crowdsenseFromScores } from "@/domain/crowdsense/rating";
import { compareContent, parseBetaHealth, rate } from "@/domain/analytics/beta";

const topics = [
  {
    id: "topic-sports",
    name: "Sports",
    slug: "sports",
    kind: "category" as const,
    parent_id: null,
    image_url: null,
    active: true,
    metadata: {},
    created_at: "",
    updated_at: "",
  },
];

describe("play mode badges and population copy", () => {
  it("keeps mode badges consistent", () => {
    expect(playModeBadge("quick")).toBe("⚡ QUICK");
    expect(playModeBadge("live")).toBe("🔥 LIVE");
    expect(playModeBadge("daily")).toBe("☁️ DAILY");
    expect(playModeFromDailyFlag(true)).toBe("daily");
    expect(playModeFromDailyFlag(false)).toBe("live");
    expect(playModeTimingCopy("quick")).toBe("Results soon");
    expect(playModeTimingCopy("daily")).toBe("Come back for the reveal");
    expect(playModeTimingCopy("live")).toBe("Results after it closes");
  });

  it("centralizes crowd voice by sealed count", () => {
    expect(crowdVoiceLabel(0)).toBe("empty");
    expect(crowdVoiceHeading(0)).toBe("Not enough players this time.");
    expect(crowdVoiceHeading(1)).toBe("PLAYERS SAID");
    expect(crowdVoiceHeading(24)).toBe("PLAYERS SAID");
    expect(crowdVoiceHeading(25)).toBe("THE CROWD");
    expect(crowdVoiceHeading(25).toLowerCase()).not.toContain("america");
    expect(crowdVoiceHeading(25).toLowerCase()).not.toContain("everyone");
  });
});

describe("schedule presets", () => {
  it("uses short Quick and medium Live helpers without locking timestamps", () => {
    const now = new Date("2026-08-21T12:00:00.000Z");
    const quick = schedulePreset("quick", now);
    const live = schedulePreset("live", now);
    expect(quick.closesAt.getTime() - quick.opensAt.getTime()).toBe(3 * 60_000);
    expect(quick.revealsAt.getTime() - quick.opensAt.getTime()).toBe(4 * 60_000);
    expect(quick.hardRevealsAt.getTime() - quick.opensAt.getTime()).toBe(10 * 60_000);
    expect(live.closesAt.getTime() - live.opensAt.getTime()).toBe(30 * 60_000);
    expect(live.revealsAt.getTime() - live.opensAt.getTime()).toBe(45 * 60_000);
  });
});

describe("Quick chaining selection", () => {
  const quickA = { id: "qa", status: "open", is_daily: false, play_mode: "quick", topic_id: null };
  const quickB = { id: "qb", status: "open", is_daily: false, play_mode: "quick", topic_id: null };
  const daily = { id: "d", status: "open", is_daily: true, play_mode: "daily", topic_id: null };
  const live = { id: "l", status: "open", is_daily: false, play_mode: "live", topic_id: null };

  it("does not loop to the same Quick", () => {
    expect(
      pickNextMarshmallowId("qa", [quickA, quickB], new Set(["qa"]), topics, [], "after_quick_seal"),
    ).toBe("qb");
  });

  it("falls to Daily then Live after Quick content is exhausted", () => {
    expect(
      pickNextMarshmallowId("qa", [quickA, daily, live], new Set(["qa"]), topics, [], "after_quick_seal"),
    ).toBe("d");
    expect(
      pickNextMarshmallowId("d", [live], new Set(["d"]), topics, [], "after_other_reveal"),
    ).toBe("l");
  });

  it("first session starts on Quick when inventory exists, then Daily after the last Quick", () => {
    expect(
      pickNextMarshmallowId("", [quickA, daily, live], new Set(), topics, [], "first_session"),
    ).toBe("qa");
    expect(
      pickNextMarshmallowId("qa", [quickA, daily, live], new Set(["qa"]), topics, [], "after_quick_seal"),
    ).toBe("d");
  });

  it("does not invent a next Quick after the last one is sealed", () => {
    expect(
      pickNextMarshmallowId("qa", [quickA], new Set(["qa"]), topics, [], "after_quick_seal"),
    ).toBeNull();
  });

  it("skips expired still-open Quicks and falls to Daily", () => {
    const now = Date.parse("2026-08-22T12:00:00.000Z");
    const expired = {
      ...quickA,
      id: "q-expired",
      opens_at: "2026-08-22T11:50:00.000Z",
      closes_at: "2026-08-22T11:53:00.000Z",
      cancelled_at: null,
    };
    const playableDaily = {
      ...daily,
      opens_at: "2026-08-22T00:00:00.000Z",
      closes_at: "2026-08-23T00:00:00.000Z",
      cancelled_at: null,
    };
    expect(
      pickNextMarshmallowId(
        "",
        [expired, playableDaily],
        new Set(),
        topics,
        [],
        "first_session",
        now,
      ),
    ).toBe("d");
    expect(
      pickNextMarshmallowId("", [expired], new Set(), topics, [], "first_session", now),
    ).toBeNull();
  });

  it("prefers a promoted Quick the user has not sealed", () => {
    const unpromoted = { ...quickA, id: "q-open", quick_priority: null };
    const promoted = { ...quickB, id: "q-promo", quick_priority: 1 };
    expect(
      pickNextMarshmallowId(
        "",
        [unpromoted, promoted, daily, live],
        new Set(),
        topics,
        [],
        "first_session",
      ),
    ).toBe("q-promo");
  });

  it("skips a sealed promoted Quick and does not repeat it", () => {
    const promotedA = { ...quickA, id: "qa", quick_priority: 1 };
    const promotedB = { ...quickB, id: "qb", quick_priority: 2 };
    expect(
      pickNextMarshmallowId(
        "qa",
        [promotedA, promotedB],
        new Set(["qa"]),
        topics,
        [],
        "after_quick_seal",
      ),
    ).toBe("qb");
  });

  it("falls to another eligible Quick after the promoted pool is exhausted", () => {
    const promoted = { ...quickA, id: "qa", quick_priority: 1 };
    const queued = { ...quickB, id: "qb", quick_priority: null };
    expect(
      pickNextMarshmallowId(
        "qa",
        [promoted, queued, daily, live],
        new Set(["qa"]),
        topics,
        [],
        "after_quick_seal",
      ),
    ).toBe("qb");
  });
});

describe("CrowdSense treats modes the same", () => {
  it("does not give Quick a rating bonus and volume does not beat skill", () => {
    const quickMediocre = crowdsenseFromScores(Array(20).fill(62));
    const dailySharp = crowdsenseFromScores(Array(6).fill(93));
    expect(dailySharp.rating ?? 0).toBeGreaterThan(quickMediocre.rating ?? 0);
    expect(crowdsenseFromScores([88, 90, 86, 91, 89]).rating).toBe(
      crowdsenseFromScores([88, 90, 86, 91, 89]).rating,
    );
  });
});

describe("beta analytics parsing", () => {
  it("keeps zero denominators null", () => {
    expect(rate(0, 0).value).toBeNull();
    expect(rate(2, 4).value).toBe(0.5);
    const empty = parseBetaHealth({});
    expect(empty.users.signups).toBe(0);
    expect(empty.activation.quick_sealers).toBe(0);
    const compared = compareContent(
      [
        {
          id: "1",
          question: "Q",
          play_mode: "quick",
          status: "revealed",
          opens_at: "2026-08-21T00:00:00.000Z",
          topic_id: null,
          topic_name: null,
          choice_count: 2,
          views: 0,
          sealed: 0,
          eligible_reveals: 0,
          reveal_opens: 0,
          average_accuracy: null,
          next_play: 0,
          shares: 0,
          archetype: "freeform",
          freshness: "timely",
          sample_size: null,
          quick_continuation: 0,
        },
      ],
      (row) => ({ key: row.play_mode, label: row.play_mode }),
    );
    expect(compared[0]?.sealRate.value).toBeNull();
    expect(compared[0]?.revealRate.value).toBeNull();
  });
});
