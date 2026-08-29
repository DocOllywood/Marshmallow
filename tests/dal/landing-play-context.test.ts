import { afterEach, describe, expect, it, vi } from "vitest";

import { PRICE_QA_CONTINUOUS_ROUND_ID } from "@/domain/content/continuous-experiments";

vi.mock("server-only", () => ({}));

const createSupabaseServerClient = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient,
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: () => undefined,
  })),
}));

import { getLandingPlayContext } from "@/server/dal/continuous-experiment";

type PostgrestError = { message: string; code?: string };

function makeClient(input: {
  user?: { id: string } | null;
  topics?: { data: unknown[]; error: PostgrestError | null };
  dailyRoundToday?: { data: unknown; error: PostgrestError | null };
  continuousMarshmallows?: { data: unknown[]; error: PostgrestError | null };
}) {
  const user = input.user ?? null;

  createSupabaseServerClient.mockResolvedValue({
    auth: {
      getUser: vi.fn(async () => ({ data: { user }, error: null })),
    },
    from: vi.fn((table: string) => {
      if (table === "topics") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(async () => input.topics ?? { data: [], error: null }),
            })),
          })),
        };
      }

      if (table === "daily_rounds") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn((_column: string, value: string) => {
              if (value.length === 10) {
                return {
                  maybeSingle: vi.fn(async () => input.dailyRoundToday ?? { data: null, error: null }),
                };
              }
              return {
                maybeSingle: vi.fn(async () => ({ data: null, error: null })),
              };
            }),
          })),
        };
      }

      if (table === "marshmallows") {
        return {
          select: vi.fn(() => ({
            in: vi.fn(() => ({
              order: vi.fn(
                async () => input.continuousMarshmallows ?? { data: [], error: null },
              ),
            })),
            eq: vi.fn(() => ({
              order: vi.fn(async () => ({ data: [], error: null })),
            })),
          })),
        };
      }

      if (table === "entries") {
        return {
          select: vi.fn(async () => ({
            data: null,
            error: { message: "permission denied for table entries", code: "42501" },
          })),
        };
      }

      if (table === "reveal_opens") {
        return {
          select: vi.fn(async () => ({ data: [], error: null })),
        };
      }

      throw new Error(`unexpected table ${table}`);
    }),
  });
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("getLandingPlayContext integration", () => {
  it("renders GET STARTED for anonymous users when daily and continuous inventory are unavailable", async () => {
    makeClient({
      user: null,
      topics: { data: [], error: null },
      dailyRoundToday: {
        data: null,
        error: { message: "permission denied for table daily_rounds", code: "42501" },
      },
      continuousMarshmallows: { data: [], error: null },
    });

    await expect(getLandingPlayContext()).resolves.toEqual({
      ctaLabel: "GET STARTED",
      hasPlayableDaily: false,
      hasContinuousInventory: false,
    });
  });

  it("renders GET STARTED when daily lookup is denied by code only", async () => {
    makeClient({
      user: null,
      topics: { data: [], error: null },
      dailyRoundToday: {
        data: null,
        error: { message: "", code: "42501" },
      },
      continuousMarshmallows: { data: [], error: null },
    });

    await expect(getLandingPlayContext()).resolves.toEqual({
      ctaLabel: "GET STARTED",
      hasPlayableDaily: false,
      hasContinuousInventory: false,
    });
  });

  it("does not throw when continuous marshmallows are visible but entries are forbidden", async () => {
    makeClient({
      user: { id: "anon-user" },
      topics: { data: [], error: null },
      dailyRoundToday: { data: null, error: null },
      continuousMarshmallows: {
        data: [
          {
            id: "31000000-0000-4000-8000-000000000040",
            daily_round_id: PRICE_QA_CONTINUOUS_ROUND_ID,
            round_position: 1,
            status: "open",
            opens_at: "2026-08-01T12:00:00.000Z",
            closes_at: "2026-12-31T12:00:00.000Z",
          },
        ],
        error: null,
      },
    });

    await expect(getLandingPlayContext()).resolves.toEqual({
      ctaLabel: "GET STARTED",
      hasPlayableDaily: false,
      hasContinuousInventory: false,
    });
  });
});
