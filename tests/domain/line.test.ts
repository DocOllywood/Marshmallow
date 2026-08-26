import { describe, expect, it } from "vitest";

import { isLineQuestion } from "@/domain/play/line";

describe("the line domain", () => {
  it("identifies line questions", () => {
    expect(isLineQuestion(true)).toBe(true);
    expect(isLineQuestion(false)).toBe(false);
  });
});
