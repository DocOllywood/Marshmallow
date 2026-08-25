import type { PlayMode } from "@/domain/play/mode";

export function formatDuration(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  const pad = (value: number) => value.toString().padStart(2, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

/** Final-window countdown only — never hours. */
export const SHORT_COUNTDOWN_THRESHOLD_MS = 3 * 60 * 1000;

export function shouldShowShortCountdown(remainingMs: number): boolean {
  return remainingMs > 0 && remainingMs <= SHORT_COUNTDOWN_THRESHOLD_MS;
}

export function formatShortCountdown(totalMs: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalMs / 1000));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  const pad = (value: number) => value.toString().padStart(2, "0");
  return `${pad(minutes)}:${pad(seconds)}`;
}

export function formatApproxWaitMinutes(totalMs: number): string {
  const minutes = Math.max(1, Math.round(totalMs / 60_000));
  if (minutes >= 60) {
    const hours = Math.max(1, Math.round(minutes / 60));
    return `about ${hours} hr`;
  }
  return `about ${minutes} min`;
}

export function formatLocalizedRevealTime(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function formatLocalizedCloseTime(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export type WaitPresentation = {
  status: string;
  detail: string;
  countdown: string | null;
};

export function formatWaitPresentation(input: {
  playMode: PlayMode;
  remainingMs: number;
  revealsAt: string;
  closesAt?: string;
  waitingForSample?: boolean;
}): WaitPresentation {
  const { playMode, remainingMs, revealsAt, closesAt, waitingForSample } = input;

  if (waitingForSample || remainingMs <= 0) {
    if (playMode === "quick") {
      return {
        status: "Cooking…",
        detail: waitingForSample ? "Waiting for a few more players" : "Almost ready",
        countdown: null,
      };
    }
    return {
      status: "Cooking…",
      detail: "Finishing the count",
      countdown: null,
    };
  }

  if (playMode === "quick") {
    if (shouldShowShortCountdown(remainingMs)) {
      return {
        status: "Cooking…",
        detail: "Results soon",
        countdown: formatShortCountdown(remainingMs),
      };
    }
    return {
      status: "Cooking…",
      detail: `Results in ${formatApproxWaitMinutes(remainingMs)}`,
      countdown: null,
    };
  }

  if (playMode === "daily") {
    const revealTime = formatLocalizedRevealTime(revealsAt);
    const revealDay = new Date(revealsAt).toDateString();
    const today = new Date().toDateString();
    const status = revealDay === today ? "Come back tonight" : "Come back for the reveal";
    return {
      status,
      detail: `Reveal at ${revealTime}`,
      countdown: null,
    };
  }

  const closeTime = formatLocalizedCloseTime(closesAt ?? revealsAt);
  return {
    status: "Results after it closes",
    detail: closeTime,
    countdown: null,
  };
}

export function formatCookingRemaining(totalMs: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalMs / 1000));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;
  const pad = (value: number) => value.toString().padStart(2, "0");
  if (hours >= 1) {
    return `${hours}h ${minutes}m`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}

/** Compact home/cooking metadata — no HH:MM:SS for hour-scale waits. */
export function formatFriendlyRemaining(
  totalMs: number,
  playMode?: string,
  revealsAt?: string,
  closesAt?: string,
  waitingForSample?: boolean,
): string {
  const mode = playMode === "daily" || playMode === "live" || playMode === "quick" ? playMode : "quick";
  const presentation = formatWaitPresentation({
    playMode: mode,
    remainingMs: totalMs,
    revealsAt: revealsAt ?? new Date(Date.now() + totalMs).toISOString(),
    closesAt,
    waitingForSample,
  });
  if (presentation.countdown) {
    return presentation.countdown;
  }
  if (presentation.status === presentation.detail) {
    return presentation.status;
  }
  return `${presentation.status} · ${presentation.detail}`;
}
