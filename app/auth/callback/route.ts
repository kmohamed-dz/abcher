import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

interface ProfileRouteResult {
  school_id: string | null;
  role: string | null;
}

function isMissingProfilesTableError(message: string) {
  const value = message.toLowerCase();

  return (
    (value.includes("could not find the table") && value.includes("profiles")) ||
    (value.includes("schema cache") && value.includes("profiles")) ||
    (value.includes("relation") && value.includes("profiles") && value.includes("does not exist"))
  );
}

function buildLoginRedirect(requestUrl: URL, message: string) {
  const loginUrl = new URL("/login", requestUrl.origin);
  loginUrl.searchParams.set("error", message);
  return NextResponse.redirect(loginUrl);
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next");
  const authError = requestUrl.searchParams.get("error_description");

  if (authError) {
    return buildLoginRedirect(requestUrl, authError);
  }

  if (!code) {
    return buildLoginRedirect(requestUrl, "رابط المصادقة غير صالح أو منتهي.");
  }

  const supabase = await createClient();
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    return buildLoginRedirect(requestUrl, exchangeError.message);
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return buildLoginRedirect(requestUrl, userError?.message ?? "تعذر إنشاء الجلسة.");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("school_id, role")
    .eq("id", user.id)
    .maybeSingle<ProfileRouteResult>();

  if (profileError) {
    if (isMissingProfilesTableError(profileError.message)) {
      return NextResponse.redirect(new URL("/dashboard", requestUrl.origin));
    }

    return buildLoginRedirect(requestUrl, profileError.message);
  }

  const safeNext = next && next.startsWith("/") ? next : null;
  const destination = safeNext ?? (!profile?.school_id || !profile?.role ? "/onboarding" : "/dashboard");

  return NextResponse.redirect(new URL(destination, requestUrl.origin));
}
