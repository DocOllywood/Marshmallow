import { topicMatchesInterests, type TopicRow } from "@/domain/onboarding/topics";
import type { NextPickContext, PlayMode } from "@/domain/play/mode";
import { compareQuickPriority, isPromotedQuick } from "@/domain/play/rotation";

export type NextCandidate = {
  id: string;
  status: string;
  is_daily: boolean;
  play_mode?: PlayMode | string | null;
  topic_id: string | null;
  quick_priority?: number | null;
  opens_at?: string | null;
  closes_at?: string | null;
  cancelled_at?: string | null;
};

export function isCurrentlyPlayable(item: NextCandidate, nowMs: number): boolean {
  if (item.status !== "open") return false;
  if (item.cancelled_at) return false;
  if (item.opens_at) {
    const opens = Date.parse(item.opens_at);
    if (!Number.isNaN(opens) && nowMs < opens) return false;
  }
  if (item.closes_at) {
    const closes = Date.parse(item.closes_at);
    if (!Number.isNaN(closes) && nowMs >= closes) return false;
  }
  return true;
}

function modeOf(item: NextCandidate): PlayMode {
  if (item.play_mode === "quick" || item.play_mode === "live" || item.play_mode === "daily") {
    return item.play_mode;
  }
  return item.is_daily ? "daily" : "live";
}

export function pickNextMarshmallowId(
  currentId: string,
  candidates: readonly NextCandidate[],
  sealedIds: ReadonlySet<string>,
  topics: readonly TopicRow[],
  interestIds: readonly string[],
  context: NextPickContext = "after_other_reveal",
  nowMs = Date.now(),
): string | null {
  const open = candidates.filter(
    (item) =>
      item.id !== currentId &&
      !sealedIds.has(item.id) &&
      isCurrentlyPlayable(item, nowMs),
  );

  const byMode = (mode: PlayMode) => open.find((item) => modeOf(item) === mode);
  const pickQuick = () => {
    const quicks = open.filter((item) => modeOf(item) === "quick");
    const promoted = quicks
      .filter((item) => isPromotedQuick(item.quick_priority))
      .sort(compareQuickPriority);
    return promoted[0] ?? quicks[0];
  };
  const openQuickCount = open.filter((item) => modeOf(item) === "quick").length;
  const interests = new Set(interestIds);
  const matched = open.find((item) =>
    topicMatchesInterests(item.topic_id, topics, interests),
  );

  if (context === "after_quick_seal" || context === "after_quick_reveal" || context === "first_session") {
    // Do not promise Quick chaining when this is the last open Quick.
    const quick = openQuickCount > 0 ? pickQuick() : undefined;
    return quick?.id ?? byMode("daily")?.id ?? byMode("live")?.id ?? matched?.id ?? open[0]?.id ?? null;
  }

  return pickQuick()?.id ?? byMode("live")?.id ?? matched?.id ?? open[0]?.id ?? null;
}

export function nextMarshmallowHref(id: string | null): string {
  return id ? `/m/${id}` : "/home";
}

export function isPlayableNextHref(href: string | null | undefined): boolean {
  return Boolean(href && href.startsWith("/m/"));
}
