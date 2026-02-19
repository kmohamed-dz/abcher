"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import toast from "react-hot-toast";

import { createClient } from "@/lib/supabase/client";
import { LEVELS } from "@/lib/utils";

const supabase = createClient();

interface ExamItem {
  id: string;
  school_id: string;
  title: string;
  level: string;
  exam_date: string;
  max_score: number;
}

interface ExamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  schoolId: string;
  exam: ExamItem | null;
}

interface ExamForm {
  title: string;
  level: string;
  exam_date: string;
  max_score: string;
}

const INITIAL_FORM: ExamForm = {
  title: "",
  level: LEVELS[0],
  exam_date: new Date().toISOString().slice(0, 10),
  max_score: "20",
};

export default function ExamModal({ isOpen, onClose, onSuccess, schoolId, exam }: ExamModalProps) {
  const [form, setForm] = useState<ExamForm>(INITIAL_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    if (exam) {
      setForm({
        title: exam.title,
        level: exam.level,
        exam_date: exam.exam_date,
        max_score: String(exam.max_score),
      });
      return;
    }

    setForm(INITIAL_FORM);
  }, [isOpen, exam]);

  if (!isOpen) {
    return null;
  }

  const closeOnOverlayClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  const setValue = (key: keyof ExamForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const saveExam = async () => {
    if (!form.title.trim()) {
      toast.error("يرجى كتابة عنوان الاختبار.");
      return;
    }

    if (!schoolId) {
      toast.error("لا يمكن الحفظ بدون معرف المدرسة.");
      return;
    }

    const maxScore = Number(form.max_score);
    if (!Number.isFinite(maxScore) || maxScore <= 0) {
      toast.error("يرجى إدخال درجة قصوى صحيحة.");
      return;
    }

    setSaving(true);

    try {
      if (exam) {
        const { error } = await supabase
          .from("exams")
          .update({
            title: form.title.trim(),
            level: form.level,
            exam_date: form.exam_date,
            max_score: maxScore,
          })
          .eq("id", exam.id)
          .eq("school_id", schoolId);

        if (error) throw error;
        toast.success("تم تحديث الاختبار.");
      } else {
        const { error } = await supabase.from("exams").insert([
          {
            school_id: schoolId,
            title: form.title.trim(),
            level: form.level,
            exam_date: form.exam_date,
            max_score: maxScore,
          },
        ]);

        if (error) throw error;
        toast.success("تم إنشاء الاختبار.");
      }

      onSuccess();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "تعذر حفظ الاختبار.";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={closeOnOverlayClick}
      role="presentation"
    >
      <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-bold text-primary-700">{exam ? "تعديل اختبار" : "إنشاء اختبار جديد"}</h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:bg-gray-100"
            aria-label="إغلاق"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700" htmlFor="exam-title">
              عنوان الاختبار
            </label>
            <input
              id="exam-title"
              value={form.title}
              onChange={(event) => setValue("title", event.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-3 text-[16px] outline-none ring-primary-200 transition focus:ring"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700" htmlFor="exam-level">
              المستوى الدراسي
            </label>
            <select
              id="exam-level"
              value={form.level}
              onChange={(event) => setValue("level", event.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-3 text-[16px] outline-none ring-primary-200 transition focus:ring"
            >
              {LEVELS.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700" htmlFor="exam-date">
                تاريخ الاختبار
              </label>
              <input
                id="exam-date"
                type="date"
                value={form.exam_date}
                onChange={(event) => setValue("exam_date", event.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-3 text-[16px] outline-none ring-primary-200 transition focus:ring"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700" htmlFor="max-score">
                الدرجة القصوى
              </label>
              <input
                id="max-score"
                type="number"
                min="1"
                value={form.max_score}
                onChange={(event) => setValue("max_score", event.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-3 text-[16px] outline-none ring-primary-200 transition focus:ring"
              />
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="min-h-[44px] rounded-lg border border-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={() => {
              void saveExam();
            }}
            disabled={saving}
            className="min-h-[44px] rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700 disabled:cursor-not-allowed"
          >
            {saving ? "جار الحفظ..." : "حفظ"}
          </button>
        </div>
      </div>
    </div>
  );
}
