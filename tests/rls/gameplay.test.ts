import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { Database } from "@/lib/supabase/types";
import { ACTIVE_TOPIC_ID } from "./fixtures";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const password = "test-pass-play-1";

function requireEnv() {
  if (!url || !anonKey || !serviceKey) {
    throw new Error("Hosted Supabase env is required for gameplay tests");
  }
  return { url, anonKey, serviceKey };
}

function isoFromNow(minutes: number): string {
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

describe("gameplay drafts, seal, and cancel (hosted)", () => {
  let adminApi: SupabaseClient<Database>;
  let userA: SupabaseClient<Database>;
  let userB: SupabaseClient<Database>;
  let adminClient: SupabaseClient<Database>;
  let userAId = "";
  let userBId = "";
  let adminId = "";
  const suffix = Date.now().toString(36);
  const createdIds: string[] = [];

  beforeAll(async () => {
    const env = requireEnv();
    adminApi = createClient<Database>(env.url, env.serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const createdA = await adminApi.auth.admin.createUser({
      email: `playa.${suffix}@marshmallow.test`,
      password,
      email_confirm: true,
      user_metadata: { username: `playa_${suffix.slice(0, 8)}` },
    });
    const createdB = await adminApi.auth.admin.createUser({
      email: `playb.${suffix}@marshmallow.test`,
      password,
      email_confirm: true,
      user_metadata: { username: `playb_${suffix.slice(0, 8)}` },
    });
    const createdAdmin = await adminApi.auth.admin.createUser({
      email: `playadm.${suffix}@marshmallow.test`,
      password,
      email_confirm: true,
      user_metadata: { username: `padm_${suffix.slice(0, 8)}` },
    });
    if (createdA.error || !createdA.data.user) throw createdA.error ?? new Error("A");
    if (createdB.error || !createdB.data.user) throw createdB.error ?? new Error("B");
    if (createdAdmin.error || !createdAdmin.data.user) {
      throw createdAdmin.error ?? new Error("admin");
    }
    userAId = createdA.data.user.id;
    userBId = createdB.data.user.id;
    adminId = createdAdmin.data.user.id;
    await adminApi
      .from("profiles")
      .update({ role: "admin", onboarding_completed_at: new Date().toISOString() })
      .eq("id", adminId);

    userA = createClient<Database>(env.url, env.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false, storageKey: "play-a" },
    });
    userB = createClient<Database>(env.url, env.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false, storageKey: "play-b" },
    });
    adminClient = createClient<Database>(env.url, env.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false, storageKey: "play-adm" },
    });
    const signedA = await userA.auth.signInWithPassword({
      email: `playa.${suffix}@marshmallow.test`,
      password,
    });
    const signedB = await userB.auth.signInWithPassword({
      email: `playb.${suffix}@marshmallow.test`,
      password,
    });
    const signedAdmin = await adminClient.auth.signInWithPassword({
      email: `playadm.${suffix}@marshmallow.test`,
      password,
    });
    if (signedA.error) throw signedA.error;
    if (signedB.error) throw signedB.error;
    if (signedAdmin.error) throw signedAdmin.error;
  }, 40000);

  afterAll(async () => {
    if (!adminApi) return;
    for (const id of createdIds) {
      await adminApi.from("marshmallows").delete().eq("id", id);
    }
    if (userAId) await adminApi.auth.admin.deleteUser(userAId);
    if (userBId) await adminApi.auth.admin.deleteUser(userBId);
    if (adminId) await adminApi.auth.admin.deleteUser(adminId);
  });

  async function createOpen(choices: string[]) {
    const created = await adminClient.rpc("admin_upsert_marshmallow", {
      p_question: `Play ${choices.length} ${suffix} ${choices[0]}`,
      p_opens_at: isoFromNow(-2),
      p_closes_at: isoFromNow(40),
      p_reveals_at: isoFromNow(80),
      p_choices: choices.map((label, sort_order) => ({ label, sort_order })),
      p_topic_id: ACTIVE_TOPIC_ID,
      p_is_daily: false,
    });
    if (created.error || !created.data?.id) throw created.error ?? new Error("upsert");
    createdIds.push(created.data.id);
    await adminClient.rpc("admin_schedule_marshmallow", { p_id: created.data.id });
    await adminClient.rpc("run_due_lifecycle", { p_source: "admin" });
    const listed = await adminApi
      .from("marshmallow_choices")
      .select("id, label, sort_order")
      .eq("marshmallow_id", created.data.id)
      .order("sort_order");
    return { id: created.data.id, choices: listed.data ?? [] };
  }

  it("creates, changes, and resumes a draft without leaking B", async () => {
    const item = await createOpen(["Alex", "Jordan"]);
    const alex = item.choices[0];
    const jordan = item.choices[1];
    if (!alex || !jordan) throw new Error("choices");

    const first = await userA.rpc("save_entry_draft", {
      p_marshmallow_id: item.id,
      p_own_choice_id: alex.id,
    });
    expect(first.error).toBeNull();

    const changed = await userA.rpc("save_entry_draft", {
      p_marshmallow_id: item.id,
      p_own_choice_id: jordan.id,
      p_allocations: [
        { choice_id: alex.id, predicted_pct: 40 },
        { choice_id: jordan.id, predicted_pct: 60 },
      ],
    });
    expect(changed.error).toBeNull();
    expect(changed.data?.own_choice_id).toBe(jordan.id);
    expect(changed.data?.sealed_at).toBeNull();

    const resume = await userA
      .from("entries")
      .select("own_choice_id, sealed_at, entry_allocations(choice_id, predicted_pct)")
      .eq("marshmallow_id", item.id)
      .single();
    expect(resume.data?.own_choice_id).toBe(jordan.id);
    expect(resume.data?.entry_allocations?.length).toBe(2);

    const bSee = await userB.from("entries").select("*").eq("marshmallow_id", item.id);
    expect(bSee.data).toEqual([]);
  });

  it("seals binary, 3-choice, and 4-choice mixes and rejects invalid ones", async () => {
    const binary = await createOpen(["Left", "Right"]);
    const three = await createOpen(["One", "Two", "Three"]);
    const four = await createOpen(["A", "B", "C", "D"]);

    const b0 = binary.choices[0];
    const b1 = binary.choices[1];
    if (!b0 || !b1) throw new Error("binary");
    const sealed = await userA.rpc("seal_entry", {
      p_marshmallow_id: binary.id,
      p_own_choice_id: b0.id,
      p_allocations: [
        { choice_id: b0.id, predicted_pct: 64 },
        { choice_id: b1.id, predicted_pct: 36 },
      ],
    });
    expect(sealed.error).toBeNull();

    const again = await userA.rpc("seal_entry", {
      p_marshmallow_id: binary.id,
      p_own_choice_id: b1.id,
      p_allocations: [
        { choice_id: b0.id, predicted_pct: 10 },
        { choice_id: b1.id, predicted_pct: 90 },
      ],
    });
    expect(again.data?.own_choice_id).toBe(b0.id);

    await userA
      .from("entries")
      .update({ own_choice_id: b1.id })
      .eq("marshmallow_id", binary.id);
    const still = await userA
      .from("entries")
      .select("own_choice_id")
      .eq("marshmallow_id", binary.id)
      .single();
    expect(still.data?.own_choice_id).toBe(b0.id);

    const t0 = three.choices[0];
    const t1 = three.choices[1];
    const t2 = three.choices[2];
    if (!t0 || !t1 || !t2) throw new Error("three");
    const threeSeal = await userB.rpc("seal_entry", {
      p_marshmallow_id: three.id,
      p_own_choice_id: t1.id,
      p_allocations: [
        { choice_id: t0.id, predicted_pct: 20 },
        { choice_id: t1.id, predicted_pct: 50 },
        { choice_id: t2.id, predicted_pct: 30 },
      ],
    });
    expect(threeSeal.error).toBeNull();

    const f0 = four.choices[0];
    const f1 = four.choices[1];
    const f2 = four.choices[2];
    const f3 = four.choices[3];
    if (!f0 || !f1 || !f2 || !f3) throw new Error("four");
    const fourSeal = await userA.rpc("seal_entry", {
      p_marshmallow_id: four.id,
      p_own_choice_id: f0.id,
      p_allocations: [
        { choice_id: f0.id, predicted_pct: 10 },
        { choice_id: f1.id, predicted_pct: 20 },
        { choice_id: f2.id, predicted_pct: 30 },
        { choice_id: f3.id, predicted_pct: 40 },
      ],
    });
    expect(fourSeal.error).toBeNull();

    const badSum = await userB.rpc("seal_entry", {
      p_marshmallow_id: four.id,
      p_own_choice_id: f0.id,
      p_allocations: [
        { choice_id: f0.id, predicted_pct: 10 },
        { choice_id: f1.id, predicted_pct: 20 },
        { choice_id: f2.id, predicted_pct: 30 },
        { choice_id: f3.id, predicted_pct: 10 },
      ],
    });
    expect(badSum.error).toBeTruthy();

    const foreign = await userB.rpc("seal_entry", {
      p_marshmallow_id: four.id,
      p_own_choice_id: b0.id,
      p_allocations: [
        { choice_id: f0.id, predicted_pct: 25 },
        { choice_id: f1.id, predicted_pct: 25 },
        { choice_id: f2.id, predicted_pct: 25 },
        { choice_id: f3.id, predicted_pct: 25 },
      ],
    });
    expect(foreign.error).toBeTruthy();
  }, 60000);

  it("rejects late seals and cancelled auto-reveal", async () => {
    const late = await createOpen(["Stay", "Go"]);
    await adminApi
      .from("marshmallows")
      .update({
        opens_at: isoFromNow(-10),
        closes_at: isoFromNow(-2),
        reveals_at: isoFromNow(-1),
        status: "closed",
      })
      .eq("id", late.id);
    const c0 = late.choices[0];
    const c1 = late.choices[1];
    if (!c0 || !c1) throw new Error("late");
    const lateSeal = await userA.rpc("seal_entry", {
      p_marshmallow_id: late.id,
      p_own_choice_id: c0.id,
      p_allocations: [
        { choice_id: c0.id, predicted_pct: 50 },
        { choice_id: c1.id, predicted_pct: 50 },
      ],
    });
    expect(lateSeal.error?.message).toContain("marshmallow_not_open");

    const cancel = await createOpen(["Keep", "Drop"]);
    const closed = await adminClient.rpc("admin_emergency_close", {
      p_id: cancel.id,
      p_reason: "moderation",
    });
    expect(closed.data?.status).toBe("cancelled");

    const k0 = cancel.choices[0];
    const k1 = cancel.choices[1];
    if (!k0 || !k1) throw new Error("cancel");
    const cancelSeal = await userA.rpc("seal_entry", {
      p_marshmallow_id: cancel.id,
      p_own_choice_id: k0.id,
      p_allocations: [
        { choice_id: k0.id, predicted_pct: 50 },
        { choice_id: k1.id, predicted_pct: 50 },
      ],
    });
    expect(cancelSeal.error).toBeTruthy();

    await adminApi
      .from("marshmallows")
      .update({
        opens_at: isoFromNow(-10),
        closes_at: isoFromNow(-5),
        reveals_at: isoFromNow(-1),
      })
      .eq("id", cancel.id);
    await adminApi.rpc("run_due_lifecycle", { p_source: "cron" });
    const still = await adminApi
      .from("marshmallows")
      .select("status")
      .eq("id", cancel.id)
      .single();
    expect(still.data?.status).toBe("cancelled");
    const results = await userA
      .from("marshmallow_results")
      .select("*")
      .eq("marshmallow_id", cancel.id);
    expect(results.data).toEqual([]);
    const rpc = await userA.rpc("get_marshmallow_results", {
      p_marshmallow_id: cancel.id,
    });
    expect(rpc.error).toBeTruthy();

    const spoof = await userA
      .from("marshmallows")
      .update({ status: "open" } as never)
      .eq("id", cancel.id);
    expect(spoof.error).toBeTruthy();
  }, 60000);
});
