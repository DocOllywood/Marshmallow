import { describe, expect, it } from "vitest";

import { questionRevealSummary } from "@/domain/daily/round";

describe("daily round reveal summary", () => {
  it("includes gap for scored questions without changing error copy semantics", () => {
    const summary = questionRevealSummary(68, 43);
    expect(summary.errorCopy).toBe("Only 25 points off");
    expect(summary.gap?.gapPoints).toBe(25);
  });

  it("returns null gap when prediction is missing", () => {
    expect(questionRevealSummary(null, 50).gap).toBeNull();
  });
});
