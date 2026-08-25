import { ComposerForm } from "@/components/admin/ComposerForm";
import { PageHeader } from "@/components/PageHeader";
import { requireAdmin } from "@/server/dal/auth";
import { listAdminMarshmallows, listAdminTopics, listContentSets } from "@/server/dal/admin";

export default async function NewMarshmallowPage() {
  await requireAdmin();
  const [topics, all, sets] = await Promise.all([
    listAdminTopics(),
    listAdminMarshmallows(),
    listContentSets(),
  ]);

  return (
    <main className="flex flex-1 flex-col">
      <PageHeader
        eyebrow="Composer"
        title="New Marshmallow"
        description="Save a draft anytime. Schedule only when the question and 2–4 choices are ready."
      />
      <ComposerForm
        topics={topics}
        sets={sets}
        dailyConflicts={all.filter((row) => row.is_daily).map((row) => ({
          id: row.id,
          question: row.question,
          daily_on: row.daily_on,
        }))}
      />
    </main>
  );
}
