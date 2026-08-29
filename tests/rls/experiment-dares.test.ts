/**
 * Experiment dares hosted RLS, privacy, and end-to-end QA.
 * Uses Price QA round 008 — never Day 1 (009).
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { LAUNCH_MONEY_DAILY_ROUND_ID } from "@/domain/content/launch-money-daily";
import type { Database } from "@/lib/supabase/types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const password = "test-pass-experiment-dares-1";

/** Price archetype QA round — draft, playable, not Day 1. */
const DARE_QA_ROUND_ID = "40000000-0000-4000-8000-000000000008";
const MQ = [
  "31000000-0000-4000-8000-000000000040",
  "31000000-0000-4000-8000-000000000041",
  "31000000-0000-4000-8000-000000000042",
  "31000000-0000-4000-8000-000000000043",
  "31000000-0000-4000-8000-000000000044",
] as const;
const KEEP = [
  "31000000-0000-4000-8000-000000000401",
  "31000000-0000-4000-8000-000000000411",
  "31000000-0000-4000-8000-000000000421",
] as const;
const FLIP_YES = "31000000-0000-4000-8000-000000000432";
const FLIP_NO = "31000000-0000-4000-8000-000000000431";
const LINE_CHOICE = "31000000-0000-4000-8000-000000000441";

const SENSITIVE_PUBLIC_KEYS = [
  "sender_choices",
  "recipient_choices",
  "choice_label",
  "choice_id",
  "own_choice",
  "tension_side",
  "predicted_pct",
  "line",
  "movement",
  "crowd",
  "vote_pct",
  "round_title",
] as const;

function requireEnv() {
  if (!url || !anonKey || !serviceKey) {
    throw new Error("Hosted Supabase env is required for experiment dare tests");
  }
  return { url, anonKey, serviceKey };
}

async function assertMigrationApplied(admin: SupabaseClient<Database>) {
  const { error } = await admin.rpc("get_public_dare", {
    p_token: "00000000000000000000000000000000",
  });
  if (error?.message.includes("Could not find the function")) {
    throw new Error("experiment_dares migration not applied on hosted");
  }
}

async function completePriceRound(client: SupabaseClient<Database>, lineChoice = LINE_CHOICE) {
  for (let i = 0; i < 3; i++) {
    const sealed = await client.rpc("seal_entry", {
      p_marshmallow_id: MQ[i]!,
      p_own_choice_id: KEEP[i]!,
      p_allocations: [],
    });
    if (sealed.error) throw sealed.error;
  }
  const flip = await client.rpc("seal_entry", {
    p_marshmallow_id: MQ[3]!,
    p_own_choice_id: FLIP_YES,
    p_allocations: [
      { choice_id: FLIP_YES, predicted_pct: 55 },
      { choice_id: FLIP_NO, predicted_pct: 45 },
    ],
  });
  if (flip.error) throw flip.error;
  const line = await client.rpc("seal_line_entry", {
    p_marshmallow_id: MQ[4]!,
    p_own_choice_id: lineChoice,
  });
  if (line.error) throw line.error;
}

function assertPublicPayloadBlind(payload: Record<string, unknown>) {
  const serialized = JSON.stringify(payload).toLowerCase();
  for (const key of SENSITIVE_PUBLIC_KEYS) {
    expect(payload).not.toHaveProperty(key);
    expect(serialized).not.toContain(key);
  }
  expect(serialized).not.toMatch(/keep it|sell it|\$1,000|would you sell/i);
  expect(payload.invitation_label ?? payload.round_title).toBe("A Marshmallow experiment");
}

describe("experiment dares hosted matrix", () => {
  let admin: SupabaseClient<Database>;
  let sender: SupabaseClient<Database>;
  let recipientA: SupabaseClient<Database>;
  let recipientB: SupabaseClient<Database>;
  let unrelated: SupabaseClient<Database>;
  let senderId = "";
  let recipientAId = "";
  let dareToken = "";
  let dareId = "";
  const suffix = Date.now().toString(36);
  const createdUserIds: string[] = [];
  const createdDareIds: string[] = [];

  beforeAll(async () => {
    const env = requireEnv();
    admin = createClient<Database>(env.url, env.serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    await assertMigrationApplied(admin);

    const emails = {
      sender: `dare-sender.${suffix}@marshmallow.test`,
      recipientA: `dare-rec-a.${suffix}@marshmallow.test`,
      recipientB: `dare-rec-b.${suffix}@marshmallow.test`,
      unrelated: `dare-unrel.${suffix}@marshmallow.test`,
    };

    for (const [role, email] of Object.entries(emails)) {
      const created = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { username: `dare_${role}_${suffix.slice(0, 6)}` },
      });
      if (created.error || !created.data.user) {
        throw created.error ?? new Error(`create ${role}`);
      }
      createdUserIds.push(created.data.user.id);
      if (role === "sender") senderId = created.data.user.id;
      if (role === "recipientA") recipientAId = created.data.user.id;
    }

    sender = createClient<Database>(env.url, env.anonKey, {
      auth: { persistSession: false, storageKey: "dare-sender" },
    });
    recipientA = createClient<Database>(env.url, env.anonKey, {
      auth: { persistSession: false, storageKey: "dare-rec-a" },
    });
    recipientB = createClient<Database>(env.url, env.anonKey, {
      auth: { persistSession: false, storageKey: "dare-rec-b" },
    });
    unrelated = createClient<Database>(env.url, env.anonKey, {
      auth: { persistSession: false, storageKey: "dare-unrel" },
    });

    for (const [email, client] of [
      [emails.sender, sender],
      [emails.recipientA, recipientA],
      [emails.recipientB, recipientB],
      [emails.unrelated, unrelated],
    ] as const) {
      const signIn = await client.auth.signInWithPassword({ email, password });
      if (signIn.error) throw signIn.error;
      await client.rpc("complete_onboarding", {
        p_topic_ids: ["20000000-0000-4000-8000-000000000107"],
        p_display_name: email.split("@")[0] ?? "Dare QA",
      });
    }

    expect(DARE_QA_ROUND_ID).not.toBe(LAUNCH_MONEY_DAILY_ROUND_ID);

    const { data: round } = await admin
      .from("daily_rounds")
      .select("id, status, round_date, title")
      .eq("id", DARE_QA_ROUND_ID)
      .single();
    expect(round?.round_date).not.toBe("2026-09-02");
    expect(round?.id).not.toBe(LAUNCH_MONEY_DAILY_ROUND_ID);
  }, 120000);

  afterAll(async () => {
    if (!admin) return;

    for (const dareIdRow of createdDareIds) {
      await admin.from("experiment_dares").delete().eq("id", dareIdRow);
    }

    for (const userId of createdUserIds) {
      await admin.from("entry_allocations").delete().in(
        "entry_id",
        (
          await admin.from("entries").select("id").eq("user_id", userId)
        ).data?.map((row) => row.id) ?? [],
      );
      await admin.from("entries").delete().eq("user_id", userId);
      await admin.from("product_events").delete().eq("user_id", userId);
      await admin.auth.admin.deleteUser(userId);
    }
  }, 120000);

  it("A — sender creates dare only after completing the round", async () => {
    const incomplete = await sender.rpc("create_experiment_dare", {
      p_round_id: DARE_QA_ROUND_ID,
    });
    expect(incomplete.error?.message).toMatch(/daily_not_complete/i);

    await completePriceRound(sender);

    const created = await sender.rpc("create_experiment_dare", {
      p_round_id: DARE_QA_ROUND_ID,
    });
    expect(created.error).toBeNull();
    expect(created.data?.token).toMatch(/^[a-f0-9]{32}$/);
    dareToken = created.data!.token;
    dareId = created.data!.id;
    createdDareIds.push(dareId);
  });

  it("B — sender cannot dare self", async () => {
    const selfAccept = await sender.rpc("accept_experiment_dare", { p_token: dareToken });
    expect(selfAccept.error?.message).toMatch(/cannot_dare_self/i);
  });

  it("C/D — public token exposes metadata only and stays blind pre-completion", async () => {
    const anon = createClient<Database>(url!, anonKey!, {
      auth: { persistSession: false },
    });
    const { data, error } = await anon.rpc("get_public_dare", { p_token: dareToken });
    expect(error).toBeNull();
    assertPublicPayloadBlind(data as Record<string, unknown>);
    expect((data as { status?: string }).status).toBe("open");

    const asRecipientLater = await recipientA.rpc("get_public_dare", { p_token: dareToken });
    expect(asRecipientLater.error).toBeNull();
    assertPublicPayloadBlind(asRecipientLater.data as Record<string, unknown>);
  });

  it("E — first recipient claims dare", async () => {
    const accepted = await recipientA.rpc("accept_experiment_dare", { p_token: dareToken });
    expect(accepted.error).toBeNull();
    expect((accepted.data as { play_marshmallow_id?: string } | null)?.play_marshmallow_id).toBe(
      MQ[0],
    );

    const { data: row } = await admin
      .from("experiment_dares")
      .select("accepted_by_user_id")
      .eq("token", dareToken)
      .single();
    expect(row?.accepted_by_user_id).toBe(recipientAId);
  });

  it("F — second recipient cannot claim", async () => {
    const second = await recipientB.rpc("accept_experiment_dare", { p_token: dareToken });
    expect(second.error?.message).toMatch(/dare_already_claimed/i);

    const asB = await recipientB.rpc("get_public_dare", { p_token: dareToken });
    expect((asB.data as { status?: string }).status).toBe("taken");
  });

  it("G/H — sender and accepted recipient can read dare row; I unrelated cannot", async () => {
    const senderRows = await sender.from("experiment_dares").select("*").eq("token", dareToken);
    expect(senderRows.error).toBeNull();
    expect(senderRows.data).toHaveLength(1);

    const recipientRows = await recipientA
      .from("experiment_dares")
      .select("*")
      .eq("token", dareToken);
    expect(recipientRows.error).toBeNull();
    expect(recipientRows.data).toHaveLength(1);

    const unrelatedRows = await unrelated.from("experiment_dares").select("*");
    expect(unrelatedRows.error).toBeNull();
    expect(unrelatedRows.data ?? []).toEqual([]);
  });

  it("J/K — comparison unavailable before recipient completion", async () => {
    const senderCompare = await sender.rpc("get_dare_comparison", { p_token: dareToken });
    expect(senderCompare.error?.message).toMatch(/dare_not_complete/i);

    const recipientCompare = await recipientA.rpc("get_dare_comparison", { p_token: dareToken });
    expect(recipientCompare.error?.message).toMatch(/dare_not_complete/i);

    const unrelatedCompare = await unrelated.rpc("get_dare_comparison", { p_token: dareToken });
    expect(unrelatedCompare.error?.message).toMatch(/dare_not_complete|dare_forbidden/i);
  });

  it("hosted sender flow — sender sees waiting status", async () => {
    const publicView = await sender.rpc("get_public_dare", { p_token: dareToken });
    expect((publicView.data as { is_sender?: boolean }).is_sender).toBe(true);
    expect((publicView.data as { status?: string }).status).toBe("claimed");
    expect((publicView.data as { match_ready?: boolean }).match_ready).toBe(false);
  });

  it("hosted recipient flow — recipient plays blind through Line", async () => {
    await completePriceRound(recipientA, "31000000-0000-4000-8000-000000000442");

    const completed = await recipientA.rpc("complete_experiment_dare_for_line", {
      p_line_marshmallow_id: MQ[4]!,
    });
    expect(completed.error).toBeNull();
    expect(completed.data).toBe(true);
  });

  it("L/M/N — comparison unlocks for sender and recipient after completion", async () => {
    const senderCompare = await sender.rpc("get_dare_comparison", { p_token: dareToken });
    expect(senderCompare.error).toBeNull();
    expect((senderCompare.data as { sender_choices?: unknown[] }).sender_choices?.length).toBe(5);
    expect((senderCompare.data as { recipient_choices?: unknown[] }).recipient_choices?.length).toBe(
      5,
    );

    const recipientCompare = await recipientA.rpc("get_dare_comparison", { p_token: dareToken });
    expect(recipientCompare.error).toBeNull();

    const publicAfter = await recipientA.rpc("get_public_dare", { p_token: dareToken });
    expect((publicAfter.data as { match_ready?: boolean }).match_ready).toBe(true);
    assertPublicPayloadBlind(publicAfter.data as Record<string, unknown>);
  });

  it("J — unrelated user denied comparison after completion", async () => {
    const denied = await unrelated.rpc("get_dare_comparison", { p_token: dareToken });
    expect(denied.error?.message).toMatch(/dare_forbidden/i);
  });

  it("Q — token enumeration does not leak rows", async () => {
    const anon = createClient<Database>(url!, anonKey!, {
      auth: { persistSession: false },
    });
    const { error } = await anon.rpc("get_public_dare", {
      p_token: "00000000000000000000000000000001",
    });
    expect(error?.message).toMatch(/dare_not_found/i);
  });

  it("R — direct INSERT and UPDATE blocked", async () => {
    const insert = await sender.from("experiment_dares").insert({
      token: "b".repeat(32),
      sender_user_id: senderId,
      round_id: DARE_QA_ROUND_ID,
      sender_line_marshmallow_id: MQ[4]!,
    });
    expect(insert.error).toBeTruthy();

    const update = await recipientA
      .from("experiment_dares")
      .update({ completed_at: new Date().toISOString() })
      .eq("token", dareToken)
      .select("id");
    expect(update.error).toBeNull();
    expect(update.data ?? []).toHaveLength(0);
  });

  it("analytics — dare events recorded without answer content", async () => {
    const { data: createdEvents } = await admin
      .from("product_events")
      .select("event_type, payload")
      .eq("event_type", "dare_created")
      .contains("payload", { dare_id: dareId });
    expect((createdEvents ?? []).length).toBeGreaterThan(0);

    const { data: acceptedEvents } = await admin
      .from("product_events")
      .select("event_type, payload")
      .eq("event_type", "dare_accepted")
      .contains("payload", { dare_id: dareId });
    expect((acceptedEvents ?? []).length).toBeGreaterThan(0);

    const { data: completedEvents } = await admin
      .from("product_events")
      .select("event_type, payload")
      .eq("event_type", "dare_completed")
      .contains("payload", { dare_id: dareId });
    expect((completedEvents ?? []).length).toBeGreaterThan(0);

    const allEvents = [
      ...(createdEvents ?? []),
      ...(acceptedEvents ?? []),
      ...(completedEvents ?? []),
    ];
    for (const row of allEvents) {
      const payload = JSON.stringify(row.payload ?? {}).toLowerCase();
      expect(payload).not.toMatch(/keep it|sell it|choice_label|tension_side/i);
      expect(row.payload).toHaveProperty("dare_id");
    }

    await sender.rpc("get_dare_comparison", { p_token: dareToken });
    const { data: viewedEvents } = await admin
      .from("product_events")
      .select("event_type, payload")
      .eq("event_type", "dare_comparison_viewed")
      .contains("payload", { dare_id: dareId });
    expect((viewedEvents ?? []).length).toBeGreaterThan(0);
  });

  it("P — closed round blocks new acceptance on a fresh dare", async () => {
    await completePriceRound(recipientB, "31000000-0000-4000-8000-000000000443");
    const created = await recipientB.rpc("create_experiment_dare", {
      p_round_id: DARE_QA_ROUND_ID,
    });
    expect(created.error).toBeNull();
    const closedToken = created.data!.token;
    createdDareIds.push(created.data!.id);

    const originalCloses = await admin
      .from("marshmallows")
      .select("id, closes_at")
      .eq("daily_round_id", DARE_QA_ROUND_ID);
    const closesBackup = (originalCloses.data ?? []).map((row) => ({
      id: row.id,
      closes_at: row.closes_at,
    }));

    await admin
      .from("marshmallows")
      .update({ closes_at: new Date(Date.now() - 60_000).toISOString() })
      .eq("daily_round_id", DARE_QA_ROUND_ID);

    const closedView = await sender.rpc("get_public_dare", { p_token: closedToken });
    expect((closedView.data as { status?: string }).status).toBe("closed");

    const acceptClosed = await recipientA.rpc("accept_experiment_dare", { p_token: closedToken });
    expect(acceptClosed.error?.message).toMatch(/round_closed/i);

    for (const row of closesBackup) {
      await admin.from("marshmallows").update({ closes_at: row.closes_at }).eq("id", row.id);
    }
  });

  it("O — cancelled dare stays non-leaky and blocks acceptance", async () => {
    const created = await recipientB.rpc("create_experiment_dare", {
      p_round_id: DARE_QA_ROUND_ID,
    });
    expect(created.error).toBeNull();
    const cancelledToken = created.data!.token;
    createdDareIds.push(created.data!.id);

    await admin
      .from("experiment_dares")
      .update({ cancelled_at: new Date().toISOString() })
      .eq("token", cancelledToken);

    const view = await unrelated.rpc("get_public_dare", { p_token: cancelledToken });
    expect((view.data as { status?: string }).status).toBe("cancelled");
    assertPublicPayloadBlind(view.data as Record<string, unknown>);

    const accept = await recipientA.rpc("accept_experiment_dare", { p_token: cancelledToken });
    expect(accept.error?.message).toMatch(/dare_cancelled/i);
  });
});

describe("experiment dares schema verification", () => {
  it("verifies table, RPC grants, and RLS on hosted", async () => {
    const env = requireEnv();
    const admin = createClient<Database>(env.url, env.serviceKey, {
      auth: { autoRefreshToken: false },
    });
    await assertMigrationApplied(admin);

    const { error: tableError } = await admin.from("experiment_dares").select("id").limit(1);
    expect(tableError).toBeNull();

    const { error: publicDareError } = await admin.rpc("get_public_dare", {
      p_token: "00000000000000000000000000000000",
    });
    expect(publicDareError?.message.includes("Could not find the function")).toBe(false);

    const { error: createError } = await admin.rpc("create_experiment_dare", {
      p_round_id: DARE_QA_ROUND_ID,
    });
    expect(createError?.message.includes("Could not find the function")).toBe(false);
  });
});
