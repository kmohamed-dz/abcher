"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";

import { createClient } from "@/lib/supabase/client";
import type { UserRole } from "@/lib/types";

interface ProfileContext {
  role: UserRole | null;
}

interface WilayaCount {
  wilaya: string;
  count: number;
}

interface AuthorityAggregate {
  schools_per_wilaya: WilayaCount[];
  students_per_wilaya: WilayaCount[];
  total_teachers: number;
  avg_attendance_rate: number;
}

const supabase = createClient();

export default function AuthorityPage() {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [aggregate, setAggregate] = useState<AuthorityAggregate>({
    schools_per_wilaya: [],
    students_per_wilaya: [],
    total_teachers: 0,
    avg_attendance_rate: 0,
  });

  const loadData = useCallback(async () => {
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("يرجى تسجيل الدخول أولًا.");
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single<ProfileContext>();

      if (profileError) {
        throw profileError;
      }

      if (profile?.role !== "authority_admin") {
        setAuthorized(false);
        return;
      }

      setAuthorized(true);

      const { data, error } = await supabase.rpc("authority_dashboard_aggregates");

      if (error) {
        throw error;
      }

      const payload = (data as AuthorityAggregate | null) ?? {
        schools_per_wilaya: [],
        students_per_wilaya: [],
        total_teachers: 0,
        avg_attendance_rate: 0,
      };

      setAggregate(payload);
    } catch (error) {
      const message = error instanceof Error ? error.message : "تعذر تحميل لوحة الجهة الوصية.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  if (loading) {
    return (
      <section dir="rtl" className="flex min-h-[65vh] items-center justify-center">
        <div className="h-11 w-11 animate-spin rounded-full border-4 border-primary-100 border-t-primary-600" />
      </section>
    );
  }

  if (!authorized) {
    return (
      <section dir="rtl" className="rounded-xl bg-white p-6 text-center shadow-md">
        <h1 className="mb-3 text-2xl font-bold text-primary-700">غير مصرح بالدخول</h1>
        <p className="mb-6 text-gray-600">هذه الصفحة متاحة فقط لدور الجهة الوصية.</p>
        <Link
          href="/dashboard"
          className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700"
        >
          العودة للوحة الرئيسية
        </Link>
      </section>
    );
  }

  return (
    <section dir="rtl" className="space-y-5">
      <header className="rounded-xl bg-white p-6 shadow-md">
        <h1 className="text-2xl font-bold text-primary-700">لوحة الجهة الوصية</h1>
        <p className="mt-2 text-gray-600">إحصاءات مجمعة على مستوى جميع المدارس دون بيانات فردية.</p>
      </header>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <article className="rounded-xl bg-white p-6 shadow-md">
          <p className="text-sm text-gray-600">إجمالي المعلمين</p>
          <p className="mt-2 text-3xl font-extrabold text-gray-900">{aggregate.total_teachers}</p>
        </article>
        <article className="rounded-xl bg-white p-6 shadow-md">
          <p className="text-sm text-gray-600">متوسط الحضور العام</p>
          <p className="mt-2 text-3xl font-extrabold text-primary-700">{aggregate.avg_attendance_rate}%</p>
        </article>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <article className="rounded-xl bg-white p-6 shadow-md">
          <h2 className="mb-4 text-lg font-bold text-primary-700">المدارس حسب الولاية</h2>
          {aggregate.schools_per_wilaya.length === 0 ? (
            <p className="text-sm text-gray-600">لا توجد بيانات متاحة.</p>
          ) : (
            <ul className="space-y-2">
              {aggregate.schools_per_wilaya.map((row) => (
                <li key={`school-${row.wilaya}`} className="flex items-center justify-between rounded-lg bg-beige-50 px-3 py-2">
                  <span className="font-semibold text-gray-900">{row.wilaya}</span>
                  <span className="text-primary-700">{row.count}</span>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="rounded-xl bg-white p-6 shadow-md">
          <h2 className="mb-4 text-lg font-bold text-primary-700">الطلبة حسب الولاية</h2>
          {aggregate.students_per_wilaya.length === 0 ? (
            <p className="text-sm text-gray-600">لا توجد بيانات متاحة.</p>
          ) : (
            <ul className="space-y-2">
              {aggregate.students_per_wilaya.map((row) => (
                <li key={`student-${row.wilaya}`} className="flex items-center justify-between rounded-lg bg-beige-50 px-3 py-2">
                  <span className="font-semibold text-gray-900">{row.wilaya}</span>
                  <span className="text-primary-700">{row.count}</span>
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>
    </section>
  );
}
