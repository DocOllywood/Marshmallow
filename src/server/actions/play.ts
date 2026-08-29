"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isValidSealDistribution } from "@/domain/play/allocations";
import { requireOnboarded } from "@/server/dal/auth";

export type PlayActionResult = {
  ok: boolean;
  error?: string;
  closed?: boolean;
  sealed?: boolean;
};

function mapPlayError(message: string): PlayActionResult {
  if (message.includes("marshmallow_not_open")) {
    return { ok: false, closed: true, error: "This Marshmallow just closed." };
  }
  if (message.includes("entry_sealed")) {
    return { ok: true, sealed: true };
  }
  if (message.includes("allocations_not_allowed")) {
    return { ok: false, error: "This question does not take a prediction." };
  }
  if (message.includes("allocations_invalid") || message.includes("own_choice_mismatch")) {
    return { ok: false, error: "That prediction isn't valid. Adjust the mix to 100%." };
  }
  if (message.includes("switch_required")) {
    return { ok: false, error: "Complete The Switch before locking." };
  }
  if (message.includes("own_choice_protected") || message.includes("switch_locked")) {
    return { ok: false, error: "Your original answer is locked in." };
  }
  if (message.includes("not_authenticated")) {
    return { ok: false, error: "Sign in to play." };
  }
  return { ok: false, error: "Could not save. Try again." };
}

export async function saveDraftPlayAction(input: {
  marshmallowId: string;
  ownChoiceId: string;
  allocations?: { choice_id: string; predicted_pct: number }[];
}): Promise<PlayActionResult> {
  await requireOnboarded();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("save_entry_draft", {
    p_marshmallow_id: input.marshmallowId,
    p_own_choice_id: input.ownChoiceId,
    p_allocations: input.allocations ?? undefined,
  });
  if (error) {
    return mapPlayError(error.message);
  }
  revalidatePath(`/m/${input.marshmallowId}`);
  revalidatePath("/home");
  return { ok: true };
}

export async function sealPickOnlyPlayAction(input: {
  marshmallowId: string;
  ownChoiceId: string;
}): Promise<PlayActionResult> {
  await requireOnboarded();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("seal_entry", {
    p_marshmallow_id: input.marshmallowId,
    p_own_choice_id: input.ownChoiceId,
    p_allocations: [],
  });
  if (error) {
    return mapPlayError(error.message);
  }
  revalidatePath(`/m/${input.marshmallowId}`);
  revalidatePath("/home");
  return { ok: true, sealed: true };
}

export async function sealPlayAction(input: {
  marshmallowId: string;
  ownChoiceId: string;
  allocations: { choice_id: string; predicted_pct: number }[];
}): Promise<PlayActionResult> {
  await requireOnboarded();
  const values = input.allocations.map((item) => item.predicted_pct);
  if (!isValidSealDistribution(values)) {
    return { ok: false, error: "Predictions must add up to 100%." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("seal_entry", {
    p_marshmallow_id: input.marshmallowId,
    p_own_choice_id: input.ownChoiceId,
    p_allocations: input.allocations,
  });
  if (error) {
    return mapPlayError(error.message);
  }
  revalidatePath(`/m/${input.marshmallowId}`);
  revalidatePath("/home");
  return { ok: true, sealed: true };
}

export async function sealLinePlayAction(input: {
  marshmallowId: string;
  ownChoiceId: string;
}): Promise<PlayActionResult> {
  await requireOnboarded();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("seal_line_entry", {
    p_marshmallow_id: input.marshmallowId,
    p_own_choice_id: input.ownChoiceId,
  });
  if (error) {
    if (error.message.includes("not_a_line_question")) {
      return { ok: false, error: "This isn't a Line question." };
    }
    return mapPlayError(error.message);
  }
  revalidatePath(`/m/${input.marshmallowId}`);
  revalidatePath("/home");

  const { experimentDaresEnabled } = await import("@/lib/env/experiment-dares");
  if (experimentDaresEnabled()) {
    const { completeExperimentDareForLine } = await import("@/server/dal/experiment-dare");
    await completeExperimentDareForLine(input.marshmallowId);
  }

  return { ok: true, sealed: true };
}

export async function saveSwitchResponseAction(input: {
  marshmallowId: string;
  switchStayed: boolean;
}): Promise<PlayActionResult> {
  await requireOnboarded();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("save_switch_response", {
    p_marshmallow_id: input.marshmallowId,
    p_switch_stayed: input.switchStayed,
  });
  if (error) {
    if (error.message.includes("pick_required")) {
      return { ok: false, error: "Pick an answer first." };
    }
    if (error.message.includes("switch_not_available")) {
      return { ok: false, error: "The Switch isn't available for this question." };
    }
    return mapPlayError(error.message);
  }
  revalidatePath(`/m/${input.marshmallowId}`);
  revalidatePath("/home");
  return { ok: true };
}

export async function openRevealAction(marshmallowId: string): Promise<PlayActionResult> {
  await requireOnboarded();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("open_reveal", {
    p_marshmallow_id: marshmallowId,
  });
  if (error) {
    if (error.message.includes("results_not_available")) {
      return { ok: false, error: "We're finishing the count." };
    }
    if (error.message.includes("no_sealed_entry")) {
      return { ok: false, error: "You didn't seal this Marshmallow." };
    }
    return mapPlayError(error.message);
  }
  revalidatePath(`/m/${marshmallowId}`);
  revalidatePath("/home");
  return { ok: true };
}

export async function openDailyRoundRevealAction(roundId: string): Promise<PlayActionResult> {
  await requireOnboarded();
  const supabase = await createSupabaseServerClient();
  const { data: questions, error: questionError } = await supabase
    .from("marshmallows")
    .select("id, status")
    .eq("daily_round_id", roundId)
    .order("round_position", { ascending: true });

  if (questionError) {
    return { ok: false, error: questionError.message };
  }

  for (const question of questions ?? []) {
    if (question.status !== "revealed") {
      return { ok: false, error: "We're finishing the count." };
    }
    const { error } = await supabase.rpc("open_reveal", {
      p_marshmallow_id: question.id,
    });
    if (error && !error.message.includes("already_opened")) {
      if (error.message.includes("results_not_available")) {
        return { ok: false, error: "We're finishing the count." };
      }
      if (error.message.includes("no_sealed_entry")) {
        continue;
      }
      return mapPlayError(error.message);
    }
  }

  revalidatePath(`/daily/${roundId}/reveal`);
  revalidatePath("/home");
  return { ok: true };
}
