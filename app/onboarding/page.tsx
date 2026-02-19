"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

import AuthShell from "@/components/ui/AuthShell";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Field from "@/components/ui/Field";
import { createClient } from "@/lib/supabase/client";
import { getCurrentProfile } from "@/lib/getCurrentProfile";
import type { UserRole } from "@/lib/types";

interface ProfileContext {
  id: string;
  full_name: string | null;
  role: UserRole | null;
  school_id: string | null;
}

const supabase = createClient();

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "object" && error !== null && "message" in error) {
    const candidate = (error as { message?: unknown }).message;
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate;
    }
  }

  return fallback;
}

export default function OnboardingPage() {
  const router = useRouter();
  const initializedRef = useRef(false);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [profile, setProfile] = useState<ProfileContext | null>(null);

  const [role, setRole] = useState<UserRole | null>(null);

  const [schoolName, setSchoolName] = useState("");
  const [wilaya, setWilaya] = useState("");
  const [address, setAddress] = useState("");

  const [joinCode, setJoinCode] = useState("");

  useEffect(() => {
    if (initializedRef.current) {
      return;
    }

    initializedRef.current = true;

    const loadProfile = async () => {
      setLoading(true);

      try {
        const { user, profile: resolvedProfile } = await getCurrentProfile();

        if (!user) {
          router.replace("/login");
          return;
        }

        const current: ProfileContext = {
          id: user.id,
          full_name: resolvedProfile?.full_name ?? null,
          role: resolvedProfile?.role ?? null,
          school_id: resolvedProfile?.school_id ?? null,
        };

        setProfile(current);

        if (current.role && current.school_id) {
          router.replace("/dashboard");
          return;
        }

        setRole(current.role ?? null);
      } catch (error) {
        const message = getErrorMessage(error, "تعذر تحميل بيانات الإعداد.");
        console.warn("[auth:onboarding-load]", message);
        toast.error(`تعذر تحميل بيانات الإعداد. (${message})`, { id: "onboarding-load-error" });
      } finally {
        setLoading(false);
      }
    };

    void loadProfile();
  }, [router]);

  const step = useMemo(() => {
    if (!role) return "role";
    return role === "school_admin" ? "create_school" : "join_school";
  }, [role]);

  const selectRole = async (selectedRole: UserRole) => {
    if (!profile) return;

    setSubmitting(true);

    try {
      const { error } = await supabase.from("profiles").upsert(
        [
          {
            id: profile.id,
            full_name: (profile.full_name ?? "").trim(),
            role: selectedRole,
          },
        ],
        { onConflict: "id" },
      );

      if (error) {
        throw error;
      }

      setRole(selectedRole);
      setProfile((prev) => (prev ? { ...prev, role: selectedRole } : prev));
      toast.success("تم حفظ نوع الحساب.");
    } catch (error) {
      const message = getErrorMessage(error, "تعذر حفظ نوع الحساب.");
      console.warn("[auth:onboarding-role]", message);
      toast.error(`تعذر حفظ نوع الحساب. (${message})`);
    } finally {
      setSubmitting(false);
    }
  };

  const createSchool = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!profile) return;

    if (!schoolName.trim() || !wilaya.trim()) {
      toast.error("اسم المدرسة والولاية مطلوبان.");
      return;
    }

    setSubmitting(true);

    try {
      const { error: ensureRoleError } = await supabase.from("profiles").upsert(
        [
          {
            id: profile.id,
            full_name: (profile.full_name ?? "").trim(),
            role: "school_admin",
          },
        ],
        { onConflict: "id" },
      );

      if (ensureRoleError) {
        throw ensureRoleError;
      }

      setRole("school_admin");
      setProfile((prev) => (prev ? { ...prev, role: "school_admin" } : prev));

      const schoolId = crypto.randomUUID();
      const code = Math.random().toString(36).slice(2, 8).toUpperCase();

      const { error: schoolError } = await supabase.from("schools").insert([
        {
          id: schoolId,
          name: schoolName.trim(),
          wilaya: wilaya.trim(),
          address: address.trim() || null,
          school_code: code,
        },
      ]);

      if (schoolError) {
        throw schoolError;
      }

      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          school_id: schoolId,
          role: "school_admin",
          full_name: (profile.full_name ?? "").trim(),
        })
        .eq("id", profile.id);

      if (profileError) {
        throw profileError;
      }

      toast.success("تم إنشاء المدرسة وربط الحساب بنجاح.");
      router.replace("/dashboard");
    } catch (error) {
      const message = getErrorMessage(error, "تعذر إنشاء المدرسة.");
      console.warn("[auth:onboarding-create-school]", message);
      toast.error(`تعذر إنشاء المدرسة. (${message})`);
    } finally {
      setSubmitting(false);
    }
  };

  const joinSchool = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!profile) return;

    if (!joinCode.trim()) {
      toast.error("أدخل رمز المدرسة أولًا.");
      return;
    }

    setSubmitting(true);

    try {
      const normalizedCode = joinCode.trim().toUpperCase();
      let schoolId: string | null = null;

      const { data: rpcSchoolId, error: rpcError } = await supabase.rpc("find_school_id_by_code", {
        p_school_code: normalizedCode,
      });

      if (rpcError) {
        const message = rpcError.message.toLowerCase();
        const functionMissing =
          message.includes("find_school_id_by_code") &&
          (message.includes("does not exist") || message.includes("could not find"));

        if (functionMissing) {
          const { data: school, error: schoolError } = await supabase
            .from("schools")
            .select("id")
            .eq("school_code", normalizedCode)
            .single<{ id: string }>();

          if (schoolError || !school) {
            throw new Error("رمز المدرسة غير صحيح.");
          }

          schoolId = school.id;
        } else {
          throw rpcError;
        }
      } else if (typeof rpcSchoolId === "string" && rpcSchoolId.trim()) {
        schoolId = rpcSchoolId;
      }

      if (!schoolId) {
        throw new Error("رمز المدرسة غير صحيح.");
      }

      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          school_id: schoolId,
          role: role ?? "teacher",
          full_name: (profile.full_name ?? "").trim(),
        })
        .eq("id", profile.id);

      if (profileError) {
        throw profileError;
      }

      toast.success("تم ربط الحساب بالمدرسة.");
      router.replace("/dashboard");
    } catch (error) {
      const message = getErrorMessage(error, "تعذر ربط الحساب بالمدرسة.");
      console.warn("[auth:onboarding-join-school]", message);
      toast.error(`تعذر ربط الحساب بالمدرسة. (${message})`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <section dir="rtl" className="flex min-h-screen items-center justify-center bg-app">
        <div className="h-11 w-11 animate-spin rounded-full border-4 border-primary-100 border-t-primary-600" />
      </section>
    );
  }

  return (
    <AuthShell title="إعداد الحساب" subtitle="أكمل هذه الخطوات للمتابعة إلى لوحة التحكم">
      {step === "role" ? (
        <div className="space-y-3" dir="rtl">
          <Card className="space-y-2 border border-primary-100 bg-white p-4">
            <h3 className="font-bold text-gray-900">مدير مدرسة</h3>
            <p className="text-sm text-gray-600">إنشاء مدرسة جديدة وإدارة جميع بياناتها.</p>
            <Button
              disabled={submitting}
              onClick={() => {
                void selectRole("school_admin");
              }}
            >
              اختيار مدير مدرسة
            </Button>
          </Card>

          <Card className="space-y-2 border border-primary-100 bg-white p-4">
            <h3 className="font-bold text-gray-900">معلم / ولي / طالب</h3>
            <p className="text-sm text-gray-600">الانضمام إلى مدرسة موجودة عبر رمز المدرسة.</p>
            <Button
              disabled={submitting}
              onClick={() => {
                void selectRole("teacher");
              }}
            >
              الانضمام إلى مدرسة
            </Button>
          </Card>
        </div>
      ) : null}

      {step === "create_school" ? (
        <form onSubmit={createSchool} className="space-y-4" dir="rtl">
          <Field id="school-name" label="اسم المدرسة" value={schoolName} onChange={setSchoolName} />
          <Field id="school-wilaya" label="الولاية" value={wilaya} onChange={setWilaya} />
          <Field id="school-address" label="العنوان (اختياري)" value={address} onChange={setAddress} />

          <Button type="submit" disabled={submitting}>
            {submitting ? "جارٍ إنشاء المدرسة..." : "إنشاء المدرسة"}
          </Button>
        </form>
      ) : null}

      {step === "join_school" ? (
        <form onSubmit={joinSchool} className="space-y-4" dir="rtl">
          <Field
            id="join-code"
            label="رمز المدرسة"
            value={joinCode}
            onChange={(value) => setJoinCode(value.toUpperCase())}
            helper="الرمز مكوّن من 6 أحرف تقريبًا"
          />

          <Button type="submit" disabled={submitting}>
            {submitting ? "جارٍ الربط..." : "ربط الحساب"}
          </Button>
        </form>
      ) : null}
    </AuthShell>
  );
}
