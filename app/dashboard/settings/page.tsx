"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";

import { createClient } from "@/lib/supabase/client";
import type { UserRole } from "@/lib/types";

interface ProfileData {
  id: string;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  school_id: string | null;
  role: UserRole | null;
}

interface SchoolData {
  id: string;
  name: string;
  wilaya: string;
  address: string | null;
}

interface Errors {
  full_name?: string;
  school_name?: string;
  school_wilaya?: string;
}

const supabase = createClient();

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingSchool, setSavingSchool] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [school, setSchool] = useState<SchoolData | null>(null);
  const [errors, setErrors] = useState<Errors>({});

  const [profileForm, setProfileForm] = useState({
    full_name: "",
    phone: "",
    avatar_url: "",
  });

  const [schoolForm, setSchoolForm] = useState({
    name: "",
    wilaya: "",
    address: "",
  });

  const loadSettings = useCallback(async () => {
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("يرجى تسجيل الدخول أولًا.");
      }

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id,full_name,phone,avatar_url,school_id,role")
        .eq("id", user.id)
        .single<ProfileData>();

      if (profileError) {
        throw profileError;
      }

      setProfile(profileData);
      setProfileForm({
        full_name: profileData.full_name || "",
        phone: profileData.phone || "",
        avatar_url: profileData.avatar_url || "",
      });

      if (profileData.role === "school_admin" && profileData.school_id) {
        const { data: schoolData, error: schoolError } = await supabase
          .from("schools")
          .select("id,name,wilaya,address")
          .eq("id", profileData.school_id)
          .single<SchoolData>();

        if (schoolError) {
          throw schoolError;
        }

        setSchool(schoolData);
        setSchoolForm({
          name: schoolData.name || "",
          wilaya: schoolData.wilaya || "",
          address: schoolData.address || "",
        });
      } else {
        setSchool(null);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "تعذر تحميل الإعدادات.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const validateProfile = () => {
    const nextErrors: Errors = {};

    if (!profileForm.full_name.trim()) {
      nextErrors.full_name = "الاسم الكامل مطلوب.";
    }

    setErrors((previous) => ({ ...previous, ...nextErrors }));
    return Object.keys(nextErrors).length === 0;
  };

  const validateSchool = () => {
    const nextErrors: Errors = {};

    if (!schoolForm.name.trim()) {
      nextErrors.school_name = "اسم المدرسة مطلوب.";
    }

    if (!schoolForm.wilaya.trim()) {
      nextErrors.school_wilaya = "الولاية مطلوبة.";
    }

    setErrors((previous) => ({ ...previous, ...nextErrors }));
    return Object.keys(nextErrors).length === 0;
  };

  const saveProfile = async () => {
    if (!profile || !validateProfile()) {
      toast.error("تحقق من بيانات الملف الشخصي.");
      return;
    }

    setSavingProfile(true);

    try {
      let query = supabase
        .from("profiles")
        .update({
          full_name: profileForm.full_name.trim(),
          phone: profileForm.phone.trim() || null,
        })
        .eq("id", profile.id);

      if (profile.school_id) {
        query = query.eq("school_id", profile.school_id);
      }

      const { error } = await query;

      if (error) {
        throw error;
      }

      toast.success("تم حفظ الملف الشخصي.");
      await loadSettings();
    } catch (error) {
      const message = error instanceof Error ? error.message : "تعذر حفظ الملف الشخصي.";
      toast.error(message);
    } finally {
      setSavingProfile(false);
    }
  };

  const saveSchool = async () => {
    if (!profile?.school_id || !school || !validateSchool()) {
      toast.error("تحقق من بيانات المدرسة.");
      return;
    }

    setSavingSchool(true);

    try {
      const { error } = await supabase
        .from("schools")
        .update({
          name: schoolForm.name.trim(),
          wilaya: schoolForm.wilaya.trim(),
          address: schoolForm.address.trim() || null,
        })
        .eq("id", profile.school_id);

      if (error) {
        throw error;
      }

      toast.success("تم حفظ إعدادات المدرسة.");
      await loadSettings();
    } catch (error) {
      const message = error instanceof Error ? error.message : "تعذر حفظ إعدادات المدرسة.";
      toast.error(message);
    } finally {
      setSavingSchool(false);
    }
  };

  const uploadAvatar = async (file: File) => {
    if (!profile) {
      toast.error("تعذر معرفة المستخدم الحالي.");
      return;
    }

    setUploadingAvatar(true);

    try {
      const extension = file.name.includes(".") ? file.name.split(".").pop() || "png" : "png";
      const filePath = `${profile.id}/${Date.now()}-avatar.${extension}`;

      const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, file, {
        upsert: true,
      });

      if (uploadError) {
        throw uploadError;
      }

      const { data: publicUrlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
      const avatarUrl = publicUrlData.publicUrl;

      let query = supabase.from("profiles").update({ avatar_url: avatarUrl }).eq("id", profile.id);
      if (profile.school_id) {
        query = query.eq("school_id", profile.school_id);
      }

      const { error: profileError } = await query;
      if (profileError) {
        throw profileError;
      }

      setProfileForm((previous) => ({ ...previous, avatar_url: avatarUrl }));
      toast.success("تم رفع الصورة الشخصية.");
      await loadSettings();
    } catch (error) {
      const message = error instanceof Error ? error.message : "تعذر رفع الصورة.";
      toast.error(message);
    } finally {
      setUploadingAvatar(false);
    }
  };

  if (loading) {
    return (
      <section dir="rtl" className="flex min-h-[65vh] items-center justify-center">
        <div className="h-11 w-11 animate-spin rounded-full border-4 border-primary-100 border-t-primary-600" />
      </section>
    );
  }

  if (!profile) {
    return (
      <section dir="rtl" className="rounded-xl bg-white p-6 text-center shadow-md">
        <h1 className="mb-3 text-2xl font-bold text-primary-700">تعذر تحميل الإعدادات</h1>
        <p className="mb-6 text-gray-600">حاول تسجيل الدخول من جديد.</p>
        <Link
          href="/login"
          className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700"
        >
          تسجيل الدخول
        </Link>
      </section>
    );
  }

  return (
    <section dir="rtl" className="space-y-5">
      <header className="rounded-xl bg-white p-6 shadow-md">
        <h1 className="text-2xl font-bold text-primary-700">الإعدادات</h1>
        <p className="mt-2 text-gray-600">إدارة الملف الشخصي وإعدادات المدرسة.</p>
      </header>

      <section className="rounded-xl bg-white p-6 shadow-md">
        <h2 className="mb-4 text-xl font-bold text-primary-700">الملف الشخصي</h2>

        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center">
          <img
            src={profileForm.avatar_url || "/placeholder.svg"}
            alt="الصورة الشخصية"
            className="h-20 w-20 rounded-full border border-primary-100 object-cover"
          />
          <label className="inline-flex min-h-[44px] cursor-pointer items-center justify-center rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700">
            {uploadingAvatar ? "جارٍ الرفع..." : "رفع صورة"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  void uploadAvatar(file);
                }
                event.target.value = "";
              }}
              disabled={uploadingAvatar}
            />
          </label>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="full-name" className="mb-1 block text-sm font-semibold text-gray-700">
              الاسم الكامل
            </label>
            <input
              id="full-name"
              value={profileForm.full_name}
              onChange={(event) => setProfileForm((previous) => ({ ...previous, full_name: event.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-3 text-[16px] outline-none ring-primary-200 focus:ring"
            />
            {errors.full_name ? <p className="mt-1 text-sm text-red-600">{errors.full_name}</p> : null}
          </div>

          <div>
            <label htmlFor="phone" className="mb-1 block text-sm font-semibold text-gray-700">
              الهاتف
            </label>
            <input
              id="phone"
              value={profileForm.phone}
              onChange={(event) => setProfileForm((previous) => ({ ...previous, phone: event.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-3 text-[16px] outline-none ring-primary-200 focus:ring"
            />
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            disabled={savingProfile}
            onClick={() => {
              void saveProfile();
            }}
            className="min-h-[44px] rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700 disabled:opacity-60"
          >
            {savingProfile ? "جارٍ الحفظ..." : "حفظ الملف الشخصي"}
          </button>
        </div>
      </section>

      {profile.role === "school_admin" ? (
        <section className="rounded-xl bg-white p-6 shadow-md">
          <h2 className="mb-4 text-xl font-bold text-primary-700">إعدادات المدرسة</h2>

          {school ? (
            <>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label htmlFor="school-name" className="mb-1 block text-sm font-semibold text-gray-700">
                    اسم المدرسة
                  </label>
                  <input
                    id="school-name"
                    value={schoolForm.name}
                    onChange={(event) => setSchoolForm((previous) => ({ ...previous, name: event.target.value }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-3 text-[16px] outline-none ring-primary-200 focus:ring"
                  />
                  {errors.school_name ? <p className="mt-1 text-sm text-red-600">{errors.school_name}</p> : null}
                </div>

                <div>
                  <label htmlFor="school-wilaya" className="mb-1 block text-sm font-semibold text-gray-700">
                    الولاية
                  </label>
                  <input
                    id="school-wilaya"
                    value={schoolForm.wilaya}
                    onChange={(event) => setSchoolForm((previous) => ({ ...previous, wilaya: event.target.value }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-3 text-[16px] outline-none ring-primary-200 focus:ring"
                  />
                  {errors.school_wilaya ? <p className="mt-1 text-sm text-red-600">{errors.school_wilaya}</p> : null}
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="school-address" className="mb-1 block text-sm font-semibold text-gray-700">
                    العنوان
                  </label>
                  <input
                    id="school-address"
                    value={schoolForm.address}
                    onChange={(event) => setSchoolForm((previous) => ({ ...previous, address: event.target.value }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-3 text-[16px] outline-none ring-primary-200 focus:ring"
                  />
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  disabled={savingSchool}
                  onClick={() => {
                    void saveSchool();
                  }}
                  className="min-h-[44px] rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700 disabled:opacity-60"
                >
                  {savingSchool ? "جارٍ الحفظ..." : "حفظ إعدادات المدرسة"}
                </button>
              </div>
            </>
          ) : (
            <div className="rounded-lg border border-dashed border-primary-200 bg-primary-50 p-6 text-center">
              <p className="mb-4 text-gray-600">لا توجد بيانات مدرسة مرتبطة بحسابك.</p>
              <Link
                href="/onboarding"
                className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700"
              >
                إكمال بيانات المدرسة
              </Link>
            </div>
          )}
        </section>
      ) : null}
    </section>
  );
}
