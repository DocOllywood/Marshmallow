import { describe, expect, it } from "vitest";

import { marshmallowDraftSchema } from "@/lib/validations/marshmallow";

describe("marshmallow composer validation", () => {
  const base = {
    question: "Who does America think won the argument?",
    topic_id: null,
    choices: ["Alex", "Jordan"],
    opens_at: "2026-08-21T12:00:00.000Z",
    closes_at: "2026-08-21T13:00:00.000Z",
    reveals_at: "2026-08-21T14:00:00.000Z",
    is_daily: false,
    play_mode: "live",
  };

  it("accepts a valid 2-choice schedule", () => {
    expect(marshmallowDraftSchema.safeParse(base).success).toBe(true);
  });

  it("rejects fewer than unique labels and inverted times", () => {
    expect(
      marshmallowDraftSchema.safeParse({ ...base, choices: ["Alex", "alex"] }).success,
    ).toBe(false);
    expect(
      marshmallowDraftSchema.safeParse({
        ...base,
        closes_at: "2026-08-21T11:00:00.000Z",
      }).success,
    ).toBe(false);
  });

  it("derives Daily from play_mode and rejects inverted times", () => {
    const daily = marshmallowDraftSchema.safeParse({
      ...base,
      play_mode: "daily",
      is_daily: false,
    });
    expect(daily.success).toBe(true);
    if (daily.success) {
      expect(daily.data.play_mode).toBe("daily");
      expect(daily.data.is_daily).toBe(true);
    }
    const quick = marshmallowDraftSchema.safeParse({ ...base, play_mode: "quick" });
    expect(quick.success).toBe(true);
    if (quick.success) {
      expect(quick.data.is_daily).toBe(false);
    }
  });

  it("rejects unsafe image URLs and keeps long questions valid", () => {
    expect(
      marshmallowDraftSchema.safeParse({
        ...base,
        image_url: "javascript:alert(1)",
      }).success,
    ).toBe(false);
    expect(
      marshmallowDraftSchema.safeParse({
        ...base,
        question: "x".repeat(120),
      }).success,
    ).toBe(true);
  });

  it("rejects more than 4 choices", () => {
    expect(
      marshmallowDraftSchema.safeParse({
        ...base,
        choices: ["A", "B", "C", "D", "E"],
      }).success,
    ).toBe(false);
  });
});
