import Link from "next/link";
import { notFound } from "next/navigation";

import { BatchQuickForm } from "@/components/admin/BatchQuickForm";
import { BulkScheduleForm } from "@/components/admin/SetForms";
import { PageHeader } from "@/components/PageHeader";
import { requireAdmin } from "@/server/dal/auth";
import { getContentSet, listAdminTopics, listContentSets } from "@/server/dal/admin";
import { playModeBadge, type PlayMode } from "@/domain/play/mode";
import { archetypeLabel, isQuestionArchetype } from "@/domain/content/archetype";

export default async function ContentSetPage({
  params,
}: PageProps<"/admin/sets/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const [set, topics, sets] = await Promise.all([
    getContentSet(id),
    listAdminTopics(),
    listContentSets(),
  ]);
  if (!set) {
    notFound();
  }

  return (
    <main className="flex flex-1 flex-col gap-5 pb-10">
      <PageHeader eyebrow="Quick Set" title={set.name} description={set.notes ?? undefined} />
      <BulkScheduleForm setId={set.id} />
      <section>
        <h2 className="font-display text-xl font-semibold">Items</h2>
        <ol className="mt-2 flex flex-col gap-2">
          {set.items.length === 0 ? (
            <li className="text-sm text-ink-muted">Empty. Batch-add questions below.</li>
          ) : (
            set.items.map((item, index) => {
              const marshmallow = Array.isArray(item.marshmallows)
                ? item.marshmallows[0]
                : item.marshmallows;
              if (!marshmallow) return null;
              const archetype = isQuestionArchetype(item.archetype)
                ? archetypeLabel(item.archetype)
                : item.archetype;
              return (
                <li key={item.marshmallow_id} className="rounded-2xl border border-border bg-surface p-3">
                  <p className="text-xs text-ink-muted">
                    {index + 1}. {playModeBadge(marshmallow.play_mode as PlayMode)} · {archetype} ·{" "}
                    {marshmallow.status}
                  </p>
                  <Link href={`/admin/marshmallows/${marshmallow.id}`} className="font-semibold">
                    {marshmallow.question}
                  </Link>
                </li>
              );
            })
          )}
        </ol>
      </section>
      <section>
        <h2 className="font-display text-xl font-semibold">Add more</h2>
        <BatchQuickForm topics={topics} sets={sets} defaultSetId={set.id} />
      </section>
      <Link href="/admin/sets" className="text-center text-sm font-semibold text-ink-muted">
        All sets
      </Link>
    </main>
  );
}
