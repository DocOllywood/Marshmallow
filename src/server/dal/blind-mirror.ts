import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  findBlindMirrorPair,
  type BlindMirrorComparison,
  type BlindMirrorRoundSnapshot,
} from "@/domain/daily/blind-mirror";
import { isExperimentDailyRound, resolveMarshmallowExperimentMetadata } from "@/domain/daily/experiment";
import { mapBeliefPrinciple, parseExperimentContext } from "@/domain/daily/principle";
import { mapHumanTension, parseTensionSide } from "@/domain/daily/tension";
import type { TrajectoryInputStage } from "@/domain/daily/trajectory";
import { DAILY_ROUND_SIZE } from "@/domain/daily/round";

export type { BlindMirrorComparison };

const ROUND_SELECT =
  "id, round_date, title, principle_id, metadata, human_tensions (id, slug, left_label, right_label, display_label), belief_principles (id, slug, display_name, description)";

type RoundRow = {
  id: string;
  round_date: string;
  title: string;
  principle_id: string | null;
  metadata: unknown;
  human_tensions: {
    id: string;
    slug: string;
    left_label: string;
    right_label: string;
    display_label: string;
  } | null;
  belief_principles: {
    id: string;
    slug: string;
    display_name: string;
    description: string | null;
  } | null;
};

async function buildRoundSnapshot(
  round: RoundRow,
  userId: string,
): Promise<BlindMirrorRoundSnapshot | null> {
  const tension = round.human_tensions ? mapHumanTension(round.human_tensions) : null;
  const context = parseExperimentContext(round.metadata);
  if (!tension || !context) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const { data: marshmallows } = await supabase
    .from("marshmallows")
    .select("id, is_line, round_position, metadata")
    .eq("daily_round_id", round.id)
    .order("round_position", { ascending: true });

  const ids = (marshmallows ?? []).map((row) => row.id);
  if (ids.length < DAILY_ROUND_SIZE) {
    return null;
  }

  const [{ data: entries }, { data: choices }] = await Promise.all([
    supabase
      .from("entries")
      .select("marshmallow_id, own_choice_id")
      .eq("user_id", userId)
      .in("marshmallow_id", ids)
      .not("sealed_at", "is", null),
    supabase
      .from("marshmallow_choices")
      .select("id, marshmallow_id, label, metadata")
      .in("marshmallow_id", ids),
  ]);

  if ((entries ?? []).length < DAILY_ROUND_SIZE) {
    return null;
  }

  const choiceById = new Map((choices ?? []).map((row) => [row.id, row] as const));
  const entryByMarshmallowId = new Map(
    (entries ?? []).map((row) => [row.marshmallow_id, row] as const),
  );
  const marshmallowById = new Map((marshmallows ?? []).map((row) => [row.id, row]));

  const trajectoryInputs: TrajectoryInputStage[] = ids
    .map((marshmallowId) => {
      const marshmallow = marshmallowById.get(marshmallowId);
      const entry = entryByMarshmallowId.get(marshmallowId);
      const choice = entry?.own_choice_id ? choiceById.get(entry.own_choice_id) : null;
      const experiment = resolveMarshmallowExperimentMetadata({
        metadata: marshmallow?.metadata,
        roundMetadata: round.metadata,
        roundPosition: marshmallow?.round_position ?? null,
        isLine: marshmallow?.is_line ?? false,
      });

      return {
        stage: experiment?.stage ?? "instinct",
        position: marshmallow?.round_position ?? 0,
        choiceLabel: choice?.label ?? null,
        tensionSide: choice ? parseTensionSide(choice.metadata) : null,
        pressureType: experiment?.pressureType ?? null,
        isLine: marshmallow?.is_line ?? false,
      };
    })
    .filter((item) => item.choiceLabel != null);

  if (trajectoryInputs.length < DAILY_ROUND_SIZE) {
    return null;
  }

  return {
    roundId: round.id,
    roundDate: round.round_date,
    context,
    trajectoryInputs,
    tension,
  };
}

export async function getBlindMirrorComparisonForRound(
  roundId: string,
): Promise<BlindMirrorComparison | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: currentRound, error: currentError } = await supabase
    .from("daily_rounds")
    .select(ROUND_SELECT)
    .eq("id", roundId)
    .maybeSingle();

  if (currentError) {
    throw new Error(currentError.message);
  }
  if (!currentRound?.principle_id || !currentRound.belief_principles) {
    return null;
  }
  if (!isExperimentDailyRound(currentRound.metadata)) {
    return null;
  }

  const principle = mapBeliefPrinciple(currentRound.belief_principles);
  const currentSnapshot = await buildRoundSnapshot(currentRound as RoundRow, user.id);
  if (!currentSnapshot) {
    return null;
  }

  const { data: relatedRounds, error: relatedError } = await supabase
    .from("daily_rounds")
    .select(ROUND_SELECT)
    .eq("principle_id", currentRound.principle_id)
    .neq("id", roundId);

  if (relatedError) {
    throw new Error(relatedError.message);
  }

  const snapshots: BlindMirrorRoundSnapshot[] = [currentSnapshot];
  for (const row of relatedRounds ?? []) {
    if (!isExperimentDailyRound(row.metadata)) {
      continue;
    }
    const snapshot = await buildRoundSnapshot(row as RoundRow, user.id);
    if (snapshot) {
      snapshots.push(snapshot);
    }
  }

  return findBlindMirrorPair({
    principle,
    currentRoundId: roundId,
    currentRoundDate: currentRound.round_date,
    snapshots,
  });
}
