export const REVEAL_READY_TITLE = "☁️ Your Marshmallow is ready";
export const REVEAL_READY_BODY = "See how close you were.";

export function revealReadyHref(marshmallowId: string): string {
  return `/m/${marshmallowId}?from=notify`;
}
