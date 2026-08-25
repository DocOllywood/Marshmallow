import { REVEAL_READY_BODY, REVEAL_READY_TITLE } from "@/domain/notifications/copy";
import { getSiteUrl } from "@/server/urls";

export type RevealReadyEmail = {
  subject: string;
  text: string;
  html: string;
  revealUrl: string;
};

export function revealReadyEmail(marshmallowId: string): RevealReadyEmail {
  const revealUrl = `${getSiteUrl()}/m/${marshmallowId}?from=notify`;
  const subject = "Your Marshmallow is ready ☁️";
  const text = [
    REVEAL_READY_TITLE,
    "",
    "You made your call.",
    "The crowd is in.",
    REVEAL_READY_BODY,
    "",
    `REVEAL: ${revealUrl}`,
  ].join("\n");
  const html = `
    <p>${REVEAL_READY_TITLE}</p>
    <p>You made your call.<br/>The crowd is in.<br/>${REVEAL_READY_BODY}</p>
    <p><a href="${revealUrl}">REVEAL</a></p>
  `.trim();
  return { subject, text, html, revealUrl };
}

export function emailContainsSpoilers(content: string): boolean {
  return (
    /accuracy/i.test(content) ||
    /%\b/.test(content) ||
    /right|wrong|bonus/i.test(content) ||
    /crowd said/i.test(content)
  );
}
