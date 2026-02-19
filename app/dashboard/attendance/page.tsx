"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";

import { createClient } from "@/lib/supabase/client";
import type { Student } from "@/lib/types";

const supabase = createClient();

type AttendanceStatus = "present" | "absent" | "late";

interface AttendanceRow {
  student_id: string;
  status: AttendanceStatus;
}

const STATUS_LABELS: Record<AttendanceStatus, string> = {
  present: "حاضر",
  absent: "غائب",
  late: "متأخر",
};

export default function AttendancePage() {
  const [schoolId, setSchoolId] = useState<string>("");
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [statuses, setStatuses] = useState<Record<string, AttendanceStatus>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchAttendance = useCallback(async () => {
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
        setStudents([]);
        setStatuses({});
        return;
      }

      setSchoolId(activeSchoolId);

      const [studentsRes, attendanceRes] = await Promise.all([
        supabase
          .from("students")
          .select("id, school_id, full_name, level, parent_phone, created_at")
          .eq("school_id", activeSchoolId)
          .order("full_name", { ascending: true }),
        supabase
          .from("attendance")
          .select("student_id, status")
          .eq("school_id", activeSchoolId)
          .eq("date", selectedDate),
      ]);

      if (studentsRes.error || attendanceRes.error) {
        throw studentsRes.error || attendanceRes.error;
      }

      const studentList = (studentsRes.data as Student[]) ?? [];
      setStudents(studentList);

      const statusMap: Record<string, AttendanceStatus> = {};
      ((attendanceRes.data as AttendanceRow[]) ?? []).forEach((row) => {
        statusMap[row.student_id] = row.status;
      });
      setStatuses(statusMap);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "تعذر تحميل بيانات الحضور.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    void fetchAttendance();
  }, [fetchAttendance]);

  const setStatus = (studentId: string, status: AttendanceStatus) => {
    setStatuses((prev) => ({ ...prev, [studentId]: status }));
  };

  const saveAttendance = async () => {
    if (!schoolId) {
      toast.error("يرجى ربط المدرسة أولًا.");
      return;
    }

    if (students.length === 0) {
      toast.error("لا توجد بيانات طلبة لحفظ الحضور.");
      return;
    }

    setSaving(true);

    try {
      const payload = students.map((student) => ({
        school_id: schoolId,
        student_id: student.id,
        date: selectedDate,
        status: statuses[student.id] ?? "present",
      }));

      const { error } = await supabase
        .from("attendance")
        .upsert(payload, { onConflict: "student_id,date" });

      if (error) {
        throw error;
      }

      toast.success("تم حفظ حضور الطلبة بنجاح.");
      await fetchAttendance();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "تعذر حفظ الحضور.";
      toast.error(message);
    } finally {
      setSaving(false);
    }
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
        <h1 className="mb-3 text-2xl font-bold text-primary-700">لا يمكن إدارة الحضور بدون مدرسة</h1>
        <p className="mb-6 text-gray-600">قم بإكمال إعداد المدرسة ثم عد لهذه الصفحة.</p>
        <Link
          href="/onboarding"
          className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-primary-600 px-5 py-2 text-white hover:bg-primary-700"
        >
          إكمال الإعداد
        </Link>
      </section>
    );
  }

  if (students.length === 0) {
    return (
      <section className="rounded-2xl bg-white p-8 text-center shadow-sm" dir="rtl">
        <h1 className="mb-3 text-2xl font-bold text-primary-700">لا توجد قائمة طلبة</h1>
        <p className="mb-6 text-gray-600">أضف الطلبة أولًا حتى تتمكن من تسجيل الحضور.</p>
        <Link
          href="/dashboard/students"
          className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-primary-600 px-5 py-2 text-white hover:bg-primary-700"
        >
          إضافة الطلبة
        </Link>
      </section>
    );
  }

  return (
    <section dir="rtl" className="space-y-5">
      <header className="rounded-2xl bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-bold text-primary-700">سجل الحضور اليومي</h1>
        <p className="mt-1 text-gray-600">حدد التاريخ وسجّل حالة كل طالب بسرعة.</p>
      </header>

      <section className="rounded-2xl bg-white p-4 shadow-sm">
        <label htmlFor="attendance-date" className="mb-2 block text-sm font-semibold text-gray-700">
          تاريخ الحضور
        </label>
        <input
          id="attendance-date"
          type="date"
          value={selectedDate}
          onChange={(event) => setSelectedDate(event.target.value)}
          className="w-full rounded-lg border border-gray-200 px-3 py-3 text-[16px] outline-none ring-primary-200 transition focus:ring md:max-w-xs"
        />
      </section>

      <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-right">
            <thead className="bg-primary-50 text-primary-700">
              <tr>
                <th className="px-4 py-3">الطالب</th>
                <th className="px-4 py-3">المستوى</th>
                <th className="px-4 py-3">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => {
                const currentStatus = statuses[student.id] ?? "present";

                return (
                  <tr key={student.id} className="border-t border-gray-100">
                    <td className="px-4 py-3 font-semibold text-gray-900">{student.full_name}</td>
                    <td className="px-4 py-3 text-gray-700">{student.level}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap justify-end gap-2">
                        {(["present", "absent", "late"] as AttendanceStatus[]).map((status) => {
                          const active = currentStatus === status;

                          return (
                            <button
                              key={`${student.id}-${status}`}
                              type="button"
                              onClick={() => setStatus(student.id, status)}
                              className={`min-h-[44px] rounded-lg px-3 py-2 text-sm font-semibold transition ${
                                active
                                  ? "bg-primary-600 text-white"
                                  : "bg-primary-50 text-primary-700 hover:bg-primary-100"
                              }`}
                            >
                              {STATUS_LABELS[status]}
                            </button>
                          );
                        })}
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
          onClick={() => {
            void saveAttendance();
          }}
          disabled={saving}
          className="min-h-[44px] rounded-lg bg-primary-600 px-6 py-2 font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed"
        >
          {saving ? "جار الحفظ..." : "حفظ الحضور"}
        </button>
      </div>
    </section>
  );
}
