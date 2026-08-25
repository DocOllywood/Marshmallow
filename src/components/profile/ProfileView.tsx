import Link from "next/link";

import type { OwnProfilePayload } from "@/server/dal/crowdsense";

export function ProfileView({ profile }: { profile: OwnProfilePayload }) {
  const rating = profile.crowdsense.rating;

  return (
    <main className="flex flex-1 flex-col gap-8 pb-8">
      <header className="pt-6">
        <p className="text-xs font-semibold tracking-[0.18em] text-ink-muted uppercase">You</p>
        <h1 className="mt-1 font-display text-[2rem] leading-[1.05] font-semibold tracking-tight">
          {profile.displayName}
        </h1>
        <p className="text-sm text-ink-muted">@{profile.username}</p>
        <div className="mt-2 flex gap-4">
          <Link href={`/u/${profile.username}`} className="text-sm font-semibold text-primary">
            Public profile
          </Link>
          <Link href="/notifications" className="text-sm font-semibold text-primary">
            Inbox
          </Link>
          <Link href="/settings" className="text-sm font-semibold text-ink-muted">
            Settings
          </Link>
        </div>
      </header>

      <section>
        <p className="text-xs font-semibold tracking-[0.16em] text-ink-muted uppercase">CrowdSense</p>
        {rating != null ? (
          <>
            <p className="font-display text-6xl font-semibold tabular-nums">{rating}</p>
            <p className="text-sm text-ink-muted">CrowdSense {rating}</p>
          </>
        ) : (
          <>
            <p className="font-display text-4xl font-semibold">CrowdSense — Calibrating</p>
            <p className="text-sm text-ink-muted">
              {profile.crowdsense.count} / 5 predictions
            </p>
          </>
        )}
        <p className="mt-2 text-sm text-ink-muted">
          {profile.crowdsense.count} scored
          {profile.averageAccuracy != null
            ? ` · Average Accuracy ${Math.round(profile.averageAccuracy)}`
            : ""}
        </p>
      </section>

      <section>
        <p className="text-xs font-semibold tracking-[0.16em] text-ink-muted uppercase">Streaks</p>
        <p className="mt-1 font-display text-2xl font-semibold">
          🔥 Reveal Streak {profile.revealStreak}
        </p>
        <p className="text-sm text-ink-muted">Longest {profile.revealLongest}</p>
        <p className="mt-2 text-sm text-ink-muted">
          Play Streak {profile.playStreak} · longest {profile.playLongest}
        </p>
        {profile.revealBonusesEarned > 0 ? (
          <p className="text-sm text-ink-muted">
            Reveal Bonuses earned {profile.revealBonusesEarned}
          </p>
        ) : null}
      </section>

      <section className="flex flex-col gap-2">
        <p className="text-xs font-semibold tracking-[0.16em] text-ink-muted uppercase">Worlds</p>
        {profile.categories.map((category) => (
          <p key={category.slug} className="flex justify-between text-sm">
            <span>{category.name}</span>
            <span className="tabular-nums font-semibold">
              {category.qualified && category.rating != null
                ? category.rating
                : `Calibrating ${category.scoredCount}/5`}
            </span>
          </p>
        ))}
      </section>

      {profile.recent.length > 0 ? (
        <section className="flex flex-col gap-3">
          <p className="text-xs font-semibold tracking-[0.16em] text-ink-muted uppercase">
            Recent predictions
          </p>
          {profile.recent.map((item) => (
            <div key={`${item.question}-${item.revealedAt}`} className="rounded-2xl border border-border p-4">
              <p className="font-display text-lg font-semibold leading-snug">{item.question}</p>
              <p className="mt-1 text-sm text-ink-muted">
                Accuracy {item.accuracy}
                {item.topicName ? ` · ${item.topicName}` : ""}
              </p>
            </div>
          ))}
        </section>
      ) : null}
    </main>
  );
}
