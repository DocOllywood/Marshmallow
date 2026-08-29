/**
 * Money Week Days 2-7 hosted draft checks.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import {
  MONEY_WEEK_BINARY_SIDES,
  MONEY_WEEK_DAYS,
} from "@/domain/content/money-week";
import { marshmallowRequiresPrediction } from "@/domain/daily/experiment";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function weekAvailable(admin: SupabaseClient): Promise<boolean> {
  const firstDay = MONEY_WEEK_DAYS[0];
  if (!firstDay) return false;
  const { data, error } = await admin
    .from("daily_rounds")
    .select("id")
    .eq("id", firstDay.roundId)
    .maybeSingle();
  return !error && data != null;
}

describe("money week hosted draft checks", () => {
  it("keeps all money week drafts off today's home slot", async () => {
    if (!url || !serviceKey) {
      expect(true).toBe(true);
      return;
    }

    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
    const today = new Date().toISOString().slice(0, 10);
    const { data: todayRound } = await admin
      .from("daily_rounds")
      .select("id")
      .eq("round_date", today)
      .maybeSingle();

    for (const day of MONEY_WEEK_DAYS) {
      expect(todayRound?.id).not.toBe(day.roundId);
    }
  });

  it("stores price draft metadata for each money week round", async () => {
    if (!url || !serviceKey) {
      expect(true).toBe(true);
      return;
    }

    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
    const available = await weekAvailable(admin);
    if (!available) {
      expect(true).toBe(true);
      return;
    }

    for (const day of MONEY_WEEK_DAYS) {
      const { data: round } = await admin
        .from("daily_rounds")
        .select("id, status, round_date, metadata, principle_id, tension_id")
        .eq("id", day.roundId)
        .single();

      expect(round).not.toBeNull();
      if (!round) continue;

      expect(round.status).toBe("draft");
      expect(round.round_date).toBe(day.roundDate);
      expect(
        (round.metadata as { experiment?: { archetype?: string } })?.experiment?.archetype,
      ).toBe("price");
      expect(
        (round.metadata as { experiment?: { price_reference_side?: string } })?.experiment
          ?.price_reference_side,
      ).toBe(day.priceReferenceSide);
      expect(round.principle_id).toBe(day.principleId);

      const { data: principle } = await admin
        .from("belief_principles")
        .select("slug")
        .eq("id", day.principleId)
        .single();
      expect(principle?.slug).toBe(day.principleSlug);

      const { data: tension } = await admin
        .from("human_tensions")
        .select("slug")
        .eq("id", day.tensionId)
        .single();
      expect(tension?.slug).toBe(day.tensionSlug);

      const { data: marshmallows } = await admin
        .from("marshmallows")
        .select("id, round_position, is_line, metadata, status")
        .eq("daily_round_id", day.roundId)
        .order("round_position", { ascending: true });

      expect(marshmallows).toHaveLength(5);
      expect(marshmallows?.map((row) => row.id)).toEqual([...day.marshmallowIds]);
      expect(marshmallows?.every((row) => row.status === "open")).toBe(true);

      for (const spec of day.stages) {
        const row = marshmallows?.find((item) => item.round_position === spec.position);
        const experiment = (row?.metadata as { experiment?: Record<string, unknown> })?.experiment;
        expect(experiment?.stage).toBe(spec.stage);
        expect(marshmallowRequiresPrediction(row?.metadata)).toBe(spec.requiresPrediction);
      }

      const { data: lineChoices } = await admin
        .from("marshmallow_choices")
        .select("id, metadata")
        .eq("marshmallow_id", day.marshmallowIds[4])
        .order("sort_order", { ascending: true });

      expect(lineChoices?.map((row) => row.id)).toEqual(day.lineChoices.map((c) => c.id));
    }
  });

  it("stores corrected flip side metadata on day 6", async () => {
    if (!url || !serviceKey) {
      expect(true).toBe(true);
      return;
    }

    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
    const available = await weekAvailable(admin);
    if (!available) {
      expect(true).toBe(true);
      return;
    }

    const { data: flipChoices } = await admin
      .from("marshmallow_choices")
      .select("label, metadata")
      .eq("marshmallow_id", "31000000-0000-4000-8000-000000000103")
      .order("sort_order", { ascending: true });

    expect(flipChoices?.map((row) => (row.metadata as { tension_side?: string })?.tension_side)).toEqual(
      [...MONEY_WEEK_BINARY_SIDES[6]!.slice(6, 8)],
    );
  });
});
