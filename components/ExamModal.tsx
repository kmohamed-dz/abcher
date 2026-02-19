"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import toast from "react-hot-toast";

import { createClient } from "@/lib/supabase/client";
import { LEVELS } from "@/lib/utils";

interface ExamItem {
  id: string;
  school_id: string;
  title: string;
  exam_date: string;
  max_score: number;
  level: string;
}

interface ExamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  schoolId: string | null;
  exam: ExamItem | null;
}

interface ExamForm {
  title: string;
  exam_date: string;
  max_score: string;
  level: string;
}

interface ExamErrors {
  title?: string;
  exam_date?: string;
  max_score?: string;
}

const supabase = createClient();

const INITIAL_FORM: ExamForm = {
  title: "",
  exam_date: new Date().toISOString().slice(0, 10),
  max_score: "20",
  level: LEVELS[0],
};

export default function ExamModal({ isOpen, onClose, onSuccess, schoolId, exam }: ExamModalProps) {
  const [form, setForm] = useState<ExamForm>(INITIAL_FORM);
  const [errors, setErrors] = useState<ExamErrors>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    if (exam) {
      setForm({
        title: exam.title,
        exam_date: exam.exam_date,
        max_score: String(exam.max_score),
        level: exam.level,
      });
    } else {
      setForm(INITIAL_FORM);
    }

    setErrors({});
  }, [isOpen, exam]);

  if (!isOpen) {
    return null;
  }

  const onOverlayClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  const validate = () => {
    const nextErrors: ExamErrors = {};

    if (!form.title.trim()) {
      nextErrors.title = "عنوان الاختبار مطلوب.";
    }

    if (!form.exam_date) {
      nextErrors.exam_date = "تاريخ الاختبار مطلوب.";
    }

    const maxScore = Number(form.max_score);
    if (!Number.isFinite(maxScore) || maxScore <= 0) {
      nextErrors.max_score = "الدرجة القصوى يجب أن تكون رقمًا أكبر من صفر.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const saveExam = async () => {
    if (!validate()) {
      toast.error("تحقق من بيانات الاختبار.");
      return;
    }

    if (!schoolId) {
      toast.error("تعذر معرفة المدرسة الحالية.");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        title: form.title.trim(),
        exam_date: form.exam_date,
        max_score: Number(form.max_score),
        level: form.level,
      };

      if (exam) {
        const { error } = await supabase
          .from("exams")
          .update(payload)
          .eq("id", exam.id)
          .eq("school_id", schoolId);

        if (error) {
          throw error;
        }

        toast.success("تم تعديل الاختبار.");
      } else {
        const { error } = await supabase.from("exams").insert([
          {
            school_id: schoolId,
            ...payload,
          },
        ]);

        if (error) {
          throw error;
        }

        toast.success("تمت إضافة الاختبار.");
      }

      onSuccess();
    } catch (error) {
      const message = error instanceof Error ? error.message : "تعذر حفظ الاختبار.";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      dir="rtl"
      role="presentation"
      onClick={onOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <div className="w-full max-w-xl rounded-xl bg-white p-6 shadow-md">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-primary-700">{exam ? "تعديل اختبار" : "إضافة اختبار"}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-600 hover:bg-gray-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="exam-title" className="mb-1 block text-sm font-semibold text-gray-700">
              عنوان الاختبار
            </label>
            <input
              id="exam-title"
              value={form.title}
              onChange={(event) => setForm((previous) => ({ ...previous, title: event.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-3 text-[16px] outline-none ring-primary-200 focus:ring"
            />
            {errors.title ? <p className="mt-1 text-sm text-red-600">{errors.title}</p> : null}
          </div>

          <div>
            <label htmlFor="exam-level" className="mb-1 block text-sm font-semibold text-gray-700">
              المستوى
            </label>
            <select
              id="exam-level"
              value={form.level}
              onChange={(event) => setForm((previous) => ({ ...previous, level: event.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-3 text-[16px] outline-none ring-primary-200 focus:ring"
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
              <label htmlFor="exam-date" className="mb-1 block text-sm font-semibold text-gray-700">
                تاريخ الاختبار
              </label>
              <input
                id="exam-date"
                type="date"
                value={form.exam_date}
                onChange={(event) => setForm((previous) => ({ ...previous, exam_date: event.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-3 text-[16px] outline-none ring-primary-200 focus:ring"
              />
              {errors.exam_date ? <p className="mt-1 text-sm text-red-600">{errors.exam_date}</p> : null}
            </div>

            <div>
              <label htmlFor="exam-max-score" className="mb-1 block text-sm font-semibold text-gray-700">
                الدرجة القصوى
              </label>
              <input
                id="exam-max-score"
                type="number"
                min="1"
                value={form.max_score}
                onChange={(event) => setForm((previous) => ({ ...previous, max_score: event.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-3 text-[16px] outline-none ring-primary-200 focus:ring"
              />
              {errors.max_score ? <p className="mt-1 text-sm text-red-600">{errors.max_score}</p> : null}
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] rounded-lg border border-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-100"
          >
            إلغاء
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => {
              void saveExam();
            }}
            className="min-h-[44px] rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700 disabled:opacity-60"
          >
            {saving ? "جارٍ الحفظ..." : "حفظ"}
          </button>
        </div>
      </div>
    </div>
  );
}
