"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import toast from "react-hot-toast";

import { createClient } from "@/lib/supabase/client";
import type { Student } from "@/lib/types";

const supabase = createClient();

interface ExamItem {
  id: string;
  title: string;
  level: string;
  max_score: number;
}

interface ResultRow {
  student_id: string;
  score: number;
}

interface ResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  schoolId: string;
  exam: ExamItem;
  students: Student[];
}

export default function ResultsModal({ isOpen, onClose, onSuccess, schoolId, exam, students }: ResultsModalProps) {
  const [scores, setScores] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen || !schoolId) return;

    const fetchScores = async () => {
      setLoading(true);

      try {
        const { data, error } = await supabase
          .from("exam_results")
          .select("student_id, score")
          .eq("school_id", schoolId)
          .eq("exam_id", exam.id);

        if (error) throw error;

        const map: Record<string, string> = {};
        ((data as ResultRow[]) ?? []).forEach((item) => {
          map[item.student_id] = String(item.score);
        });

        setScores(map);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "تعذر تحميل درجات الاختبار.";
        toast.error(message);
      } finally {
        setLoading(false);
      }
    };

    void fetchScores();
  }, [isOpen, schoolId, exam.id]);

  const totalEntered = useMemo(() => {
    return Object.values(scores).filter((value) => value.trim() !== "").length;
  }, [scores]);

  if (!isOpen) {
    return null;
  }

  const closeOnOverlayClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  const updateScore = (studentId: string, value: string) => {
    setScores((prev) => ({ ...prev, [studentId]: value }));
  };

  const saveResults = async () => {
    if (!schoolId) {
      toast.error("لا يمكن حفظ النتائج بدون معرف المدرسة.");
      return;
    }

    const payload: { school_id: string; exam_id: string; student_id: string; score: number }[] = [];

    for (const student of students) {
      const value = (scores[student.id] ?? "").trim();
      if (!value) continue;

      const numericValue = Number(value);

      if (!Number.isFinite(numericValue) || numericValue < 0 || numericValue > exam.max_score) {
        toast.error(`درجة الطالب ${student.full_name} غير صالحة.`);
        return;
      }

      payload.push({
        school_id: schoolId,
        exam_id: exam.id,
        student_id: student.id,
        score: numericValue,
      });
    }

    if (payload.length === 0) {
      toast.error("أدخل درجة طالب واحد على الأقل.");
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase.from("exam_results").upsert(payload, {
        onConflict: "exam_id,student_id",
      });

      if (error) throw error;

      toast.success("تم حفظ الدرجات بنجاح.");
      onSuccess();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "تعذر حفظ الدرجات.";
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
      <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-primary-700">إدخال درجات الاختبار</h2>
            <p className="text-sm text-gray-600">
              {exam.title} - الدرجة القصوى: {exam.max_score}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:bg-gray-100"
            aria-label="إغلاق"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {loading ? (
          <div className="flex min-h-[180px] items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-100 border-t-primary-600" />
          </div>
        ) : students.length === 0 ? (
          <div className="rounded-xl border border-dashed border-primary-200 bg-primary-50/40 p-5 text-center">
            <p className="mb-4 text-gray-600">لا يوجد طلبة في المدرسة لإدخال النتائج.</p>
            <a
              href="/dashboard/students"
              className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700"
            >
              إضافة الطلبة
            </a>
          </div>
        ) : (
          <>
            <p className="mb-3 text-sm text-gray-600">عدد الدرجات المدخلة: {totalEntered}</p>

            <div className="max-h-[360px] overflow-y-auto rounded-xl border border-gray-100">
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
                          step="0.1"
                          value={scores[student.id] ?? ""}
                          onChange={(event) => updateScore(student.id, event.target.value)}
                          className="w-28 rounded-lg border border-gray-200 px-3 py-2 text-[16px] outline-none ring-primary-200 transition focus:ring"
                          placeholder="0"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-5 flex justify-end gap-2">
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
                  void saveResults();
                }}
                disabled={saving}
                className="min-h-[44px] rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700 disabled:cursor-not-allowed"
              >
                {saving ? "جار الحفظ..." : "حفظ الدرجات"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
