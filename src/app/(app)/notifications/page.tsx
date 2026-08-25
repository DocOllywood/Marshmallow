import { PageHeader } from "@/components/PageHeader";
import { NotificationsInbox } from "@/components/notifications/NotificationsInbox";
import { requireOnboarded } from "@/server/dal/auth";
import { listInboxNotifications } from "@/server/dal/notify-share";

export default async function NotificationsPage() {
  await requireOnboarded();
  let items: Awaited<ReturnType<typeof listInboxNotifications>> = [];
  try {
    items = await listInboxNotifications();
  } catch {
    items = [];
  }

  return (
    <main className="flex flex-1 flex-col">
      <PageHeader
        title="Inbox"
        description="When a Marshmallow you sealed is ready, it shows up here. Results stay inside the reveal."
      />
      <NotificationsInbox items={items} />
    </main>
  );
}
