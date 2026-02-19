"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ClipboardCheck, GraduationCap, UserCheck } from "lucide-react";
import toast from "react-hot-toast";

import { createClient } from "@/lib/supabase/client";
import { formatDateTime } from "@/lib/utils";

interface Activity {
  id: string;
  action: string;
  actor_name: string | null;
  created_at: string;
}

interface DashboardStats {
  students: number;
  teachers: number;
  attendanceRate: number;
}

const supabase = createClient();

export default function DashboardHomePage() {
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    students: 0,
    teachers: 0,
    attendanceRate: 0,
  });
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error("تعذر التحقق من المستخدم الحالي.");
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("school_id")
        .eq("id", user.id)
        .single();

      if (profileError) {
        throw profileError;
      }

      if (!profile?.school_id) {
        setSchoolId(null);
        setActivities([]);
        setStats({ students: 0, teachers: 0, attendanceRate: 0 });
        return;
      }

      const activeSchoolId = profile.school_id;
      setSchoolId(activeSchoolId);

      const today = new Date().toISOString().slice(0, 10);

      const [studentsRes, teachersRes, totalAttendanceRes, presentAttendanceRes, activitiesRes] = await Promise.all([
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
          .limit(8),
      ]);

      if (studentsRes.error || teachersRes.error || totalAttendanceRes.error || presentAttendanceRes.error || activitiesRes.error) {
        throw (
          studentsRes.error ||
          teachersRes.error ||
          totalAttendanceRes.error ||
          presentAttendanceRes.error ||
          activitiesRes.error
        );
      }

      const students = studentsRes.count ?? 0;
      const teachers = teachersRes.count ?? 0;
      const totalAttendance = totalAttendanceRes.count ?? 0;
      const presentAttendance = presentAttendanceRes.count ?? 0;

      setStats({
        students,
        teachers,
        attendanceRate: totalAttendance === 0 ? 0 : Math.round((presentAttendance / totalAttendance) * 100),
      });

      setActivities(activitiesRes.data ?? []);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "حدث خطأ أثناء تحميل لوحة التحكم.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchDashboard();
  }, [fetchDashboard]);

  if (loading) {
    return (
      <section className="flex min-h-[60vh] items-center justify-center" dir="rtl">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-100 border-t-primary-600" />
      </section>
    );
  }

  if (!schoolId) {
    return (
      <section dir="rtl" className="rounded-2xl bg-white p-8 text-center shadow-sm">
        <h1 className="mb-3 text-2xl font-bold text-primary-700">لا توجد مدرسة مرتبطة بحسابك</h1>
        <p className="mb-6 text-gray-600">أكمل خطوة ربط المدرسة أولًا حتى تتمكن من إدارة البيانات.</p>
        <Link
          href="/onboarding"
          className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-primary-600 px-5 py-2 text-white hover:bg-primary-700"
        >
          الذهاب لربط المدرسة
        </Link>
      </section>
    );
  }

  const cards = [
    {
      title: "عدد الطلبة",
      value: stats.students,
      icon: GraduationCap,
    },
    {
      title: "عدد المعلمين",
      value: stats.teachers,
      icon: UserCheck,
    },
    {
      title: "نسبة الحضور اليوم",
      value: `${stats.attendanceRate}%`,
      icon: ClipboardCheck,
    },
  ];

  return (
    <section dir="rtl" className="space-y-6">
      <header className="rounded-2xl bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-primary-700">لوحة التحكم</h1>
        <p className="mt-2 text-gray-600">نظرة سريعة على أداء المدرسة اليومي.</p>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {cards.map(({ title, value, icon: Icon }) => (
          <article key={title} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-primary-50">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-primary-100 text-primary-700">
              <Icon className="h-5 w-5" />
            </div>
            <p className="text-sm text-gray-500">{title}</p>
            <p className="mt-1 text-3xl font-extrabold text-gray-900">{value}</p>
          </article>
        ))}
      </div>

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-primary-700">آخر النشاطات</h2>
          <Link href="/dashboard/reports" className="text-sm font-semibold text-primary-700 hover:text-primary-800">
            عرض التقارير
          </Link>
        </div>

        {activities.length === 0 ? (
          <div className="rounded-xl border border-dashed border-primary-200 bg-primary-50/40 p-5 text-center">
            <p className="mb-4 text-gray-600">لا توجد نشاطات حديثة بعد.</p>
            <Link
              href="/dashboard/messages"
              className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700"
            >
              ابدأ التفاعل الآن
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {activities.map((activity) => (
              <li
                key={activity.id}
                className="rounded-xl border border-primary-100 bg-beige-50 p-4 text-sm leading-7 text-gray-700"
              >
                <p className="font-semibold text-gray-900">{activity.action}</p>
                <p className="text-gray-500">بواسطة: {activity.actor_name ?? "مستخدم النظام"}</p>
                <p className="text-xs text-gray-500">{formatDateTime(activity.created_at)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}
