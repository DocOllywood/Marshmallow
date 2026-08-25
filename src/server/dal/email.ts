/**
 * MVP: Confirm Email is disabled so signup yields an immediate session.
 * Do not treat auth.users.email_confirmed_at as proof the user clicked a
 * verification email — autoconfirm fills that timestamp on signup.
 *
 * In-app REVEAL_READY always works. Transactional email is off unless
 * EMAIL_SENDING_ENABLED=true and a provider is configured. See
 * src/server/email/config.ts for the production checklist.
 */
export const EMAIL_CONFIRMATION_DISABLED_FOR_MVP = true;
