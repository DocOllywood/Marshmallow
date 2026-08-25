import "server-only";

import { cookies } from "next/headers";
import { randomBytes } from "crypto";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { REVEAL_READY_BODY, REVEAL_READY_TITLE } from "@/domain/notifications/copy";
import { shareCardCopy, shortenQuestion } from "@/domain/share/card";
import { pickNextMarshmallowId, nextMarshmallowHref } from "@/domain/play/next";
import { listActiveTopics, listOwnTopicPrefIds } from "@/server/dal/topics";
import { getAuthUser } from "@/server/dal/auth";
import { safeInternalPath } from "@/lib/http/safe-path";
import { isEmailSendingEnabled } from "@/server/email/config";

export const SHARE_VISITOR_COOKIE = "mw_vid";
export const SHARE_ATTR_COOKIE = "mw_share";
export const RETURN_PATH_COOKIE = "mw_next";

export type InboxNotification = {
  id: string;
  type: string;
  marshmallowId: string | null;
  href: string;
  title: string;
  body: string;
  createdAt: string;
  readAt: string | null;
  question: string | null;
};

export type NotificationPrefs = {
  emailRevealReady: boolean;
  emailDaily: boolean;
  emailStreak: boolean;
  emailSendingEnabled: boolean;
};

export type PublicSharePayload = {
  publicId: string;
  question: string;
  shortQuestion: string;
  accuracy: number;
  predictedPct: number | null;
  crowdPct: number | null;
  choiceCount: number;
  choices: { label: string; votePct: number; youPct: number | null }[];
  copy: ReturnType<typeof shareCardCopy>;
};

const cookieBase = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  secure: process.env.NODE_ENV === "production",
};

export async function listInboxNotifications(): Promise<InboxNotification[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("id, type, marshmallow_id, payload, created_at, read_at")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    throw new Error(error.message);
  }

  const marshmallowIds = [
    ...new Set((data ?? []).map((row) => row.marshmallow_id).filter((id): id is string => Boolean(id))),
  ];
  const questions = new Map<string, string>();
  if (marshmallowIds.length > 0) {
    const { data: items } = await supabase
      .from("marshmallows")
      .select("id, question")
      .in("id", marshmallowIds);
    for (const item of items ?? []) {
      questions.set(item.id, item.question);
    }
  }

  return (data ?? []).map((row) => {
    const payload = (row.payload ?? {}) as { href?: string };
    const href =
      payload.href ??
      (row.marshmallow_id ? `/m/${row.marshmallow_id}?from=notify` : "/home");
    return {
      id: row.id,
      type: row.type,
      marshmallowId: row.marshmallow_id,
      href,
      title: row.type === "reveal_ready" ? REVEAL_READY_TITLE : "Marshmallow",
      body: row.type === "reveal_ready" ? REVEAL_READY_BODY : "",
      createdAt: row.created_at,
      readAt: row.read_at,
      question: row.marshmallow_id ? questions.get(row.marshmallow_id) ?? null : null,
    };
  });
}

export async function getNotificationPrefs(): Promise<NotificationPrefs> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("notification_prefs")
    .select("email_reveal_ready, email_daily, email_streak")
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  return {
    emailRevealReady: data?.email_reveal_ready ?? false,
    emailDaily: data?.email_daily ?? false,
    emailStreak: data?.email_streak ?? false,
    emailSendingEnabled: isEmailSendingEnabled(),
  };
}

export async function getPublicShare(publicId: string): Promise<PublicSharePayload | null> {
  if (!/^[a-f0-9]{32}$/.test(publicId)) {
    return null;
  }
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("get_public_share", {
    p_public_id: publicId,
  });
  if (error || !data) {
    return null;
  }
  const row = data as {
    public_id?: string;
    question?: string;
    accuracy?: number;
    own_choice?: { choice_label?: string | null; predicted_pct?: number | null } | null;
    choices?: { label: string; vote_pct: number; you_pct: number | null }[];
  };
  if (!row.public_id || !row.question || row.accuracy == null) {
    return null;
  }
  const choices = row.choices ?? [];
  const ownLabel = row.own_choice?.choice_label ?? null;
  const predictedPct = row.own_choice?.predicted_pct ?? null;
  const crowdPct =
    choices.find((choice) => choice.label === ownLabel)?.vote_pct ?? null;
  return {
    publicId: row.public_id,
    question: row.question,
    shortQuestion: shortenQuestion(row.question),
    accuracy: row.accuracy,
    predictedPct,
    crowdPct,
    choiceCount: choices.length,
    choices: choices.map((choice) => ({
      label: choice.label,
      votePct: Number(choice.vote_pct),
      youPct: choice.you_pct == null ? null : Number(choice.you_pct),
    })),
    copy: shareCardCopy({
      choiceCount: choices.length,
      predictedPct,
      crowdPct,
      accuracy: row.accuracy,
    }),
  };
}

export async function recordShareVisit(publicId: string): Promise<string> {
  const token = await visitorToken();
  const supabase = await createSupabaseServerClient();
  await supabase.rpc("record_share_visit", {
    p_public_id: publicId,
    p_visitor_token: token,
  });
  const jar = await cookies();
  jar.set(SHARE_ATTR_COOKIE, publicId, { ...cookieBase, maxAge: 60 * 60 * 24 * 30 });
  return token;
}

export async function markSharePlay(publicId: string) {
  const token = await visitorToken();
  const supabase = await createSupabaseServerClient();
  await supabase.rpc("mark_share_play", {
    p_public_id: publicId,
    p_visitor_token: token,
  });
}

export async function attributeShareSignup() {
  const jar = await cookies();
  const publicId = jar.get(SHARE_ATTR_COOKIE)?.value;
  const token = jar.get(SHARE_VISITOR_COOKIE)?.value;
  if (!publicId || !token) {
    return false;
  }
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("attribute_share_signup", {
    p_public_id: publicId,
    p_visitor_token: token,
  });
  return !error;
}

export async function sharePlayHref(excludeId?: string): Promise<string> {
  const supabase = await createSupabaseServerClient();
  const [{ data: openRows }, { data: sealedRows }, topics, interestIds] = await Promise.all([
    supabase.from("marshmallows").select("id, status, is_daily, play_mode, topic_id, quick_priority, opens_at, closes_at, cancelled_at").eq("status", "open"),
    supabase.from("entries").select("marshmallow_id, sealed_at"),
    listActiveTopics().catch(() => []),
    listOwnTopicPrefIds().catch(() => []),
  ]);
  const sealedIds = new Set(
    (sealedRows ?? [])
      .filter((row) => row.sealed_at != null)
      .map((row) => row.marshmallow_id),
  );
  const nextId = pickNextMarshmallowId(
    excludeId ?? "",
    openRows ?? [],
    sealedIds,
    topics,
    interestIds,
    "first_session",
    Date.now(),
  );
  return nextMarshmallowHref(nextId);
}

export async function sharePlayDestination(publicId: string, currentMarshmallowId?: string) {
  const playHref = await sharePlayHref(currentMarshmallowId);
  const user = await getAuthUser();
  const jar = await cookies();
  jar.set(RETURN_PATH_COOKIE, playHref, { ...cookieBase, maxAge: 60 * 60 * 24 * 7 });
  jar.set(SHARE_ATTR_COOKIE, publicId, { ...cookieBase, maxAge: 60 * 60 * 24 * 30 });
  if (user) {
    return playHref;
  }
  return `/signup?next=${encodeURIComponent(playHref)}&share=${publicId}`;
}

export async function consumeReturnPath(): Promise<string> {
  const jar = await cookies();
  const next = safeInternalPath(jar.get(RETURN_PATH_COOKIE)?.value, "/home");
  jar.delete(RETURN_PATH_COOKIE);
  return next;
}

export async function visitorToken(): Promise<string> {
  const jar = await cookies();
  const existing = jar.get(SHARE_VISITOR_COOKIE)?.value;
  if (existing && /^[a-f0-9]{32}$/.test(existing)) {
    return existing;
  }
  const token = randomBytes(16).toString("hex");
  jar.set(SHARE_VISITOR_COOKIE, token, { ...cookieBase, maxAge: 60 * 60 * 24 * 365 });
  return token;
}
