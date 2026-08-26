import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { Database } from "@/lib/supabase/types";

import { ACTIVE_TOPIC_ID } from "./fixtures";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const password = "test-pass-admin-1";
function requireEnv() {
  if (!url || !anonKey || !serviceKey) {
    throw new Error("Hosted Supabase env is required for admin/lifecycle tests");
  }
  return { url, anonKey, serviceKey };
}

function isoFromNow(minutes: number): string {
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

describe("admin composer and lifecycle (hosted)", () => {
  let adminApi: SupabaseClient<Database>;
  let userClient: SupabaseClient<Database>;
  let adminClient: SupabaseClient<Database>;
  let userId = "";
  let adminId = "";
  const suffix = Date.now().toString(36);
  const createdIds: string[] = [];

  beforeAll(async () => {
    const env = requireEnv();
    adminApi = createClient<Database>(env.url, env.serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const user = await adminApi.auth.admin.createUser({
      email: `plain.${suffix}@marshmallow.test`,
      password,
      email_confirm: true,
      user_metadata: { username: `plain_${suffix.slice(0, 8)}` },
    });
    const adminUser = await adminApi.auth.admin.createUser({
      email: `admin.${suffix}@marshmallow.test`,
      password,
      email_confirm: true,
      user_metadata: { username: `admin_${suffix.slice(0, 8)}` },
    });
    if (user.error || !user.data.user) throw user.error ?? new Error("user");
    if (adminUser.error || !adminUser.data.user) {
      throw adminUser.error ?? new Error("admin");
    }
    userId = user.data.user.id;
    adminId = adminUser.data.user.id;

    const promoted = await adminApi
      .from("profiles")
      .update({ role: "admin", onboarding_completed_at: new Date().toISOString() })
      .eq("id", adminId);
    if (promoted.error) throw promoted.error;

    userClient = createClient<Database>(env.url, env.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false, storageKey: "adm-u" },
    });
    adminClient = createClient<Database>(env.url, env.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false, storageKey: "adm-a" },
    });
    const signedUser = await userClient.auth.signInWithPassword({
      email: `plain.${suffix}@marshmallow.test`,
      password,
    });
    const signedAdmin = await adminClient.auth.signInWithPassword({
      email: `admin.${suffix}@marshmallow.test`,
      password,
    });
    if (signedUser.error) throw signedUser.error;
    if (signedAdmin.error) throw signedAdmin.error;
  }, 40000);

  afterAll(async () => {
    if (adminApi) {
      for (const id of createdIds) {
        await adminApi.from("marshmallows").delete().eq("id", id);
      }
      if (userId) await adminApi.auth.admin.deleteUser(userId);
      if (adminId) await adminApi.auth.admin.deleteUser(adminId);
    }
  });

  async function upsert(input: {
    question: string;
    opens_at: string;
    closes_at: string;
    reveals_at: string;
    choices: string[];
    is_daily?: boolean;
    id?: string;
  }) {
    const { data, error } = await adminClient.rpc("admin_upsert_marshmallow", {
      p_question: input.question,
      p_opens_at: input.opens_at,
      p_closes_at: input.closes_at,
      p_reveals_at: input.reveals_at,
      p_choices: input.choices.map((label, sort_order) => ({ label, sort_order })),
      p_id: input.id,
      p_topic_id: ACTIVE_TOPIC_ID,
      p_is_daily: input.is_daily ?? false,
    });
    if (data?.id) createdIds.push(data.id);
    return { data, error };
  }

  it("blocks ordinary users from admin mutations and finalization", async () => {
    const upsertDenied = await userClient.rpc("admin_upsert_marshmallow", {
      p_question: "Should not land",
      p_opens_at: isoFromNow(5),
      p_closes_at: isoFromNow(10),
      p_reveals_at: isoFromNow(15),
      p_choices: [{ label: "A", sort_order: 0 }, { label: "B", sort_order: 1 }],
      p_is_daily: false,
    });
    expect(upsertDenied.error).toBeTruthy();

    const finalizeDenied = await userClient.rpc("finalize_marshmallow", {
      p_marshmallow_id: "10000000-0000-4000-8000-000000000001",
    });
    expect(finalizeDenied.error).toBeTruthy();

    const lifecycleDenied = await userClient.rpc("run_due_lifecycle", {
      p_source: "admin",
    });
    expect(lifecycleDenied.error).toBeTruthy();
  });

  it("lets an admin save a draft and rejects invalid schedules", async () => {
    const created = await upsert({
      question: `Admin draft ${suffix}`,
      opens_at: isoFromNow(20),
      closes_at: isoFromNow(40),
      reveals_at: isoFromNow(60),
      choices: ["One"],
    });
    expect(created.error).toBeNull();
    expect(created.data?.status).toBe("draft");

    const scheduled = await adminClient.rpc("admin_schedule_marshmallow", {
      p_id: created.data?.id ?? "",
    });
    expect(scheduled.error?.message).toContain("choices_invalid");

    const times = await upsert({
      question: `Bad times ${suffix}`,
      opens_at: isoFromNow(40),
      closes_at: isoFromNow(10),
      reveals_at: isoFromNow(60),
      choices: ["Yes", "No"],
    });
    expect(times.error?.message).toContain("timestamps_invalid");
  });

  it("enforces one Daily round per UTC date", async () => {
    const farDate = new Date(Date.now() + 40 * 24 * 60 * 60_000).toISOString().slice(0, 10);

    const first = await adminApi.from("daily_rounds").insert({
      round_date: farDate,
      title: `Daily A ${suffix}`,
      status: "draft",
    });
    expect(first.error).toBeNull();

    const second = await adminApi.from("daily_rounds").insert({
      round_date: farDate,
      title: `Daily B ${suffix}`,
      status: "draft",
    });
    expect(second.error).toBeTruthy();
    expect(second.error?.message.toLowerCase()).toMatch(/duplicate|unique|violates/);

    await adminApi.from("daily_rounds").delete().eq("round_date", farDate);
  });

  it("does not open, close, or reveal early, then advances when due", async () => {
    const future = await upsert({
      question: `Future open ${suffix}`,
      opens_at: isoFromNow(90),
      closes_at: isoFromNow(120),
      reveals_at: isoFromNow(150),
      choices: ["Soon", "Later"],
    });
    expect(future.error).toBeNull();
    await adminClient.rpc("admin_schedule_marshmallow", { p_id: future.data?.id ?? "" });
    await adminClient.rpc("run_due_lifecycle", { p_source: "admin" });
    const stillScheduled = await adminClient
      .from("marshmallows")
      .select("status")
      .eq("id", future.data?.id ?? "")
      .single();
    expect(stillScheduled.data?.status).toBe("scheduled");

    const dueOpen = await upsert({
      question: `Due open ${suffix}`,
      opens_at: isoFromNow(-2),
      closes_at: isoFromNow(20),
      reveals_at: isoFromNow(40),
      choices: ["Now", "Not yet"],
    });
    await adminClient.rpc("admin_schedule_marshmallow", { p_id: dueOpen.data?.id ?? "" });
    await adminClient.rpc("run_due_lifecycle", { p_source: "admin" });
    const opened = await adminClient
      .from("marshmallows")
      .select("status")
      .eq("id", dueOpen.data?.id ?? "")
      .single();
    expect(opened.data?.status).toBe("open");

    const dueClose = await upsert({
      question: `Due close ${suffix}`,
      opens_at: isoFromNow(-20),
      closes_at: isoFromNow(-1),
      reveals_at: isoFromNow(40),
      choices: ["Stay", "Go"],
    });
    await adminClient.rpc("admin_schedule_marshmallow", { p_id: dueClose.data?.id ?? "" });
    const firstPass = await adminClient.rpc("run_due_lifecycle", { p_source: "admin" });
    expect(firstPass.error).toBeNull();
    const closed = await adminClient
      .from("marshmallows")
      .select("status")
      .eq("id", dueClose.data?.id ?? "")
      .single();
    expect(closed.data?.status).toBe("closed");

    const earlyReveal = await adminClient
      .from("marshmallow_results")
      .select("marshmallow_id")
      .eq("marshmallow_id", dueClose.data?.id ?? "");
    expect(earlyReveal.data).toEqual([]);

    const dueReveal = await upsert({
      question: `Due reveal ${suffix}`,
      opens_at: isoFromNow(-30),
      closes_at: isoFromNow(-20),
      reveals_at: isoFromNow(-1),
      choices: ["Riley", "Sam"],
    });
    await adminClient.rpc("admin_schedule_marshmallow", { p_id: dueReveal.data?.id ?? "" });
    await adminClient.rpc("run_due_lifecycle", { p_source: "admin" });
    const revealed = await adminClient
      .from("marshmallows")
      .select("status")
      .eq("id", dueReveal.data?.id ?? "")
      .single();
    expect(revealed.data?.status).toBe("revealed");

    const results = await adminClient
      .from("marshmallow_results")
      .select("total_sealed_votes")
      .eq("marshmallow_id", dueReveal.data?.id ?? "")
      .single();
    expect(results.data?.total_sealed_votes).toBe(0);

    const rerun = await adminClient.rpc("run_due_lifecycle", { p_source: "admin" });
    expect(rerun.error).toBeNull();
    expect(rerun.data?.revealed_count).toBe(0);
  }, 60000);

  it("counts only sealed entries when finalizing", async () => {
    const item = await upsert({
      question: `Sealed only ${suffix}`,
      opens_at: isoFromNow(-3),
      closes_at: isoFromNow(15),
      reveals_at: isoFromNow(30),
      choices: ["Alex", "Jordan"],
    });
    const id = item.data?.id ?? "";
    await adminClient.rpc("admin_schedule_marshmallow", { p_id: id });
    await adminClient.rpc("run_due_lifecycle", { p_source: "admin" });

    const choices = await adminApi
      .from("marshmallow_choices")
      .select("id, label")
      .eq("marshmallow_id", id)
      .order("sort_order");
    const alex = choices.data?.find((row) => row.label === "Alex");
    const jordan = choices.data?.find((row) => row.label === "Jordan");
    if (!alex || !jordan) throw new Error("choices missing");

    const seal = await userClient.rpc("seal_entry", {
      p_marshmallow_id: id,
      p_own_choice_id: alex.id,
      p_allocations: [
        { choice_id: alex.id, predicted_pct: 70 },
        { choice_id: jordan.id, predicted_pct: 30 },
      ],
    });
    expect(seal.error).toBeNull();

    const draftEntry = await adminApi.from("entries").insert({
      user_id: adminId,
      marshmallow_id: id,
      own_choice_id: jordan.id,
      sealed_at: null,
    });
    expect(draftEntry.error).toBeNull();

    const closed = await adminApi
      .from("marshmallows")
      .update({
        closes_at: isoFromNow(-2),
        reveals_at: isoFromNow(-1),
        status: "closed",
      })
      .eq("id", id)
      .select("status")
      .single();
    expect(closed.error).toBeNull();
    expect(closed.data?.status).toBe("closed");

    const run = await adminApi.rpc("run_due_lifecycle", { p_source: "cron" });
    expect(run.error).toBeNull();

    const revealed = await adminApi
      .from("marshmallows")
      .select("status")
      .eq("id", id)
      .single();
    expect(revealed.data?.status).toBe("revealed");

    const result = await adminClient
      .from("marshmallow_results")
      .select("total_sealed_votes")
      .eq("marshmallow_id", id)
      .single();
    expect(result.error).toBeNull();
    expect(result.data?.total_sealed_votes).toBe(1);

    const userResults = await userClient
      .from("marshmallow_results")
      .select("total_sealed_votes")
      .eq("marshmallow_id", id);
    expect(userResults.data?.length).toBe(1);
  }, 60000);

  it("emergency-closes without revealing", async () => {
    const item = await upsert({
      question: `Emergency ${suffix}`,
      opens_at: isoFromNow(-2),
      closes_at: isoFromNow(20),
      reveals_at: isoFromNow(40),
      choices: ["Keep", "Kill"],
    });
    const id = item.data?.id ?? "";
    await adminClient.rpc("admin_schedule_marshmallow", { p_id: id });
    await adminClient.rpc("run_due_lifecycle", { p_source: "admin" });

    const closed = await adminClient.rpc("admin_emergency_close", {
      p_id: id,
      p_reason: "bad question",
    });
    expect(closed.error).toBeNull();
    expect(closed.data?.status).toBe("cancelled");

    await adminApi
      .from("marshmallows")
      .update({
        opens_at: isoFromNow(-10),
        closes_at: isoFromNow(-5),
        reveals_at: isoFromNow(-1),
      })
      .eq("id", id);
    await adminClient.rpc("run_due_lifecycle", { p_source: "admin" });
    const after = await adminClient
      .from("marshmallows")
      .select("status")
      .eq("id", id)
      .single();
    expect(after.data?.status).toBe("cancelled");

    const results = await adminClient
      .from("marshmallow_results")
      .select("marshmallow_id")
      .eq("marshmallow_id", id);
    expect(results.data).toEqual([]);

    const ordinary = await userClient.rpc("admin_emergency_close", {
      p_id: id,
      p_reason: "nope",
    });
    expect(ordinary.error).toBeTruthy();
  });

  it("cannot spoof caller identity on onboarding or internal event helpers", async () => {
    const spoof = await userClient.rpc("complete_onboarding", {
      p_topic_ids: [ACTIVE_TOPIC_ID],
      p_display_name: "Hijack",
    });
    expect(spoof.error).toBeNull();
    const own = await adminApi
      .from("profiles")
      .select("id, display_name")
      .in("id", [userId, adminId]);
    expect(own.data?.find((row) => row.id === userId)?.display_name).toBe("Hijack");
    expect(own.data?.find((row) => row.id === adminId)?.display_name).not.toBe("Hijack");

    const internal = await userClient.rpc("record_product_event", {
      p_user_id: adminId,
      p_marshmallow_id: "10000000-0000-4000-8000-000000000001",
      p_event_type: "sealed",
      p_payload: {},
    });
    expect(internal.error).toBeTruthy();
  });
});
