import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isDiscoverable, isProminentLive } from "@/domain/content/schedule";
import { isConsumerPlayableInventory } from "@/domain/content/inventory";
import { isPromotedQuick, compareQuickPriority } from "@/domain/play/rotation";
import {
  CONSUMER_QUICK_FALLBACK,
  HOME_COOKING_VISIBLE,
  HOME_RECENT_VISIBLE,
} from "@/domain/play/sample";
import type { TopicRow } from "@/domain/onboarding/topics";
import type { Database } from "@/lib/supabase/types";

type MarshmallowRow = Pick<
  Database["public"]["Tables"]["marshmallows"]["Row"],
  | "id"
  | "question"
  | "topic_id"
  | "opens_at"
  | "closes_at"
  | "reveals_at"
  | "hard_reveals_at"
  | "status"
  | "is_daily"
  | "play_mode"
  | "quick_priority"
>;

export type HomeFeedCard = MarshmallowRow & {
  topicName: string | null;
  sealed: boolean;
  hasDraft: boolean;
  openedReveal: boolean;
  ownChoiceLabel: string | null;
  predictedPct: number | null;
  distributionSummary: string | null;
  accuracy: number | null;
  openedAt: string | null;
  entityLabel: string | null;
  spoilerContext: string | null;
  imageUrl: string | null;
  expiresAt: string | null;
};

export type HomeFeed = {
  readyToReveal: HomeFeedCard[];
  quickPlay: HomeFeedCard[];
  liveNow: HomeFeedCard[];
  todays: HomeFeedCard | null;
  cooking: HomeFeedCard[];
  waiting: HomeFeedCard[];
  openNow: HomeFeedCard[];
  recent: HomeFeedCard[];
  hasInterests: boolean;
};

export async function getHomeFeed(
  topics: readonly TopicRow[],
  interestIds: readonly string[],
): Promise<HomeFeed> {
  const supabase = await createSupabaseServerClient();
  const interests = new Set(interestIds);

  const { data: marshmallows, error: marshmallowError } = await supabase
    .from("marshmallows")
    .select(
      "id, question, topic_id, opens_at, closes_at, reveals_at, hard_reveals_at, status, is_daily, play_mode, quick_priority, entity_label, spoiler_context, image_url, expires_at, marshmallow_choices(id, label)",
    )
    .in("status", ["open", "closed", "revealed", "cancelled"])
    .order("reveals_at", { ascending: false });

  if (marshmallowError) {
    throw new Error(marshmallowError.message);
  }

  const [{ data: entries, error: entryError }, { data: opens, error: openError }, { data: scores, error: scoreError }] =
    await Promise.all([
      supabase
        .from("entries")
        .select(
          "marshmallow_id, sealed_at, own_choice_id, entry_allocations(choice_id, predicted_pct)",
        ),
      supabase.from("reveal_opens").select("marshmallow_id, opened_at"),
      supabase.from("scores").select("marshmallow_id, accuracy"),
    ]);

  if (entryError) {
    throw new Error(entryError.message);
  }
  if (openError) {
    throw new Error(openError.message);
  }
  if (scoreError) {
    throw new Error(scoreError.message);
  }

  const entryByMarshmallow = new Map((entries ?? []).map((row) => [row.marshmallow_id, row]));
  const openByMarshmallow = new Map((opens ?? []).map((row) => [row.marshmallow_id, row]));
  const scoreByMarshmallow = new Map((scores ?? []).map((row) => [row.marshmallow_id, row]));
  const topicName = new Map(topics.map((topic) => [topic.id, topic.name]));
  const topicImage = new Map(topics.map((topic) => [topic.id, topic.image_url]));

  const cards: HomeFeedCard[] = (marshmallows ?? []).map((row) => {
    const entry = entryByMarshmallow.get(row.id);
    const choices = row.marshmallow_choices ?? [];
    const ownChoice = choices.find((choice) => choice.id === entry?.own_choice_id);
    const predicted =
      entry?.entry_allocations?.find((item) => item.choice_id === entry.own_choice_id)
        ?.predicted_pct ?? null;
    const distributionSummary =
      (entry?.entry_allocations ?? [])
        .map((item) => {
          const label = choices.find((choice) => choice.id === item.choice_id)?.label;
          return label ? `${label} ${item.predicted_pct}%` : null;
        })
        .filter((value): value is string => value != null)
        .join(" · ") || null;
    return {
      id: row.id,
      question: row.question,
      topic_id: row.topic_id,
      opens_at: row.opens_at,
      closes_at: row.closes_at,
      reveals_at: row.reveals_at,
      hard_reveals_at: row.hard_reveals_at,
      status: row.status,
      is_daily: row.is_daily,
      play_mode: row.play_mode,
      quick_priority: row.quick_priority,
      topicName: row.topic_id ? (topicName.get(row.topic_id) ?? null) : null,
      entityLabel: row.entity_label,
      spoilerContext: row.spoiler_context,
      imageUrl: row.image_url ?? (row.topic_id ? topicImage.get(row.topic_id) ?? null : null),
      expiresAt: row.expires_at,
      sealed: entry?.sealed_at != null,
      hasDraft: entry != null && entry.sealed_at == null,
      openedReveal: openByMarshmallow.has(row.id),
      ownChoiceLabel: ownChoice?.label ?? null,
      predictedPct: predicted,
      distributionSummary,
      accuracy: scoreByMarshmallow.get(row.id)?.accuracy ?? null,
      openedAt: openByMarshmallow.get(row.id)?.opened_at ?? null,
    };
  });

  const nowMs = Date.now();
  const leaked = JSON.stringify(cards);
  if (
    leaked.includes("vote_count") ||
    leaked.includes("vote_pct") ||
    leaked.includes("total_sealed_votes")
  ) {
    throw new Error("home_payload_leaked_aggregates");
  }

  const todays =
    cards.find((card) => card.is_daily && card.status === "open") ??
    cards.find(
      (card) =>
        card.is_daily &&
        card.sealed &&
        card.status === "closed",
    ) ??
    cards.find(
      (card) =>
        card.is_daily &&
        card.sealed &&
        card.status === "revealed" &&
        !card.openedReveal,
    ) ??
    null;

  const readyToReveal = cards.filter(
    (card) =>
      card.sealed &&
      card.status === "revealed" &&
      !card.openedReveal &&
      card.id !== todays?.id,
  );
  const waiting = cards.filter(
    (card) =>
      card.sealed &&
      (card.status === "open" || card.status === "closed") &&
      card.id !== todays?.id,
  );
  const readyIds = new Set(readyToReveal.map((card) => card.id));
  const cooking = waiting;
  const quickCandidates = cards
    .filter(
      (card) =>
        card.play_mode === "quick" &&
        card.status === "open" &&
        !card.sealed &&
        card.id !== todays?.id &&
        isDiscoverable({
          nowMs,
          expiresAtMs: card.expiresAt ? Date.parse(card.expiresAt) : null,
          sealed: card.sealed,
        }) &&
        isConsumerPlayableInventory(card),
    )
    .sort((a, b) => {
      const byPriority = compareQuickPriority(a, b);
      if (byPriority !== 0) return byPriority;
      return Date.parse(a.opens_at) - Date.parse(b.opens_at);
    });
  const promotedQuick = quickCandidates.filter((card) => isPromotedQuick(card.quick_priority));
  const quickPlay =
    promotedQuick.length > 0
      ? promotedQuick
      : quickCandidates.slice(0, CONSUMER_QUICK_FALLBACK);
  const liveNow = cards
    .filter(
      (card) =>
        card.play_mode === "live" &&
        card.status === "open" &&
        !card.sealed &&
        card.id !== todays?.id &&
        isProminentLive(card) &&
        isDiscoverable({
          nowMs,
          expiresAtMs: card.expiresAt ? Date.parse(card.expiresAt) : null,
          sealed: card.sealed,
        }) &&
        isConsumerPlayableInventory(card),
    )
    .slice(0, 2);
  const recent = cards.filter(
    (card) =>
      (card.status === "cancelled" && card.sealed) ||
      (card.status === "revealed" &&
        card.sealed &&
        card.openedReveal &&
        card.id !== todays?.id &&
        !readyIds.has(card.id)),
  );

  return {
    readyToReveal,
    quickPlay,
    liveNow,
    todays,
    cooking: cooking.slice(0, HOME_COOKING_VISIBLE),
    waiting: waiting.slice(0, HOME_COOKING_VISIBLE),
    openNow: [],
    recent: recent.slice(0, HOME_RECENT_VISIBLE),
    hasInterests: interests.size > 0,
  };
}

export async function getReadyRevealCount(): Promise<number> {
  const supabase = await createSupabaseServerClient();
  const [
    { data: entries, error: entryError },
    { data: opens, error: openError },
    { data: revealed, error: revealedError },
  ] = await Promise.all([
    supabase.from("entries").select("marshmallow_id, sealed_at"),
    supabase.from("reveal_opens").select("marshmallow_id"),
    supabase.from("marshmallows").select("id").eq("status", "revealed"),
  ]);
  if (entryError) throw new Error(entryError.message);
  if (openError) throw new Error(openError.message);
  if (revealedError) throw new Error(revealedError.message);

  const revealedIds = new Set((revealed ?? []).map((row) => row.id));
  const opened = new Set((opens ?? []).map((row) => row.marshmallow_id));
  return (entries ?? []).filter(
    (row) =>
      row.sealed_at != null &&
      revealedIds.has(row.marshmallow_id) &&
      !opened.has(row.marshmallow_id),
  ).length;
}
