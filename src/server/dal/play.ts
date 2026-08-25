import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolvePlayScreen, type PlayScreen } from "@/domain/play/view";
import { nextMarshmallowHref, pickNextMarshmallowId } from "@/domain/play/next";
import type { NextPickContext, PlayMode } from "@/domain/play/mode";
import { isPlayMode, playModeFromDailyFlag } from "@/domain/play/mode";
import type { PlayAllocation, PlayChoice, PlayMarshmallow, RevealChoiceRow, RevealPayload } from "@/domain/play/types";
import { crowdsenseDelta, crowdsenseFromScores } from "@/domain/crowdsense/rating";
import { listActiveTopics, listOwnTopicPrefIds } from "@/server/dal/topics";

export type { PlayAllocation, PlayChoice, PlayMarshmallow, RevealChoiceRow, RevealPayload };
export type { PlayScreen };

function assertNoAggregates(payload: unknown) {
  const text = JSON.stringify(payload);
  if (
    text.includes("vote_count") ||
    text.includes("vote_pct") ||
    text.includes("total_sealed_votes")
  ) {
    throw new Error("play_payload_leaked_aggregates");
  }
}

export async function getPlayMarshmallow(id: string): Promise<PlayMarshmallow | null> {
  const supabase = await createSupabaseServerClient();
  const nowIso = new Date().toISOString();

  const { data, error } = await supabase
    .from("marshmallows")
    .select(
      "id, question, status, opens_at, closes_at, reveals_at, hard_reveals_at, is_daily, play_mode, topic_id, entity_label, spoiler_context, image_url, expires_at, topics(name, image_url), marshmallow_choices(id, label, sort_order)",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!data || data.status === "draft") {
    return null;
  }

  const [{ data: entry, error: entryError }, { data: openRow, error: openError }] =
    await Promise.all([
      supabase
        .from("entries")
        .select("id, own_choice_id, sealed_at, entry_allocations(choice_id, predicted_pct)")
        .eq("marshmallow_id", id)
        .maybeSingle(),
      supabase
        .from("reveal_opens")
        .select(
          "opened_at, base_points, reveal_bonus_points, reveal_bonus_earned, reveal_streak_qualified",
        )
        .eq("marshmallow_id", id)
        .maybeSingle(),
    ]);

  if (entryError) {
    throw new Error(entryError.message);
  }
  if (openError) {
    throw new Error(openError.message);
  }

  const choices = [...(data.marshmallow_choices ?? [])].sort(
    (a, b) => a.sort_order - b.sort_order,
  );
  const topic = Array.isArray(data.topics) ? data.topics[0] : data.topics;
  const allocations = entry?.entry_allocations ?? [];
  const sealed = entry?.sealed_at != null;
  const openedReveal = openRow != null;

  const screen = resolvePlayScreen({
    status: data.status,
    nowMs: Date.parse(nowIso),
    opensAtMs: Date.parse(data.opens_at),
    closesAtMs: Date.parse(data.closes_at),
    revealsAtMs: Date.parse(data.reveals_at),
    hardRevealsAtMs: Date.parse(data.hard_reveals_at),
    sealed,
    hasDraft: entry != null && entry.sealed_at == null,
    openedReveal,
  });

  const playMode = isPlayMode(data.play_mode)
    ? data.play_mode
    : playModeFromDailyFlag(data.is_daily);
  const nextHref = await resolveNextHref(
    id,
    playMode === "quick" ? "after_quick_reveal" : "after_other_reveal",
  );
  const mayLoadResults =
    screen === "revealed" || screen === "revealed_spectator";

  let reveal: RevealPayload | null = null;
  if (mayLoadResults) {
    reveal = await loadRevealPayload({
      marshmallowId: id,
      choices,
      allocations,
      opened: openRow,
      sealed,
      revealsAt: data.reveals_at,
      nowIso,
    });
  }

  const payload: PlayMarshmallow = {
    id: data.id,
    question: data.question,
    status: data.status,
    opens_at: data.opens_at,
    closes_at: data.closes_at,
    reveals_at: data.reveals_at,
    hard_reveals_at: data.hard_reveals_at,
    is_daily: data.is_daily,
    play_mode: playMode,
    topicName: topic?.name ?? null,
    entityLabel: data.entity_label,
    spoilerContext: data.spoiler_context,
    imageUrl: data.image_url ?? topic?.image_url ?? null,
    expiresAt: data.expires_at,
    choices,
    ownChoiceId: entry?.own_choice_id ?? null,
    sealed,
    sealedAt: entry?.sealed_at ?? null,
    allocations,
    openedReveal,
    screen,
    nowIso,
    reveal,
    nextHref,
  };

  if (!mayLoadResults) {
    assertNoAggregates(payload);
  }
  return payload;
}

async function loadRevealPayload(input: {
  marshmallowId: string;
  choices: PlayChoice[];
  allocations: PlayAllocation[];
  opened: {
    base_points: number;
    reveal_bonus_points: number;
    reveal_bonus_earned: boolean;
    reveal_streak_qualified: boolean;
  } | null;
  sealed: boolean;
  revealsAt: string;
  nowIso: string;
}): Promise<RevealPayload | null> {
  const supabase = await createSupabaseServerClient();
  const { data: rows, error } = await supabase.rpc("get_marshmallow_results", {
    p_marshmallow_id: input.marshmallowId,
  });
  if (error || !rows) {
    return null;
  }

  const totalVotes = rows[0]?.total_sealed_votes ?? 0;
  const youByChoice = new Map(
    input.allocations.map((item) => [item.choice_id, item.predicted_pct]),
  );
  const revealChoices: RevealChoiceRow[] = input.choices.map((choice) => {
    const result = rows.find((row) => row.choice_id === choice.id);
    return {
      choiceId: choice.id,
      label: choice.label,
      sortOrder: choice.sort_order,
      youPct: youByChoice.get(choice.id) ?? null,
      votePct: Number(result?.vote_pct ?? 0),
    };
  });

  let accuracy: number | null = null;
  let basePoints: number | null = null;
  let streakCurrent: number | null = null;
  if (input.sealed && input.opened) {
    const { data: score } = await supabase
      .from("scores")
      .select("accuracy, base_points")
      .eq("marshmallow_id", input.marshmallowId)
      .maybeSingle();
    accuracy = score?.accuracy ?? input.opened.base_points;
    basePoints = score?.base_points ?? input.opened.base_points;
    if (input.opened.reveal_streak_qualified) {
      const { data: streak } = await supabase
        .from("streaks")
        .select("reveal_current")
        .maybeSingle();
      streakCurrent = streak?.reveal_current ?? null;
    }
  }

  let crowdsenseRating: number | null = null;
  let crowdsenseDeltaValue: number | null = null;
  if (input.sealed && input.opened && accuracy != null) {
    const { data: allScores } = await supabase.from("scores").select("accuracy, marshmallow_id");
    const allAccuracies = (allScores ?? []).map((row) => row.accuracy);
    const previous = (allScores ?? [])
      .filter((row) => row.marshmallow_id !== input.marshmallowId)
      .map((row) => row.accuracy);
    const after = crowdsenseFromScores(allAccuracies);
    const before = crowdsenseFromScores(previous);
    crowdsenseRating = after.rating;
    crowdsenseDeltaValue = crowdsenseDelta(before, after);
  }

  return {
    totalVotes,
    choices: revealChoices,
    accuracy: input.opened ? accuracy : null,
    basePoints: input.opened ? basePoints : null,
    bonusPoints: input.opened?.reveal_bonus_points ?? 0,
    bonusEarned: input.opened?.reveal_bonus_earned ?? false,
    streakCurrent,
    streakQualified: input.opened?.reveal_streak_qualified ?? false,
    crowdsenseRating,
    crowdsenseDelta: crowdsenseDeltaValue,
  };
}

export async function resolveNextHref(
  currentId: string,
  context: NextPickContext = "after_other_reveal",
): Promise<string> {
  const supabase = await createSupabaseServerClient();
  const [{ data: openRows }, { data: sealedRows }, topics, interestIds] = await Promise.all([
    supabase
      .from("marshmallows")
      .select("id, status, is_daily, play_mode, topic_id, expires_at, quick_priority, opens_at, closes_at, cancelled_at")
      .eq("status", "open"),
    supabase.from("entries").select("marshmallow_id, sealed_at"),
    listActiveTopics(),
    listOwnTopicPrefIds(),
  ]);
  const sealedIds = new Set(
    (sealedRows ?? [])
      .filter((row) => row.sealed_at != null)
      .map((row) => row.marshmallow_id),
  );
  const nowMs = Date.now();
  const discoverable = (openRows ?? []).filter((row) => {
    if (!row.expires_at) return true;
    const expires = Date.parse(row.expires_at);
    return Number.isNaN(expires) || expires > nowMs;
  });
  const nextId = pickNextMarshmallowId(
    currentId,
    discoverable,
    sealedIds,
    topics,
    interestIds,
    context,
    nowMs,
  );
  return nextMarshmallowHref(nextId);
}

export async function firstSessionPlayHref(): Promise<string> {
  return resolveNextHref("", "first_session");
}

export function playModeOf(row: { play_mode?: string | null; is_daily: boolean }): PlayMode {
  return isPlayMode(row.play_mode) ? row.play_mode : playModeFromDailyFlag(row.is_daily);
}
