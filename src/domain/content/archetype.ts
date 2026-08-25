export const QUESTION_ARCHETYPES = [
  "who_won",
  "who_lost",
  "pick_one",
  "will_it_happen",
  "who_will",
  "agree_disagree",
  "lasting_power",
  "side_with",
  "better_moment",
  "freeform",
] as const;

export type QuestionArchetype = (typeof QUESTION_ARCHETYPES)[number];

export const CONTENT_FRESHNESS = ["evergreen", "timely", "event_specific"] as const;
export type ContentFreshness = (typeof CONTENT_FRESHNESS)[number];

export function isQuestionArchetype(value: string | null | undefined): value is QuestionArchetype {
  return QUESTION_ARCHETYPES.includes(value as QuestionArchetype);
}

export function isContentFreshness(value: string | null | undefined): value is ContentFreshness {
  return CONTENT_FRESHNESS.includes(value as ContentFreshness);
}

export function archetypeLabel(archetype: QuestionArchetype): string {
  switch (archetype) {
    case "who_won":
      return "WHO WON?";
    case "who_lost":
      return "WHO LOST?";
    case "pick_one":
      return "PICK ONE";
    case "will_it_happen":
      return "WILL IT HAPPEN?";
    case "who_will":
      return "WHO WILL?";
    case "agree_disagree":
      return "AGREE / DISAGREE";
    case "lasting_power":
      return "LASTING POWER";
    case "side_with":
      return "SIDE WITH";
    case "better_moment":
      return "BETTER MOMENT";
    default:
      return "FREEFORM";
  }
}

export function archetypePrompt(archetype: QuestionArchetype): string {
  switch (archetype) {
    case "who_won":
      return "Who would most people side with?";
    case "who_lost":
      return "Who handled it worse?";
    case "pick_one":
      return "Which choice says more about being human?";
    case "will_it_happen":
      return "Would most people say yes?";
    case "who_will":
      return "What will most people choose?";
    case "agree_disagree":
      return "Would most people agree?";
    case "lasting_power":
      return "Will this still matter tomorrow?";
    case "side_with":
      return "Whose instinct would most people trust?";
    case "better_moment":
      return "Which moment feels more true?";
    default:
      return "Write a question people will instantly have an opinion about.";
  }
}

export function freshnessLabel(value: ContentFreshness): string {
  if (value === "evergreen") return "Evergreen";
  if (value === "event_specific") return "Event-specific";
  return "Timely";
}
