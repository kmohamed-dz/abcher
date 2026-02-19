"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

import AuthShell from "@/components/ui/AuthShell";
import Button from "@/components/ui/Button";
import Field from "@/components/ui/Field";
import { createClient } from "@/lib/supabase/client";

interface RegisterErrors {
  fullName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
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
    return "تم إنشاء الحساب لكن قاعدة البيانات غير مهيأة (جدول profiles غير موجود).";
  }

  if (value.includes("user already registered")) {
    return "هذا البريد مسجل بالفعل. يمكنك تسجيل الدخول مباشرة.";
  }

  if (value.includes("password should be at least")) {
    return "كلمة المرور يجب أن تكون 6 أحرف على الأقل.";
  }

  if (value.includes("invalid email")) {
    return "صيغة البريد الإلكتروني غير صحيحة.";
  }

  if (value.includes("signup is disabled")) {
    return "إنشاء الحسابات متوقف مؤقتًا.";
  }

  return "تعذر إنشاء الحساب. حاول مرة أخرى.";
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

export default function RegisterPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<RegisterErrors>({});

  const validate = () => {
    const nextErrors: RegisterErrors = {};

    if (!fullName.trim()) {
      nextErrors.fullName = "الاسم الكامل مطلوب.";
    }

    if (!email.trim()) {
      nextErrors.email = "البريد الإلكتروني مطلوب.";
    } else if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      nextErrors.email = "صيغة البريد الإلكتروني غير صحيحة.";
    }

    if (!password) {
      nextErrors.password = "كلمة المرور مطلوبة.";
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

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!validate()) {
      toast.error("يرجى تصحيح أخطاء النموذج.");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            full_name: fullName.trim(),
            phone: phone.trim() || null,
          },
        },
      });

      if (error) {
        throw error;
      }

      if (!data.session) {
        toast.success("تم إنشاء الحساب. تحقق من بريدك الإلكتروني ثم سجّل الدخول.");
        router.replace("/login");
        return;
      }

      const user = data.user;

      if (!user) {
        throw new Error("تعذر التحقق من المستخدم بعد إنشاء الحساب.");
      }

      const { error: profileError } = await supabase.from("profiles").upsert(
        [
          {
            id: user.id,
            full_name: fullName.trim(),
            phone: phone.trim() || null,
          },
        ],
        { onConflict: "id" },
      );

      if (profileError) {
        if (isMissingProfilesTableError(profileError.message)) {
          toast.success("تم إنشاء الحساب بنجاح.");
          toast("يرجى تنفيذ SUPABASE_SETUP.sql لإنشاء جدول profiles.");
          router.replace("/dashboard");
          return;
        }

        throw profileError;
      }

      const { data: profile, error: profileFetchError } = await supabase
        .from("profiles")
        .select("school_id, role")
        .eq("id", user.id)
        .maybeSingle<{ school_id: string | null; role: string | null }>();

      if (profileFetchError) {
        if (isMissingProfilesTableError(profileFetchError.message)) {
          toast.success("تم إنشاء الحساب بنجاح.");
          toast("يرجى تنفيذ SUPABASE_SETUP.sql لإنشاء جدول profiles.");
          router.replace("/dashboard");
          return;
        }

        throw profileFetchError;
      }

      toast.success("تم إنشاء الحساب بنجاح.");

      if (!profile?.school_id || !profile?.role) {
        router.replace("/onboarding");
        return;
      }

      router.replace("/dashboard");
    } catch (error) {
      showAuthError("register", error, "تعذر إنشاء الحساب.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="إنشاء حساب"
      subtitle="ابدأ استخدام أبشر خلال دقائق"
      footer={
        <>
          لديك حساب بالفعل؟{" "}
          <Link href="/login" className="font-semibold text-brand-700 hover:text-brand-600">
            تسجيل الدخول
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" dir="rtl">
        <Field id="register-name" label="الاسم الكامل" value={fullName} onChange={setFullName} error={errors.fullName} />

        <Field id="register-email" label="البريد الإلكتروني" type="email" value={email} onChange={setEmail} error={errors.email} />

        <Field id="register-phone" label="رقم الهاتف (اختياري)" value={phone} onChange={setPhone} />

        <Field
          id="register-password"
          label="كلمة المرور"
          type="password"
          value={password}
          onChange={setPassword}
          error={errors.password}
        />

        <Field
          id="register-confirm-password"
          label="تأكيد كلمة المرور"
          type="password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          error={errors.confirmPassword}
        />

        <Button type="submit" disabled={loading}>
          {loading ? "جارٍ إنشاء الحساب..." : "إنشاء الحساب"}
        </Button>
      </form>
    </AuthShell>
  );
}
