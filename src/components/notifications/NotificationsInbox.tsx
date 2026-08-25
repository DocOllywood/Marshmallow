"use client";

import Link from "next/link";

import { markNotificationReadAction } from "@/server/actions/notify";
import { trackEvent } from "@/server/actions/analytics";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import type { InboxNotification } from "@/server/dal/notify-share";

export function NotificationsInbox({ items }: { items: InboxNotification[] }) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-ink-muted">
        Nothing yet. When a Marshmallow you sealed reveals, it will land here.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {items.map((item) => (
        <li key={item.id}>
          <Link
            href={item.href}
            onClick={() => {
              void markNotificationReadAction(item.id);
              void trackEvent(ANALYTICS_EVENTS.notificationClicked, { type: item.type }, item.marshmallowId ?? undefined);
            }}
            className="block rounded-2xl border border-border bg-surface p-4"
          >
            <p className="text-xs font-semibold tracking-[0.16em] text-primary uppercase">
              {item.title}
            </p>
            <p className="mt-1 text-sm">{item.body}</p>
            {item.question ? (
              <p className="mt-2 font-display text-lg font-semibold leading-snug">{item.question}</p>
            ) : null}
            <p className="mt-2 text-xs text-ink-muted">
              {item.readAt ? "Read" : "New"} · {new Date(item.createdAt).toLocaleString()}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
