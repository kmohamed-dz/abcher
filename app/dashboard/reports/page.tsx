"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FileDown } from "lucide-react";
import toast from "react-hot-toast";

import { createClient } from "@/lib/supabase/client";

interface ProfileContext {
  school_id: string | null;
}

interface StudentBasic {
  id: string;
  full_name: string;
}

interface AttendanceItem {
  student_id: string;
  status: "present" | "absent" | "late" | "excused";
  date: string;
}

interface TopAbsentItem {
  student_id: string;
  student_name: string;
  absent_count: number;
}

const supabase = createClient();

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState<string>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  });
  const [toDate, setToDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [studentsCount, setStudentsCount] = useState(0);
  const [weeklyRate, setWeeklyRate] = useState(0);
  const [topAbsentees, setTopAbsentees] = useState<TopAbsentItem[]>([]);

  const loadReports = useCallback(async () => {
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
        .select("school_id")
        .eq("id", user.id)
        .single<ProfileContext>();

      if (profileError) {
        throw profileError;
      }

      if (!profile?.school_id) {
        setSchoolId(null);
        setStudentsCount(0);
        setWeeklyRate(0);
        setTopAbsentees([]);
        return;
      }

      const currentSchoolId = profile.school_id;
      setSchoolId(currentSchoolId);

      const studentsRes = await supabase
        .from("students")
        .select("id, full_name")
        .eq("school_id", currentSchoolId);

      if (studentsRes.error) {
        throw studentsRes.error;
      }

      const studentList = (studentsRes.data as StudentBasic[]) ?? [];
      setStudentsCount(studentList.length);

      let attendanceQuery = supabase
        .from("attendance")
        .select("student_id,status,date")
        .eq("school_id", currentSchoolId)
        .gte("date", fromDate)
        .lte("date", toDate);

      const attendanceRes = await attendanceQuery;

      if (attendanceRes.error) {
        throw attendanceRes.error;
      }

      const attendanceRows = (attendanceRes.data as AttendanceItem[]) ?? [];

      const end = new Date(toDate);
      const weeklyStart = new Date(end);
      weeklyStart.setDate(end.getDate() - 6);
      const weeklyStartIso = weeklyStart.toISOString().slice(0, 10);

      const weeklyRows = attendanceRows.filter((item) => item.date >= weeklyStartIso && item.date <= toDate);
      const presentLike = weeklyRows.filter((item) => ["present", "late", "excused"].includes(item.status)).length;
      const weeklyTotal = weeklyRows.length;
      setWeeklyRate(weeklyTotal === 0 ? 0 : Math.round((presentLike / weeklyTotal) * 100));

      const absentMap = new Map<string, number>();
      attendanceRows.forEach((item) => {
        if (item.status === "absent") {
          absentMap.set(item.student_id, (absentMap.get(item.student_id) ?? 0) + 1);
        }
      });

      const studentsMap = new Map(studentList.map((student) => [student.id, student.full_name]));

      const top = Array.from(absentMap.entries())
        .map(([studentId, count]) => ({
          student_id: studentId,
          student_name: studentsMap.get(studentId) ?? "طالب غير معروف",
          absent_count: count,
        }))
        .sort((a, b) => b.absent_count - a.absent_count)
        .slice(0, 5);

      setTopAbsentees(top);
    } catch (error) {
      const message = error instanceof Error ? error.message : "تعذر تحميل التقارير.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  const hasData = useMemo(() => studentsCount > 0 || topAbsentees.length > 0, [studentsCount, topAbsentees.length]);

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
        <h1 className="mb-3 text-2xl font-bold text-primary-700">لا توجد مدرسة مرتبطة</h1>
        <p className="mb-6 text-gray-600">أكمل الإعداد لعرض التقارير.</p>
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
        <h1 className="text-2xl font-bold text-primary-700">التقارير</h1>
        <p className="mt-2 text-gray-600">مؤشرات الأداء والحضور خلال الفترة المحددة.</p>
      </header>

      <section className="rounded-xl bg-white p-6 shadow-md">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div>
            <label htmlFor="from-date" className="mb-1 block text-sm font-semibold text-gray-700">
              من تاريخ
            </label>
            <input
              id="from-date"
              type="date"
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-3 text-[16px] outline-none ring-primary-200 focus:ring"
            />
          </div>
          <div>
            <label htmlFor="to-date" className="mb-1 block text-sm font-semibold text-gray-700">
              إلى تاريخ
            </label>
            <input
              id="to-date"
              type="date"
              value={toDate}
              onChange={(event) => setToDate(event.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-3 text-[16px] outline-none ring-primary-200 focus:ring"
            />
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => {
                void loadReports();
              }}
              className="w-full min-h-[44px] rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700"
            >
              تحديث
            </button>
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => toast.success("زر تصدير PDF جاهز، أضف خدمة التصدير لاحقًا.")}
              className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700"
            >
              <FileDown className="h-4 w-4" />
              تصدير PDF
            </button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <article className="rounded-xl bg-white p-6 shadow-md">
          <p className="text-sm text-gray-600">إجمالي الطلبة</p>
          <p className="mt-2 text-3xl font-extrabold text-gray-900">{studentsCount}</p>
        </article>
        <article className="rounded-xl bg-white p-6 shadow-md">
          <p className="text-sm text-gray-600">معدل الحضور الأسبوعي</p>
          <p className="mt-2 text-3xl font-extrabold text-primary-700">{weeklyRate}%</p>
        </article>
      </section>

      <section className="rounded-xl bg-white p-6 shadow-md">
        <h2 className="mb-4 text-xl font-bold text-primary-700">أكثر 5 طلبة غيابًا</h2>

        {!hasData || topAbsentees.length === 0 ? (
          <div className="rounded-lg border border-dashed border-primary-200 bg-primary-50 p-6 text-center">
            <p className="mb-4 text-gray-600">لا توجد بيانات غياب كافية في الفترة المحددة.</p>
            <Link
              href="/dashboard/attendance"
              className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700"
            >
              تسجيل حضور جديد
            </Link>
          </div>
        ) : (
          <ul className="space-y-2">
            {topAbsentees.map((item, index) => (
              <li key={item.student_id} className="flex items-center justify-between rounded-lg border border-gray-100 bg-beige-50 p-3">
                <p className="font-semibold text-gray-900">
                  {index + 1}. {item.student_name}
                </p>
                <p className="font-bold text-red-600">{item.absent_count} غياب</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}
