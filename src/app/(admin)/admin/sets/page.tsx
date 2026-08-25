import Link from "next/link";

import { CreateSetForm } from "@/components/admin/SetForms";
import { PageHeader } from "@/components/PageHeader";
import { requireAdmin } from "@/server/dal/auth";
import { listContentSets } from "@/server/dal/admin";

export default async function ContentSetsPage() {
  await requireAdmin();
  const sets = await listContentSets();

  return (
    <main className="flex flex-1 flex-col gap-4">
      <PageHeader
        eyebrow="Editorial"
        title="Quick Sets"
        description="Group drafts for staggered beta nights. Not a consumer playlist."
      />
      <CreateSetForm />
      <ul className="flex flex-col gap-2 pb-10">
        {sets.length === 0 ? (
          <li className="text-sm text-ink-muted">No sets yet.</li>
        ) : (
          sets.map((set) => (
            <li key={set.id}>
              <Link href={`/admin/sets/${set.id}`} className="block rounded-2xl border border-border bg-surface p-4">
                <p className="font-display text-lg font-semibold">{set.name}</p>
                {set.notes ? <p className="text-sm text-ink-muted">{set.notes}</p> : null}
              </Link>
            </li>
          ))
        )}
      </ul>
    </main>
  );
}
