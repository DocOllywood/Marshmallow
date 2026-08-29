import "server-only";

import {
  parseDailyRoundExperimentMetadata,
  parseExperimentArchetype,
} from "@/domain/daily/experiment";
import type { ScheduledExperimentPreview } from "@/domain/daily/scheduled-preview";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getNextScheduledExperimentPreview(): Promise<ScheduledExperimentPreview | null> {
  const supabase = await createSupabaseServerClient();
  const now = new Date().toISOString();

  const { data: marshmallows, error: marshmallowError } = await supabase
    .from("marshmallows")
    .select("opens_at, daily_round_id")
    .eq("round_position", 1)
    .eq("status", "scheduled")
    .gt("opens_at", now)
    .order("opens_at", { ascending: true })
    .limit(8);

  if (marshmallowError) {
    throw new Error(marshmallowError.message);
  }

  const roundIds = [
    ...new Set(
      (marshmallows ?? [])
        .map((row) => row.daily_round_id)
        .filter((id): id is string => id != null),
    ),
  ];

  if (roundIds.length === 0) {
    return null;
  }

  const { data: rounds, error: roundError } = await supabase
    .from("daily_rounds")
    .select("id, status, metadata")
    .in("id", roundIds);

  if (roundError) {
    throw new Error(roundError.message);
  }

  const roundById = new Map((rounds ?? []).map((round) => [round.id, round]));

  for (const row of marshmallows ?? []) {
    if (!row.daily_round_id) {
      continue;
    }

    const round = roundById.get(row.daily_round_id);
    if (!round || (round.status !== "scheduled" && round.status !== "open")) {
      continue;
    }

    const experiment = parseDailyRoundExperimentMetadata(round.metadata);
    if (experiment?.version !== 1) {
      continue;
    }

    return {
      roundId: row.daily_round_id,
      opensAt: row.opens_at,
      archetype: parseExperimentArchetype(round.metadata),
    };
  }

  return null;
}
