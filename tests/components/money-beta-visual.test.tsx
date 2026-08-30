import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const trackEvent = vi.fn(async () => undefined);

vi.mock("@/server/actions/analytics", () => ({
  trackEvent: () => trackEvent(),
}));

vi.mock("@/server/actions/onboarding", () => ({
  completeOnboardingAction: vi.fn(),
}));

vi.mock("@/server/actions/play", () => ({
  saveDraftPlayAction: vi.fn(),
  sealPickOnlyPlayAction: vi.fn(),
  sealPlayAction: vi.fn(),
  sealLinePlayAction: vi.fn(),
  openDailyRoundRevealAction: vi.fn(),
}));

vi.mock("@/server/dal/continuous-experiment", () => ({
  getLandingPlayContext: vi.fn(async () => ({
    ctaLabel: "PLAY TODAY'S EXPERIMENT",
    hasPlayableDaily: false,
    hasContinuousInventory: true,
  })),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

import LandingPage from "@/app/(marketing)/page";
import { MoneyDay1Rehearsal } from "@/components/dev/MoneyDay1Rehearsal";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";
import { PlayExperience } from "@/components/play/PlayExperience";
import type { PlayMarshmallow } from "@/domain/play/types";
import type { DailyRoundProgress } from "@/domain/daily/round";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  window.sessionStorage.clear();
});

const tension = {
  id: "50000000-0000-4000-8000-000000000007",
  slug: "belonging-independence",
  leftLabel: "BELONGING",
  rightLabel: "INDEPENDENCE",
  displayLabel: "BELONGING vs. INDEPENDENCE",
};

const priceDailyRound: DailyRoundProgress = {
  roundId: "40000000-0000-4000-8000-000000000009",
  title: "Would you move for their dream job?",
  subtitle: null,
  topicName: "Money",
  tension,
  roundDate: "2026-09-02",
  questions: [],
  sealedCount: 0,
  allSealed: false,
  allRevealed: false,
  anyRevealOpened: false,
  currentPlayId: "31000000-0000-4000-8000-000000000050",
  revealHref: "/daily/40000000-0000-4000-8000-000000000009/reveal",
  todaysRead: null,
  isExperimentDaily: true,
  experimentArchetype: "price",
  blindMirror: null,
};

function priceMarshmallow(): PlayMarshmallow {
  return {
    id: "31000000-0000-4000-8000-000000000050",
    status: "open",
    opens_at: "2026-09-02T12:00:00.000Z",
    closes_at: "2026-09-03T01:00:00.000Z",
    reveals_at: "2026-09-03T03:30:00.000Z",
    hard_reveals_at: "2026-09-03T04:00:00.000Z",
    is_daily: true,
    play_mode: "daily",
    topicName: "Money",
    entityLabel: null,
    spoilerContext: null,
    imageUrl: null,
    expiresAt: null,
    switchPrompt: null,
    switchStayed: null,
    switchOriginalChoiceId: null,
    isLine: false,
    choices: [
      { id: "a", label: "Move with them", sort_order: 0, tensionSide: "left" },
      { id: "b", label: "Stay where you are", sort_order: 1, tensionSide: "right" },
    ],
    ownChoiceId: null,
    sealed: false,
    sealedAt: null,
    allocations: [],
    openedReveal: false,
    screen: "play",
    nowIso: "2026-09-02T12:00:00.000Z",
    reveal: null,
    nextHref: "/home",
    dailyRound: priceDailyRound,
    roundPosition: 1,
    dailyNextHref: null,
    requiresPrediction: false,
    experimentStage: "instinct",
    isExperimentDaily: true,
    experimentPriorChoiceLabel: null,
    experimentPriorTensionSide: null,
    experimentInitialTensionSide: null,
    experimentCostType: null,
    experimentCostLabel: "Before any offer details",
    experimentArchetype: "price",
    presentationMode: "standard",
    entrySurface: "daily",
    continuousNextHref: null,
    question: "Would you move for their dream job?",
  };
}

describe("money beta visual journey", () => {
  it("removes redundant all-caps MARSHMALLOW from landing hero", async () => {
    render(await LandingPage());
    expect(screen.getAllByText(/Marshmallow/i).length).toBeGreaterThan(0);
    expect(screen.queryByRole("heading", { name: /^MARSHMALLOW$/i })).toBeNull();
    expect(screen.getByRole("heading", { name: /what's your price/i })).toBeTruthy();
  });

  it("uses money green CTAs on onboarding without purple primary buttons", () => {
    render(<OnboardingFlow username="founder" displayName="Founder" />);
    expect(screen.getByText("Marshmallow")).toBeTruthy();
    const continueButton = screen.getByRole("button", { name: /^Continue$/i });
    expect(continueButton.className).toContain("bg-money");
    expect(continueButton.className).not.toContain("bg-primary");
  });

  it("shows brand anchor on price experiment gameplay", () => {
    render(<PlayExperience marshmallow={priceMarshmallow()} />);
    expect(screen.getByText("Marshmallow")).toBeTruthy();
    expect(document.querySelector(".money-experiment")).toBeTruthy();
  });

  it("keeps rehearsal local with reset and no analytics writes", async () => {
    render(<MoneyDay1Rehearsal />);
    expect(await screen.findByText(/Rehearsal data · dev only/i)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /BEGIN EXPERIMENT/i }));
    expect(trackEvent).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /Reset rehearsal/i }));
    expect(await screen.findByRole("button", { name: /BEGIN EXPERIMENT/i })).toBeTruthy();
  });
});
