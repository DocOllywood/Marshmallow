"use client";

import { AppShell } from "@/components/AppShell";
import { ErrorState } from "@/components/ErrorState";
import { MoneyPrimaryButton } from "@/components/MoneyPrimaryButton";

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
        <MoneyPrimaryButton onClick={reset}>Try again</MoneyPrimaryButton>
      </main>
    </AppShell>
  );
}
