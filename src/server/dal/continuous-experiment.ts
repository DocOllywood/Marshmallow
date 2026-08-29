import "server-only";

import { cookies } from "next/headers";

import {
  continuousCatalogEntry,
  CONTINUOUS_EXPERIMENT_CATALOG,
} from "@/domain/content/continuous-experiments";
import { isDailyRoundVisibleOnHome } from "@/domain/daily/round";
import {
  continuousCurrentPlayMarshmallowId,
  isContinuousRoundComplete,
  isContinuousRoundPlayableNow,
  pickEligibleContinuousRoundId,
  type ContinuousRoundMarshmallow,
} from "@/domain/play/continuous";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { RETURN_PATH_COOKIE, consumeReturnPath } from "@/server/dal/notify-share";
import { getTodayDailyRoundProgress } from "@/server/dal/daily-round";
import { listActiveTopics } from "@/server/dal/topics";

export type ContinuousExperimentOffer = {
  roundId: string;
  title: string;
  subtitle: string | null;
  homeHeadline: string;
  homeTeaser: string;
  playHref: string;
  archetype: "default" | "price";
  sealedCount: number;
  inProgress: boolean;
};

export type ContinuousCaughtUp = {
  nextDailyOpensAt: string | null;
};

export type LandingPlayContext = {
  ctaLabel: string;
  hasPlayableDaily: boolean;
  hasContinuousInventory: boolean;
};

async function loadContinuousRoundData(): Promise<{
  marshmallowsByRound: Map<string, ContinuousRoundMarshmallow[]>;
  userStates: Map<string, { sealedMarshmallowIds: Set<string>; sealedCount: number }>;
}> {
  const supabase = await createSupabaseServerClient();
  const roundIds = CONTINUOUS_EXPERIMENT_CATALOG.map((entry) => entry.roundId);

  const [{ data: marshmallows, error: marshmallowError }, { data: entries, error: entryError }] =
    await Promise.all([
      supabase
        .from("marshmallows")
        .select("id, daily_round_id, round_position, status, opens_at, closes_at")
        .in("daily_round_id", roundIds)
        .order("round_position", { ascending: true }),
      supabase.from("entries").select("marshmallow_id, sealed_at"),
    ]);

  if (marshmallowError) throw new Error(marshmallowError.message);
  if (entryError) throw new Error(entryError.message);

  const sealedIds = new Set(
    (entries ?? []).filter((row) => row.sealed_at != null).map((row) => row.marshmallow_id),
  );

  const marshmallowsByRound = new Map<string, ContinuousRoundMarshmallow[]>();
  for (const row of marshmallows ?? []) {
    if (!row.daily_round_id || row.round_position == null) continue;
    const list = marshmallowsByRound.get(row.daily_round_id) ?? [];
    list.push({
      id: row.id,
      dailyRoundId: row.daily_round_id,
      roundPosition: row.round_position,
      status: row.status,
      opensAt: row.opens_at,
      closesAt: row.closes_at,
    });
    marshmallowsByRound.set(row.daily_round_id, list);
  }

  const userStates = new Map<string, { sealedMarshmallowIds: Set<string>; sealedCount: number }>();
  for (const roundId of roundIds) {
    const roundMarshmallows = marshmallowsByRound.get(roundId) ?? [];
    const roundSealed = new Set(
      roundMarshmallows.filter((item) => sealedIds.has(item.id)).map((item) => item.id),
    );
    userStates.set(roundId, {
      sealedMarshmallowIds: roundSealed,
      sealedCount: roundSealed.size,
    });
  }

  return { marshmallowsByRound, userStates };
}

async function buildOfferForRound(
  roundId: string,
  marshmallowsByRound: Map<string, ContinuousRoundMarshmallow[]>,
  sealedMarshmallowIds: Set<string>,
): Promise<ContinuousExperimentOffer | null> {
  const catalog = continuousCatalogEntry(roundId);
  if (!catalog) return null;

  const marshmallows = marshmallowsByRound.get(roundId);
  if (!marshmallows || !isContinuousRoundPlayableNow(marshmallows)) return null;
  if (isContinuousRoundComplete(marshmallows, sealedMarshmallowIds)) return null;

  const playId = continuousCurrentPlayMarshmallowId(marshmallows, sealedMarshmallowIds);
  if (!playId) return null;

  const supabase = await createSupabaseServerClient();
  const { data: round, error } = await supabase
    .from("daily_rounds")
    .select("title, subtitle, metadata")
    .eq("id", roundId)
    .maybeSingle();

  if (error) throw new Error(error.message);

  const sealedCount = marshmallows.filter((item) => sealedMarshmallowIds.has(item.id)).length;

  return {
    roundId,
    title: round?.title ?? catalog.homeHeadline,
    subtitle: round?.subtitle ?? catalog.homeTeaser,
    homeHeadline: catalog.homeHeadline,
    homeTeaser: catalog.homeTeaser,
    playHref: `/m/${playId}`,
    archetype: catalog.archetype,
    sealedCount,
    inProgress: sealedCount > 0,
  };
}

export async function getContinuousExperimentOffer(
  excludeRoundIds: readonly string[] = [],
): Promise<ContinuousExperimentOffer | null> {
  const { marshmallowsByRound, userStates } = await loadContinuousRoundData();
  const roundId = pickEligibleContinuousRoundId({
    marshmallowsByRound,
    userStates: new Map(
      [...userStates.entries()].map(([id, state]) => [
        id,
        {
          roundId: id,
          sealedCount: state.sealedCount,
          sealedMarshmallowIds: state.sealedMarshmallowIds,
        },
      ]),
    ),
    excludeRoundIds,
  });

  if (!roundId) return null;

  const state = userStates.get(roundId);
  return buildOfferForRound(roundId, marshmallowsByRound, state?.sealedMarshmallowIds ?? new Set());
}

export async function getNextContinuousPlayHrefAfter(
  completedRoundId: string,
): Promise<string | null> {
  const offer = await getContinuousExperimentOffer([completedRoundId]);
  return offer?.playHref ?? null;
}

export async function isContinuousInventoryExhausted(): Promise<boolean> {
  const { marshmallowsByRound, userStates } = await loadContinuousRoundData();
  const anyPlayable = CONTINUOUS_EXPERIMENT_CATALOG.some((entry) => {
    const marshmallows = marshmallowsByRound.get(entry.roundId);
    if (!marshmallows || !isContinuousRoundPlayableNow(marshmallows)) return false;
    const sealed = userStates.get(entry.roundId)?.sealedMarshmallowIds ?? new Set<string>();
    return !isContinuousRoundComplete(marshmallows, sealed);
  });
  return !anyPlayable;
}

export async function getContinuousCaughtUp(
  nextDailyOpensAt: string | null,
): Promise<ContinuousCaughtUp | null> {
  const exhausted = await isContinuousInventoryExhausted();
  if (!exhausted) return null;
  return { nextDailyOpensAt };
}

export async function resolvePostOnboardingPlayHref(): Promise<string> {
  const jar = await cookies();
  if (jar.get(RETURN_PATH_COOKIE)?.value) {
    return consumeReturnPath();
  }

  const topics = await listActiveTopics();
  const topicName = new Map(topics.map((topic) => [topic.id, topic.name]));
  const daily = await getTodayDailyRoundProgress(topicName);

  if (daily && isDailyRoundVisibleOnHome(daily) && daily.currentPlayId) {
    return `/m/${daily.currentPlayId}`;
  }

  const continuous = await getContinuousExperimentOffer();
  if (continuous) {
    return continuous.playHref;
  }

  return "/home";
}

export async function getLandingPlayContext(): Promise<LandingPlayContext> {
  const topics = await listActiveTopics();
  const topicName = new Map(topics.map((topic) => [topic.id, topic.name]));
  const daily = await getTodayDailyRoundProgress(topicName);
  const hasPlayableDaily =
    daily != null &&
    isDailyRoundVisibleOnHome(daily) &&
    daily.questions.some((question) => question.status === "open");

  const continuous = await getContinuousExperimentOffer();
  const hasContinuousInventory = continuous != null;

  let ctaLabel = "GET STARTED";
  if (hasPlayableDaily) {
    ctaLabel = "PLAY TODAY'S EXPERIMENT";
  } else if (hasContinuousInventory) {
    ctaLabel = "START AN EXPERIMENT";
  }

  return { ctaLabel, hasPlayableDaily, hasContinuousInventory };
}

export async function getFeaturedDailyRoundIdForSurface(): Promise<string | null> {
  const topics = await listActiveTopics();
  const topicName = new Map(topics.map((topic) => [topic.id, topic.name]));
  const daily = await getTodayDailyRoundProgress(topicName);
  if (daily && isDailyRoundVisibleOnHome(daily)) {
    return daily.roundId;
  }
  return null;
}
