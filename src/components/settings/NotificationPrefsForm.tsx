import { updateNotificationPrefsAction } from "@/server/actions/notify";
import type { NotificationPrefs } from "@/server/dal/notify-share";
import { PrimaryButton } from "@/components/PrimaryButton";

export function NotificationPrefsForm({ prefs }: { prefs: NotificationPrefs }) {
  return (
    <form action={updateNotificationPrefsAction} className="flex flex-col gap-5">
      <section className="rounded-2xl border border-border bg-surface p-4">
        <p className="text-xs font-semibold tracking-[0.16em] text-ink-muted uppercase">
          Reveal ready
        </p>
        <p className="mt-1 text-sm">In-app: always on. This is how you come back when a result is ready.</p>
        <label className="mt-3 flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            name="email_reveal_ready"
            defaultChecked={prefs.emailRevealReady}
            className="mt-1 size-4"
          />
          <span>
            Email me when my Marshmallow is ready
            <span className="block text-ink-muted">
              {prefs.emailSendingEnabled
                ? "Transactional only. No crowd %, score, or right/wrong in the email."
                : "Saves your preference. Email sending is not enabled in this environment yet."}
            </span>
          </span>
        </label>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-4">
        <p className="text-xs font-semibold tracking-[0.16em] text-ink-muted uppercase">
          Optional
        </p>
        <label className="mt-3 flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            name="email_daily"
            defaultChecked={prefs.emailDaily}
            className="mt-1 size-4"
          />
          <span>
            Daily Marshmallow email
            <span className="block text-ink-muted">Off unless you turn it on. Not sent in this phase.</span>
          </span>
        </label>
        <label className="mt-3 flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            name="email_streak"
            defaultChecked={prefs.emailStreak}
            className="mt-1 size-4"
          />
          <span>
            Reveal Streak reminders
            <span className="block text-ink-muted">Off by default. Easy to disable. Not sent in this phase.</span>
          </span>
        </label>
      </section>

      <PrimaryButton type="submit">Save preferences</PrimaryButton>
    </form>
  );
}
