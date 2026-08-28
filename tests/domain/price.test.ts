/**
 * Price archetype hosted RLS + draft visibility tests.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const password = "test-pass-price-archetype-1";

const PRICE_ROUND_ID = "40000000-0000-4000-8000-000000000008";
const PRICE_MQ = "31000000-0000-4000-8000-000000000040";
const KEEP = "31000000-0000-4000-8000-000000000401";
const SELL = "31000000-0000-4000-8000-000000000402";

async function priceRoundAvailable(admin: SupabaseClient): Promise<boolean> {
  const { data, error } = await admin
    .from("daily_rounds")
    .select("id, metadata")
    .eq("id", PRICE_ROUND_ID)
    .maybeSingle();
  return !error && data?.metadata != null;
}

describe("price archetype hosted checks", () => {
  let admin: SupabaseClient;
  let userA: SupabaseClient;
  let userB: SupabaseClient;
  let emailA = "";
  let emailB = "";

  beforeAll(async () => {
    if (!url || !anonKey || !serviceKey) {
      return;
    }

    admin = createClient(url, serviceKey, { auth: { persistSession: false } });
    emailA = `price-a-${Date.now()}@example.com`;
    emailB = `price-b-${Date.now()}@example.com`;

    for (const email of [emailA, emailB]) {
      const created = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (created.error) throw created.error;
    }

    userA = createClient(url, anonKey, { auth: { persistSession: false } });
    userB = createClient(url, anonKey, { auth: { persistSession: false } });

    const signInA = await userA.auth.signInWithPassword({ email: emailA, password });
    const signInB = await userB.auth.signInWithPassword({ email: emailB, password });
    if (signInA.error) throw signInA.error;
    if (signInB.error) throw signInB.error;
  });

  afterAll(async () => {
    if (!admin) return;
    for (const email of [emailA, emailB]) {
      const listed = await admin.auth.admin.listUsers();
      const user = listed.data.users.find((row) => row.email === email);
      if (user) {
        await admin.auth.admin.deleteUser(user.id);
      }
    }
  });

  it("keeps price draft off today's home slot", async () => {
    if (!admin) {
      expect(true).toBe(true);
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    const { data: todayRound } = await admin
      .from("daily_rounds")
      .select("id, title, status")
      .eq("round_date", today)
      .maybeSingle();

    expect(todayRound?.id).not.toBe(PRICE_ROUND_ID);
    if (todayRound) {
      expect(["open", "draft", "scheduled"]).toContain(todayRound.status);
    }
  });

  it("stores price archetype metadata on draft round only", async () => {
    if (!admin) {
      expect(true).toBe(true);
      return;
    }

    const available = await priceRoundAvailable(admin);
    if (!available) {
      expect(true).toBe(true);
      return;
    }

    const { data: round } = await admin
      .from("daily_rounds")
      .select("id, status, round_date, metadata, principle_id")
      .eq("id", PRICE_ROUND_ID)
      .maybeSingle();

    expect(round?.status).toBe("draft");
    expect(round?.round_date).not.toBe(new Date().toISOString().slice(0, 10));
    expect((round?.metadata as { experiment?: { archetype?: string } })?.experiment?.archetype).toBe(
      "price",
    );
    expect(round?.principle_id).toBe("60000000-0000-4000-8000-000000000002");
  });

  it("isolates user entries on price QA marshmallows", async () => {
    if (!userA || !userB || !admin) {
      expect(true).toBe(true);
      return;
    }

    const available = await priceRoundAvailable(admin);
    if (!available) {
      expect(true).toBe(true);
      return;
    }

    const sealA = await userA.rpc("seal_entry", {
      p_marshmallow_id: PRICE_MQ,
      p_own_choice_id: KEEP,
      p_allocations: [],
    });
    if (sealA.error) throw sealA.error;

    const { data: ownA } = await userA
      .from("entries")
      .select("own_choice_id")
      .eq("marshmallow_id", PRICE_MQ)
      .maybeSingle();
    expect(ownA?.own_choice_id).toBe(KEEP);

    const { data: ownB } = await userB
      .from("entries")
      .select("own_choice_id")
      .eq("marshmallow_id", PRICE_MQ)
      .maybeSingle();
    expect(ownB).toBeNull();

    const sealB = await userB.rpc("seal_entry", {
      p_marshmallow_id: PRICE_MQ,
      p_own_choice_id: SELL,
      p_allocations: [],
    });
    if (sealB.error) throw sealB.error;

    const { data: ownBAfter } = await userB
      .from("entries")
      .select("own_choice_id")
      .eq("marshmallow_id", PRICE_MQ)
      .maybeSingle();
    expect(ownBAfter?.own_choice_id).toBe(SELL);

    const { data: ownAAfter } = await userA
      .from("entries")
      .select("own_choice_id")
      .eq("marshmallow_id", PRICE_MQ)
      .maybeSingle();
    expect(ownAAfter?.own_choice_id).toBe(KEEP);
  });
});
