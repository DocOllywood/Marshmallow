"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";

import { PrimaryButton } from "@/components/PrimaryButton";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toDatetimeLocalValue } from "@/lib/datetime/local";
import {
  archiveMarshmallowAction,
  duplicateMarshmallowAction,
  emergencyCloseAction,
  saveDraftAction,
  saveTemplateAction,
  scheduleMarshmallowAction,
  type AdminActionState,
} from "@/server/actions/admin";
import {
  CONTENT_FRESHNESS,
  QUESTION_ARCHETYPES,
  archetypeLabel,
  archetypePrompt,
  freshnessLabel,
  type ContentFreshness,
  type QuestionArchetype,
} from "@/domain/content/archetype";
import {
  EDITORIAL_CHECKS,
  editorialCheckLabel,
  editorialCheckPrompt,
  parseChecklist,
} from "@/domain/content/checklist";
import { LONG_QUESTION_WARNING, isLongChoice, isLongQuestion } from "@/domain/content/length";
import { PLAY_MODES, playModeBadge, type PlayMode } from "@/domain/play/mode";
import { dailyOnFromOpensAt, schedulePreset } from "@/domain/play/schedule";
import { defaultMinimumSample } from "@/domain/play/sample";
import type { Database } from "@/lib/supabase/types";

type Topic = Pick<
  Database["public"]["Tables"]["topics"]["Row"],
  "id" | "name" | "slug" | "kind" | "parent_id"
>;

type MarshmallowStatus = Database["public"]["Enums"]["marshmallow_status"];

type ComposerFormProps = {
  topics: Topic[];
  sets?: { id: string; name: string }[];
  marshmallow?: {
    id: string;
    question: string;
    topic_id: string | null;
    opens_at: string;
    closes_at: string;
    reveals_at: string;
    hard_reveals_at: string;
    minimum_result_sample: number;
    is_daily: boolean;
    play_mode: PlayMode;
    daily_on: string | null;
    status: MarshmallowStatus;
    entity_label: string | null;
    spoiler_context: string | null;
    image_url: string | null;
    expires_at: string | null;
    marshmallow_choices: { label: string; sort_order: number }[] | null;
    editorial?: {
      archetype: QuestionArchetype | string | null;
      freshness: ContentFreshness | string | null;
      checklist: unknown;
      content_set_id: string | null;
    } | null;
  };
  dailyConflicts?: { id: string; question: string; daily_on: string | null }[];
};

export function ComposerForm({
  topics,
  sets = [],
  marshmallow,
  dailyConflicts = [],
}: ComposerFormProps) {
  const locked = marshmallow
    ? !["draft", "scheduled"].includes(marshmallow.status)
    : false;
  const canEmergency =
    marshmallow?.status === "open" || marshmallow?.status === "scheduled";
  const canArchive = marshmallow && marshmallow.status !== "open";

  const initialChoices = useMemo(() => {
    const existing = [...(marshmallow?.marshmallow_choices ?? [])].sort(
      (a, b) => a.sort_order - b.sort_order,
    );
    const labels = existing.map((choice) => choice.label);
    while (labels.length < 2) {
      labels.push("");
    }
    return labels.slice(0, 4);
  }, [marshmallow]);

  const [choices, setChoices] = useState<string[]>(initialChoices);
  const [opensAt, setOpensAt] = useState(() =>
    toDatetimeLocalValue(marshmallow?.opens_at ?? schedulePreset("quick").opensAt),
  );
  const [closesAt, setClosesAt] = useState(() =>
    toDatetimeLocalValue(marshmallow?.closes_at ?? schedulePreset("quick").closesAt),
  );
  const [revealsAt, setRevealsAt] = useState(() =>
    toDatetimeLocalValue(marshmallow?.reveals_at ?? schedulePreset("quick").revealsAt),
  );
  const [hardRevealsAt, setHardRevealsAt] = useState(() =>
    toDatetimeLocalValue(marshmallow?.hard_reveals_at ?? schedulePreset("quick").hardRevealsAt),
  );
  const [minSample, setMinSample] = useState(
    String(marshmallow?.minimum_result_sample ?? defaultMinimumSample("quick")),
  );
  const [playMode, setPlayMode] = useState<PlayMode>(marshmallow?.play_mode ?? "quick");
  const [question, setQuestion] = useState(marshmallow?.question ?? "");
  const [archetype, setArchetype] = useState<QuestionArchetype>(
    (marshmallow?.editorial?.archetype as QuestionArchetype) ?? "freeform",
  );
  const checklist = parseChecklist(marshmallow?.editorial?.checklist);

  const [saveState, saveAction, saving] = useActionState(saveDraftAction, null);
  const [scheduleState, scheduleAction, scheduling] = useActionState(
    scheduleMarshmallowAction,
    null,
  );
  const error = visibleError(saveState) ?? visibleError(scheduleState);

  function applyPreset(mode: PlayMode) {
    const preset = schedulePreset(mode);
    setOpensAt(toDatetimeLocalValue(preset.opensAt));
    setClosesAt(toDatetimeLocalValue(preset.closesAt));
    setRevealsAt(toDatetimeLocalValue(preset.revealsAt));
    setHardRevealsAt(toDatetimeLocalValue(preset.hardRevealsAt));
    setMinSample(String(defaultMinimumSample(mode)));
  }

  function selectMode(mode: PlayMode) {
    setPlayMode(mode);
    if (!locked && !marshmallow) {
      applyPreset(mode);
    }
  }

  const selectedDailyOn = playMode === "daily" ? dailyOnFromOpensAt(new Date(opensAt).toISOString()) : null;
  const conflict = dailyConflicts.find(
    (row) =>
      row.daily_on === selectedDailyOn && row.id !== marshmallow?.id,
  );

  function moveChoice(index: number, direction: -1 | 1) {
    const next = [...choices];
    const swap = index + direction;
    if (swap < 0 || swap >= next.length) {
      return;
    }
    const current = next[index];
    const other = next[swap];
    if (current === undefined || other === undefined) {
      return;
    }
    next[index] = other;
    next[swap] = current;
    setChoices(next);
  }

  return (
    <div className="flex flex-col gap-6 pb-10">
      {marshmallow ? <StatusBadge status={marshmallow.status} /> : null}

      <form action={saveAction} className="flex flex-col gap-5">
        {marshmallow ? <input type="hidden" name="id" value={marshmallow.id} /> : null}

        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-semibold">Archetype</legend>
          <select
            name="archetype"
            value={archetype}
            disabled={locked}
            onChange={(event) => setArchetype(event.target.value as QuestionArchetype)}
            className="min-h-12 rounded-xl border border-border bg-surface px-3 text-base"
          >
            {QUESTION_ARCHETYPES.map((item) => (
              <option key={item} value={item}>
                {archetypeLabel(item)}
              </option>
            ))}
          </select>
          <p className="text-xs text-ink-muted">{archetypePrompt(archetype)}</p>
        </fieldset>

        <div className="flex flex-col gap-2">
          <Label htmlFor="question">Question</Label>
          <textarea
            id="question"
            name="question"
            required
            minLength={8}
            maxLength={280}
            value={question}
            disabled={locked}
            rows={3}
            onChange={(event) => setQuestion(event.target.value)}
            className="min-h-24 rounded-xl border border-border bg-surface px-3 py-3 text-base leading-6"
          />
          <p className="text-xs text-ink-muted">{question.trim().length}/280</p>
          {isLongQuestion(question) ? (
            <p role="status" className="text-sm text-toasted">
              {LONG_QUESTION_WARNING}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="topic_id">Topic</Label>
          <select
            id="topic_id"
            name="topic_id"
            defaultValue={marshmallow?.topic_id ?? ""}
            disabled={locked}
            className="min-h-12 rounded-xl border border-border bg-surface px-3 text-base"
          >
            <option value="">No topic</option>
            {topics.map((topic) => (
              <option key={topic.id} value={topic.id}>
                {topic.name} ({topic.kind})
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="entity_label">Show / person / entity</Label>
          <Input
            id="entity_label"
            name="entity_label"
            defaultValue={marshmallow?.entity_label ?? ""}
            disabled={locked}
            maxLength={80}
            placeholder="Island Heat, Aria Quinn…"
            className="min-h-12 rounded-xl bg-surface px-3 text-base"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="spoiler_context">Spoiler warning</Label>
          <Input
            id="spoiler_context"
            name="spoiler_context"
            defaultValue={marshmallow?.spoiler_context ?? ""}
            disabled={locked}
            maxLength={80}
            placeholder="SPOILERS: Episode 6"
            className="min-h-12 rounded-xl bg-surface px-3 text-base"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="image_url">Optional image URL</Label>
          <Input
            id="image_url"
            name="image_url"
            defaultValue={marshmallow?.image_url ?? ""}
            disabled={locked}
            placeholder="https://…"
            className="min-h-12 rounded-xl bg-surface px-3 text-base"
          />
          <p className="text-xs text-ink-muted">
            Manual https URL only. Playable without an image. Do not scrape.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="freshness">Freshness</Label>
            <select
              id="freshness"
              name="freshness"
              defaultValue={marshmallow?.editorial?.freshness ?? "timely"}
              disabled={locked}
              className="min-h-12 rounded-xl border border-border bg-surface px-3 text-base"
            >
              {CONTENT_FRESHNESS.map((item) => (
                <option key={item} value={item}>
                  {freshnessLabel(item)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="content_set_id">Quick Set</Label>
            <select
              id="content_set_id"
              name="content_set_id"
              defaultValue={marshmallow?.editorial?.content_set_id ?? ""}
              disabled={locked}
              className="min-h-12 rounded-xl border border-border bg-surface px-3 text-base"
            >
              <option value="">None</option>
              {sets.map((set) => (
                <option key={set.id} value={set.id}>
                  {set.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="expires_at">Expire from discovery after</Label>
          <Input
            id="expires_at"
            name="expires_at"
            type="datetime-local"
            defaultValue={
              marshmallow?.expires_at ? toDatetimeLocalValue(marshmallow.expires_at) : ""
            }
            disabled={locked}
            className="min-h-12 rounded-xl bg-surface px-3 text-base"
          />
          <p className="text-xs text-ink-muted">
            Hides stale items from Home discovery. Scores stay.
          </p>
        </div>

        <fieldset className="flex flex-col gap-2 rounded-2xl border border-border p-3">
          <legend className="text-sm font-semibold">Editorial checklist</legend>
          <p className="text-xs text-ink-muted">
            Reminders only. Do not publish unverified accusations as fact. A good Marshmallow
            makes people want to answer and want to see the crowd.
          </p>
          {EDITORIAL_CHECKS.map((key) => (
            <label key={key} className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                name={`checklist_${key}`}
                defaultChecked={checklist[key]}
                disabled={locked}
                className="mt-1"
              />
              <span>
                <span className="font-semibold">{editorialCheckLabel(key)}</span>
                <span className="block text-xs text-ink-muted">{editorialCheckPrompt(key)}</span>
              </span>
            </label>
          ))}
        </fieldset>

        <fieldset className="flex flex-col gap-3">
          <legend className="text-sm font-semibold">Choices</legend>
          {choices.map((choice, index) => (
            <div key={index} className="flex gap-2">
              <Input
                name="choice"
                value={choice}
                disabled={locked}
                maxLength={80}
                placeholder={`Choice ${index + 1}`}
                onChange={(event) => {
                  const next = [...choices];
                  next[index] = event.target.value;
                  setChoices(next);
                }}
                className="min-h-12 rounded-xl bg-surface px-3 text-base"
              />
              <button
                type="button"
                disabled={locked || index === 0}
                onClick={() => moveChoice(index, -1)}
                className="min-h-12 min-w-10 rounded-xl border border-border text-sm"
              >
                ↑
              </button>
              <button
                type="button"
                disabled={locked || index === choices.length - 1}
                onClick={() => moveChoice(index, 1)}
                className="min-h-12 min-w-10 rounded-xl border border-border text-sm"
              >
                ↓
              </button>
            </div>
          ))}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={locked || choices.length >= 4}
              onClick={() => setChoices([...choices, ""])}
              className="text-sm font-semibold text-primary"
            >
              Add choice
            </button>
            {choices.length > 2 ? (
              <button
                type="button"
                disabled={locked}
                onClick={() => setChoices(choices.slice(0, -1))}
                className="text-sm font-semibold text-ink-muted"
              >
                Remove last
              </button>
            ) : null}
          </div>
          {choices.some((choice) => isLongChoice(choice)) ? (
            <p role="status" className="text-sm text-toasted">
              Short choices read faster on a phone.
            </p>
          ) : null}
        </fieldset>

        <p className="rounded-xl bg-surface px-3 py-2 text-xs leading-5 text-ink-muted">
          Times are entered in your browser timezone (
          {Intl.DateTimeFormat().resolvedOptions().timeZone}) and saved as UTC.
        </p>

        <div className="flex flex-col gap-2">
          <Label htmlFor="opens_at">Opens</Label>
          <Input
            id="opens_at"
            name="opens_at"
            type="datetime-local"
            required
            disabled={locked}
            value={opensAt}
            onChange={(event) => setOpensAt(event.target.value)}
            className="min-h-12 rounded-xl bg-surface px-3 text-base"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="closes_at">Closes</Label>
          <Input
            id="closes_at"
            name="closes_at"
            type="datetime-local"
            required
            disabled={locked}
            value={closesAt}
            onChange={(event) => setClosesAt(event.target.value)}
            className="min-h-12 rounded-xl bg-surface px-3 text-base"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="reveals_at">Reveals</Label>
          <Input
            id="reveals_at"
            name="reveals_at"
            type="datetime-local"
            required
            disabled={locked}
            value={revealsAt}
            onChange={(event) => setRevealsAt(event.target.value)}
            className="min-h-12 rounded-xl bg-surface px-3 text-base"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="hard_reveals_at">Hard reveal</Label>
          <Input
            id="hard_reveals_at"
            name="hard_reveals_at"
            type="datetime-local"
            required
            disabled={locked}
            value={hardRevealsAt}
            onChange={(event) => setHardRevealsAt(event.target.value)}
            className="min-h-12 rounded-xl bg-surface px-3 text-base"
          />
          <p className="text-xs text-ink-muted">
            Never wait past this time for a minimum sample.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="minimum_result_sample">Minimum sample</Label>
          <Input
            id="minimum_result_sample"
            name="minimum_result_sample"
            type="number"
            min={0}
            disabled={locked}
            value={minSample}
            onChange={(event) => setMinSample(event.target.value)}
            className="min-h-12 rounded-xl bg-surface px-3 text-base"
          />
          <p className="text-xs text-ink-muted">
            Quick default is 5 for beta. Live/Daily default is 0.
          </p>
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-semibold">Mode</legend>
          <input type="hidden" name="play_mode" value={playMode} />
          {playMode === "daily" ? <input type="hidden" name="is_daily" value="on" /> : null}
          <div className="grid grid-cols-3 gap-2">
            {PLAY_MODES.map((mode) => (
              <button
                key={mode}
                type="button"
                disabled={locked}
                onClick={() => selectMode(mode)}
                className={`min-h-12 rounded-xl border text-xs font-semibold ${
                  playMode === mode ? "border-ink bg-ink text-canvas" : "border-border"
                }`}
              >
                {playModeBadge(mode)}
              </button>
            ))}
          </div>
          <p className="text-xs text-ink-muted">
            Mode is product intent. Timestamps stay authoritative.
          </p>
          {!locked ? (
            <button
              type="button"
              onClick={() => applyPreset(playMode)}
              className="min-h-11 rounded-full border border-border text-sm font-semibold"
            >
              {playMode === "quick"
                ? "Helper: open now, close 3m, target reveal 4m, hard 10m"
                : playMode === "live"
                  ? "Helper: open now, close 30m, reveal 45m"
                  : "Helper: open now, close 12h, reveal 18h"}
            </button>
          ) : null}
          {conflict ? (
            <p role="alert" className="text-sm text-toasted">
              Daily conflict on {conflict.daily_on}: “{conflict.question}”
            </p>
          ) : null}
        </fieldset>

        <div className="rounded-[1.25rem] border border-border bg-canvas p-4">
          <p className="text-xs font-semibold tracking-[0.16em] text-ink-muted uppercase">
            Mobile preview
          </p>
          <p className="mt-2 text-xs font-semibold">{playModeBadge(playMode)}</p>
          <p className="text-xs font-semibold tracking-[0.14em] text-ink-muted uppercase">
            {archetypeLabel(archetype)}
          </p>
          <p className="font-display text-xl font-semibold leading-snug">
            {question || "Question stays primary."}
          </p>
        </div>

        {error ? (
          <p role="alert" className="text-sm text-toasted">
            {error}
          </p>
        ) : null}
        {saveState && saveState.error === "" ? (
          <p role="status" className="text-sm text-positive">
            Draft saved.
          </p>
        ) : null}

        {!locked ? (
          <div className="flex flex-col gap-3">
            <PrimaryButton type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save draft"}
            </PrimaryButton>
            <PrimaryButton type="submit" formAction={scheduleAction} disabled={scheduling}>
              {scheduling ? "Scheduling…" : "Schedule"}
            </PrimaryButton>
          </div>
        ) : (
          <p className="text-sm text-ink-muted">
            Live or closed Marshmallows cannot change question, choices, or open time.
          </p>
        )}
      </form>

      {marshmallow ? <DuplicateForm id={marshmallow.id} /> : null}
      {marshmallow ? <SaveTemplateForm id={marshmallow.id} question={question} /> : null}
      {canEmergency && marshmallow ? (
        <EmergencyCloseForm id={marshmallow.id} />
      ) : null}
      {canArchive && marshmallow ? (
        <ArchiveForm id={marshmallow.id} />
      ) : null}

      <Link href="/admin" className="text-center text-sm font-semibold text-ink-muted">
        Back to kitchen
      </Link>
    </div>
  );
}

function visibleError(state: AdminActionState): string | null {
  if (!state?.error) {
    return null;
  }
  return state.error;
}

function SaveTemplateForm({ id, question }: { id: string; question: string }) {
  const [state, action, pending] = useActionState(saveTemplateAction, null);
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="template_name" value={question.slice(0, 80)} />
      {state?.error ? <p className="text-sm text-toasted">{state.error}</p> : null}
      {state && state.error === "" ? (
        <p role="status" className="text-sm text-positive">
          Template saved.
        </p>
      ) : null}
      <button type="submit" disabled={pending} className="min-h-12 text-sm font-semibold text-primary">
        {pending ? "Saving template…" : "Save as template"}
      </button>
    </form>
  );
}

function DuplicateForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState(duplicateMarshmallowAction, null);
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      {state?.error ? <p className="mb-2 text-sm text-toasted">{state.error}</p> : null}
      <button type="submit" disabled={pending} className="min-h-12 text-sm font-semibold text-primary">
        {pending ? "Duplicating…" : "Duplicate into draft"}
      </button>
    </form>
  );
}

function EmergencyCloseForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState(emergencyCloseAction, null);
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="min-h-12 rounded-full border border-toasted bg-toasted-canvas text-sm font-semibold text-toasted"
      >
        Emergency close
      </button>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-3 rounded-[1.5rem] border border-toasted bg-toasted-canvas p-4">
      <input type="hidden" name="id" value={id} />
      <p className="text-sm font-semibold text-toasted">This stops new play. It will not reveal results.</p>
      <Label htmlFor="reason">Reason</Label>
      <textarea
        id="reason"
        name="reason"
        required
        minLength={3}
        className="min-h-20 rounded-xl border border-toasted/40 bg-surface px-3 py-2 text-sm"
      />
      {state?.error ? <p className="text-sm text-toasted">{state.error}</p> : null}
      <PrimaryButton type="submit" disabled={pending} className="bg-toasted">
        {pending ? "Closing…" : "Confirm emergency close"}
      </PrimaryButton>
      <button type="button" onClick={() => setConfirming(false)} className="text-sm font-semibold">
        Cancel
      </button>
    </form>
  );
}

function ArchiveForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState(archiveMarshmallowAction, null);
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="min-h-12 text-sm font-semibold text-ink-muted"
      >
        Archive
      </button>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="id" value={id} />
      <p className="text-sm text-ink-muted">Archive hides this from the lifecycle. Confirm?</p>
      {state?.error ? <p className="text-sm text-toasted">{state.error}</p> : null}
      <PrimaryButton type="submit" disabled={pending}>
        {pending ? "Archiving…" : "Confirm archive"}
      </PrimaryButton>
      <button type="button" onClick={() => setConfirming(false)} className="text-sm font-semibold">
        Cancel
      </button>
    </form>
  );
}

