"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";
import toast from "react-hot-toast";

import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/utils";

const supabase = createClient();

type AttendanceStatus = "present" | "absent" | "late";

interface AttendanceRow {
  student_id: string;
  status: AttendanceStatus;
  date: string;
}

interface StudentName {
  id: string;
  full_name: string;
}

interface TopAbsent {
  student_id: string;
  full_name: string;
  count: number;
}

export default function ReportsPage() {
  const [schoolId, setSchoolId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [records, setRecords] = useState<AttendanceRow[]>([]);
  const [topAbsents, setTopAbsents] = useState<TopAbsent[]>([]);

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
        .single();

      if (profileError) {
        throw profileError;
      }

      const activeSchoolId = profile?.school_id;

      if (!activeSchoolId) {
        setSchoolId("");
        setRecords([]);
        setTopAbsents([]);
        return;
      }

      setSchoolId(activeSchoolId);

      let attendanceQuery = supabase
        .from("attendance")
        .select("student_id, status, date")
        .eq("school_id", activeSchoolId)
        .order("date", { ascending: false });

      if (fromDate) {
        attendanceQuery = attendanceQuery.gte("date", fromDate);
      }

      if (toDate) {
        attendanceQuery = attendanceQuery.lte("date", toDate);
      }

      const [attendanceRes, studentsRes] = await Promise.all([
        attendanceQuery,
        supabase.from("students").select("id, full_name").eq("school_id", activeSchoolId),
      ]);

      if (attendanceRes.error || studentsRes.error) {
        throw attendanceRes.error || studentsRes.error;
      }

      const attendanceRecords = (attendanceRes.data as AttendanceRow[]) ?? [];
      setRecords(attendanceRecords);

      const studentsMap = new Map<string, string>();
      ((studentsRes.data as StudentName[]) ?? []).forEach((student) => {
        studentsMap.set(student.id, student.full_name);
      });

      const absentCounter = new Map<string, number>();
      attendanceRecords.forEach((row) => {
        if (row.status === "absent") {
          absentCounter.set(row.student_id, (absentCounter.get(row.student_id) ?? 0) + 1);
        }
      });

      const absents = Array.from(absentCounter.entries())
        .map(([studentId, count]) => ({
          student_id: studentId,
          full_name: studentsMap.get(studentId) ?? "طالب غير معروف",
          count,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      setTopAbsents(absents);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "تعذر تحميل التقارير.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  const summary = useMemo(() => {
    const stats = { present: 0, absent: 0, late: 0 };

    records.forEach((row) => {
      stats[row.status] += 1;
    });

    const total = stats.present + stats.absent + stats.late;
    const attendanceRate = total === 0 ? 0 : Math.round((stats.present / total) * 100);

    return {
      ...stats,
      total,
      attendanceRate,
    };
  }, [records]);

  const exportCsv = () => {
    if (topAbsents.length === 0) {
      toast.error("لا توجد بيانات لتصديرها.");
      return;
    }

    const lines = [
      "اسم الطالب,عدد الغياب",
      ...topAbsents.map((item) => `${item.full_name},${item.count}`),
      "",
      `نسبة الحضور,${summary.attendanceRate}%`,
      `إجمالي الحضور,${summary.present}`,
      `إجمالي الغياب,${summary.absent}`,
      `إجمالي التأخر,${summary.late}`,
    ];

    const blob = new Blob([`\uFEFF${lines.join("\n")}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `abshir-reports-${fromDate}-to-${toDate}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
    toast.success("تم تجهيز ملف التقرير.");
  };

  if (loading) {
    return (
      <section className="flex min-h-[60vh] items-center justify-center" dir="rtl">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-100 border-t-primary-600" />
      </section>
    );
  }

  if (!schoolId) {
    return (
      <section className="rounded-2xl bg-white p-8 text-center shadow-sm" dir="rtl">
        <h1 className="mb-3 text-2xl font-bold text-primary-700">لا توجد مدرسة مرتبطة بالحساب</h1>
        <p className="mb-6 text-gray-600">أكمل ربط المدرسة أولًا ليتم إنشاء التقارير.</p>
        <Link
          href="/onboarding"
          className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-primary-600 px-5 py-2 text-white hover:bg-primary-700"
        >
          الذهاب إلى الإعداد
        </Link>
      </section>
    );
  }

  return (
    <section dir="rtl" className="space-y-5">
      <header className="rounded-2xl bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-bold text-primary-700">التقارير والإحصاءات</h1>
        <p className="mt-1 text-gray-600">تحليل الحضور خلال الفترة المحددة وتصدير النتائج.</p>
      </header>

      <section className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label htmlFor="from-date" className="mb-1 block text-sm font-semibold text-gray-700">
              من تاريخ
            </label>
            <input
              id="from-date"
              type="date"
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-3 text-[16px] outline-none ring-primary-200 transition focus:ring"
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
              className="w-full rounded-lg border border-gray-200 px-3 py-3 text-[16px] outline-none ring-primary-200 transition focus:ring"
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
              تحديث البيانات
            </button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <article className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">إجمالي السجلات</p>
          <p className="mt-2 text-3xl font-extrabold text-gray-900">{summary.total}</p>
        </article>
        <article className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">نسبة الحضور</p>
          <p className="mt-2 text-3xl font-extrabold text-primary-700">{summary.attendanceRate}%</p>
        </article>
        <article className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">إجمالي الغياب</p>
          <p className="mt-2 text-3xl font-extrabold text-red-600">{summary.absent}</p>
        </article>
        <article className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">إجمالي التأخر</p>
          <p className="mt-2 text-3xl font-extrabold text-amber-600">{summary.late}</p>
        </article>
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-bold text-primary-700">أكثر الطلبة غيابًا</h2>
          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700"
          >
            <Download className="h-4 w-4" />
            تصدير CSV
          </button>
        </div>

        {topAbsents.length === 0 ? (
          <div className="rounded-xl border border-dashed border-primary-200 bg-primary-50/40 p-5 text-center">
            <p className="mb-4 text-gray-600">لا توجد بيانات غياب في هذه الفترة.</p>
            <Link
              href="/dashboard/attendance"
              className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700"
            >
              تسجيل الحضور الآن
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {topAbsents.map((item, index) => (
              <li key={item.student_id} className="rounded-xl border border-primary-100 bg-beige-50 p-4">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-gray-900">
                    {index + 1}. {item.full_name}
                  </p>
                  <p className="font-bold text-red-600">{item.count} غياب</p>
                </div>
                <p className="mt-1 text-xs text-gray-500">آخر تحديث: {formatDate(new Date())}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}
