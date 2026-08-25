export function FeedbackReview({ raw }: { raw: unknown }) {
  const rows = Array.isArray(raw) ? raw : [];
  return (
    <section className="rounded-2xl border border-border bg-surface p-4">
      <p className="text-xs font-semibold tracking-[0.16em] text-ink-muted uppercase">
        Beta feedback
      </p>
      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-ink-muted">None yet.</p>
      ) : (
        <ul className="mt-3 space-y-3 text-sm">
          {rows.map((row) => {
            const item = row as {
              id: string;
              rating: string;
              comment: string | null;
              context: string;
              username: string;
              created_at: string;
            };
            return (
              <li key={item.id} className="border-t border-border pt-2">
                <p className="font-semibold">
                  {item.rating} · {item.context} · @{item.username}
                </p>
                {item.comment ? <p className="text-ink-muted">{item.comment}</p> : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
