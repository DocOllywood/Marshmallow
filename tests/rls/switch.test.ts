import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { Database } from "@/lib/supabase/types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const password = "test-pass-switch-1";

const SWITCH_Q_ID = "31000000-0000-4000-8000-000000000004";

function requireEnv() {
  if (!url || !anonKey || !serviceKey) {
    throw new Error("Hosted Supabase env is required for switch tests");
  }
  return { url, anonKey, serviceKey };
}

describe("The Switch (hosted)", () => {
  let admin: SupabaseClient<Database>;
  let user: SupabaseClient<Database>;
  let userId = "";
  let yesId = "";
  let noId = "";
  const suffix = Date.now().toString(36);
  let entryId: string | null = null;

  beforeAll(async () => {
    const env = requireEnv();
    admin = createClient<Database>(env.url, env.serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: choices } = await admin
      .from("marshmallow_choices")
      .select("id, label, sort_order")
      .eq("marshmallow_id", SWITCH_Q_ID)
      .order("sort_order", { ascending: true });

    yesId = choices?.find((row) => row.label === "Yes")?.id ?? "";
    noId = choices?.find((row) => row.label === "No")?.id ?? "";
    if (!yesId || !noId) {
      throw new Error("switch question choices missing");
    }

    const created = await admin.auth.admin.createUser({
      email: `switch.${suffix}@marshmallow.test`,
      password,
      email_confirm: true,
      user_metadata: { username: `sw_${suffix.slice(0, 8)}` },
    });
    if (created.error || !created.data.user) {
      throw created.error ?? new Error("failed to create user");
    }
    userId = created.data.user.id;

    user = createClient<Database>(env.url, env.anonKey, {
      auth: { autoRefreshToken: false, persistSession: false, storageKey: "switch-user" },
    });
    const signed = await user.auth.signInWithPassword({
      email: `switch.${suffix}@marshmallow.test`,
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
    if (userId) await admin.auth.admin.deleteUser(userId);
  });

  it("seeds a switch prompt on today's forgiveness question", async () => {
    const { data, error } = await admin
      .from("marshmallows")
      .select("switch_prompt")
      .eq("id", SWITCH_Q_ID)
      .single();

    expect(error).toBeNull();
    expect(data?.switch_prompt).toBe("What if they only admitted it after being caught?");
  });

  it("stores switch behavior without changing the official own_choice_id", async () => {
    const { error: draftError } = await user.rpc("save_entry_draft", {
      p_marshmallow_id: SWITCH_Q_ID,
      p_own_choice_id: yesId,
    });
    expect(draftError).toBeNull();

    const { data: switched, error: switchError } = await user.rpc("save_switch_response", {
      p_marshmallow_id: SWITCH_Q_ID,
      p_switch_stayed: false,
    });
    expect(switchError).toBeNull();
    expect(switched?.own_choice_id).toBe(yesId);
    expect(switched?.switch_original_choice_id).toBe(yesId);
    expect(switched?.switch_stayed).toBe(false);
    entryId = switched?.id ?? null;

    const { error: sealError } = await user.rpc("seal_entry", {
      p_marshmallow_id: SWITCH_Q_ID,
      p_own_choice_id: yesId,
      p_allocations: [
        { choice_id: yesId, predicted_pct: 62 },
        { choice_id: noId, predicted_pct: 38 },
      ],
      p_idempotency_key: `switch-${suffix}`,
    });
    expect(sealError).toBeNull();

    const { data: sealed } = await admin
      .from("entries")
      .select("own_choice_id, switch_original_choice_id, switch_stayed, sealed_at")
      .eq("id", entryId!)
      .single();

    expect(sealed?.own_choice_id).toBe(yesId);
    expect(sealed?.switch_original_choice_id).toBe(yesId);
    expect(sealed?.switch_stayed).toBe(false);
    expect(sealed?.sealed_at).toBeTruthy();
  });

  it("blocks sealing with a different official answer after The Switch", async () => {
    const created = await admin.auth.admin.createUser({
      email: `switchb.${suffix}@marshmallow.test`,
      password,
      email_confirm: true,
      user_metadata: { username: `swb_${suffix.slice(0, 8)}` },
    });
    if (created.error || !created.data.user) {
      throw created.error ?? new Error("failed to create user b");
    }

    const userB = createClient<Database>(requireEnv().url, requireEnv().anonKey, {
      auth: { autoRefreshToken: false, persistSession: false, storageKey: "switch-b" },
    });
    await userB.auth.signInWithPassword({
      email: `switchb.${suffix}@marshmallow.test`,
      password,
    });

    await userB.rpc("save_entry_draft", {
      p_marshmallow_id: SWITCH_Q_ID,
      p_own_choice_id: yesId,
    });
    await userB.rpc("save_switch_response", {
      p_marshmallow_id: SWITCH_Q_ID,
      p_switch_stayed: true,
    });

    const { error } = await userB.rpc("seal_entry", {
      p_marshmallow_id: SWITCH_Q_ID,
      p_own_choice_id: noId,
      p_allocations: [
        { choice_id: yesId, predicted_pct: 40 },
        { choice_id: noId, predicted_pct: 60 },
      ],
    });

    expect(error).toBeTruthy();
    expect(error?.message).toContain("own_choice_protected");

    const { data: entry } = await admin
      .from("entries")
      .select("id")
      .eq("user_id", created.data.user.id)
      .eq("marshmallow_id", SWITCH_Q_ID)
      .maybeSingle();

    if (entry?.id) {
      await admin.from("entry_allocations").delete().eq("entry_id", entry.id);
      await admin.from("entries").delete().eq("id", entry.id);
    }
    await admin.auth.admin.deleteUser(created.data.user.id);
  });
});
