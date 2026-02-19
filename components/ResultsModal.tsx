"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import toast from "react-hot-toast";

import { createClient } from "@/lib/supabase/client";
import type { Student } from "@/lib/types";

interface ExamItem {
  id: string;
  title: string;
  exam_date: string;
  max_score: number;
  level: string;
}

interface ResultRecord {
  student_id: string;
  score: number;
}

interface ResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  schoolId: string | null;
  exam: ExamItem;
  students: Student[];
  canManage: boolean;
}

const supabase = createClient();

export default function ResultsModal({
  isOpen,
  onClose,
  onSuccess,
  schoolId,
  exam,
  students,
  canManage,
}: ResultsModalProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [scores, setScores] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isOpen || !schoolId) return;

    const loadResults = async () => {
      setLoading(true);

      try {
        const { data, error } = await supabase
          .from("results")
          .select("student_id,score")
          .eq("school_id", schoolId)
          .eq("exam_id", exam.id);

        if (error) {
          throw error;
        }

        const map: Record<string, string> = {};
        ((data as ResultRecord[]) ?? []).forEach((row) => {
          map[row.student_id] = String(row.score);
        });

        setScores(map);
      } catch (error) {
        const message = error instanceof Error ? error.message : "تعذر تحميل درجات الاختبار.";
        toast.error(message);
      } finally {
        setLoading(false);
      }
    };

    void loadResults();
  }, [isOpen, schoolId, exam.id]);

  const enteredCount = useMemo(
    () => Object.values(scores).filter((value) => value.trim().length > 0).length,
    [scores],
  );

  if (!isOpen) {
    return null;
  }

  const onOverlayClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  const saveResults = async () => {
    if (!canManage) {
      toast.error("ليس لديك صلاحية تعديل النتائج.");
      return;
    }

    if (!schoolId) {
      toast.error("تعذر معرفة المدرسة الحالية.");
      return;
    }

    const rows: Array<{ school_id: string; exam_id: string; student_id: string; score: number }> = [];

    for (const student of students) {
      const raw = (scores[student.id] || "").trim();
      if (!raw) continue;

      const value = Number(raw);
      if (!Number.isFinite(value) || value < 0 || value > exam.max_score) {
        toast.error(`درجة غير صالحة للطالب ${student.full_name}.`);
        return;
      }

      rows.push({
        school_id: schoolId,
        exam_id: exam.id,
        student_id: student.id,
        score: value,
      });
    }

    if (rows.length === 0) {
      toast.error("أدخل درجة واحدة على الأقل.");
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase.from("results").upsert(rows, {
        onConflict: "exam_id,student_id",
      });

      if (error) {
        throw error;
      }

      toast.success("تم حفظ النتائج بنجاح.");
      onSuccess();
    } catch (error) {
      const message = error instanceof Error ? error.message : "تعذر حفظ النتائج.";
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
      <div className="w-full max-w-4xl rounded-xl bg-white p-6 shadow-md">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-primary-700">درجات الاختبار: {exam.title}</h2>
            <p className="text-sm text-gray-600">
              المستوى: {exam.level} | الدرجة القصوى: {exam.max_score}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-600 hover:bg-gray-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {loading ? (
          <div className="flex min-h-[260px] items-center justify-center">
            <div className="h-11 w-11 animate-spin rounded-full border-4 border-primary-100 border-t-primary-600" />
          </div>
        ) : students.length === 0 ? (
          <div className="rounded-lg border border-dashed border-primary-200 bg-primary-50 p-6 text-center">
            <p className="mb-4 text-gray-600">لا يوجد طلبة لإدخال النتائج.</p>
            <a
              href="/dashboard/students"
              className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700"
            >
              إضافة طلبة
            </a>
          </div>
        ) : (
          <>
            <p className="mb-3 text-sm text-gray-600">عدد الدرجات المدخلة: {enteredCount}</p>

            <div className="max-h-[380px] overflow-y-auto rounded-lg border border-gray-100">
              <table className="min-w-full text-right">
                <thead className="bg-primary-50 text-sm text-primary-700">
                  <tr>
                    <th className="px-4 py-3">الطالب</th>
                    <th className="px-4 py-3">المستوى</th>
                    <th className="px-4 py-3">الدرجة</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student.id} className="border-t border-gray-100">
                      <td className="px-4 py-3 font-semibold text-gray-900">{student.full_name}</td>
                      <td className="px-4 py-3 text-gray-700">{student.level}</td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min="0"
                          max={exam.max_score}
                          value={scores[student.id] || ""}
                          onChange={(event) => setScores((previous) => ({ ...previous, [student.id]: event.target.value }))}
                          disabled={!canManage}
                          className="w-28 rounded-lg border border-gray-200 px-3 py-2 text-[16px] outline-none ring-primary-200 focus:ring disabled:bg-gray-100"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="min-h-[44px] rounded-lg border border-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-100"
              >
                إغلاق
              </button>
              {canManage ? (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => {
                    void saveResults();
                  }}
                  className="min-h-[44px] rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700 disabled:opacity-60"
                >
                  {saving ? "جارٍ الحفظ..." : "حفظ الدرجات"}
                </button>
              ) : null}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
