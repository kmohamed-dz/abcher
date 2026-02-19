"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

import AuthShell from "@/components/ui/AuthShell";
import Button from "@/components/ui/Button";
import Field from "@/components/ui/Field";
import { createClient } from "@/lib/supabase/client";
import { getCurrentProfile } from "@/lib/getCurrentProfile";

interface LoginErrors {
  email?: string;
  password?: string;
}

function isMissingProfilesTableError(message: string) {
  const value = message.toLowerCase();

  return (
    (value.includes("could not find the table") && value.includes("profiles")) ||
    (value.includes("schema cache") && value.includes("profiles")) ||
    (value.includes("relation") && value.includes("profiles") && value.includes("does not exist"))
  );
}

function mapAuthError(message: string) {
  const value = message.toLowerCase();

  if (isMissingProfilesTableError(value)) {
    return "تسجيل الدخول نجح لكن قاعدة البيانات غير مهيأة (جدول profiles غير موجود).";
  }

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

function showAuthError(context: string, error: unknown, fallback: string) {
  const originalMessage = getErrorMessage(error, fallback);
  console.warn(`[auth:${context}]`, originalMessage);
  const friendlyMessage = mapAuthError(originalMessage);

  toast.error(`${friendlyMessage} (${originalMessage})`);
}

const supabase = createClient();

export default function LoginPage() {
  const router = useRouter();
  const hasShownCallbackErrorRef = useRef(false);

  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<LoginErrors>({});

  useEffect(() => {
    if (hasShownCallbackErrorRef.current) {
      return;
    }

    hasShownCallbackErrorRef.current = true;

    const params = new URLSearchParams(window.location.search);
    const callbackError = params.get("error");

    if (!callbackError) {
      return;
    }

    toast.error(`تعذر إكمال المصادقة. (${callbackError})`);
  }, []);

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

      const { profile } = await getCurrentProfile();

      toast.success("تم تسجيل الدخول بنجاح.");

      if (!profile?.school_id || !profile?.role) {
        router.replace("/onboarding");
        return;
      }

      router.replace("/dashboard");
    } catch (error) {
      showAuthError("login", error, "تعذر تسجيل الدخول.");
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
