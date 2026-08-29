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
    "Notice one friendship today where money sits quietly underneath what someone can or can't do.",
  "love-freedom":
    "Give someone you love a little room today — and one quiet sign you're still there.",
  "trust-privacy":
    "Notice one thing you wouldn't tell a stranger for any price — and one you might.",
  "gain-privacy":
    "Notice one thing you wouldn't tell a stranger for any price — and one you might.",
  "forgiveness-self-respect":
    "Think about one favor you'd extend — and where you'd draw the line if it touched your finances.",
  "passion-security":
    "Notice what you'd trade an ordinary Saturday for — if someone offered you enough.",
  "time-ambition":
    "Think about what you'd trade an ordinary Saturday for — if someone offered enough.",
  "belonging-independence":
    "Notice how differently a sacrifice sounds depending on who is being asked to make it.",
  "desire-commitment": "Keep one small promise today that nobody asked you to make.",
  "status-authenticity":
    "Listen for one pitch today where the price sounds better than the product.",
  "truth-peace": "Say one true thing gently today — only where it helps more than it hurts.",
  "loyalty-justice":
    "Notice one split today — money, effort, or credit — that wouldn't feel equal to everyone involved.",
};

export const TODAYS_MARSHMALLOW_FALLBACK =
  "Do one small considerate thing today that nobody needs to know about.";

export function todaysMarshmallowInvitation(tensionSlug: string | null | undefined): string {
  if (!tensionSlug) {
    return TODAYS_MARSHMALLOW_FALLBACK;
  }
  return BY_TENSION_SLUG[tensionSlug] ?? TODAYS_MARSHMALLOW_FALLBACK;
}
