/**
 * Part 7 — Multi-user live QA for Loyalty vs Justice draft round.
 * Run: npx vitest run tests/qa/loyalty-justice-live-qa.test.ts --config vitest.config.mts
 * Requires hosted Supabase env (.env.local). Uses @marshmallow.test users only.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { buildExperimentCrowdTrajectory, crowdSidePctFromResults } from "@/domain/daily/crowd-trajectory";
import { buildTodaysRead, type TodaysReadQuestion } from "@/domain/daily/todays-read";
import type { Database } from "@/lib/supabase/types";
import { HUMAN_NATURE_TOPIC_ID } from "../rls/fixtures";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const password = "test-pass-loyalty-justice-qa-1";

const ROUND_ID = "40000000-0000-4000-8000-000000000006";
const MQ = [
  "31000000-0000-4000-8000-000000000020",
  "31000000-0000-4000-8000-000000000021",
  "31000000-0000-4000-8000-000000000022",
  "31000000-0000-4000-8000-000000000023",
  "31000000-0000-4000-8000-000000000024",
] as const;

const JUSTICE_PICK = [
  "31000000-0000-4000-8000-000000000201",
  "31000000-0000-4000-8000-000000000211",
  "31000000-0000-4000-8000-000000000221",
] as const;
const LOYALTY_PICK = [
  "31000000-0000-4000-8000-000000000202",
  "31000000-0000-4000-8000-000000000212",
  "31000000-0000-4000-8000-000000000222",
] as const;
const YES = "31000000-0000-4000-8000-000000000231";
const NO = "31000000-0000-4000-8000-000000000232";
const LINE = {
  moment: "31000000-0000-4000-8000-000000000241",
  again: "31000000-0000-4000-8000-000000000242",
  continues: "31000000-0000-4000-8000-000000000243",
  asked: "31000000-0000-4000-8000-000000000244",
  never: "31000000-0000-4000-8000-000000000245",
} as const;

type Side = "justice" | "loyalty";

type TesterPlan = {
  label: string;
  path: [Side, Side, Side, Side];
  lineId: string;
  q4YesPct: number;
};

const TESTERS: TesterPlan[] = [
  { label: "A", path: ["justice", "justice", "justice", "justice"], lineId: LINE.moment, q4YesPct: 72 },
  { label: "B", path: ["justice", "justice", "loyalty", "loyalty"], lineId: LINE.continues, q4YesPct: 58 },
  { label: "C", path: ["justice", "justice", "justice", "loyalty"], lineId: LINE.again, q4YesPct: 45 },
  { label: "D", path: ["justice", "loyalty", "justice", "justice"], lineId: LINE.asked, q4YesPct: 68 },
  { label: "E", path: ["loyalty", "loyalty", "loyalty", "loyalty"], lineId: LINE.never, q4YesPct: 25 },
];

const tension = {
  id: "50000000-0000-4000-8000-000000000011",
  slug: "loyalty-justice",
  leftLabel: "LOYALTY",
  rightLabel: "JUSTICE",
  displayLabel: "LOYALTY vs. JUSTICE",
};

function choiceFor(side: Side, qIndex: 0 | 1 | 2): string {
  return side === "justice" ? JUSTICE_PICK[qIndex] : LOYALTY_PICK[qIndex];
}

function flipChoice(side: Side): string {
  return side === "justice" ? YES : NO;
}

function requireEnv() {
  if (!url || !anonKey || !serviceKey) {
    throw new Error("Hosted Supabase env required (.env.local)");
  }
  return { url, anonKey, serviceKey };
}

async function onboard(client: SupabaseClient<Database>, displayName: string) {
  const { error } = await client.rpc("complete_onboarding", {
    p_topic_ids: [HUMAN_NATURE_TOPIC_ID],
    p_display_name: displayName,
  });
  if (error) throw error;
}

async function resetQaRound(adminClient: SupabaseClient<Database>) {
  const future = new Date(Date.now() + 48 * 3_600_000).toISOString();
  const reveals = new Date(Date.now() + 49 * 3_600_000).toISOString();

  for (const mmId of MQ) {
    const { data: entries } = await adminClient
      .from("entries")
      .select("id, user_id, marshmallow_id")
      .eq("marshmallow_id", mmId);
    for (const entry of entries ?? []) {
      await adminClient.from("entry_allocations").delete().eq("entry_id", entry.id);
      await adminClient
        .from("scores")
        .delete()
        .eq("user_id", entry.user_id)
        .eq("marshmallow_id", entry.marshmallow_id);
    }
    await adminClient.from("entries").delete().eq("marshmallow_id", mmId);
    await adminClient.from("marshmallow_result_choices").delete().eq("marshmallow_id", mmId);
    await adminClient.from("marshmallow_results").delete().eq("marshmallow_id", mmId);
  }

  const { error } = await adminClient
    .from("marshmallows")
    .update({
      status: "open",
      closes_at: future,
      reveals_at: reveals,
      hard_reveals_at: reveals,
    })
    .eq("daily_round_id", ROUND_ID);
  if (error) throw error;
}

async function sealPick(
  client: SupabaseClient<Database>,
  marshmallowId: string,
  choiceId: string,
) {
  const { error } = await client.rpc("seal_entry", {
    p_marshmallow_id: marshmallowId,
    p_own_choice_id: choiceId,
    p_allocations: [],
  });
  if (error) throw error;
}

async function sealScored(
  client: SupabaseClient<Database>,
  marshmallowId: string,
  choiceId: string,
  yesPct: number,
) {
  const { error } = await client.rpc("seal_entry", {
    p_marshmallow_id: marshmallowId,
    p_own_choice_id: choiceId,
    p_allocations: [
      { choice_id: YES, predicted_pct: yesPct },
      { choice_id: NO, predicted_pct: 100 - yesPct },
    ],
  });
  if (error) throw error;
}

async function sealLine(client: SupabaseClient<Database>, choiceId: string) {
  const { error } = await client.rpc("seal_line_entry", {
    p_marshmallow_id: MQ[4],
    p_own_choice_id: choiceId,
  });
  if (error) throw error;
}

describe("Part 7 — Loyalty vs Justice live multi-user QA", () => {
  let admin: SupabaseClient<Database>;
  const suffix = Date.now().toString(36);
  const userIds: string[] = [];
  const clients: SupabaseClient<Database>[] = [];

  beforeAll(async () => {
    const env = requireEnv();
    admin = createClient<Database>(env.url, env.serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    await resetQaRound(admin);

    for (const plan of TESTERS) {
      const email = `qa-lvj-${plan.label.toLowerCase()}.${suffix}@marshmallow.test`;
      const created = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { username: `qa_lvj_${plan.label.toLowerCase()}_${suffix.slice(0, 6)}` },
      });
      if (created.error || !created.data.user) throw created.error ?? new Error("create user");
      userIds.push(created.data.user.id);

      const client = createClient<Database>(env.url, env.anonKey, {
        auth: { persistSession: false, autoRefreshToken: false, storageKey: `qa-lvj-${plan.label}` },
      });
      const signed = await client.auth.signInWithPassword({ email, password });
      if (signed.error) throw signed.error;
      await onboard(client, `QA Tester ${plan.label}`);
      clients.push(client);
    }

    // Resume interrupt probe on Tester C client before full Q4 seal
    for (let i = 0; i < 3; i += 1) {
      await sealPick(clients[2]!, MQ[i]!, choiceFor(TESTERS[2]!.path[i]!, i as 0 | 1 | 2));
    }
    const flipChoiceId = flipChoice(TESTERS[2]!.path[3]!);
    const draft = await clients[2]!.rpc("save_entry_draft", {
      p_marshmallow_id: MQ[3],
      p_own_choice_id: flipChoiceId,
    });
    if (draft.error) throw draft.error;
    const { data: draftEntry } = await clients[2]!
      .from("entries")
      .select("own_choice_id, sealed_at")
      .eq("marshmallow_id", MQ[3])
      .maybeSingle();
    expect(draftEntry?.own_choice_id).toBe(flipChoiceId);
    expect(draftEntry?.sealed_at).toBeNull();
    await sealScored(clients[2]!, MQ[3]!, flipChoiceId, TESTERS[2]!.q4YesPct);
    await sealLine(clients[2]!, TESTERS[2]!.lineId);
  }, 120000);

  afterAll(async () => {
    if (!admin) return;
    for (const id of userIds) {
      await admin.from("entries").delete().eq("user_id", id);
      await admin.auth.admin.deleteUser(id);
    }
  }, 60000);

  it("plays all five testers through normal seal RPCs", async () => {
    for (let t = 0; t < TESTERS.length; t += 1) {
      if (t === 2) continue; // completed in beforeAll with resume probe
      const plan = TESTERS[t]!;
      const client = clients[t]!;

      for (let q = 0; q < 3; q += 1) {
        await sealPick(client, MQ[q]!, choiceFor(plan.path[q]!, q as 0 | 1 | 2));
      }
      const flipId = flipChoice(plan.path[3]!);
      await sealScored(client, MQ[3]!, flipId, plan.q4YesPct);
      await sealLine(client, plan.lineId);

      const { data: entries } = await client
        .from("entries")
        .select("marshmallow_id, sealed_at")
        .in("marshmallow_id", [...MQ]);
      expect(entries?.length).toBe(5);
      expect(entries?.every((row) => row.sealed_at != null)).toBe(true);
    }
  }, 120000);

  it("builds Today's Read headlines per tester", async () => {
    const stages = ["instinct", "pressure", "consequence", "flip", "line"] as const;
    const pressureTypes = [null, "REMORSE", "HARM_TO_OTHERS", "PERSPECTIVE", null];

    for (let t = 0; t < TESTERS.length; t += 1) {
      const { data: entries } = await admin
        .from("entries")
        .select("marshmallow_id, own_choice_id, marshmallows(round_position, is_line, metadata)")
        .eq("user_id", userIds[t]!)
        .in("marshmallow_id", [...MQ]);

      const { data: choices } = await admin
        .from("marshmallow_choices")
        .select("id, label, metadata, marshmallow_id")
        .in("marshmallow_id", [...MQ]);

      const questions: TodaysReadQuestion[] = (entries ?? [])
        .map((entry) => {
          const mm = entry.marshmallows as {
            round_position: number;
            is_line: boolean;
            metadata: unknown;
          };
          const pos = mm.round_position;
          const choice = choices?.find((c) => c.id === entry.own_choice_id);
          const meta = choice?.metadata as { tension_side?: string } | null;
          const stage = stages[pos - 1] ?? "instinct";
          return {
            position: pos,
            question: "",
            choiceLabel: choice?.label ?? null,
            tensionSide: (meta?.tension_side as "left" | "right" | "neutral" | undefined) ?? null,
            hasSwitch: false,
            switchStayed: null,
            isLine: mm.is_line,
            experimentStage: stage,
            pressureType: pressureTypes[pos - 1] ?? null,
          };
        })
        .sort((a, b) => a.position - b.position);

      const read = buildTodaysRead(questions, tension, null, { experiment: { version: 1 } });
      expect(read?.headline).toBeTruthy();
      expect(read?.lineCopy).toBeTruthy();
    }
  });

  it("finalizes round and reports crowd trajectory", async () => {
    const now = Date.now();
    const closesAt = new Date(now - 120_000).toISOString();
    const revealsAt = new Date(now - 60_000).toISOString();
    const hardRevealsAt = new Date(now - 30_000).toISOString();
    const { error: bumpError } = await admin
      .from("marshmallows")
      .update({
        status: "closed",
        closes_at: closesAt,
        reveals_at: revealsAt,
        hard_reveals_at: hardRevealsAt,
      })
      .eq("daily_round_id", ROUND_ID);
    if (bumpError) throw bumpError;

    for (const mmId of MQ) {
      const { error: finalizeError } = await admin.rpc("finalize_marshmallow", {
        p_marshmallow_id: mmId,
      });
      if (finalizeError) throw finalizeError;
    }

    const { data: statuses } = await admin
      .from("marshmallows")
      .select("id, round_position, status")
      .eq("daily_round_id", ROUND_ID)
      .order("round_position");
    expect(statuses?.every((row) => row.status === "revealed")).toBe(true);

    const stageMeta = [
      { stage: "instinct" as const, position: 1 },
      { stage: "pressure" as const, position: 2 },
      { stage: "consequence" as const, position: 3 },
      { stage: "flip" as const, position: 4 },
    ];

    const crowdStages: { stage: typeof stageMeta[number]["stage"]; position: number; leftPct: number; rightPct: number }[] = [];

    for (const sm of stageMeta) {
      const mmId = MQ[sm.position - 1]!;
      const { data: choiceRows } = await admin
        .from("marshmallow_choices")
        .select("id, metadata")
        .eq("marshmallow_id", mmId);
      const { data: resultRows } = await admin.rpc("get_marshmallow_results", {
        p_marshmallow_id: mmId,
      });
      const leftPct = crowdSidePctFromResults({
        choices: choiceRows ?? [],
        results: resultRows ?? [],
        side: "left",
      });
      const rightPct = crowdSidePctFromResults({
        choices: choiceRows ?? [],
        results: resultRows ?? [],
        side: "right",
      });
      crowdStages.push({ stage: sm.stage, position: sm.position, leftPct, rightPct });
    }

    const trajectory = buildExperimentCrowdTrajectory({
      tension,
      referenceSide: "right",
      stages: crowdStages,
    });

    expect(trajectory?.crowdFirstMovementStage).toBeTruthy();

    const { data: lineResults } = await admin.rpc("get_marshmallow_results", {
      p_marshmallow_id: MQ[4],
    });
    expect((lineResults ?? []).length).toBeGreaterThan(0);

    const { data: aEntry } = await admin
      .from("entries")
      .select("id, entry_allocations(predicted_pct, choice_id)")
      .eq("user_id", userIds[0]!)
      .eq("marshmallow_id", MQ[3])
      .single();
    const { data: aScore } = await admin
      .from("scores")
      .select("accuracy, base_points")
      .eq("user_id", userIds[0]!)
      .eq("marshmallow_id", MQ[3])
      .maybeSingle();
    const { data: flipResults } = await admin.rpc("get_marshmallow_results", {
      p_marshmallow_id: MQ[3],
    });
    const predictedYes =
      aEntry?.entry_allocations?.find((a) => a.choice_id === YES)?.predicted_pct ?? null;
    const crowdYes = flipResults?.find((r) => r.choice_id === YES)?.vote_pct ?? null;
    expect(predictedYes).not.toBeNull();
    expect(crowdYes).not.toBeNull();
    expect(aScore?.accuracy).toBeTypeOf("number");

    expect(crowdStages.length).toBe(4);
    expect(trajectory).not.toBeNull();
  }, 120000);

  it("verifies RLS isolation between testers", async () => {
    const { data: aEntries } = await clients[0]!.from("entries").select("user_id");
    expect(aEntries?.every((row) => row.user_id === userIds[0])).toBe(true);

    const { data: crossLeak } = await clients[1]!
      .from("entries")
      .select("id")
      .eq("user_id", userIds[0]!);
    expect(crossLeak?.length ?? 0).toBe(0);
  });

  it("confirms experiment round is promoted as today's public Daily", async () => {
    const today = new Date().toISOString().slice(0, 10);
    const { data: round } = await admin
      .from("daily_rounds")
      .select("status, round_date, metadata, title")
      .eq("id", ROUND_ID)
      .single();
    expect(round?.status).toBe("open");
    expect(round?.round_date).toBe(today);
    expect(round?.title).toBe("How much does loyalty excuse?");
    expect((round?.metadata as { experiment?: { version: number } })?.experiment?.version).toBe(1);
  });
});
