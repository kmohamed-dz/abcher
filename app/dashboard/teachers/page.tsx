"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import toast from "react-hot-toast";

import TeacherModal from "@/components/TeacherModal";
import { createClient } from "@/lib/supabase/client";
import type { Teacher, UserRole } from "@/lib/types";

interface ProfileContext {
  school_id: string | null;
  role: UserRole | null;
}

const supabase = createClient();

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);

  const canManage = role === "school_admin" || role === "teacher";

  const loadTeachers = useCallback(async () => {
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
        setTeachers([]);
        return;
      }

      setSchoolId(profile.school_id);

      const { data, error } = await supabase
        .from("teachers")
        .select("id,school_id,full_name,specialization,phone,created_at")
        .eq("school_id", profile.school_id)
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      setTeachers((data as Teacher[]) ?? []);
    } catch (error) {
      const message = error instanceof Error ? error.message : "تعذر تحميل المعلمين.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTeachers();
  }, [loadTeachers]);

  const filteredTeachers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return teachers;

    return teachers.filter((teacher) => {
      return (
        teacher.full_name.toLowerCase().includes(normalized) ||
        teacher.specialization.toLowerCase().includes(normalized) ||
        (teacher.phone ?? "").toLowerCase().includes(normalized)
      );
    });
  }, [query, teachers]);

  const handleDelete = async (teacher: Teacher) => {
    if (!schoolId || !canManage) return;

    const confirmed = window.confirm(`هل تريد حذف المعلم ${teacher.full_name}؟`);
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from("teachers")
        .delete()
        .eq("id", teacher.id)
        .eq("school_id", schoolId);

      if (error) {
        throw error;
      }

      toast.success("تم حذف المعلم بنجاح.");
      await loadTeachers();
    } catch (error) {
      const message = error instanceof Error ? error.message : "تعذر حذف المعلم.";
      toast.error(message);
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
        <h1 className="mb-3 text-2xl font-bold text-primary-700">لم يتم ربط الحساب بمدرسة</h1>
        <p className="mb-6 text-gray-600">أكمل إعداد المدرسة لإدارة قائمة المعلمين.</p>
        <a
          href="/onboarding"
          className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700"
        >
          إكمال الإعداد
        </a>
      </section>
    );
  }

  return (
    <section dir="rtl" className="space-y-5">
      <header className="rounded-xl bg-white p-6 shadow-md">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-primary-700">إدارة المعلمين</h1>
            <p className="mt-2 text-gray-600">إضافة وتعديل وحذف بيانات المعلمين.</p>
          </div>
          {canManage ? (
            <button
              type="button"
              onClick={() => {
                setSelectedTeacher(null);
                setIsModalOpen(true);
              }}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700"
            >
              <Plus className="h-4 w-4" />
              إضافة معلم
            </button>
          ) : null}
        </div>
      </header>

      <section className="rounded-xl bg-white p-6 shadow-md">
        <label htmlFor="teacher-search" className="mb-2 block text-sm font-semibold text-gray-700">
          البحث
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            id="teacher-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ابحث بالاسم أو التخصص أو الهاتف"
            className="w-full rounded-lg border border-gray-200 py-3 pr-10 pl-3 text-[16px] outline-none ring-primary-200 focus:ring"
          />
        </div>
      </section>

      {filteredTeachers.length === 0 ? (
        <section className="rounded-xl bg-white p-6 text-center shadow-md">
          <p className="mb-4 text-gray-600">لا توجد بيانات معلمين مطابقة.</p>
          {canManage ? (
            <button
              type="button"
              onClick={() => {
                setSelectedTeacher(null);
                setIsModalOpen(true);
              }}
              className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700"
            >
              إضافة أول معلم
            </button>
          ) : null}
        </section>
      ) : (
        <section className="overflow-hidden rounded-xl bg-white shadow-md">
          <div className="overflow-x-auto">
            <table className="min-w-full text-right">
              <thead className="bg-primary-50 text-sm text-primary-700">
                <tr>
                  <th className="px-4 py-3">الاسم</th>
                  <th className="px-4 py-3">التخصص</th>
                  <th className="px-4 py-3">الهاتف</th>
                  <th className="px-4 py-3">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredTeachers.map((teacher) => (
                  <tr key={teacher.id} className="border-t border-gray-100">
                    <td className="px-4 py-3 font-semibold text-gray-900">{teacher.full_name}</td>
                    <td className="px-4 py-3 text-gray-700">{teacher.specialization}</td>
                    <td className="px-4 py-3 text-gray-700">{teacher.phone || "-"}</td>
                    <td className="px-4 py-3">
                      {canManage ? (
                        <div className="flex flex-wrap justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTeacher(teacher);
                              setIsModalOpen(true);
                            }}
                            className="min-h-[44px] rounded-lg bg-yellow-500 px-3 py-2 text-sm text-white"
                          >
                            تعديل
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              void handleDelete(teacher);
                            }}
                            className="min-h-[44px] rounded-lg bg-red-600 px-3 py-2 text-sm text-white"
                          >
                            حذف
                          </button>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">قراءة فقط</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <TeacherModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          setIsModalOpen(false);
          void loadTeachers();
        }}
        schoolId={schoolId}
        teacher={selectedTeacher}
      />
    </section>
  );
}
