import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { HomeFeedView } from "@/components/home/HomeFeed";
import type { HomeFeed, HomeFeedCard } from "@/server/dal/home";

vi.mock("@/server/actions/analytics", () => ({
  trackEvent: vi.fn(async () => undefined),
}));

vi.mock("@/components/account/AccountMenu", () => ({
  AccountMenu: ({ username }: { username: string }) => (
    <button type="button">{`Account menu for ${username}`}</button>
  ),
}));

afterEach(() => cleanup());

function card(overrides: Partial<HomeFeedCard> & Pick<HomeFeedCard, "id" | "question">): HomeFeedCard {
  return {
    topic_id: null,
    daily_round_id: null,
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
  dailyRound: null,
  nextScheduledExperiment: null,
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

    render(
      <HomeFeedView
        feed={feed}
        firstName="Alex"
        username="alex"
        identity={{ rating: null, qualified: false, remaining: 5, scoredCount: 2, revealStreak: 0 }}
      />,
    );

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

  it("renders a daily round block with continue and reveal states", () => {
    const feed: HomeFeed = {
      ...emptyFeed,
      dailyRound: {
        roundId: "40000000-0000-4000-8000-000000000001",
        title: "Can love survive complete honesty?",
        subtitle: "5 questions about love, honesty, and trust.",
        topicName: "Love",
        tension: null,
        roundDate: "2026-08-25",
        questions: [
          {
            id: "31000000-0000-4000-8000-000000000001",
            question: "Would you want to know?",
            position: 1,
            sealed: true,
            openedReveal: false,
            status: "open",
            revealsAt: "2026-08-25T22:00:00.000Z",
          },
          {
            id: "31000000-0000-4000-8000-000000000002",
            question: "Is emotional cheating worse?",
            position: 2,
            sealed: false,
            openedReveal: false,
            status: "open",
            revealsAt: "2026-08-25T22:00:00.000Z",
          },
        ],
        sealedCount: 1,
        allSealed: false,
        allRevealed: false,
        anyRevealOpened: false,
        currentPlayId: "31000000-0000-4000-8000-000000000002",
        revealHref: "/daily/40000000-0000-4000-8000-000000000001/reveal",
        todaysRead: null,
        isExperimentDaily: false,
        experimentArchetype: "default",
        blindMirror: null,
      },
    };

    render(<HomeFeedView feed={feed} firstName="Alex" username="alex" />);

    expect(screen.getByText("The Daily")).toBeTruthy();
    expect(screen.getByText(/Today everyone is playing/i)).toBeTruthy();
    expect(screen.getByText("LOVE")).toBeTruthy();
    expect(screen.getByText(/Can love survive complete honesty/i)).toBeTruthy();
    expect(screen.getByText(/2 dilemmas/i)).toBeTruthy();
    expect(screen.getByRole("link", { name: "CONTINUE TODAY'S DAILY" })).toBeTruthy();
  });

  it("renders shared daily framing with tension when assigned", () => {
    const feed: HomeFeed = {
      ...emptyFeed,
      dailyRound: {
        roundId: "40000000-0000-4000-8000-000000000004",
        title: "When does honesty become cruelty?",
        subtitle: null,
        topicName: "Love",
        tension: {
          id: "50000000-0000-4000-8000-000000000001",
          slug: "honesty-kindness",
          leftLabel: "HONESTY",
          rightLabel: "KINDNESS",
          displayLabel: "HONESTY vs. KINDNESS",
        },
        roundDate: "2026-08-28",
        questions: [
          {
            id: "q1",
            question: "Q1",
            position: 1,
            sealed: false,
            openedReveal: false,
            status: "open",
            revealsAt: "2026-08-28T22:00:00.000Z",
          },
          {
            id: "q2",
            question: "Q2",
            position: 2,
            sealed: false,
            openedReveal: false,
            status: "open",
            revealsAt: "2026-08-28T22:00:00.000Z",
          },
          {
            id: "q3",
            question: "Q3",
            position: 3,
            sealed: false,
            openedReveal: false,
            status: "open",
            revealsAt: "2026-08-28T22:00:00.000Z",
          },
          {
            id: "q4",
            question: "Q4",
            position: 4,
            sealed: false,
            openedReveal: false,
            status: "open",
            revealsAt: "2026-08-28T22:00:00.000Z",
          },
          {
            id: "q5",
            question: "Q5",
            position: 5,
            sealed: false,
            openedReveal: false,
            status: "open",
            revealsAt: "2026-08-28T22:00:00.000Z",
          },
        ],
        sealedCount: 0,
        allSealed: false,
        allRevealed: false,
        anyRevealOpened: false,
        currentPlayId: "31000000-0000-4000-8000-000000000010",
        revealHref: "/daily/40000000-0000-4000-8000-000000000004/reveal",
        todaysRead: null,
        isExperimentDaily: false,
        experimentArchetype: "default",
        blindMirror: null,
      },
    };

    render(<HomeFeedView feed={feed} firstName="Alex" username="alex" />);

    expect(screen.getByText(/Today everyone is playing/i)).toBeTruthy();
    expect(screen.getByText("HONESTY vs. KINDNESS")).toBeTruthy();
    expect(screen.getByText(/5 dilemmas/i)).toBeTruthy();
    expect(screen.getByRole("link", { name: "PLAY TODAY'S DAILY" })).toBeTruthy();
    expect(screen.queryByText(/Today's tension/i)).toBeNull();
  });

  it("renders tension on daily rounds that have one", () => {
    const feed: HomeFeed = {
      ...emptyFeed,
      dailyRound: {
        roundId: "40000000-0000-4000-8000-000000000004",
        title: "When does honesty become cruelty?",
        subtitle: null,
        topicName: "Love",
        tension: {
          id: "50000000-0000-4000-8000-000000000001",
          slug: "honesty-kindness",
          leftLabel: "HONESTY",
          rightLabel: "KINDNESS",
          displayLabel: "HONESTY vs. KINDNESS",
        },
        roundDate: "2026-08-28",
        questions: [
          {
            id: "31000000-0000-4000-8000-000000000010",
            question: "Q1",
            position: 1,
            sealed: false,
            openedReveal: false,
            status: "open",
            revealsAt: "2026-08-28T22:00:00.000Z",
          },
        ],
        sealedCount: 0,
        allSealed: false,
        allRevealed: false,
        anyRevealOpened: false,
        currentPlayId: "31000000-0000-4000-8000-000000000010",
        revealHref: "/daily/40000000-0000-4000-8000-000000000004/reveal",
        todaysRead: null,
        isExperimentDaily: false,
        experimentArchetype: "default",
        blindMirror: null,
      },
    };

    render(<HomeFeedView feed={feed} firstName="Alex" username="alex" />);

    expect(screen.getByText("HONESTY vs. KINDNESS")).toBeTruthy();
  });

  it("shows today's read when the daily round is fully sealed", () => {
    const feed: HomeFeed = {
      ...emptyFeed,
      dailyRound: {
        roundId: "40000000-0000-4000-8000-000000000001",
        title: "Can love survive complete honesty?",
        subtitle: "5 questions about love, honesty, and trust.",
        topicName: "Love",
        tension: null,
        roundDate: "2026-08-25",
        questions: [],
        sealedCount: 5,
        allSealed: true,
        allRevealed: false,
        anyRevealOpened: false,
        currentPlayId: null,
        revealHref: "/daily/40000000-0000-4000-8000-000000000001/reveal",
        todaysRead: {
          headline: "You held your ground when the circumstances changed.",
          bodyLines: [],
          lineCopy: "A month before you'd consider it a betrayal.",
          switchCopy: null,
          tomorrowTease: null,
          isLegacy: true,
        },
        isExperimentDaily: false,
        experimentArchetype: "default",
        blindMirror: null,
      },
    };

    render(<HomeFeedView feed={feed} firstName="Alex" username="alex" />);

    expect(screen.getByText(/Today's read/i)).toBeTruthy();
    expect(screen.getByText(/Your calls are locked/i)).toBeTruthy();
    expect(screen.getByText(/The crowd is still deciding/i)).toBeTruthy();
    expect(screen.getByText(/Come back tonight/i)).toBeTruthy();
  });

  it("renders experiment daily home separately from legacy daily", () => {
    const feed: HomeFeed = {
      ...emptyFeed,
      dailyRound: {
        roundId: "40000000-0000-4000-8000-000000000010",
        title: "How much does loyalty excuse?",
        subtitle: null,
        topicName: "Love",
        tension: {
          id: "50000000-0000-4000-8000-000000000001",
          slug: "loyalty-justice",
          leftLabel: "LOYALTY",
          rightLabel: "JUSTICE",
          displayLabel: "LOYALTY vs. JUSTICE",
        },
        roundDate: "2026-08-28",
        questions: [
          {
            id: "31000000-0000-4000-8000-000000000010",
            question: "Q1",
            position: 1,
            sealed: false,
            openedReveal: false,
            status: "open",
            revealsAt: "2026-08-28T22:00:00.000Z",
          },
        ],
        sealedCount: 0,
        allSealed: false,
        allRevealed: false,
        anyRevealOpened: false,
        currentPlayId: "31000000-0000-4000-8000-000000000010",
        revealHref: "/daily/40000000-0000-4000-8000-000000000010/reveal",
        todaysRead: null,
        isExperimentDaily: true,
        experimentArchetype: "default",
        blindMirror: null,
      },
    };

    render(<HomeFeedView feed={feed} firstName="Alex" username="alex" />);

    expect(screen.getByText(/The daily experiment/i)).toBeTruthy();
    expect(screen.getByText(/Today's price/i)).toBeTruthy();
    expect(screen.getByText("LOYALTY vs. JUSTICE")).toBeTruthy();
    expect(screen.getByText(/One situation/i)).toBeTruthy();
    expect(screen.getByRole("link", { name: "BEGIN EXPERIMENT" })).toBeTruthy();
    expect(screen.queryByText("The Daily")).toBeNull();
    expect(screen.queryByText(/5 dilemmas/i)).toBeNull();
  });

  it("hides draft daily experiment from home", () => {
    const feed: HomeFeed = {
      ...emptyFeed,
      dailyRound: {
        roundId: "40000000-0000-4000-8000-000000000003",
        title: "Do people really want commitment?",
        subtitle: null,
        topicName: "Love",
        tension: null,
        roundDate: "2026-08-28",
        questions: [
          {
            id: "q1",
            question: "Q1",
            position: 1,
            sealed: false,
            openedReveal: false,
            status: "draft",
            revealsAt: "2026-08-28T22:00:00.000Z",
          },
        ],
        sealedCount: 0,
        allSealed: false,
        allRevealed: false,
        anyRevealOpened: false,
        currentPlayId: null,
        revealHref: "/daily/40000000-0000-4000-8000-000000000003/reveal",
        todaysRead: null,
        isExperimentDaily: true,
        experimentArchetype: "default",
        blindMirror: null,
      },
    };

    render(<HomeFeedView feed={feed} firstName="Alex" username="alex" />);

    expect(screen.queryByText(/The daily experiment/i)).toBeNull();
    expect(screen.queryByRole("link", { name: /BEGIN EXPERIMENT/i })).toBeNull();
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

    render(<HomeFeedView feed={feed} firstName="Alex" username="alex" />);

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

    render(<HomeFeedView feed={feed} firstName="Alex" username="alex" />);

    expect(screen.getByText("Recent")).toBeTruthy();
    expect(screen.getByText("Accuracy 92")).toBeTruthy();
    expect(screen.queryByText(/Aug/i)).toBeNull();
  });

  it("shows scheduled experiment anticipation when no playable daily exists", () => {
    const feed: HomeFeed = {
      ...emptyFeed,
      nextScheduledExperiment: {
        roundId: "40000000-0000-4000-8000-000000000009",
        opensAt: "2026-09-02T12:00:00.000Z",
        archetype: "price",
      },
    };

    render(
      <HomeFeedView
        feed={feed}
        firstName="Richie"
        username="richieg"
        identity={{ rating: null, qualified: false, remaining: 1, scoredCount: 4, revealStreak: 0 }}
      />,
    );

    expect(screen.getByText(/The next experiment/i)).toBeTruthy();
    expect(screen.getByText(/What's your price/i)).toBeTruthy();
    expect(screen.getByText(/Come back then/i)).toBeTruthy();
    expect(screen.queryByText(/dream job/i)).toBeNull();
    expect(screen.queryByText(/Nothing is cooking yet/i)).toBeNull();
    expect(screen.getByText(/4\/5 to unlock/)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Account menu for richieg/i })).toBeTruthy();
  });
});
