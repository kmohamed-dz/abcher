"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";

import { createClient } from "@/lib/supabase/client";
import { formatDateTime } from "@/lib/utils";

const supabase = createClient();

interface MessageItem {
  id: string;
  school_id: string;
  sender_id: string;
  sender_name: string;
  content: string;
  created_at: string;
}

export default function MessagesPage() {
  const [schoolId, setSchoolId] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const [senderName, setSenderName] = useState<string>("مستخدم");
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const loadMessages = useCallback(async () => {
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
        .select("school_id, full_name")
        .eq("id", user.id)
        .single();

      if (profileError) {
        throw profileError;
      }

      const activeSchoolId = profile?.school_id;
      if (!activeSchoolId) {
        setSchoolId("");
        setMessages([]);
        return;
      }

      setSchoolId(activeSchoolId);
      setSenderName(profile?.full_name ?? "مستخدم");

      const { data, error } = await supabase
        .from("messages")
        .select("id, school_id, sender_id, sender_name, content, created_at")
        .eq("school_id", activeSchoolId)
        .order("created_at", { ascending: true })
        .limit(200);

      if (error) {
        throw error;
      }

      setMessages((data as MessageItem[]) ?? []);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "تعذر تحميل الرسائل.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    if (!schoolId) return;

    const channel = supabase
      .channel(`messages:${schoolId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `school_id=eq.${schoolId}`,
        },
        (payload) => {
          const message = payload.new as MessageItem;

          setMessages((prev) => {
            if (prev.some((item) => item.id === message.id)) {
              return prev;
            }

            return [...prev, message];
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [schoolId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sortedMessages = useMemo(() => {
    return [...messages].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [messages]);

  const sendMessage = async () => {
    const text = content.trim();

    if (!text) {
      toast.error("اكتب الرسالة قبل الإرسال.");
      return;
    }

    if (!schoolId || !userId) {
      toast.error("لا يمكن الإرسال بدون بيانات المدرسة والمستخدم.");
      return;
    }

    setSending(true);

    try {
      const { data, error } = await supabase
        .from("messages")
        .insert([
          {
            school_id: schoolId,
            sender_id: userId,
            sender_name: senderName,
            content: text,
          },
        ])
        .select("id, school_id, sender_id, sender_name, content, created_at")
        .single();

      if (error) {
        throw error;
      }

      if (data) {
        const inserted = data as MessageItem;
        setMessages((prev) => {
          if (prev.some((item) => item.id === inserted.id)) {
            return prev;
          }

          return [...prev, inserted];
        });
      }

      setContent("");
      toast.success("تم إرسال الرسالة.");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "تعذر إرسال الرسالة.";
      toast.error(message);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <section className="flex min-h-[60vh] items-center justify-center" dir="rtl">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-100 border-t-primary-600" />
      </section>
    );
  }

  if (!schoolId) {
    return (
      <section className="rounded-2xl bg-white p-8 text-center shadow-sm" dir="rtl">
        <h1 className="mb-3 text-2xl font-bold text-primary-700">لا يمكن فتح الرسائل الآن</h1>
        <p className="mb-6 text-gray-600">يرجى ربط حسابك بمدرسة أولًا.</p>
        <Link
          href="/onboarding"
          className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-primary-600 px-5 py-2 text-white hover:bg-primary-700"
        >
          إكمال الربط
        </Link>
      </section>
    );
  }

  return (
    <section dir="rtl" className="space-y-5">
      <header className="rounded-2xl bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-bold text-primary-700">الرسائل المدرسية</h1>
        <p className="mt-1 text-gray-600">تواصل مباشر وفوري بين أعضاء المدرسة.</p>
      </header>

      <section className="rounded-2xl bg-white shadow-sm">
        <div className="h-[58vh] overflow-y-auto p-4">
          {sortedMessages.length === 0 ? (
            <div className="mt-16 text-center">
              <p className="mb-4 text-gray-600">لا توجد رسائل بعد.</p>
              <button
                type="button"
                onClick={() => setContent("السلام عليكم، نبدأ المحادثة هنا.")}
                className="min-h-[44px] rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700"
              >
                ابدأ أول رسالة
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedMessages.map((message) => {
                const mine = message.sender_id === userId;

                return (
                  <article key={message.id} className={`flex ${mine ? "justify-start" : "justify-end"}`}>
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-7 md:max-w-[70%] ${
                        mine ? "bg-primary-600 text-white" : "bg-beige-50 text-gray-800 ring-1 ring-primary-100"
                      }`}
                    >
                      <p className={`mb-1 text-xs font-semibold ${mine ? "text-primary-100" : "text-primary-700"}`}>
                        {message.sender_name}
                      </p>
                      <p>{message.content}</p>
                      <p className={`mt-2 text-[11px] ${mine ? "text-primary-100" : "text-gray-500"}`}>
                        {formatDateTime(message.created_at)}
                      </p>
                    </div>
                  </article>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <div className="border-t border-primary-100 p-4">
          <div className="flex flex-col gap-2 md:flex-row">
            <input
              type="text"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void sendMessage();
                }
              }}
              placeholder="اكتب رسالتك هنا"
              className="w-full rounded-lg border border-gray-200 px-3 py-3 text-[16px] outline-none ring-primary-200 transition focus:ring"
            />
            <button
              type="button"
              onClick={() => {
                void sendMessage();
              }}
              disabled={sending}
              className="min-h-[44px] rounded-lg bg-primary-600 px-5 py-2 text-white hover:bg-primary-700 disabled:cursor-not-allowed"
            >
              {sending ? "جار الإرسال..." : "إرسال"}
            </button>
          </div>
        </div>
      </section>
    </section>
  );
}
