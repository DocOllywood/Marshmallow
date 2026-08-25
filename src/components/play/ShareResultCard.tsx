"use client";

import { useState } from "react";

import { PrimaryButton } from "@/components/PrimaryButton";
import { createShareCardAction } from "@/server/actions/share";

export function ShareResultCard({ marshmallowId }: { marshmallowId: string }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [publicId, setPublicId] = useState<string | null>(null);

  async function create() {
    setPending(true);
    setError(null);
    const result = await createShareCardAction(marshmallowId);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setPublicId(result.publicId);
  }

  const shareUrl =
    publicId && typeof window !== "undefined"
      ? `${window.location.origin}/s/${publicId}`
      : publicId
        ? `/s/${publicId}`
        : null;

  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      {!open && !publicId ? (
        <PrimaryButton type="button" onClick={() => setOpen(true)}>
          Share this call
        </PrimaryButton>
      ) : null}

      {open && !publicId ? (
        <div className="flex flex-col gap-3">
          <p className="text-xs font-semibold tracking-[0.16em] text-ink-muted uppercase">
            This will be public
          </p>
          <ul className="list-disc pl-5 text-sm text-ink-muted">
            <li>The question</li>
            <li>Your prediction</li>
            <li>The final crowd result</li>
            <li>Your Accuracy</li>
          </ul>
          <p className="text-sm text-ink-muted">
            Your username stays off the card. Anyone with the link can see those four things.
          </p>
          <PrimaryButton type="button" onClick={() => void create()} disabled={pending}>
            {pending ? "Creating…" : "Create share card"}
          </PrimaryButton>
          <button
            type="button"
            className="text-sm font-semibold text-ink-muted"
            onClick={() => setOpen(false)}
          >
            Cancel
          </button>
        </div>
      ) : null}

      {shareUrl ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold">Share link</p>
          <a href={shareUrl} className="break-all text-sm text-primary">
            {shareUrl}
          </a>
        </div>
      ) : null}

      {error ? <p className="mt-2 text-sm text-toasted">{error}</p> : null}
    </div>
  );
}
