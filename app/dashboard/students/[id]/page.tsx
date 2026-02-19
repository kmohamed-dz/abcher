"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import toast from "react-hot-toast";

import { createClient } from "@/lib/supabase/client";
import type { Student, UserRole } from "@/lib/types";
import { formatDate } from "@/lib/utils";

interface ProfileContext {
  school_id: string | null;
  role: UserRole | null;
  full_name: string | null;
}

interface AttendanceRecord {
  date: string;
  status: "present" | "absent" | "late" | "excused";
}

interface HomeworkSubmission {
  homework_id: string;
  completed: boolean;
}

interface ExamResultItem {
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

interface TeacherNote {
  id: string;
  note: string;
  created_at: string;
  teacher_name: string;
}

const supabase = createClient();

function daysInCurrentMonth() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const total = new Date(year, month + 1, 0).getDate();

  return Array.from({ length: total }, (_, index) => {
    const date = new Date(year, month, index + 1);
    return date.toISOString().slice(0, 10);
  });
}

function statusColor(status: AttendanceRecord["status"] | undefined) {
  if (status === "present") return "#16a34a";
  if (status === "late") return "#f59e0b";
  if (status === "excused") return "#0891b2";
  if (status === "absent") return "#dc2626";
  return "#e5e7eb";
}

export default function StudentProfilePage() {
  const params = useParams<{ id: string }>();
  const studentId = params?.id;

  const [loading, setLoading] = useState(true);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [currentUserName, setCurrentUserName] = useState("المعلم");
  const [student, setStudent] = useState<Student | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [results, setResults] = useState<Array<{ exam_title: string; exam_date: string; score: number; max_score: number }>>([]);
  const [completionRate, setCompletionRate] = useState(0);
  const [notes, setNotes] = useState<TeacherNote[]>([]);
  const [newNote, setNewNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  const canWriteNotes = role === "school_admin" || role === "teacher";

  const loadData = useCallback(async () => {
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
        .select("school_id, role, full_name")
        .eq("id", user.id)
        .single<ProfileContext>();

      if (profileError) {
        throw profileError;
      }

      setRole(profile?.role ?? null);
      setCurrentUserName(profile?.full_name || "المعلم");

      if (!profile?.school_id) {
        setSchoolId(null);
        setStudent(null);
        return;
      }

      setSchoolId(profile.school_id);

      const { data: studentData, error: studentError } = await supabase
        .from("students")
        .select("id,school_id,full_name,level,parent_phone,created_at")
        .eq("id", studentId)
        .eq("school_id", profile.school_id)
        .single<Student>();

      if (studentError) {
        throw studentError;
      }

      setStudent(studentData);

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

      const [attendanceRes, homeworkRes, submissionsRes, notesRes, resultsRes] = await Promise.all([
        supabase
          .from("attendance")
          .select("date,status")
          .eq("school_id", profile.school_id)
          .eq("student_id", studentId)
          .gte("date", monthStart)
          .lte("date", monthEnd),
        supabase
          .from("homework")
          .select("id")
          .eq("school_id", profile.school_id)
          .eq("level", studentData.level),
        supabase
          .from("homework_submissions")
          .select("homework_id,completed")
          .eq("school_id", profile.school_id)
          .eq("student_id", studentId),
        supabase
          .from("teacher_notes")
          .select("id,note,created_at,teacher_name")
          .eq("school_id", profile.school_id)
          .eq("student_id", studentId)
          .order("created_at", { ascending: false }),
        supabase
          .from("results")
          .select("id,exam_id,score,created_at")
          .eq("school_id", profile.school_id)
          .eq("student_id", studentId)
          .order("created_at", { ascending: false }),
      ]);

      if (attendanceRes.error || homeworkRes.error || submissionsRes.error || notesRes.error || resultsRes.error) {
        throw attendanceRes.error || homeworkRes.error || submissionsRes.error || notesRes.error || resultsRes.error;
      }

      const attendanceRows = (attendanceRes.data as AttendanceRecord[]) ?? [];
      setAttendance(attendanceRows);

      const allHomework = (homeworkRes.data as Array<{ id: string }>) ?? [];
      const doneSubmissions = ((submissionsRes.data as HomeworkSubmission[]) ?? []).filter((item) => item.completed);
      const rate = allHomework.length === 0 ? 0 : Math.round((doneSubmissions.length / allHomework.length) * 100);
      setCompletionRate(rate);

      setNotes((notesRes.data as TeacherNote[]) ?? []);

      const rawResults = (resultsRes.data as ExamResultItem[]) ?? [];

      if (rawResults.length > 0) {
        const examIds = Array.from(new Set(rawResults.map((row) => row.exam_id)));
        const { data: examsData, error: examsError } = await supabase
          .from("exams")
          .select("id,title,exam_date,max_score")
          .eq("school_id", profile.school_id)
          .in("id", examIds);

        if (examsError) {
          throw examsError;
        }

        const examMap = new Map<string, ExamItem>();
        ((examsData as ExamItem[]) ?? []).forEach((exam) => {
          examMap.set(exam.id, exam);
        });

        const merged = rawResults
          .map((entry) => {
            const exam = examMap.get(entry.exam_id);
            if (!exam) return null;
            return {
              exam_title: exam.title,
              exam_date: exam.exam_date,
              score: entry.score,
              max_score: exam.max_score,
            };
          })
          .filter((item): item is { exam_title: string; exam_date: string; score: number; max_score: number } => item !== null);

        setResults(merged);
      } else {
        setResults([]);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "تعذر تحميل ملف الطالب.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const monthDays = useMemo(() => daysInCurrentMonth(), []);
  const attendanceByDate = useMemo(() => {
    const map = new Map<string, AttendanceRecord["status"]>();
    attendance.forEach((item) => map.set(item.date, item.status));
    return map;
  }, [attendance]);

  const addNote = async () => {
    if (!schoolId || !studentId || !canWriteNotes) {
      toast.error("ليس لديك صلاحية إضافة ملاحظة.");
      return;
    }

    if (!newNote.trim()) {
      toast.error("اكتب ملاحظة قبل الحفظ.");
      return;
    }

    setSavingNote(true);

    try {
      const { error } = await supabase.from("teacher_notes").insert([
        {
          school_id: schoolId,
          student_id: studentId,
          note: newNote.trim(),
          teacher_name: currentUserName,
        },
      ]);

      if (error) {
        throw error;
      }

      toast.success("تم حفظ الملاحظة.");
      setNewNote("");
      await loadData();
    } catch (error) {
      const message = error instanceof Error ? error.message : "تعذر حفظ الملاحظة.";
      toast.error(message);
    } finally {
      setSavingNote(false);
    }
  };

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
        <p className="mb-6 text-gray-600">أكمل الإعداد للوصول إلى ملفات الطلبة.</p>
        <Link
          href="/onboarding"
          className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700"
        >
          إكمال الإعداد
        </Link>
      </section>
    );
  }

  if (!student) {
    return (
      <section dir="rtl" className="rounded-xl bg-white p-6 text-center shadow-md">
        <h1 className="mb-3 text-2xl font-bold text-primary-700">لم يتم العثور على الطالب</h1>
        <p className="mb-6 text-gray-600">تحقق من الرابط أو عد إلى قائمة الطلبة.</p>
        <Link
          href="/dashboard/students"
          className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700"
        >
          العودة إلى الطلبة
        </Link>
      </section>
    );
  }

  return (
    <section dir="rtl" className="space-y-5">
      <header className="rounded-xl bg-white p-6 shadow-md">
        <h1 className="text-2xl font-bold text-primary-700">ملف الطالب</h1>
        <p className="mt-2 text-gray-600">متابعة الحضور والواجبات والنتائج والملاحظات.</p>
      </header>

      <section className="rounded-xl bg-white p-6 shadow-md">
        <h2 className="text-xl font-bold text-gray-900">{student.full_name}</h2>
        <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-gray-600 md:grid-cols-3">
          <p>المستوى: {student.level}</p>
          <p>هاتف ولي الأمر: {student.parent_phone || "-"}</p>
          <p>تاريخ التسجيل: {formatDate(student.created_at)}</p>
        </div>
      </section>

      <section className="rounded-xl bg-white p-6 shadow-md">
        <h2 className="mb-3 text-lg font-bold text-primary-700">خريطة الحضور الشهرية</h2>

        <div className="mb-3 flex flex-wrap gap-3 text-xs text-gray-600">
          <span className="inline-flex items-center gap-2">
            <span className="h-3 w-3 rounded" style={{ backgroundColor: "#16a34a" }} /> حاضر
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-3 w-3 rounded" style={{ backgroundColor: "#f59e0b" }} /> متأخر
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-3 w-3 rounded" style={{ backgroundColor: "#0891b2" }} /> بعذر
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-3 w-3 rounded" style={{ backgroundColor: "#dc2626" }} /> غائب
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-3 w-3 rounded" style={{ backgroundColor: "#e5e7eb" }} /> غير مسجل
          </span>
        </div>

        <div className="grid grid-cols-7 gap-2 md:grid-cols-10 lg:grid-cols-14">
          {monthDays.map((day) => {
            const status = attendanceByDate.get(day);
            return (
              <div key={day} className="flex flex-col items-center gap-1">
                <div className="h-6 w-6 rounded" style={{ backgroundColor: statusColor(status) }} title={day} />
                <span className="text-[10px] text-gray-500">{day.slice(8, 10)}</span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <article className="rounded-xl bg-white p-6 shadow-md">
          <h2 className="mb-3 text-lg font-bold text-primary-700">معدل إنجاز الواجبات</h2>
          <p className="text-4xl font-extrabold text-primary-700">{completionRate}%</p>
          <p className="mt-2 text-sm text-gray-600">نسبة الواجبات المكتملة مقارنة بالواجبات المخصصة للمستوى.</p>
        </article>

        <article className="rounded-xl bg-white p-6 shadow-md">
          <h2 className="mb-3 text-lg font-bold text-primary-700">سجل النتائج</h2>

          {results.length === 0 ? (
            <div className="rounded-lg border border-dashed border-primary-200 bg-primary-50 p-4 text-center">
              <p className="mb-3 text-sm text-gray-600">لا توجد نتائج مسجلة بعد.</p>
              <Link
                href="/dashboard/results"
                className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700"
              >
                إدارة النتائج
              </Link>
            </div>
          ) : (
            <ul className="space-y-2">
              {results.map((result, index) => (
                <li key={`${result.exam_title}-${index}`} className="rounded-lg bg-beige-50 p-3">
                  <p className="font-semibold text-gray-900">{result.exam_title}</p>
                  <p className="text-sm text-gray-600">التاريخ: {formatDate(result.exam_date)}</p>
                  <p className="text-sm text-primary-700">
                    الدرجة: {result.score} / {result.max_score}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>

      <section className="rounded-xl bg-white p-6 shadow-md">
        <h2 className="mb-3 text-lg font-bold text-primary-700">ملاحظات المعلمين</h2>

        {canWriteNotes ? (
          <div className="mb-4 space-y-2">
            <textarea
              value={newNote}
              onChange={(event) => setNewNote(event.target.value)}
              rows={3}
              className="w-full rounded-lg border border-gray-200 px-3 py-3 text-[16px] outline-none ring-primary-200 focus:ring"
              placeholder="أضف ملاحظة تربوية عن الطالب"
            />
            <div className="flex justify-end">
              <button
                type="button"
                disabled={savingNote}
                onClick={() => {
                  void addNote();
                }}
                className="min-h-[44px] rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700 disabled:opacity-60"
              >
                {savingNote ? "جارٍ الحفظ..." : "حفظ الملاحظة"}
              </button>
            </div>
          </div>
        ) : null}

        {notes.length === 0 ? (
          <div className="rounded-lg border border-dashed border-primary-200 bg-primary-50 p-4 text-center text-sm text-gray-600">
            لا توجد ملاحظات مسجلة.
          </div>
        ) : (
          <ul className="space-y-2">
            {notes.map((note) => (
              <li key={note.id} className="rounded-lg bg-beige-50 p-3">
                <p className="text-gray-800">{note.note}</p>
                <p className="mt-1 text-xs text-gray-500">
                  {note.teacher_name} - {formatDate(note.created_at)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}
