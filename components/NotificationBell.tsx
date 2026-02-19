"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import toast from "react-hot-toast";

import { createClient } from "@/lib/supabase/client";
import { formatDateTime } from "@/lib/utils";

const supabase = createClient();

interface NotificationItem {
  id: string;
  school_id: string;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [schoolId, setSchoolId] = useState<string>("");
  const ref = useRef<HTMLDivElement | null>(null);

  const loadNotifications = useCallback(async () => {
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setNotifications([]);
        return;
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
        setNotifications([]);
        return;
      }

      setSchoolId(activeSchoolId);

      const { data, error } = await supabase
        .from("notifications")
        .select("id, school_id, title, body, is_read, created_at")
        .eq("school_id", activeSchoolId)
        .order("created_at", { ascending: false })
        .limit(8);

      if (error) {
        throw error;
      }

      setNotifications((data as NotificationItem[]) ?? []);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "تعذر تحميل الإشعارات.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!open) return;
    void loadNotifications();
  }, [open, loadNotifications]);

  const unreadCount = notifications.filter((item) => !item.is_read).length;

  return (
    <div ref={ref} className="relative" dir="rtl">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="relative inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-primary-100 bg-white text-gray-700 hover:bg-primary-50"
        aria-label="الإشعارات"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 ? (
          <span className="absolute -left-1 -top-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
            {unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute left-0 z-50 mt-2 w-80 rounded-2xl border border-primary-100 bg-white p-3 shadow-xl">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-bold text-primary-700">الإشعارات</h3>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              إغلاق
            </button>
          </div>

          {loading ? (
            <div className="flex min-h-[140px] items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-100 border-t-primary-600" />
            </div>
          ) : !schoolId || notifications.length === 0 ? (
            <div className="rounded-xl border border-dashed border-primary-200 bg-primary-50/40 p-4 text-center">
              <p className="mb-3 text-sm text-gray-600">لا توجد إشعارات جديدة.</p>
              <Link
                href="/dashboard/messages"
                className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-primary-600 px-4 py-2 text-sm text-white hover:bg-primary-700"
              >
                الذهاب للرسائل
              </Link>
            </div>
          ) : (
            <ul className="max-h-80 space-y-2 overflow-y-auto">
              {notifications.map((notification) => (
                <li key={notification.id} className="rounded-lg border border-gray-100 p-3">
                  <p className="font-semibold text-gray-900">{notification.title}</p>
                  <p className="mt-1 text-sm text-gray-600">{notification.body}</p>
                  <p className="mt-2 text-xs text-gray-500">{formatDateTime(notification.created_at)}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
