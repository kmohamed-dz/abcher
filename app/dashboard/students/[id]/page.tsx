"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import toast from "react-hot-toast";

import { createClient } from "@/lib/supabase/client";
import type { Student } from "@/lib/types";
import { formatDate } from "@/lib/utils";

const supabase = createClient();

type AttendanceStatus = "present" | "absent" | "late";

interface AttendanceEntry {
  date: string;
  status: AttendanceStatus;
}

interface ExamResultEntry {
  id: string;
  exam_id: string;
  score: number;
  created_at: string;
}

interface ExamItem {
  id: string;
  title: string;
  exam_date: string;
  max_score: number;
}

interface DisplayResult {
  id: string;
  examTitle: string;
  examDate: string;
  maxScore: number;
  score: number;
}

function buildRecentDays(days: number) {
  const output: string[] = [];
  const base = new Date();

  for (let index = days - 1; index >= 0; index -= 1) {
    const day = new Date(base);
    day.setDate(base.getDate() - index);
    output.push(day.toISOString().slice(0, 10));
  }

  return output;
}

function statusClass(status: AttendanceStatus | null) {
  if (status === "present") return "bg-primary-600";
  if (status === "late") return "bg-amber-500";
  if (status === "absent") return "bg-red-600";
  return "bg-gray-200";
}

export default function StudentProfilePage() {
  const params = useParams<{ id: string }>();
  const studentId = params?.id;

  const [schoolId, setSchoolId] = useState<string>("");
  const [student, setStudent] = useState<Student | null>(null);
  const [attendance, setAttendance] = useState<AttendanceEntry[]>([]);
  const [results, setResults] = useState<DisplayResult[]>([]);
  const [loading, setLoading] = useState(true);

  const loadStudentProfile = useCallback(async () => {
    if (!studentId) {
      setLoading(false);
      return;
    }

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
        setStudent(null);
        setAttendance([]);
        setResults([]);
        return;
      }

      setSchoolId(activeSchoolId);

      const { data: studentData, error: studentError } = await supabase
        .from("students")
        .select("id, school_id, full_name, level, parent_phone, created_at")
        .eq("id", studentId)
        .eq("school_id", activeSchoolId)
        .single();

      if (studentError) {
        throw studentError;
      }

      setStudent(studentData as Student);

      const [attendanceRes, resultsRes] = await Promise.all([
        supabase
          .from("attendance")
          .select("date, status")
          .eq("school_id", activeSchoolId)
          .eq("student_id", studentId)
          .order("date", { ascending: false }),
        supabase
          .from("exam_results")
          .select("id, exam_id, score, created_at")
          .eq("school_id", activeSchoolId)
          .eq("student_id", studentId)
          .order("created_at", { ascending: false }),
      ]);

      if (attendanceRes.error || resultsRes.error) {
        throw attendanceRes.error || resultsRes.error;
      }

      const attendanceRows = (attendanceRes.data as AttendanceEntry[]) ?? [];
      setAttendance(attendanceRows);

      const rawResults = (resultsRes.data as ExamResultEntry[]) ?? [];
      if (rawResults.length === 0) {
        setResults([]);
        return;
      }

      const examIds = Array.from(new Set(rawResults.map((row) => row.exam_id)));
      const { data: examsData, error: examsError } = await supabase
        .from("exams")
        .select("id, title, exam_date, max_score")
        .eq("school_id", activeSchoolId)
        .in("id", examIds);

      if (examsError) {
        throw examsError;
      }

      const examMap = new Map<string, ExamItem>();
      ((examsData as ExamItem[]) ?? []).forEach((exam) => examMap.set(exam.id, exam));

      const displayResults: DisplayResult[] = rawResults
        .map((row) => {
          const exam = examMap.get(row.exam_id);
          if (!exam) {
            return null;
          }

          return {
            id: row.id,
            examTitle: exam.title,
            examDate: exam.exam_date,
            maxScore: exam.max_score,
            score: row.score,
          };
        })
        .filter((item): item is DisplayResult => item !== null);

      setResults(displayResults);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "تعذر تحميل ملف الطالب.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    void loadStudentProfile();
  }, [loadStudentProfile]);

  const recentDays = useMemo(() => buildRecentDays(30), []);

  const attendanceByDate = useMemo(() => {
    const map = new Map<string, AttendanceStatus>();
    attendance.forEach((item) => {
      if (!map.has(item.date)) {
        map.set(item.date, item.status);
      }
    });
    return map;
  }, [attendance]);

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
        <p className="mb-6 text-gray-600">قم بإكمال الإعداد أولًا للوصول إلى ملفات الطلبة.</p>
        <Link
          href="/onboarding"
          className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-primary-600 px-5 py-2 text-white hover:bg-primary-700"
        >
          إكمال الإعداد
        </Link>
      </section>
    );
  }

  if (!student) {
    return (
      <section className="rounded-2xl bg-white p-8 text-center shadow-sm" dir="rtl">
        <h1 className="mb-3 text-2xl font-bold text-primary-700">لم يتم العثور على الطالب</h1>
        <p className="mb-6 text-gray-600">تأكد من الرابط أو عد إلى قائمة الطلبة.</p>
        <Link
          href="/dashboard/students"
          className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-primary-600 px-5 py-2 text-white hover:bg-primary-700"
        >
          العودة إلى الطلبة
        </Link>
      </section>
    );
  }

  return (
    <section dir="rtl" className="space-y-5">
      <header className="rounded-2xl bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-bold text-primary-700">الملف الدراسي للطالب</h1>
        <p className="mt-1 text-gray-600">متابعة الحضور والنتائج التفصيلية.</p>
      </header>

      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="text-xl font-bold text-gray-900">{student.full_name}</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 text-sm text-gray-600 md:grid-cols-3">
          <p>المستوى: {student.level}</p>
          <p>هاتف ولي الأمر: {student.parent_phone || "-"}</p>
          <p>تاريخ التسجيل: {formatDate(student.created_at)}</p>
        </div>
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-primary-700">تقويم الحضور (آخر 30 يوم)</h2>
          <Link href="/dashboard/attendance" className="text-sm font-semibold text-primary-700 hover:text-primary-800">
            تسجيل الحضور
          </Link>
        </div>

        <div className="mb-3 flex flex-wrap gap-3 text-xs text-gray-600">
          <span className="inline-flex items-center gap-2">
            <span className="h-3 w-3 rounded bg-primary-600" /> حاضر
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-3 w-3 rounded bg-amber-500" /> متأخر
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-3 w-3 rounded bg-red-600" /> غائب
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-3 w-3 rounded bg-gray-200" /> غير مسجل
          </span>
        </div>

        <div className="grid grid-cols-6 gap-2 sm:grid-cols-10 md:grid-cols-15">
          {recentDays.map((day) => {
            const status = attendanceByDate.get(day) ?? null;
            return (
              <div key={day} className="flex flex-col items-center gap-1">
                <div
                  className={`h-6 w-6 rounded ${statusClass(status)}`}
                  title={`${day} - ${
                    status === "present"
                      ? "حاضر"
                      : status === "late"
                        ? "متأخر"
                        : status === "absent"
                          ? "غائب"
                          : "غير مسجل"
                  }`}
                />
                <span className="text-[10px] text-gray-500">{day.slice(8, 10)}</span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-primary-700">النتائج الدراسية</h2>
          <Link href="/dashboard/results" className="text-sm font-semibold text-primary-700 hover:text-primary-800">
            إدارة النتائج
          </Link>
        </div>

        {results.length === 0 ? (
          <div className="rounded-xl border border-dashed border-primary-200 bg-primary-50/40 p-5 text-center">
            <p className="mb-4 text-gray-600">لا توجد نتائج مسجلة لهذا الطالب بعد.</p>
            <Link
              href="/dashboard/results"
              className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700"
            >
              إدخال النتائج
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-right">
              <thead className="bg-primary-50 text-primary-700">
                <tr>
                  <th className="px-4 py-3">الاختبار</th>
                  <th className="px-4 py-3">تاريخ الاختبار</th>
                  <th className="px-4 py-3">الدرجة</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result) => (
                  <tr key={result.id} className="border-t border-gray-100">
                    <td className="px-4 py-3 font-semibold text-gray-900">{result.examTitle}</td>
                    <td className="px-4 py-3 text-gray-700">{formatDate(result.examDate)}</td>
                    <td className="px-4 py-3 text-gray-700">
                      {result.score} / {result.maxScore}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  );
}
