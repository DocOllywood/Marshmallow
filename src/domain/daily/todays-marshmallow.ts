/** Deterministic Beta 1 editorial invitations — not tracked, not verified. */
const BY_TENSION_SLUG: Record<string, string> = {
  "courtesy-convenience":
    "Do one small considerate thing for someone you don't know today.",
  "honesty-kindness": "Say one kind thing today that you genuinely mean.",
  "attention-indifference":
    "Notice someone whose work usually goes unnoticed — and thank them.",
  "self-stranger": "Make one stranger's day 1% easier.",
  "privacy-connection":
    "Start one small conversation you normally wouldn't — only if it feels welcome.",
  "generosity-fairness": "Give someone a little more than you technically owe them.",
  "loyalty-self-preservation":
    "Show up for someone who counts on you — in one small way that fits your limits.",
  "love-freedom":
    "Give someone you love a little room today — and one quiet sign you're still there.",
  "trust-privacy":
    "Share one small true thing with someone you trust — only if they want to hear it.",
  "forgiveness-self-respect":
    "Let one small grudge go today — or hold one boundary with kindness instead of silence.",
  "passion-security": "Give one ordinary moment your full attention today.",
  "belonging-independence":
    "Notice how differently a sacrifice sounds depending on who is being asked to make it.",
  "desire-commitment": "Keep one small promise today that nobody asked you to make.",
  "status-authenticity":
    "Skip one performance today. Be ordinary with someone who matters.",
  "truth-peace": "Say one true thing gently today — only where it helps more than it hurts.",
  "loyalty-justice":
    "Notice one rule today that's easier to demand from someone else than from yourself. Don't fix it. Just catch it.",
};

export const TODAYS_MARSHMALLOW_FALLBACK =
  "Do one small considerate thing today that nobody needs to know about.";

export function todaysMarshmallowInvitation(tensionSlug: string | null | undefined): string {
  if (!tensionSlug) {
    return TODAYS_MARSHMALLOW_FALLBACK;
  }
  return BY_TENSION_SLUG[tensionSlug] ?? TODAYS_MARSHMALLOW_FALLBACK;
}
