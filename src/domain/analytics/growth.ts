export type GrowthMetrics = {
  revealReadyCreated: number;
  revealOpensAfterNotification: number;
  medianNotifyToOpenSeconds: number | null;
  shareVisitors: number;
  sharePlayClicks: number;
  shareSignups: number;
  sharePlayRate: number | null;
  shareSignupRate: number | null;
};

export function parseGrowthMetrics(value: unknown): GrowthMetrics {
  const row = (value ?? {}) as Record<string, unknown>;
  return {
    revealReadyCreated: Number(row.reveal_ready_created ?? 0),
    revealOpensAfterNotification: Number(row.reveal_opens_after_notification ?? 0),
    medianNotifyToOpenSeconds:
      row.median_notify_to_open_seconds == null
        ? null
        : Number(row.median_notify_to_open_seconds),
    shareVisitors: Number(row.share_visitors ?? 0),
    sharePlayClicks: Number(row.share_play_clicks ?? 0),
    shareSignups: Number(row.share_signups ?? 0),
    sharePlayRate: row.share_play_rate == null ? null : Number(row.share_play_rate),
    shareSignupRate: row.share_signup_rate == null ? null : Number(row.share_signup_rate),
  };
}
