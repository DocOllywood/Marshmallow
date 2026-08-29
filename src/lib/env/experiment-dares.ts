/** Feature gate — off by default; set NEXT_PUBLIC_EXPERIMENT_DARES_ENABLED=true to enable. */
export function experimentDaresEnabled(): boolean {
  return process.env.NEXT_PUBLIC_EXPERIMENT_DARES_ENABLED === "true";
}
