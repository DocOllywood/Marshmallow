export const PLAY_MODES = ["quick", "live", "daily"] as const;
export type PlayMode = (typeof PLAY_MODES)[number];

export function isPlayMode(value: string | null | undefined): value is PlayMode {
  return value === "quick" || value === "live" || value === "daily";
}

export function playModeFromDailyFlag(isDaily: boolean): PlayMode {
  return isDaily ? "daily" : "live";
}

export function playModeLabel(mode: PlayMode): string {
  if (mode === "quick") return "QUICK";
  if (mode === "live") return "LIVE";
  return "DAILY";
}

export function playModeEmoji(mode: PlayMode): string {
  if (mode === "quick") return "⚡";
  if (mode === "live") return "🔥";
  return "☁️";
}

export function playModeBadge(mode: PlayMode): string {
  return `${playModeEmoji(mode)} ${playModeLabel(mode)}`;
}

export function playModeTimingCopy(mode: PlayMode): string {
  if (mode === "quick") return "Results soon";
  if (mode === "live") return "Results after it closes";
  return "Come back for the reveal";
}

export type NextPickContext =
  | "after_quick_seal"
  | "after_quick_reveal"
  | "after_other_reveal"
  | "first_session";

export function crowdVoiceLabel(totalVotes: number): "empty" | "players" | "crowd" {
  if (totalVotes <= 0) return "empty";
  if (totalVotes < 25) return "players";
  return "crowd";
}

export function crowdVoiceHeading(totalVotes: number): string {
  const voice = crowdVoiceLabel(totalVotes);
  if (voice === "empty") return "Not enough players this time.";
  if (voice === "players") return "PLAYERS SAID";
  return "THE CROWD";
}

export const SESSION_IDLE_MS = 30 * 60 * 1000;
