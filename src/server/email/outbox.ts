import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isEmailSendingEnabled } from "@/server/email/config";
import { createEmailProvider } from "@/server/email/provider";
import { classifyEmailSkip, EMAIL_SKIP_REASON } from "@/server/email/skip-reasons";
import { emailContainsSpoilers, revealReadyEmail } from "@/server/email/templates";

type OutboxRow = {
  id: string;
  user_id: string;
  marshmallow_id: string | null;
  template: string;
  attempts: number;
};

export async function processEmailOutbox(limit = 20): Promise<{
  processed: number;
  sent: number;
  skipped: number;
  failed: number;
}> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.rpc("claim_email_outbox", { p_limit: limit });
  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as OutboxRow[];
  let sent = 0;
  let skipped = 0;
  let failed = 0;
  const sending = isEmailSendingEnabled();
  const provider = createEmailProvider();

  for (const row of rows) {
    try {
      if (row.template !== "reveal_ready" || !row.marshmallow_id) {
        await markOutbox(admin, row.id, "skipped", provider.name, null, EMAIL_SKIP_REASON.templateUnsupported);
        skipped += 1;
        continue;
      }

      const { data: prefs } = await admin
        .from("notification_prefs")
        .select("email_reveal_ready")
        .eq("user_id", row.user_id)
        .maybeSingle();

      const { data: user } = await admin.auth.admin.getUserById(row.user_id);
      const to = user.user?.email;
      const skip = classifyEmailSkip({
        sendingEnabled: sending,
        optedIn: Boolean(prefs?.email_reveal_ready),
        hasRecipient: Boolean(to),
        providerName: provider.name,
      });
      if (skip) {
        await markOutbox(admin, row.id, "skipped", provider.name, null, skip);
        skipped += 1;
        continue;
      }

      const mail = revealReadyEmail(row.marshmallow_id);
      if (emailContainsSpoilers(mail.text) || emailContainsSpoilers(mail.html)) {
        await markOutbox(admin, row.id, "skipped", provider.name, null, EMAIL_SKIP_REASON.spoilerBlocked);
        skipped += 1;
        continue;
      }
      const result = await provider.send({
        to: to as string,
        subject: mail.subject,
        text: mail.text,
        html: mail.html,
        idempotencyKey: row.id,
      });
      await markOutbox(admin, row.id, "sent", result.provider, result.id, null);
      sent += 1;
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "send_failed";
      await markOutbox(admin, row.id, "failed", provider.name, null, `provider_failure:${message}`);
      failed += 1;
    }
  }

  return { processed: rows.length, sent, skipped, failed };
}

async function markOutbox(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  id: string,
  status: "sent" | "skipped" | "failed",
  provider: string,
  providerMessageId: string | null,
  lastError: string | null,
) {
  await admin
    .from("email_outbox")
    .update({
      status,
      provider,
      provider_message_id: providerMessageId,
      last_error: lastError,
      sent_at: status === "sent" ? new Date().toISOString() : null,
    })
    .eq("id", id);
}
