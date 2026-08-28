/**
 * Blind Mirror hosted RLS + eligibility tests.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { HUMAN_NATURE_TOPIC_ID } from "./fixtures";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const password = "test-pass-blind-mirror-1";

const PRINCIPLE_ID = "60000000-0000-4000-8000-000000000001";
const LIVE_ROUND_ID = "40000000-0000-4000-8000-000000000006";
const MIRROR_ROUND_ID = "40000000-0000-4000-8000-000000000007";
const LIVE_MQ = [
  "31000000-0000-4000-8000-000000000020",
  "31000000-0000-4000-8000-000000000021",
  "31000000-0000-4000-8000-000000000022",
  "31000000-0000-4000-8000-000000000023",
  "31000000-0000-4000-8000-000000000024",
] as const;
const MIRROR_MQ = [
  "31000000-0000-4000-8000-000000000030",
  "31000000-0000-4000-8000-000000000031",
  "31000000-0000-4000-8000-000000000032",
  "31000000-0000-4000-8000-000000000033",
  "31000000-0000-4000-8000-000000000034",
] as const;

const JUSTICE = [
  "31000000-0000-4000-8000-000000000201",
  "31000000-0000-4000-8000-000000000211",
  "31000000-0000-4000-8000-000000000221",
] as const;
const LOYALTY = [
  "31000000-0000-4000-8000-000000000202",
  "31000000-0000-4000-8000-000000000212",
  "31000000-0000-4000-8000-000000000222",
] as const;
const YES = "31000000-0000-4000-8000-000000000231";
const NO = "31000000-0000-4000-8000-000000000232";
const MIRROR_JUSTICE = [
  "31000000-0000-4000-8000-000000000301",
  "31000000-0000-4000-8000-000000000311",
  "31000000-0000-4000-8000-000000000321",
] as const;
const MIRROR_LOYALTY = [
  "31000000-0000-4000-8000-000000000302",
  "31000000-0000-4000-8000-000000000312",
  "31000000-0000-4000-8000-000000000322",
] as const;
const MIRROR_YES = "31000000-0000-4000-8000-000000000331";
const MIRROR_NO = "31000000-0000-4000-8000-000000000332";
const LINE = "31000000-0000-4000-8000-000000000241";
const MIRROR_LINE = "31000000-0000-4000-8000-000000000341";

async function principlesAvailable(admin: SupabaseClient): Promise<boolean> {
  const { error } = await admin.from("belief_principles").select("id").limit(1);
  return !error;
}

async function completeExperiment(
  client: SupabaseClient,
  mq: readonly string[],
  picks: readonly string[],
  flip: { yes: string; no: string; choiceId: string },
  lineId: string,
) {
  for (let i = 0; i < 3; i++) {
    const sealed = await client.rpc("seal_entry", {
      p_marshmallow_id: mq[i],
      p_own_choice_id: picks[i],
      p_allocations: [],
    });
    if (sealed.error) throw sealed.error;
  }
  const flipSeal = await client.rpc("seal_entry", {
    p_marshmallow_id: mq[3],
    p_own_choice_id: flip.choiceId,
    p_allocations: [
      { choice_id: flip.yes, predicted_pct: 60 },
      { choice_id: flip.no, predicted_pct: 40 },
    ],
  });
  if (flipSeal.error) throw flipSeal.error;
  const line = await client.rpc("seal_line_entry", {
    p_marshmallow_id: mq[4],
    p_own_choice_id: lineId,
  });
  if (line.error) throw line.error;
}

describe("Blind Mirror (hosted)", () => {
  let admin: SupabaseClient;
  let userA: SupabaseClient;
  let userB: SupabaseClient;
  let userAId = "";
  let userBId = "";
  let ready = false;
  const suffix = Date.now().toString(36);

  beforeAll(async () => {
    if (!url || !anonKey || !serviceKey) {
      return;
    }
    admin = createClient(url, serviceKey, { auth: { persistSession: false } });
    ready = await principlesAvailable(admin);
    if (!ready) return;

    const createdA = await admin.auth.admin.createUser({
      email: `blind-mirror-a.${suffix}@marshmallow.test`,
      password,
      email_confirm: true,
      user_metadata: { username: `bm_a_${suffix.slice(0, 6)}` },
    });
    const createdB = await admin.auth.admin.createUser({
      email: `blind-mirror-b.${suffix}@marshmallow.test`,
      password,
      email_confirm: true,
      user_metadata: { username: `bm_b_${suffix.slice(0, 6)}` },
    });
    if (createdA.error || !createdA.data.user || createdB.error || !createdB.data.user) {
      throw createdA.error ?? createdB.error ?? new Error("create users");
    }
    userAId = createdA.data.user.id;
    userBId = createdB.data.user.id;

    userA = createClient(url, anonKey, { auth: { persistSession: false, storageKey: "bm-a" } });
    userB = createClient(url, anonKey, { auth: { persistSession: false, storageKey: "bm-b" } });
    await userA.auth.signInWithPassword({
      email: `blind-mirror-a.${suffix}@marshmallow.test`,
      password,
    });
    await userB.auth.signInWithPassword({
      email: `blind-mirror-b.${suffix}@marshmallow.test`,
      password,
    });
    await userA.rpc("complete_onboarding", {
      p_topic_ids: [HUMAN_NATURE_TOPIC_ID],
      p_display_name: "Blind A",
    });
    await userB.rpc("complete_onboarding", {
      p_topic_ids: [HUMAN_NATURE_TOPIC_ID],
      p_display_name: "Blind B",
    });
  });

  afterAll(async () => {
    if (!ready || !admin) return;
    for (const id of [userAId, userBId]) {
      if (!id) continue;
      await admin.from("entries").delete().eq("user_id", id);
      await admin.auth.admin.deleteUser(id);
    }
  });

  it("exposes belief_principles to authenticated users", async () => {
    if (!ready) return;
    const { data, error } = await userA.from("belief_principles").select("slug").eq("id", PRINCIPLE_ID).single();
    expect(error).toBeNull();
    expect(data?.slug).toBe("truth-versus-loyalty");
  });

  it("keeps today's home slot separate from mirror QA round", async () => {
    if (!ready) return;
    const today = new Date().toISOString().slice(0, 10);
    const { data } = await admin
      .from("daily_rounds")
      .select("id, round_date, status, title")
      .eq("round_date", today)
      .single();
    expect(data?.id).not.toBe(MIRROR_ROUND_ID);
    expect(data?.id).not.toBe("40000000-0000-4000-8000-000000000008");

    const { data: lj } = await admin
      .from("daily_rounds")
      .select("id, round_date, status, title")
      .eq("id", LIVE_ROUND_ID)
      .single();
    expect(lj?.round_date).toBe("2026-08-27");
    expect(lj?.title).toBe("How much does loyalty excuse?");
  });

  it("keeps mirror round draft and off today", async () => {
    if (!ready) return;
    const today = new Date().toISOString().slice(0, 10);
    const { data } = await admin
      .from("daily_rounds")
      .select("status, round_date, principle_id")
      .eq("id", MIRROR_ROUND_ID)
      .single();
    expect(data?.status).toBe("draft");
    expect(data?.round_date).not.toBe(today);
    expect(data?.principle_id).toBe(PRINCIPLE_ID);
  });

  it("does not leak other users entries for blind mirror eligibility", async () => {
    if (!ready) return;

    const { data: liveMqStatus } = await admin
      .from("marshmallows")
      .select("status")
      .eq("id", LIVE_MQ[0])
      .single();

    if (liveMqStatus?.status === "open") {
      await completeExperiment(userA, LIVE_MQ, JUSTICE, { yes: YES, no: NO, choiceId: YES }, LINE);
    }

    await completeExperiment(
      userB,
      MIRROR_MQ,
      MIRROR_LOYALTY,
      { yes: MIRROR_YES, no: MIRROR_NO, choiceId: MIRROR_NO },
      MIRROR_LINE,
    );

    const { data: crossRead } = await userA
      .from("entries")
      .select("id")
      .eq("user_id", userBId);
    expect(crossRead?.length ?? 0).toBe(0);
  });
});
