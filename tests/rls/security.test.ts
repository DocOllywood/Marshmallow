import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { Database } from "@/lib/supabase/types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const OPEN_ID = "10000000-0000-4000-8000-000000000001";
const ALEX_ID = "11000000-0000-4000-8000-000000000001";
const JORDAN_ID = "11000000-0000-4000-8000-000000000002";
const CLOSED_ID = "10000000-0000-4000-8000-000000000003";
const REVEALED_ID = "10000000-0000-4000-8000-000000000004";
const REALITY_TV_ID = "20000000-0000-4000-8000-000000000002";

const password = "test-pass-a1";

function requireEnv() {
  if (!url || !anonKey || !serviceKey) {
    throw new Error(
      "RLS tests need NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY",
    );
  }
  return { url, anonKey, serviceKey };
}

describe("two-user PostgREST isolation", () => {
  let admin: SupabaseClient<Database>;
  let userA: SupabaseClient<Database>;
  let userB: SupabaseClient<Database>;
  let userAId: string;
  let userBId: string;
  const suffix = Date.now().toString(36);

  beforeAll(async () => {
    const env = requireEnv();
    admin = createClient<Database>(env.url, env.serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const createdA = await admin.auth.admin.createUser({
      email: `usera.${suffix}@marshmallow.test`,
      password,
      email_confirm: true,
      user_metadata: { username: `usera_${suffix.slice(0, 8)}` },
    });
    const createdB = await admin.auth.admin.createUser({
      email: `userb.${suffix}@marshmallow.test`,
      password,
      email_confirm: true,
      user_metadata: { username: `userb_${suffix.slice(0, 8)}` },
    });

    if (createdA.error || !createdA.data.user) {
      throw createdA.error ?? new Error("failed to create user A");
    }
    if (createdB.error || !createdB.data.user) {
      throw createdB.error ?? new Error("failed to create user B");
    }

    userAId = createdA.data.user.id;
    userBId = createdB.data.user.id;

    userA = createClient<Database>(env.url, env.anonKey, {
      auth: { autoRefreshToken: false, persistSession: false, storageKey: "rls-a" },
    });
    userB = createClient<Database>(env.url, env.anonKey, {
      auth: { autoRefreshToken: false, persistSession: false, storageKey: "rls-b" },
    });

    const signedA = await userA.auth.signInWithPassword({
      email: `usera.${suffix}@marshmallow.test`,
      password,
    });
    const signedB = await userB.auth.signInWithPassword({
      email: `userb.${suffix}@marshmallow.test`,
      password,
    });
    if (signedA.error) throw signedA.error;
    if (signedB.error) throw signedB.error;

    const now = Date.now();
    await admin.from("marshmallow_results").delete().eq("marshmallow_id", CLOSED_ID);
    await admin.from("marshmallows").update({
      opens_at: new Date(now - 60 * 60_000).toISOString(),
      closes_at: new Date(now + 12 * 60 * 60_000).toISOString(),
      reveals_at: new Date(now + 18 * 60 * 60_000).toISOString(),
      status: "open",
    }).eq("id", OPEN_ID);
    await admin.from("marshmallows").update({
      opens_at: new Date(now - 2 * 24 * 60 * 60_000).toISOString(),
      closes_at: new Date(now - 2 * 60 * 60_000).toISOString(),
      reveals_at: new Date(now + 6 * 60 * 60_000).toISOString(),
      status: "closed",
    }).eq("id", CLOSED_ID);
  }, 30000);

  afterAll(async () => {
    if (!admin) return;
    if (userAId) await admin.auth.admin.deleteUser(userAId);
    if (userBId) await admin.auth.admin.deleteUser(userBId);
  });

  it("lets user A seal and keeps user B isolated from that prediction", async () => {
    const { data: sealed, error: sealError } = await userA.rpc("seal_entry", {
      p_marshmallow_id: OPEN_ID,
      p_own_choice_id: ALEX_ID,
      p_allocations: [
        { choice_id: ALEX_ID, predicted_pct: 64 },
        { choice_id: JORDAN_ID, predicted_pct: 36 },
      ],
      p_idempotency_key: `idem-${suffix}`,
    });
    expect(sealError).toBeNull();
    expect(sealed?.sealed_at).toBeTruthy();

    const { data: second } = await userA.rpc("seal_entry", {
      p_marshmallow_id: OPEN_ID,
      p_own_choice_id: JORDAN_ID,
      p_allocations: [
        { choice_id: ALEX_ID, predicted_pct: 10 },
        { choice_id: JORDAN_ID, predicted_pct: 90 },
      ],
    });
    expect(second?.own_choice_id).toBe(ALEX_ID);

    const { data: bEntries } = await userB.from("entries").select("*");
    expect(bEntries).toEqual([]);

    const { data: bAlloc } = await userB.from("entry_allocations").select("*");
    expect(bAlloc).toEqual([]);

    const { data: aEntries } = await userA.from("entries").select("*");
    expect(aEntries?.length).toBeGreaterThan(0);
  });

  it("blocks self-promotion and draft reads", async () => {
    const { error } = await userA
      .from("profiles")
      .update({ role: "admin" } as never)
      .eq("id", userAId);
    expect(error).toBeTruthy();

    const { data: profile } = await userA
      .from("profiles")
      .select("role")
      .eq("id", userAId)
      .single();
    expect(profile?.role).toBe("user");

    const { data: drafts } = await userA
      .from("marshmallows")
      .select("id")
      .eq("status", "draft");
    expect(drafts).toEqual([]);
  });

  it("does not leak closed or pre-reveal aggregates", async () => {
    const { data: closedResults } = await userA
      .from("marshmallow_results")
      .select("*")
      .eq("marshmallow_id", CLOSED_ID);
    expect(closedResults).toEqual([]);

    const { data: closedChoices } = await userA
      .from("marshmallow_result_choices")
      .select("*")
      .eq("marshmallow_id", CLOSED_ID);
    expect(closedChoices).toEqual([]);

    const { error: rpcError } = await userA.rpc("get_marshmallow_results", {
      p_marshmallow_id: CLOSED_ID,
    });
    expect(rpcError).toBeTruthy();

    const { data: embedded } = await userA
      .from("marshmallows")
      .select("id, marshmallow_results(*)")
      .eq("id", CLOSED_ID)
      .maybeSingle();
    expect(embedded?.marshmallow_results ?? null).toBeFalsy();
  });

  it("allows reading revealed results and not other users' scores", async () => {
    const { data: results, error } = await userA
      .from("marshmallow_results")
      .select("*")
      .eq("marshmallow_id", REVEALED_ID);
    expect(error).toBeNull();
    expect(results?.length).toBe(1);

    const { data: scores } = await userB.from("scores").select("*");
    expect(scores).toEqual([]);
  });

  it("keeps onboarding preferences isolated", async () => {
    const { error } = await userA.rpc("complete_onboarding", {
      p_topic_ids: [REALITY_TV_ID],
      p_display_name: "Player A",
    });
    expect(error).toBeNull();

    const { data: bPrefs } = await userB.from("user_topic_prefs").select("*");
    expect(bPrefs).toEqual([]);

    const { data: aPrefs } = await userA.from("user_topic_prefs").select("topic_id");
    expect(aPrefs?.map((row) => row.topic_id)).toContain(REALITY_TV_ID);
  });
});
