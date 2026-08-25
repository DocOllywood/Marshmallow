import { describe, expect, it } from "vitest";

import {
  CROWDSENSE_QUALIFYING_SCORES,
  compareLeaderboardRows,
  crowdsenseBand,
  crowdsenseDelta,
  crowdsenseFromScores,
  mapAdjustedToRating,
  utcWeekStart,
} from "@/domain/crowdsense/rating";
import { worldSlugForTopic } from "@/domain/crowdsense/worlds";
import { isLeaderboardTabId, LEADERBOARD_TABS } from "@/domain/crowdsense/boards";
import type { TopicRow } from "@/domain/onboarding/topics";

function topic(partial: Partial<TopicRow> & Pick<TopicRow, "id" | "name" | "slug">): TopicRow {
  return {
    kind: "category",
    parent_id: null,
    image_url: null,
    active: true,
    metadata: {},
    created_at: "",
    updated_at: "",
    ...partial,
  };
}

describe("CrowdSense qualification", () => {
  it("stays Calibrating below 5 scored Marshmallows", () => {
    expect(crowdsenseFromScores([]).qualified).toBe(false);
    expect(crowdsenseFromScores([100, 100, 100, 100]).rating).toBeNull();
    expect(crowdsenseFromScores([100, 100, 100, 100]).remainingToQualify).toBe(1);
    expect(crowdsenseBand(null)).toBe("Calibrating");
  });

  it("publishes a rating at the 5-score threshold", () => {
    const snap = crowdsenseFromScores([80, 80, 80, 80, 80]);
    expect(CROWDSENSE_QUALIFYING_SCORES).toBe(5);
    expect(snap.qualified).toBe(true);
    expect(snap.rating).toBe(mapAdjustedToRating(snap.adjustedAccuracy ?? 0));
    expect(snap.rating).toBeGreaterThanOrEqual(500);
    expect(snap.rating).toBeLessThanOrEqual(1000);
  });
});

describe("CrowdSense skill vs luck and volume", () => {
  it("is deterministic from official accuracies", () => {
    const a = crowdsenseFromScores([90, 88, 91, 87, 92, 89]);
    const b = crowdsenseFromScores([90, 88, 91, 87, 92, 89]);
    expect(a).toEqual(b);
  });

  it("ranks perfect performance above mediocre performance", () => {
    const perfect = crowdsenseFromScores(Array(20).fill(100));
    const mediocre = crowdsenseFromScores(Array(20).fill(70));
    expect(perfect.rating ?? 0).toBeGreaterThan(mediocre.rating ?? 0);
  });

  it("does not let one lucky score dominate established good play", () => {
    const established = crowdsenseFromScores(Array(20).fill(90));
    const plusLucky = crowdsenseFromScores([...Array(20).fill(90), 100]);
    expect((plusLucky.rating ?? 0) - (established.rating ?? 0)).toBeLessThanOrEqual(8);
    const fiveLucky = crowdsenseFromScores([100, 100, 100, 100, 100]);
    expect(fiveLucky.rating ?? 0).toBeLessThan(established.rating ?? 0);
  });

  it("does not let poor high-volume play outrank better forecasting", () => {
    const volume = crowdsenseFromScores(Array(80).fill(60));
    const sharp = crowdsenseFromScores(Array(8).fill(92));
    expect(sharp.rating ?? 0).toBeGreaterThan(volume.rating ?? 0);
  });

  it("ignores Reveal Bonus and streaks because they are not inputs", () => {
    const skill = crowdsenseFromScores([88, 90, 87, 91, 89]);
    expect(skill.rating).toBe(crowdsenseFromScores([88, 90, 87, 91, 89]).rating);
  });

  it("only emits a delta when both snapshots are qualified", () => {
    const before = crowdsenseFromScores([80, 80, 80, 80]);
    const after = crowdsenseFromScores([80, 80, 80, 80, 80]);
    expect(crowdsenseDelta(before, after)).toBeNull();
    const later = crowdsenseFromScores([80, 80, 80, 80, 80, 90]);
    expect(crowdsenseDelta(after, later)).not.toBeNull();
  });
});

describe("CrowdSense category ancestry", () => {
  const reality = topic({ id: "r", name: "Reality TV", slug: "reality-tv" });
  const island = topic({
    id: "i",
    name: "Island Heat",
    slug: "island-heat",
    kind: "show",
    parent_id: "r",
  });
  const celebrity = topic({ id: "c", name: "Celebrity", slug: "celebrity" });

  it("maps nested topics to the world category and keeps worlds independent", () => {
    const topics = [reality, island, celebrity];
    expect(worldSlugForTopic("i", topics)).toBe("reality-tv");
    expect(worldSlugForTopic("c", topics)).toBe("celebrity");
    expect(worldSlugForTopic("r", topics)).toBe("reality-tv");
    expect(worldSlugForTopic(null, topics)).toBeNull();
  });
});

describe("CrowdSense leaderboard order", () => {
  it("orders by rating, then adjusted Accuracy, then sample, then username", () => {
    const rows = [
      { rating: 800, scoredCount: 5, adjustedAccuracy: 80, username: "b_user" },
      { rating: 800, scoredCount: 5, adjustedAccuracy: 80, username: "a_user" },
      { rating: 800, scoredCount: 8, adjustedAccuracy: 79, username: "c_user" },
      { rating: 820, scoredCount: 5, adjustedAccuracy: 70, username: "d_user" },
    ].sort(compareLeaderboardRows);
    expect(rows.map((row) => row.username)).toEqual(["d_user", "a_user", "b_user", "c_user"]);
  });
});

describe("CrowdSense weekly UTC boundary", () => {
  it("uses Monday as the UTC week start", () => {
    expect(utcWeekStart(new Date("2026-08-21T12:00:00.000Z"))).toBe("2026-08-17");
    expect(utcWeekStart(new Date("2026-08-17T00:00:00.000Z"))).toBe("2026-08-17");
    expect(utcWeekStart(new Date("2026-08-16T23:59:59.000Z"))).toBe("2026-08-10");
  });
});

describe("leaderboard tabs", () => {
  it("exports a typed tab list the page and view can share", () => {
    expect(LEADERBOARD_TABS.map((tab) => tab.id)).toEqual([
      "overall",
      "reality-tv",
      "celebrity",
      "pop-culture",
      "internet-culture",
      "weekly",
    ]);
    expect(isLeaderboardTabId("overall")).toBe(true);
    expect(isLeaderboardTabId("weekly")).toBe(true);
    expect(isLeaderboardTabId("nope")).toBe(false);
    expect(isLeaderboardTabId(undefined)).toBe(false);
  });
});
