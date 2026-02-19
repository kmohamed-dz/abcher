"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import AuthShell from "@/components/ui/AuthShell";
import Button from "@/components/ui/Button";
import Field from "@/components/ui/Field";
import { createClient } from "@/lib/supabase/client";

interface UpdatePasswordErrors {
  password?: string;
  confirmPassword?: string;
}

function mapAuthError(message: string) {
  const value = message.toLowerCase();

  if (value.includes("same password")) {
    return "اختر كلمة مرور جديدة مختلفة عن السابقة.";
  }

  if (value.includes("password should be at least")) {
    return "كلمة المرور يجب أن تكون 6 أحرف على الأقل.";
  }

  if (value.includes("expired")) {
    return "رابط إعادة التعيين منتهي الصلاحية. اطلب رابطًا جديدًا.";
  }

  return "تعذر تحديث كلمة المرور.";
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

export default function UpdatePasswordPage() {
  const router = useRouter();

  const [checkingSession, setCheckingSession] = useState(true);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<UpdatePasswordErrors>({});

  useEffect(() => {
    const initialize = async () => {
      setCheckingSession(true);

      try {
        const params = new URLSearchParams(window.location.search);
        const queryError = params.get("error_description");
        const queryCode = params.get("code");

        if (queryError) {
          toast.error(`تعذر التحقق من الرابط. (${queryError})`);
          setReady(false);
          return;
        }

        if (queryCode) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(queryCode);
          if (exchangeError) {
            throw exchangeError;
          }
        }

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (!session) {
          toast.error("رابط الاستعادة غير صالح أو منتهي. اطلب رابطًا جديدًا.");
          setReady(false);
          return;
        }

        setReady(true);
      } catch (error) {
        showAuthError("update-password:init", error, "تعذر تهيئة صفحة التحديث.");
        setReady(false);
      } finally {
        setCheckingSession(false);
      }
    };

    void initialize();
  }, []);

  const validate = () => {
    const nextErrors: UpdatePasswordErrors = {};

    if (!password) {
      nextErrors.password = "كلمة المرور الجديدة مطلوبة.";
    } else if (password.length < 6) {
      nextErrors.password = "كلمة المرور يجب أن تكون 6 أحرف على الأقل.";
    }

    if (!confirmPassword) {
      nextErrors.confirmPassword = "تأكيد كلمة المرور مطلوب.";
    } else if (confirmPassword !== password) {
      nextErrors.confirmPassword = "كلمتا المرور غير متطابقتين.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const subtitle = useMemo(() => {
    if (checkingSession) {
      return "جارٍ التحقق من صلاحية رابط الاستعادة...";
    }

    if (!ready) {
      return "يمكنك طلب رابط جديد من صفحة استعادة كلمة المرور.";
    }

    return "أدخل كلمة مرور جديدة وآمنة لحسابك.";
  }, [checkingSession, ready]);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!ready) {
      toast.error("الرابط غير صالح. اطلب رابط استعادة جديد.");
      return;
    }

    if (!validate()) {
      toast.error("يرجى تصحيح أخطاء النموذج.");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        throw error;
      }

      await supabase.auth.signOut();
      toast.success("تم تحديث كلمة المرور بنجاح. يمكنك تسجيل الدخول الآن.");
      router.replace("/login");
    } catch (error) {
      showAuthError("update-password:submit", error, "تعذر تحديث كلمة المرور.");
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <section dir="rtl" className="flex min-h-screen items-center justify-center bg-app">
        <div className="h-11 w-11 animate-spin rounded-full border-4 border-primary-100 border-t-primary-600" />
      </section>
    );
  }

  return (
    <AuthShell
      title="تحديث كلمة المرور"
      subtitle={subtitle}
      footer={
        <>
          تذكرت كلمة المرور؟{" "}
          <Link href="/login" className="font-semibold text-brand-700 hover:text-brand-600">
            تسجيل الدخول
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" dir="rtl">
        <Field
          id="update-password"
          label="كلمة المرور الجديدة"
          type="password"
          value={password}
          onChange={setPassword}
          error={errors.password}
          disabled={!ready}
        />

        <Field
          id="update-confirm-password"
          label="تأكيد كلمة المرور"
          type="password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          error={errors.confirmPassword}
          disabled={!ready}
        />

        <Button type="submit" disabled={loading || !ready}>
          {loading ? "جارٍ التحديث..." : "حفظ كلمة المرور"}
        </Button>
      </form>
    </AuthShell>
  );
}
