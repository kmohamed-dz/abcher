"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import toast from "react-hot-toast";

import { createClient } from "@/lib/supabase/client";
import { LEVELS } from "@/lib/utils";

interface HomeworkItem {
  id: string;
  school_id: string;
  title: string;
  level: string;
  description: string | null;
  due_date: string | null;
}

interface HomeworkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  schoolId: string | null;
  homework: HomeworkItem | null;
}

interface HomeworkForm {
  title: string;
  level: string;
  description: string;
  due_date: string;
}

interface HomeworkErrors {
  title?: string;
  level?: string;
}

const supabase = createClient();

const INITIAL_FORM: HomeworkForm = {
  title: "",
  level: LEVELS[0],
  description: "",
  due_date: "",
};

export default function HomeworkModal({ isOpen, onClose, onSuccess, schoolId, homework }: HomeworkModalProps) {
  const [form, setForm] = useState<HomeworkForm>(INITIAL_FORM);
  const [errors, setErrors] = useState<HomeworkErrors>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    if (homework) {
      setForm({
        title: homework.title,
        level: homework.level,
        description: homework.description || "",
        due_date: homework.due_date || "",
      });
    } else {
      setForm(INITIAL_FORM);
    }

    setErrors({});
  }, [isOpen, homework]);

  if (!isOpen) {
    return null;
  }

  const onOverlayClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  const validate = () => {
    const nextErrors: HomeworkErrors = {};

    if (!form.title.trim()) {
      nextErrors.title = "عنوان الواجب مطلوب.";
    }

    if (!form.level.trim()) {
      nextErrors.level = "المستوى مطلوب.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const saveHomework = async () => {
    if (!validate()) {
      toast.error("تحقق من الحقول المطلوبة.");
      return;
    }

    if (!schoolId) {
      toast.error("تعذر معرفة المدرسة الحالية.");
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
            description: form.description.trim() || null,
            due_date: form.due_date || null,
          })
          .eq("id", homework.id)
          .eq("school_id", schoolId);

        if (error) {
          throw error;
        }

        toast.success("تم تعديل الواجب.");
      } else {
        const { error } = await supabase.from("homework").insert([
          {
            school_id: schoolId,
            title: form.title.trim(),
            level: form.level,
            description: form.description.trim() || null,
            due_date: form.due_date || null,
          },
        ]);

        if (error) {
          throw error;
        }

        toast.success("تمت إضافة الواجب.");
      }

      onSuccess();
    } catch (error) {
      const message = error instanceof Error ? error.message : "تعذر حفظ الواجب.";
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
          <h2 className="text-xl font-bold text-primary-700">{homework ? "تعديل واجب" : "إضافة واجب"}</h2>
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
            <label htmlFor="hw-title" className="mb-1 block text-sm font-semibold text-gray-700">
              عنوان الواجب
            </label>
            <input
              id="hw-title"
              value={form.title}
              onChange={(event) => setForm((previous) => ({ ...previous, title: event.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-3 text-[16px] outline-none ring-primary-200 focus:ring"
              placeholder="أدخل عنوانًا واضحًا"
            />
            {errors.title ? <p className="mt-1 text-sm text-red-600">{errors.title}</p> : null}
          </div>

          <div>
            <label htmlFor="hw-level" className="mb-1 block text-sm font-semibold text-gray-700">
              المستوى
            </label>
            <select
              id="hw-level"
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
            {errors.level ? <p className="mt-1 text-sm text-red-600">{errors.level}</p> : null}
          </div>

          <div>
            <label htmlFor="hw-due-date" className="mb-1 block text-sm font-semibold text-gray-700">
              تاريخ التسليم
            </label>
            <input
              id="hw-due-date"
              type="date"
              value={form.due_date}
              onChange={(event) => setForm((previous) => ({ ...previous, due_date: event.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-3 text-[16px] outline-none ring-primary-200 focus:ring"
            />
          </div>

          <div>
            <label htmlFor="hw-description" className="mb-1 block text-sm font-semibold text-gray-700">
              وصف الواجب
            </label>
            <textarea
              id="hw-description"
              rows={4}
              value={form.description}
              onChange={(event) => setForm((previous) => ({ ...previous, description: event.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-3 text-[16px] outline-none ring-primary-200 focus:ring"
              placeholder="وصف مختصر للتكليف"
            />
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
              void saveHomework();
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
