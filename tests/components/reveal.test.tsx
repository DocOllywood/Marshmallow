import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/actions/analytics", () => ({
  trackEvent: async () => undefined,
}));

vi.mock("@/server/actions/share", () => ({
  createShareCardAction: async () => ({ ok: true, publicId: "a".repeat(32) }),
}));

vi.mock("@/server/actions/feedback", () => ({
  submitBetaFeedbackAction: async () => ({ error: "" }),
}));

import { RevealShow } from "@/components/play/RevealExperience";
import type { PlayMarshmallow } from "@/domain/play/types";

afterEach(() => cleanup());

const base: PlayMarshmallow = {
  id: "m1",
  question: "Who won?",
  status: "revealed",
  opens_at: "2026-08-21T10:00:00.000Z",
  closes_at: "2026-08-21T11:00:00.000Z",
  reveals_at: "2026-08-21T12:00:00.000Z",
  hard_reveals_at: "2026-08-21T12:00:00.000Z",
  is_daily: true,
  play_mode: "daily",
  topicName: "Reality",
  entityLabel: null,
  spoilerContext: null,
  imageUrl: null,
  expiresAt: null,
  choices: [
    { id: "alex", label: "Alex", sort_order: 0 },
    { id: "jordan", label: "Jordan", sort_order: 1 },
  ],
  ownChoiceId: "alex",
  sealed: true,
  sealedAt: "2026-08-21T10:30:00.000Z",
  allocations: [
    { choice_id: "alex", predicted_pct: 64 },
    { choice_id: "jordan", predicted_pct: 36 },
  ],
  openedReveal: true,
  screen: "revealed",
  nowIso: "2026-08-21T12:05:00.000Z",
  nextHref: "/home",
  reveal: {
    totalVotes: 10,
    choices: [
      { choiceId: "alex", label: "Alex", sortOrder: 0, youPct: 64, votePct: 61 },
      { choiceId: "jordan", label: "Jordan", sortOrder: 1, youPct: 36, votePct: 39 },
    ],
    accuracy: 98,
    basePoints: 98,
    bonusPoints: 10,
    bonusEarned: true,
    streakCurrent: 7,
    streakQualified: true,
    crowdsenseRating: 824,
    crowdsenseDelta: 4,
  },
};

describe("reveal UI", () => {
  it("shows binary stored Accuracy, points off, and bonus without Brier", () => {
    render(<RevealShow marshmallow={base} />);
    expect(screen.getByText(/the crowd is in/i)).toBeTruthy();
    expect(screen.getByText(/you called/i)).toBeTruthy();
    expect(screen.getByText("64%")).toBeTruthy();
    expect(screen.getByText("Only 3 points off")).toBeTruthy();
    expect(screen.getByText(/The crowd landed at 61%/i)).toBeTruthy();
    expect(screen.getByText(/Accuracy 98/)).toBeTruthy();
    expect(screen.getByText("+98 points")).toBeTruthy();
    expect(screen.getByText(/Reveal Bonus/)).toBeTruthy();
    expect(screen.getByText(/Reveal Streak: 7/)).toBeTruthy();
    expect(screen.getByText("You read the room.")).toBeTruthy();
    expect(screen.getByText(/Tomorrow, another question about being human/i)).toBeTruthy();
    expect(screen.queryByText(/brier/i)).toBeNull();
    expect(screen.queryByText(/window ended/i)).toBeNull();
    expect(screen.getByRole("link", { name: "PLAY ANOTHER" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Share this call" })).toBeTruthy();
  });

  it("shows you vs crowd rows for multi-choice using stored Accuracy", () => {
    render(
      <RevealShow
        marshmallow={{
          ...base,
          ownChoiceId: "a",
          choices: [
            { id: "a", label: "Alex", sort_order: 0 },
            { id: "b", label: "Jordan", sort_order: 1 },
            { id: "c", label: "Sam", sort_order: 2 },
          ],
          reveal: {
            ...base.reveal!,
            choices: [
              { choiceId: "a", label: "Alex", sortOrder: 0, youPct: 42, votePct: 39 },
              { choiceId: "b", label: "Jordan", sortOrder: 1, youPct: 31, votePct: 35 },
              { choiceId: "c", label: "Sam", sortOrder: 2, youPct: 27, votePct: 26 },
            ],
            accuracy: 91,
            basePoints: 91,
            bonusEarned: false,
            bonusPoints: 0,
            streakQualified: false,
            streakCurrent: null,
          },
        }}
      />,
    );
    expect(screen.getByText("You 42%")).toBeTruthy();
    expect(screen.getByText("Crowd 39%")).toBeTruthy();
    expect(screen.getByText("VERY CLOSE")).toBeTruthy();
    expect(screen.getByText(/Accuracy 91/)).toBeTruthy();
    expect(screen.queryByText(/brier|squared|multinomial/i)).toBeNull();
  });

  it("keeps spectator results public-only", () => {
    render(
      <RevealShow
        marshmallow={{
          ...base,
          sealed: false,
          ownChoiceId: null,
          screen: "revealed_spectator",
          openedReveal: false,
          reveal: {
            ...base.reveal!,
            accuracy: null,
            basePoints: null,
            bonusEarned: false,
            bonusPoints: 0,
            streakQualified: false,
            streakCurrent: null,
          },
        }}
      />,
    );
    expect(screen.getByText(/PLAYERS SAID/i)).toBeTruthy();
    expect(screen.queryByText(/Accuracy/)).toBeNull();
    expect(screen.queryByText(/Reveal Bonus/)).toBeNull();
    expect(screen.getByRole("link", { name: "PLAY AN OPEN MARSHMALLOW" })).toBeTruthy();
  });

  it("does not invent percentages when nobody sealed", () => {
    render(
      <RevealShow
        marshmallow={{
          ...base,
          sealed: false,
          screen: "revealed_spectator",
          reveal: { ...base.reveal!, totalVotes: 0, accuracy: null, basePoints: null },
        }}
      />,
    );
    expect(screen.getByText(/not enough players this time/i)).toBeTruthy();
    expect(screen.queryByText(/61%/)).toBeNull();
    expect(screen.getByRole("link", { name: "PLAY ANOTHER" })).toBeTruthy();
  });

  it("uses PLAYERS SAID for 1–24 and THE CROWD at 25+ on spectator reveal", () => {
    const { rerender } = render(
      <RevealShow
        marshmallow={{
          ...base,
          play_mode: "quick",
          is_daily: false,
          sealed: false,
          ownChoiceId: null,
          screen: "revealed_spectator",
          reveal: { ...base.reveal!, totalVotes: 1 },
        }}
      />,
    );
    expect(screen.getByText("PLAYERS SAID")).toBeTruthy();
    expect(screen.queryByText(/america|everyone thinks/i)).toBeNull();
    rerender(
      <RevealShow
        marshmallow={{
          ...base,
          play_mode: "quick",
          is_daily: false,
          sealed: false,
          ownChoiceId: null,
          screen: "revealed_spectator",
          reveal: { ...base.reveal!, totalVotes: 25 },
        }}
      />,
    );
    expect(screen.getByText("THE CROWD")).toBeTruthy();
    expect(screen.queryByText(/america|everyone thinks/i)).toBeNull();
  });

  it("marks 1–4 as Early crowd on personalized reveal without inventing representativeness", () => {
    render(
      <RevealShow
        marshmallow={{
          ...base,
          play_mode: "quick",
          is_daily: false,
          reveal: { ...base.reveal!, totalVotes: 4, bonusEarned: false, streakQualified: false },
        }}
      />,
    );
    expect(screen.getByText(/the crowd is in/i)).toBeTruthy();
    expect(screen.getByText("Early crowd")).toBeTruthy();
    expect(screen.queryByText(/representative|statistically/i)).toBeNull();
  });
});
