export const EDITORIAL_CHECKS = [
  "instant",
  "opinion",
  "curiosity",
  "clean",
  "visual",
  "timely",
] as const;

export type EditorialCheck = (typeof EDITORIAL_CHECKS)[number];

export type EditorialChecklist = Record<EditorialCheck, boolean>;

export function emptyChecklist(): EditorialChecklist {
  return {
    instant: false,
    opinion: false,
    curiosity: false,
    clean: false,
    visual: false,
    timely: false,
  };
}

export function parseChecklist(value: unknown): EditorialChecklist {
  const row = (value ?? {}) as Record<string, unknown>;
  const next = emptyChecklist();
  for (const key of EDITORIAL_CHECKS) {
    next[key] = Boolean(row[key]);
  }
  return next;
}

export function editorialCheckLabel(key: EditorialCheck): string {
  switch (key) {
    case "instant":
      return "INSTANT";
    case "opinion":
      return "OPINION";
    case "curiosity":
      return "CURIOSITY";
    case "clean":
      return "CLEAN";
    case "visual":
      return "VISUAL";
    case "timely":
      return "TIMELY";
  }
}

export function editorialCheckPrompt(key: EditorialCheck): string {
  switch (key) {
    case "instant":
      return "Can someone understand this in under 5 seconds?";
    case "opinion":
      return "Can a normal person answer without research?";
    case "curiosity":
      return "Will they actually care what other players picked?";
    case "clean":
      return "Does it avoid asserting an unverified damaging claim as fact?";
    case "visual":
      return "Would a simple image or topic label improve recognition?";
    case "timely":
      return "Is there a reason to care today or this week?";
  }
}
