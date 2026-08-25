import "server-only";

import { parseServerEnv, type ServerEnv } from "@/lib/env/schema";

export type { ServerEnv };

export function getServerEnv(
  source: NodeJS.ProcessEnv = process.env,
): ServerEnv {
  return parseServerEnv(source);
}
