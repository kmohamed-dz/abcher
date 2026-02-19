"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import toast from "react-hot-toast";

import { createClient } from "@/lib/supabase/client";
import { formatDateTime } from "@/lib/utils";

interface ProfileContext {
  school_id: string | null;
}

interface NotificationItem {
  id: string;
  school_id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

const supabase = createClient();

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const loadNotifications = useCallback(async () => {
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setSchoolId(null);
        setNotifications([]);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("school_id")
        .eq("id", user.id)
        .single<ProfileContext>();

      if (profileError) {
        throw profileError;
      }

      if (!profile?.school_id) {
        setSchoolId(null);
        setNotifications([]);
        return;
      }

      setSchoolId(profile.school_id);

      const { data, error } = await supabase
        .from("notifications")
        .select("id,school_id,title,message,is_read,created_at")
        .eq("school_id", profile.school_id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) {
        throw error;
      }

      setNotifications((data as NotificationItem[]) ?? []);
    } catch (error) {
      const message = error instanceof Error ? error.message : "تعذر تحميل الإشعارات.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      void loadNotifications();
    }
  }, [open, loadNotifications]);

  useEffect(() => {
    const onDocumentClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", onDocumentClick);
    return () => document.removeEventListener("mousedown", onDocumentClick);
  }, []);

  const unreadCount = notifications.filter((entry) => !entry.is_read).length;

  const markAsRead = async (notification: NotificationItem) => {
    if (!schoolId || notification.is_read) {
      return;
    }

    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notification.id)
        .eq("school_id", schoolId);

      if (error) {
        throw error;
      }

      setNotifications((previous) =>
        previous.map((item) => (item.id === notification.id ? { ...item, is_read: true } : item)),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "تعذر تحديث الإشعار.";
      toast.error(message);
    }
  };

  return (
    <div ref={containerRef} dir="rtl" className="relative">
      <button
        type="button"
        onClick={() => setOpen((previous) => !previous)}
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
        <div className="absolute left-0 z-50 mt-2 w-80 rounded-xl border border-primary-100 bg-white p-3 shadow-md">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-bold text-primary-700">الإشعارات</h3>
            <button type="button" onClick={() => setOpen(false)} className="text-xs text-gray-500 hover:text-gray-700">
              إغلاق
            </button>
          </div>

          {loading ? (
            <div className="flex min-h-[150px] items-center justify-center">
              <div className="h-9 w-9 animate-spin rounded-full border-4 border-primary-100 border-t-primary-600" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="rounded-lg border border-dashed border-primary-200 bg-primary-50 p-4 text-center">
              <p className="mb-3 text-sm text-gray-600">لا توجد إشعارات حالية.</p>
              <Link
                href="/dashboard/messages"
                className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-primary-600 px-4 py-2 text-sm text-white hover:bg-primary-700"
              >
                فتح الرسائل
              </Link>
            </div>
          ) : (
            <ul className="max-h-80 space-y-2 overflow-y-auto">
              {notifications.map((notification) => (
                <li key={notification.id}>
                  <button
                    type="button"
                    onClick={() => {
                      void markAsRead(notification);
                    }}
                    className={`w-full rounded-lg border px-3 py-2 text-right ${
                      notification.is_read
                        ? "border-gray-100 bg-white"
                        : "border-primary-200 bg-primary-50"
                    }`}
                  >
                    <p className="font-semibold text-gray-900">{notification.title}</p>
                    <p className="mt-1 text-sm text-gray-600">{notification.message}</p>
                    <p className="mt-1 text-xs text-gray-500">{formatDateTime(notification.created_at)}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
