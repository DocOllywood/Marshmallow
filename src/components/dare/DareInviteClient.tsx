"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { MarshmallowMascot } from "@/components/MarshmallowMascot";
import { MoneyPrimaryButton } from "@/components/MoneyPrimaryButton";
import type { DarePublicView } from "@/domain/dare/types";
import {
  acceptExperimentDareAction,
  trackDareOpenedAction,
} from "@/server/actions/experiment-dare";

export function DareInviteClient({
  dare,
  token,
  isAuthed,
}: {
  dare: DarePublicView;
  token: string;
  isAuthed: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tracked = useRef(false);

  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;
    void trackDareOpenedAction(token, dare.roundId);
  }, [dare.roundId, token]);

  async function takeDare() {
    if (!isAuthed) {
      router.push(`/login?next=${encodeURIComponent(`/dare/${token}`)}`);
      return;
    }

    setPending(true);
    setError(null);
    const result = await acceptExperimentDareAction(token);
    setPending(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    if (result.playHref) {
      router.push(result.playHref);
      return;
    }
    router.refresh();
  }

  const senderName = dare.senderDisplayName.toUpperCase();

  if (dare.status === "closed") {
    return (
      <InviteShell senderName={senderName}>
        <p className="max-w-[20rem] text-sm leading-6 text-ink-muted">This dare closed.</p>
      </InviteShell>
    );
  }

  if (dare.status === "taken") {
    return (
      <InviteShell senderName={senderName}>
        <p className="max-w-[20rem] text-sm leading-6 text-ink-muted">
          This dare has already been taken.
        </p>
      </InviteShell>
    );
  }

  if (dare.status === "cancelled") {
    return (
      <InviteShell senderName={senderName}>
        <p className="max-w-[20rem] text-sm leading-6 text-ink-muted">This dare is no longer active.</p>
      </InviteShell>
    );
  }

  if (dare.isSender && dare.status === "claimed" && !dare.matchReady) {
    return (
      <InviteShell senderName={senderName}>
        <p className="text-xs font-semibold tracking-[0.2em] text-money uppercase">Waiting for them</p>
        <p className="max-w-[20rem] text-sm leading-6 text-ink-muted">
          Your dare is out. They&apos;re playing blind.
        </p>
      </InviteShell>
    );
  }

  if (dare.isSender && dare.matchReady) {
    return (
      <InviteShell senderName={senderName}>
        <p className="max-w-[20rem] text-sm leading-6 text-ink-muted">They played.</p>
        <MoneyPrimaryButton href={`/dare/${token}/match`}>SEE YOUR MATCH</MoneyPrimaryButton>
      </InviteShell>
    );
  }

  return (
    <InviteShell senderName={senderName}>
      <p className="max-w-[20rem] text-sm leading-6 text-ink-muted">
        Same situation.
        <span className="block">Your answers stay blind until you&apos;re done.</span>
      </p>
      <p className="max-w-[20rem] text-sm leading-6 text-ink-muted">
        Think you&apos;d answer differently?
      </p>
      <MoneyPrimaryButton type="button" onClick={() => void takeDare()} disabled={pending}>
        {pending ? "Starting…" : "TAKE THE DARE"}
      </MoneyPrimaryButton>
      {!isAuthed ? (
        <p className="text-sm text-ink-muted">
          New here?{" "}
          <a
            href={`/signup?next=${encodeURIComponent(`/dare/${token}`)}`}
            className="font-semibold text-money underline-offset-2 hover:underline"
          >
            Create an account
          </a>
        </p>
      ) : null}
      {error ? <p className="text-sm text-toasted">{error}</p> : null}
    </InviteShell>
  );
}

function InviteShell({
  senderName,
  children,
}: {
  senderName: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-1 flex-col items-center gap-6 px-2 py-10 text-center">
      <MarshmallowMascot state="fluffy" size="lg" accentDepth={2} aria-hidden />
      <div className="flex max-w-[22rem] flex-col gap-2">
        <p className="font-display text-[clamp(1.35rem,6vw,2rem)] font-semibold tracking-tight uppercase text-ink">
          {senderName} DARED YOU.
        </p>
      </div>
      {children}
    </section>
  );
}
