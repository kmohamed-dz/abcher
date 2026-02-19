"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import toast from "react-hot-toast";

import HomeworkModal from "@/components/HomeworkModal";
import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/utils";

const supabase = createClient();

export interface HomeworkItem {
  id: string;
  school_id: string;
  title: string;
  level: string;
  details: string | null;
  due_date: string | null;
  created_at: string;
}

export default function HomeworkPage() {
  const [schoolId, setSchoolId] = useState<string>("");
  const [homeworkItems, setHomeworkItems] = useState<HomeworkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedHomework, setSelectedHomework] = useState<HomeworkItem | null>(null);

  const loadHomework = useCallback(async () => {
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
        setHomeworkItems([]);
        return;
      }

      setSchoolId(activeSchoolId);

      const { data, error } = await supabase
        .from("homework")
        .select("id, school_id, title, level, details, due_date, created_at")
        .eq("school_id", activeSchoolId)
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      setHomeworkItems((data as HomeworkItem[]) ?? []);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "تعذر تحميل الواجبات.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadHomework();
  }, [loadHomework]);

  const removeHomework = async (item: HomeworkItem) => {
    const confirmed = window.confirm(`هل أنت متأكد من حذف واجب: ${item.title}؟`);
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from("homework")
        .delete()
        .eq("id", item.id)
        .eq("school_id", schoolId);

      if (error) {
        throw error;
      }

      toast.success("تم حذف الواجب.");
      await loadHomework();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "تعذر حذف الواجب.";
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
          <h1 className="text-2xl font-bold text-primary-700">الواجبات</h1>
          <p className="mt-1 text-gray-600">إدارة واجبات الطلبة حسب المستوى الدراسي.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setSelectedHomework(null);
            setIsModalOpen(true);
          }}
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700"
        >
          <Plus className="h-4 w-4" />
          إضافة واجب
        </button>
      </header>

      {!schoolId ? (
        <section className="rounded-2xl bg-white p-8 text-center shadow-sm">
          <h2 className="mb-3 text-xl font-bold text-primary-700">لا توجد مدرسة مرتبطة بالحساب</h2>
          <p className="mb-5 text-gray-600">أكمل الإعداد لبدء إدارة الواجبات.</p>
          <a
            href="/onboarding"
            className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-primary-600 px-5 py-2 text-white hover:bg-primary-700"
          >
            إكمال الإعداد
          </a>
        </section>
      ) : homeworkItems.length === 0 ? (
        <section className="rounded-2xl bg-white p-8 text-center shadow-sm">
          <p className="mb-4 text-gray-600">لا توجد واجبات مسجلة حتى الآن.</p>
          <button
            type="button"
            onClick={() => {
              setSelectedHomework(null);
              setIsModalOpen(true);
            }}
            className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-primary-600 px-5 py-2 text-white hover:bg-primary-700"
          >
            إضافة أول واجب
          </button>
        </section>
      ) : (
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {homeworkItems.map((item) => (
            <article key={item.id} className="rounded-2xl bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-start justify-between gap-2">
                <h3 className="text-lg font-bold text-gray-900">{item.title}</h3>
                <span className="rounded-full bg-primary-100 px-3 py-1 text-xs font-semibold text-primary-700">{item.level}</span>
              </div>
              <p className="min-h-[56px] text-sm leading-7 text-gray-600">{item.details || "لا يوجد وصف إضافي."}</p>
              <p className="mt-3 text-xs text-gray-500">موعد التسليم: {item.due_date ? formatDate(item.due_date) : "غير محدد"}</p>

              <div className="mt-4 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedHomework(item);
                    setIsModalOpen(true);
                  }}
                  className="min-h-[44px] rounded-lg bg-primary-600 px-3 py-2 text-sm text-white hover:bg-primary-700"
                >
                  تعديل
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void removeHomework(item);
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

      <HomeworkModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          void loadHomework();
          setIsModalOpen(false);
        }}
        schoolId={schoolId}
        homework={selectedHomework}
      />
    </section>
  );
}
