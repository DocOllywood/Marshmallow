import type { ExperimentArchetype } from "@/domain/daily/experiment";

/** Consumer-safe scheduled Daily teaser — no scenario or editorial leakage. */
export type ScheduledExperimentPreview = {
  roundId: string;
  opensAt: string;
  archetype: ExperimentArchetype;
};

const BETA_DISPLAY_TIMEZONE = "America/New_York";

export function scheduledExperimentHeadline(archetype: ExperimentArchetype): string {
  if (archetype === "price") {
    return "What's your price?";
  }
  return "The daily experiment";
}

export function formatScheduledExperimentOpen(opensAt: string): {
  weekdayLine: string;
  dateTimeLine: string;
} {
  const opens = new Date(opensAt);
  const weekday = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    timeZone: BETA_DISPLAY_TIMEZONE,
  }).format(opens);
  const datePart = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: BETA_DISPLAY_TIMEZONE,
  })
    .format(opens)
    .toUpperCase()
    .replace(/\./g, "");
  const timePart = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: BETA_DISPLAY_TIMEZONE,
  })
    .format(opens)
    .toUpperCase()
    .replace(/\./g, "");

  return {
    weekdayLine: `A new experiment opens ${weekday}.`,
    dateTimeLine: `${datePart} · ${timePart} ET`,
  };
}
