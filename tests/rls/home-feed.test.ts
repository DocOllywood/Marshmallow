import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { Database } from "@/lib/supabase/types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const password = "test-pass-a1";

function requireEnv() {
  if (!url || !anonKey || !serviceKey) {
    throw new Error(
      "Home feed tests need NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY",
    );
  }
  return { url, anonKey, serviceKey };
}

describe("home feed queries", () => {
  let admin: SupabaseClient<Database>;
  let user: SupabaseClient<Database>;
  let userId: string;
  const suffix = Date.now().toString(36);

  beforeAll(async () => {
    const env = requireEnv();
    admin = createClient<Database>(env.url, env.serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    user = createClient<Database>(env.url, env.anonKey, {
      auth: { autoRefreshToken: false, persistSession: false, storageKey: "home-feed" },
    });

    const created = await admin.auth.admin.createUser({
      email: `homefeed.${suffix}@marshmallow.test`,
      password,
      email_confirm: true,
      user_metadata: { username: `homefeed_${suffix.slice(0, 8)}` },
    });
    if (created.error || !created.data.user) {
      throw created.error ?? new Error("failed to create home feed test user");
    }
    userId = created.data.user.id;

    await admin
      .from("profiles")
      .update({ onboarding_completed_at: new Date().toISOString() })
      .eq("id", userId);

    const signed = await user.auth.signInWithPassword({
      email: `homefeed.${suffix}@marshmallow.test`,
      password,
    });
    if (signed.error) throw signed.error;
  });

  afterAll(async () => {
    if (userId) {
      await admin.auth.admin.deleteUser(userId);
    }
  });

  it("loads home follow-up queries without oversized IN filters", async () => {
    const marshmallows = await user
      .from("marshmallows")
      .select(
        "id, question, topic_id, daily_round_id, opens_at, closes_at, reveals_at, hard_reveals_at, status, is_daily, play_mode, quick_priority, entity_label, spoiler_context, image_url, expires_at, marshmallow_choices(id, label)",
      )
      .in("status", ["open", "closed", "revealed", "cancelled"])
      .order("reveals_at", { ascending: false });

    expect(marshmallows.error).toBeNull();
    expect((marshmallows.data ?? []).length).toBeGreaterThan(0);

    const [entries, opens, scores] = await Promise.all([
      user
        .from("entries")
        .select(
          "marshmallow_id, sealed_at, own_choice_id, entry_allocations(choice_id, predicted_pct)",
        ),
      user.from("reveal_opens").select("marshmallow_id, opened_at"),
      user.from("scores").select("marshmallow_id, accuracy"),
    ]);

    expect(entries.error).toBeNull();
    expect(opens.error).toBeNull();
    expect(scores.error).toBeNull();

    const payload = JSON.stringify({
      cards: (marshmallows.data ?? []).slice(0, 20),
      entries: entries.data,
      opens: opens.data,
      scores: scores.data,
    });
    expect(payload.includes("vote_pct")).toBe(false);
    expect(payload.includes("vote_count")).toBe(false);
    expect(payload.includes("total_sealed_votes")).toBe(false);
  });
});
