import Link from "next/link";


export function PublicProfileView({
  player,
}: {
  player: {
    username: string;
    displayName: string;
    crowdsense: number | null;
    qualified: boolean;
    scoredCount: number;
    revealStreak: number;
    categories: {
      slug: string;
      name: string;
      rating: number | null;
      qualified: boolean;
    }[];
    recent: {
      question: string;
      accuracy: number;
      topicName: string | null;
    }[];
  };
}) {
  return (
    <main className="flex flex-1 flex-col gap-8 pb-10 pt-6">
      <header>
        <p className="text-xs font-semibold tracking-[0.18em] text-ink-muted uppercase">Player</p>
        <h1 className="mt-1 font-display text-[2rem] leading-[1.05] font-semibold tracking-tight">
          {player.displayName}
        </h1>
        <p className="text-sm text-ink-muted">@{player.username}</p>
      </header>

      <section>
        <p className="text-xs font-semibold tracking-[0.16em] text-ink-muted uppercase">CrowdSense</p>
        {player.qualified && player.crowdsense != null ? (
          <>
            <p className="font-display text-6xl font-semibold tabular-nums">{player.crowdsense}</p>
            <p className="text-sm text-ink-muted">CrowdSense {player.crowdsense}</p>
          </>
        ) : (
          <p className="font-display text-3xl font-semibold">CrowdSense — Calibrating</p>
        )}
        <p className="mt-2 text-sm text-ink-muted">{player.scoredCount} scored predictions</p>
        {player.revealStreak > 0 ? (
          <p className="mt-1 text-sm">🔥 Reveal Streak {player.revealStreak}</p>
        ) : null}
      </section>

      <section className="flex flex-col gap-2">
        {player.categories
          .filter((category) => category.qualified && category.rating != null)
          .map((category) => (
            <p key={category.slug} className="flex justify-between text-sm">
              <span>{category.name}</span>
              <span className="tabular-nums font-semibold">{category.rating}</span>
            </p>
          ))}
      </section>

      {player.recent.length > 0 ? (
        <section className="flex flex-col gap-3">
          <p className="text-xs font-semibold tracking-[0.16em] text-ink-muted uppercase">Recent</p>
          {player.recent.map((item) => (
            <div key={`${item.question}-${item.accuracy}`} className="rounded-2xl border border-border p-4">
              <p className="font-display text-lg font-semibold leading-snug">{item.question}</p>
              <p className="mt-1 text-sm text-ink-muted">
                Accuracy {item.accuracy}
                {item.topicName ? ` · ${item.topicName}` : ""}
              </p>
            </div>
          ))}
        </section>
      ) : null}

      <Link href="/leaderboard" className="text-sm font-semibold text-primary">
        Leaderboard
      </Link>
    </main>
  );
}
