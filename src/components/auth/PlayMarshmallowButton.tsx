"use client";

import { useActionState } from "react";

import { PrimaryButton } from "@/components/PrimaryButton";
import { startGuestPlayAction } from "@/server/actions/auth";

export function PlayMarshmallowButton() {
  const [state, action, pending] = useActionState(startGuestPlayAction, null);

  return (
    <form action={action} className="flex flex-col gap-2">
      <PrimaryButton type="submit" disabled={pending}>
        {pending ? "Starting…" : "PLAY MARSHMALLOW"}
      </PrimaryButton>
      {state?.error ? (
        <p role="alert" className="text-center text-sm text-toasted">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
