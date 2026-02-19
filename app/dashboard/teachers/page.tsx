"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import toast from "react-hot-toast";

import TeacherModal from "@/components/TeacherModal";
import { createClient } from "@/lib/supabase/client";
import type { Teacher } from "@/lib/types";

const supabase = createClient();

export default function TeachersPage() {
  const [schoolId, setSchoolId] = useState<string>("");
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);

  const fetchTeachers = useCallback(async () => {
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
        setTeachers([]);
        return;
      }

      setSchoolId(activeSchoolId);

      const { data, error } = await supabase
        .from("teachers")
        .select("id, school_id, full_name, specialization, phone, created_at")
        .eq("school_id", activeSchoolId)
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      setTeachers((data as Teacher[]) ?? []);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "تعذر تحميل بيانات المعلمين.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchTeachers();
  }, [fetchTeachers]);

  const filteredTeachers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return teachers;
    }

    return teachers.filter((teacher) => {
      return (
        teacher.full_name.toLowerCase().includes(query) ||
        teacher.specialization.toLowerCase().includes(query) ||
        (teacher.phone ?? "").toLowerCase().includes(query)
      );
    });
  }, [teachers, searchQuery]);

  const openCreateModal = () => {
    setSelectedTeacher(null);
    setIsModalOpen(true);
  };

  const openEditModal = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setIsModalOpen(true);
  };

  const handleDelete = async (teacher: Teacher) => {
    const confirmed = window.confirm(`هل أنت متأكد من حذف المعلم ${teacher.full_name}؟`);
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
      await fetchTeachers();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "تعذر حذف المعلم.";
      toast.error(message);
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
        <h1 className="mb-3 text-2xl font-bold text-primary-700">لا توجد مدرسة مرتبطة بالحساب</h1>
        <p className="mb-6 text-gray-600">أكمل إعداد المدرسة أولًا لتتمكن من إدارة المعلمين.</p>
        <a
          href="/onboarding"
          className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-primary-600 px-5 py-2 text-white hover:bg-primary-700"
        >
          الذهاب للإعداد
        </a>
      </section>
    );
  }

  return (
    <section dir="rtl" className="space-y-5">
      <header className="flex flex-col gap-3 rounded-2xl bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary-700">إدارة المعلمين</h1>
          <p className="mt-1 text-gray-600">إضافة وتحديث وحذف بيانات المعلمين داخل المدرسة.</p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700"
        >
          <Plus className="h-4 w-4" />
          إضافة معلم
        </button>
      </header>

      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <label className="mb-2 block text-sm font-semibold text-gray-700" htmlFor="teacher-search">
          البحث عن معلم
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            id="teacher-search"
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="ابحث بالاسم أو التخصص أو الهاتف"
            className="w-full rounded-lg border border-gray-200 py-3 pr-9 pl-3 text-[16px] outline-none ring-primary-200 transition focus:ring"
          />
        </div>
      </div>

      {filteredTeachers.length === 0 ? (
        <section className="rounded-2xl bg-white p-8 text-center shadow-sm">
          <p className="mb-4 text-gray-600">لا توجد بيانات معلمين مطابقة حاليًا.</p>
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-primary-600 px-5 py-2 text-white hover:bg-primary-700"
          >
            إضافة أول معلم
          </button>
        </section>
      ) : (
        <section className="overflow-x-auto rounded-2xl bg-white shadow-sm">
          <table className="min-w-full text-right">
            <thead className="bg-primary-50 text-sm text-primary-700">
              <tr>
                <th className="px-4 py-3">الاسم الكامل</th>
                <th className="px-4 py-3">التخصص</th>
                <th className="px-4 py-3">رقم الهاتف</th>
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
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(teacher)}
                        className="min-h-[44px] rounded-lg bg-primary-600 px-3 py-2 text-sm text-white hover:bg-primary-700"
                      >
                        تعديل
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(teacher)}
                        className="min-h-[44px] rounded-lg bg-red-600 px-3 py-2 text-sm text-white hover:bg-red-700"
                      >
                        حذف
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <TeacherModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          void fetchTeachers();
          setIsModalOpen(false);
        }}
        schoolId={schoolId}
        teacher={selectedTeacher}
      />
    </section>
  );
}
