import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  buildDailyRoundProgress,
  type DailyRoundProgress,
  type DailyRoundQuestionReveal,
  dailyRoundSummary,
  questionRevealSummary,
  type DailyRoundSummary,
} from "@/domain/daily/round";
import type { PlayChoice } from "@/domain/play/types";
import { crowdsenseDelta, crowdsenseFromScores } from "@/domain/crowdsense/rating";

export type { DailyRoundProgress, DailyRoundQuestionReveal, DailyRoundSummary };

export async function getTodayDailyRoundProgress(
  topicNameById: ReadonlyMap<string, string>,
): Promise<DailyRoundProgress | null> {
  const supabase = await createSupabaseServerClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: round, error: roundError } = await supabase
    .from("daily_rounds")
    .select("id, round_date, title, subtitle, topic_id, status")
    .eq("round_date", today)
    .maybeSingle();

  if (roundError) {
    throw new Error(roundError.message);
  }
  if (!round) {
    return null;
  }

  return loadDailyRoundProgress(round.id, topicNameById, round);
}

async function loadDailyRoundProgress(
  roundId: string,
  topicNameById: ReadonlyMap<string, string>,
  roundRow?: {
    id: string;
    round_date: string;
    title: string;
    subtitle: string | null;
    topic_id: string | null;
    status: string;
  },
): Promise<DailyRoundProgress | null> {
  const supabase = await createSupabaseServerClient();

  const round =
    roundRow ??
    (
      await supabase
        .from("daily_rounds")
        .select("id, round_date, title, subtitle, topic_id, status")
        .eq("id", roundId)
        .maybeSingle()
    ).data;

  if (!round) {
    return null;
  }

  const { data: questions, error: questionError } = await supabase
    .from("marshmallows")
    .select("id, question, round_position, status, reveals_at")
    .eq("daily_round_id", roundId)
    .order("round_position", { ascending: true });

  if (questionError) {
    throw new Error(questionError.message);
  }

  const ids = (questions ?? []).map((row) => row.id);
  const [{ data: entries }, { data: opens }] = await Promise.all([
    ids.length
      ? supabase.from("entries").select("marshmallow_id, sealed_at").in("marshmallow_id", ids)
      : Promise.resolve({ data: [] as { marshmallow_id: string; sealed_at: string | null }[] }),
    ids.length
      ? supabase.from("reveal_opens").select("marshmallow_id").in("marshmallow_id", ids)
      : Promise.resolve({ data: [] as { marshmallow_id: string }[] }),
  ]);

  const sealedIds = new Set(
    (entries ?? []).filter((row) => row.sealed_at != null).map((row) => row.marshmallow_id),
  );
  const openedIds = new Set((opens ?? []).map((row) => row.marshmallow_id));

  return buildDailyRoundProgress({
    roundId: round.id,
    title: round.title,
    subtitle: round.subtitle,
    topicName: round.topic_id ? (topicNameById.get(round.topic_id) ?? null) : null,
    roundDate: round.round_date,
    questions: (questions ?? []).map((row) => ({
      id: row.id,
      question: row.question,
      position: row.round_position ?? 0,
      sealed: sealedIds.has(row.id),
      openedReveal: openedIds.has(row.id),
      status: row.status,
      revealsAt: row.reveals_at,
    })),
    openedRevealIds: openedIds,
  });
}

export async function getDailyRoundProgressByMarshmallowId(
  marshmallowId: string,
  topicNameById: ReadonlyMap<string, string>,
): Promise<DailyRoundProgress | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("marshmallows")
    .select("daily_round_id")
    .eq("id", marshmallowId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!data?.daily_round_id) {
    return null;
  }

  return loadDailyRoundProgress(data.daily_round_id, topicNameById);
}

export async function getDailyRoundReveal(
  roundId: string,
): Promise<{
  progress: DailyRoundProgress;
  reveals: DailyRoundQuestionReveal[];
  summary: DailyRoundSummary;
} | null> {
  const supabase = await createSupabaseServerClient();
  const { data: topics } = await supabase.from("topics").select("id, name");
  const topicNameById = new Map((topics ?? []).map((row) => [row.id, row.name]));
  const progress = await loadDailyRoundProgress(roundId, topicNameById);
  if (!progress || !progress.allRevealed) {
    return null;
  }

  const ids = progress.questions.map((q) => q.id);
  const [
    { data: entries },
    { data: choices },
    { data: scores },
    { data: allScoresBefore },
  ] = await Promise.all([
    supabase
      .from("entries")
      .select("marshmallow_id, own_choice_id, entry_allocations(choice_id, predicted_pct)")
      .in("marshmallow_id", ids),
    supabase
      .from("marshmallow_choices")
      .select("id, marshmallow_id, label, sort_order")
      .in("marshmallow_id", ids),
    supabase.from("scores").select("marshmallow_id, accuracy").in("marshmallow_id", ids),
    supabase.from("scores").select("accuracy, marshmallow_id"),
  ]);

  const reveals: DailyRoundQuestionReveal[] = [];

  for (const question of progress.questions) {
    const entry = (entries ?? []).find((row) => row.marshmallow_id === question.id);
    const questionChoices = (choices ?? []).filter((row) => row.marshmallow_id === question.id);
    const ownChoice = questionChoices.find((row) => row.id === entry?.own_choice_id);
    const predictedPct =
      entry?.entry_allocations?.find((row) => row.choice_id === entry.own_choice_id)
        ?.predicted_pct ?? null;

    const { data: resultRows } = await supabase.rpc("get_marshmallow_results", {
      p_marshmallow_id: question.id,
    });
    const sortedChoices = [...questionChoices].sort(
      (a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order,
    ) as PlayChoice[];
    const leader = [...(resultRows ?? [])].sort(
      (a, b) => Number(b.vote_pct) - Number(a.vote_pct),
    )[0];
    const crowdPct = Number(leader?.vote_pct ?? 0);
    const crowdLabel =
      sortedChoices.find((choice) => choice.id === leader?.choice_id)?.label ?? "";
    const { errorCopy } = questionRevealSummary(predictedPct, crowdPct);
    const accuracy = (scores ?? []).find((row) => row.marshmallow_id === question.id)?.accuracy ?? null;

    reveals.push({
      id: question.id,
      question: question.question,
      position: question.position,
      ownChoiceLabel: ownChoice?.label ?? null,
      predictedPct,
      crowdPct,
      crowdLabel,
      errorCopy,
      accuracy,
    });
  }

  const roundScoreIds = new Set(ids);
  const before = (allScoresBefore ?? [])
    .filter((row) => !roundScoreIds.has(row.marshmallow_id))
    .map((row) => row.accuracy);
  const after = (allScoresBefore ?? []).map((row) => row.accuracy);
  const crowdsenseAfter = crowdsenseFromScores(after);
  const crowdsenseBefore = crowdsenseFromScores(before);

  return {
    progress,
    reveals,
    summary: dailyRoundSummary(reveals, crowdsenseAfter.rating, crowdsenseDelta(crowdsenseBefore, crowdsenseAfter)),
  };
}

export async function getDailyRoundProgressById(
  roundId: string,
): Promise<DailyRoundProgress | null> {
  const supabase = await createSupabaseServerClient();
  const { data: topics } = await supabase.from("topics").select("id, name");
  const topicNameById = new Map((topics ?? []).map((row) => [row.id, row.name]));
  return loadDailyRoundProgress(roundId, topicNameById);
}
