"use client";

import Link from "next/link";
import { ChangeEvent, useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";

import { createClient } from "@/lib/supabase/client";
import type { UserRole } from "@/lib/types";

const supabase = createClient();

interface ProfileSettings {
  id: string;
  full_name: string;
  phone: string;
  avatar_url: string;
  role: UserRole | null;
  school_id: string | null;
}

interface SchoolSettings {
  id: string;
  name: string;
  wilaya: string;
  address: string;
  school_code: string;
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [schoolSaving, setSchoolSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const [profile, setProfile] = useState<ProfileSettings | null>(null);
  const [school, setSchool] = useState<SchoolSettings | null>(null);

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
        .select("id, full_name, phone, avatar_url, role, school_id")
        .eq("id", user.id)
        .single();

      if (profileError) {
        throw profileError;
      }

      const normalizedProfile: ProfileSettings = {
        id: profileData.id,
        full_name: profileData.full_name ?? "",
        phone: profileData.phone ?? "",
        avatar_url: profileData.avatar_url ?? "",
        role: profileData.role ?? null,
        school_id: profileData.school_id ?? null,
      };

      setProfile(normalizedProfile);
      setProfileForm({
        full_name: normalizedProfile.full_name,
        phone: normalizedProfile.phone,
        avatar_url: normalizedProfile.avatar_url,
      });

      if (normalizedProfile.role === "school_admin" && normalizedProfile.school_id) {
        const { data: schoolData, error: schoolError } = await supabase
          .from("schools")
          .select("id, name, wilaya, address, school_code")
          .eq("id", normalizedProfile.school_id)
          .single();

        if (schoolError) {
          throw schoolError;
        }

        const normalizedSchool: SchoolSettings = {
          id: schoolData.id,
          name: schoolData.name ?? "",
          wilaya: schoolData.wilaya ?? "",
          address: schoolData.address ?? "",
          school_code: schoolData.school_code ?? "",
        };

        setSchool(normalizedSchool);
        setSchoolForm({
          name: normalizedSchool.name,
          wilaya: normalizedSchool.wilaya,
          address: normalizedSchool.address,
        });
      } else {
        setSchool(null);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "تعذر تحميل الإعدادات.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const updateProfile = async () => {
    if (!profile) return;

    setProfileSaving(true);

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

      toast.success("تم تحديث الملف الشخصي.");
      await loadSettings();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "تعذر حفظ الملف الشخصي.";
      toast.error(message);
    } finally {
      setProfileSaving(false);
    }
  };

  const uploadAvatar = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !profile) return;

    setAvatarUploading(true);

    try {
      const filePath = `${profile.id}/${Date.now()}-${file.name}`;

      const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, file, {
        upsert: true,
      });

      if (uploadError) {
        throw uploadError;
      }

      const { data: publicUrlData } = supabase.storage.from("avatars").getPublicUrl(filePath);

      let updateQuery = supabase
        .from("profiles")
        .update({ avatar_url: publicUrlData.publicUrl })
        .eq("id", profile.id);

      if (profile.school_id) {
        updateQuery = updateQuery.eq("school_id", profile.school_id);
      }

      const { error: updateError } = await updateQuery;

      if (updateError) {
        throw updateError;
      }

      setProfileForm((prev) => ({ ...prev, avatar_url: publicUrlData.publicUrl }));
      toast.success("تم رفع الصورة الشخصية.");
      await loadSettings();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "تعذر رفع الصورة الشخصية.";
      toast.error(message);
    } finally {
      setAvatarUploading(false);
      event.target.value = "";
    }
  };

  const updateSchool = async () => {
    if (!school || !profile?.school_id) return;

    setSchoolSaving(true);

    try {
      const { error } = await supabase
        .from("schools")
        .update({
          name: schoolForm.name.trim(),
          wilaya: schoolForm.wilaya.trim(),
          address: schoolForm.address.trim() || null,
        })
        .eq("id", profile.school_id)
        .eq("id", school.id);

      if (error) {
        throw error;
      }

      toast.success("تم تحديث إعدادات المدرسة.");
      await loadSettings();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "تعذر تحديث بيانات المدرسة.";
      toast.error(message);
    } finally {
      setSchoolSaving(false);
    }
  };

  if (loading) {
    return (
      <section className="flex min-h-[60vh] items-center justify-center" dir="rtl">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-100 border-t-primary-600" />
      </section>
    );
  }

  if (!profile) {
    return (
      <section className="rounded-2xl bg-white p-8 text-center shadow-sm" dir="rtl">
        <h1 className="mb-3 text-2xl font-bold text-primary-700">تعذر تحميل الملف الشخصي</h1>
        <p className="mb-6 text-gray-600">حاول إعادة تسجيل الدخول.</p>
        <Link
          href="/login"
          className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-primary-600 px-5 py-2 text-white hover:bg-primary-700"
        >
          تسجيل الدخول
        </Link>
      </section>
    );
  }

  return (
    <section dir="rtl" className="space-y-5">
      <header className="rounded-2xl bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-bold text-primary-700">الإعدادات</h1>
        <p className="mt-1 text-gray-600">إدارة معلومات الحساب والمدرسة.</p>
      </header>

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-bold text-primary-700">الملف الشخصي</h2>

        <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center">
          <img
            src={profileForm.avatar_url || "/placeholder.svg"}
            alt="الصورة الشخصية"
            className="h-20 w-20 rounded-full border border-primary-100 object-cover"
          />
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700" htmlFor="avatar-upload">
              الصورة الشخصية
            </label>
            <input
              id="avatar-upload"
              type="file"
              accept="image/*"
              onChange={uploadAvatar}
              className="block text-[16px] file:ml-3 file:min-h-[44px] file:rounded-lg file:border-0 file:bg-primary-600 file:px-4 file:py-2 file:text-white hover:file:bg-primary-700"
            />
            <p className="mt-2 text-xs text-gray-500">
              {avatarUploading ? "جار رفع الصورة..." : "يتم حفظ الصورة داخل bucket: avatars"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700" htmlFor="full-name">
              الاسم الكامل
            </label>
            <input
              id="full-name"
              value={profileForm.full_name}
              onChange={(event) => setProfileForm((prev) => ({ ...prev, full_name: event.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-3 text-[16px] outline-none ring-primary-200 transition focus:ring"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700" htmlFor="phone">
              رقم الهاتف
            </label>
            <input
              id="phone"
              value={profileForm.phone}
              onChange={(event) => setProfileForm((prev) => ({ ...prev, phone: event.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-3 text-[16px] outline-none ring-primary-200 transition focus:ring"
            />
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={() => {
              void updateProfile();
            }}
            disabled={profileSaving}
            className="min-h-[44px] rounded-lg bg-primary-600 px-5 py-2 text-white hover:bg-primary-700 disabled:cursor-not-allowed"
          >
            {profileSaving ? "جار الحفظ..." : "حفظ الملف الشخصي"}
          </button>
        </div>
      </section>

      {profile.role === "school_admin" ? (
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-bold text-primary-700">إعدادات المدرسة</h2>

          {school ? (
            <>
              <p className="mb-4 rounded-lg bg-primary-50 p-3 text-sm text-primary-700">رمز المدرسة: {school.school_code}</p>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-700" htmlFor="school-name">
                    اسم المدرسة
                  </label>
                  <input
                    id="school-name"
                    value={schoolForm.name}
                    onChange={(event) => setSchoolForm((prev) => ({ ...prev, name: event.target.value }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-3 text-[16px] outline-none ring-primary-200 transition focus:ring"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-700" htmlFor="school-wilaya">
                    الولاية
                  </label>
                  <input
                    id="school-wilaya"
                    value={schoolForm.wilaya}
                    onChange={(event) => setSchoolForm((prev) => ({ ...prev, wilaya: event.target.value }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-3 text-[16px] outline-none ring-primary-200 transition focus:ring"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-semibold text-gray-700" htmlFor="school-address">
                    العنوان
                  </label>
                  <input
                    id="school-address"
                    value={schoolForm.address}
                    onChange={(event) => setSchoolForm((prev) => ({ ...prev, address: event.target.value }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-3 text-[16px] outline-none ring-primary-200 transition focus:ring"
                  />
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    void updateSchool();
                  }}
                  disabled={schoolSaving}
                  className="min-h-[44px] rounded-lg bg-primary-600 px-5 py-2 text-white hover:bg-primary-700 disabled:cursor-not-allowed"
                >
                  {schoolSaving ? "جار التحديث..." : "حفظ إعدادات المدرسة"}
                </button>
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-dashed border-primary-200 bg-primary-50/40 p-5 text-center">
              <p className="mb-4 text-gray-600">لا توجد بيانات مدرسة مرتبطة بحساب الإدارة.</p>
              <Link
                href="/onboarding"
                className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700"
              >
                إضافة بيانات المدرسة
              </Link>
            </div>
          )}
        </section>
      ) : (
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-2 text-lg font-bold text-primary-700">إعدادات المدرسة</h2>
          <p className="text-gray-600">هذا القسم متاح فقط لحساب مدير المدرسة.</p>
        </section>
      )}
    </section>
  );
}
