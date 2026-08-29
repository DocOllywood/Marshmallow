"use server";

import { revalidatePath } from "next/cache";

import {
  acceptExperimentDare,
  createExperimentDare,
} from "@/server/dal/experiment-dare";
import { requireOnboarded } from "@/server/dal/auth";
import { trackEvent } from "@/server/actions/analytics";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";

export type DareActionResult =
  | { ok: true; token: string; dareId: string }
  | { ok: false; error: string };

export async function createExperimentDareAction(roundId: string): Promise<DareActionResult> {
  await requireOnboarded();
  const result = await createExperimentDare(roundId);
  if (!result.ok) {
    return result;
  }
  revalidatePath("/home");
  return result;
}

export async function acceptExperimentDareAction(token: string): Promise<
  | { ok: true; playHref: string | null }
  | { ok: false; error: string }
> {
  await requireOnboarded();
  const result = await acceptExperimentDare(token);
  if (!result.ok) {
    return result;
  }
  void trackEvent(
    ANALYTICS_EVENTS.dareAccepted,
    { dare_token: token },
    result.playMarshmallowId ?? undefined,
  );
  return {
    ok: true,
    playHref: result.playMarshmallowId ? `/m/${result.playMarshmallowId}` : null,
  };
}

export async function trackDareLinkCopiedAction(token: string, roundId: string) {
  await requireOnboarded();
  void trackEvent(ANALYTICS_EVENTS.dareLinkCopied, { dare_token: token, round_id: roundId });
}

export async function trackDareOpenedAction(token: string, roundId: string) {
  void trackEvent(ANALYTICS_EVENTS.dareOpened, { dare_token: token, round_id: roundId });
}
