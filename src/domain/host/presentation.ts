export type ExperimentPresentationMode = "standard" | "host";

/**
 * Safely reads round-level experiment presentation from metadata JSON.
 * Missing, unknown, or malformed values resolve to "standard".
 */
export function parseExperimentPresentationMode(metadata: unknown): ExperimentPresentationMode {
  if (!metadata || typeof metadata !== "object") {
    return "standard";
  }
  const presentation = (metadata as { experiment?: { presentation?: unknown } }).experiment
    ?.presentation;
  return presentation === "host" ? "host" : "standard";
}

/** Central resolver for production play and domain layers. */
export function resolveExperimentPresentationMode(
  metadata: unknown,
): ExperimentPresentationMode {
  return parseExperimentPresentationMode(metadata);
}
