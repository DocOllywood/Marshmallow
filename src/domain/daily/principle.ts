export type BeliefPrinciple = {
  id: string;
  slug: string;
  displayName: string;
  description: string | null;
};

export type ExperimentContextSubject =
  | "friend"
  | "family"
  | "partner"
  | "coworker"
  | "stranger"
  | "self"
  | "authority";

export type ExperimentContext = {
  subject: ExperimentContextSubject;
  label: string;
};

export function mapBeliefPrinciple(row: {
  id: string;
  slug: string;
  display_name: string;
  description: string | null;
}): BeliefPrinciple {
  return {
    id: row.id,
    slug: row.slug,
    displayName: row.display_name,
    description: row.description,
  };
}

const CONTEXT_SUBJECTS = new Set<ExperimentContextSubject>([
  "friend",
  "family",
  "partner",
  "coworker",
  "stranger",
  "self",
  "authority",
]);

export function parseExperimentContext(metadata: unknown): ExperimentContext | null {
  if (!metadata || typeof metadata !== "object") {
    return null;
  }
  const context = (metadata as { context?: unknown }).context;
  if (!context || typeof context !== "object") {
    return null;
  }
  const subject = (context as { subject?: unknown }).subject;
  const label = (context as { label?: unknown }).label;
  if (typeof subject !== "string" || !CONTEXT_SUBJECTS.has(subject as ExperimentContextSubject)) {
    return null;
  }
  if (typeof label !== "string" || !label.trim()) {
    return null;
  }
  return {
    subject: subject as ExperimentContextSubject,
    label: label.trim(),
  };
}
