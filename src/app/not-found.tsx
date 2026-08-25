import { AppShell } from "@/components/AppShell";
import { ErrorState } from "@/components/ErrorState";
import { PrimaryButton } from "@/components/PrimaryButton";

export default function NotFound() {
  return (
    <AppShell>
      <main className="flex flex-1 flex-col">
        <ErrorState
          title="That page melted"
          description="This link isn't here. Home still is."
        />
        <PrimaryButton href="/">Back to Marshmallow</PrimaryButton>
      </main>
    </AppShell>
  );
}
