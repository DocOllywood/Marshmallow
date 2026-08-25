"use client";

import { useState } from "react";
import Link from "next/link";

import { PrimaryButton } from "@/components/PrimaryButton";

export function SetPreview({
  title,
  steps,
}: {
  title: string;
  steps: { id: string; question: string; status: string }[];
}) {
  const [index, setIndex] = useState(0);
  const current = steps[index];
  const last = index >= steps.length;

  return (
    <div className="mx-auto w-full max-w-[390px] pb-10">
      <div className="rounded-[2rem] border border-border bg-canvas p-5 shadow-sm">
        <p className="text-xs font-semibold tracking-[0.16em] text-ink-muted uppercase">
          {title}
        </p>
        {last || !current ? (
          <div className="mt-8 text-center">
            <p className="font-display text-2xl font-semibold">First result likely ready</p>
            <p className="mt-2 text-sm text-ink-muted">
              This is a timing preview. No percentages are shown here.
            </p>
          </div>
        ) : (
          <div className="mt-6">
            <p className="text-xs text-ink-muted">
              Question {index + 1} of {steps.length}
            </p>
            <h1 className="mt-2 font-display text-[1.75rem] leading-tight font-semibold">
              {current.question}
            </h1>
          </div>
        )}
      </div>
      <div className="mt-4 flex flex-col gap-2">
        {!last && current ? (
          <PrimaryButton onClick={() => setIndex(index + 1)}>Next question</PrimaryButton>
        ) : null}
        {index > 0 ? (
          <button
            type="button"
            onClick={() => setIndex(index - 1)}
            className="min-h-11 text-sm font-semibold"
          >
            Back
          </button>
        ) : null}
        <Link href="/admin/sets" className="text-center text-sm text-ink-muted">
          Exit preview
        </Link>
      </div>
    </div>
  );
}
