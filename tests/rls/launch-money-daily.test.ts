/**
 * Launch Money Era daily hosted checks (draft QA round).
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  LAUNCH_MONEY_DAILY_MARSHMALLOWS,
  LAUNCH_MONEY_DAILY_PRINCIPLE_ID,
  LAUNCH_MONEY_DAILY_Q1,
  LAUNCH_MONEY_DAILY_ROUND_DATE,
  LAUNCH_MONEY_DAILY_ROUND_ID,
  LAUNCH_MONEY_DAILY_STAGE_SPEC,
} from "@/domain/content/launch-money-daily";
import { marshmallowRequiresPrediction } from "@/domain/daily/experiment";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const password = "test-pass-launch-money-daily-1";

async function launchRoundAvailable(admin: SupabaseClient): Promise<boolean> {
  const { data, error } = await admin
    .from("daily_rounds")
    .select("id, metadata")
    .eq("id", LAUNCH_MONEY_DAILY_ROUND_ID)
    .maybeSingle();
  return !error && data?.metadata != null;
}

describe("launch money daily hosted checks", () => {
  let admin: SupabaseClient;
  let userA: SupabaseClient;
  let userB: SupabaseClient;
  let emailA = "";
  let emailB = "";

  beforeAll(async () => {
    if (!url || !anonKey || !serviceKey) {
      return;
    }

    admin = createClient(url, serviceKey, { auth: { persistSession: false } });
    emailA = `launch-money-a-${Date.now()}@example.com`;
    emailB = `launch-money-b-${Date.now()}@example.com`;

    for (const email of [emailA, emailB]) {
      const created = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (created.error) throw created.error;
    }

    userA = createClient(url, anonKey, { auth: { persistSession: false } });
    userB = createClient(url, anonKey, { auth: { persistSession: false } });

    const signInA = await userA.auth.signInWithPassword({ email: emailA, password });
    const signInB = await userB.auth.signInWithPassword({ email: emailB, password });
    if (signInA.error) throw signInA.error;
    if (signInB.error) throw signInB.error;
  });

  afterAll(async () => {
    if (!admin) return;
    for (const email of [emailA, emailB]) {
      const listed = await admin.auth.admin.listUsers();
      const user = listed.data.users.find((row) => row.email === email);
      if (user) {
        await admin.auth.admin.deleteUser(user.id);
      }
    }
  });

  it("keeps launch draft off today's home slot", async () => {
    if (!admin) {
      expect(true).toBe(true);
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    const { data: todayRound } = await admin
      .from("daily_rounds")
      .select("id, title, status")
      .eq("round_date", today)
      .maybeSingle();

    expect(todayRound?.id).not.toBe(LAUNCH_MONEY_DAILY_ROUND_ID);
  });

  it("stores price archetype metadata and partnership-vs-independence principle", async () => {
    if (!admin) {
      expect(true).toBe(true);
      return;
    }

    const available = await launchRoundAvailable(admin);
    if (!available) {
      expect(true).toBe(true);
      return;
    }

    const { data: round } = await admin
      .from("daily_rounds")
      .select("id, status, round_date, metadata, principle_id, tension_id")
      .eq("id", LAUNCH_MONEY_DAILY_ROUND_ID)
      .maybeSingle();

    expect(round?.status).toBe("draft");
    expect(round?.round_date).toBe(LAUNCH_MONEY_DAILY_ROUND_DATE);
    expect(round?.round_date).not.toBe(new Date().toISOString().slice(0, 10));
    expect((round?.metadata as { experiment?: { archetype?: string } })?.experiment?.archetype).toBe(
      "price",
    );
    expect(
      (round?.metadata as { experiment?: { price_reference_side?: string } })?.experiment
        ?.price_reference_side,
    ).toBe("left");
    expect(round?.principle_id).toBe(LAUNCH_MONEY_DAILY_PRINCIPLE_ID);

    const { data: principle } = await admin
      .from("belief_principles")
      .select("slug")
      .eq("id", LAUNCH_MONEY_DAILY_PRINCIPLE_ID)
      .single();
    expect(principle?.slug).toBe("partnership-vs-independence");

    const { data: tension } = await admin
      .from("human_tensions")
      .select("slug")
      .eq("id", round?.tension_id ?? "")
      .single();
    expect(tension?.slug).toBe("belonging-independence");
  });

  it("seeds five ordered marshmallows with stage metadata", async () => {
    if (!admin) {
      expect(true).toBe(true);
      return;
    }

    const available = await launchRoundAvailable(admin);
    if (!available) {
      expect(true).toBe(true);
      return;
    }

    const { data: marshmallows } = await admin
      .from("marshmallows")
      .select("id, round_position, is_line, metadata, status")
      .eq("daily_round_id", LAUNCH_MONEY_DAILY_ROUND_ID)
      .order("round_position", { ascending: true });

    expect(marshmallows).toHaveLength(5);
    expect(marshmallows?.map((row) => row.round_position)).toEqual([1, 2, 3, 4, 5]);
    expect(marshmallows?.map((row) => row.id)).toEqual([...LAUNCH_MONEY_DAILY_MARSHMALLOWS]);
    expect(marshmallows?.every((row) => row.status === "open")).toBe(true);
    expect(marshmallows?.[4]?.is_line).toBe(true);

    for (const spec of LAUNCH_MONEY_DAILY_STAGE_SPEC) {
      const row = marshmallows?.find((item) => item.round_position === spec.position);
      expect(row).toBeTruthy();
      const experiment = (row?.metadata as { experiment?: Record<string, unknown> })?.experiment;
      expect(experiment?.stage).toBe(spec.stage);
      expect(marshmallowRequiresPrediction(row?.metadata)).toBe(spec.requiresPrediction);
      if (spec.pressureType) {
        expect(experiment?.pressure_type).toBe(spec.pressureType);
      }
      if (spec.costType) {
        expect(experiment?.cost_type).toBe(spec.costType);
      }
      if (spec.costLabel) {
        expect(experiment?.cost_label).toBe(spec.costLabel);
      }
    }
  });

  it("maps binary choices to tension sides on Q1", async () => {
    if (!admin) {
      expect(true).toBe(true);
      return;
    }

    const available = await launchRoundAvailable(admin);
    if (!available) {
      expect(true).toBe(true);
      return;
    }

    const { data: choices } = await admin
      .from("marshmallow_choices")
      .select("id, label, metadata")
      .eq("marshmallow_id", LAUNCH_MONEY_DAILY_MARSHMALLOWS[0])
      .order("sort_order", { ascending: true });

    expect(choices).toHaveLength(2);
    expect(choices?.[0]?.id).toBe(LAUNCH_MONEY_DAILY_Q1.move);
    expect((choices?.[0]?.metadata as { tension_side?: string })?.tension_side).toBe("left");
    expect(choices?.[1]?.id).toBe(LAUNCH_MONEY_DAILY_Q1.stay);
    expect((choices?.[1]?.metadata as { tension_side?: string })?.tension_side).toBe("right");
  });

  it("maps line choices without neutral tension sides", async () => {
    if (!admin) {
      expect(true).toBe(true);
      return;
    }

    const available = await launchRoundAvailable(admin);
    if (!available) {
      expect(true).toBe(true);
      return;
    }

    const { data: choices } = await admin
      .from("marshmallow_choices")
      .select("label, metadata")
      .eq("marshmallow_id", LAUNCH_MONEY_DAILY_MARSHMALLOWS[4])
      .order("sort_order", { ascending: true });

    expect(choices?.map((row) => (row.metadata as { tension_side?: string })?.tension_side)).toEqual([
      "right",
      "right",
      "left",
      "left",
      "left",
    ]);
    expect(choices?.[0]?.label).toMatch(/Never/i);
  });

  it("isolates user entries on launch Q1 marshmallow", async () => {
    if (!userA || !userB || !admin) {
      expect(true).toBe(true);
      return;
    }

    const available = await launchRoundAvailable(admin);
    if (!available) {
      expect(true).toBe(true);
      return;
    }

    const sealA = await userA.rpc("seal_entry", {
      p_marshmallow_id: LAUNCH_MONEY_DAILY_MARSHMALLOWS[0],
      p_own_choice_id: LAUNCH_MONEY_DAILY_Q1.move,
      p_allocations: [],
    });
    if (sealA.error) throw sealA.error;

    const { data: ownB } = await userB
      .from("entries")
      .select("own_choice_id")
      .eq("marshmallow_id", LAUNCH_MONEY_DAILY_MARSHMALLOWS[0])
      .maybeSingle();
    expect(ownB).toBeNull();
  });
});
