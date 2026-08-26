import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { Database } from "@/lib/supabase/types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const password = "test-pass-human-tensions-1";

const HONESTY_KINDNESS_ID = "50000000-0000-4000-8000-000000000001";

function requireEnv() {
  if (!url || !anonKey || !serviceKey) {
    throw new Error("Hosted Supabase env is required for human tension tests");
  }
  return { url, anonKey, serviceKey };
}

describe("Human tensions (hosted)", () => {
  let admin: SupabaseClient<Database>;
  let user: SupabaseClient<Database>;
  let userId = "";
  const suffix = Date.now().toString(36);

  beforeAll(async () => {
    const env = requireEnv();
    admin = createClient<Database>(env.url, env.serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const created = await admin.auth.admin.createUser({
      email: `humantension.${suffix}@marshmallow.test`,
      password,
      email_confirm: true,
      user_metadata: { username: `ht_${suffix.slice(0, 8)}` },
    });
    if (created.error || !created.data.user) {
      throw created.error ?? new Error("failed to create user");
    }
    userId = created.data.user.id;

    user = createClient<Database>(env.url, env.anonKey, {
      auth: { autoRefreshToken: false, persistSession: false, storageKey: "human-tension" },
    });
    const signed = await user.auth.signInWithPassword({
      email: `humantension.${suffix}@marshmallow.test`,
      password,
    });
    if (signed.error) throw signed.error;
  }, 40000);

  afterAll(async () => {
    if (!admin) return;
    if (userId) await admin.auth.admin.deleteUser(userId);
  });

  it("lets authenticated users read active human_tensions", async () => {
    const { data, error } = await user
      .from("human_tensions")
      .select("slug, display_label")
      .eq("id", HONESTY_KINDNESS_ID)
      .maybeSingle();

    expect(error).toBeNull();
    expect(data?.slug).toBe("honesty-kindness");
    expect(data?.display_label).toBe("HONESTY vs. KINDNESS");
  });

  it("blocks ordinary users from mutating human_tensions", async () => {
    const { error: insertError } = await user.from("human_tensions").insert({
      slug: "blocked",
      left_label: "A",
      right_label: "B",
      display_label: "A vs. B",
    });
    expect(insertError).toBeTruthy();

    const { data: updateRows } = await user
      .from("human_tensions")
      .update({ display_label: "Hacked" })
      .eq("id", HONESTY_KINDNESS_ID)
      .select("display_label");
    expect(updateRows ?? []).toHaveLength(0);
  });
});
