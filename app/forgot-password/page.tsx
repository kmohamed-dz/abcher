"use client";

import Link from "next/link";
import { useState } from "react";
import toast from "react-hot-toast";

import AuthShell from "@/components/ui/AuthShell";
import Button from "@/components/ui/Button";
import Field from "@/components/ui/Field";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError(undefined);

    if (!email.trim()) {
      setError("البريد الإلكتروني مطلوب.");
      toast.error("أدخل بريدك الإلكتروني.");
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError("صيغة البريد الإلكتروني غير صحيحة.");
      toast.error("تحقق من صيغة البريد الإلكتروني.");
      return;
    }

    setLoading(true);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/login`,
      });

      if (resetError) {
        throw resetError;
      }

      setSent(true);
      toast.success("تم إرسال رابط إعادة التعيين إلى بريدك الإلكتروني.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "تعذر إرسال رابط إعادة التعيين.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="استعادة كلمة المرور"
      subtitle="أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة التعيين"
      footer={
        <>
          تذكرت كلمة المرور؟{" "}
          <Link href="/login" className="font-semibold text-brand-700 hover:text-brand-600">
            العودة إلى الدخول
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" dir="rtl">
        <Field id="forgot-email" label="البريد الإلكتروني" type="email" value={email} onChange={setEmail} error={error} />

        <Button type="submit" disabled={loading}>
          {loading ? "جارٍ الإرسال..." : "إرسال الرابط"}
        </Button>

        {sent ? (
          <div className="rounded-xl bg-primary-50 p-3 text-sm text-primary-700">
            تم الإرسال بنجاح. افحص بريدك الإلكتروني واتبع التعليمات.
          </div>
        ) : null}
      </form>
    </AuthShell>
  );
}
