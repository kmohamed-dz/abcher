"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BookCheck, ClipboardCheck, GraduationCap, Users } from "lucide-react";
import toast from "react-hot-toast";

import { createClient } from "@/lib/supabase/client";
import { formatDateTime } from "@/lib/utils";

interface ProfileContext {
  school_id: string | null;
}

interface ActivityItem {
  id: string;
  title: string;
  message: string;
  created_at: string;
}

interface DashboardStats {
  students: number;
  teachers: number;
  attendanceRate: number;
  activeHomework: number;
}

const supabase = createClient();

export default function DashboardHomePage() {
  const [loading, setLoading] = useState(true);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    students: 0,
    teachers: 0,
    attendanceRate: 0,
    activeHomework: 0,
  });
  const [activities, setActivities] = useState<ActivityItem[]>([]);

  const loadPageData = useCallback(async () => {
    setLoading(true);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error("تعذر التحقق من المستخدم.");
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("school_id")
        .eq("id", user.id)
        .single<ProfileContext>();

      if (profileError) {
        throw profileError;
      }

      if (!profile?.school_id) {
        setSchoolId(null);
        setActivities([]);
        setStats({ students: 0, teachers: 0, attendanceRate: 0, activeHomework: 0 });
        return;
      }

      const currentSchoolId = profile.school_id;
      setSchoolId(currentSchoolId);

      const today = new Date().toISOString().slice(0, 10);

      const [studentsCount, teachersCount, totalAttendance, presentAttendance, homeworkCount, notificationsData] =
        await Promise.all([
          supabase.from("students").select("id", { count: "exact", head: true }).eq("school_id", currentSchoolId),
          supabase.from("teachers").select("id", { count: "exact", head: true }).eq("school_id", currentSchoolId),
          supabase
            .from("attendance")
            .select("id", { count: "exact", head: true })
            .eq("school_id", currentSchoolId)
            .eq("date", today),
          supabase
            .from("attendance")
            .select("id", { count: "exact", head: true })
            .eq("school_id", currentSchoolId)
            .eq("date", today)
            .in("status", ["present", "late", "excused"]),
          supabase
            .from("homework")
            .select("id", { count: "exact", head: true })
            .eq("school_id", currentSchoolId)
            .or(`due_date.gte.${today},due_date.is.null`),
          supabase
            .from("notifications")
            .select("id,title,message,created_at")
            .eq("school_id", currentSchoolId)
            .order("created_at", { ascending: false })
            .limit(6),
        ]);

      if (
        studentsCount.error ||
        teachersCount.error ||
        totalAttendance.error ||
        presentAttendance.error ||
        homeworkCount.error ||
        notificationsData.error
      ) {
        throw (
          studentsCount.error ||
          teachersCount.error ||
          totalAttendance.error ||
          presentAttendance.error ||
          homeworkCount.error ||
          notificationsData.error
        );
      }

      const total = totalAttendance.count ?? 0;
      const present = presentAttendance.count ?? 0;

      setStats({
        students: studentsCount.count ?? 0,
        teachers: teachersCount.count ?? 0,
        activeHomework: homeworkCount.count ?? 0,
        attendanceRate: total === 0 ? 0 : Math.round((present / total) * 100),
      });

      const recentActivities: ActivityItem[] = ((notificationsData.data as Array<{ id: string; title: string; message: string; created_at: string }>) ?? []).map((item) => ({
        id: item.id,
        title: item.title,
        message: item.message,
        created_at: item.created_at,
      }));

      setActivities(recentActivities);
    } catch (error) {
      const message = error instanceof Error ? error.message : "تعذر تحميل لوحة التحكم.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPageData();
  }, [loadPageData]);

  const cards = useMemo(
    () => [
      { title: "عدد الطلبة", value: stats.students, icon: GraduationCap },
      { title: "عدد المعلمين", value: stats.teachers, icon: Users },
      { title: "نسبة الحضور اليوم", value: `${stats.attendanceRate}%`, icon: ClipboardCheck },
      { title: "الواجبات النشطة", value: stats.activeHomework, icon: BookCheck },
    ],
    [stats],
  );

  if (loading) {
    return (
      <section dir="rtl" className="flex min-h-[65vh] items-center justify-center">
        <div className="h-11 w-11 animate-spin rounded-full border-4 border-primary-100 border-t-primary-600" />
      </section>
    );
  }

  if (!schoolId) {
    return (
      <section dir="rtl" className="rounded-xl bg-white p-6 text-center shadow-md">
        <h1 className="mb-3 text-2xl font-bold text-primary-700">لم يتم ربط الحساب بمدرسة</h1>
        <p className="mb-6 text-gray-600">أكمل الإعداد حتى تظهر بيانات لوحة التحكم.</p>
        <Link
          href="/onboarding"
          className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700"
        >
          إكمال الإعداد
        </Link>
      </section>
    );
  }

  return (
    <section dir="rtl" className="space-y-5">
      <header className="rounded-xl bg-white p-6 shadow-md">
        <h1 className="text-2xl font-bold text-primary-700">لوحة التحكم</h1>
        <p className="mt-2 text-gray-600">ملخص سريع عن أداء المدرسة اليوم.</p>
      </header>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ title, value, icon: Icon }) => (
          <article key={title} className="rounded-xl bg-white p-6 shadow-md">
            <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100 text-primary-700">
              <Icon className="h-5 w-5" />
            </div>
            <p className="text-sm text-gray-600">{title}</p>
            <p className="mt-1 text-3xl font-extrabold text-gray-900">{value}</p>
          </article>
        ))}
      </section>

      <section className="rounded-xl bg-white p-6 shadow-md">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-primary-700">آخر النشاطات</h2>
          <Link href="/dashboard/reports" className="text-sm font-semibold text-primary-700 hover:text-primary-800">
            عرض التقارير
          </Link>
        </div>

        {activities.length === 0 ? (
          <div className="rounded-lg border border-dashed border-primary-200 bg-primary-50 p-6 text-center">
            <p className="mb-4 text-gray-600">لا توجد نشاطات حديثة حاليًا.</p>
            <Link
              href="/dashboard/messages"
              className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700"
            >
              بدء التواصل
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {activities.map((activity) => (
              <li key={activity.id} className="rounded-lg border border-primary-100 bg-beige-50 p-4">
                <p className="font-semibold text-gray-900">{activity.title}</p>
                <p className="mt-1 text-sm text-gray-600">{activity.message}</p>
                <p className="mt-2 text-xs text-gray-500">{formatDateTime(activity.created_at)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}
