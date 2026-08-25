"use client";

import { useActionState } from "react";
import Link from "next/link";

import { PrimaryButton } from "@/components/PrimaryButton";
import { archetypeLabel, isQuestionArchetype } from "@/domain/content/archetype";
import { playModeBadge, type PlayMode } from "@/domain/play/mode";
import { createFromTemplateAction } from "@/server/actions/admin";

export function TemplateList({
  templates,
}: {
  templates: {
    id: string;
    name: string;
    question: string;
    play_mode: string;
    archetype: string;
  }[];
}) {
  if (templates.length === 0) {
    return <p className="text-sm text-ink-muted">Save a composer draft as a template first.</p>;
  }
  return (
    <ul className="flex flex-col gap-3 pb-10">
      {templates.map((template) => (
        <li key={template.id} className="rounded-2xl border border-border bg-surface p-4">
          <p className="text-xs text-ink-muted">
            {playModeBadge(template.play_mode as PlayMode)} ·{" "}
            {isQuestionArchetype(template.archetype)
              ? archetypeLabel(template.archetype)
              : template.archetype}
          </p>
          <p className="font-display text-lg font-semibold">{template.name}</p>
          <p className="text-sm text-ink-muted">{template.question}</p>
          <CreateFromTemplateButton id={template.id} />
        </li>
      ))}
      <Link href="/admin" className="text-center text-sm font-semibold text-ink-muted">
        Back to kitchen
      </Link>
    </ul>
  );
}

function CreateFromTemplateButton({ id }: { id: string }) {
  const [state, action, pending] = useActionState(createFromTemplateAction, null);
  return (
    <form action={action} className="mt-3">
      <input type="hidden" name="template_id" value={id} />
      {state?.error ? <p className="mb-2 text-sm text-toasted">{state.error}</p> : null}
      <PrimaryButton type="submit" disabled={pending} className="min-h-12 text-sm">
        {pending ? "Creating…" : "New variant (30–60s)"}
      </PrimaryButton>
    </form>
  );
}
