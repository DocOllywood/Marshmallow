import { afterEach, describe, expect, it, vi } from "vitest";

import {
  PRICE_QA_CONTINUOUS_ROUND_ID,
  PRICE_QA_Q1_MARSHMALLOW_ID,
} from "@/domain/content/continuous-experiments";
import { LAUNCH_MONEY_DAILY_ROUND_ID } from "@/domain/content/launch-money-daily";

vi.mock("server-only", () => ({}));

const createSupabaseServerClient = vi.hoisted(() => vi.fn());
const getTodayDailyRoundProgress = vi.hoisted(() => vi.fn());
const listActiveTopics = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient,
}));

vi.mock("@/server/dal/daily-round", () => ({
  getTodayDailyRoundProgress,
}));

vi.mock("@/server/dal/topics", () => ({
  listActiveTopics,
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: () => undefined,
  })),
}));

import {
  getContinuousExperimentOffer,
  getLandingPlayContext,
  resolvePostOnboardingPlayHref,
} from "@/server/dal/continuous-experiment";

type QueryResult<T> = { data: T; error: null } | { data: null; error: { message: string } };

function makeMarshmallowRows() {
  const ids = [
    "31000000-0000-4000-8000-000000000040",
    "31000000-0000-4000-8000-000000000041",
    "31000000-0000-4000-8000-000000000042",
    "31000000-0000-4000-8000-000000000043",
    "31000000-0000-4000-8000-000000000044",
  ];
  return ids.map((id, index) => ({
    id,
    daily_round_id: PRICE_QA_CONTINUOUS_ROUND_ID,
    round_position: index + 1,
    status: "open",
    opens_at: "2026-08-01T12:00:00.000Z",
    closes_at: "2026-12-31T12:00:00.000Z",
  }));
}

function mockSupabase(input: {
  user?: { id: string } | null;
  marshmallows?: QueryResult<ReturnType<typeof makeMarshmallowRows>>;
  entries?: QueryResult<{ marshmallow_id: string; sealed_at: string | null }[]>;
  dailyRound?: QueryResult<{ title: string; subtitle: string | null; metadata: unknown } | null>;
}) {
  const user = input.user ?? { id: "user-1" };

  createSupabaseServerClient.mockResolvedValue({
    auth: {
      getUser: vi.fn(async () => ({ data: { user }, error: null })),
    },
    from: vi.fn((table: string) => {
      if (table === "marshmallows") {
        return {
          select: vi.fn(() => ({
            in: vi.fn(() => ({
              order: vi.fn(async () => input.marshmallows ?? { data: [], error: null }),
            })),
          })),
        };
      }
      if (table === "entries") {
        return {
          select: vi.fn(async () => input.entries ?? { data: [], error: null }),
        };
      }
      if (table === "daily_rounds") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(async () => input.dailyRound ?? { data: null, error: null }),
            })),
          })),
        };
      }
      throw new Error(`unexpected table ${table}`);
    }),
  });
}

afterEach(() => {
  vi.clearAllMocks();
  listActiveTopics.mockResolvedValue([]);
  getTodayDailyRoundProgress.mockResolvedValue(null);
});

describe("continuous-experiment DAL", () => {
  it("returns an offer when continuous inventory exists", async () => {
    mockSupabase({
      marshmallows: { data: makeMarshmallowRows(), error: null },
      entries: { data: [], error: null },
      dailyRound: {
        data: {
          title: "Hosted title",
          subtitle: "Hosted subtitle",
          metadata: { experiment: { version: 1, archetype: "price" } },
        },
        error: null,
      },
    });

    const offer = await getContinuousExperimentOffer();

    expect(offer).toMatchObject({
      roundId: PRICE_QA_CONTINUOUS_ROUND_ID,
      playHref: `/m/${PRICE_QA_Q1_MARSHMALLOW_ID}`,
      homeHeadline: "Would you sell what you promised to keep?",
    });
  });

  it("does not throw when continuous inventory is absent", async () => {
    mockSupabase({
      marshmallows: { data: [], error: null },
      entries: { data: [], error: null },
    });

    await expect(getContinuousExperimentOffer()).resolves.toBeNull();
  });

  it("does not throw when continuous inventory is closed", async () => {
    mockSupabase({
      marshmallows: {
        data: makeMarshmallowRows().map((row) => ({ ...row, status: "closed" })),
        error: null,
      },
      entries: { data: [], error: null },
    });

    await expect(getContinuousExperimentOffer()).resolves.toBeNull();
  });

  it("falls back safely when anonymous callers cannot read entries", async () => {
    mockSupabase({
      user: null,
      marshmallows: { data: makeMarshmallowRows(), error: null },
    });

    const offer = await getContinuousExperimentOffer();

    expect(offer).toMatchObject({
      roundId: PRICE_QA_CONTINUOUS_ROUND_ID,
      title: "Would you sell what you promised to keep?",
      playHref: `/m/${PRICE_QA_Q1_MARSHMALLOW_ID}`,
    });
  });

  it("falls back safely when entries access is denied for authenticated users", async () => {
    mockSupabase({
      marshmallows: { data: makeMarshmallowRows(), error: null },
      entries: {
        data: null,
        error: { message: "permission denied for table entries" },
      },
    });

    await expect(getContinuousExperimentOffer()).resolves.toBeNull();
  });

  it("landing does not falsely promise playable content when inventory is unavailable", async () => {
    mockSupabase({
      user: null,
      marshmallows: { data: [], error: null },
    });

    const landing = await getLandingPlayContext();

    expect(landing).toEqual({
      ctaLabel: "GET STARTED",
      hasPlayableDaily: false,
      hasContinuousInventory: false,
    });
  });

  it("landing does not throw when anonymous daily round lookup is denied", async () => {
    mockSupabase({
      user: null,
      marshmallows: { data: [], error: null },
    });
    getTodayDailyRoundProgress.mockRejectedValue(
      new Error("permission denied for table daily_rounds"),
    );

    const landing = await getLandingPlayContext();

    expect(landing).toEqual({
      ctaLabel: "GET STARTED",
      hasPlayableDaily: false,
      hasContinuousInventory: false,
    });
  });

  it("onboarding falls back to /home when continuous inventory is unavailable", async () => {
    mockSupabase({
      marshmallows: { data: [], error: null },
      entries: { data: [], error: null },
    });

    await expect(resolvePostOnboardingPlayHref()).resolves.toBe("/home");
  });

  it("keeps Day 1 routing untouched when daily is playable", async () => {
    mockSupabase({
      marshmallows: { data: [], error: null },
      entries: { data: [], error: null },
    });
    getTodayDailyRoundProgress.mockResolvedValue({
      roundId: LAUNCH_MONEY_DAILY_ROUND_ID,
      currentPlayId: "31000000-0000-4000-8000-000000000050",
      questions: [{ status: "open" }],
    });

    await expect(resolvePostOnboardingPlayHref()).resolves.toBe(
      "/m/31000000-0000-4000-8000-000000000050",
    );
  });
});
