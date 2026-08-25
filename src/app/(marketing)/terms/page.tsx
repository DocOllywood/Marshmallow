import Link from "next/link";

import { PageHeader } from "@/components/PageHeader";

export default function TermsPage() {
  return (
    <main className="flex flex-1 flex-col gap-6 pb-10 pt-6">
      <PageHeader
        eyebrow="Draft for attorney review"
        title="Terms"
        description="A lightweight description of using Marshmallow during beta. Not a complete legal agreement."
      />
      <div className="space-y-4 text-sm leading-6 text-ink-muted">
        <p>Marshmallow is a prediction game. You pick an answer, predict the crowd, and seal before the close time.</p>
        <p>Database time is authoritative. A client countdown never reveals results. Results appear only after official finalization.</p>
        <p>Crowd results are Marshmallow player responses, not public-opinion polling. We do not claim that players represent America, the internet, or everyone.</p>
        <p>Do not post defamatory or unverified allegations. Admins may close or cancel a Marshmallow.</p>
        <p>Beta features, content, and scoring presentation may change. Accuracy math and official scores remain the gameplay record.</p>
      </div>
      <Link href="/" className="text-sm font-semibold text-primary">Back</Link>
    </main>
  );
}
