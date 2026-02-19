"use client";

import Link from "next/link";
import { ChangeEvent, useCallback, useEffect, useState } from "react";
import { UploadCloud } from "lucide-react";
import toast from "react-hot-toast";

import { createClient } from "@/lib/supabase/client";
import type { UserRole } from "@/lib/types";
import { LEVELS, formatDateTime } from "@/lib/utils";

interface ProfileContext {
  school_id: string | null;
  role: UserRole | null;
  full_name: string | null;
}

interface LibraryItem {
  id: string;
  school_id: string;
  title: string;
  level: string;
  file_name: string;
  file_type: string;
  file_path: string;
  public_url: string;
  created_at: string;
}

const supabase = createClient();

export default function LibraryPage() {
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [uploaderName, setUploaderName] = useState("مستخدم");
  const [resources, setResources] = useState<LibraryItem[]>([]);
  const [resourceTitle, setResourceTitle] = useState("");
  const [resourceLevel, setResourceLevel] = useState<string>(LEVELS[0]);

  const canUpload = role === "school_admin" || role === "teacher";

  const loadResources = useCallback(async () => {
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
        .select("school_id, role, full_name")
        .eq("id", user.id)
        .single<ProfileContext>();

      if (profileError) {
        throw profileError;
      }

      setRole(profile?.role ?? null);
      setUploaderName(profile?.full_name || "مستخدم");

      if (!profile?.school_id) {
        setSchoolId(null);
        setResources([]);
        return;
      }

      setSchoolId(profile.school_id);

      const { data, error } = await supabase
        .from("library")
        .select("id,school_id,title,level,file_name,file_type,file_path,public_url,created_at")
        .eq("school_id", profile.school_id)
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      setResources((data as LibraryItem[]) ?? []);
    } catch (error) {
      const message = error instanceof Error ? error.message : "تعذر تحميل مكتبة الملفات.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadResources();
  }, [loadResources]);

  const uploadResource = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!canUpload) {
      toast.error("ليس لديك صلاحية رفع الملفات.");
      event.target.value = "";
      return;
    }

    if (!schoolId) {
      toast.error("تعذر معرفة المدرسة الحالية.");
      event.target.value = "";
      return;
    }

    const extension = file.name.includes(".") ? file.name.split(".").pop()?.toLowerCase() || "file" : "file";
    const typeAllowed = ["pdf", "mp3", "wav", "ogg", "mp4", "mov", "webm"].includes(extension);

    if (!typeAllowed) {
      toast.error("نوع الملف غير مدعوم. المسموح: PDF / Audio / Video");
      event.target.value = "";
      return;
    }

    const normalizedTitle = resourceTitle.trim() || file.name;

    setUploading(true);

    try {
      const filePath = `${schoolId}/${Date.now()}-${file.name}`;

      const { error: uploadError } = await supabase.storage.from("library").upload(filePath, file, {
        upsert: false,
      });

      if (uploadError) {
        throw uploadError;
      }

      const { data: publicData } = supabase.storage.from("library").getPublicUrl(filePath);

      const { error: insertError } = await supabase.from("library").insert([
        {
          school_id: schoolId,
          title: normalizedTitle,
          level: resourceLevel,
          file_name: file.name,
          file_type: extension,
          file_path: filePath,
          public_url: publicData.publicUrl,
          uploaded_by_name: uploaderName,
        },
      ]);

      if (insertError) {
        throw insertError;
      }

      setResourceTitle("");
      toast.success("تم رفع الملف بنجاح.");
      await loadResources();
    } catch (error) {
      const message = error instanceof Error ? error.message : "تعذر رفع الملف.";
      toast.error(message);
    } finally {
      setUploading(false);
      event.target.value = "";
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
        <p className="mb-6 text-gray-600">أكمل الإعداد حتى تتمكن من استخدام المكتبة.</p>
        <Link
          href="/onboarding"
          className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700"
        >
          إكمال الإعداد
        </Link>
      </section>
    );
  }

  return (
    <section dir="rtl" className="space-y-5">
      <header className="rounded-xl bg-white p-6 shadow-md">
        <h1 className="text-2xl font-bold text-primary-700">المكتبة التعليمية</h1>
        <p className="mt-2 text-gray-600">رفع ملفات PDF والصوت والفيديو وتصنيفها حسب المستوى.</p>
      </header>

      {canUpload ? (
        <section className="rounded-xl bg-white p-6 shadow-md">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label htmlFor="resource-title" className="mb-1 block text-sm font-semibold text-gray-700">
                عنوان المورد
              </label>
              <input
                id="resource-title"
                value={resourceTitle}
                onChange={(event) => setResourceTitle(event.target.value)}
                placeholder="مثال: مراجعة سورة الملك"
                className="w-full rounded-lg border border-gray-200 px-3 py-3 text-[16px] outline-none ring-primary-200 focus:ring"
              />
            </div>
            <div>
              <label htmlFor="resource-level" className="mb-1 block text-sm font-semibold text-gray-700">
                المستوى
              </label>
              <select
                id="resource-level"
                value={resourceLevel}
                onChange={(event) => setResourceLevel(event.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-3 text-[16px] outline-none ring-primary-200 focus:ring"
              >
                {LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <label className="inline-flex min-h-[44px] w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700">
                <UploadCloud className="h-4 w-4" />
                {uploading ? "جارٍ الرفع..." : "رفع ملف"}
                <input type="file" className="hidden" onChange={uploadResource} disabled={uploading} />
              </label>
            </div>
          </div>
        </section>
      ) : (
        <section className="rounded-xl bg-white p-6 shadow-md">
          <p className="text-gray-600">يمكنك تصفح وتحميل الملفات فقط. الرفع متاح للمعلم/الإدارة.</p>
        </section>
      )}

      {resources.length === 0 ? (
        <section className="rounded-xl bg-white p-6 text-center shadow-md">
          <p className="mb-4 text-gray-600">لا توجد ملفات متاحة حاليًا.</p>
          {canUpload ? (
            <p className="text-sm text-gray-500">ابدأ برفع أول مورد تعليمي.</p>
          ) : (
            <Link
              href="/dashboard/messages"
              className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700"
            >
              تواصل مع الإدارة
            </Link>
          )}
        </section>
      ) : (
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {resources.map((resource) => (
            <article key={resource.id} className="rounded-xl bg-white p-6 shadow-md">
              <div className="mb-2 flex items-start justify-between gap-2">
                <h2 className="text-lg font-bold text-gray-900">{resource.title}</h2>
                <span className="rounded-full bg-primary-100 px-3 py-1 text-xs font-semibold text-primary-700">
                  {resource.level}
                </span>
              </div>

              <p className="text-sm text-gray-600">اسم الملف: {resource.file_name}</p>
              <p className="mt-1 text-sm text-gray-600">النوع: {resource.file_type.toUpperCase()}</p>
              <p className="mt-1 text-xs text-gray-500">{formatDateTime(resource.created_at)}</p>

              <div className="mt-4 flex justify-end">
                <a
                  href={resource.public_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700"
                >
                  تنزيل / فتح
                </a>
              </div>
            </article>
          ))}
        </section>
      )}
    </section>
  );
}
