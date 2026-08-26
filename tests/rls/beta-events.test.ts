import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { Database } from "@/lib/supabase/types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const password = "test-pass-beta-events-1";

const PART13_ROUND_ID = "40000000-0000-4000-8000-000000000004";
const PART13_Q1_ID = "31000000-0000-4000-8000-000000000010";

const REQUIRED_EVENTS = [
  "daily_started",
  "daily_completed",
  "todays_read_viewed",
  "daily_reveal_opened",
  "gap_viewed",
] as const;

function requireEnv() {
  if (!url || !anonKey || !serviceKey) {
    throw new Error("Hosted Supabase env is required for beta event tests");
  }
  return { url, anonKey, serviceKey };
}

describe("Beta daily product events (hosted)", () => {
  let user: SupabaseClient<Database>;
  let admin: SupabaseClient<Database>;
  let userId = "";
  const suffix = Date.now().toString(36);

  beforeAll(async () => {
    const env = requireEnv();
    admin = createClient<Database>(env.url, env.serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const created = await admin.auth.admin.createUser({
      email: `betaev.${suffix}@marshmallow.test`,
      password,
      email_confirm: true,
      user_metadata: { username: `bev_${suffix.slice(0, 8)}` },
    });
    if (created.error || !created.data.user) {
      throw created.error ?? new Error("failed to create user");
    }
    userId = created.data.user.id;

    user = createClient<Database>(env.url, env.anonKey, {
      auth: { autoRefreshToken: false, persistSession: false, storageKey: "beta-events" },
    });
    const signed = await user.auth.signInWithPassword({
      email: `betaev.${suffix}@marshmallow.test`,
      password,
    });
    if (signed.error) throw signed.error;
  }, 40000);

  afterAll(async () => {
    if (!admin) return;
    if (userId) {
      await admin.from("product_events").delete().eq("user_id", userId);
      await admin.auth.admin.deleteUser(userId);
    }
  });

  for (const eventType of REQUIRED_EVENTS) {
    it(`accepts ${eventType} on hosted Supabase`, async () => {
      const { error } = await user.rpc("track_product_event", {
        p_event_type: eventType,
        p_payload: { test: true, round_id: PART13_ROUND_ID },
        p_marshmallow_id: PART13_Q1_ID,
      });
      expect(error).toBeNull();

      const { data, error: readError } = await admin
        .from("product_events")
        .select("event_type, user_id, marshmallow_id, payload")
        .eq("user_id", userId)
        .eq("event_type", eventType)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      expect(readError).toBeNull();
      expect(data?.event_type).toBe(eventType);
      expect(data?.user_id).toBe(userId);
      expect(data?.marshmallow_id).toBe(PART13_Q1_ID);
      expect((data?.payload as { test?: boolean })?.test).toBe(true);
    });
  }

  it("rejects unknown event types", async () => {
    const { error } = await user.rpc("track_product_event", {
      p_event_type: "not_a_real_event",
      p_payload: {},
    });
    expect(error).toBeTruthy();
    expect(error?.message).toMatch(/invalid/i);
  });
});
