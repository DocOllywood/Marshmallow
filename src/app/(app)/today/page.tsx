import { EmptyState } from "@/components/EmptyState";

export default function TodayPage() {
  return (
    <main className="flex flex-1 flex-col">
      <EmptyState
        mascot="cooking"
        title="Today's Marshmallow"
        description="The daily question will open here. Voting and predictions ship in a later phase."
      />
    </main>
  );
}
