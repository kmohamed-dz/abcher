"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import toast from "react-hot-toast";

import ExamModal from "@/components/ExamModal";
import ResultsModal from "@/components/ResultsModal";
import { createClient } from "@/lib/supabase/client";
import type { Student } from "@/lib/types";
import { formatDate } from "@/lib/utils";

const supabase = createClient();

export interface ExamItem {
  id: string;
  school_id: string;
  title: string;
  level: string;
  exam_date: string;
  max_score: number;
  created_at: string;
}

export default function ResultsPage() {
  const [schoolId, setSchoolId] = useState<string>("");
  const [exams, setExams] = useState<ExamItem[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  const [isExamModalOpen, setIsExamModalOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<ExamItem | null>(null);

  const [isResultsModalOpen, setIsResultsModalOpen] = useState(false);
  const [activeExam, setActiveExam] = useState<ExamItem | null>(null);

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
        .select("school_id")
        .eq("id", user.id)
        .single();

      if (profileError) {
        throw profileError;
      }

      const activeSchoolId = profile?.school_id;
      if (!activeSchoolId) {
        setSchoolId("");
        setExams([]);
        setStudents([]);
        return;
      }

      setSchoolId(activeSchoolId);

      const [examsRes, studentsRes] = await Promise.all([
        supabase
          .from("exams")
          .select("id, school_id, title, level, exam_date, max_score, created_at")
          .eq("school_id", activeSchoolId)
          .order("exam_date", { ascending: false }),
        supabase
          .from("students")
          .select("id, school_id, full_name, level, parent_phone, created_at")
          .eq("school_id", activeSchoolId)
          .order("full_name", { ascending: true }),
      ]);

      if (examsRes.error || studentsRes.error) {
        throw examsRes.error || studentsRes.error;
      }

      setExams((examsRes.data as ExamItem[]) ?? []);
      setStudents((studentsRes.data as Student[]) ?? []);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "تعذر تحميل بيانات النتائج.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const removeExam = async (exam: ExamItem) => {
    const confirmed = window.confirm(`هل أنت متأكد من حذف اختبار: ${exam.title}؟`);
    if (!confirmed) return;

    try {
      const { error } = await supabase.from("exams").delete().eq("id", exam.id).eq("school_id", schoolId);

      if (error) {
        throw error;
      }

      toast.success("تم حذف الاختبار.");
      await loadData();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "تعذر حذف الاختبار.";
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

  return (
    <section dir="rtl" className="space-y-5">
      <header className="flex flex-col gap-3 rounded-2xl bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary-700">الاختبارات والنتائج</h1>
          <p className="mt-1 text-gray-600">إنشاء اختبارات وإدخال درجات الطلبة بسهولة.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditingExam(null);
            setIsExamModalOpen(true);
          }}
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700"
        >
          <Plus className="h-4 w-4" />
          إنشاء اختبار
        </button>
      </header>

      {!schoolId ? (
        <section className="rounded-2xl bg-white p-8 text-center shadow-sm">
          <h2 className="mb-3 text-xl font-bold text-primary-700">لا توجد مدرسة مرتبطة بالحساب</h2>
          <p className="mb-5 text-gray-600">أكمل الإعداد لبدء إدارة الاختبارات.</p>
          <a
            href="/onboarding"
            className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-primary-600 px-5 py-2 text-white hover:bg-primary-700"
          >
            إكمال الإعداد
          </a>
        </section>
      ) : exams.length === 0 ? (
        <section className="rounded-2xl bg-white p-8 text-center shadow-sm">
          <p className="mb-4 text-gray-600">لا توجد اختبارات مسجلة حتى الآن.</p>
          <button
            type="button"
            onClick={() => {
              setEditingExam(null);
              setIsExamModalOpen(true);
            }}
            className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-primary-600 px-5 py-2 text-white hover:bg-primary-700"
          >
            إضافة أول اختبار
          </button>
        </section>
      ) : (
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {exams.map((exam) => (
            <article key={exam.id} className="rounded-2xl bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-start justify-between gap-2">
                <h3 className="text-lg font-bold text-gray-900">{exam.title}</h3>
                <span className="rounded-full bg-primary-100 px-3 py-1 text-xs font-semibold text-primary-700">{exam.level}</span>
              </div>

              <p className="text-sm text-gray-600">تاريخ الاختبار: {formatDate(exam.exam_date)}</p>
              <p className="mt-1 text-sm text-gray-600">الدرجة القصوى: {exam.max_score}</p>

              <div className="mt-4 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingExam(exam);
                    setIsExamModalOpen(true);
                  }}
                  className="min-h-[44px] rounded-lg bg-primary-600 px-3 py-2 text-sm text-white hover:bg-primary-700"
                >
                  تعديل
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveExam(exam);
                    setIsResultsModalOpen(true);
                  }}
                  className="min-h-[44px] rounded-lg bg-amber-500 px-3 py-2 text-sm text-white hover:bg-amber-600"
                >
                  إدخال الدرجات
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void removeExam(exam);
                  }}
                  className="min-h-[44px] rounded-lg bg-red-600 px-3 py-2 text-sm text-white hover:bg-red-700"
                >
                  حذف
                </button>
              </div>
            </article>
          ))}
        </section>
      )}

      <ExamModal
        isOpen={isExamModalOpen}
        onClose={() => setIsExamModalOpen(false)}
        onSuccess={() => {
          void loadData();
          setIsExamModalOpen(false);
        }}
        schoolId={schoolId}
        exam={editingExam}
      />

      {activeExam ? (
        <ResultsModal
          isOpen={isResultsModalOpen}
          onClose={() => setIsResultsModalOpen(false)}
          onSuccess={() => {
            void loadData();
            setIsResultsModalOpen(false);
          }}
          schoolId={schoolId}
          exam={activeExam}
          students={students}
        />
      ) : null}
    </section>
  );
}
