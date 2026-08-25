import { NextResponse } from "next/server";

import { cronSecretMatches, runDueLifecycle } from "@/server/jobs/lifecycle";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!cronSecretMatches(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const run = await runDueLifecycle("cron");
    return NextResponse.json({
      ok: true,
      opened: run?.opened_count ?? 0,
      closed: run?.closed_count ?? 0,
      revealed: run?.revealed_count ?? 0,
      errors: run?.error_count ?? 0,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "lifecycle_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return GET(request);
}
