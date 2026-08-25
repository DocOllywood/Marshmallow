import "server-only";

import { getPublicEnv } from "@/lib/env/public";

export function getSiteUrl(): string {
  const env = getPublicEnv();
  return env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}
