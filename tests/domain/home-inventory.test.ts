import { describe, expect, it } from "vitest";

import { isStandaloneHomeInventory } from "@/domain/home/inventory";

describe("isStandaloneHomeInventory", () => {
  it("allows ordinary Quick and Live inventory", () => {
    expect(isStandaloneHomeInventory(null)).toBe(true);
    expect(isStandaloneHomeInventory(undefined)).toBe(true);
  });

  it("excludes today's and historical Daily rounds from standalone inventory", () => {
    expect(isStandaloneHomeInventory("40000000-0000-4000-8000-000000000004")).toBe(false);
    expect(isStandaloneHomeInventory("40000000-0000-4000-8000-000000000001")).toBe(false);
  });
});
