import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { Database } from "@/lib/supabase/types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const password = "test-pass-rotation-1";
const REALITY_TV_ID = "20000000-0000-4000-8000-000000000002";

function requireEnv() {
  if (!url || !anonKey || !serviceKey) {
    throw new Error("Hosted Supabase env is required for Quick rotation tests");
  }
  return { url, anonKey, serviceKey };
}

function isoFromNow(minutes: number): string {
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

describe("Quick rotation (hosted)", () => {
  let adminApi: SupabaseClient<Database>;
  let adminClient: SupabaseClient<Database>;
  let userA: SupabaseClient<Database>;
  let userAId = "";
  let adminId = "";
  const suffix = Date.now().toString(36);
  const createdIds: string[] = [];

  beforeAll(async () => {
    const env = requireEnv();
    adminApi = createClient<Database>(env.url, env.serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const createdA = await adminApi.auth.admin.createUser({
      email: `rota.${suffix}@marshmallow.test`,
      password,
      email_confirm: true,
      user_metadata: { username: `rta_${suffix.slice(0, 8)}` },
    });
    const createdAdmin = await adminApi.auth.admin.createUser({
      email: `rotadm.${suffix}@marshmallow.test`,
      password,
      email_confirm: true,
      user_metadata: { username: `rtd_${suffix.slice(0, 8)}` },
    });
    if (createdA.error || !createdA.data.user) throw createdA.error ?? new Error("A");
    if (createdAdmin.error || !createdAdmin.data.user) throw createdAdmin.error ?? new Error("admin");
    userAId = createdA.data.user.id;
    adminId = createdAdmin.data.user.id;
    await adminApi
      .from("profiles")
      .update({ role: "admin", onboarding_completed_at: new Date().toISOString() })
      .eq("id", adminId);
    await adminApi
      .from("profiles")
      .update({ onboarding_completed_at: new Date().toISOString() })
      .eq("id", userAId);

    userA = createClient<Database>(env.url, env.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false, storageKey: "rota-a" },
    });
    adminClient = createClient<Database>(env.url, env.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false, storageKey: "rota-adm" },
    });
    const signedA = await userA.auth.signInWithPassword({
      email: `rota.${suffix}@marshmallow.test`,
      password,
    });
    const signedAdmin = await adminClient.auth.signInWithPassword({
      email: `rotadm.${suffix}@marshmallow.test`,
      password,
    });
    if (signedA.error) throw signedA.error;
    if (signedAdmin.error) throw signedAdmin.error;
  }, 40000);

  afterAll(async () => {
    if (!adminApi) return;
    for (const id of createdIds) {
      await adminApi.from("marshmallows").delete().eq("id", id);
    }
    if (userAId) await adminApi.auth.admin.deleteUser(userAId);
    if (adminId) await adminApi.auth.admin.deleteUser(adminId);
  });

  async function createQuick() {
    const created = await adminClient.rpc("admin_upsert_marshmallow", {
      p_question: `rotation ${suffix} ${createdIds.length + 1} question here`,
      p_opens_at: isoFromNow(-3),
      p_closes_at: isoFromNow(3),
      p_reveals_at: isoFromNow(4),
      p_choices: ["Alex", "Jordan"].map((label, sort_order) => ({ label, sort_order })),
      p_topic_id: REALITY_TV_ID,
      p_play_mode: "quick",
    });
    if (created.error || !created.data?.id) throw created.error ?? new Error("upsert");
    createdIds.push(created.data.id);
    await adminClient.rpc("admin_schedule_marshmallow", { p_id: created.data.id });
    await adminClient.rpc("run_due_lifecycle", { p_source: "admin" });
    return created.data.id;
  }

  it("denies rotation RPCs to ordinary users and never leaks aggregates", async () => {
    const deniedSet = await userA.rpc("admin_set_quick_priority", {
      p_id: "00000000-0000-4000-8000-000000000001",
      p_priority: 1,
    });
    expect(deniedSet.error).toBeTruthy();
    const deniedPromote = await userA.rpc("admin_promote_next_quick");
    expect(deniedPromote.error).toBeTruthy();
    const deniedSession = await userA.rpc("get_quick_test_session");
    expect(deniedSession.error).toBeTruthy();
    const deniedHealth = await userA.rpc("get_quick_sample_health");
    expect(deniedHealth.error).toBeTruthy();

    const id = await createQuick();
    const write = await userA
      .from("marshmallows")
      .update({ quick_priority: 9 })
      .eq("id", id);
    expect(write.error).toBeTruthy();
    const after = await adminApi
      .from("marshmallows")
      .select("quick_priority")
      .eq("id", id)
      .single();
    expect(after.data?.quick_priority === 9).toBe(false);

    const ok = await adminClient.rpc("get_quick_test_session");
    expect(ok.error).toBeNull();
    const payload = JSON.stringify(ok.data ?? {});
    expect(payload).not.toContain("vote_pct");
    expect(payload).not.toContain("vote_count");
    expect(payload).toContain("sealed_count");
  }, 60000);

  it("lets admin set priority and leaves finalize timing alone when a promoted Quick closes", async () => {
    const first = await createQuick();
    const queued = await createQuick();
    const setFirst = await adminClient.rpc("admin_set_quick_priority", {
      p_id: first,
      p_priority: 1,
    });
    expect(setFirst.error).toBeNull();
    const holdQueued = await adminClient.rpc("admin_set_quick_priority", {
      p_id: queued,
      p_priority: 0,
    });
    expect(holdQueued.error).toBeNull();
    const promoteHeld = await adminClient.rpc("admin_set_quick_priority", {
      p_id: queued,
      p_priority: -1,
    });
    expect(promoteHeld.error).toBeNull();
    const queuedRow = await adminApi
      .from("marshmallows")
      .select("quick_priority, status")
      .eq("id", queued)
      .single();
    expect((queuedRow.data?.quick_priority ?? 0) > 0).toBe(true);
    expect(queuedRow.data?.status).toBe("open");

    await adminApi
      .from("marshmallows")
      .update({
        opens_at: isoFromNow(-30),
        closes_at: isoFromNow(-10),
        reveals_at: isoFromNow(4),
        hard_reveals_at: isoFromNow(10),
        status: "closed",
      })
      .eq("id", first);

    const afterClose = await adminApi
      .from("marshmallows")
      .select("status, result_available_at")
      .eq("id", first)
      .single();
    expect(afterClose.data?.status).toBe("closed");
    expect(afterClose.data?.result_available_at).toBeNull();
    const results = await userA.rpc("get_marshmallow_results", { p_marshmallow_id: first });
    expect(results.error?.message).toContain("results_not_available");
  }, 60000);
});
