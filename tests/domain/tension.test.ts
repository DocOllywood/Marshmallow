import { describe, expect, it } from "vitest";

import { mapHumanTension, parseTensionSide } from "@/domain/daily/tension";

describe("human tensions", () => {
  it("maps database rows to tension objects", () => {
    expect(
      mapHumanTension({
        id: "50000000-0000-4000-8000-000000000001",
        slug: "honesty-kindness",
        left_label: "HONESTY",
        right_label: "KINDNESS",
        display_label: "HONESTY vs. KINDNESS",
      }),
    ).toEqual({
      id: "50000000-0000-4000-8000-000000000001",
      slug: "honesty-kindness",
      leftLabel: "HONESTY",
      rightLabel: "KINDNESS",
      displayLabel: "HONESTY vs. KINDNESS",
    });
  });

  it("parses tension_side metadata", () => {
    expect(parseTensionSide({ tension_side: "left" })).toBe("left");
    expect(parseTensionSide({ tension_side: "right" })).toBe("right");
    expect(parseTensionSide({ tension_side: "neutral" })).toBe("neutral");
    expect(parseTensionSide({})).toBeNull();
    expect(parseTensionSide(null)).toBeNull();
  });
});
