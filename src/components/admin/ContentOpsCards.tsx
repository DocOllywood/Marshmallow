import { archetypeLabel, isQuestionArchetype } from "@/domain/content/archetype";
import {
  comparisonRates,
  inventoryWarnings,
  parseContentCalendar,
  parseContentInventory,
  parseEditorialComparisons,
} from "@/domain/content/ops";
import { formatRate } from "@/domain/analytics/beta";
import { playModeBadge, type PlayMode } from "@/domain/play/mode";
import Link from "next/link";

export function ContentInventoryCard({ raw }: { raw: unknown }) {
  const inventory = parseContentInventory(raw);
  const warnings = inventoryWarnings(inventory);
  return (
    <section className="rounded-2xl border border-border bg-surface p-4">
      <p className="text-xs font-semibold tracking-[0.16em] text-ink-muted uppercase">
        Content inventory
      </p>
      <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
        <DayBlock title="Today" day={inventory.today} />
        <DayBlock title="Tomorrow" day={inventory.tomorrow} />
      </div>
      {warnings.length > 0 ? (
        <ul className="mt-3 space-y-1 text-sm text-toasted">
          {warnings.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-xs text-ink-muted">Targets look healthy. Warnings never block play.</p>
      )}
    </section>
  );
}

function DayBlock({
  title,
  day,
}: {
  title: string;
  day: { quick: number; live: number; daily: number };
}) {
  return (
    <div>
      <p className="text-xs font-semibold tracking-[0.14em] uppercase">{title}</p>
      <p>Quick scheduled: {day.quick}</p>
      <p>Live: {day.live}</p>
      <p>Daily: {day.daily === 0 ? "none" : day.daily}</p>
    </div>
  );
}

export function ContentCalendarCard({ raw }: { raw: unknown }) {
  const rows = parseContentCalendar(raw);
  return (
    <section className="rounded-2xl border border-border bg-surface p-4">
      <p className="text-xs font-semibold tracking-[0.16em] text-ink-muted uppercase">
        Content calendar
      </p>
      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-ink-muted">Nothing opening in the next week.</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {rows.map((row) => (
            <li key={row.id}>
              <Link href={`/admin/marshmallows/${row.id}`} className="block text-sm">
                <span className="font-semibold">
                  {playModeBadge(row.play_mode as PlayMode)}
                </span>{" "}
                {clock(row.opens_at)} · {row.question}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function EditorialComparisonCard({ raw }: { raw: unknown }) {
  const parsed = parseEditorialComparisons(raw);
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-4">
      <p className="text-xs font-semibold tracking-[0.16em] text-ink-muted uppercase">
        Archetype performance
      </p>
      <p className="text-xs text-ink-muted">
        Revealed items only. Do not declare a winner with a tiny sample.
      </p>
      {parsed.byArchetype.length === 0 ? (
        <p className="text-sm text-ink-muted">No revealed editorial data yet.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {parsed.byArchetype.map((bucket) => {
            const rates = comparisonRates(bucket);
            const label = isQuestionArchetype(bucket.label)
              ? archetypeLabel(bucket.label)
              : bucket.label;
            return (
              <li key={bucket.label}>
                <p className="font-semibold">{label}</p>
                <p className="text-xs text-ink-muted">
                  n={bucket.items} · seal {formatRate(rates.seal)} · reveal {formatRate(rates.reveal)}{" "}
                  · share {formatRate(rates.share)}
                </p>
              </li>
            );
          })}
        </ul>
      )}
      {parsed.byCross.length > 0 ? (
        <div>
          <p className="text-xs font-semibold tracking-[0.14em] uppercase">
            Category × mode × archetype
          </p>
          <ul className="mt-2 space-y-1 text-xs text-ink-muted">
            {parsed.byCross.map((bucket) => {
              const rates = comparisonRates(bucket);
              return (
                <li key={bucket.label}>
                  {bucket.label}: n={bucket.items} · seal {formatRate(rates.seal)} · reveal{" "}
                  {formatRate(rates.reveal)}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function clock(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
