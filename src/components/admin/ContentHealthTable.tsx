"use client";

import { useMemo, useState } from "react";

import {
  compareContent,
  formatRate,
  parseContentHealth,
  rate,
  type ContentHealthRow,
} from "@/domain/analytics/beta";
import { archetypeLabel, isQuestionArchetype } from "@/domain/content/archetype";
import { playModeBadge, type PlayMode } from "@/domain/play/mode";

export function ContentHealthTable({ raw }: { raw: unknown }) {
  const rows = parseContentHealth(raw);
  const [mode, setMode] = useState("all");
  const [status, setStatus] = useState("all");
  const [archetype, setArchetype] = useState("all");
  const [from, setFrom] = useState("");

  const filtered = useMemo(
    () =>
      rows.filter((row) => {
        if (mode !== "all" && row.play_mode !== mode) return false;
        if (status !== "all" && row.status !== status) return false;
        if (archetype !== "all" && row.archetype !== archetype) return false;
        if (from && row.opens_at.slice(0, 10) < from) return false;
        return true;
      }),
    [rows, mode, status, archetype, from],
  );

  const byMode = compareContent(filtered, (row) => ({
    key: row.play_mode,
    label: row.play_mode,
  }));
  const byTopic = compareContent(filtered, (row) => ({
    key: row.topic_name ?? "none",
    label: row.topic_name ?? "No topic",
  }));
  const byChoices = compareContent(filtered, (row) => ({
    key: row.choice_count <= 2 ? "binary" : "multi",
    label: row.choice_count <= 2 ? "Binary" : "Multi-choice",
  }));
  const byArchetype = compareContent(filtered, (row) => ({
    key: row.archetype,
    label: isQuestionArchetype(row.archetype) ? archetypeLabel(row.archetype) : row.archetype,
  }));
  const byCategoryMode = compareContent(filtered, (row) => ({
    key: `${row.topic_name ?? "none"}:${row.play_mode}:${row.archetype}`,
    label: `${row.topic_name ?? "No topic"} · ${row.play_mode} · ${
      isQuestionArchetype(row.archetype) ? archetypeLabel(row.archetype) : row.archetype
    }`,
  }));

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-4">
      <p className="text-xs font-semibold tracking-[0.16em] text-ink-muted uppercase">
        Content health
      </p>
      <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        <select value={mode} onChange={(event) => setMode(event.target.value)} className="min-h-10 rounded-lg border border-border px-2">
          <option value="all">All modes</option>
          <option value="quick">Quick</option>
          <option value="live">Live</option>
          <option value="daily">Daily</option>
        </select>
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="min-h-10 rounded-lg border border-border px-2">
          <option value="all">All statuses</option>
          <option value="open">Open</option>
          <option value="closed">Closed</option>
          <option value="revealed">Revealed</option>
          <option value="scheduled">Scheduled</option>
        </select>
        <select value={archetype} onChange={(event) => setArchetype(event.target.value)} className="min-h-10 rounded-lg border border-border px-2">
          <option value="all">All archetypes</option>
          <option value="who_won">WHO WON?</option>
          <option value="pick_one">PICK ONE</option>
          <option value="will_it_happen">WILL IT HAPPEN?</option>
          <option value="freeform">FREEFORM</option>
        </select>
        <input
          type="date"
          value={from}
          onChange={(event) => setFrom(event.target.value)}
          className="min-h-10 rounded-lg border border-border px-2"
        />
      </div>
      <Comparison title="Quick vs Live vs Daily" rows={byMode} />
      <Comparison title="By topic" rows={byTopic} />
      <Comparison title="By archetype" rows={byArchetype} />
      <Comparison title="Category × mode × archetype" rows={byCategoryMode} />
      <Comparison title="Binary vs multi" rows={byChoices} />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[48rem] text-left text-xs">
          <thead>
            <tr className="text-ink-muted">
              <th className="py-1 pr-2">Question</th>
              <th>Mode</th>
              <th>Archetype</th>
              <th>Sample</th>
              <th>Views</th>
              <th>Sealed</th>
              <th>Seal rate</th>
              <th>Eligible</th>
              <th>Opens</th>
              <th>RRR</th>
              <th>Accuracy</th>
              <th>Next</th>
              <th>Cont.</th>
              <th>Shares</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <HealthRow key={row.id} row={row} />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function HealthRow({ row }: { row: ContentHealthRow }) {
  const seal = rate(row.sealed, row.views);
  const rrr = rate(row.reveal_opens, row.eligible_reveals);
  const next = rate(row.next_play, row.reveal_opens);
  const continued = rate(row.quick_continuation, row.sealed);
  return (
    <tr className="border-t border-border align-top">
      <td className="max-w-[12rem] py-1 pr-2">{row.question}</td>
      <td>{playModeBadge(row.play_mode as PlayMode)}</td>
      <td>
        {isQuestionArchetype(row.archetype) ? archetypeLabel(row.archetype) : row.archetype}
      </td>
      <td>{row.sample_size ?? "—"}</td>
      <td>{row.views}</td>
      <td>{row.sealed}</td>
      <td>{formatRate(seal)}</td>
      <td>{row.eligible_reveals}</td>
      <td>{row.reveal_opens}</td>
      <td>{formatRate(rrr)}</td>
      <td>{row.average_accuracy == null ? "—" : Math.round(row.average_accuracy)}</td>
      <td>{formatRate(next)}</td>
      <td>{formatRate(continued)}</td>
      <td>{row.shares}</td>
    </tr>
  );
}

function Comparison({
  title,
  rows,
}: {
  title: string;
  rows: ReturnType<typeof compareContent>;
}) {
  return (
    <div>
      <p className="text-xs font-semibold">{title}</p>
      <ul className="mt-1 space-y-1 text-xs text-ink-muted">
        {rows.map((row) => (
          <li key={row.key}>
            {row.label}: seal {formatRate(row.sealRate)} · reveal {formatRate(row.revealRate)} ·
            next {formatRate(row.nextPlay)} · share {formatRate(row.shareRate)}
            {row.averageAccuracy != null ? ` · acc ${Math.round(row.averageAccuracy)}` : ""}
          </li>
        ))}
      </ul>
    </div>
  );
}
