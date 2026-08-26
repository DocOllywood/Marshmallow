import { describe, expect, it } from "vitest";

import { computeGap, gapTierCopy } from "@/domain/scoring/gap";

describe("the gap", () => {
  it("uses absolute difference between predicted and crowd share for the user's choice", () => {
    const gap = computeGap(68, 43);
    expect(gap.gapPoints).toBe(25);
    expect(gap.predictedPct).toBe(68);
    expect(gap.crowdPct).toBe(43);
  });

  it("labels small gaps as reading the room", () => {
    expect(gapTierCopy(0)).toBe("YOU READ THE ROOM.");
    expect(gapTierCopy(5)).toBe("YOU READ THE ROOM.");
    expect(computeGap(52, 50).directionCopy).toBeNull();
  });

  it("uses close read for mid-small gaps", () => {
    expect(gapTierCopy(6)).toBe("CLOSE READ.");
    expect(gapTierCopy(15)).toBe("CLOSE READ.");
  });

  it("uses crowd-leaned copy for medium gaps", () => {
    expect(gapTierCopy(16)).toBe("THE CROWD LEANED DIFFERENTLY.");
    expect(gapTierCopy(30)).toBe("THE CROWD LEANED DIFFERENTLY.");
  });

  it("uses very different copy for large gaps", () => {
    expect(gapTierCopy(31)).toBe("YOU SAW THE CROWD VERY DIFFERENTLY.");
  });

  it("describes overestimation directionally", () => {
    expect(computeGap(68, 43).directionCopy).toBe(
      "You expected more Marshmallow players to agree with you.",
    );
  });

  it("describes underestimation directionally", () => {
    expect(computeGap(40, 61).directionCopy).toBe(
      "You expected fewer Marshmallow players to agree with you.",
    );
  });
});
