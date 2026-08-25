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
  if (message.includes("allocations_invalid") || message.includes("own_choice_mismatch")) {
    return { ok: false, error: "That prediction isn't valid. Adjust the mix to 100%." };
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
