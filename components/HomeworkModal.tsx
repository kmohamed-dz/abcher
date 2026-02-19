"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import toast from "react-hot-toast";

import { createClient } from "@/lib/supabase/client";
import { LEVELS } from "@/lib/utils";

const supabase = createClient();

interface HomeworkItem {
  id: string;
  school_id: string;
  title: string;
  level: string;
  details: string | null;
  due_date: string | null;
}

interface HomeworkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  schoolId: string;
  homework: HomeworkItem | null;
}

interface HomeworkForm {
  title: string;
  level: string;
  details: string;
  due_date: string;
}

const INITIAL_FORM: HomeworkForm = {
  title: "",
  level: LEVELS[0],
  details: "",
  due_date: "",
};

export default function HomeworkModal({
  isOpen,
  onClose,
  onSuccess,
  schoolId,
  homework,
}: HomeworkModalProps) {
  const [form, setForm] = useState<HomeworkForm>(INITIAL_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    if (homework) {
      setForm({
        title: homework.title,
        level: homework.level,
        details: homework.details ?? "",
        due_date: homework.due_date ?? "",
      });
      return;
    }

    setForm(INITIAL_FORM);
  }, [isOpen, homework]);

  if (!isOpen) {
    return null;
  }

  const closeOnOverlayClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  const setValue = (key: keyof HomeworkForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const saveHomework = async () => {
    if (!form.title.trim()) {
      toast.error("يرجى كتابة عنوان الواجب.");
      return;
    }

    if (!schoolId) {
      toast.error("لا يمكن الحفظ بدون معرف المدرسة.");
      return;
    }

    setSaving(true);

    try {
      if (homework) {
        const { error } = await supabase
          .from("homework")
          .update({
            title: form.title.trim(),
            level: form.level,
            details: form.details.trim() || null,
            due_date: form.due_date || null,
          })
          .eq("id", homework.id)
          .eq("school_id", schoolId);

        if (error) throw error;
        toast.success("تم تحديث الواجب.");
      } else {
        const { error } = await supabase.from("homework").insert([
          {
            school_id: schoolId,
            title: form.title.trim(),
            level: form.level,
            details: form.details.trim() || null,
            due_date: form.due_date || null,
          },
        ]);

        if (error) throw error;
        toast.success("تمت إضافة الواجب.");
      }

      onSuccess();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "تعذر حفظ بيانات الواجب.";
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
          <h2 className="text-xl font-bold text-primary-700">{homework ? "تعديل واجب" : "إضافة واجب جديد"}</h2>
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
            <label className="mb-1 block text-sm font-semibold text-gray-700" htmlFor="homework-title">
              عنوان الواجب
            </label>
            <input
              id="homework-title"
              value={form.title}
              onChange={(event) => setValue("title", event.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-3 text-[16px] outline-none ring-primary-200 transition focus:ring"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700" htmlFor="homework-level">
              المستوى الدراسي
            </label>
            <select
              id="homework-level"
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

          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700" htmlFor="homework-due-date">
              موعد التسليم (اختياري)
            </label>
            <input
              id="homework-due-date"
              type="date"
              value={form.due_date}
              onChange={(event) => setValue("due_date", event.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-3 text-[16px] outline-none ring-primary-200 transition focus:ring"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700" htmlFor="homework-details">
              تفاصيل الواجب
            </label>
            <textarea
              id="homework-details"
              value={form.details}
              onChange={(event) => setValue("details", event.target.value)}
              rows={4}
              className="w-full rounded-lg border border-gray-200 px-3 py-3 text-[16px] outline-none ring-primary-200 transition focus:ring"
            />
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
              void saveHomework();
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
