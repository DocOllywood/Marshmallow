import { INVENTORY_QUICK_WARN } from "@/domain/content/schedule";
import { rate } from "@/domain/analytics/beta";

function num(value: unknown): number {
  return Number(value ?? 0);
}

export type DayInventory = {
  date: string;
  quick: number;
  live: number;
  daily: number;
};

export type ContentInventory = {
  today: DayInventory;
  tomorrow: DayInventory;
  warn_quick_below: number;
};

function parseDay(value: unknown): DayInventory {
  const row = (value ?? {}) as Record<string, unknown>;
  return {
    date: String(row.date ?? ""),
    quick: num(row.quick),
    live: num(row.live),
    daily: num(row.daily),
  };
}

export function parseContentInventory(value: unknown): ContentInventory {
  const row = (value ?? {}) as Record<string, unknown>;
  return {
    today: parseDay(row.today),
    tomorrow: parseDay(row.tomorrow),
    warn_quick_below: num(row.warn_quick_below || INVENTORY_QUICK_WARN),
  };
}

export function inventoryWarnings(inventory: ContentInventory): string[] {
  const notes: string[] = [];
  if (inventory.today.quick < inventory.warn_quick_below) {
    notes.push(`Today Quick scheduled: ${inventory.today.quick} ⚠️`);
  }
  if (inventory.today.daily < 1) {
    notes.push("Today Daily: none ⚠️");
  }
  if (inventory.tomorrow.quick < inventory.warn_quick_below) {
    notes.push(`Tomorrow Quick scheduled: ${inventory.tomorrow.quick} ⚠️`);
  }
  if (inventory.tomorrow.daily < 1) {
    notes.push("Tomorrow Daily: none ⚠️");
  }
  return notes;
}

export type CalendarRow = {
  id: string;
  question: string;
  play_mode: string;
  status: string;
  opens_at: string;
  closes_at: string;
  reveals_at: string;
  daily_on: string | null;
  archetype: string;
  topic_name: string | null;
};

export function parseContentCalendar(value: unknown): CalendarRow[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    const row = (item ?? {}) as Record<string, unknown>;
    return {
      id: String(row.id ?? ""),
      question: String(row.question ?? ""),
      play_mode: String(row.play_mode ?? ""),
      status: String(row.status ?? ""),
      opens_at: String(row.opens_at ?? ""),
      closes_at: String(row.closes_at ?? ""),
      reveals_at: String(row.reveals_at ?? ""),
      daily_on: row.daily_on == null ? null : String(row.daily_on),
      archetype: String(row.archetype ?? "freeform"),
      topic_name: row.topic_name == null ? null : String(row.topic_name),
    };
  });
}

export type ComparisonBucket = {
  label: string;
  items: number;
  views: number;
  sealed: number;
  eligible: number;
  reveal_opens: number;
  shares: number;
};

export function parseEditorialComparisons(value: unknown): {
  byArchetype: ComparisonBucket[];
  byCross: ComparisonBucket[];
} {
  const row = (value ?? {}) as Record<string, unknown>;
  const toBucket = (item: unknown, label: string): ComparisonBucket => {
    const data = (item ?? {}) as Record<string, unknown>;
    return {
      label,
      items: num(data.items),
      views: num(data.views),
      sealed: num(data.sealed),
      eligible: num(data.eligible),
      reveal_opens: num(data.reveal_opens),
      shares: num(data.shares),
    };
  };
  const archetypes = Array.isArray(row.by_archetype) ? row.by_archetype : [];
  const cross = Array.isArray(row.by_category_mode_archetype)
    ? row.by_category_mode_archetype
    : [];
  return {
    byArchetype: archetypes.map((item) => {
      const data = (item ?? {}) as Record<string, unknown>;
      return toBucket(item, String(data.archetype ?? "freeform"));
    }),
    byCross: cross.map((item) => {
      const data = (item ?? {}) as Record<string, unknown>;
      return toBucket(
        item,
        `${data.topic_name ?? "No topic"} · ${data.play_mode ?? "?"} · ${data.archetype ?? "freeform"}`,
      );
    }),
  };
}

export function comparisonRates(bucket: ComparisonBucket) {
  return {
    seal: rate(bucket.sealed, bucket.views),
    reveal: rate(bucket.reveal_opens, bucket.eligible),
    share: rate(bucket.shares, bucket.reveal_opens),
  };
}
