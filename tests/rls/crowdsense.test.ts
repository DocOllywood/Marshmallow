import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { crowdsenseFromScores } from "@/domain/crowdsense/rating";
import type { Database } from "@/lib/supabase/types";
import { ACTIVE_TOPIC_ID, FRIENDSHIP_TOPIC_ID } from "./fixtures";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const password = "test-pass-cs-1";

function requireEnv() {
  if (!url || !anonKey || !serviceKey) {
    throw new Error("Hosted Supabase env is required for CrowdSense tests");
  }
  return { url, anonKey, serviceKey };
}

function isoFromNow(minutes: number): string {
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

describe("CrowdSense rebuild, boards, and privacy (hosted)", () => {
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
      email: `csa.${suffix}@marshmallow.test`,
      password,
      email_confirm: true,
      user_metadata: { username: `csa_${suffix.slice(0, 8)}` },
    });
    const createdB = await adminApi.auth.admin.createUser({
      email: `csb.${suffix}@marshmallow.test`,
      password,
      email_confirm: true,
      user_metadata: { username: `csb_${suffix.slice(0, 8)}` },
    });
    const createdAdmin = await adminApi.auth.admin.createUser({
      email: `csadm.${suffix}@marshmallow.test`,
      password,
      email_confirm: true,
      user_metadata: { username: `csad_${suffix.slice(0, 8)}` },
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

    userA = createClient<Database>(env.url, env.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false, storageKey: "cs-a" },
    });
    userB = createClient<Database>(env.url, env.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false, storageKey: "cs-b" },
    });
    adminClient = createClient<Database>(env.url, env.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false, storageKey: "cs-adm" },
    });
    const signedA = await userA.auth.signInWithPassword({
      email: `csa.${suffix}@marshmallow.test`,
      password,
    });
    const signedB = await userB.auth.signInWithPassword({
      email: `csb.${suffix}@marshmallow.test`,
      password,
    });
    const signedAdmin = await adminClient.auth.signInWithPassword({
      email: `csadm.${suffix}@marshmallow.test`,
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

  async function createOpen(topicId: string, choices = ["Alex", "Jordan"]) {
    const created = await adminClient.rpc("admin_upsert_marshmallow", {
      p_question: `CS ${suffix} ${createdIds.length} ${topicId.slice(-4)}`,
      p_opens_at: isoFromNow(-3),
      p_closes_at: isoFromNow(40),
      p_reveals_at: isoFromNow(80),
      p_choices: choices.map((label, sort_order) => ({ label, sort_order })),
      p_topic_id: topicId,
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

  async function closeAndReveal(id: string) {
    const updated = await adminApi
      .from("marshmallows")
      .update({
        opens_at: isoFromNow(-40),
        closes_at: isoFromNow(-20),
        reveals_at: isoFromNow(-1),
        status: "closed",
      })
      .eq("id", id);
    if (updated.error) throw updated.error;
    const run = await adminApi.rpc("run_due_lifecycle", { p_source: "cron" });
    if (run.error) throw run.error;
  }

  it("stays off the board until 5 scores, then matches the rebuilt rating", async () => {
    const accuracies: number[] = [];
    for (let i = 0; i < 5; i += 1) {
      const item = await createOpen(ACTIVE_TOPIC_ID);
      await seal(userA, item, [90, 10]);
      await closeAndReveal(item.id);
      const score = await adminApi
        .from("scores")
        .select("accuracy")
        .eq("user_id", userAId)
        .eq("marshmallow_id", item.id)
        .single();
      accuracies.push(score.data?.accuracy ?? 0);
      if (i < 4) {
        const board = await userA.rpc("get_leaderboard", { p_board: "overall" });
        const rows = (board.data as { rows?: { username: string }[] } | null)?.rows ?? [];
        expect(rows.some((row) => row.username.startsWith("csa_"))).toBe(false);
      }
    }
    const expected = crowdsenseFromScores(accuracies);
    const rebuilt = await adminApi.rpc("rebuild_crowdsense", { p_user_id: userAId });
    expect(rebuilt.error).toBeNull();
    const rating = await adminApi
      .from("crowdsense_ratings")
      .select("rating, qualified, scored_count, adjusted_accuracy")
      .eq("user_id", userAId)
      .is("category_id", null)
      .single();
    expect(rating.data?.qualified).toBe(true);
    expect(rating.data?.scored_count).toBe(5);
    expect(rating.data?.rating).toBe(expected.rating);
    const board = await userA.rpc("get_leaderboard", { p_board: "overall" });
    const payload = board.data as {
      rows: { username: string; rating: number }[];
      viewer: { qualified: boolean; remaining: number };
      population: number;
    };
    expect(payload.viewer.qualified).toBe(true);
    expect(payload.rows.some((row) => row.username.startsWith("csa_") && row.rating === expected.rating)).toBe(
      true,
    );
  }, 120000);

  it("keeps category boards independent and blocks user writes", async () => {
    const celeb = await createOpen(FRIENDSHIP_TOPIC_ID);
    await seal(userA, celeb, [50, 50]);
    await closeAndReveal(celeb.id);
    const overall = await adminApi
      .from("crowdsense_ratings")
      .select("scored_count, category_id")
      .eq("user_id", userAId);
    const overallRow = overall.data?.find((row) => row.category_id == null);
    const celebRow = overall.data?.find((row) => row.category_id != null && row.scored_count === 1);
    expect((overallRow?.scored_count ?? 0) >= 6).toBe(true);
    expect(celebRow?.scored_count).toBe(1);

    const fake = await userA.from("crowdsense_ratings").insert({
      user_id: userAId,
      scored_count: 99,
      accuracy_sum: 9900,
      adjusted_accuracy: 99,
      rating: 1000,
      qualified: true,
    } as never);
    expect(fake.error).toBeTruthy();

    const scoreHack = await userA.from("scores").insert({
      user_id: userAId,
      marshmallow_id: celeb.id,
      accuracy: 100,
      base_points: 100,
    } as never);
    expect(scoreHack.error).toBeTruthy();
  }, 60000);

  it("hides private fields on public profiles and unrevealed entries", async () => {
    const publicPlayer = await userB.rpc("get_public_player", {
      p_username: `csa_${suffix.slice(0, 8)}`,
    });
    expect(publicPlayer.error).toBeNull();
    const blob = JSON.stringify(publicPlayer.data);
    expect(blob).not.toMatch(/marshmallow\.test/);
    expect(blob).not.toContain(userAId);
    expect(blob.toLowerCase()).not.toContain("email");
    expect(blob).not.toContain("onboarding_completed");
    expect(publicPlayer.data as { username: string }).toHaveProperty("username");

    const open = await createOpen(ACTIVE_TOPIC_ID);
    await seal(userA, open, [50, 50]);
    const bEntries = await userB.from("entries").select("*").eq("marshmallow_id", open.id);
    expect(bEntries.data).toEqual([]);
    const publicAgain = await userB.rpc("get_public_player", {
      p_username: `csa_${suffix.slice(0, 8)}`,
    });
    const questions = JSON.stringify(publicAgain.data);
    expect(questions).not.toContain(open.id);
  }, 60000);

  it("denies ordinary users a CrowdSense rebuild", async () => {
    const denied = await userA.rpc("admin_rebuild_crowdsense");
    expect(denied.error).toBeTruthy();
  });
});
