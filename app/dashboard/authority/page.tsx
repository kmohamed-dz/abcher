"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";

import { createClient } from "@/lib/supabase/client";
import { formatDateTime } from "@/lib/utils";

const supabase = createClient();

interface Activity {
  id: string;
  action: string;
  actor_name: string | null;
  created_at: string;
}

interface AuthorityStats {
  schools: number;
  students: number;
  teachers: number;
  attendanceRate: number;
}

export default function AuthorityPage() {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [schoolId, setSchoolId] = useState<string>("");
  const [stats, setStats] = useState<AuthorityStats>({
    schools: 0,
    students: 0,
    teachers: 0,
    attendanceRate: 0,
  });
  const [activities, setActivities] = useState<Activity[]>([]);

  const loadAuthorityData = useCallback(async () => {
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
        .select("role, school_id")
        .eq("id", user.id)
        .single();

      if (profileError) {
        throw profileError;
      }

      const role = profile?.role;
      const activeSchoolId = profile?.school_id;

      if (role !== "authority_admin") {
        setAuthorized(false);
        return;
      }

      setAuthorized(true);

      if (!activeSchoolId) {
        setSchoolId("");
        setStats({ schools: 0, students: 0, teachers: 0, attendanceRate: 0 });
        setActivities([]);
        return;
      }

      setSchoolId(activeSchoolId);

      const today = new Date().toISOString().slice(0, 10);

      const [schoolsRes, studentsRes, teachersRes, totalAttendanceRes, presentAttendanceRes, activitiesRes] =
        await Promise.all([
          supabase.from("schools").select("id", { count: "exact", head: true }).eq("id", activeSchoolId),
          supabase.from("students").select("id", { count: "exact", head: true }).eq("school_id", activeSchoolId),
          supabase.from("teachers").select("id", { count: "exact", head: true }).eq("school_id", activeSchoolId),
          supabase
            .from("attendance")
            .select("id", { count: "exact", head: true })
            .eq("school_id", activeSchoolId)
            .eq("date", today),
          supabase
            .from("attendance")
            .select("id", { count: "exact", head: true })
            .eq("school_id", activeSchoolId)
            .eq("date", today)
            .eq("status", "present"),
          supabase
            .from("activities")
            .select("id, action, actor_name, created_at")
            .eq("school_id", activeSchoolId)
            .order("created_at", { ascending: false })
            .limit(10),
        ]);

      if (
        schoolsRes.error ||
        studentsRes.error ||
        teachersRes.error ||
        totalAttendanceRes.error ||
        presentAttendanceRes.error ||
        activitiesRes.error
      ) {
        throw (
          schoolsRes.error ||
          studentsRes.error ||
          teachersRes.error ||
          totalAttendanceRes.error ||
          presentAttendanceRes.error ||
          activitiesRes.error
        );
      }

      const totalAttendance = totalAttendanceRes.count ?? 0;
      const presentAttendance = presentAttendanceRes.count ?? 0;

      setStats({
        schools: schoolsRes.count ?? 0,
        students: studentsRes.count ?? 0,
        teachers: teachersRes.count ?? 0,
        attendanceRate: totalAttendance === 0 ? 0 : Math.round((presentAttendance / totalAttendance) * 100),
      });

      setActivities((activitiesRes.data as Activity[]) ?? []);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "تعذر تحميل لوحة الجهة الوصية.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAuthorityData();
  }, [loadAuthorityData]);

  if (loading) {
    return (
      <section className="flex min-h-[60vh] items-center justify-center" dir="rtl">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-100 border-t-primary-600" />
      </section>
    );
  }

  if (!authorized) {
    return (
      <section className="rounded-2xl bg-white p-8 text-center shadow-sm" dir="rtl">
        <h1 className="mb-3 text-2xl font-bold text-primary-700">غير مصرح لك بالدخول</h1>
        <p className="mb-6 text-gray-600">هذه الصفحة متاحة فقط لحساب الجهة الوصية.</p>
        <Link
          href="/dashboard"
          className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-primary-600 px-5 py-2 text-white hover:bg-primary-700"
        >
          العودة للوحة الرئيسية
        </Link>
      </section>
    );
  }

  if (!schoolId) {
    return (
      <section className="rounded-2xl bg-white p-8 text-center shadow-sm" dir="rtl">
        <h1 className="mb-3 text-2xl font-bold text-primary-700">لا توجد مدرسة مرتبطة بحساب الجهة الوصية</h1>
        <p className="mb-6 text-gray-600">يجب ربط الحساب بمدرسة واحدة على الأقل لعرض الإحصاءات.</p>
        <Link
          href="/onboarding"
          className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-primary-600 px-5 py-2 text-white hover:bg-primary-700"
        >
          إكمال الربط
        </Link>
      </section>
    );
  }

  return (
    <section dir="rtl" className="space-y-5">
      <header className="rounded-2xl bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-bold text-primary-700">لوحة الجهة الوصية</h1>
        <p className="mt-1 text-gray-600">مؤشرات مجمعة لمتابعة أداء المدرسة المرتبطة.</p>
      </header>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <article className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">عدد المدارس</p>
          <p className="mt-2 text-3xl font-extrabold text-gray-900">{stats.schools}</p>
        </article>
        <article className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">عدد الطلبة</p>
          <p className="mt-2 text-3xl font-extrabold text-gray-900">{stats.students}</p>
        </article>
        <article className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">عدد المعلمين</p>
          <p className="mt-2 text-3xl font-extrabold text-gray-900">{stats.teachers}</p>
        </article>
        <article className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">نسبة الحضور اليوم</p>
          <p className="mt-2 text-3xl font-extrabold text-primary-700">{stats.attendanceRate}%</p>
        </article>
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-xl font-bold text-primary-700">آخر النشاطات</h2>

        {activities.length === 0 ? (
          <div className="rounded-xl border border-dashed border-primary-200 bg-primary-50/40 p-5 text-center">
            <p className="mb-4 text-gray-600">لا توجد نشاطات حديثة متاحة حاليًا.</p>
            <Link
              href="/dashboard/reports"
              className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700"
            >
              عرض التقارير
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {activities.map((activity) => (
              <li key={activity.id} className="rounded-xl border border-primary-100 bg-beige-50 p-4">
                <p className="font-semibold text-gray-900">{activity.action}</p>
                <p className="text-sm text-gray-600">بواسطة: {activity.actor_name ?? "مستخدم النظام"}</p>
                <p className="text-xs text-gray-500">{formatDateTime(activity.created_at)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}
