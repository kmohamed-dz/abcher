"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import toast from "react-hot-toast";

import HomeworkModal from "@/components/HomeworkModal";
import { createClient } from "@/lib/supabase/client";
import type { UserRole } from "@/lib/types";
import { formatDate } from "@/lib/utils";

interface ProfileContext {
  school_id: string | null;
  role: UserRole | null;
}

export interface HomeworkItem {
  id: string;
  school_id: string;
  title: string;
  level: string;
  description: string | null;
  due_date: string | null;
  created_at: string;
}

const supabase = createClient();

export default function HomeworkPage() {
  const [loading, setLoading] = useState(true);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [items, setItems] = useState<HomeworkItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedHomework, setSelectedHomework] = useState<HomeworkItem | null>(null);

  const canManage = role === "school_admin" || role === "teacher";

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
        .select("school_id, role")
        .eq("id", user.id)
        .single<ProfileContext>();

      if (profileError) {
        throw profileError;
      }

      setRole(profile?.role ?? null);

      if (!profile?.school_id) {
        setSchoolId(null);
        setItems([]);
        return;
      }

      setSchoolId(profile.school_id);

      const { data, error } = await supabase
        .from("homework")
        .select("id,school_id,title,level,description,due_date,created_at")
        .eq("school_id", profile.school_id)
        .order("due_date", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      setItems((data as HomeworkItem[]) ?? []);
    } catch (error) {
      const message = error instanceof Error ? error.message : "تعذر تحميل الواجبات.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadHomework();
  }, [loadHomework]);

  const grouped = useMemo(() => {
    const map = new Map<string, HomeworkItem[]>();

    items.forEach((item) => {
      const key = item.due_date || "بدون تاريخ";
      const current = map.get(key) || [];
      current.push(item);
      map.set(key, current);
    });

    return Array.from(map.entries()).map(([key, list]) => ({
      dueDate: key,
      list,
    }));
  }, [items]);

  const deleteHomework = async (item: HomeworkItem) => {
    if (!schoolId || !canManage) return;

    const confirmed = window.confirm(`هل تريد حذف الواجب: ${item.title}؟`);
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
    } catch (error) {
      const message = error instanceof Error ? error.message : "تعذر حذف الواجب.";
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
        <p className="mb-6 text-gray-600">أكمل الإعداد لبدء إدارة الواجبات.</p>
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
            <h1 className="text-2xl font-bold text-primary-700">الواجبات</h1>
            <p className="mt-2 text-gray-600">تنظيم الواجبات حسب تاريخ التسليم.</p>
          </div>
          {canManage ? (
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
          ) : null}
        </div>
      </header>

      {items.length === 0 ? (
        <section className="rounded-xl bg-white p-6 text-center shadow-md">
          <p className="mb-4 text-gray-600">لا توجد واجبات مسجلة حاليًا.</p>
          {canManage ? (
            <button
              type="button"
              onClick={() => {
                setSelectedHomework(null);
                setIsModalOpen(true);
              }}
              className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700"
            >
              إضافة أول واجب
            </button>
          ) : null}
        </section>
      ) : (
        grouped.map((group) => (
          <section key={group.dueDate} className="rounded-xl bg-white p-6 shadow-md">
            <h2 className="mb-4 text-lg font-bold text-primary-700">
              {group.dueDate === "بدون تاريخ" ? "بدون تاريخ تسليم" : `تاريخ التسليم: ${formatDate(group.dueDate)}`}
            </h2>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {group.list.map((item) => (
                <article key={item.id} className="rounded-lg border border-primary-100 bg-beige-50 p-4">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <h3 className="text-base font-bold text-gray-900">{item.title}</h3>
                    <span className="rounded-full bg-primary-100 px-3 py-1 text-xs font-semibold text-primary-700">
                      {item.level}
                    </span>
                  </div>
                  <p className="text-sm leading-7 text-gray-700">{item.description || "لا يوجد وصف إضافي."}</p>

                  {canManage ? (
                    <div className="mt-3 flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedHomework(item);
                          setIsModalOpen(true);
                        }}
                        className="min-h-[44px] rounded-lg bg-yellow-500 px-3 py-2 text-sm text-white"
                      >
                        تعديل
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          void deleteHomework(item);
                        }}
                        className="min-h-[44px] rounded-lg bg-red-600 px-3 py-2 text-sm text-white"
                      >
                        حذف
                      </button>
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-gray-500">عرض فقط</p>
                  )}
                </article>
              ))}
            </div>
          </section>
        ))
      )}

      <HomeworkModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          setIsModalOpen(false);
          void loadHomework();
        }}
        schoolId={schoolId}
        homework={selectedHomework}
      />
    </section>
  );
}
