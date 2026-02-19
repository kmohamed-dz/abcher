import type { User } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/client";
import type { UserRole } from "@/lib/types";

export interface CurrentProfile {
  id: string;
  full_name: string | null;
  role: UserRole | null;
  school_id: string | null;
  phone: string | null;
  avatar_url: string | null;
}

export interface CurrentProfileResult {
  user: User | null;
  profile: CurrentProfile | null;
}

const supabase = createClient();

function isRlsDeniedError(message: string) {
  const value = message.toLowerCase();

  return (
    value.includes("row-level security") ||
    value.includes("permission denied") ||
    value.includes("not allowed")
  );
}

function getFallbackName(user: User) {
  const metadataName = user.user_metadata?.full_name;
  if (typeof metadataName === "string" && metadataName.trim()) {
    return metadataName.trim();
  }

  if (user.email) {
    return user.email.split("@")[0] || "";
  }

  return "";
}

async function fetchProfile(userId: string) {
  return supabase
    .from("profiles")
    .select("id,full_name,role,school_id,phone,avatar_url")
    .eq("id", userId)
    .maybeSingle<CurrentProfile>();
}

export async function getCurrentProfile(): Promise<CurrentProfileResult> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }

  if (!user) {
    return { user: null, profile: null };
  }

  const firstFetch = await fetchProfile(user.id);
  if (firstFetch.error) {
    if (isRlsDeniedError(firstFetch.error.message)) {
      return { user, profile: null };
    }

    throw firstFetch.error;
  }

  if (firstFetch.data) {
    return { user, profile: firstFetch.data };
  }

  const { error: upsertError } = await supabase.from("profiles").upsert(
    [
      {
        id: user.id,
        full_name: getFallbackName(user),
      },
    ],
    { onConflict: "id" },
  );

  if (upsertError) {
    if (isRlsDeniedError(upsertError.message)) {
      return { user, profile: null };
    }

    throw upsertError;
  }

  const secondFetch = await fetchProfile(user.id);
  if (secondFetch.error) {
    if (isRlsDeniedError(secondFetch.error.message)) {
      return { user, profile: null };
    }

    throw secondFetch.error;
  }

  return { user, profile: secondFetch.data ?? null };
}
