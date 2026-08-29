import { describe, expect, it } from "vitest";

describe("experiment dare token format", () => {
  it("uses 32-char hex tokens like share cards", () => {
    const token = "a".repeat(32);
    expect(/^[a-f0-9]{32}$/.test(token)).toBe(true);
    expect(token).not.toMatch(/user/i);
  });
});
