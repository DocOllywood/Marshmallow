import { BatchQuickForm } from "@/components/admin/BatchQuickForm";
import { PageHeader } from "@/components/PageHeader";
import { requireAdmin } from "@/server/dal/auth";
import { listAdminTopics, listContentSets } from "@/server/dal/admin";

export default async function BatchQuickPage() {
  await requireAdmin();
  const [topics, sets] = await Promise.all([listAdminTopics(), listContentSets()]);

  return (
    <main className="flex flex-1 flex-col gap-4">
      <PageHeader
        eyebrow="Composer"
        title="Batch Quick"
        description="One question per line. Each line becomes a normal Quick draft. Edit names and timing after."
      />
      <BatchQuickForm topics={topics} sets={sets} />
    </main>
  );
}
