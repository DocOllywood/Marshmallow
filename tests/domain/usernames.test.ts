import { describe, expect, it } from "vitest";

import { usernameSchema } from "@/lib/validations/username";
import { brierAccuracy } from "@/domain/scoring/accuracy";

describe("usernameSchema", () => {
  it("canonicalizes to lowercase", () => {
    expect(usernameSchema.parse("Sam_21")).toBe("sam_21");
  });

  it("rejects reserved names", () => {
    expect(usernameSchema.safeParse("admin").success).toBe(false);
    expect(usernameSchema.safeParse("Marshmallow").success).toBe(false);
  });

  it("rejects leading, trailing, and double underscores", () => {
    expect(usernameSchema.safeParse("_sam").success).toBe(false);
    expect(usernameSchema.safeParse("sam_").success).toBe(false);
    expect(usernameSchema.safeParse("sa__m").success).toBe(false);
  });
});

describe("brierAccuracy", () => {
  it("scores a perfect forecast at 100", () => {
    expect(brierAccuracy([0.5, 0.5], [0.5, 0.5])).toBe(100);
  });

  it("scores a fully inverted two-way forecast at 0", () => {
    expect(brierAccuracy([1, 0], [0, 1])).toBe(0);
  });
});
