"use client";

import { useActionState } from "react";

import { PrimaryButton } from "@/components/PrimaryButton";
import { submitBetaFeedbackAction, type FeedbackActionState } from "@/server/actions/feedback";

export function BetaFeedbackForm({
  context,
  marshmallowId,
}: {
  context: "quick_reveal" | "live_reveal" | "daily_reveal" | "settings";
  marshmallowId?: string;
}) {
  const [state, action, pending] = useActionState(submitBetaFeedbackAction, null);

  if (state && !state.error) {
    return <p className="text-sm text-ink-muted">Thanks — that helps us make Marshmallow better.</p>;
  }

  return (
    <form action={action} className="flex flex-col gap-3 rounded-[1.5rem] border border-border bg-surface p-4">
      <input type="hidden" name="context" value={context} />
      {marshmallowId ? <input type="hidden" name="marshmallow_id" value={marshmallowId} /> : null}
      <p className="font-display text-lg font-semibold">Help us make Marshmallow better</p>
      <div className="flex flex-col gap-2">
        <label className="flex min-h-10 items-center gap-2 text-sm">
          <input type="radio" name="rating" value="loved" required className="size-4 accent-primary" />
          Loved it
        </label>
        <label className="flex min-h-10 items-center gap-2 text-sm">
          <input type="radio" name="rating" value="okay" className="size-4 accent-primary" />
          It was okay
        </label>
        <label className="flex min-h-10 items-center gap-2 text-sm">
          <input type="radio" name="rating" value="confusing" className="size-4 accent-primary" />
          Confusing
        </label>
      </div>
      <textarea
        name="comment"
        maxLength={280}
        placeholder="Optional note"
        className="min-h-16 rounded-xl border border-border bg-canvas px-3 py-2 text-sm"
      />
      {state?.error ? <p className="text-sm text-toasted">{state.error}</p> : null}
      <PrimaryButton type="submit" disabled={pending} className="min-h-12 text-sm">
        {pending ? "Sending…" : "Send feedback"}
      </PrimaryButton>
    </form>
  );
}

export type { FeedbackActionState };
