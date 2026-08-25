import "server-only";

import { getServerEnv } from "@/server/env";

/**
 * Email eligibility (authoritative product rules):
 *
 * 1. In-app REVEAL_READY always works. Email is optional and off by default.
 * 2. Auth "Confirm email" is currently OFF. Do not treat email_confirmed_at as a
 *    clicked verification. Autoconfirm fills it on signup.
 * 3. Transactional reveal-ready mail is sent only when ALL of:
 *    - EMAIL_SENDING_ENABLED=true
 *    - EMAIL_PROVIDER=resend (or another implemented adapter)
 *    - RESEND_API_KEY and EMAIL_FROM are set
 *    - the user enabled "Reveal ready" email in Settings
 *    Keep EMAIL_SENDING_ENABLED=false until that policy is finalized.
 *    Skipped outbox rows (sending_disabled, user_opted_out,
 *    recipient_ineligible, provider_unconfigured) are never reclaimed, so
 *    enabling send later does not dump historical Reveal-ready mail.
 * 4. Daily / streak email templates are not generated in this phase even if
 *    the preference is stored.
 * 5. This is not marketing mail. Optional prefs stay easy to disable.
 *
 * Before production sending, turn Confirm email ON (or add an explicit
 * product opt-in that is not autoconfirm), keep EMAIL_SENDING_ENABLED off
 * until that policy is live, and never commit provider credentials.
 */
export function isEmailSendingEnabled(
  source: NodeJS.ProcessEnv = process.env,
): boolean {
  const env = getServerEnv(source);
  return env.EMAIL_SENDING_ENABLED === true && env.EMAIL_PROVIDER === "resend";
}

export function emailFromAddress(
  source: NodeJS.ProcessEnv = process.env,
): string | undefined {
  return getServerEnv(source).EMAIL_FROM;
}
