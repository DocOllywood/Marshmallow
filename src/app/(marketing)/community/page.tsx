import Link from "next/link";

import { PageHeader } from "@/components/PageHeader";

export default function CommunityPage() {
  return (
    <main className="flex flex-1 flex-col gap-6 pb-10 pt-6">
      <PageHeader
        eyebrow="Draft for attorney review"
        title="Community Guidelines"
        description="Keep Marshmallow playable and fair."
      />
      <div className="space-y-4 text-sm leading-6 text-ink-muted">
        <p>Predict in good faith. Sealed calls cannot be changed.</p>
        <p>Do not try to extract other players&apos; entries or pre-reveal aggregates.</p>
        <p>Quick, Live, and Daily are timing experiences on the same rules. Do not treat crowd percentages as scientific public-opinion research.</p>
        <p>Avoid harassment, hate, or unverified accusations in questions and answers. Report problems to the operator running your beta.</p>
      </div>
      <Link href="/" className="text-sm font-semibold text-primary">Back</Link>
    </main>
  );
}
