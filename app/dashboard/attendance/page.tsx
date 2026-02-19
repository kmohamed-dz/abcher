"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import { createClient } from "@/lib/supabase/client";
import type { Student, UserRole } from "@/lib/types";

interface ProfileContext {
  school_id: string | null;
  role: UserRole | null;
}

type AttendanceStatus = "present" | "absent" | "late" | "excused";

interface AttendanceRecord {
  student_id: string;
  status: AttendanceStatus;
}

const statusLabels: Record<AttendanceStatus, string> = {
  present: "حاضر",
  absent: "غائب",
  late: "متأخر",
  excused: "بعذر",
};

const supabase = createClient();

export default function AttendancePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [statusMap, setStatusMap] = useState<Record<string, AttendanceStatus>>({});

  const canSave = role === "school_admin" || role === "teacher";

  const loadAttendance = useCallback(async () => {
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
        .select("school_id, role")
        .eq("id", user.id)
        .single<ProfileContext>();

      if (profileError) {
        throw profileError;
      }

      setRole(profile?.role ?? null);

      if (!profile?.school_id) {
        setSchoolId(null);
        setStudents([]);
        setStatusMap({});
        return;
      }

      setSchoolId(profile.school_id);

      const [studentsRes, attendanceRes] = await Promise.all([
        supabase
          .from("students")
          .select("id,school_id,full_name,level,parent_phone,created_at")
          .eq("school_id", profile.school_id)
          .order("full_name", { ascending: true }),
        supabase
          .from("attendance")
          .select("student_id,status")
          .eq("school_id", profile.school_id)
          .eq("date", selectedDate),
      ]);

      if (studentsRes.error || attendanceRes.error) {
        throw studentsRes.error || attendanceRes.error;
      }

      const loadedStudents = (studentsRes.data as Student[]) ?? [];
      setStudents(loadedStudents);

      const map: Record<string, AttendanceStatus> = {};
      ((attendanceRes.data as AttendanceRecord[]) ?? []).forEach((record) => {
        map[record.student_id] = record.status;
      });

      loadedStudents.forEach((student) => {
        if (!map[student.id]) {
          map[student.id] = "present";
        }
      });

      setStatusMap(map);
    } catch (error) {
      const message = error instanceof Error ? error.message : "تعذر تحميل بيانات الحضور.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    void loadAttendance();
  }, [loadAttendance]);

  const summary = useMemo(() => {
    const counts = { present: 0, absent: 0, late: 0, excused: 0 };

    Object.values(statusMap).forEach((status) => {
      counts[status] += 1;
    });

    return counts;
  }, [statusMap]);

  const setStatus = (studentId: string, status: AttendanceStatus) => {
    setStatusMap((previous) => ({ ...previous, [studentId]: status }));
  };

  const saveAttendance = async () => {
    if (!schoolId) {
      toast.error("تعذر معرفة المدرسة الحالية.");
      return;
    }

    if (!canSave) {
      toast.error("ليس لديك صلاحية حفظ الحضور.");
      return;
    }

    setSaving(true);

    try {
      const payload = students.map((student) => ({
        school_id: schoolId,
        student_id: student.id,
        date: selectedDate,
        status: statusMap[student.id] ?? "present",
      }));

      const { error } = await supabase.from("attendance").upsert(payload, {
        onConflict: "student_id,date",
      });

      if (error) {
        throw error;
      }

      toast.success("تم حفظ الحضور بنجاح.");
      await loadAttendance();
    } catch (error) {
      const message = error instanceof Error ? error.message : "تعذر حفظ الحضور.";
      toast.error(message);
    } finally {
      setSaving(false);
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
        <p className="mb-6 text-gray-600">أكمل الإعداد حتى تتمكن من تسجيل الحضور.</p>
        <Link
          href="/onboarding"
          className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700"
        >
          إكمال الإعداد
        </Link>
      </section>
    );
  }

  if (students.length === 0) {
    return (
      <section dir="rtl" className="rounded-xl bg-white p-6 text-center shadow-md">
        <h1 className="mb-3 text-2xl font-bold text-primary-700">لا توجد قائمة طلبة</h1>
        <p className="mb-6 text-gray-600">أضف طلبة أولًا لتفعيل سجل الحضور.</p>
        <Link
          href="/dashboard/students"
          className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700"
        >
          إضافة طلبة
        </Link>
      </section>
    );
  }

  return (
    <section dir="rtl" className="space-y-5">
      <header className="rounded-xl bg-white p-6 shadow-md">
        <h1 className="text-2xl font-bold text-primary-700">سجل الحضور اليومي</h1>
        <p className="mt-2 text-gray-600">حدد تاريخًا ثم اختر حالة كل طالب.</p>
      </header>

      <section className="rounded-xl bg-white p-6 shadow-md">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div>
            <label htmlFor="attendance-date" className="mb-2 block text-sm font-semibold text-gray-700">
              التاريخ
            </label>
            <input
              id="attendance-date"
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-3 text-[16px] outline-none ring-primary-200 focus:ring"
            />
          </div>
          <div className="rounded-lg bg-primary-50 p-4 text-center">
            <p className="text-sm text-gray-600">حاضر</p>
            <p className="text-2xl font-bold text-primary-700">{summary.present}</p>
          </div>
          <div className="rounded-lg bg-red-50 p-4 text-center">
            <p className="text-sm text-gray-600">غائب</p>
            <p className="text-2xl font-bold text-red-600">{summary.absent}</p>
          </div>
          <div className="rounded-lg bg-amber-50 p-4 text-center">
            <p className="text-sm text-gray-600">متأخر/بعذر</p>
            <p className="text-2xl font-bold text-amber-600">{summary.late + summary.excused}</p>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl bg-white shadow-md">
        <div className="overflow-x-auto">
          <table className="min-w-full text-right">
            <thead className="bg-primary-50 text-sm text-primary-700">
              <tr>
                <th className="px-4 py-3">الطالب</th>
                <th className="px-4 py-3">المستوى</th>
                <th className="px-4 py-3">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => {
                const current = statusMap[student.id] ?? "present";

                return (
                  <tr key={student.id} className="border-t border-gray-100">
                    <td className="px-4 py-3 font-semibold text-gray-900">{student.full_name}</td>
                    <td className="px-4 py-3 text-gray-700">{student.level}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap justify-end gap-2">
                        {(["present", "absent", "late", "excused"] as AttendanceStatus[]).map((status) => (
                          <button
                            key={`${student.id}-${status}`}
                            type="button"
                            onClick={() => setStatus(student.id, status)}
                            className={`min-h-[44px] rounded-lg px-3 py-2 text-sm font-semibold ${
                              current === status
                                ? "bg-primary-600 text-white"
                                : "bg-primary-50 text-primary-700 hover:bg-primary-100"
                            }`}
                          >
                            {statusLabels[status]}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <div className="flex justify-end">
        <button
          type="button"
          disabled={!canSave || saving}
          onClick={() => {
            void saveAttendance();
          }}
          className="min-h-[44px] rounded-lg bg-primary-600 px-6 py-2 text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "جارٍ الحفظ..." : canSave ? "حفظ الحضور" : "قراءة فقط"}
        </button>
      </div>
    </section>
  );
}
