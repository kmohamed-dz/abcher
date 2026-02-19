"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import toast from "react-hot-toast";

import ExamModal from "@/components/ExamModal";
import ResultsModal from "@/components/ResultsModal";
import { createClient } from "@/lib/supabase/client";
import type { Student, UserRole } from "@/lib/types";
import { formatDate } from "@/lib/utils";

interface ProfileContext {
  school_id: string | null;
  role: UserRole | null;
}

export interface ExamItem {
  id: string;
  school_id: string;
  title: string;
  exam_date: string;
  max_score: number;
  level: string;
  created_at: string;
}

const supabase = createClient();

export default function ResultsPage() {
  const [loading, setLoading] = useState(true);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [exams, setExams] = useState<ExamItem[]>([]);

  const [isExamModalOpen, setIsExamModalOpen] = useState(false);
  const [selectedExam, setSelectedExam] = useState<ExamItem | null>(null);

  const [isResultsModalOpen, setIsResultsModalOpen] = useState(false);
  const [activeExam, setActiveExam] = useState<ExamItem | null>(null);

  const canManage = role === "school_admin" || role === "teacher";

  const loadData = useCallback(async () => {
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
        setExams([]);
        setStudents([]);
        return;
      }

      setSchoolId(profile.school_id);

      const [examsRes, studentsRes] = await Promise.all([
        supabase
          .from("exams")
          .select("id,school_id,title,exam_date,max_score,level,created_at")
          .eq("school_id", profile.school_id)
          .order("exam_date", { ascending: false }),
        supabase
          .from("students")
          .select("id,school_id,full_name,level,parent_phone,created_at")
          .eq("school_id", profile.school_id)
          .order("full_name", { ascending: true }),
      ]);

      if (examsRes.error || studentsRes.error) {
        throw examsRes.error || studentsRes.error;
      }

      setExams((examsRes.data as ExamItem[]) ?? []);
      setStudents((studentsRes.data as Student[]) ?? []);
    } catch (error) {
      const message = error instanceof Error ? error.message : "تعذر تحميل النتائج.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const deleteExam = async (exam: ExamItem) => {
    if (!schoolId || !canManage) return;

    const confirmed = window.confirm(`هل تريد حذف الاختبار: ${exam.title}؟`);
    if (!confirmed) return;

    try {
      const { error } = await supabase.from("exams").delete().eq("id", exam.id).eq("school_id", schoolId);

      if (error) {
        throw error;
      }

      toast.success("تم حذف الاختبار.");
      await loadData();
    } catch (error) {
      const message = error instanceof Error ? error.message : "تعذر حذف الاختبار.";
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
        <h1 className="mb-3 text-2xl font-bold text-primary-700">لا توجد مدرسة مرتبطة</h1>
        <p className="mb-6 text-gray-600">أكمل الإعداد لإدارة الاختبارات والنتائج.</p>
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
            <h1 className="text-2xl font-bold text-primary-700">الاختبارات والنتائج</h1>
            <p className="mt-2 text-gray-600">إنشاء اختبارات وإدخال درجات الطلبة.</p>
          </div>
          {canManage ? (
            <button
              type="button"
              onClick={() => {
                setSelectedExam(null);
                setIsExamModalOpen(true);
              }}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700"
            >
              <Plus className="h-4 w-4" />
              اختبار جديد
            </button>
          ) : null}
        </div>
      </header>

      {exams.length === 0 ? (
        <section className="rounded-xl bg-white p-6 text-center shadow-md">
          <p className="mb-4 text-gray-600">لا توجد اختبارات مسجلة حاليًا.</p>
          {canManage ? (
            <button
              type="button"
              onClick={() => {
                setSelectedExam(null);
                setIsExamModalOpen(true);
              }}
              className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700"
            >
              إضافة أول اختبار
            </button>
          ) : null}
        </section>
      ) : (
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {exams.map((exam) => (
            <article key={exam.id} className="rounded-xl bg-white p-6 shadow-md">
              <div className="mb-2 flex items-start justify-between gap-2">
                <h2 className="text-lg font-bold text-gray-900">{exam.title}</h2>
                <span className="rounded-full bg-primary-100 px-3 py-1 text-xs font-semibold text-primary-700">
                  {exam.level}
                </span>
              </div>

              <p className="text-sm text-gray-600">تاريخ الاختبار: {formatDate(exam.exam_date)}</p>
              <p className="mt-1 text-sm text-gray-600">الدرجة القصوى: {exam.max_score}</p>

              {canManage ? (
                <div className="mt-4 flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedExam(exam);
                      setIsExamModalOpen(true);
                    }}
                    className="min-h-[44px] rounded-lg bg-yellow-500 px-3 py-2 text-sm text-white"
                  >
                    تعديل
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveExam(exam);
                      setIsResultsModalOpen(true);
                    }}
                    className="min-h-[44px] rounded-lg bg-primary-600 px-3 py-2 text-sm text-white hover:bg-primary-700"
                  >
                    إدخال الدرجات
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void deleteExam(exam);
                    }}
                    className="min-h-[44px] rounded-lg bg-red-600 px-3 py-2 text-sm text-white"
                  >
                    حذف
                  </button>
                </div>
              ) : (
                <p className="mt-4 text-sm text-gray-500">عرض فقط</p>
              )}
            </article>
          ))}
        </section>
      )}

      <ExamModal
        isOpen={isExamModalOpen}
        onClose={() => setIsExamModalOpen(false)}
        onSuccess={() => {
          setIsExamModalOpen(false);
          void loadData();
        }}
        schoolId={schoolId}
        exam={selectedExam}
      />

      {activeExam ? (
        <ResultsModal
          isOpen={isResultsModalOpen}
          onClose={() => setIsResultsModalOpen(false)}
          onSuccess={() => {
            setIsResultsModalOpen(false);
            void loadData();
          }}
          schoolId={schoolId}
          exam={activeExam}
          students={students}
          canManage={canManage}
        />
      ) : null}
    </section>
  );
}
