import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  CROWDSENSE_QUALIFYING_SCORES,
  CROWDSENSE_WORLD_LABELS,
  CROWDSENSE_WORLD_SLUGS,
  adjustedAccuracy,
  crowdsenseDelta,
  crowdsenseFromScores,
  mapAdjustedToRating,
  type CrowdsenseSnapshot,
  type CrowdsenseWorldSlug,
} from "@/domain/crowdsense/rating";

export type IdentityChip = {
  rating: number | null;
  qualified: boolean;
  remaining: number;
  scoredCount: number;
  revealStreak: number;
};

export type OwnProfilePayload = {
  username: string;
  displayName: string;
  crowdsense: CrowdsenseSnapshot;
  averageAccuracy: number | null;
  revealStreak: number;
  revealLongest: number;
  playStreak: number;
  playLongest: number;
  revealBonusesEarned: number;
  categories: {
    slug: CrowdsenseWorldSlug;
    name: string;
    scoredCount: number;
    rating: number | null;
    qualified: boolean;
  }[];
  recent: {
    question: string;
    accuracy: number;
    topicName: string | null;
    revealedAt: string;
  }[];
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function snapshotFromTotals(count: number, accuracySum: number): CrowdsenseSnapshot {
  if (count <= 0) {
    return crowdsenseFromScores([]);
  }
  const adjusted = adjustedAccuracy(accuracySum, count);
  const qualified = count >= CROWDSENSE_QUALIFYING_SCORES;
  return {
    count,
    accuracySum,
    rawAverage: accuracySum / count,
    adjustedAccuracy: adjusted,
    rating: qualified ? mapAdjustedToRating(adjusted) : null,
    qualified,
    remainingToQualify: Math.max(0, CROWDSENSE_QUALIFYING_SCORES - count),
  };
}

export async function getIdentityChip(): Promise<IdentityChip> {
  const supabase = await createSupabaseServerClient();
  const [{ data: overall }, { data: streak }] = await Promise.all([
    supabase
      .from("crowdsense_ratings")
      .select("scored_count, rating, qualified")
      .is("category_id", null)
      .maybeSingle(),
    supabase.from("streaks").select("reveal_current").maybeSingle(),
  ]);
  const scoredCount = overall?.scored_count ?? 0;
  return {
    rating: overall?.qualified ? (overall.rating ?? null) : null,
    qualified: overall?.qualified ?? false,
    remaining: Math.max(0, CROWDSENSE_QUALIFYING_SCORES - scoredCount),
    scoredCount,
    revealStreak: streak?.reveal_current ?? 0,
  };
}

export async function getOwnProfilePayload(
  username: string,
  displayName: string,
): Promise<OwnProfilePayload> {
  const supabase = await createSupabaseServerClient();
  const [{ data: ratings }, { data: streak }, { data: recentScores }, bonusCount, { data: worlds }] =
    await Promise.all([
      supabase
        .from("crowdsense_ratings")
        .select("category_id, scored_count, accuracy_sum, rating, qualified"),
      supabase
        .from("streaks")
        .select("reveal_current, reveal_longest, play_current, play_longest")
        .maybeSingle(),
      supabase
        .from("scores")
        .select("accuracy, calculated_at, marshmallows(question, reveals_at, topics(name))")
        .order("calculated_at", { ascending: false })
        .limit(8),
      supabase
        .from("reveal_opens")
        .select("id", { count: "exact", head: true })
        .eq("reveal_bonus_earned", true)
        .then((result) => result.count ?? 0),
      supabase.from("topics").select("id, slug").in("slug", [...CROWDSENSE_WORLD_SLUGS]),
    ]);

  const overall = (ratings ?? []).find((row) => row.category_id == null);
  const crowdsense = snapshotFromTotals(overall?.scored_count ?? 0, overall?.accuracy_sum ?? 0);
  if (overall?.qualified && overall.rating != null) {
    crowdsense.rating = overall.rating;
  }

  const categories = CROWDSENSE_WORLD_SLUGS.map((slug) => {
    const topic = (worlds ?? []).find((row) => row.slug === slug);
    const row = (ratings ?? []).find((item) => item.category_id === topic?.id);
    return {
      slug,
      name: CROWDSENSE_WORLD_LABELS[slug],
      scoredCount: row?.scored_count ?? 0,
      rating: row?.qualified ? (row.rating ?? null) : null,
      qualified: row?.qualified ?? false,
    };
  });

  return {
    username,
    displayName,
    crowdsense,
    averageAccuracy: crowdsense.rawAverage,
    revealStreak: streak?.reveal_current ?? 0,
    revealLongest: streak?.reveal_longest ?? 0,
    playStreak: streak?.play_current ?? 0,
    playLongest: streak?.play_longest ?? 0,
    revealBonusesEarned: bonusCount,
    categories,
    recent: (recentScores ?? []).map((row) => {
      const marshmallow = Array.isArray(row.marshmallows) ? row.marshmallows[0] : row.marshmallows;
      const topic = marshmallow
        ? Array.isArray(marshmallow.topics)
          ? marshmallow.topics[0]
          : marshmallow.topics
        : null;
      return {
        question: marshmallow?.question ?? "Marshmallow",
        accuracy: row.accuracy,
        topicName: topic?.name ?? null,
        revealedAt: marshmallow?.reveals_at ?? row.calculated_at,
      };
    }),
  };
}

export async function getPublicPlayer(username: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("get_public_player", {
    p_username: username,
  });
  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    return null;
  }
  const row = asRecord(data);
  return {
    username: String(row.username ?? ""),
    displayName: String(row.display_name ?? ""),
    crowdsense: row.crowdsense == null ? null : Number(row.crowdsense),
    qualified: Boolean(row.qualified),
    scoredCount: Number(row.scored_count ?? 0),
    revealStreak: Number(row.reveal_streak ?? 0),
    categories: Array.isArray(row.categories)
      ? row.categories.map((item) => {
          const cat = asRecord(item);
          return {
            slug: String(cat.slug ?? ""),
            name: String(cat.name ?? ""),
            rating: cat.qualified ? Number(cat.rating) : null,
            qualified: Boolean(cat.qualified),
            scoredCount: Number(cat.scored_count ?? 0),
          };
        })
      : [],
    recent: Array.isArray(row.recent)
      ? row.recent.map((item) => {
          const rec = asRecord(item);
          return {
            question: String(rec.question ?? ""),
            accuracy: Number(rec.accuracy ?? 0),
            topicName: rec.topic_name == null ? null : String(rec.topic_name),
            revealedAt: String(rec.revealed_at ?? ""),
          };
        })
      : [],
  };
}

export async function getLeaderboard(board: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("get_leaderboard", { p_board: board });
  if (error) {
    throw new Error(error.message);
  }
  const row = asRecord(data);
  const viewer = asRecord(row.viewer);
  return {
    board: String(row.board ?? board),
    weekStart: String(row.week_start ?? ""),
    population: Number(row.population ?? 0),
    rows: Array.isArray(row.rows)
      ? row.rows.map((item) => {
          const entry = asRecord(item);
          return {
            username: String(entry.username ?? ""),
            displayName: String(entry.display_name ?? ""),
            rating: Number(entry.rating ?? 0),
            scoredCount: Number(entry.scored_count ?? 0),
            rank: Number(entry.rank ?? 0),
          };
        })
      : [],
    viewer: {
      scoredCount: Number(viewer.scored_count ?? 0),
      qualified: Boolean(viewer.qualified),
      rating: viewer.rating == null ? null : Number(viewer.rating),
      rank: viewer.rank == null ? null : Number(viewer.rank),
      remaining: Number(viewer.remaining ?? 0),
    },
  };
}

export function crowdsenseRevealDelta(allAccuracies: readonly number[], marshmallowAccuracy: number) {
  const lastIndex = allAccuracies.lastIndexOf(marshmallowAccuracy);
  const previous = allAccuracies.filter((_, index) => index !== lastIndex);
  const before = crowdsenseFromScores(previous);
  const after = crowdsenseFromScores(allAccuracies);
  return {
    rating: after.rating,
    delta: crowdsenseDelta(before, after),
    count: after.count,
  };
}
