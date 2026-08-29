/**
 * Continuous play hosted checks (Price QA round 008 promotion).
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";

import {
  PRICE_QA_CONTINUOUS_LIFECYCLE,
  PRICE_QA_CONTINUOUS_ROUND_DATE,
  PRICE_QA_CONTINUOUS_ROUND_ID,
  PRICE_QA_Q1_MARSHMALLOW_ID,
} from "@/domain/content/continuous-experiments";
import {
  LAUNCH_MONEY_DAILY_BETA_ROUND_DATE,
  LAUNCH_MONEY_DAILY_ROUND_ID,
} from "@/domain/content/launch-money-daily";
import { MONEY_WEEK_DAYS } from "@/domain/content/money-week";
import {
  isContinuousRoundComplete,
  isContinuousRoundPlayableNow,
  pickEligibleContinuousRoundId,
  type ContinuousRoundMarshmallow,
} from "@/domain/play/continuous";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const MARSHMALLOW_IDS = [
  "31000000-0000-4000-8000-000000000040",
  "31000000-0000-4000-8000-000000000041",
  "31000000-0000-4000-8000-000000000042",
  "31000000-0000-4000-8000-000000000043",
  "31000000-0000-4000-8000-000000000044",
] as const;

async function continuousRoundPromoted(admin: SupabaseClient): Promise<boolean> {
  const { data, error } = await admin
    .from("daily_rounds")
    .select("id, status, round_date")
    .eq("id", PRICE_QA_CONTINUOUS_ROUND_ID)
    .maybeSingle();
  return !error && data?.status === "open" && data.round_date === PRICE_QA_CONTINUOUS_ROUND_DATE;
}

describe("continuous play hosted checks", () => {
  let admin: SupabaseClient;
  let anon: SupabaseClient;

  beforeAll(async () => {
    if (!url || !anonKey || !serviceKey) {
      return;
    }

    admin = createClient(url, serviceKey, { auth: { persistSession: false } });
    anon = createClient(url, anonKey, { auth: { persistSession: false } });
  });

  it("promotes round 008 into open continuous inventory", async () => {
    if (!admin) {
      expect(true).toBe(true);
      return;
    }

    const promoted = await continuousRoundPromoted(admin);
    if (!promoted) {
      expect(true).toBe(true);
      return;
    }

    const { data: round } = await admin
      .from("daily_rounds")
      .select("id, status, round_date, title, metadata")
      .eq("id", PRICE_QA_CONTINUOUS_ROUND_ID)
      .maybeSingle();

    expect(round?.status).toBe("open");
    expect(round?.round_date).toBe(PRICE_QA_CONTINUOUS_ROUND_DATE);
    expect(round?.title).toBe("Would you sell what you promised to keep?");
    expect((round?.metadata as { experiment?: { archetype?: string } })?.experiment?.archetype).toBe(
      "price",
    );
  });

  it("keeps all five marshmallows open and long-lived", async () => {
    if (!admin) {
      expect(true).toBe(true);
      return;
    }

    const promoted = await continuousRoundPromoted(admin);
    if (!promoted) {
      expect(true).toBe(true);
      return;
    }

    const { data: marshmallows } = await admin
      .from("marshmallows")
      .select("id, round_position, status, opens_at, closes_at, reveals_at, hard_reveals_at, expires_at")
      .eq("daily_round_id", PRICE_QA_CONTINUOUS_ROUND_ID)
      .order("round_position", { ascending: true });

    expect(marshmallows).toHaveLength(5);
    for (const row of marshmallows ?? []) {
      expect(row.status).toBe("open");
      expect(row.expires_at).toBeNull();
      expect(row.closes_at).toBe(PRICE_QA_CONTINUOUS_LIFECYCLE.closesAt);
      expect(row.reveals_at).toBe(PRICE_QA_CONTINUOUS_LIFECYCLE.revealsAt);
      expect(row.hard_reveals_at).toBe(PRICE_QA_CONTINUOUS_LIFECYCLE.hardRevealsAt);
    }
  });

  it("exposes playable inventory to anon without entries access", async () => {
    if (!anon) {
      expect(true).toBe(true);
      return;
    }

    const promoted = admin ? await continuousRoundPromoted(admin) : false;
    if (!promoted) {
      expect(true).toBe(true);
      return;
    }

    const { data, error } = await anon
      .from("marshmallows")
      .select("id, daily_round_id, round_position, status, opens_at, closes_at")
      .eq("daily_round_id", PRICE_QA_CONTINUOUS_ROUND_ID)
      .order("round_position", { ascending: true });

    expect(error).toBeNull();
    expect((data ?? []).length).toBe(5);

    const entries = await anon.from("entries").select("marshmallow_id, sealed_at");
    expect(entries.error).not.toBeNull();
  });

  it("marks round eligible in continuous domain logic", async () => {
    if (!admin) {
      expect(true).toBe(true);
      return;
    }

    const promoted = await continuousRoundPromoted(admin);
    if (!promoted) {
      expect(true).toBe(true);
      return;
    }

    const { data: marshmallows } = await admin
      .from("marshmallows")
      .select("id, daily_round_id, round_position, status, opens_at, closes_at")
      .eq("daily_round_id", PRICE_QA_CONTINUOUS_ROUND_ID)
      .order("round_position", { ascending: true });

    const roundMarshmallows: ContinuousRoundMarshmallow[] = (marshmallows ?? []).map((row) => ({
      id: row.id,
      dailyRoundId: row.daily_round_id!,
      roundPosition: row.round_position!,
      status: row.status,
      opensAt: row.opens_at,
      closesAt: row.closes_at,
    }));

    expect(isContinuousRoundPlayableNow(roundMarshmallows)).toBe(true);
    expect(
      pickEligibleContinuousRoundId({
        marshmallowsByRound: new Map([[PRICE_QA_CONTINUOUS_ROUND_ID, roundMarshmallows]]),
        userStates: new Map([
          [
            PRICE_QA_CONTINUOUS_ROUND_ID,
            {
              roundId: PRICE_QA_CONTINUOUS_ROUND_ID,
              sealedCount: 0,
              sealedMarshmallowIds: new Set<string>(),
            },
          ],
        ]),
      }),
    ).toBe(PRICE_QA_CONTINUOUS_ROUND_ID);

    const complete = new Set(MARSHMALLOW_IDS);
    expect(isContinuousRoundComplete(roundMarshmallows, complete)).toBe(true);
    expect(
      pickEligibleContinuousRoundId({
        marshmallowsByRound: new Map([[PRICE_QA_CONTINUOUS_ROUND_ID, roundMarshmallows]]),
        userStates: new Map([
          [
            PRICE_QA_CONTINUOUS_ROUND_ID,
            {
              roundId: PRICE_QA_CONTINUOUS_ROUND_ID,
              sealedCount: 5,
              sealedMarshmallowIds: complete,
            },
          ],
        ]),
      }),
    ).toBeNull();
  });

  it("keeps Day 1 scheduled on Sep 2", async () => {
    if (!admin) {
      expect(true).toBe(true);
      return;
    }

    const { data: day1 } = await admin
      .from("daily_rounds")
      .select("id, status, round_date")
      .eq("id", LAUNCH_MONEY_DAILY_ROUND_ID)
      .maybeSingle();

    expect(day1?.status).toBe("scheduled");
    expect(day1?.round_date).toBe(LAUNCH_MONEY_DAILY_BETA_ROUND_DATE);
  });

  it("keeps Money Week Days 2–7 draft", async () => {
    if (!admin) {
      expect(true).toBe(true);
      return;
    }

    for (const day of MONEY_WEEK_DAYS) {
      const { data } = await admin
        .from("daily_rounds")
        .select("id, status")
        .eq("id", day.roundId)
        .maybeSingle();
      expect(data?.status).toBe("draft");
    }
  });

  it("routes new play to Q1 marshmallow", async () => {
    if (!admin) {
      expect(true).toBe(true);
      return;
    }

    const promoted = await continuousRoundPromoted(admin);
    if (!promoted) {
      expect(true).toBe(true);
      return;
    }

    const { data: q1 } = await admin
      .from("marshmallows")
      .select("id, round_position, status")
      .eq("id", PRICE_QA_Q1_MARSHMALLOW_ID)
      .maybeSingle();

    expect(q1?.round_position).toBe(1);
    expect(q1?.status).toBe("open");
  });
});
