import "server-only";

import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getAuthUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function requireUser() {
  const user = await getAuthUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

export async function getOwnProfile() {
  const user = await getAuthUser();
  if (!user) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("profiles")
    .select(
      "id, username, display_name, avatar_url, role, onboarding_completed_at",
    )
    .eq("id", user.id)
    .maybeSingle();

  return data;
}

export function needsOnboarding(profile: {
  onboarding_completed_at: string | null;
}): boolean {
  return profile.onboarding_completed_at == null;
}

export async function requireOnboarded() {
  const user = await requireUser();
  const profile = await getOwnProfile();

  if (!profile) {
    redirect("/onboarding?missing=profile");
  }

  if (needsOnboarding(profile)) {
    redirect("/onboarding");
  }

  return { user, profile };
}

export async function requireOnboardingSession() {
  const user = await requireUser();
  const profile = await getOwnProfile();

  if (profile && !needsOnboarding(profile)) {
    redirect("/home");
  }

  return { user, profile };
}

export async function requireAdmin() {
  const { user, profile } = await requireOnboarded();
  if (profile.role !== "admin") {
    redirect("/home");
  }
  return user;
}
