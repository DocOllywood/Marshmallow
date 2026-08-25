import { TemplateList } from "@/components/admin/TemplateList";
import { PageHeader } from "@/components/PageHeader";
import { requireAdmin } from "@/server/dal/auth";
import { listContentTemplates } from "@/server/dal/admin";

export default async function TemplatesPage() {
  await requireAdmin();
  const templates = await listContentTemplates();

  return (
    <main className="flex flex-1 flex-col gap-4">
      <PageHeader
        eyebrow="Editorial"
        title="Templates"
        description="Structure only. Duplicating never copies entries, scores, or results."
      />
      <TemplateList templates={templates} />
    </main>
  );
}
