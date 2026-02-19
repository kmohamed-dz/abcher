"use client";

import Link from "next/link";
import { ChangeEvent, useCallback, useEffect, useState } from "react";
import { UploadCloud } from "lucide-react";
import toast from "react-hot-toast";

import { createClient } from "@/lib/supabase/client";
import { formatDateTime } from "@/lib/utils";

const supabase = createClient();

interface LibraryFile {
  id: string;
  school_id: string;
  name: string;
  file_path: string;
  public_url: string;
  size: number;
  created_at: string;
}

function formatSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export default function LibraryPage() {
  const [schoolId, setSchoolId] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const [files, setFiles] = useState<LibraryFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const loadFiles = useCallback(async () => {
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("يرجى تسجيل الدخول أولًا.");
      }

      setUserId(user.id);

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
        setFiles([]);
        return;
      }

      setSchoolId(activeSchoolId);

      const { data, error } = await supabase
        .from("library_files")
        .select("id, school_id, name, file_path, public_url, size, created_at")
        .eq("school_id", activeSchoolId)
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      setFiles((data as LibraryFile[]) ?? []);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "تعذر تحميل ملفات المكتبة.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadFiles();
  }, [loadFiles]);

  const uploadFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!schoolId) {
      toast.error("لا يمكن الرفع بدون معرف المدرسة.");
      event.target.value = "";
      return;
    }

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

      const { error: insertError } = await supabase.from("library_files").insert([
        {
          school_id: schoolId,
          name: file.name,
          file_path: filePath,
          public_url: publicData.publicUrl,
          size: file.size,
          uploaded_by: userId || null,
        },
      ]);

      if (insertError) {
        throw insertError;
      }

      toast.success("تم رفع الملف بنجاح.");
      await loadFiles();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "تعذر رفع الملف.";
      toast.error(message);
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const removeFile = async (file: LibraryFile) => {
    const confirmed = window.confirm(`هل أنت متأكد من حذف الملف: ${file.name}؟`);
    if (!confirmed) return;

    try {
      const { error: storageError } = await supabase.storage.from("library").remove([file.file_path]);
      if (storageError) {
        throw storageError;
      }

      const { error: dbError } = await supabase
        .from("library_files")
        .delete()
        .eq("id", file.id)
        .eq("school_id", schoolId);

      if (dbError) {
        throw dbError;
      }

      toast.success("تم حذف الملف.");
      await loadFiles();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "تعذر حذف الملف.";
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
          <h1 className="text-2xl font-bold text-primary-700">مكتبة الملفات</h1>
          <p className="mt-1 text-gray-600">رفع ومشاركة الملفات التعليمية داخل المدرسة.</p>
        </div>

        <label className="inline-flex min-h-[44px] cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700">
          <UploadCloud className="h-4 w-4" />
          {uploading ? "جار الرفع..." : "رفع ملف"}
          <input type="file" className="hidden" onChange={uploadFile} disabled={uploading} />
        </label>
      </header>

      {!schoolId ? (
        <section className="rounded-2xl bg-white p-8 text-center shadow-sm">
          <h2 className="mb-3 text-xl font-bold text-primary-700">لا توجد مدرسة مرتبطة بالحساب</h2>
          <p className="mb-5 text-gray-600">أكمل الإعداد لبدء رفع الملفات.</p>
          <Link
            href="/onboarding"
            className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-primary-600 px-5 py-2 text-white hover:bg-primary-700"
          >
            إكمال الإعداد
          </Link>
        </section>
      ) : files.length === 0 ? (
        <section className="rounded-2xl bg-white p-8 text-center shadow-sm">
          <p className="mb-4 text-gray-600">لا توجد ملفات مرفوعة بعد.</p>
          <label className="inline-flex min-h-[44px] cursor-pointer items-center justify-center rounded-lg bg-primary-600 px-5 py-2 text-white hover:bg-primary-700">
            ارفع أول ملف
            <input type="file" className="hidden" onChange={uploadFile} disabled={uploading} />
          </label>
        </section>
      ) : (
        <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-right">
              <thead className="bg-primary-50 text-primary-700">
                <tr>
                  <th className="px-4 py-3">اسم الملف</th>
                  <th className="px-4 py-3">الحجم</th>
                  <th className="px-4 py-3">تاريخ الرفع</th>
                  <th className="px-4 py-3">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {files.map((file) => (
                  <tr key={file.id} className="border-t border-gray-100">
                    <td className="px-4 py-3 font-semibold text-gray-900">{file.name}</td>
                    <td className="px-4 py-3 text-gray-700">{formatSize(file.size)}</td>
                    <td className="px-4 py-3 text-gray-700">{formatDateTime(file.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap justify-end gap-2">
                        <a
                          href={file.public_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-primary-600 px-3 py-2 text-sm text-white hover:bg-primary-700"
                        >
                          فتح
                        </a>
                        <button
                          type="button"
                          onClick={() => {
                            void removeFile(file);
                          }}
                          className="min-h-[44px] rounded-lg bg-red-600 px-3 py-2 text-sm text-white hover:bg-red-700"
                        >
                          حذف
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </section>
  );
}
