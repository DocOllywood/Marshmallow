"use client";

import { useActionState } from "react";

import { MoneyPrimaryButton } from "@/components/MoneyPrimaryButton";
import { startGuestPlayAction } from "@/server/actions/auth";

export function PlayMarshmallowButton({ label = "PLAY MARSHMALLOW" }: { label?: string }) {
  const [state, action, pending] = useActionState(startGuestPlayAction, null);

  return (
    <form action={action} className="flex flex-col gap-2">
      <MoneyPrimaryButton type="submit" disabled={pending}>
        {pending ? "Starting…" : label}
      </MoneyPrimaryButton>
      {state?.error ? (
        <p role="alert" className="text-center text-sm text-toasted">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
