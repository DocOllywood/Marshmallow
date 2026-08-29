/** True outside production builds — used to gate dev-only routes and harnesses. */
export function isDevEnvironment(): boolean {
  return process.env.NODE_ENV !== "production";
}
