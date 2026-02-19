"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import toast from "react-hot-toast";

import { createClient } from "@/lib/supabase/client";
import type { Teacher } from "@/lib/types";

interface TeacherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  schoolId: string;
  teacher: Teacher | null;
}

interface TeacherForm {
  full_name: string;
  specialization: string;
  phone: string;
}

const supabase = createClient();

const INITIAL_FORM: TeacherForm = {
  full_name: "",
  specialization: "",
  phone: "",
};

export default function TeacherModal({ isOpen, onClose, onSuccess, schoolId, teacher }: TeacherModalProps) {
  const [form, setForm] = useState<TeacherForm>(INITIAL_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    if (teacher) {
      setForm({
        full_name: teacher.full_name,
        specialization: teacher.specialization,
        phone: teacher.phone ?? "",
      });
      return;
    }

    setForm(INITIAL_FORM);
  }, [isOpen, teacher]);

  if (!isOpen) {
    return null;
  }

  const closeOnOverlayClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  const setValue = (key: keyof TeacherForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const saveTeacher = async () => {
    if (!form.full_name.trim() || !form.specialization.trim()) {
      toast.error("يرجى تعبئة الاسم والتخصص.");
      return;
    }

    if (!schoolId) {
      toast.error("لا يمكن الحفظ بدون معرف المدرسة.");
      return;
    }

    setSaving(true);

    try {
      if (teacher) {
        const { error } = await supabase
          .from("teachers")
          .update({
            full_name: form.full_name.trim(),
            specialization: form.specialization.trim(),
            phone: form.phone.trim() || null,
          })
          .eq("id", teacher.id)
          .eq("school_id", schoolId);

        if (error) throw error;
        toast.success("تم تحديث بيانات المعلم.");
      } else {
        const { error } = await supabase.from("teachers").insert([
          {
            school_id: schoolId,
            full_name: form.full_name.trim(),
            specialization: form.specialization.trim(),
            phone: form.phone.trim() || null,
          },
        ]);

        if (error) throw error;
        toast.success("تمت إضافة المعلم بنجاح.");
      }

      onSuccess();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "تعذر حفظ بيانات المعلم.";
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
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-bold text-primary-700">{teacher ? "تعديل المعلم" : "إضافة معلم جديد"}</h2>
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
            <label className="mb-1 block text-sm font-semibold text-gray-700" htmlFor="teacher-name">
              الاسم الكامل
            </label>
            <input
              id="teacher-name"
              value={form.full_name}
              onChange={(event) => setValue("full_name", event.target.value)}
              placeholder="أدخل اسم المعلم"
              className="w-full rounded-lg border border-gray-200 px-3 py-3 text-[16px] outline-none ring-primary-200 transition focus:ring"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700" htmlFor="teacher-specialization">
              التخصص
            </label>
            <input
              id="teacher-specialization"
              value={form.specialization}
              onChange={(event) => setValue("specialization", event.target.value)}
              placeholder="مثال: تجويد - فقه - لغة عربية"
              className="w-full rounded-lg border border-gray-200 px-3 py-3 text-[16px] outline-none ring-primary-200 transition focus:ring"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700" htmlFor="teacher-phone">
              رقم الهاتف (اختياري)
            </label>
            <input
              id="teacher-phone"
              value={form.phone}
              onChange={(event) => setValue("phone", event.target.value)}
              placeholder="أدخل رقم الهاتف"
              className="w-full rounded-lg border border-gray-200 px-3 py-3 text-[16px] outline-none ring-primary-200 transition focus:ring"
            />
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2">
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
              void saveTeacher();
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
