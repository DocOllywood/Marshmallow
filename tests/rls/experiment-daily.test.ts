import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { buildTodaysRead } from "@/domain/daily/todays-read";
import { buildExperimentTrajectory } from "@/domain/daily/trajectory";
import type { Database, Json } from "@/lib/supabase/types";
import { ACTIVE_TOPIC_ID } from "./fixtures";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const password = "test-pass-experiment-daily-1";

function requireEnv() {
  if (!url || !anonKey || !serviceKey) {
    throw new Error("Hosted Supabase env is required for experiment daily tests");
  }
  return { url, anonKey, serviceKey };
}

function utcToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function isoFromNow(minutes: number): string {
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

async function experimentEngineAvailable(admin: SupabaseClient<Database>): Promise<boolean> {
  const { error } = await admin.from("marshmallows").select("metadata").limit(1);
  return !error;
}

describe("Experiment Daily engine (hosted)", () => {
  let admin: SupabaseClient<Database>;
  let adminClient: SupabaseClient<Database>;
  let user: SupabaseClient<Database>;
  let userId = "";
  let adminId = "";
  let engineReady = false;
  let legacyQ1Id = "";
  let legacyOpenQ1Id = "";
  let legacyChoiceId: string | null = null;
  let pickOnlyId = "";
  let scoredId = "";
  let lineId = "";
  let pickOnlyChoices: { id: string }[] = [];
  let scoredChoices: { id: string }[] = [];
  let lineChoices: { id: string }[] = [];
  let pickOnlyEntryId: string | null = null;
  let scoredEntryId: string | null = null;
  let lineEntryId: string | null = null;
  let historyScoreCount = 0;
  const suffix = Date.now().toString(36);
  const createdMarshmallowIds: string[] = [];

  beforeAll(async () => {
    const env = requireEnv();
    admin = createClient<Database>(env.url, env.serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    engineReady = await experimentEngineAvailable(admin);

    const created = await admin.auth.admin.createUser({
      email: `experiment.${suffix}@marshmallow.test`,
      password,
      email_confirm: true,
      user_metadata: { username: `exp_${suffix.slice(0, 8)}` },
    });
    if (created.error || !created.data.user) {
      throw created.error ?? new Error("failed to create user");
    }
    userId = created.data.user.id;

    const createdAdmin = await admin.auth.admin.createUser({
      email: `experimentadm.${suffix}@marshmallow.test`,
      password,
      email_confirm: true,
      user_metadata: { username: `exa_${suffix.slice(0, 8)}` },
    });
    if (createdAdmin.error || !createdAdmin.data.user) {
      throw createdAdmin.error ?? new Error("failed to create admin");
    }
    adminId = createdAdmin.data.user.id;
    await admin
      .from("profiles")
      .update({ role: "admin", onboarding_completed_at: new Date().toISOString() })
      .eq("id", adminId);
    await admin
      .from("profiles")
      .update({ onboarding_completed_at: new Date().toISOString() })
      .eq("id", userId);

    user = createClient<Database>(env.url, env.anonKey, {
      auth: { autoRefreshToken: false, persistSession: false, storageKey: "experiment-daily" },
    });
    adminClient = createClient<Database>(env.url, env.anonKey, {
      auth: { autoRefreshToken: false, persistSession: false, storageKey: "experiment-daily-adm" },
    });

    const signed = await user.auth.signInWithPassword({
      email: `experiment.${suffix}@marshmallow.test`,
      password,
    });
    if (signed.error) throw signed.error;
    const signedAdmin = await adminClient.auth.signInWithPassword({
      email: `experimentadm.${suffix}@marshmallow.test`,
      password,
    });
    if (signedAdmin.error) throw signedAdmin.error;

    const { count: scoresBefore } = await admin
      .from("scores")
      .select("*", { count: "exact", head: true });
    historyScoreCount = scoresBefore ?? 0;

    const { data: todayRound } = await admin
      .from("daily_rounds")
      .select("id")
      .eq("round_date", utcToday())
      .maybeSingle();
    if (todayRound?.id) {
      const { data: q1 } = await admin
        .from("marshmallows")
        .select("id")
        .eq("daily_round_id", todayRound.id)
        .eq("round_position", 1)
        .maybeSingle();
      legacyQ1Id = q1?.id ?? "";
    }

    if (legacyQ1Id) {
      const { data: choices } = await admin
        .from("marshmallow_choices")
        .select("id")
        .eq("marshmallow_id", legacyQ1Id)
        .order("sort_order", { ascending: true })
        .limit(1);
      legacyChoiceId = choices?.[0]?.id ?? null;
    }

    const { data: openQ1 } = await admin
      .from("marshmallows")
      .select("id")
      .eq("play_mode", "daily")
      .eq("round_position", 1)
      .eq("status", "open")
      .not("daily_round_id", "is", null)
      .limit(1)
      .maybeSingle();
    legacyOpenQ1Id = openQ1?.id ?? legacyQ1Id;

    if (legacyOpenQ1Id && legacyOpenQ1Id !== legacyQ1Id) {
      const { data: choices } = await admin
        .from("marshmallow_choices")
        .select("id")
        .eq("marshmallow_id", legacyOpenQ1Id)
        .order("sort_order", { ascending: true })
        .limit(1);
      legacyChoiceId = choices?.[0]?.id ?? legacyChoiceId;
    }

    if (!engineReady) {
      return;
    }

    async function createFixture(input: {
      question: string;
      metadata: Json;
      isLine?: boolean;
    }) {
      const created = await adminClient.rpc("admin_upsert_marshmallow", {
        p_question: input.question,
        p_opens_at: isoFromNow(-5),
        p_closes_at: isoFromNow(120),
        p_reveals_at: isoFromNow(125),
        p_hard_reveals_at: isoFromNow(125),
        p_choices: input.isLine
          ? ["Immediately", "A week", "A month"].map((label, sort_order) => ({ label, sort_order }))
          : ["Yes", "No"].map((label, sort_order) => ({ label, sort_order })),
        p_topic_id: ACTIVE_TOPIC_ID,
        p_is_daily: false,
        p_play_mode: "live",
        p_minimum_result_sample: 0,
      });
      if (created.error || !created.data?.id) {
        throw created.error ?? new Error("fixture upsert failed");
      }
      const id = created.data.id;
      createdMarshmallowIds.push(id);
      await adminClient.rpc("admin_schedule_marshmallow", { p_id: id });
      await adminClient.rpc("run_due_lifecycle", { p_source: "admin" });
      await admin
        .from("marshmallows")
        .update({
          metadata: input.metadata,
          is_line: input.isLine ?? false,
          minimum_result_sample: 0,
        })
        .eq("id", id);

      const { data: choices } = await admin
        .from("marshmallow_choices")
        .select("id, sort_order, metadata")
        .eq("marshmallow_id", id)
        .order("sort_order", { ascending: true });

      if (!input.isLine) {
        for (const [index, choice] of (choices ?? []).entries()) {
          await admin
            .from("marshmallow_choices")
            .update({
              metadata: { tension_side: index === 0 ? "left" : "right" },
            })
            .eq("id", choice.id);
        }
      }

      return { id, choices: choices ?? [] };
    }

    const pickOnly = await createFixture({
      question: `Experiment pick-only ${suffix}`,
      metadata: {
        experiment: { stage: "instinct", requires_prediction: false },
      },
    });
    pickOnlyId = pickOnly.id;
    pickOnlyChoices = pickOnly.choices;

    const scored = await createFixture({
      question: `Experiment scored ${suffix}`,
      metadata: {
        experiment: { stage: "flip", requires_prediction: true },
      },
    });
    scoredId = scored.id;
    scoredChoices = scored.choices;

    const line = await createFixture({
      question: `Experiment line ${suffix}`,
      metadata: {
        experiment: { stage: "line", requires_prediction: false },
      },
      isLine: true,
    });
    lineId = line.id;
    lineChoices = line.choices;
  }, 120000);

  afterAll(async () => {
    if (!admin) return;

    for (const entryId of [pickOnlyEntryId, scoredEntryId, lineEntryId]) {
      if (!entryId) continue;
      await admin.from("entry_allocations").delete().eq("entry_id", entryId);
      await admin.from("scores").delete().eq("user_id", userId);
      await admin.from("entries").delete().eq("id", entryId);
    }

    for (const id of createdMarshmallowIds) {
      await admin.from("marshmallow_result_choices").delete().eq("marshmallow_id", id);
      await admin.from("marshmallow_results").delete().eq("marshmallow_id", id);
      await admin.from("marshmallows").delete().eq("id", id);
    }

    if (userId) await admin.auth.admin.deleteUser(userId);
    if (adminId) await admin.auth.admin.deleteUser(adminId);
  }, 120000);

  async function finalizeFixture(marshmallowId: string) {
    await admin
      .from("marshmallows")
      .update({
        status: "closed",
        closes_at: isoFromNow(-2),
        reveals_at: isoFromNow(-1),
        hard_reveals_at: isoFromNow(-1),
      })
      .eq("id", marshmallowId);
    const { error } = await admin.rpc("finalize_marshmallow", {
      p_marshmallow_id: marshmallowId,
    });
    expect(error).toBeNull();
  }

  it("reports experiment metadata columns on hosted", () => {
    expect(engineReady).toBe(true);
  });

  it("legacy daily questions still reject empty allocations", async () => {
    if (!engineReady || !legacyOpenQ1Id || !legacyChoiceId) {
      return;
    }

    const { data: marshmallow } = await admin
      .from("marshmallows")
      .select("status")
      .eq("id", legacyOpenQ1Id)
      .maybeSingle();
    if (marshmallow?.status !== "open") {
      return;
    }

    const { error } = await user.rpc("seal_entry", {
      p_marshmallow_id: legacyOpenQ1Id,
      p_own_choice_id: legacyChoiceId,
      p_allocations: [],
    });
    expect(error?.message).toContain("allocations_invalid");
  });

  it("legacy daily metadata defaults to requiring prediction", async () => {
    if (!engineReady || !legacyOpenQ1Id) {
      return;
    }

    const { data } = await admin
      .from("marshmallows")
      .select("metadata")
      .eq("id", legacyOpenQ1Id)
      .maybeSingle();

    expect(data?.metadata ?? {}).not.toHaveProperty("experiment");
  });

  it("rejects non-empty allocations on pick-only rows", async () => {
    if (!engineReady || !pickOnlyId || pickOnlyChoices.length < 2) {
      return;
    }

    const { error } = await user.rpc("seal_entry", {
      p_marshmallow_id: pickOnlyId,
      p_own_choice_id: pickOnlyChoices[0]!.id,
      p_allocations: pickOnlyChoices.map((choice, index) => ({
        choice_id: choice.id,
        predicted_pct: index === 0 ? 60 : 40,
      })),
    });
    expect(error?.message).toContain("allocations_not_allowed");
  });

  it("seals pick-only experiment rows with empty allocations", async () => {
    if (!engineReady || !pickOnlyId || pickOnlyChoices.length < 2) {
      return;
    }

    const choiceId = pickOnlyChoices[0]!.id;
    const { data: sealed, error } = await user.rpc("seal_entry", {
      p_marshmallow_id: pickOnlyId,
      p_own_choice_id: choiceId,
      p_allocations: [],
    });

    expect(error).toBeNull();
    expect(sealed?.sealed_at).toBeTruthy();
    expect(sealed?.own_choice_id).toBe(choiceId);
    pickOnlyEntryId = sealed?.id ?? null;

    const { data: allocations } = await admin
      .from("entry_allocations")
      .select("id")
      .eq("entry_id", sealed!.id);
    expect(allocations ?? []).toHaveLength(0);
  });

  it("pick-only finalize counts votes without creating scores", async () => {
    if (!engineReady || !pickOnlyId || !pickOnlyEntryId) {
      return;
    }

    const { count: scoresBeforeUser } = await admin
      .from("scores")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("marshmallow_id", pickOnlyId);

    await finalizeFixture(pickOnlyId);

    const { data: results } = await admin
      .from("marshmallow_results")
      .select("total_sealed_votes")
      .eq("marshmallow_id", pickOnlyId)
      .maybeSingle();
    expect((results?.total_sealed_votes ?? 0) >= 1).toBe(true);

    const { count: scoresAfterUser } = await admin
      .from("scores")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("marshmallow_id", pickOnlyId);

    expect(scoresBeforeUser ?? 0).toBe(0);
    expect(scoresAfterUser ?? 0).toBe(0);
  });

  it("opens reveal for pick-only experiment rows without scores", async () => {
    if (!engineReady || !pickOnlyId || !pickOnlyEntryId) {
      return;
    }

    await finalizeFixture(pickOnlyId);

    const { data: opened, error } = await user.rpc("open_reveal", {
      p_marshmallow_id: pickOnlyId,
    });
    expect(error).toBeNull();
    expect(opened?.base_points).toBe(0);
  });

  it("scored experiment flip stage requires allocations and creates one accuracy", async () => {
    if (!engineReady || !scoredId || scoredChoices.length < 2) {
      return;
    }

    const [choiceA, choiceB] = scoredChoices;
    const { data: sealed, error } = await user.rpc("seal_entry", {
      p_marshmallow_id: scoredId,
      p_own_choice_id: choiceA!.id,
      p_allocations: [
        { choice_id: choiceA!.id, predicted_pct: 62 },
        { choice_id: choiceB!.id, predicted_pct: 38 },
      ],
    });
    expect(error).toBeNull();
    scoredEntryId = sealed?.id ?? null;

    await finalizeFixture(scoredId);

    const { data: score } = await admin
      .from("scores")
      .select("accuracy")
      .eq("user_id", userId)
      .eq("marshmallow_id", scoredId)
      .maybeSingle();
    expect(score?.accuracy).toBeTypeOf("number");

    const { data: allocations } = await admin
      .from("entry_allocations")
      .select("predicted_pct")
      .eq("entry_id", sealed!.id);
    expect((allocations ?? []).length).toBeGreaterThan(0);
  });

  it("line fixture uses seal_line_entry and stays unscored", async () => {
    if (!engineReady || !lineId || lineChoices.length === 0) {
      return;
    }

    const { data: sealed, error } = await user.rpc("seal_line_entry", {
      p_marshmallow_id: lineId,
      p_own_choice_id: lineChoices[0]!.id,
    });
    expect(error).toBeNull();
    lineEntryId = sealed?.id ?? null;

    await finalizeFixture(lineId);

    const { data: score } = await admin
      .from("scores")
      .select("id")
      .eq("user_id", userId)
      .eq("marshmallow_id", lineId)
      .maybeSingle();
    expect(score).toBeNull();

    const { data: results } = await admin
      .from("marshmallow_result_choices")
      .select("vote_count")
      .eq("marshmallow_id", lineId);
    expect((results ?? []).length).toBeGreaterThan(0);
  });

  it("does not reduce global historical score totals for pick-only finalize", async () => {
    if (!engineReady) {
      return;
    }

    const { count: scoresAfter } = await admin
      .from("scores")
      .select("*", { count: "exact", head: true });
    expect(scoresAfter).toBeGreaterThanOrEqual(historyScoreCount);
  });

  it("derives hosted-safe trajectory sequences in domain", () => {
    const neverMoved = buildExperimentTrajectory([
      { stage: "instinct", position: 1, choiceLabel: "Yes", tensionSide: "left", pressureType: null, isLine: false },
      { stage: "pressure", position: 2, choiceLabel: "Yes", tensionSide: "left", pressureType: null, isLine: false },
      { stage: "consequence", position: 3, choiceLabel: "Yes", tensionSide: "left", pressureType: null, isLine: false },
      { stage: "flip", position: 4, choiceLabel: "Yes", tensionSide: "left", pressureType: null, isLine: false },
      { stage: "line", position: 5, choiceLabel: "5 min", tensionSide: "neutral", pressureType: null, isLine: true },
    ]);
    expect(neverMoved?.heldThroughout).toBe(true);

    const pressureMove = buildExperimentTrajectory([
      { stage: "instinct", position: 1, choiceLabel: "Yes", tensionSide: "left", pressureType: null, isLine: false },
      { stage: "pressure", position: 2, choiceLabel: "No", tensionSide: "right", pressureType: "mercy", isLine: false },
      { stage: "consequence", position: 3, choiceLabel: "No", tensionSide: "right", pressureType: null, isLine: false },
      { stage: "flip", position: 4, choiceLabel: "No", tensionSide: "right", pressureType: null, isLine: false },
    ]);
    expect(pressureMove?.firstMovementStage).toBe("pressure");

    const returned = buildExperimentTrajectory([
      { stage: "instinct", position: 1, choiceLabel: "Yes", tensionSide: "left", pressureType: null, isLine: false },
      { stage: "pressure", position: 2, choiceLabel: "No", tensionSide: "right", pressureType: null, isLine: false },
      { stage: "consequence", position: 3, choiceLabel: "Yes", tensionSide: "left", pressureType: null, isLine: false },
      { stage: "flip", position: 4, choiceLabel: "Yes", tensionSide: "left", pressureType: null, isLine: false },
    ]);
    expect(returned?.movementCount).toBe(2);
    expect(returned?.returnedToOriginalPosition).toBe(true);
  });

  it("builds experiment today's read without crowd aggregates", () => {
    const read = buildTodaysRead(
      [
        { position: 1, question: "Q1", choiceLabel: "Yes", tensionSide: "left", hasSwitch: false, switchStayed: null, isLine: false, experimentStage: "instinct", pressureType: null },
        { position: 2, question: "Q2", choiceLabel: "No", tensionSide: "right", hasSwitch: false, switchStayed: null, isLine: false, experimentStage: "pressure", pressureType: "mercy" },
        { position: 5, question: "Line?", choiceLabel: "5 minutes", tensionSide: "neutral", hasSwitch: false, switchStayed: null, isLine: true, experimentStage: "line", pressureType: null },
      ],
      {
        id: "t1",
        slug: "justice-mercy",
        leftLabel: "JUSTICE",
        rightLabel: "MERCY",
        displayLabel: "JUSTICE vs. MERCY",
      },
      null,
      { experiment: { version: 1 } },
    );

    expect(read?.isExperiment).toBe(true);
    expect(read?.lineCopy).toBe("5 minutes");
    expect(JSON.stringify(read)).not.toMatch(/vote_pct|crowd|accuracy/i);
  });
});
