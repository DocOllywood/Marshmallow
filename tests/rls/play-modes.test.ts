import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { Database } from "@/lib/supabase/types";
import { ACTIVE_TOPIC_ID } from "./fixtures";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const password = "test-pass-modes-1";

function requireEnv() {
  if (!url || !anonKey || !serviceKey) {
    throw new Error("Hosted Supabase env is required for play mode tests");
  }
  return { url, anonKey, serviceKey };
}

function isoFromNow(minutes: number): string {
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

describe("Quick / Live / Daily modes (hosted)", () => {
  let adminApi: SupabaseClient<Database>;
  let userA: SupabaseClient<Database>;
  let adminClient: SupabaseClient<Database>;
  let userAId = "";
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
      email: `modea.${suffix}@marshmallow.test`,
      password,
      email_confirm: true,
      user_metadata: { username: `modea_${suffix.slice(0, 8)}` },
    });
    const createdAdmin = await adminApi.auth.admin.createUser({
      email: `modeadm.${suffix}@marshmallow.test`,
      password,
      email_confirm: true,
      user_metadata: { username: `madm_${suffix.slice(0, 8)}` },
    });
    if (createdA.error || !createdA.data.user) throw createdA.error ?? new Error("A");
    if (createdAdmin.error || !createdAdmin.data.user) throw createdAdmin.error ?? new Error("admin");
    userAId = createdA.data.user.id;
    adminId = createdAdmin.data.user.id;
    await adminApi
      .from("profiles")
      .update({ role: "admin", onboarding_completed_at: new Date().toISOString() })
      .eq("id", adminId);

    userA = createClient<Database>(env.url, env.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false, storageKey: "mode-a" },
    });
    adminClient = createClient<Database>(env.url, env.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false, storageKey: "mode-adm" },
    });
    const signedA = await userA.auth.signInWithPassword({
      email: `modea.${suffix}@marshmallow.test`,
      password,
    });
    const signedAdmin = await adminClient.auth.signInWithPassword({
      email: `modeadm.${suffix}@marshmallow.test`,
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

  async function createItem(mode: "quick" | "live" | "daily") {
    dailyDay += 1;
    const opensAt =
      mode === "daily"
        ? new Date(
            Date.UTC(1972, 0, 1 + (Number.parseInt(suffix, 36) % 10000) + dailyDay, 12, 0, 0),
          ).toISOString()
        : isoFromNow(-3);
    const created = await adminClient.rpc("admin_upsert_marshmallow", {
      p_question: `${mode} ${suffix} ${dailyDay} question`,
      p_opens_at: opensAt,
      p_closes_at: isoFromNow(mode === "quick" ? 2 : 40),
      p_reveals_at: isoFromNow(mode === "quick" ? 3 : 80),
      p_choices: ["Alex", "Jordan"].map((label, sort_order) => ({ label, sort_order })),
      p_topic_id: ACTIVE_TOPIC_ID,
      p_is_daily: mode === "daily",
      p_play_mode: mode,
    });
    if (created.error || !created.data?.id) throw created.error ?? new Error("upsert");
    createdIds.push(created.data.id);
    expect(created.data.play_mode).toBe(mode);
    expect(created.data.is_daily).toBe(mode === "daily");
    await adminClient.rpc("admin_schedule_marshmallow", { p_id: created.data.id });
    await adminClient.rpc("run_due_lifecycle", { p_source: "admin" });
    const listed = await adminApi
      .from("marshmallow_choices")
      .select("id, label, sort_order")
      .eq("marshmallow_id", created.data.id)
      .order("sort_order");
    return { id: created.data.id, choices: listed.data ?? [], mode };
  }

  async function seal(id: string, choices: { id: string }[]) {
    const first = choices[0];
    if (!first) throw new Error("choice");
    const sealed = await userA.rpc("seal_entry", {
      p_marshmallow_id: id,
      p_own_choice_id: first.id,
      p_allocations: choices.map((choice, index) => ({
        choice_id: choice.id,
        predicted_pct: index === 0 ? 60 : 40,
      })),
    });
    if (sealed.error) throw sealed.error;
  }

  async function closeAndReveal(id: string) {
    const updated = await adminApi
      .from("marshmallows")
      .update({
        opens_at: isoFromNow(-30),
        closes_at: isoFromNow(-10),
        reveals_at: isoFromNow(-2),
        hard_reveals_at: isoFromNow(-1),
        status: "closed",
      })
      .eq("id", id);
    if (updated.error) throw updated.error;
    const run = await adminApi.rpc("run_due_lifecycle", { p_source: "cron" });
    if (run.error) throw run.error;
  }

  it("migrates safely, preserves Daily uniqueness, and cannot bypass timestamps", async () => {
    const quick = await createItem("quick");
    const live = await createItem("live");
    const daily = await createItem("daily");
    expect(quick.mode).toBe("quick");
    expect(live.mode).toBe("live");
    expect(daily.mode).toBe("daily");

    const farDate = new Date(
      Date.UTC(1972, 0, 1 + (Number.parseInt(suffix, 36) % 10000) + dailyDay),
    )
      .toISOString()
      .slice(0, 10);
    const firstRound = await adminApi.from("daily_rounds").insert({
      round_date: farDate,
      title: `Modes round ${suffix}`,
      status: "draft",
    });
    expect(firstRound.error).toBeNull();

    const duplicateRound = await adminApi.from("daily_rounds").insert({
      round_date: farDate,
      title: `Modes round dup ${suffix}`,
      status: "draft",
    });
    expect(duplicateRound.error).toBeTruthy();
    expect(duplicateRound.error?.message.toLowerCase()).toMatch(/duplicate|unique|violates/);

    await adminApi.from("daily_rounds").delete().eq("round_date", farDate);

    await seal(quick.id, quick.choices);
    const early = await userA.rpc("get_marshmallow_results", { p_marshmallow_id: quick.id });
    expect(early.error?.message).toContain("results_not_available");
    const earlyOpen = await userA.rpc("open_reveal", { p_marshmallow_id: quick.id });
    expect(earlyOpen.error?.message).toContain("results_not_available");

    const mutate = await userA
      .from("marshmallows")
      .update({ play_mode: "daily", reveals_at: isoFromNow(-1) } as never)
      .eq("id", quick.id);
    expect(mutate.error).toBeTruthy();
    const still = await adminApi
      .from("marshmallows")
      .select("play_mode, status")
      .eq("id", quick.id)
      .single();
    expect(still.data?.play_mode).toBe("quick");
    expect(still.data?.status).not.toBe("revealed");
  }, 60000);

  it("allows a short Quick lifecycle and scores without Daily bonus or streak", async () => {
    const quick = await createItem("quick");
    await seal(quick.id, quick.choices);
    await closeAndReveal(quick.id);
    const results = await userA.rpc("get_marshmallow_results", { p_marshmallow_id: quick.id });
    expect(results.error).toBeNull();
    const opened = await userA.rpc("open_reveal", { p_marshmallow_id: quick.id });
    expect(opened.error).toBeNull();
    expect(opened.data?.reveal_bonus_earned).toBe(false);
    expect(opened.data?.reveal_bonus_points).toBe(0);
    expect(opened.data?.reveal_streak_qualified).toBe(false);
    const score = await userA
      .from("scores")
      .select("accuracy, base_points")
      .eq("marshmallow_id", quick.id)
      .single();
    expect(score.data?.accuracy).toBe(opened.data?.base_points);
    expect(score.data?.base_points).toBe(opened.data?.base_points);

    const notes = await userA
      .from("notifications")
      .select("id")
      .eq("marshmallow_id", quick.id);
    expect(notes.data).toEqual([]);
  }, 60000);

  it("keeps Live on the same lifecycle without Daily streak", async () => {
    const live = await createItem("live");
    await seal(live.id, live.choices);
    const early = await userA.rpc("open_reveal", { p_marshmallow_id: live.id });
    expect(early.error?.message).toContain("results_not_available");
    await closeAndReveal(live.id);
    const opened = await userA.rpc("open_reveal", { p_marshmallow_id: live.id });
    expect(opened.error).toBeNull();
    expect(opened.data?.reveal_streak_qualified).toBe(false);
    expect(opened.data?.reveal_bonus_earned).toBe(false);
  }, 60000);

  it("keeps Daily bonus and streak, and hides analytics from ordinary users", async () => {
    const daily = await createItem("daily");
    await seal(daily.id, daily.choices);
    await closeAndReveal(daily.id);
    const opened = await userA.rpc("open_reveal", { p_marshmallow_id: daily.id });
    expect(opened.error).toBeNull();
    expect(opened.data?.reveal_streak_qualified).toBe(true);

    const deniedHealth = await userA.rpc("get_beta_health");
    expect(deniedHealth.error).toBeTruthy();
    const deniedContent = await userA.rpc("get_content_health");
    expect(deniedContent.error).toBeTruthy();
    const deniedCal = await userA.rpc("get_accuracy_calibration");
    expect(deniedCal.error).toBeTruthy();
    const ok = await adminClient.rpc("get_beta_health");
    expect(ok.error).toBeNull();
    const health = (ok.data ?? {}) as { users?: { signups?: number } };
    expect(health.users?.signups).toBeGreaterThan(0);
  }, 60000);
});
