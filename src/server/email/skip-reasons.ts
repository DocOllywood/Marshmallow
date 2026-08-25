/**
 * Outbox skip reasons. Claim only picks pending/sending rows, so skipped
 * historical reveal-ready mail is never resent if email is later enabled.
 */
export const EMAIL_SKIP_REASON = {
  sendingDisabled: "sending_disabled",
  userOptedOut: "user_opted_out",
  recipientIneligible: "recipient_ineligible",
  providerUnconfigured: "provider_unconfigured",
  templateUnsupported: "template_unsupported",
  spoilerBlocked: "spoiler_blocked",
} as const;

export type EmailSkipReason = (typeof EMAIL_SKIP_REASON)[keyof typeof EMAIL_SKIP_REASON];

export function classifyEmailSkip(input: {
  sendingEnabled: boolean;
  optedIn: boolean;
  hasRecipient: boolean;
  providerName: string;
}): EmailSkipReason | null {
  if (!input.optedIn) {
    return EMAIL_SKIP_REASON.userOptedOut;
  }
  if (!input.sendingEnabled) {
    return EMAIL_SKIP_REASON.sendingDisabled;
  }
  if (input.providerName === "noop") {
    return EMAIL_SKIP_REASON.providerUnconfigured;
  }
  if (!input.hasRecipient) {
    return EMAIL_SKIP_REASON.recipientIneligible;
  }
  return null;
}
