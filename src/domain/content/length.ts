export const QUESTION_SOFT_MAX = 100;
export const CHOICE_SOFT_MAX = 24;

export function isLongQuestion(question: string, limit = QUESTION_SOFT_MAX): boolean {
  return question.trim().length > limit;
}

export function isLongChoice(label: string, limit = CHOICE_SOFT_MAX): boolean {
  return label.trim().length > limit;
}

export const LONG_QUESTION_WARNING = "Long question — may wrap heavily on mobile.";
