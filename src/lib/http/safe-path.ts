export function safeInternalPath(value: string | null | undefined, fallback = "/home"): string {
  if (!value) {
    return fallback;
  }
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return fallback;
  }
  if (value.includes("://")) {
    return fallback;
  }
  return value;
}
