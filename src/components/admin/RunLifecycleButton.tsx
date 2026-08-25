"use client";

import { useActionState } from "react";

import { runLifecycleAction } from "@/server/actions/admin";

export function RunLifecycleButton() {
  const [state, action, pending] = useActionState(runLifecycleAction, null);

  return (
    <form action={action}>
      <button
        type="submit"
        disabled={pending}
        className="min-h-12 w-full rounded-full border border-border text-sm font-semibold"
      >
        {pending ? "Running due jobs…" : "Run due lifecycle jobs"}
      </button>
      {state?.error ? (
        <p className="mt-2 text-sm text-toasted">{state.error}</p>
      ) : state && state.error === "" ? (
        <p className="mt-2 text-sm text-positive">Due jobs ran. Home will reflect new states.</p>
      ) : null}
    </form>
  );
}
