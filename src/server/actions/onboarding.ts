"use server";

import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { consumeReturnPath, attributeShareSignup } from "@/server/dal/notify-share";
import { firstSessionPlayHref } from "@/server/dal/play";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { trackEvent } from "@/server/actions/analytics";
import {
  displayNameSchema,
  onboardingTopicsSchema,
} from "@/lib/validations/onboarding";

export type OnboardingActionState = { error: string } | null;

function mapOnboardingError(message: string): string {
  if (message.includes("top_level_topic_required") || message.includes("topics_required")) {
    return "Pick at least one world to continue.";
  }
  if (message.includes("topics_invalid")) {
    return "One of those picks is no longer available. Refresh and try again.";
  }
  if (message.includes("profile_missing")) {
    return "We couldn't find your profile. Sign out and back in, then try again.";
  }
  return "Could not save your picks. Try again.";
}

export async function completeOnboardingAction(
  _prev: OnboardingActionState,
  formData: FormData,
): Promise<OnboardingActionState> {
  const topicIds = formData.getAll("topic_ids").map(String);
  const parsedTopics = onboardingTopicsSchema.safeParse(topicIds);
  if (!parsedTopics.success) {
    return { error: parsedTopics.error.issues[0]?.message ?? "Pick at least one world." };
  }

  const parsedName = displayNameSchema.safeParse(formData.get("display_name") ?? "");
  if (!parsedName.success) {
    return { error: parsedName.error.issues[0]?.message ?? "Display name looks off." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("complete_onboarding", {
    p_topic_ids: parsedTopics.data,
    p_display_name: parsedName.data.length > 0 ? parsedName.data : undefined,
  });

  if (error) {
    return { error: mapOnboardingError(error.message) };
  }

  await trackEvent(ANALYTICS_EVENTS.onboardingCompleted, {
    topic_count: parsedTopics.data.length,
  });
  const attributed = await attributeShareSignup();
  if (attributed) {
    await trackEvent(ANALYTICS_EVENTS.shareSignupCompleted);
  }
  const next = await consumeReturnPath();
  if (next === "/home") {
    redirect(await firstSessionPlayHref());
  }
  redirect(next);
}
