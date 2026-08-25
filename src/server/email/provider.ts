import "server-only";

import { getServerEnv } from "@/server/env";

export type OutboundEmail = {
  to: string;
  subject: string;
  text: string;
  html: string;
  idempotencyKey: string;
};

export type EmailSendResult = {
  id: string;
  provider: string;
};

export interface EmailProvider {
  readonly name: string;
  send(message: OutboundEmail): Promise<EmailSendResult>;
}

export class NoopEmailProvider implements EmailProvider {
  readonly name = "noop";

  async send(): Promise<EmailSendResult> {
    throw new Error("email_sending_disabled");
  }
}

export class ResendEmailProvider implements EmailProvider {
  readonly name = "resend";

  constructor(
    private readonly apiKey: string,
    private readonly from: string,
  ) {}

  async send(message: OutboundEmail): Promise<EmailSendResult> {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": message.idempotencyKey,
      },
      body: JSON.stringify({
        from: this.from,
        to: [message.to],
        subject: message.subject,
        text: message.text,
        html: message.html,
      }),
    });

    const body = (await response.json().catch(() => ({}))) as {
      id?: string;
      message?: string;
    };

    if (!response.ok) {
      throw new Error(body.message ?? `resend_${response.status}`);
    }

    return { id: body.id ?? message.idempotencyKey, provider: this.name };
  }
}

export function createEmailProvider(
  source: NodeJS.ProcessEnv = process.env,
): EmailProvider {
  const env = getServerEnv(source);
  if (
    env.EMAIL_SENDING_ENABLED === true &&
    env.EMAIL_PROVIDER === "resend" &&
    env.RESEND_API_KEY &&
    env.EMAIL_FROM
  ) {
    return new ResendEmailProvider(env.RESEND_API_KEY, env.EMAIL_FROM);
  }
  return new NoopEmailProvider();
}
