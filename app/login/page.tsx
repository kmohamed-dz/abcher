"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

import AuthShell from "@/components/ui/AuthShell";
import Button from "@/components/ui/Button";
import Field from "@/components/ui/Field";
import { createClient } from "@/lib/supabase/client";

interface LoginErrors {
  email?: string;
  password?: string;
}

function mapAuthError(message: string) {
  const value = message.toLowerCase();

  if (value.includes("invalid login credentials")) {
    return "البريد الإلكتروني أو كلمة المرور غير صحيحة.";
  }

  if (value.includes("email not confirmed")) {
    return "يرجى تأكيد بريدك الإلكتروني قبل تسجيل الدخول.";
  }

  if (value.includes("too many requests")) {
    return "محاولات كثيرة، حاول مرة أخرى بعد قليل.";
  }

  return "تعذر تسجيل الدخول. تحقق من بياناتك ثم أعد المحاولة.";
}

const supabase = createClient();

export default function LoginPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<LoginErrors>({});

  const validate = () => {
    const nextErrors: LoginErrors = {};

    if (!email.trim()) {
      nextErrors.email = "البريد الإلكتروني مطلوب.";
    } else if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      nextErrors.email = "صيغة البريد الإلكتروني غير صحيحة.";
    }

    if (!password) {
      nextErrors.password = "كلمة المرور مطلوبة.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!validate()) {
      toast.error("يرجى تصحيح أخطاء النموذج.");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        throw error;
      }

      const user = data.user;
      if (!user) {
        throw new Error("تعذر التحقق من المستخدم بعد تسجيل الدخول.");
      }

      let { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, school_id, role")
        .eq("id", user.id)
        .maybeSingle<{ id: string; school_id: string | null; role: string | null }>();

      if (profileError) {
        throw profileError;
      }

      if (!profile) {
        const fallbackName = (user.user_metadata?.full_name as string | undefined) || user.email?.split("@")[0] || "مستخدم";

        const { error: upsertError } = await supabase.from("profiles").upsert(
          [
            {
              id: user.id,
              full_name: fallbackName,
            },
          ],
          { onConflict: "id" },
        );

        if (upsertError) {
          throw upsertError;
        }

        const profileRes = await supabase
          .from("profiles")
          .select("id, school_id, role")
          .eq("id", user.id)
          .maybeSingle<{ id: string; school_id: string | null; role: string | null }>();

        if (profileRes.error) {
          throw profileRes.error;
        }

        profile = profileRes.data ?? null;
      }

      toast.success("تم تسجيل الدخول بنجاح.");

      if (!profile?.school_id || !profile?.role) {
        router.replace("/onboarding");
        return;
      }

      router.replace("/dashboard");
    } catch (error) {
      const message = error instanceof Error ? mapAuthError(error.message) : "تعذر تسجيل الدخول.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="تسجيل الدخول"
      subtitle="أدخل بياناتك للوصول إلى لوحة التحكم"
      footer={
        <>
          ليس لديك حساب؟{" "}
          <Link href="/register" className="font-semibold text-brand-700 hover:text-brand-600">
            إنشاء حساب
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" dir="rtl">
        <Field id="login-email" label="البريد الإلكتروني" type="email" value={email} onChange={setEmail} error={errors.email} />

        <Field
          id="login-password"
          label="كلمة المرور"
          type="password"
          value={password}
          onChange={setPassword}
          error={errors.password}
        />

        <div className="text-left">
          <Link href="/forgot-password" className="text-sm font-medium text-brand-700 hover:text-brand-600">
            نسيت كلمة المرور؟
          </Link>
        </div>

        <Button type="submit" disabled={loading}>
          {loading ? "جارٍ تسجيل الدخول..." : "دخول"}
        </Button>
      </form>
    </AuthShell>
  );
}
