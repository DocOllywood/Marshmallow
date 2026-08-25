import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { revealBonusPoints } from "@/domain/reputation/points";
import type { Database, Json } from "@/lib/supabase/types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const password = "test-pass-reveal-1";
const REALITY_TV_ID = "20000000-0000-4000-8000-000000000002";

function requireEnv() {
  if (!url || !anonKey || !serviceKey) {
    throw new Error("Hosted Supabase env is required for reveal tests");
  }
  return { url, anonKey, serviceKey };
}

function isoFromNow(minutes: number): string {
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

describe("reveal, bonus, streak, RRR (hosted)", () => {
  let adminApi: SupabaseClient<Database>;
  let userA: SupabaseClient<Database>;
  let userB: SupabaseClient<Database>;
  let adminClient: SupabaseClient<Database>;
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
      email: `reva.${suffix}@marshmallow.test`,
      password,
      email_confirm: true,
      user_metadata: { username: `reva_${suffix.slice(0, 8)}` },
    });
    const createdB = await adminApi.auth.admin.createUser({
      email: `revb.${suffix}@marshmallow.test`,
      password,
      email_confirm: true,
      user_metadata: { username: `revb_${suffix.slice(0, 8)}` },
    });
    const createdAdmin = await adminApi.auth.admin.createUser({
      email: `revadm.${suffix}@marshmallow.test`,
      password,
      email_confirm: true,
      user_metadata: { username: `radm_${suffix.slice(0, 8)}` },
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
      auth: { persistSession: false, autoRefreshToken: false, storageKey: "rev-a" },
    });
    userB = createClient<Database>(env.url, env.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false, storageKey: "rev-b" },
    });
    adminClient = createClient<Database>(env.url, env.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false, storageKey: "rev-adm" },
    });
    const signedA = await userA.auth.signInWithPassword({
      email: `reva.${suffix}@marshmallow.test`,
      password,
    });
    const signedB = await userB.auth.signInWithPassword({
      email: `revb.${suffix}@marshmallow.test`,
      password,
    });
    const signedAdmin = await adminClient.auth.signInWithPassword({
      email: `revadm.${suffix}@marshmallow.test`,
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

  async function createOpen(options?: { daily?: boolean; choices?: string[] }) {
    dailyDay += 1;
    const opensAt = options?.daily
      ? new Date(
          Date.UTC(
            1971,
            0,
            1 + (Number.parseInt(suffix, 36) % 20000) + dailyDay,
            12,
            dailyDay,
            0,
          ),
        ).toISOString()
      : isoFromNow(-3);
    const created = await adminClient.rpc("admin_upsert_marshmallow", {
      p_question: `Reveal ${suffix} ${dailyDay}`,
      p_opens_at: opensAt,
      p_closes_at: isoFromNow(40),
      p_reveals_at: isoFromNow(80),
      p_choices: (options?.choices ?? ["Alex", "Jordan"]).map((label, sort_order) => ({
        label,
        sort_order,
      })),
      p_topic_id: REALITY_TV_ID,
      p_is_daily: options?.daily ?? false,
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

  async function seal(
    client: SupabaseClient<Database>,
    item: { id: string; choices: { id: string }[] },
    percents: number[],
  ) {
    const first = item.choices[0];
    if (!first) throw new Error("choice");
    const sealed = await client.rpc("seal_entry", {
      p_marshmallow_id: item.id,
      p_own_choice_id: first.id,
      p_allocations: item.choices.map((choice, index) => ({
        choice_id: choice.id,
        predicted_pct: percents[index] ?? 0,
      })),
    });
    if (sealed.error) throw sealed.error;
  }

  async function closeAndReveal(id: string, revealsMinutesAgo: number) {
    const updated = await adminApi
      .from("marshmallows")
      .update({
        opens_at: isoFromNow(-(revealsMinutesAgo + 30)),
        closes_at: isoFromNow(-(revealsMinutesAgo + 10)),
        reveals_at: isoFromNow(-revealsMinutesAgo),
        status: "closed",
      })
      .eq("id", id)
      .select("status")
      .single();
    if (updated.error) throw updated.error;
    const run = await adminApi.rpc("run_due_lifecycle", { p_source: "cron" });
    if (run.error) throw run.error;
  }

  it("denies results before legitimate reveal and cancelled aggregates", async () => {
    const open = await createOpen();
    const early = await userA.rpc("get_marshmallow_results", {
      p_marshmallow_id: open.id,
    });
    expect(early.error?.message).toContain("results_not_available");

    const cancelled = await createOpen();
    const closed = await adminClient.rpc("admin_emergency_close", {
      p_id: cancelled.id,
      p_reason: "test cancel",
    });
    expect(closed.error).toBeNull();
    await adminApi
      .from("marshmallows")
      .update({
        closes_at: isoFromNow(-5),
        reveals_at: isoFromNow(-1),
      })
      .eq("id", cancelled.id);
    await adminApi.rpc("run_due_lifecycle", { p_source: "cron" });
    const stillCancelled = await adminApi
      .from("marshmallows")
      .select("status")
      .eq("id", cancelled.id)
      .single();
    expect(stillCancelled.data?.status).toBe("cancelled");
    const cancelledResults = await userA.rpc("get_marshmallow_results", {
      p_marshmallow_id: cancelled.id,
    });
    expect(cancelledResults.error?.message).toContain("results_not_available");
    const table = await userA
      .from("marshmallow_results")
      .select("*")
      .eq("marshmallow_id", cancelled.id);
    expect(table.data).toEqual([]);
  }, 60000);

  it("reveals spectator crowd, personalized score, and zero-response safely", async () => {
    const played = await createOpen({ choices: ["Alex", "Jordan"] });
    await seal(userA, played, [64, 36]);
    await closeAndReveal(played.id, 5);

    const spectator = await userB.rpc("get_marshmallow_results", {
      p_marshmallow_id: played.id,
    });
    expect(spectator.error).toBeNull();
    expect(spectator.data?.[0]?.total_sealed_votes).toBe(1);

    const bScore = await userB.from("scores").select("*").eq("marshmallow_id", played.id);
    expect(bScore.data).toEqual([]);

    const opened = await userA.rpc("open_reveal", { p_marshmallow_id: played.id });
    expect(opened.error).toBeNull();
    expect(opened.data?.base_points).toBeTruthy();
    const score = await userA
      .from("scores")
      .select("accuracy, base_points")
      .eq("marshmallow_id", played.id)
      .single();
    expect(score.data?.accuracy).toBe(opened.data?.base_points);
    expect(score.data?.base_points).toBe(opened.data?.base_points);

    const empty = await createOpen();
    await closeAndReveal(empty.id, 5);
    const zero = await userB.rpc("get_marshmallow_results", { p_marshmallow_id: empty.id });
    expect(zero.error).toBeNull();
    expect(zero.data?.[0]?.total_sealed_votes).toBe(0);
    expect(Number(zero.data?.[0]?.vote_pct ?? 0)).toBe(0);
  }, 60000);

  it("awards Reveal Bonus in-window once and not after 24h", async () => {
    const timely = await createOpen({ daily: true });
    await seal(userA, timely, [50, 50]);
    await closeAndReveal(timely.id, 30);
    const first = await userA.rpc("open_reveal", { p_marshmallow_id: timely.id });
    expect(first.error).toBeNull();
    const expected = revealBonusPoints(first.data?.base_points ?? 0);
    expect(first.data?.reveal_bonus_earned).toBe(expected > 0);
    expect(first.data?.reveal_bonus_points).toBe(expected);

    const again = await userA.rpc("open_reveal", { p_marshmallow_id: timely.id });
    expect(again.data?.id).toBe(first.data?.id);
    expect(again.data?.reveal_bonus_points).toBe(first.data?.reveal_bonus_points);
    const opens = await adminApi
      .from("reveal_opens")
      .select("id")
      .eq("marshmallow_id", timely.id)
      .eq("user_id", userAId);
    expect(opens.data?.length).toBe(1);

    const late = await createOpen({ daily: true });
    await seal(userA, late, [50, 50]);
    await closeAndReveal(late.id, 25 * 60);
    const missed = await userA.rpc("open_reveal", { p_marshmallow_id: late.id });
    expect(missed.error).toBeNull();
    expect(missed.data?.reveal_bonus_earned).toBe(false);
    expect(missed.data?.reveal_bonus_points).toBe(0);
    const lateScore = await userA
      .from("scores")
      .select("base_points")
      .eq("marshmallow_id", late.id)
      .single();
    expect(lateScore.data?.base_points).toBe(missed.data?.base_points);
  }, 60000);

  it("advances Daily Reveal Streak once under concurrent opens, not for non-Daily", async () => {
    const daily = await createOpen({ daily: true });
    await seal(userA, daily, [50, 50]);
    await closeAndReveal(daily.id, 10);
    const [one, two] = await Promise.all([
      userA.rpc("open_reveal", { p_marshmallow_id: daily.id }),
      userA.rpc("open_reveal", { p_marshmallow_id: daily.id }),
    ]);
    expect(one.error).toBeNull();
    expect(two.error).toBeNull();
    expect(one.data?.reveal_streak_qualified || two.data?.reveal_streak_qualified).toBe(true);
    const streak = await userA.from("streaks").select("reveal_current").maybeSingle();
    expect(streak.data?.reveal_current).toBe(1);
    const third = await userA.rpc("open_reveal", { p_marshmallow_id: daily.id });
    expect(third.data?.id).toBe(one.data?.id ?? two.data?.id);
    const streakAgain = await userA.from("streaks").select("reveal_current").maybeSingle();
    expect(streakAgain.data?.reveal_current).toBe(1);

    const global = await createOpen({ daily: false });
    await seal(userA, global, [50, 50]);
    await closeAndReveal(global.id, 10);
    const globalOpen = await userA.rpc("open_reveal", { p_marshmallow_id: global.id });
    expect(globalOpen.data?.reveal_streak_qualified).toBe(false);
    const streakGlobal = await userA.from("streaks").select("reveal_current").maybeSingle();
    expect(streakGlobal.data?.reveal_current).toBe(1);
  }, 60000);

  it("computes RRR from sealed revealed entries and excludes cancelled/drafts", async () => {
    const before = await adminClient.rpc("get_reveal_return_metrics");
    expect(before.error).toBeNull();
    const start = (before.data ?? {}) as Record<string, number | null>;

    const eligible = await createOpen();
    await seal(userA, eligible, [50, 50]);
    await closeAndReveal(eligible.id, 5);

    const afterReveal = await adminClient.rpc("get_reveal_return_metrics");
    const mid = (afterReveal.data ?? {}) as Record<string, number | null>;
    expect(Number(mid.eligible_sealed_reveals)).toBe(Number(start.eligible_sealed_reveals) + 1);
    expect(Number(mid.first_reveal_opens)).toBe(Number(start.first_reveal_opens));

    await userA.rpc("open_reveal", { p_marshmallow_id: eligible.id });
    const afterOpen = await adminClient.rpc("get_reveal_return_metrics");
    const end = (afterOpen.data ?? {}) as Record<string, number | null>;
    expect(Number(end.first_reveal_opens)).toBe(Number(start.first_reveal_opens) + 1);
    expect(Number(end.eligible_sealed_reveals)).toBe(Number(start.eligible_sealed_reveals) + 1);

    const cancelled = await createOpen();
    await seal(userA, cancelled, [50, 50]);
    await adminClient.rpc("admin_emergency_close", {
      p_id: cancelled.id,
      p_reason: "rrr exclude",
    });
    const afterCancel = await adminClient.rpc("get_reveal_return_metrics");
    const cancelMetrics = (afterCancel.data ?? {}) as Record<string, number | null>;
    expect(Number(cancelMetrics.eligible_sealed_reveals)).toBe(
      Number(end.eligible_sealed_reveals),
    );

    const denied = await userA.rpc("get_reveal_return_metrics");
    expect(denied.error).toBeTruthy();
  }, 60000);

  it("blocks A from opening B, mutating scores, or spoofing bonus", async () => {
    const item = await createOpen();
    await seal(userB, item, [70, 30]);
    await closeAndReveal(item.id, 5);

    const hijack = await userA.rpc("open_reveal", { p_marshmallow_id: item.id });
    expect(hijack.error?.message).toContain("no_sealed_entry");

    const insertOpen = await userA.from("reveal_opens").insert({
      user_id: userBId,
      marshmallow_id: item.id,
      base_points: 100,
      reveal_bonus_points: 10,
      reveal_bonus_earned: true,
    });
    expect(insertOpen.error).toBeTruthy();

    const scoreHack = await userA
      .from("scores")
      .update({ accuracy: 100, base_points: 100 } as never)
      .eq("marshmallow_id", item.id);
    expect(scoreHack.error).toBeTruthy();

    const bOpen = await userB.rpc("open_reveal", { p_marshmallow_id: item.id });
    expect(bOpen.error).toBeNull();
    const aReadB = await userA.from("scores").select("*").eq("marshmallow_id", item.id);
    expect(aReadB.data).toEqual([]);
    const aReadOpen = await userA.from("reveal_opens").select("*").eq("marshmallow_id", item.id);
    expect(aReadOpen.data).toEqual([]);

    const spoofEvent = await userA.rpc("track_product_event", {
      p_event_type: "reveal_bonus_earned",
      p_payload: { reveal_bonus_points: 10 } as Json,
      p_marshmallow_id: item.id,
    });
    expect(spoofEvent.error).toBeNull();
    const bOpenAgain = await userB.rpc("open_reveal", { p_marshmallow_id: item.id });
    expect(bOpenAgain.data?.reveal_bonus_points).toBe(bOpen.data?.reveal_bonus_points);
  }, 60000);
});
