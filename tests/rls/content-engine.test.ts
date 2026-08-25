import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { Database } from "@/lib/supabase/types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const password = "test-pass-content-1";
const REALITY_TV_ID = "20000000-0000-4000-8000-000000000002";

function requireEnv() {
  if (!url || !anonKey || !serviceKey) {
    throw new Error("Hosted Supabase env is required for content engine tests");
  }
  return { url, anonKey, serviceKey };
}

function isoFromNow(minutes: number): string {
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

describe("content engine (hosted)", () => {
  let adminApi: SupabaseClient<Database>;
  let adminClient: SupabaseClient<Database>;
  let userA: SupabaseClient<Database>;
  let userAId = "";
  let adminId = "";
  const suffix = Date.now().toString(36);
  const createdIds: string[] = [];
  const setIds: string[] = [];

  beforeAll(async () => {
    const env = requireEnv();
    adminApi = createClient<Database>(env.url, env.serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const createdA = await adminApi.auth.admin.createUser({
      email: `cnta.${suffix}@marshmallow.test`,
      password,
      email_confirm: true,
      user_metadata: { username: `cnta_${suffix.slice(0, 8)}` },
    });
    const createdAdmin = await adminApi.auth.admin.createUser({
      email: `cntadm.${suffix}@marshmallow.test`,
      password,
      email_confirm: true,
      user_metadata: { username: `cna_${suffix.slice(0, 8)}` },
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
      auth: { persistSession: false, autoRefreshToken: false, storageKey: "cnt-a" },
    });
    adminClient = createClient<Database>(env.url, env.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false, storageKey: "cnt-adm" },
    });
    const signedA = await userA.auth.signInWithPassword({
      email: `cnta.${suffix}@marshmallow.test`,
      password,
    });
    const signedAdmin = await adminClient.auth.signInWithPassword({
      email: `cntadm.${suffix}@marshmallow.test`,
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
    for (const id of setIds) {
      await adminApi.from("content_sets").delete().eq("id", id);
    }
    if (userAId) await adminApi.auth.admin.deleteUser(userAId);
    if (adminId) await adminApi.auth.admin.deleteUser(adminId);
  });

  it("batches Quick drafts into a set and bulk-schedules a stagger", async () => {
    const set = await adminClient.rpc("admin_create_content_set", {
      p_name: `Friday Reality ${suffix}`,
      p_notes: "Beta night",
    });
    if (set.error || !set.data?.id) throw set.error ?? new Error("set");
    setIds.push(set.data.id);

    const batch = await adminClient.rpc("admin_batch_create_quick", {
      p_questions: [
        `Who came off better in the recap ${suffix} one?`,
        `Which look won the carpet ${suffix} two?`,
        `Will the couple last ${suffix} three?`,
      ],
      p_set_id: set.data.id,
      p_topic_id: REALITY_TV_ID,
      p_archetype: "who_won",
      p_choice_a: "Alex",
      p_choice_b: "Jordan",
    });
    if (batch.error) throw batch.error;
    const ids = ((batch.data as { ids?: string[] } | null)?.ids ?? []) as string[];
    expect(ids).toHaveLength(3);
    createdIds.push(...ids);

    const editorial = await adminClient
      .from("marshmallow_editorial")
      .select("marshmallow_id, set_position, archetype, content_set_id")
      .eq("content_set_id", set.data.id)
      .order("set_position");
    expect(editorial.data).toHaveLength(3);
    expect(editorial.data?.[0]?.set_position).toBe(0);
    expect(editorial.data?.[2]?.set_position).toBe(2);

    const base = isoFromNow(20);
    const scheduled = await adminClient.rpc("admin_bulk_schedule_set", {
      p_set_id: set.data.id,
      p_base_opens_at: base,
    });
    if (scheduled.error) throw scheduled.error;

    const rows = await adminApi
      .from("marshmallows")
      .select("id, status, opens_at, closes_at, reveals_at, play_mode")
      .in("id", ids)
      .order("closes_at");
    expect(rows.data?.every((row) => row.status === "scheduled")).toBe(true);
    expect(rows.data?.every((row) => row.play_mode === "quick")).toBe(true);
    const first = rows.data?.[0];
    const second = rows.data?.[1];
    expect(first && second).toBeTruthy();
    if (first && second) {
      expect(Date.parse(second.closes_at) - Date.parse(first.closes_at)).toBe(60_000);
    }
  }, 60000);

  it("duplicates structure without results, entries, or scores", async () => {
    const created = await adminClient.rpc("admin_upsert_marshmallow", {
      p_question: `Template source ${suffix} question`,
      p_opens_at: isoFromNow(-5),
      p_closes_at: isoFromNow(3),
      p_reveals_at: isoFromNow(4),
      p_choices: ["Alex", "Jordan"].map((label, sort_order) => ({ label, sort_order })),
      p_topic_id: REALITY_TV_ID,
      p_play_mode: "quick",
    });
    if (created.error || !created.data?.id) throw created.error ?? new Error("upsert");
    createdIds.push(created.data.id);
    await adminClient.rpc("admin_save_editorial", {
      p_marshmallow_id: created.data.id,
      p_archetype: "pick_one",
      p_spoiler_context: "SPOILERS: Episode 6",
      p_entity_label: "Island Heat",
    });

    const listed = await adminApi
      .from("marshmallow_choices")
      .select("id")
      .eq("marshmallow_id", created.data.id)
      .order("sort_order");
    const firstChoice = listed.data?.[0];
    if (!firstChoice) throw new Error("choice");
    await adminApi.from("entries").insert({
      user_id: userAId,
      marshmallow_id: created.data.id,
      own_choice_id: firstChoice.id,
      sealed_at: new Date().toISOString(),
    });

    const copy = await adminClient.rpc("admin_duplicate_marshmallow", { p_id: created.data.id });
    if (copy.error || !copy.data?.id) throw copy.error ?? new Error("dup");
    createdIds.push(copy.data.id);
    expect(copy.data.id).not.toBe(created.data.id);

    const copyEntries = await adminApi.from("entries").select("id").eq("marshmallow_id", copy.data.id);
    const copyScores = await adminApi.from("scores").select("user_id").eq("marshmallow_id", copy.data.id);
    const copyResults = await adminApi
      .from("marshmallow_results")
      .select("marshmallow_id")
      .eq("marshmallow_id", copy.data.id);
    expect(copyEntries.data).toEqual([]);
    expect(copyScores.data).toEqual([]);
    expect(copyResults.data).toEqual([]);

    const copyEd = await adminClient
      .from("marshmallow_editorial")
      .select("archetype, content_set_id")
      .eq("marshmallow_id", copy.data.id)
      .single();
    expect(copyEd.data?.archetype).toBe("pick_one");
    expect(copyEd.data?.content_set_id).toBeNull();

    const template = await adminClient.rpc("admin_save_template", {
      p_marshmallow_id: created.data.id,
      p_name: `WHO WON ${suffix}`,
    });
    if (template.error || !template.data?.id) throw template.error ?? new Error("template");
    const fromTemplate = await adminClient.rpc("admin_create_from_template", {
      p_template_id: template.data.id,
    });
    if (fromTemplate.error || !fromTemplate.data?.id) throw fromTemplate.error ?? new Error("from");
    createdIds.push(fromTemplate.data.id);
    const fromEntries = await adminApi
      .from("entries")
      .select("id")
      .eq("marshmallow_id", fromTemplate.data.id);
    expect(fromEntries.data).toEqual([]);
  }, 60000);

  it("hides editorial metadata from ordinary users and keeps spoiler readable", async () => {
    const created = await adminClient.rpc("admin_upsert_marshmallow", {
      p_question: `Spoiler check ${suffix} question`,
      p_opens_at: isoFromNow(-2),
      p_closes_at: isoFromNow(8),
      p_reveals_at: isoFromNow(9),
      p_choices: ["Alex", "Jordan"].map((label, sort_order) => ({ label, sort_order })),
      p_play_mode: "quick",
    });
    if (created.error || !created.data?.id) throw created.error ?? new Error("upsert");
    createdIds.push(created.data.id);
    await adminClient.rpc("admin_schedule_marshmallow", { p_id: created.data.id });
    await adminClient.rpc("run_due_lifecycle", { p_source: "admin" });
    await adminClient.rpc("admin_save_editorial", {
      p_marshmallow_id: created.data.id,
      p_archetype: "side_with",
      p_spoiler_context: "SPOILERS: Recap",
      p_checklist: { clean: true },
    });

    const spoiler = await userA
      .from("marshmallows")
      .select("spoiler_context, entity_label")
      .eq("id", created.data.id)
      .single();
    expect(spoiler.data?.spoiler_context).toBe("SPOILERS: Recap");

    const editorial = await userA.from("marshmallow_editorial").select("*").eq("marshmallow_id", created.data.id);
    expect(editorial.data).toEqual([]);
    const deniedCompare = await userA.rpc("get_editorial_comparisons");
    expect(deniedCompare.error).toBeTruthy();
    const deniedInventory = await userA.rpc("get_content_inventory");
    expect(deniedInventory.error).toBeTruthy();
    const ok = await adminClient.rpc("get_editorial_comparisons");
    expect(ok.error).toBeNull();
  }, 60000);

  it("rejects Daily uniqueness inside a Quick set bulk schedule", async () => {
    const set = await adminClient.rpc("admin_create_content_set", {
      p_name: `Daily trap ${suffix}`,
    });
    if (set.error || !set.data?.id) throw set.error ?? new Error("set");
    setIds.push(set.data.id);
    const daily = await adminClient.rpc("admin_upsert_marshmallow", {
      p_question: `Daily in a set ${suffix} question`,
      p_opens_at: new Date(Date.UTC(1974, 5, 1 + (Number.parseInt(suffix, 36) % 20), 12, 0, 0)).toISOString(),
      p_closes_at: isoFromNow(40),
      p_reveals_at: isoFromNow(80),
      p_choices: ["Alex", "Jordan"].map((label, sort_order) => ({ label, sort_order })),
      p_play_mode: "daily",
      p_is_daily: true,
    });
    if (daily.error || !daily.data?.id) throw daily.error ?? new Error("daily");
    createdIds.push(daily.data.id);
    await adminClient.rpc("admin_save_editorial", {
      p_marshmallow_id: daily.data.id,
      p_content_set_id: set.data.id,
      p_set_position: 0,
    });
    const scheduled = await adminClient.rpc("admin_bulk_schedule_set", {
      p_set_id: set.data.id,
      p_base_opens_at: isoFromNow(5),
    });
    expect(scheduled.error?.message).toContain("daily_conflict");
  }, 60000);
});
