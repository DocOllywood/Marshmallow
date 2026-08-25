"use client";

import { AppShell } from "@/components/AppShell";
import { ErrorState } from "@/components/ErrorState";
import { PrimaryButton } from "@/components/PrimaryButton";

export default function RootError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <AppShell>
      <main className="flex flex-1 flex-col">
        <ErrorState
          title="Something got toasted."
          description="Try that again in a moment."
        />
        <PrimaryButton onClick={reset}>Try again</PrimaryButton>
      </main>
    </AppShell>
  );
}
