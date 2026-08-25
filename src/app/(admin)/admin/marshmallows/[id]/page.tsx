import { notFound } from "next/navigation";

import { ComposerForm } from "@/components/admin/ComposerForm";
import { PageHeader } from "@/components/PageHeader";
import { requireAdmin } from "@/server/dal/auth";
import {
  getAdminMarshmallow,
  listAdminMarshmallows,
  listAdminTopics,
  listContentSets,
} from "@/server/dal/admin";

export default async function EditMarshmallowPage({
  params,
}: PageProps<"/admin/marshmallows/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const [topics, marshmallow, all, sets] = await Promise.all([
    listAdminTopics(),
    getAdminMarshmallow(id),
    listAdminMarshmallows(),
    listContentSets(),
  ]);

  if (!marshmallow) {
    notFound();
  }

  return (
    <main className="flex flex-1 flex-col">
      <PageHeader eyebrow="Composer" title="Edit Marshmallow" />
      <ComposerForm
        topics={topics}
        sets={sets}
        marshmallow={marshmallow}
        dailyConflicts={all.filter((row) => row.is_daily).map((row) => ({
          id: row.id,
          question: row.question,
          daily_on: row.daily_on,
        }))}
      />
    </main>
  );
}
