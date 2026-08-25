import { notFound } from "next/navigation";

import { SetPreview } from "@/components/admin/SetPreview";
import { PageHeader } from "@/components/PageHeader";
import { requireAdmin } from "@/server/dal/auth";
import { getContentSet } from "@/server/dal/admin";

export default async function SetPreviewPage({
  params,
}: PageProps<"/admin/sets/[id]/preview">) {
  await requireAdmin();
  const { id } = await params;
  const set = await getContentSet(id);
  if (!set) {
    notFound();
  }
  const steps = set.items
    .map((item) => {
      const marshmallow = Array.isArray(item.marshmallows)
        ? item.marshmallows[0]
        : item.marshmallows;
      return marshmallow
        ? { id: marshmallow.id, question: marshmallow.question, status: marshmallow.status }
        : null;
    })
    .filter((step): step is { id: string; question: string; status: string } => step != null);

  return (
    <main className="flex flex-1 flex-col gap-4">
      <PageHeader
        eyebrow="Preview"
        title={set.name}
        description="Navigation only. No fake crowd numbers."
      />
      <SetPreview title={set.name} steps={steps} />
    </main>
  );
}
