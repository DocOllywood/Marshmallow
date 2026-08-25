import { describe, expect, it } from "vitest";

import { revealReturnRate } from "@/domain/analytics/rrr";
import { pickNextMarshmallowId, nextMarshmallowHref } from "@/domain/play/next";
import {
  accuracyLabel,
  alignmentCopy,
  crowdAlignment,
  crowdWinnerId,
  revealContextCopy,
} from "@/domain/scoring/copy";
import { isRevealStreakMilestone } from "@/domain/reputation/streaks";
import type { TopicRow } from "@/domain/onboarding/topics";

const topics = [
  {
    id: "topic-sports",
    kind: "show",
    parent_id: "cat-sports",
    name: "Sports",
    slug: "sports",
    image_url: null,
    active: true,
    metadata: {},
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
] as TopicRow[];

describe("accuracy copy", () => {
  it("uses stored-score ranges without shaming", () => {
    expect(accuracyLabel(100)).toBe("NAILED IT");
    expect(accuracyLabel(95)).toBe("NAILED IT");
    expect(accuracyLabel(94)).toBe("VERY CLOSE");
    expect(accuracyLabel(85)).toBe("VERY CLOSE");
    expect(accuracyLabel(84)).toBe("SOLID READ");
    expect(accuracyLabel(70)).toBe("SOLID READ");
    expect(accuracyLabel(69)).toBeNull();
  });
});

describe("crowd alignment", () => {
  it("treats a unique leader as the crowd and does not call minority wrong", () => {
    expect(
      crowdWinnerId([
        { id: "alex", votePct: 61 },
        { id: "jordan", votePct: 39 },
      ]),
    ).toBe("alex");
    expect(alignmentCopy(crowdAlignment("alex", "alex"))).toBe("You were with the crowd.");
    expect(alignmentCopy(crowdAlignment("jordan", "alex"))).toBe("You saw it differently.");
    expect(alignmentCopy("minority")?.toLowerCase()).not.toContain("wrong");
  });
});

describe("reveal context copy", () => {
  it("prioritizes surprise, close reads, then choice alignment", () => {
    expect(
      revealContextCopy({ errorPoints: 20, accuracy: 50, alignment: "with" }),
    ).toBe("The crowd surprised you.");
    expect(
      revealContextCopy({ errorPoints: 3, accuracy: 98, alignment: "minority" }),
    ).toBe("You read the room.");
    expect(
      revealContextCopy({ errorPoints: 10, accuracy: 75, alignment: "with" }),
    ).toBe("You were with the crowd.");
    expect(
      revealContextCopy({ errorPoints: 10, accuracy: 75, alignment: "minority" }),
    ).toBe("You saw it differently.");
  });
});

describe("next marshmallow", () => {
  const openDaily = { id: "daily", status: "open", is_daily: true, play_mode: "daily", topic_id: "topic-sports" };
  const openQuick = { id: "quick", status: "open", is_daily: false, play_mode: "quick", topic_id: "topic-sports" };
  const openLive = { id: "live", status: "open", is_daily: false, play_mode: "live", topic_id: "topic-music" };
  const openSports = { id: "sports", status: "open", is_daily: false, play_mode: "live", topic_id: "topic-sports" };

  it("after a Quick seal prefers another Quick, then Daily", () => {
    expect(
      pickNextMarshmallowId("current", [openDaily, openLive, openQuick], new Set(), topics, [], "after_quick_seal"),
    ).toBe("quick");
    expect(
      pickNextMarshmallowId("current", [openDaily, openLive], new Set(), topics, [], "after_quick_seal"),
    ).toBe("daily");
  });

  it("after a Daily reveal prefers Quick, then Live", () => {
    expect(
      pickNextMarshmallowId("daily", [openQuick, openDaily, openLive], new Set(["daily"]), topics, [], "after_other_reveal"),
    ).toBe("quick");
    expect(
      pickNextMarshmallowId("daily", [openLive, openSports], new Set(["daily"]), topics, [], "after_other_reveal"),
    ).toBe("live");
  });

  it("skips already sealed items and never loops to the same id", () => {
    expect(
      pickNextMarshmallowId(
        "quick",
        [openQuick, openDaily],
        new Set(["quick"]),
        topics,
        ["topic-sports"],
        "after_quick_reveal",
      ),
    ).toBe("daily");
  });

  it("falls back to home when nothing is open", () => {
    expect(pickNextMarshmallowId("current", [], new Set(), topics, [])).toBeNull();
    expect(nextMarshmallowHref(null)).toBe("/home");
  });
});

describe("RRR", () => {
  it("divides unique first opens by revealed sealed entries", () => {
    expect(revealReturnRate(3, 10)).toBe(0.3);
    expect(revealReturnRate(0, 0)).toBeNull();
  });
});

describe("reveal streak milestones", () => {
  it("marks 3, 7, 14, and 30", () => {
    expect(isRevealStreakMilestone(7)).toBe(true);
    expect(isRevealStreakMilestone(8)).toBe(false);
  });
});
