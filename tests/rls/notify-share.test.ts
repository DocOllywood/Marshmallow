import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { Database, Json } from "@/lib/supabase/types";
import { ACTIVE_TOPIC_ID } from "./fixtures";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const password = "test-pass-notify-1";

function requireEnv() {
  if (!url || !anonKey || !serviceKey) {
    throw new Error("Hosted Supabase env is required for notify/share tests");
  }
  return { url, anonKey, serviceKey };
}

function isoFromNow(minutes: number): string {
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

describe("notifications, email outbox, share privacy (hosted)", () => {
  let adminApi: SupabaseClient<Database>;
  let userA: SupabaseClient<Database>;
  let userB: SupabaseClient<Database>;
  let adminClient: SupabaseClient<Database>;
  let anon: SupabaseClient<Database>;
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
      email: `nota.${suffix}@marshmallow.test`,
      password,
      email_confirm: true,
      user_metadata: { username: `nota_${suffix.slice(0, 8)}` },
    });
    const createdB = await adminApi.auth.admin.createUser({
      email: `notb.${suffix}@marshmallow.test`,
      password,
      email_confirm: true,
      user_metadata: { username: `notb_${suffix.slice(0, 8)}` },
    });
    const createdAdmin = await adminApi.auth.admin.createUser({
      email: `notadm.${suffix}@marshmallow.test`,
      password,
      email_confirm: true,
      user_metadata: { username: `nadm_${suffix.slice(0, 8)}` },
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
      auth: { persistSession: false, autoRefreshToken: false, storageKey: "not-a" },
    });
    userB = createClient<Database>(env.url, env.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false, storageKey: "not-b" },
    });
    adminClient = createClient<Database>(env.url, env.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false, storageKey: "not-adm" },
    });
    anon = createClient<Database>(env.url, env.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false, storageKey: "not-anon" },
    });
    const signedA = await userA.auth.signInWithPassword({
      email: `nota.${suffix}@marshmallow.test`,
      password,
    });
    const signedB = await userB.auth.signInWithPassword({
      email: `notb.${suffix}@marshmallow.test`,
      password,
    });
    const signedAdmin = await adminClient.auth.signInWithPassword({
      email: `notadm.${suffix}@marshmallow.test`,
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
  }, 60000);

  async function createOpen(options?: { choices?: string[] }) {
    dailyDay += 1;
    const created = await adminClient.rpc("admin_upsert_marshmallow", {
      p_question: `Notify ${suffix} ${dailyDay}`,
      p_opens_at: isoFromNow(-3),
      p_closes_at: isoFromNow(40),
      p_reveals_at: isoFromNow(80),
      p_choices: (options?.choices ?? ["Alex", "Jordan"]).map((label, sort_order) => ({
        label,
        sort_order,
      })),
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
        opens_at: isoFromNow(-30),
        closes_at: isoFromNow(-10),
        reveals_at: isoFromNow(-5),
        status: "closed",
      })
      .eq("id", id);
    if (updated.error) throw updated.error;
    const run = await adminApi.rpc("run_due_lifecycle", { p_source: "cron" });
    if (run.error) throw run.error;
  }

  it("creates one reveal-ready notification per sealed player, never duplicates", async () => {
    const item = await createOpen();
    await seal(userA, item, [62, 38]);
    await closeAndReveal(item.id);

    const first = await userA.from("notifications").select("*").eq("marshmallow_id", item.id);
    expect(first.data?.length).toBe(1);
    expect(first.data?.[0]?.type).toBe("reveal_ready");
    const payload = JSON.stringify(first.data?.[0]?.payload ?? {});
    expect(payload.toLowerCase()).not.toContain("accuracy");
    expect(payload).not.toMatch(/\d+%/);

    await adminApi.rpc("run_due_lifecycle", { p_source: "cron" });
    await adminApi.rpc("enqueue_reveal_ready_notifications", { p_marshmallow_id: item.id });
    const again = await userA.from("notifications").select("id").eq("marshmallow_id", item.id);
    expect(again.data?.length).toBe(1);

    const bNotes = await userB.from("notifications").select("*").eq("marshmallow_id", item.id);
    expect(bNotes.data).toEqual([]);

    const insert = await userA.from("notifications").insert({
      user_id: userAId,
      type: "reveal_ready",
      marshmallow_id: item.id,
    } as never);
    expect(insert.error).toBeTruthy();
  }, 60000);

  it("skips cancelled, zero-vote, and already-opened players for late enqueue", async () => {
    const cancelled = await createOpen();
    await seal(userA, cancelled, [50, 50]);
    await adminClient.rpc("admin_emergency_close", {
      p_id: cancelled.id,
      p_reason: "notify skip",
    });
    await adminApi
      .from("marshmallows")
      .update({ closes_at: isoFromNow(-5), reveals_at: isoFromNow(-1) })
      .eq("id", cancelled.id);
    await adminApi.rpc("run_due_lifecycle", { p_source: "cron" });
    const cancelledNotes = await adminApi
      .from("notifications")
      .select("id")
      .eq("marshmallow_id", cancelled.id);
    expect(cancelledNotes.data).toEqual([]);

    const empty = await createOpen();
    await closeAndReveal(empty.id);
    const emptyNotes = await adminApi.from("notifications").select("id").eq("marshmallow_id", empty.id);
    expect(emptyNotes.data).toEqual([]);

    const late = await createOpen();
    await seal(userB, late, [70, 30]);
    await closeAndReveal(late.id);
    await userB.rpc("open_reveal", { p_marshmallow_id: late.id });
    await adminApi.from("notifications").delete().eq("marshmallow_id", late.id);
    await adminApi.rpc("enqueue_reveal_ready_notifications", { p_marshmallow_id: late.id });
    const afterOpen = await adminApi.from("notifications").select("id").eq("marshmallow_id", late.id);
    expect(afterOpen.data).toEqual([]);
  }, 60000);

  it("enqueues reveal-ready email once when opted in, and retries do not duplicate", async () => {
    await adminApi
      .from("notification_prefs")
      .update({ email_reveal_ready: true })
      .eq("user_id", userAId);
    const item = await createOpen();
    await seal(userA, item, [55, 45]);
    await closeAndReveal(item.id);

    const first = await adminApi
      .from("email_outbox")
      .select("id, status, template")
      .eq("marshmallow_id", item.id)
      .eq("user_id", userAId);
    expect(first.data?.length).toBe(1);
    expect(first.data?.[0]?.template).toBe("reveal_ready");

    await adminApi.rpc("enqueue_reveal_ready_notifications", { p_marshmallow_id: item.id });
    const again = await adminApi.from("email_outbox").select("id").eq("marshmallow_id", item.id);
    expect(again.data?.length).toBe(1);

    const claimed = await adminApi.rpc("claim_email_outbox", { p_limit: 20 });
    expect(claimed.error).toBeNull();
    const row = (claimed.data ?? []).find((itemRow) => itemRow.marshmallow_id === item.id);
    expect(row?.status).toBe("sending");
    await adminApi
      .from("email_outbox")
      .update({ status: "skipped", last_error: "sending_disabled" })
      .eq("id", row?.id ?? "");
    const claimedAgain = await adminApi.rpc("claim_email_outbox", { p_limit: 20 });
    const still = (claimedAgain.data ?? []).find((itemRow) => itemRow.marshmallow_id === item.id);
    expect(still).toBeUndefined();

    const userClaim = await userA.rpc("claim_email_outbox", { p_limit: 1 });
    expect(userClaim.error).toBeTruthy();
  }, 60000);

  it("blocks share creation until the player has opened a revealed result", async () => {
    const item = await createOpen();
    await seal(userA, item, [62, 38]);
    const preReveal = await userA.rpc("create_share_card", { p_marshmallow_id: item.id });
    expect(preReveal.error?.message).toContain("results_not_available");

    await closeAndReveal(item.id);
    const preOpen = await userA.rpc("create_share_card", { p_marshmallow_id: item.id });
    expect(preOpen.error?.message).toContain("reveal_not_opened");

    const hijack = await userB.rpc("create_share_card", { p_marshmallow_id: item.id });
    expect(hijack.error?.message).toMatch(/no_sealed_entry|reveal_not_opened/);

    await userA.rpc("open_reveal", { p_marshmallow_id: item.id });
    const created = await userA.rpc("create_share_card", { p_marshmallow_id: item.id });
    expect(created.error).toBeNull();
    expect(created.data?.public_id).toMatch(/^[a-f0-9]{32}$/);
    const again = await userA.rpc("create_share_card", { p_marshmallow_id: item.id });
    expect(again.data?.public_id).toBe(created.data?.public_id);

    const mutate = await userA
      .from("share_cards")
      .update({ public_id: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" })
      .eq("id", created.data?.id ?? "");
    expect(mutate.error).toBeTruthy();

    const cancelled = await createOpen();
    await seal(userA, cancelled, [50, 50]);
    await adminClient.rpc("admin_emergency_close", {
      p_id: cancelled.id,
      p_reason: "share skip",
    });
    const cancelShare = await userA.rpc("create_share_card", { p_marshmallow_id: cancelled.id });
    expect(cancelShare.error?.message).toMatch(/cancelled|results_not_available|reveal_not_opened/);
  }, 60000);

  it("exposes public share data without private fields, and records attribution", async () => {
    const item = await createOpen();
    await seal(userA, item, [62, 38]);
    await closeAndReveal(item.id);
    await userA.rpc("open_reveal", { p_marshmallow_id: item.id });
    const card = await userA.rpc("create_share_card", { p_marshmallow_id: item.id });
    const publicId = card.data?.public_id ?? "";

    const publicShare = await anon.rpc("get_public_share", { p_public_id: publicId });
    expect(publicShare.error).toBeNull();
    const body = JSON.stringify(publicShare.data ?? {});
    expect(body).not.toContain(userAId);
    expect(body.toLowerCase()).not.toContain("email");
    expect(body).not.toContain("nota.");
    expect((publicShare.data as { question?: string } | null)?.question).toContain("Notify");
    expect((publicShare.data as { accuracy?: number } | null)?.accuracy).toBeGreaterThan(0);

    const missing = await anon.rpc("get_public_share", {
      p_public_id: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    });
    expect(missing.data).toBeNull();

    const table = await anon.from("share_cards").select("*");
    expect(table.data ?? []).toEqual([]);
    const visits = await anon.from("share_visits").select("*");
    expect(visits.data ?? []).toEqual([]);
    const prefs = await anon.from("user_topic_prefs").select("*");
    expect(prefs.data ?? []).toEqual([]);

    const visitor = "cccccccccccccccccccccccccccccccc";
    const visit = await anon.rpc("record_share_visit", {
      p_public_id: publicId,
      p_visitor_token: visitor,
    });
    expect(visit.error).toBeNull();
    const play = await anon.rpc("mark_share_play", {
      p_public_id: publicId,
      p_visitor_token: visitor,
    });
    expect(play.error).toBeNull();
    const stored = await adminApi
      .from("share_visits")
      .select("play_clicked_at, signup_user_id")
      .eq("public_id", publicId)
      .eq("visitor_token", visitor)
      .single();
    expect(stored.data?.play_clicked_at).toBeTruthy();
    expect(stored.data?.signup_user_id).toBeNull();

    const growth = await adminClient.rpc("get_growth_metrics");
    expect(growth.error).toBeNull();
    const denied = await userA.rpc("get_growth_metrics");
    expect(denied.error).toBeTruthy();
    const metrics = (growth.data ?? {}) as Record<string, number | null>;
    expect(Number(metrics.share_visitors)).toBeGreaterThan(0);
    expect(Number(metrics.share_play_clicks)).toBeGreaterThan(0);
    expect(Number(metrics.reveal_ready_created)).toBeGreaterThan(0);

    const spoof = await userA.rpc("track_product_event", {
      p_event_type: "share_created",
      p_payload: { public_id: publicId } as Json,
    });
    expect(spoof.error).toBeNull();
  }, 60000);
});
