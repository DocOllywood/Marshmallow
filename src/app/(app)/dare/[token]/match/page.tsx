import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AppShell } from "@/components/AppShell";
import { DareMatchView } from "@/components/dare/DareMatchView";
import { MoneyBrandHeader } from "@/components/MoneyBrandHeader";
import { buildDareComparisonView } from "@/domain/dare/comparison";
import { experimentDaresEnabled } from "@/lib/env/experiment-dares";
import { requireOnboarded } from "@/server/dal/auth";
import { getDareComparison } from "@/server/dal/experiment-dare";

export default async function DareMatchPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  if (!experimentDaresEnabled()) {
    notFound();
  }

  await requireOnboarded();
  const { token } = await params;
  if (!/^[a-f0-9]{32}$/.test(token)) {
    notFound();
  }

  const payload = await getDareComparison(token);
  if (!payload) {
    redirect(`/dare/${token}`);
  }

  const viewerChoices = payload.viewerIsSender
    ? payload.senderChoices
    : payload.recipientChoices;
  const otherChoices = payload.viewerIsSender
    ? payload.recipientChoices
    : payload.senderChoices;

  const comparison = buildDareComparisonView({
    viewerChoices,
    otherChoices,
    viewerLabel: payload.viewerLabel,
    otherLabel: payload.otherLabel,
  });

  return (
    <AppShell>
      <div className="money-experiment flex flex-1 flex-col pb-8">
        <MoneyBrandHeader />
        <DareMatchView
          comparison={comparison}
          otherLabel={payload.otherLabel}
          roundRevealed={payload.roundRevealed}
        />
        <div className="mt-8 flex justify-center">
          <Link href="/home" className="min-h-11 text-sm font-semibold text-money">
            Home
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
