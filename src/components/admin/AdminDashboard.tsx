"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { StatusBadge } from "@/components/admin/StatusBadge";
import { PrimaryButton } from "@/components/PrimaryButton";
import { playModeBadge, type PlayMode } from "@/domain/play/mode";
import type { Database } from "@/lib/supabase/types";

type Status = Database["public"]["Enums"]["marshmallow_status"];

type AdminRow = {
  id: string;
  question: string;
  status: Status;
  opens_at: string;
  closes_at: string;
  reveals_at: string;
  is_daily: boolean;
  play_mode: PlayMode;
  daily_on: string | null;
  topics: { name: string; slug: string } | { name: string; slug: string }[] | null;
};

const SECTIONS: { status: Status; title: string }[] = [
  { status: "draft", title: "Draft" },
  { status: "scheduled", title: "Upcoming schedule" },
  { status: "open", title: "Open" },
  { status: "closed", title: "Closed / awaiting reveal" },
  { status: "cancelled", title: "Cancelled" },
  { status: "revealed", title: "Revealed" },
  { status: "archived", title: "Archived" },
];

export function AdminDashboard({ rows }: { rows: AdminRow[] }) {
  const [mode, setMode] = useState("all");
  const [status, setStatus] = useState("all");
  const [from, setFrom] = useState("");

  const filtered = useMemo(
    () =>
      rows.filter((row) => {
        if (mode !== "all" && row.play_mode !== mode) return false;
        if (status !== "all" && row.status !== status) return false;
        if (from && row.opens_at.slice(0, 10) < from) return false;
        return true;
      }),
    [rows, mode, status, from],
  );

  return (
    <div className="flex flex-col gap-8 pb-10">
      <div className="grid grid-cols-3 gap-2 text-xs">
        <select value={mode} onChange={(event) => setMode(event.target.value)} className="min-h-10 rounded-lg border border-border px-2">
          <option value="all">All modes</option>
          <option value="quick">Quick</option>
          <option value="live">Live</option>
          <option value="daily">Daily</option>
        </select>
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="min-h-10 rounded-lg border border-border px-2">
          <option value="all">All statuses</option>
          {SECTIONS.map((section) => (
            <option key={section.status} value={section.status}>
              {section.title}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={from}
          onChange={(event) => setFrom(event.target.value)}
          className="min-h-10 rounded-lg border border-border px-2"
        />
      </div>
      {SECTIONS.map((section) => {
        const items = filtered.filter((row) => row.status === section.status);
        return (
          <section key={section.status} className="flex flex-col gap-3">
            <h2 className="font-display text-xl font-semibold tracking-tight">
              {section.title}
            </h2>
            {items.length === 0 ? (
              <p className="text-sm text-ink-muted">None.</p>
            ) : (
              items.map((row) => <AdminMarshmallowRow key={row.id} row={row} />)
            )}
          </section>
        );
      })}
    </div>
  );
}

function AdminMarshmallowRow({ row }: { row: AdminRow }) {
  const topic = Array.isArray(row.topics) ? row.topics[0] : row.topics;

  return (
    <article className="rounded-[1.5rem] border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="font-display text-lg leading-snug font-semibold">{row.question}</p>
        <StatusBadge status={row.status} />
      </div>
      <p className="mt-2 text-xs text-ink-muted">
        {playModeBadge(row.play_mode)} · {topic?.name ?? "No topic"}
      </p>
      <dl className="mt-3 space-y-1 text-xs text-ink-muted">
        <TimeRow label="Opens" iso={row.opens_at} />
        <TimeRow label="Closes" iso={row.closes_at} />
        <TimeRow label="Reveals" iso={row.reveals_at} />
      </dl>
      <Link
        href={`/admin/marshmallows/${row.id}`}
        className="mt-4 inline-flex min-h-10 items-center text-sm font-semibold text-primary"
      >
        Edit / view
      </Link>
    </article>
  );
}

function TimeRow({ label, iso }: { label: string; iso: string }) {
  const date = new Date(iso);
  const local = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return (
    <div>
      <dt className="inline font-semibold">{label}: </dt>
      <dd className="inline">
        {local} ({zone})
      </dd>
    </div>
  );
}

export function AdminHeaderActions() {
  return (
    <div className="grid grid-cols-2 gap-2">
      <PrimaryButton href="/admin/marshmallows/new">New Marshmallow</PrimaryButton>
      <PrimaryButton href="/admin/batch" className="bg-surface text-ink">
        Batch Quick
      </PrimaryButton>
      <Link href="/admin/sets" className="min-h-11 text-center text-sm font-semibold text-primary">
        Quick Sets
      </Link>
      <Link href="/admin/templates" className="min-h-11 text-center text-sm font-semibold text-primary">
        Templates
      </Link>
    </div>
  );
}
