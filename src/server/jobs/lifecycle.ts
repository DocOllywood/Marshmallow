import "server-only";

import { timingSafeEqual } from "crypto";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getServerEnv } from "@/server/env";
import { processEmailOutbox } from "@/server/email/outbox";

export type LifecycleRunSummary = {
  opened_count: number;
  closed_count: number;
  revealed_count: number;
  error_count: number;
  details: unknown;
};

export function cronSecretMatches(header: string | null): boolean {
  const secret = getServerEnv().CRON_SECRET;
  if (!secret || !header) {
    return false;
  }
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(header);
  if (expected.length !== received.length) {
    return false;
  }
  return timingSafeEqual(expected, received);
}

export async function runDueLifecycle(source: "cron" | "admin") {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.rpc("run_due_lifecycle", {
    p_source: source,
  });
  if (error) {
    throw new Error(error.message);
  }
  try {
    await processEmailOutbox();
  } catch {
    // Lifecycle still succeeded; email outbox retries on the next run.
  }
  return data;
}
