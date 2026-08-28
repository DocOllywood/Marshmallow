import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/server/actions/analytics", () => ({
  trackEvent: vi.fn(async () => undefined),
}));

import { BlindMirrorCard } from "@/components/experiment/BlindMirrorCard";
import { ExperimentTodaysReadCard } from "@/components/experiment/ExperimentTodaysReadCard";
import type { BlindMirrorComparison } from "@/domain/daily/blind-mirror";

afterEach(() => {
  cleanup();
});

const comparison: BlindMirrorComparison = {
  principleId: "60000000-0000-4000-8000-000000000001",
  principleLabel: "Truth versus loyalty",
  earlierRoundId: "40000000-0000-4000-8000-000000000006",
  laterRoundId: "40000000-0000-4000-8000-000000000007",
  earlierContext: { subject: "friend", label: "YOUR CLOSEST FRIEND" },
  laterContext: { subject: "family", label: "YOUR SIBLING" },
  earlierInitialSide: "right",
  laterInitialSide: "right",
  earlierFinalSide: "right",
  laterFinalSide: "left",
  earlierLine: "The moment I know",
  laterLine: "The moment I know",
  sameInitialPosition: true,
  sameFinalPosition: false,
  lineChanged: false,
  comparisonType: "SAME_START_DIFFERENT_FINISH",
  headline: "YOU STARTED THE SAME WAY. YOU ENDED SOMEWHERE DIFFERENT.",
  earlierResultLabel: "JUSTICE",
  laterResultLabel: "LOYALTY",
};

describe("BlindMirrorCard", () => {
  it("renders observational comparison copy", () => {
    render(<BlindMirrorCard comparison={comparison} />);

    expect(screen.getByText("Blind mirror")).toBeTruthy();
    expect(screen.getByText("You've faced this rule before.")).toBeTruthy();
    expect(screen.getByText("YOUR CLOSEST FRIEND")).toBeTruthy();
    expect(screen.getByText("YOUR SIBLING")).toBeTruthy();
    expect(screen.getByText("JUSTICE")).toBeTruthy();
    expect(screen.getByText("LOYALTY")).toBeTruthy();
    expect(
      screen.getByText("YOU STARTED THE SAME WAY. YOU ENDED SOMEWHERE DIFFERENT."),
    ).toBeTruthy();
  });
});

describe("ExperimentTodaysReadCard blind mirror placement", () => {
  it("places Blind Mirror between Today's Read and Outside the Experiment", () => {
    render(
      <ExperimentTodaysReadCard
        read={{
          headline: "YOU HELD THE SAME LINE FROM BOTH SIDES.",
          bodyLines: ["Your answer stayed on the same side throughout."],
          lineCopy: "The moment I know",
          switchCopy: null,
          tomorrowTease: null,
          isLegacy: false,
          isExperiment: true,
        }}
        blindMirror={comparison}
        tensionSlug="loyalty-justice"
      />,
    );

    const today = screen.getByText("Today's read");
    const blindMirror = screen.getByText("Blind mirror");
    const outside = screen.getByText("Outside the experiment");
    const locked = screen.getByText("Your calls are locked.");

    expect(today.compareDocumentPosition(blindMirror) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(blindMirror.compareDocumentPosition(outside) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(outside.compareDocumentPosition(locked) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("omits Blind Mirror when ineligible", () => {
    render(
      <ExperimentTodaysReadCard
        read={{
          headline: "YOU HELD THE SAME LINE FROM BOTH SIDES.",
          bodyLines: [],
          lineCopy: null,
          switchCopy: null,
          tomorrowTease: null,
          isLegacy: false,
          isExperiment: true,
        }}
        tensionSlug="loyalty-justice"
      />,
    );

    expect(screen.queryByText("Blind mirror")).toBeNull();
  });
});
