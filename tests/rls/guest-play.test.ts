import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { Database } from "@/lib/supabase/types";
import { ACTIVE_TOPIC_ID } from "./fixtures";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function requireEnv() {
  if (!url || !anonKey || !serviceKey) {
    throw new Error("Hosted Supabase env is required for guest play tests");
  }
  return { url, anonKey, serviceKey };
}

describe("anonymous guest play (hosted)", () => {
  let admin: SupabaseClient<Database>;
  let guestA: SupabaseClient<Database>;
  let guestB: SupabaseClient<Database>;
  let guestAId = "";
  let guestBId = "";
  let anonymousEnabled = false;
  const suffix = Date.now().toString(36);

  beforeAll(async () => {
    const env = requireEnv();
    admin = createClient<Database>(env.url, env.serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    guestA = createClient<Database>(env.url, env.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false, storageKey: "guest-a" },
    });
    guestB = createClient<Database>(env.url, env.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false, storageKey: "guest-b" },
    });

    const probe = await guestA.auth.signInAnonymously();
    if (probe.error) {
      if (probe.error.message.toLowerCase().includes("anonymous")) {
        anonymousEnabled = false;
        return;
      }
      throw probe.error;
    }
    anonymousEnabled = true;
    guestAId = probe.data.user?.id ?? "";
    await guestA.auth.signOut();
  }, 40000);

  afterAll(async () => {
    if (!admin) return;
    if (guestAId) await admin.auth.admin.deleteUser(guestAId);
    if (guestBId) await admin.auth.admin.deleteUser(guestBId);
  });

  it("requires anonymous sign-ins enabled on hosted Supabase", () => {
    expect(anonymousEnabled).toBe(true);
  });

  it("creates anonymous session and profile via handle_new_user", async () => {
    if (!anonymousEnabled) return;

    const signed = await guestA.auth.signInAnonymously();
    expect(signed.error).toBeNull();
    guestAId = signed.data.user?.id ?? "";
    expect(signed.data.user?.is_anonymous).toBe(true);

    const { data: profile, error } = await guestA
      .from("profiles")
      .select("id, username, display_name, onboarding_completed_at")
      .eq("id", guestAId)
      .single();
    expect(error).toBeNull();
    expect(profile?.username).toMatch(/^u[a-f0-9]{12}$/);
    expect(profile?.onboarding_completed_at).toBeNull();
  });

  it("completes onboarding, seals entry, and tracks product events", async () => {
    if (!anonymousEnabled || !guestAId) return;

    const onboard = await guestA.rpc("complete_onboarding", {
      p_topic_ids: [ACTIVE_TOPIC_ID],
      p_display_name: `Guest ${suffix.slice(0, 6)}`,
    });
    expect(onboard.error).toBeNull();
    expect(onboard.data?.onboarding_completed_at).toBeTruthy();

    const { error: eventError } = await guestA.rpc("track_product_event", {
      p_event_type: "home_viewed",
      p_payload: { guest: true },
    });
    expect(eventError).toBeNull();
  });

  it("restores the same session on refresh (same storage key)", async () => {
    if (!anonymousEnabled || !guestAId) return;

    const {
      data: { session },
    } = await guestA.auth.getSession();
    expect(session?.user.id).toBe(guestAId);

    const refreshed = await guestA.auth.refreshSession();
    expect(refreshed.error).toBeNull();
    expect(refreshed.data.user?.id).toBe(guestAId);
  });

  it("keeps guest B isolated from guest A entries", async () => {
    if (!anonymousEnabled) return;

    const signedB = await guestB.auth.signInAnonymously();
    expect(signedB.error).toBeNull();
    guestBId = signedB.data.user?.id ?? "";
    expect(guestBId).not.toBe(guestAId);

    const { data: bEntries } = await guestB.from("entries").select("*");
    expect(bEntries).toEqual([]);

    const { data: aEntries } = await guestA.from("entries").select("*");
    expect(aEntries?.every((row) => row.user_id === guestAId)).toBe(true);
  });

  it("does not affect existing email/password users", async () => {
    if (!anonymousEnabled) return;

    const password = "test-pass-guest-email-1";
    const created = await admin.auth.admin.createUser({
      email: `guestcheck.${suffix}@marshmallow.test`,
      password,
      email_confirm: true,
      user_metadata: { username: `gchk_${suffix.slice(0, 8)}` },
    });
    expect(created.error).toBeNull();
    const emailUserId = created.data.user?.id ?? "";

    const emailClient = createClient<Database>(url!, anonKey!, {
      auth: { persistSession: false, autoRefreshToken: false, storageKey: "guest-email" },
    });
    const signed = await emailClient.auth.signInWithPassword({
      email: `guestcheck.${suffix}@marshmallow.test`,
      password,
    });
    expect(signed.error).toBeNull();

    const { data: profile } = await emailClient
      .from("profiles")
      .select("id, username")
      .eq("id", emailUserId)
      .single();
    expect(profile?.id).toBe(emailUserId);

    await admin.auth.admin.deleteUser(emailUserId);
  });
});
