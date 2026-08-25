import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { Database } from "@/lib/supabase/types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const password = "test-pass-sample-1";
const REALITY_TV_ID = "20000000-0000-4000-8000-000000000002";

function requireEnv() {
  if (!url || !anonKey || !serviceKey) {
    throw new Error("Hosted Supabase env is required for sample policy tests");
  }
  return { url, anonKey, serviceKey };
}

function isoFromNow(minutes: number): string {
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

describe("Quick sample policy (hosted)", () => {
  let adminApi: SupabaseClient<Database>;
  let adminClient: SupabaseClient<Database>;
  let userA: SupabaseClient<Database>;
  let userB: SupabaseClient<Database>;
  let userAId = "";
  let userBId = "";
  let adminId = "";
  const suffix = Date.now().toString(36);
  const createdIds: string[] = [];
  let dailyDay = 0;

  beforeAll(async () => {
    const env = requireEnv();
    adminApi = createClient<Database>(env.url, env.serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const createdA = await adminApi.auth.admin.createUser({
      email: `samplea.${suffix}@marshmallow.test`,
      password,
      email_confirm: true,
      user_metadata: { username: `sma_${suffix.slice(0, 8)}` },
    });
    const createdB = await adminApi.auth.admin.createUser({
      email: `sampleb.${suffix}@marshmallow.test`,
      password,
      email_confirm: true,
      user_metadata: { username: `smb_${suffix.slice(0, 8)}` },
    });
    const createdAdmin = await adminApi.auth.admin.createUser({
      email: `sampleadm.${suffix}@marshmallow.test`,
      password,
      email_confirm: true,
      user_metadata: { username: `smd_${suffix.slice(0, 8)}` },
    });
    if (createdA.error || !createdA.data.user) throw createdA.error ?? new Error("A");
    if (createdB.error || !createdB.data.user) throw createdB.error ?? new Error("B");
    if (createdAdmin.error || !createdAdmin.data.user) throw createdAdmin.error ?? new Error("admin");
    userAId = createdA.data.user.id;
    userBId = createdB.data.user.id;
    adminId = createdAdmin.data.user.id;
    await adminApi
      .from("profiles")
      .update({ role: "admin", onboarding_completed_at: new Date().toISOString() })
      .eq("id", adminId);
    await adminApi
      .from("profiles")
      .update({ onboarding_completed_at: new Date().toISOString() })
      .in("id", [userAId, userBId]);

    userA = createClient<Database>(env.url, env.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false, storageKey: "sample-a" },
    });
    userB = createClient<Database>(env.url, env.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false, storageKey: "sample-b" },
    });
    adminClient = createClient<Database>(env.url, env.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false, storageKey: "sample-adm" },
    });
    const signedA = await userA.auth.signInWithPassword({
      email: `samplea.${suffix}@marshmallow.test`,
      password,
    });
    const signedB = await userB.auth.signInWithPassword({
      email: `sampleb.${suffix}@marshmallow.test`,
      password,
    });
    const signedAdmin = await adminClient.auth.signInWithPassword({
      email: `sampleadm.${suffix}@marshmallow.test`,
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

  async function createItem(input: {
    mode: "quick" | "live" | "daily";
    minSample?: number;
    hardMinutes?: number;
  }) {
    dailyDay += 1;
    const opensAt =
      input.mode === "daily"
        ? new Date(
            Date.UTC(1973, 0, 1 + (Number.parseInt(suffix, 36) % 10000) + dailyDay, 12, 0, 0),
          ).toISOString()
        : isoFromNow(-3);
    const created = await adminClient.rpc("admin_upsert_marshmallow", {
      p_question: `${input.mode} sample ${suffix} ${dailyDay} question`,
      p_opens_at: opensAt,
      p_closes_at: isoFromNow(input.mode === "quick" ? 3 : 40),
      p_reveals_at: isoFromNow(input.mode === "quick" ? 4 : 80),
      p_hard_reveals_at:
        input.hardMinutes != null ? isoFromNow(input.hardMinutes) : undefined,
      p_choices: ["Alex", "Jordan"].map((label, sort_order) => ({ label, sort_order })),
      p_topic_id: REALITY_TV_ID,
      p_is_daily: input.mode === "daily",
      p_play_mode: input.mode,
      p_minimum_result_sample: input.minSample,
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
    return { id: created.data.id, choices: listed.data ?? [], row: created.data };
  }

  async function seal(
    client: SupabaseClient<Database>,
    id: string,
    choices: { id: string }[],
  ) {
    const first = choices[0];
    if (!first) throw new Error("choice");
    const sealed = await client.rpc("seal_entry", {
      p_marshmallow_id: id,
      p_own_choice_id: first.id,
      p_allocations: choices.map((choice, index) => ({
        choice_id: choice.id,
        predicted_pct: index === 0 ? 60 : 40,
      })),
    });
    if (sealed.error) throw sealed.error;
  }

  it("keeps a seal made immediately before close and never reopens voting", async () => {
    const quick = await createItem({ mode: "quick", minSample: 5 });
    expect(quick.row.minimum_result_sample).toBe(5);
    await adminApi
      .from("marshmallows")
      .update({ closes_at: isoFromNow(0.03), status: "open" })
      .eq("id", quick.id);
    await seal(userA, quick.id, quick.choices);
    await adminApi
      .from("marshmallows")
      .update({
        closes_at: isoFromNow(-1),
        status: "closed",
        reveals_at: isoFromNow(4),
        hard_reveals_at: isoFromNow(10),
      })
      .eq("id", quick.id);
    const late = await userB.rpc("seal_entry", {
      p_marshmallow_id: quick.id,
      p_own_choice_id: quick.choices[0]!.id,
      p_allocations: quick.choices.map((choice, index) => ({
        choice_id: choice.id,
        predicted_pct: index === 0 ? 55 : 45,
      })),
    });
    expect(late.error).toBeTruthy();
    const entry = await adminApi
      .from("entries")
      .select("sealed_at")
      .eq("marshmallow_id", quick.id)
      .eq("user_id", userAId)
      .single();
    expect(entry.data?.sealed_at).toBeTruthy();
    const results = await userA.rpc("get_marshmallow_results", { p_marshmallow_id: quick.id });
    expect(results.error?.message).toContain("results_not_available");
  }, 60000);

  it("finalizes at target reveal when minimum sample is met", async () => {
    const quick = await createItem({ mode: "quick", minSample: 1, hardMinutes: 20 });
    await seal(userA, quick.id, quick.choices);
    await adminApi
      .from("marshmallows")
      .update({
        opens_at: isoFromNow(-30),
        closes_at: isoFromNow(-10),
        reveals_at: isoFromNow(-1),
        hard_reveals_at: isoFromNow(20),
        status: "closed",
      })
      .eq("id", quick.id);
    const run = await adminApi.rpc("run_due_lifecycle", { p_source: "cron" });
    if (run.error) throw run.error;
    const row = await adminApi
      .from("marshmallows")
      .select("status, result_available_at")
      .eq("id", quick.id)
      .single();
    expect(row.data?.status).toBe("revealed");
    expect(row.data?.result_available_at).toBeTruthy();
  }, 60000);

  it("waits for crowd after target reveal when sample is short and leaks no results", async () => {
    const quick = await createItem({ mode: "quick", minSample: 5, hardMinutes: 30 });
    await seal(userA, quick.id, quick.choices);
    await adminApi
      .from("marshmallows")
      .update({
        opens_at: isoFromNow(-30),
        closes_at: isoFromNow(-10),
        reveals_at: isoFromNow(-1),
        hard_reveals_at: isoFromNow(30),
        status: "closed",
      })
      .eq("id", quick.id);
    const run = await adminApi.rpc("run_due_lifecycle", { p_source: "cron" });
    if (run.error) throw run.error;
    const row = await adminApi
      .from("marshmallows")
      .select("status, result_available_at")
      .eq("id", quick.id)
      .single();
    expect(row.data?.status).toBe("closed");
    expect(row.data?.result_available_at).toBeNull();
    const results = await userA.rpc("get_marshmallow_results", { p_marshmallow_id: quick.id });
    expect(results.error?.message).toContain("results_not_available");
    const leaked = await userA.from("marshmallow_results").select("*").eq("marshmallow_id", quick.id);
    expect(leaked.data).toEqual([]);
    const ready = await userA.rpc("ready_to_finalize", { p_marshmallow_id: quick.id });
    expect(ready.error).toBeTruthy();
    const session = await userA.rpc("get_quick_test_session");
    expect(session.error).toBeTruthy();
  }, 60000);

  it("finalizes during extension once the sample arrives, and only once under concurrent runs", async () => {
    const quick = await createItem({ mode: "quick", minSample: 2, hardMinutes: 30 });
    await seal(userA, quick.id, quick.choices);
    await seal(userB, quick.id, quick.choices);
    await adminApi
      .from("marshmallows")
      .update({
        opens_at: isoFromNow(-30),
        closes_at: isoFromNow(-10),
        reveals_at: isoFromNow(-2),
        hard_reveals_at: isoFromNow(30),
        status: "closed",
      })
      .eq("id", quick.id);
    const [first, second] = await Promise.all([
      adminApi.rpc("run_due_lifecycle", { p_source: "cron" }),
      adminApi.rpc("run_due_lifecycle", { p_source: "cron" }),
    ]);
    expect(first.error).toBeNull();
    expect(second.error).toBeNull();
    const row = await adminApi
      .from("marshmallows")
      .select("status, result_available_at")
      .eq("id", quick.id)
      .single();
    expect(row.data?.status).toBe("revealed");
    const results = await adminApi
      .from("marshmallow_results")
      .select("total_sealed_votes")
      .eq("marshmallow_id", quick.id);
    expect(results.data).toHaveLength(1);
    expect(results.data?.[0]?.total_sealed_votes).toBe(2);
    const scores = await adminApi.from("scores").select("user_id").eq("marshmallow_id", quick.id);
    if (scores.error) throw scores.error;
    expect(scores.data).toHaveLength(2);
    const again = await adminApi.rpc("run_due_lifecycle", { p_source: "cron" });
    if (again.error) throw again.error;
    const scoresAgain = await adminApi.from("scores").select("user_id").eq("marshmallow_id", quick.id);
    if (scoresAgain.error) throw scoresAgain.error;
    expect(scoresAgain.data).toHaveLength(2);
  }, 60000);

  it("finalizes whatever sealed sample exists at the hard maximum", async () => {
    const quick = await createItem({ mode: "quick", minSample: 5 });
    await seal(userA, quick.id, quick.choices);
    await adminApi
      .from("marshmallows")
      .update({
        opens_at: isoFromNow(-40),
        closes_at: isoFromNow(-20),
        reveals_at: isoFromNow(-10),
        hard_reveals_at: isoFromNow(-1),
        status: "closed",
      })
      .eq("id", quick.id);
    const run = await adminApi.rpc("run_due_lifecycle", { p_source: "cron" });
    if (run.error) throw run.error;
    const results = await userA.rpc("get_marshmallow_results", { p_marshmallow_id: quick.id });
    expect(results.error).toBeNull();
    expect(results.data?.[0]?.total_sealed_votes).toBe(1);
  }, 60000);

  it("keeps Live and Daily on their own timing even when a minimum is configured", async () => {
    const live = await createItem({ mode: "live", minSample: 0 });
    await adminApi
      .from("marshmallows")
      .update({
        opens_at: isoFromNow(-40),
        closes_at: isoFromNow(-20),
        reveals_at: isoFromNow(-1),
        hard_reveals_at: isoFromNow(-1),
        status: "closed",
      })
      .eq("id", live.id);
    const liveRun = await adminApi.rpc("run_due_lifecycle", { p_source: "cron" });
    if (liveRun.error) throw liveRun.error;
    const liveRow = await adminApi.from("marshmallows").select("status").eq("id", live.id).single();
    expect(liveRow.data?.status).toBe("revealed");

    const daily = await createItem({ mode: "daily", minSample: 5 });
    await seal(userA, daily.id, daily.choices);
    await adminApi
      .from("marshmallows")
      .update({
        closes_at: isoFromNow(-20),
        reveals_at: isoFromNow(-1),
        hard_reveals_at: isoFromNow(-1),
        status: "closed",
      })
      .eq("id", daily.id);
    const dailyRun = await adminApi.rpc("run_due_lifecycle", { p_source: "cron" });
    if (dailyRun.error) throw dailyRun.error;
    const dailyRow = await adminApi.from("marshmallows").select("status").eq("id", daily.id).single();
    expect(dailyRow.data?.status).toBe("revealed");
  }, 60000);

  it("exposes inventory and sample health to admin only", async () => {
    const openQuick = await createItem({ mode: "quick" });
    expect(openQuick.row.minimum_result_sample).toBe(5);
    const deniedHealth = await userA.rpc("get_quick_sample_health");
    expect(deniedHealth.error).toBeTruthy();
    const deniedPayoff = await userA.rpc("get_mode_payoff_metrics");
    expect(deniedPayoff.error).toBeTruthy();
    const ok = await adminClient.rpc("get_quick_test_session");
    expect(ok.error).toBeNull();
    const session = (ok.data ?? {}) as {
      inventory?: { open?: number; warning?: boolean; warn_below?: number };
      board?: { sealed_count?: number; question?: string }[];
    };
    expect(session.inventory?.warn_below).toBe(5);
    expect((session.inventory?.open ?? 0) >= 1).toBe(true);
    expect(typeof session.inventory?.warning).toBe("boolean");
    expect(JSON.stringify(session)).not.toContain("vote_pct");
    const health = await adminClient.rpc("get_quick_sample_health");
    expect(health.error).toBeNull();
    const payoff = await adminClient.rpc("get_mode_payoff_metrics");
    expect(payoff.error).toBeNull();
  }, 60000);
});
