"use client";

import { useActionState } from "react";
import Link from "next/link";

import { PrimaryButton } from "@/components/PrimaryButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QUESTION_ARCHETYPES, archetypeLabel } from "@/domain/content/archetype";
import { batchCreateQuickAction } from "@/server/actions/admin";

export function BatchQuickForm({
  topics,
  sets,
  defaultSetId,
}: {
  topics: { id: string; name: string }[];
  sets: { id: string; name: string }[];
  defaultSetId?: string;
}) {
  const [state, action, pending] = useActionState(batchCreateQuickAction, null);

  return (
    <form action={action} className="flex flex-col gap-4 pb-10">
      <div className="flex flex-col gap-2">
        <Label htmlFor="questions">Questions</Label>
        <textarea
          id="questions"
          name="questions"
          required
          rows={8}
          placeholder={"Who came off better in the villa recap?\nWhich look won the carpet?"}
          className="rounded-xl border border-border bg-surface px-3 py-3 text-base"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="choice_a">Choice A</Label>
          <Input id="choice_a" name="choice_a" defaultValue="Yes" className="min-h-11" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="choice_b">Choice B</Label>
          <Input id="choice_b" name="choice_b" defaultValue="No" className="min-h-11" />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="topic_id">Topic</Label>
        <select
          id="topic_id"
          name="topic_id"
          className="min-h-11 rounded-xl border border-border bg-surface px-3"
        >
          <option value="">No topic</option>
          {topics.map((topic) => (
            <option key={topic.id} value={topic.id}>
              {topic.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="archetype">Archetype</Label>
        <select
          id="archetype"
          name="archetype"
          defaultValue="who_won"
          className="min-h-11 rounded-xl border border-border bg-surface px-3"
        >
          {QUESTION_ARCHETYPES.map((item) => (
            <option key={item} value={item}>
              {archetypeLabel(item)}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="set_id">Quick Set</Label>
        <select
          id="set_id"
          name="set_id"
          defaultValue={defaultSetId ?? ""}
          className="min-h-11 rounded-xl border border-border bg-surface px-3"
        >
          <option value="">None</option>
          {sets.map((set) => (
            <option key={set.id} value={set.id}>
              {set.name}
            </option>
          ))}
        </select>
      </div>
      {state?.error ? <p className="text-sm text-toasted">{state.error}</p> : null}
      <PrimaryButton type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create drafts"}
      </PrimaryButton>
      <Link href="/admin" className="text-center text-sm font-semibold text-ink-muted">
        Back to kitchen
      </Link>
    </form>
  );
}
