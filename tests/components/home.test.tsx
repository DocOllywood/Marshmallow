import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { HomeFeedView } from "@/components/home/HomeFeed";
import type { HomeFeed, HomeFeedCard } from "@/server/dal/home";

afterEach(() => cleanup());

function card(overrides: Partial<HomeFeedCard> & Pick<HomeFeedCard, "id" | "question">): HomeFeedCard {
  return {
    topic_id: null,
    opens_at: "2026-08-25T12:00:00.000Z",
    closes_at: "2026-08-25T15:00:00.000Z",
    reveals_at: "2026-08-25T16:00:00.000Z",
    hard_reveals_at: "2026-08-25T17:00:00.000Z",
    status: "open",
    is_daily: false,
    play_mode: "quick",
    quick_priority: null,
    topicName: "Imagination",
    sealed: false,
    hasDraft: false,
    openedReveal: false,
    ownChoiceLabel: null,
    predictedPct: null,
    distributionSummary: null,
    accuracy: null,
    openedAt: null,
    entityLabel: null,
    spoilerContext: null,
    imageUrl: null,
    expiresAt: null,
    ...overrides,
  };
}

const emptyFeed: HomeFeed = {
  readyToReveal: [],
  quickPlay: [],
  liveNow: [],
  todays: null,
  cooking: [],
  waiting: [],
  openNow: [],
  recent: [],
  hasInterests: true,
};

describe("HomeFeedView", () => {
  it("leads with Ready, then a question-first Quick hero", () => {
    const hero = card({
      id: "30000000-0000-4000-8000-000000000004",
      question: "Would you rather be admired by thousands or truly known by five?",
      quick_priority: 1,
      topicName: "Imagination",
    });
    const feed: HomeFeed = {
      ...emptyFeed,
      readyToReveal: [
        card({
          id: "ready-1",
          question: "Ready question?",
          status: "revealed",
          sealed: true,
          openedReveal: false,
        }),
      ],
      quickPlay: [
        hero,
        card({
          id: "30000000-0000-4000-8000-000000000005",
          question: "If you never had to work again, would you still choose to work?",
          quick_priority: 2,
        }),
        card({
          id: "30000000-0000-4000-8000-000000000006",
          question: "Would you return a wallet with $1,000 if nobody could ever know?",
          quick_priority: 3,
        }),
      ],
    };

    render(<HomeFeedView feed={feed} firstName="Alex" identity={{ rating: null, qualified: false, remaining: 5, scoredCount: 2, revealStreak: 0 }} />);

    expect(screen.getByText("Ready")).toBeTruthy();
    expect(screen.queryByText(/^Quick$/)).toBeNull();
    expect(screen.getByText(/CrowdSense ·/)).toBeTruthy();
    expect(screen.getByText(/2\/5 to unlock/)).toBeTruthy();
    expect(screen.getByRole("link", { name: /admired by thousands/i })).toBeTruthy();
    expect(screen.getByRole("link", { name: /never had to work again/i })).toBeTruthy();
    expect(screen.getByRole("link", { name: "PLAY QUICK" })).toBeTruthy();
    expect(screen.getAllByText("IMAGINATION").length).toBeGreaterThan(0);
    expect(screen.queryByText(/Results soon/i)).toBeNull();
    expect(screen.queryByText(/more Quick in rotation/i)).toBeNull();
  });

  it("renders a contemplative Daily block with PLAY THE DAILY", () => {
    const feed: HomeFeed = {
      ...emptyFeed,
      todays: card({
        id: "30000000-0000-4000-8000-0000000000d1",
        question: "Would the world be happier if nobody could become famous?",
        is_daily: true,
        play_mode: "daily",
        topicName: "Human Nature",
      }),
    };

    render(<HomeFeedView feed={feed} firstName="Alex" />);

    expect(screen.getByText("The Daily")).toBeTruthy();
    expect(screen.getByText(/One big question about being human/i)).toBeTruthy();
    expect(screen.getByRole("link", { name: "PLAY THE DAILY" })).toBeTruthy();
    expect(screen.getByText("HUMAN NATURE")).toBeTruthy();
  });

  it("stacks Cooking with humanized wait beneath the question", () => {
    const feed: HomeFeed = {
      ...emptyFeed,
      cooking: [
        card({
          id: "cook-1",
          question: "Would most people rather have more money or more free time?",
          sealed: true,
          status: "closed",
          reveals_at: new Date(Date.now() + 4 * 60_000).toISOString(),
        }),
      ],
    };

    render(<HomeFeedView feed={feed} firstName="Alex" />);

    expect(screen.getByText("Cooking")).toBeTruthy();
    expect(screen.getByText(/Results in about 4 min/i)).toBeTruthy();
  });

  it("keeps Recent minimal with Accuracy only", () => {
    const feed: HomeFeed = {
      ...emptyFeed,
      recent: [
        card({
          id: "recent-1",
          question: "Do you think most people are fundamentally good?",
          status: "revealed",
          sealed: true,
          openedReveal: true,
          accuracy: 92,
          openedAt: "2026-08-24T12:00:00.000Z",
        }),
      ],
    };

    render(<HomeFeedView feed={feed} firstName="Alex" />);

    expect(screen.getByText("Recent")).toBeTruthy();
    expect(screen.getByText("Accuracy 92")).toBeTruthy();
    expect(screen.queryByText(/Aug/i)).toBeNull();
  });
});
