import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { Database } from "@/lib/supabase/types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const password = "test-pass-daily-rounds-1";

const TODAY_ROUND_ID = "40000000-0000-4000-8000-000000000001";
const TODAY_Q1_ID = "31000000-0000-4000-8000-000000000001";
const LEGACY_DAILY_ID = "30000000-0000-4000-8000-0000000000d1";
const REVEALED_ID = "10000000-0000-4000-8000-000000000004";

function requireEnv() {
  if (!url || !anonKey || !serviceKey) {
    throw new Error("Hosted Supabase env is required for daily round tests");
  }
  return { url, anonKey, serviceKey };
}

function utcToday(): string {
  return new Date().toISOString().slice(0, 10);
}

describe("Daily Rounds (hosted)", () => {
  let admin: SupabaseClient<Database>;
  let user: SupabaseClient<Database>;
  let userId = "";
  const suffix = Date.now().toString(36);
  let sealedEntryId: string | null = null;
  let historySealedCount = 0;
  let historyScoreCount = 0;

  beforeAll(async () => {
    const env = requireEnv();
    admin = createClient<Database>(env.url, env.serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const [{ count: sealedBefore }, { count: scoresBefore }] = await Promise.all([
      admin
        .from("entries")
        .select("*", { count: "exact", head: true })
        .not("sealed_at", "is", null),
      admin.from("scores").select("*", { count: "exact", head: true }),
    ]);
    historySealedCount = sealedBefore ?? 0;
    historyScoreCount = scoresBefore ?? 0;

    const created = await admin.auth.admin.createUser({
      email: `dailyround.${suffix}@marshmallow.test`,
      password,
      email_confirm: true,
      user_metadata: { username: `dr_${suffix.slice(0, 8)}` },
    });
    if (created.error || !created.data.user) {
      throw created.error ?? new Error("failed to create user");
    }
    userId = created.data.user.id;

    user = createClient<Database>(env.url, env.anonKey, {
      auth: { autoRefreshToken: false, persistSession: false, storageKey: "daily-round" },
    });
    const signed = await user.auth.signInWithPassword({
      email: `dailyround.${suffix}@marshmallow.test`,
      password,
    });
    if (signed.error) throw signed.error;
  }, 40000);

  afterAll(async () => {
    if (!admin) return;
    if (sealedEntryId) {
      await admin.from("entry_allocations").delete().eq("entry_id", sealedEntryId);
      await admin.from("entries").delete().eq("id", sealedEntryId);
    }
    if (userId) await admin.auth.admin.deleteUser(userId);
  });

  it("lets authenticated users read active daily_rounds", async () => {
    const { data, error } = await user
      .from("daily_rounds")
      .select("id, round_date, title, status")
      .eq("round_date", utcToday())
      .maybeSingle();

    expect(error).toBeNull();
    expect(data?.id).toBe(TODAY_ROUND_ID);
    expect(data?.status).toBe("open");
    expect(data?.title).toBe("Can love survive complete honesty?");
  });

  it("blocks ordinary users from mutating daily_rounds", async () => {
    const { error: insertError } = await user.from("daily_rounds").insert({
      round_date: "2099-01-01",
      title: "Blocked",
      status: "draft",
    });
    expect(insertError).toBeTruthy();

    const { data: updateRows, error: updateError } = await user
      .from("daily_rounds")
      .update({ title: "Hacked" })
      .eq("id", TODAY_ROUND_ID)
      .select("title");
    expect(updateError).toBeNull();
    expect(updateRows ?? []).toHaveLength(0);

    const { data: roundAfterUpdate } = await user
      .from("daily_rounds")
      .select("title")
      .eq("id", TODAY_ROUND_ID)
      .single();
    expect(roundAfterUpdate?.title).toBe("Can love survive complete honesty?");

    const { data: deleteRows, error: deleteError } = await user
      .from("daily_rounds")
      .delete()
      .eq("id", TODAY_ROUND_ID)
      .select("id");
    expect(deleteError).toBeNull();
    expect(deleteRows ?? []).toHaveLength(0);
  });

  it("seeds today's round with exactly five ordered questions", async () => {
    const { data, error } = await admin
      .from("marshmallows")
      .select("id, round_position, status")
      .eq("daily_round_id", TODAY_ROUND_ID)
      .order("round_position", { ascending: true });

    expect(error).toBeNull();
    expect(data).toHaveLength(5);
    expect(data?.map((row) => row.round_position)).toEqual([1, 2, 3, 4, 5]);
    expect(data?.every((row) => row.status === "open")).toBe(true);
  });

  it("enforces one round per UTC round_date", async () => {
    const { error } = await admin.from("daily_rounds").insert({
      id: "40000000-0000-4000-8000-000000000099",
      round_date: utcToday(),
      title: "Duplicate day",
      status: "draft",
    });
    expect(error).toBeTruthy();
    expect(error?.message.toLowerCase()).toMatch(/duplicate|unique|violates/);
  });

  it("seals daily round questions through seal_entry", async () => {
    const { data: choices, error: choiceError } = await user
      .from("marshmallow_choices")
      .select("id, sort_order")
      .eq("marshmallow_id", TODAY_Q1_ID)
      .order("sort_order", { ascending: true });

    expect(choiceError).toBeNull();
    expect(choices?.length).toBe(2);

    const [choiceA, choiceB] = choices ?? [];
    const { data: sealed, error: sealError } = await user.rpc("seal_entry", {
      p_marshmallow_id: TODAY_Q1_ID,
      p_own_choice_id: choiceA!.id,
      p_allocations: [
        { choice_id: choiceA!.id, predicted_pct: 58 },
        { choice_id: choiceB!.id, predicted_pct: 42 },
      ],
      p_idempotency_key: `daily-round-${suffix}`,
    });

    expect(sealError).toBeNull();
    expect(sealed?.sealed_at).toBeTruthy();
    sealedEntryId = sealed?.id ?? null;
  });

  it("does not expose results before legitimate reveal", async () => {
    const { data: tableResults } = await user
      .from("marshmallow_results")
      .select("*")
      .eq("marshmallow_id", TODAY_Q1_ID);
    expect(tableResults).toEqual([]);

    const { error: rpcError } = await user.rpc("get_marshmallow_results", {
      p_marshmallow_id: TODAY_Q1_ID,
    });
    expect(rpcError).toBeTruthy();

    const { data: revealedResults, error: revealedError } = await user
      .from("marshmallow_results")
      .select("*")
      .eq("marshmallow_id", REVEALED_ID);
    expect(revealedError).toBeNull();
    expect(revealedResults?.length).toBe(1);
  });

  it("preserves historical sealed entries and scores", async () => {
    const [{ count: sealedAfter }, { count: scoresAfter }] = await Promise.all([
      admin
        .from("entries")
        .select("*", { count: "exact", head: true })
        .not("sealed_at", "is", null),
      admin.from("scores").select("*", { count: "exact", head: true }),
    ]);

    expect(sealedAfter).toBeGreaterThanOrEqual(historySealedCount);
    expect(scoresAfter).toBeGreaterThanOrEqual(historyScoreCount);

    const { data: legacy } = await admin
      .from("marshmallows")
      .select("id, status, expires_at")
      .eq("id", LEGACY_DAILY_ID)
      .maybeSingle();
    expect(legacy?.id).toBe(LEGACY_DAILY_ID);
  });
});
