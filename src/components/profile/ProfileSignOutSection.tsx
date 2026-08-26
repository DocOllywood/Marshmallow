import { signOutAction } from "@/server/actions/auth";

export function ProfileSignOutSection({ isAnonymous }: { isAnonymous: boolean }) {
  return (
    <section className="flex flex-col gap-2 border-t border-border/60 pt-6">
      {isAnonymous ? (
        <p className="max-w-[20rem] text-sm leading-6 text-ink-muted">
          This will start a new guest session. Your current guest progress won&apos;t follow you.
        </p>
      ) : null}
      <form action={signOutAction}>
        <button
          type="submit"
          className="min-h-11 text-sm font-semibold tracking-[0.14em] text-ink-muted uppercase touch-manipulation hover:text-ink"
        >
          {isAnonymous ? "Start fresh" : "Log out"}
        </button>
      </form>
    </section>
  );
}
