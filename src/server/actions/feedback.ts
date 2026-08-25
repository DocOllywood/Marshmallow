"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireUser } from "@/server/dal/auth";

export type FeedbackActionState = { error: string } | null;

const CONTEXTS = ["quick_reveal", "live_reveal", "daily_reveal", "settings"] as const;
const RATINGS = ["loved", "okay", "confusing"] as const;

export async function submitBetaFeedbackAction(
  _prev: FeedbackActionState,
  formData: FormData,
): Promise<FeedbackActionState> {
  await requireUser();
  const rating = String(formData.get("rating") ?? "");
  const context = String(formData.get("context") ?? "");
  const comment = String(formData.get("comment") ?? "");
  const marshmallowId = String(formData.get("marshmallow_id") ?? "");
  if (!RATINGS.includes(rating as (typeof RATINGS)[number])) {
    return { error: "Pick how it felt." };
  }
  if (!CONTEXTS.includes(context as (typeof CONTEXTS)[number])) {
    return { error: "Could not save feedback." };
  }
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("submit_beta_feedback", {
    p_rating: rating,
    p_context: context,
    p_comment: comment || undefined,
    p_marshmallow_id: marshmallowId || undefined,
  });
  if (error) {
    return { error: "Could not save feedback. Try again." };
  }
  return { error: "" };
}
