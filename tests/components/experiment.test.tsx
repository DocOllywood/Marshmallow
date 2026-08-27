import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const saveDraftPlayAction = vi.hoisted(() => vi.fn(async () => ({ ok: true, closed: false })));
const sealPickOnlyPlayAction = vi.hoisted(() => vi.fn(async () => ({ ok: true, sealed: true, closed: false })));
const sealPlayAction = vi.hoisted(() => vi.fn(async () => ({ ok: true, sealed: true, closed: false })));
const sealLinePlayAction = vi.hoisted(() => vi.fn(async () => ({ ok: true, sealed: true, closed: false })));
const openDailyRoundRevealAction = vi.hoisted(() => vi.fn(async () => ({ ok: true })));

vi.mock("@/server/actions/analytics", () => ({
  trackEvent: vi.fn(async () => undefined),
}));

vi.mock("@/server/actions/play", () => ({
  saveDraftPlayAction: saveDraftPlayAction,
  sealPickOnlyPlayAction: sealPickOnlyPlayAction,
  sealPlayAction: sealPlayAction,
  sealLinePlayAction: sealLinePlayAction,
  openDailyRoundRevealAction: openDailyRoundRevealAction,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

import { ExperimentDailyHomeSection } from "@/components/experiment/ExperimentDailyHomeSection";
import { ExperimentMovementFeedback } from "@/components/experiment/ExperimentMovementFeedback";
import { ExperimentPlayExperience } from "@/components/experiment/ExperimentPlayExperience";
import { ExperimentRevealReadyGate } from "@/components/experiment/ExperimentRevealReadyGate";
import { ExperimentRevealShow } from "@/components/experiment/ExperimentRevealShow";
import { ExperimentStageHeader } from "@/components/experiment/ExperimentStageHeader";
import { ExperimentTodaysReadCard } from "@/components/experiment/ExperimentTodaysReadCard";
import { OutsideTheExperiment } from "@/components/experiment/OutsideTheExperiment";
import { PlayExperience } from "@/components/play/PlayExperience";
import { buildExperimentCrowdTrajectory } from "@/domain/daily/crowd-trajectory";
import { buildUserPathPoints } from "@/domain/daily/experiment-play";
import type { PlayMarshmallow } from "@/domain/play/types";
import type { DailyRoundProgress } from "@/domain/daily/round";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const tension = {
  id: "50000000-0000-4000-8000-000000000001",
  slug: "loyalty-justice",
  leftLabel: "LOYALTY",
  rightLabel: "JUSTICE",
  displayLabel: "LOYALTY vs. JUSTICE",
};

const dailyRoundBase: DailyRoundProgress = {
  roundId: "40000000-0000-4000-8000-000000000010",
  title: "How much does loyalty excuse?",
  subtitle: null,
  topicName: "Love",
  tension,
  roundDate: "2026-08-28",
  questions: [],
  sealedCount: 0,
  allSealed: false,
  allRevealed: false,
  anyRevealOpened: false,
  currentPlayId: "31000000-0000-4000-8000-000000000001",
  revealHref: "/daily/40000000-0000-4000-8000-000000000010/reveal",
  todaysRead: null,
  isExperimentDaily: true,
};

function experimentMarshmallow(
  overrides: Partial<PlayMarshmallow> & Pick<PlayMarshmallow, "id" | "question">,
): PlayMarshmallow {
  return {
    status: "open",
    opens_at: "2026-08-28T12:00:00.000Z",
    closes_at: "2026-08-28T22:00:00.000Z",
    reveals_at: "2026-08-28T22:00:00.000Z",
    hard_reveals_at: "2026-08-28T23:00:00.000Z",
    is_daily: true,
    play_mode: "daily",
    topicName: "Love",
    entityLabel: null,
    spoilerContext: null,
    imageUrl: null,
    expiresAt: null,
    switchPrompt: null,
    switchStayed: null,
    switchOriginalChoiceId: null,
    isLine: false,
    choices: [
      { id: "a", label: "Tell them", sort_order: 0, tensionSide: "right" },
      { id: "b", label: "Stay quiet", sort_order: 1, tensionSide: "left" },
    ],
    ownChoiceId: null,
    sealed: false,
    sealedAt: null,
    allocations: [],
    openedReveal: false,
    screen: "play",
    nowIso: "2026-08-28T12:00:00.000Z",
    reveal: null,
    nextHref: "/home",
    dailyRound: dailyRoundBase,
    roundPosition: 1,
    dailyNextHref: null,
    requiresPrediction: false,
    experimentStage: "instinct",
    isExperimentDaily: true,
    experimentPriorChoiceLabel: null,
    experimentPriorTensionSide: null,
    ...overrides,
  };
}

describe("experiment daily home", () => {
  it("shows the experiment hierarchy and begin CTA", () => {
    render(<ExperimentDailyHomeSection round={dailyRoundBase} />);

    expect(screen.getByText(/The daily experiment/i)).toBeTruthy();
    expect(screen.getByText(/Today everyone is playing/i)).toBeTruthy();
    expect(screen.getByText("LOYALTY vs. JUSTICE")).toBeTruthy();
    expect(screen.getByText(/How much does loyalty excuse/i)).toBeTruthy();
    expect(screen.getByText(/One situation/i)).toBeTruthy();
    expect(screen.getByText(/Five changes/i)).toBeTruthy();
    expect(screen.getByRole("link", { name: "BEGIN" })).toBeTruthy();
  });
});

describe("experiment stage header", () => {
  it("renders tension, position, and stage label", () => {
    render(<ExperimentStageHeader tension={tension} position={1} stage="instinct" />);
    expect(screen.getByText("LOYALTY vs. JUSTICE")).toBeTruthy();
    expect(screen.getByText("01 OF 05")).toBeTruthy();
    expect(screen.getByText("INSTINCT")).toBeTruthy();
  });
});

describe("experiment movement feedback", () => {
  it("shows neutral held and moved copy", () => {
    const { rerender } = render(<ExperimentMovementFeedback feedback="held" />);
    expect(screen.getByText("YOU HELD.")).toBeTruthy();
    rerender(<ExperimentMovementFeedback feedback="moved" />);
    expect(screen.getByText("YOU MOVED.")).toBeTruthy();
  });
});

describe("experiment play — instinct", () => {
  it("shows instinct structure without prediction UI", async () => {
    render(
      <ExperimentPlayExperience
        marshmallow={experimentMarshmallow({
          id: "m1",
          question: "Your friend cheated once. Their spouse asks you directly.",
        })}
      />,
    );

    expect(screen.getByText("INSTINCT")).toBeTruthy();
    expect(screen.getByText(/Go with your first instinct/i)).toBeTruthy();
    expect(screen.queryByText(/Read the room/i)).toBeNull();
    expect(screen.queryByText(/LOCK IT IN/i)).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Tell them" }));

    await waitFor(() => {
      expect(sealPickOnlyPlayAction).toHaveBeenCalled();
    });
    expect(screen.queryByRole("slider")).toBeNull();
  });
});

describe("experiment play — pressure", () => {
  it("shows prior choice and pressure copy", () => {
    render(
      <ExperimentPlayExperience
        marshmallow={experimentMarshmallow({
          id: "m2",
          question: "They will never find out unless you speak.",
          roundPosition: 2,
          experimentStage: "pressure",
          experimentPriorChoiceLabel: "TELL THEM",
          experimentPriorTensionSide: "right",
          dailyNextHref: "/m/m3",
        })}
      />,
    );

    expect(screen.getByText("PRESSURE")).toBeTruthy();
    expect(screen.getByText(/You chose/i)).toBeTruthy();
    expect(screen.getByText("TELL THEM")).toBeTruthy();
    expect(screen.getByText(/Same secret. One new fact/i)).toBeTruthy();
  });
});

describe("experiment play — consequence", () => {
  it("shows consequence stage without crowd or prediction", () => {
    render(
      <ExperimentPlayExperience
        marshmallow={experimentMarshmallow({
          id: "m3",
          question: "Speaking up will end their marriage.",
          roundPosition: 3,
          experimentStage: "consequence",
          experimentPriorChoiceLabel: "STAY QUIET",
          experimentPriorTensionSide: "left",
        })}
      />,
    );

    expect(screen.getByText("CONSEQUENCE")).toBeTruthy();
    expect(screen.getByText(/Now add the consequence/i)).toBeTruthy();
    expect(screen.queryByText(/Read the room/i)).toBeNull();
    expect(screen.queryByText(/The crowd/i)).toBeNull();
  });
});

describe("experiment play — flip and read the room", () => {
  it("shows flip pick then read the room prediction only on Q4", async () => {
    const { rerender } = render(
      <ExperimentPlayExperience
        marshmallow={experimentMarshmallow({
          id: "m4",
          question: "Imagine you're the spouse. Would you want to know?",
          roundPosition: 4,
          experimentStage: "flip",
          requiresPrediction: true,
        })}
      />,
    );

    expect(screen.getByText("FLIP")).toBeTruthy();
    expect(screen.getByText(/Now change sides/i)).toBeTruthy();
    expect(screen.queryByText(/Read the room/i)).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Tell them" }));

    await waitFor(() => {
      expect(saveDraftPlayAction).toHaveBeenCalled();
    });

    rerender(
      <ExperimentPlayExperience
        marshmallow={experimentMarshmallow({
          id: "m4",
          question: "Imagine you're the spouse. Would you want to know?",
          roundPosition: 4,
          experimentStage: "flip",
          requiresPrediction: true,
          ownChoiceId: "a",
        })}
      />,
    );

    expect(screen.getByText(/Read the room/i)).toBeTruthy();
    expect(screen.getByText(/Marshmallow players will do/i)).toBeTruthy();
    expect(screen.getByText(/Don't answer for yourself/i)).toBeTruthy();
    expect(screen.getByRole("slider")).toBeTruthy();
    expect(screen.getByRole("button", { name: /LOCK IT IN/i })).toBeTruthy();
    expect(screen.queryByText(/Switch/i)).toBeNull();
  });
});

describe("experiment play — the line", () => {
  it("shows line stage without prediction", () => {
    render(
      <ExperimentPlayExperience
        marshmallow={experimentMarshmallow({
          id: "m5",
          question: "How long before you'd consider it betrayal?",
          roundPosition: 5,
          experimentStage: "line",
          isLine: true,
          choices: [
            { id: "week", label: "A week", sort_order: 0 },
            { id: "month", label: "A month", sort_order: 1 },
          ],
        })}
      />,
    );

    expect(screen.getByText("THE LINE")).toBeTruthy();
    expect(screen.queryByText(/Read the room/i)).toBeNull();
    expect(screen.getByRole("button", { name: "A month" })).toBeTruthy();
  });
});

describe("experiment today's read and wait", () => {
  it("shows trajectory read, outside the experiment, and wait copy", () => {
    render(
      <ExperimentTodaysReadCard
        read={{
          headline: "YOU NEVER MOVED.",
          bodyLines: [
            "Remorse didn't move you.",
            "The consequences didn't move you.",
            "Changing perspective didn't move you.",
            "Your answer stayed on the same side throughout.",
          ],
          lineCopy: "A month before you'd consider it a betrayal.",
          switchCopy: null,
          tomorrowTease: null,
          isLegacy: false,
          isExperiment: true,
        }}
        tensionSlug="loyalty-justice"
      />,
    );

    expect(screen.getByText(/Today's read/i)).toBeTruthy();
    expect(screen.getByText("YOU NEVER MOVED.")).toBeTruthy();
    expect(screen.getByText(/Outside the experiment/i)).toBeTruthy();
    expect(screen.getByText(/Your calls are locked/i)).toBeTruthy();
    expect(screen.getByText(/The crowd is still deciding/i)).toBeTruthy();
    expect(screen.getByText(/Come back tonight to see where everyone else moved/i)).toBeTruthy();
    expect(screen.getByText(/Your line/i)).toBeTruthy();
    expect(screen.getByText(/No points. No proof. Nobody needs to know/i)).toBeTruthy();
  });

  it("renames today's marshmallow to outside the experiment", () => {
    render(<OutsideTheExperiment tensionSlug="loyalty-justice" />);
    expect(screen.getByText(/Outside the experiment/i)).toBeTruthy();
    expect(screen.queryByText(/Today's Marshmallow/i)).toBeNull();
  });
});

describe("experiment reveal gate", () => {
  it("shows intentional reveal gate copy", () => {
    render(
      <ExperimentRevealReadyGate
        roundId="40000000-0000-4000-8000-000000000010"
        title="How much does loyalty excuse?"
        revealHref="/daily/40000000-0000-4000-8000-000000000010/reveal"
      />,
    );

    expect(screen.getByText(/The crowd is in/i)).toBeTruthy();
    expect(screen.getByText(/Where did everyone else move/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /REVEAL THE EXPERIMENT/i })).toBeTruthy();
  });
});

describe("experiment reveal — crowd trajectory and your path", () => {
  const crowdTrajectory = buildExperimentCrowdTrajectory({
    tension,
    referenceSide: "right",
    stages: [
      { stage: "instinct", position: 1, leftPct: 32, rightPct: 68 },
      { stage: "pressure", position: 2, leftPct: 39, rightPct: 61 },
      { stage: "consequence", position: 3, leftPct: 53, rightPct: 47 },
      { stage: "flip", position: 4, leftPct: 28, rightPct: 72 },
    ],
  })!;

  const userPath = buildUserPathPoints(
    {
      initialSide: "right",
      finalSide: "right",
      heldThroughout: false,
      moved: true,
      firstMovementStage: "consequence",
      firstMovementPressureType: null,
      movementCount: 2,
      returnedToOriginalPosition: true,
      stageChoices: [
        {
          stage: "instinct",
          position: 1,
          side: "right",
          choiceLabel: "JUSTICE",
          pressureType: null,
        },
        {
          stage: "pressure",
          position: 2,
          side: "right",
          choiceLabel: "JUSTICE",
          pressureType: null,
        },
        {
          stage: "consequence",
          position: 3,
          side: "left",
          choiceLabel: "LOYALTY",
          pressureType: null,
        },
        {
          stage: "flip",
          position: 4,
          side: "right",
          choiceLabel: "JUSTICE",
          pressureType: null,
        },
        {
          stage: "line",
          position: 5,
          side: null,
          choiceLabel: "A month",
          pressureType: null,
        },
      ],
      lineChoice: "A month",
    },
    tension,
  );

  it("shows crowd trajectory, your path, Q4 scoring, and line section", () => {
    render(
      <ExperimentRevealShow
        reveals={[
          {
            id: "q4",
            position: 4,
            isLine: false,
            question: "Flip",
            ownChoiceLabel: "Yes",
            predictedPct: 58,
            crowdPct: 72,
            crowdLabel: "Yes",
            crowdModeLabel: null,
            errorCopy: null,
            gap: {
              gapPoints: 14,
              predictedPct: 58,
              crowdPct: 72,
              tierCopy: "Solid read.",
              directionCopy: null,
            },
            accuracy: 86,
          },
          {
            id: "q5",
            position: 5,
            isLine: true,
            question: "Where is the line?",
            ownChoiceLabel: "A month",
            predictedPct: null,
            crowdPct: 34,
            crowdLabel: "A month",
            crowdModeLabel: "A month",
            errorCopy: null,
            gap: null,
            accuracy: null,
          },
        ]}
        summary={{
          strongReadCount: 1,
          scoredQuestionCount: 1,
          averageAccuracy: 86,
          contextCopy: null,
          crowdsenseRating: 812,
          crowdsenseDelta: 3,
          isExperimentDaily: true,
          strongReadLabel: "Strong read",
        }}
        crowdTrajectory={crowdTrajectory}
        userPath={userPath}
      />,
    );

    expect(screen.getByText(/^The crowd$/i)).toBeTruthy();
    expect(screen.getByText(/68% JUSTICE/i)).toBeTruthy();
    expect(screen.getByText(/THE CROWD MOVED AT PRESSURE/i)).toBeTruthy();
    expect(screen.getByText(/Your path/i)).toBeTruthy();
    expect(screen.getAllByText(/YOU MOVED/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Your prediction/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Marshmallow players/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Accuracy 86/i)).toBeTruthy();
    expect(screen.getByText(/CrowdSense 812/i)).toBeTruthy();
    expect(screen.getByText(/Where players drew the line/i)).toBeTruthy();
    expect(screen.getByText(/Your line:/i)).toBeTruthy();
  });
});

describe("experiment resume behavior", () => {
  it("resumes flip at read the room when pick is saved but not sealed", () => {
    render(
      <ExperimentPlayExperience
        marshmallow={experimentMarshmallow({
          id: "m4-resume",
          question: "Imagine you are the spouse. Would you want your friend to tell you?",
          roundPosition: 4,
          experimentStage: "flip",
          requiresPrediction: true,
          ownChoiceId: "a",
          sealed: false,
        })}
      />,
    );

    expect(screen.getByText(/Read the room/i)).toBeTruthy();
    expect(screen.getByRole("slider")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Stay silent" })).toBeNull();
  });

  it("resumes after sealed pick-only stage with continue affordance", () => {
    render(
      <ExperimentPlayExperience
        marshmallow={experimentMarshmallow({
          id: "m1-resume",
          question: "Do you tell them?",
          ownChoiceId: "a",
          sealed: true,
          dailyNextHref: "/m/31000000-0000-4000-8000-000000000021",
        })}
      />,
    );

    expect(screen.getByText(/Call locked/i)).toBeTruthy();
    expect(screen.getByRole("link", { name: "CONTINUE" })).toBeTruthy();
  });

  it("resumes after sealed flip with continue to line", () => {
    render(
      <ExperimentPlayExperience
        marshmallow={experimentMarshmallow({
          id: "m4-sealed",
          question: "Flip",
          roundPosition: 4,
          experimentStage: "flip",
          requiresPrediction: true,
          ownChoiceId: "a",
          sealed: true,
          dailyNextHref: "/m/31000000-0000-4000-8000-000000000024",
        })}
      />,
    );

    expect(screen.getByText(/Call locked/i)).toBeTruthy();
    expect(screen.getByRole("link", { name: "CONTINUE" })).toBeTruthy();
  });
});

describe("legacy daily unchanged", () => {
  it("delegates legacy dailies to the existing play experience", () => {
    render(
      <PlayExperience
        marshmallow={{
          ...experimentMarshmallow({
            id: "legacy-m1",
            question: "Would you want to know?",
          }),
          isExperimentDaily: false,
          experimentStage: null,
          requiresPrediction: true,
          dailyRound: {
            ...dailyRoundBase,
            isExperimentDaily: false,
            title: "Can love survive complete honesty?",
          },
        }}
      />,
    );

    expect(screen.queryByText("INSTINCT")).toBeNull();
    expect(screen.getByText(/Question 1 of/i)).toBeTruthy();
  });
});
