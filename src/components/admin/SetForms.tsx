"use client";

import { useActionState } from "react";
import Link from "next/link";

import { PrimaryButton } from "@/components/PrimaryButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toDatetimeLocalValue } from "@/lib/datetime/local";
import { bulkScheduleSetAction, createContentSetAction } from "@/server/actions/admin";

export function CreateSetForm() {
  const [state, action, pending] = useActionState(createContentSetAction, null);
  return (
    <form action={action} className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
      <Label htmlFor="name">Set name</Label>
      <Input id="name" name="name" required minLength={2} maxLength={80} className="min-h-11" />
      <Label htmlFor="notes">Notes</Label>
      <Input id="notes" name="notes" maxLength={160} className="min-h-11" />
      {state?.error ? <p className="text-sm text-toasted">{state.error}</p> : null}
      <PrimaryButton type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create set"}
      </PrimaryButton>
    </form>
  );
}

export function BulkScheduleForm({ setId }: { setId: string }) {
  const [state, action, pending] = useActionState(bulkScheduleSetAction, null);
  return (
    <form action={action} className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
      <input type="hidden" name="set_id" value={setId} />
      <Label htmlFor="base_opens_at">Stagger from</Label>
      <Input
        id="base_opens_at"
        name="base_opens_at"
        type="datetime-local"
        required
        defaultValue={toDatetimeLocalValue(new Date())}
        className="min-h-11"
      />
      <p className="text-xs text-ink-muted">
        Quick 1 opens now-ish, closes +3m, reveals +4m. Later items stagger one minute. Daily
        items are rejected.
      </p>
      {state?.error ? <p className="text-sm text-toasted">{state.error}</p> : null}
      <PrimaryButton type="submit" disabled={pending}>
        {pending ? "Scheduling…" : "Bulk schedule"}
      </PrimaryButton>
      <Link href={`/admin/sets/${setId}/preview`} className="text-center text-sm font-semibold text-primary">
        Preview first-session flow
      </Link>
    </form>
  );
}
