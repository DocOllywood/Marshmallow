import type {
  DareComparisonPayload,
  DarePublicView,
  DareStageChoice,
} from "@/domain/dare/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function parseStageChoices(raw: unknown): DareStageChoice[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((row): row is DareStageChoice => row != null && typeof row === "object")
    .map((row) => ({
      position: Number(row.position),
      stage: String(row.stage),
      choice_label: String(row.choice_label),
      is_line: Boolean(row.is_line),
      tension_side: row.tension_side != null ? String(row.tension_side) : null,
      predicted_pct: row.predicted_pct != null ? Number(row.predicted_pct) : null,
    }));
}

function mapPublicDare(raw: Record<string, unknown>): DarePublicView {
  return {
    token: String(raw.token),
    dareId: String(raw.dare_id),
    roundId: String(raw.round_id),
    senderDisplayName: String(raw.sender_display_name ?? "Someone"),
    invitationLabel: String(
      raw.invitation_label ?? raw.round_title ?? "A Marshmallow experiment",
    ),
    status: raw.status as DarePublicView["status"],
    isSender: Boolean(raw.is_sender),
    isRecipient: Boolean(raw.is_recipient),
    playMarshmallowId:
      raw.play_marshmallow_id != null ? String(raw.play_marshmallow_id) : null,
    matchReady: Boolean(raw.match_ready),
  };
}

export async function getPublicDare(token: string): Promise<DarePublicView | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("get_public_dare", { p_token: token });
  if (error || !data || typeof data !== "object") {
    return null;
  }
  return mapPublicDare(data as Record<string, unknown>);
}

export async function createExperimentDare(roundId: string): Promise<
  | { ok: true; token: string; dareId: string }
  | { ok: false; error: string }
> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("create_experiment_dare", {
    p_round_id: roundId,
  });
  if (error || !data) {
    if (error?.message.includes("daily_not_complete")) {
      return { ok: false, error: "Finish all five calls before daring someone." };
    }
    if (error?.message.includes("round_closed")) {
      return { ok: false, error: "This experiment is closed for new dares." };
    }
    if (error?.message.includes("not_experiment_daily")) {
      return { ok: false, error: "Dares are only for experiment dailies." };
    }
    return { ok: false, error: "Could not create dare." };
  }
  const row = data as { token: string; id: string };
  return { ok: true, token: row.token, dareId: row.id };
}

export async function acceptExperimentDare(token: string): Promise<
  | { ok: true; playMarshmallowId: string | null }
  | { ok: false; error: string }
> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("accept_experiment_dare", { p_token: token });
  if (error || !data) {
    if (error?.message.includes("cannot_dare_self")) {
      return { ok: false, error: "You can't take your own dare." };
    }
    if (error?.message.includes("dare_already_claimed")) {
      return { ok: false, error: "This dare has already been taken." };
    }
    if (error?.message.includes("round_closed")) {
      return { ok: false, error: "This dare closed." };
    }
    return { ok: false, error: "Could not accept dare." };
  }
  const payload = data as { play_marshmallow_id?: string | null };
  return {
    ok: true,
    playMarshmallowId: payload.play_marshmallow_id ?? null,
  };
}

export async function completeExperimentDareForLine(lineMarshmallowId: string): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("complete_experiment_dare_for_line", {
    p_line_marshmallow_id: lineMarshmallowId,
  });
  return !error && Boolean(data);
}

export async function getDareComparison(token: string): Promise<DareComparisonPayload | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("get_dare_comparison", { p_token: token });
  if (error || !data || typeof data !== "object") {
    return null;
  }
  const raw = data as Record<string, unknown>;
  return {
    token: String(raw.token),
    dareId: String(raw.dare_id),
    roundId: String(raw.round_id),
    viewerIsSender: Boolean(raw.viewer_is_sender),
    viewerLabel: String(raw.viewer_label),
    otherLabel: String(raw.other_label),
    senderChoices: parseStageChoices(raw.sender_choices),
    recipientChoices: parseStageChoices(raw.recipient_choices),
    roundRevealed: Boolean(raw.round_revealed),
  };
}

export async function getSenderDareForRound(roundId: string): Promise<{
  token: string;
  completedAt: string | null;
  acceptedAt: string | null;
} | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("get_sender_dare_for_round", {
    p_round_id: roundId,
  });
  if (error || !data) return null;
  const row = data as {
    token: string;
    completed_at: string | null;
    accepted_at: string | null;
  };
  return {
    token: row.token,
    completedAt: row.completed_at,
    acceptedAt: row.accepted_at,
  };
}
