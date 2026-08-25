"use client";

import { useActionState } from "react";

import { rebuildCrowdsenseAction } from "@/server/actions/admin";

export function RebuildCrowdsenseButton() {
  const [state, action, pending] = useActionState(rebuildCrowdsenseAction, null);

  return (
    <form action={action}>
      <button
        type="submit"
        disabled={pending}
        className="min-h-12 w-full rounded-full border border-border text-sm font-semibold"
      >
        {pending ? "Rebuilding CrowdSense…" : "Rebuild CrowdSense from scores"}
      </button>
      {state?.error ? (
        <p className="mt-2 text-sm text-toasted">{state.error}</p>
      ) : state && state.error === "" ? (
        <p className="mt-2 text-sm text-positive">Ratings rebuilt from official scores.</p>
      ) : null}
    </form>
  );
}
