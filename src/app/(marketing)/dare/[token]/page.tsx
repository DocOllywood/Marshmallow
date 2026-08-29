import { notFound, redirect } from "next/navigation";

import { AppShell } from "@/components/AppShell";
import { DareInviteClient } from "@/components/dare/DareInviteClient";
import { MoneyBrandHeader } from "@/components/MoneyBrandHeader";
import { experimentDaresEnabled } from "@/lib/env/experiment-dares";
import { getPublicDare } from "@/server/dal/experiment-dare";
import { getAuthUser } from "@/server/dal/auth";

export default async function DareInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  if (!experimentDaresEnabled()) {
    notFound();
  }

  const { token } = await params;
  if (!/^[a-f0-9]{32}$/.test(token)) {
    notFound();
  }

  const dare = await getPublicDare(token);
  if (!dare) {
    notFound();
  }

  const user = await getAuthUser();

  if (dare.matchReady && user) {
    redirect(`/dare/${token}/match`);
  }

  return (
    <AppShell>
      <div className="money-experiment flex flex-1 flex-col pb-8">
        <MoneyBrandHeader />
        <DareInviteClient dare={dare} token={token} isAuthed={Boolean(user)} />
      </div>
    </AppShell>
  );
}
