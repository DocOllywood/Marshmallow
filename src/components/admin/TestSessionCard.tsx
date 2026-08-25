"use client";

import { useActionState } from "react";

import { parseQuickTestSession, type QuickTestBoardRow } from "@/domain/analytics/beta";
import { isPromotedQuick, PROMOTED_QUICK_TARGET } from "@/domain/play/rotation";
import {
  promoteNextQuickAction,
  setQuickPriorityAction,
  swapQuickPriorityAction,
} from "@/server/actions/admin";

function clockLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function isActive(row: QuickTestBoardRow): boolean {
  return row.status === "scheduled" || row.status === "open";
}

export function TestSessionCard({ raw }: { raw: unknown }) {
  const session = parseQuickTestSession(raw);
  const { inventory } = session;
  const active = session.board.filter(isActive);
  const promoted = active
    .filter((row) => isPromotedQuick(row.quick_priority))
    .sort((a, b) => (a.quick_priority ?? 99) - (b.quick_priority ?? 99));
  const queued = active.filter((row) => !isPromotedQuick(row.quick_priority));
  const rest = session.board.filter((row) => !isActive(row));

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-4">
      <p className="text-xs font-semibold tracking-[0.16em] text-ink-muted uppercase">
        Test session
      </p>

      <div>
        <p className="text-xs font-semibold tracking-[0.14em] uppercase">Quick inventory</p>
        <dl className="mt-2 grid grid-cols-3 gap-2 text-sm">
          <div>
            <dt className="text-ink-muted">Open</dt>
            <dd className="font-semibold tabular-nums">{inventory.open}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Promoted</dt>
            <dd className="font-semibold tabular-nums">
              {inventory.promoted_open}/{inventory.promoted_target || PROMOTED_QUICK_TARGET}
            </dd>
          </div>
          <div>
            <dt className="text-ink-muted">Cooking</dt>
            <dd className="font-semibold tabular-nums">{inventory.cooking}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Ready</dt>
            <dd className="font-semibold tabular-nums">{inventory.ready}</dd>
          </div>
        </dl>
        {inventory.warning ? (
          <p role="status" className="mt-2 text-sm text-toasted">
            Fewer than {inventory.warn_below} open Quick Marshmallows. App still works — add more
            before inviting testers.
          </p>
        ) : (
          <p className="mt-2 text-xs text-ink-muted">
            Inventory warning threshold is {inventory.warn_below} open Quick. First-session users
            see the promoted pool first.
          </p>
        )}
        <p className="mt-1 text-sm">
          Eligible players:{" "}
          <span className="font-semibold tabular-nums">{session.eligible_players}</span>
        </p>
      </div>

      <Pool
        title="Promoted Quick pool"
        empty="No promoted Quicks. Promote the next queued item."
        rows={promoted}
        kind="promoted"
      />
      <Pool title="Queued Quick" empty="No queued Quick items." rows={queued} kind="queued" />
      <PromoteNextButton />

      {rest.length > 0 ? (
        <div>
          <p className="text-xs font-semibold tracking-[0.14em] uppercase">Cooking / ready</p>
          <ol className="mt-2 flex flex-col gap-3">
            {rest.map((row) => (
              <BoardRow key={row.id} row={row} />
            ))}
          </ol>
        </div>
      ) : null}

      <p className="text-xs text-ink-muted">Counts only. No predictions or percentages.</p>
    </section>
  );
}

function Pool({
  title,
  empty,
  rows,
  kind,
}: {
  title: string;
  empty: string;
  rows: QuickTestBoardRow[];
  kind: "promoted" | "queued";
}) {
  return (
    <div>
      <p className="text-xs font-semibold tracking-[0.14em] uppercase">{title}</p>
      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-ink-muted">{empty}</p>
      ) : (
        <ol className="mt-2 flex flex-col gap-3">
          {rows.map((row, index) => (
            <li key={row.id} className="rounded-xl border border-border bg-canvas p-3">
              <BoardRow row={row} />
              <div className="mt-2 flex flex-wrap gap-2">
                {kind === "promoted" ? (
                  <>
                    {index > 0 ? (
                      <SwapButton current={row} other={rows[index - 1]!} label="Move up" />
                    ) : null}
                    {index < rows.length - 1 ? (
                      <SwapButton current={row} other={rows[index + 1]!} label="Move down" />
                    ) : null}
                    <PriorityButton id={row.id} priority={0} label="Queue" />
                  </>
                ) : (
                  <PriorityButton id={row.id} priority={-1} label="Promote" />
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function BoardRow({ row }: { row: QuickTestBoardRow }) {
  return (
    <>
      <p className="mt-1 font-display text-base font-semibold leading-snug">{row.question}</p>
      <p className="mt-1 text-sm capitalize">
        {row.status}
        {isPromotedQuick(row.quick_priority) ? ` · #${row.quick_priority}` : ""}
      </p>
      <p className="text-xs text-ink-muted">
        closes {clockLabel(row.closes_at)} → target reveal {clockLabel(row.reveals_at)}
        {row.hard_reveals_at !== row.reveals_at
          ? ` → hard ${clockLabel(row.hard_reveals_at)}`
          : null}
      </p>
      <p className="mt-1 text-xs text-ink-muted">
        Sealed {row.sealed_count}
        {row.minimum_result_sample > 0 ? ` · min sample ${row.minimum_result_sample}` : null}
        {row.ready_to_finalize ? " · ready to finalize" : null}
        {row.result_available_at ? " · result available" : null}
      </p>
    </>
  );
}

function PriorityButton({
  id,
  priority,
  label,
}: {
  id: string;
  priority: number;
  label: string;
}) {
  const [state, action, pending] = useActionState(setQuickPriorityAction, null);
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="priority" value={priority} />
      <button type="submit" disabled={pending} className="min-h-11 text-sm font-semibold text-primary">
        {pending ? "Saving…" : label}
      </button>
      {state?.error ? <p className="text-xs text-toasted">{state.error}</p> : null}
    </form>
  );
}

function SwapButton({
  current,
  other,
  label,
}: {
  current: QuickTestBoardRow;
  other: QuickTestBoardRow;
  label: string;
}) {
  const [state, action, pending] = useActionState(swapQuickPriorityAction, null);
  return (
    <form action={action}>
      <input type="hidden" name="id_a" value={current.id} />
      <input type="hidden" name="id_b" value={other.id} />
      <input type="hidden" name="priority_a" value={current.quick_priority ?? 0} />
      <input type="hidden" name="priority_b" value={other.quick_priority ?? 0} />
      <button type="submit" disabled={pending} className="min-h-11 text-sm font-semibold text-primary">
        {pending ? "Saving…" : label}
      </button>
      {state?.error ? <p className="text-xs text-toasted">{state.error}</p> : null}
    </form>
  );
}

function PromoteNextButton() {
  const [state, action, pending] = useActionState(promoteNextQuickAction, null);
  return (
    <form action={action}>
      <button
        type="submit"
        disabled={pending}
        className="min-h-12 w-full rounded-full border border-border text-sm font-semibold"
      >
        {pending ? "Promoting…" : "Promote next queued Quick"}
      </button>
      {state?.error ? <p className="mt-2 text-sm text-toasted">{state.error}</p> : null}
    </form>
  );
}
