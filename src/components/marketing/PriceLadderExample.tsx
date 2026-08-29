const rows = [
  { amount: "$1,000", answer: "NO" },
  { amount: "$10,000", answer: "NO" },
  { amount: "$100,000", answer: "…" },
] as const;

export function PriceLadderExample() {
  return (
    <div className="w-full max-w-[18rem] rounded-2xl border border-border bg-surface px-4 py-4 text-left">
      <p className="text-[10px] font-semibold tracking-[0.2em] text-ink-muted uppercase">
        You said no.
      </p>
      <ul className="mt-3 flex flex-col gap-2.5">
        {rows.map((row) => (
          <li key={row.amount} className="flex items-baseline justify-between gap-3">
            <span className="font-display text-base font-semibold tabular-nums text-ink">{row.amount}</span>
            <span className="text-xs font-semibold tracking-[0.16em] text-ink-muted uppercase">
              {row.answer}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
