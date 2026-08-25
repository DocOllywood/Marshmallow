export type RevealReturnMetrics = {
  eligible_sealed_reveals: number;
  first_reveal_opens: number;
  rrr: number | null;
  bonus_qualified: number;
  bonus_rate: number | null;
  median_open_seconds: number | null;
};

export function parseRevealReturnMetrics(value: unknown): RevealReturnMetrics {
  const row = (value ?? {}) as Record<string, unknown>;
  return {
    eligible_sealed_reveals: Number(row.eligible_sealed_reveals ?? 0),
    first_reveal_opens: Number(row.first_reveal_opens ?? 0),
    rrr: row.rrr == null ? null : Number(row.rrr),
    bonus_qualified: Number(row.bonus_qualified ?? 0),
    bonus_rate: row.bonus_rate == null ? null : Number(row.bonus_rate),
    median_open_seconds: row.median_open_seconds == null ? null : Number(row.median_open_seconds),
  };
}
