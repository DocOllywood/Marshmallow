import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { Database } from "@/lib/supabase/types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const password = "test-pass-line-1";

function requireEnv() {
  if (!url || !anonKey || !serviceKey) {
    throw new Error("Hosted Supabase env is required for line tests");
  }
  return { url, anonKey, serviceKey };
}

function isoFromNow(minutes: number): string {
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

describe("The Line (hosted)", () => {
  let admin: SupabaseClient<Database>;
  let user: SupabaseClient<Database>;
  let userId = "";
  let lineMarshmallowId = "";
  let monthId = "";
  let immediatelyId = "";
  let weekId = "";
  let monthChoiceId = "";
  let yearId = "";
  let neverId = "";
  const suffix = Date.now().toString(36);
  let entryId: string | null = null;

  beforeAll(async () => {
    const env = requireEnv();
    admin = createClient<Database>(env.url, env.serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    lineMarshmallowId = `32000000-0000-4000-8000-${suffix.replace(/[^0-9a-f]/gi, "0").padEnd(12, "0").slice(0, 12)}`;
    immediatelyId = `${lineMarshmallowId.slice(0, 24)}000000000001`;
    weekId = `${lineMarshmallowId.slice(0, 24)}000000000002`;
    monthChoiceId = `${lineMarshmallowId.slice(0, 24)}000000000003`;
    yearId = `${lineMarshmallowId.slice(0, 24)}000000000004`;
    neverId = `${lineMarshmallowId.slice(0, 24)}000000000005`;

    const { error: insertError } = await admin.from("marshmallows").insert({
      id: lineMarshmallowId,
      question:
        "How long could your closest friend hide a major secret before you'd consider it a betrayal?",
      opens_at: isoFromNow(-60),
      closes_at: isoFromNow(12 * 60),
      reveals_at: isoFromNow(18 * 60),
      hard_reveals_at: isoFromNow(18 * 60),
      status: "draft",
      is_daily: false,
      play_mode: "quick",
      is_line: true,
      minimum_result_sample: 0,
    });
    if (insertError) throw insertError;

    const { error: choiceError } = await admin.from("marshmallow_choices").insert([
      { id: immediatelyId, marshmallow_id: lineMarshmallowId, label: "Immediately", sort_order: 0 },
      { id: weekId, marshmallow_id: lineMarshmallowId, label: "A week", sort_order: 1 },
      { id: monthChoiceId, marshmallow_id: lineMarshmallowId, label: "A month", sort_order: 2 },
      { id: yearId, marshmallow_id: lineMarshmallowId, label: "A year", sort_order: 3 },
      { id: neverId, marshmallow_id: lineMarshmallowId, label: "Never", sort_order: 4 },
    ]);
    if (choiceError) throw choiceError;

    const { error: openError } = await admin
      .from("marshmallows")
      .update({ status: "open" })
      .eq("id", lineMarshmallowId);
    if (openError) throw openError;

    monthId = monthChoiceId;

    const created = await admin.auth.admin.createUser({
      email: `line.${suffix}@marshmallow.test`,
      password,
      email_confirm: true,
      user_metadata: { username: `ln_${suffix.slice(0, 8)}` },
    });
    if (created.error || !created.data.user) {
      throw created.error ?? new Error("failed to create user");
    }
    userId = created.data.user.id;

    user = createClient<Database>(env.url, env.anonKey, {
      auth: { autoRefreshToken: false, persistSession: false, storageKey: "line-user" },
    });
    const signed = await user.auth.signInWithPassword({
      email: `line.${suffix}@marshmallow.test`,
      password,
    });
    if (signed.error) throw signed.error;
  }, 40000);

  afterAll(async () => {
    if (!admin) return;
    if (entryId) {
      await admin.from("entry_allocations").delete().eq("entry_id", entryId);
      await admin.from("entries").delete().eq("id", entryId);
    }
    if (lineMarshmallowId) {
      await admin.from("marshmallow_choices").delete().eq("marshmallow_id", lineMarshmallowId);
      await admin.from("marshmallows").delete().eq("id", lineMarshmallowId);
    }
    if (userId) await admin.auth.admin.deleteUser(userId);
  });

  it("seals a threshold without prediction allocations or scores", async () => {
    const { data: sealed, error } = await user.rpc("seal_line_entry", {
      p_marshmallow_id: lineMarshmallowId,
      p_own_choice_id: monthId,
      p_idempotency_key: `line-${suffix}`,
    });

    expect(error).toBeNull();
    expect(sealed?.own_choice_id).toBe(monthId);
    expect(sealed?.sealed_at).toBeTruthy();
    entryId = sealed?.id ?? null;

    const { data: allocations } = await admin
      .from("entry_allocations")
      .select("id")
      .eq("entry_id", entryId!);
    expect(allocations ?? []).toHaveLength(0);

    const { data: score } = await admin
      .from("scores")
      .select("id")
      .eq("user_id", userId)
      .eq("marshmallow_id", lineMarshmallowId)
      .maybeSingle();
    expect(score).toBeNull();
  });

  it("rejects standard seal_entry on line questions", async () => {
    const created = await admin.auth.admin.createUser({
      email: `lineb.${suffix}@marshmallow.test`,
      password,
      email_confirm: true,
      user_metadata: { username: `lnb_${suffix.slice(0, 8)}` },
    });
    if (created.error || !created.data.user) {
      throw created.error ?? new Error("failed to create user b");
    }

    const userB = createClient<Database>(requireEnv().url, requireEnv().anonKey, {
      auth: { autoRefreshToken: false, persistSession: false, storageKey: "line-b" },
    });
    await userB.auth.signInWithPassword({
      email: `lineb.${suffix}@marshmallow.test`,
      password,
    });

    const { error } = await userB.rpc("seal_entry", {
      p_marshmallow_id: lineMarshmallowId,
      p_own_choice_id: immediatelyId,
      p_allocations: [
        { choice_id: immediatelyId, predicted_pct: 20 },
        { choice_id: weekId, predicted_pct: 20 },
        { choice_id: monthChoiceId, predicted_pct: 20 },
        { choice_id: yearId, predicted_pct: 20 },
        { choice_id: neverId, predicted_pct: 20 },
      ],
    });

    expect(error).toBeTruthy();
    expect(error?.message).toContain("not_a_line_question");

    await admin.auth.admin.deleteUser(created.data.user.id);
  });
});
