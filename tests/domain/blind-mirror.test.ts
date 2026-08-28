import { describe, expect, it } from "vitest";

import {
  blindMirrorHeadline,
  buildBlindMirrorComparison,
  classifyBlindMirrorComparison,
  findBlindMirrorPair,
  type BlindMirrorRoundSnapshot,
} from "@/domain/daily/blind-mirror";

const tension = {
  id: "50000000-0000-4000-8000-000000000011",
  slug: "loyalty-justice",
  leftLabel: "LOYALTY",
  rightLabel: "JUSTICE",
  displayLabel: "LOYALTY vs. JUSTICE",
};

const principle = {
  id: "60000000-0000-4000-8000-000000000001",
  slug: "truth-versus-loyalty",
  displayName: "Truth versus loyalty",
  description: null,
};

function snapshot(input: {
  roundId: string;
  roundDate: string;
  label: string;
  sides: Array<"left" | "right">;
  line?: string;
}): BlindMirrorRoundSnapshot {
  const positions = [1, 2, 3, 4];
  return {
    roundId: input.roundId,
    roundDate: input.roundDate,
    context: { subject: "friend", label: input.label },
    tension,
    trajectoryInputs: [
      ...positions.map((position, index) => ({
        stage: (["instinct", "pressure", "consequence", "flip"] as const)[index]!,
        position,
        choiceLabel: input.sides[index] === "right" ? "Tell them" : "Stay silent",
        tensionSide: input.sides[index]!,
        pressureType: null,
        isLine: false,
      })),
      {
        stage: "line" as const,
        position: 5,
        choiceLabel: input.line ?? "The moment I know",
        tensionSide: "neutral" as const,
        pressureType: null,
        isLine: true,
      },
    ],
  };
}

describe("blind mirror domain", () => {
  it("classifies same final side across both situations", () => {
    expect(
      classifyBlindMirrorComparison({
        earlierInitialSide: "right",
        laterInitialSide: "left",
        earlierFinalSide: "right",
        laterFinalSide: "right",
        earlierLine: "The moment I know",
        laterLine: "The moment I know",
      }),
    ).toBe("DIFFERENT_START_SAME_FINISH");
  });

  it("classifies different final side", () => {
    expect(
      classifyBlindMirrorComparison({
        earlierInitialSide: "right",
        laterInitialSide: "right",
        earlierFinalSide: "right",
        laterFinalSide: "left",
        earlierLine: "The moment I know",
        laterLine: "The moment I know",
      }),
    ).toBe("SAME_START_DIFFERENT_FINISH");
  });

  it("prioritizes line moved when line choices differ", () => {
    expect(
      classifyBlindMirrorComparison({
        earlierInitialSide: "right",
        laterInitialSide: "right",
        earlierFinalSide: "right",
        laterFinalSide: "right",
        earlierLine: "The moment I know",
        laterLine: "If it happens again",
      }),
    ).toBe("LINE_MOVED");
  });

  it("builds comparison with observational headline", () => {
    const comparison = buildBlindMirrorComparison({
      principle,
      earlier: snapshot({
        roundId: "40000000-0000-4000-8000-000000000006",
        roundDate: "2026-08-27",
        label: "YOUR CLOSEST FRIEND",
        sides: ["right", "right", "right", "right"],
      }),
      later: snapshot({
        roundId: "40000000-0000-4000-8000-000000000007",
        roundDate: "2026-10-13",
        label: "YOUR SIBLING",
        sides: ["right", "right", "right", "left"],
      }),
    });

    expect(comparison?.comparisonType).toBe("SAME_START_DIFFERENT_FINISH");
    expect(comparison?.headline).toBe(blindMirrorHeadline("SAME_START_DIFFERENT_FINISH"));
    expect(comparison?.earlierResultLabel).toBe("JUSTICE");
    expect(comparison?.laterResultLabel).toBe("LOYALTY");
  });

  it("returns null when trackable side data is missing", () => {
    const neutralSnapshot = snapshot({
      roundId: "b",
      roundDate: "2026-10-13",
      label: "B",
      sides: ["right", "right", "right", "right"],
    });
    const comparison = buildBlindMirrorComparison({
      principle,
      earlier: snapshot({
        roundId: "a",
        roundDate: "2026-08-27",
        label: "A",
        sides: ["right", "right", "right", "right"],
      }),
      later: {
        ...neutralSnapshot,
        trajectoryInputs: neutralSnapshot.trajectoryInputs.map((item) =>
          !item.isLine ? { ...item, tensionSide: "neutral" as const } : item,
        ),
      },
    });

    expect(comparison).toBeNull();
  });

  it("finds prior completed round only when later round is current", () => {
    const earlier = snapshot({
      roundId: "40000000-0000-4000-8000-000000000006",
      roundDate: "2026-08-27",
      label: "YOUR CLOSEST FRIEND",
      sides: ["right", "right", "right", "right"],
    });
    const later = snapshot({
      roundId: "40000000-0000-4000-8000-000000000007",
      roundDate: "2026-10-13",
      label: "YOUR SIBLING",
      sides: ["left", "left", "left", "left"],
    });

    const eligible = findBlindMirrorPair({
      principle,
      currentRoundId: later.roundId,
      currentRoundDate: later.roundDate,
      snapshots: [earlier, later],
    });
    expect(eligible?.earlierContext.label).toBe("YOUR CLOSEST FRIEND");
    expect(eligible?.laterContext.label).toBe("YOUR SIBLING");
    expect(eligible?.comparisonType).toBe("SAME_RULE_DIFFERENT_CALL");

    const ineligible = findBlindMirrorPair({
      principle,
      currentRoundId: earlier.roundId,
      currentRoundDate: earlier.roundDate,
      snapshots: [earlier, later],
    });
    expect(ineligible).toBeNull();
  });

  it("ignores rounds with different principle in pair lookup", () => {
    const result = findBlindMirrorPair({
      principle,
      currentRoundId: "40000000-0000-4000-8000-000000000007",
      currentRoundDate: "2026-10-06",
      snapshots: [
        snapshot({
          roundId: "40000000-0000-4000-8000-000000000007",
          roundDate: "2026-10-13",
          label: "YOUR SIBLING",
          sides: ["right", "right", "right", "right"],
        }),
      ],
    });
    expect(result).toBeNull();
  });
});
