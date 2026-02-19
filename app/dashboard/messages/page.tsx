"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";

import { createClient } from "@/lib/supabase/client";
import { formatDateTime } from "@/lib/utils";

interface ProfileContext {
  school_id: string | null;
  full_name: string | null;
}

interface SchoolUser {
  id: string;
  full_name: string;
  role: string | null;
}

interface MessageItem {
  id: string;
  school_id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
}

const supabase = createClient();

export default function MessagesPage() {
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [currentUserName, setCurrentUserName] = useState<string>("مستخدم");
  const [users, setUsers] = useState<SchoolUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const listEndRef = useRef<HTMLDivElement | null>(null);

  const selectedUser = useMemo(() => users.find((user) => user.id === selectedUserId) ?? null, [selectedUserId, users]);

  const loadContext = useCallback(async () => {
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("يرجى تسجيل الدخول أولًا.");
      }

      setCurrentUserId(user.id);

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("school_id, full_name")
        .eq("id", user.id)
        .single<ProfileContext>();

      if (profileError) {
        throw profileError;
      }

      if (!profile?.school_id) {
        setSchoolId(null);
        setUsers([]);
        setMessages([]);
        return;
      }

      setSchoolId(profile.school_id);
      setCurrentUserName(profile.full_name || "مستخدم");

      const { data: usersData, error: usersError } = await supabase
        .from("profiles")
        .select("id, full_name, role")
        .eq("school_id", profile.school_id)
        .neq("id", user.id)
        .order("full_name", { ascending: true });

      if (usersError) {
        throw usersError;
      }

      const list = ((usersData as SchoolUser[]) ?? []).map((entry) => ({
        id: entry.id,
        full_name: entry.full_name || "مستخدم",
        role: entry.role,
      }));

      setUsers(list);
      setSelectedUserId((previous) => previous || list[0]?.id || "");
    } catch (error) {
      const message = error instanceof Error ? error.message : "تعذر تحميل الرسائل.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadThread = useCallback(async () => {
    if (!schoolId || !currentUserId || !selectedUserId) {
      setMessages([]);
      return;
    }

    try {
      const filter = `and(sender_id.eq.${currentUserId},receiver_id.eq.${selectedUserId}),and(sender_id.eq.${selectedUserId},receiver_id.eq.${currentUserId})`;

      const { data, error } = await supabase
        .from("messages")
        .select("id,school_id,sender_id,receiver_id,content,created_at")
        .eq("school_id", schoolId)
        .or(filter)
        .order("created_at", { ascending: true });

      if (error) {
        throw error;
      }

      setMessages((data as MessageItem[]) ?? []);
    } catch (error) {
      const message = error instanceof Error ? error.message : "تعذر تحميل المحادثة.";
      toast.error(message);
    }
  }, [schoolId, currentUserId, selectedUserId]);

  useEffect(() => {
    void loadContext();
  }, [loadContext]);

  useEffect(() => {
    void loadThread();
  }, [loadThread]);

  useEffect(() => {
    if (!schoolId) return;

    const channel = supabase
      .channel(`messages-${schoolId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `school_id=eq.${schoolId}`,
        },
        (payload) => {
          const incoming = payload.new as MessageItem;

          const inCurrentThread =
            (incoming.sender_id === currentUserId && incoming.receiver_id === selectedUserId) ||
            (incoming.sender_id === selectedUserId && incoming.receiver_id === currentUserId);

          if (!inCurrentThread) {
            return;
          }

          setMessages((previous) => {
            if (previous.some((entry) => entry.id === incoming.id)) {
              return previous;
            }

            return [...previous, incoming];
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [schoolId, currentUserId, selectedUserId]);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    const text = newMessage.trim();

    if (!text) {
      toast.error("اكتب الرسالة أولًا.");
      return;
    }

    if (!schoolId || !selectedUserId) {
      toast.error("اختر محادثة أولًا.");
      return;
    }

    setSending(true);

    try {
      const { error } = await supabase.from("messages").insert([
        {
          school_id: schoolId,
          sender_id: currentUserId,
          receiver_id: selectedUserId,
          content: text,
          sender_name: currentUserName,
        },
      ]);

      if (error) {
        throw error;
      }

      setNewMessage("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "تعذر إرسال الرسالة.";
      toast.error(message);
    } finally {
      setSending(false);
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
        <p className="mb-6 text-gray-600">أكمل الإعداد حتى تتمكن من استخدام الرسائل.</p>
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
        <h1 className="text-2xl font-bold text-primary-700">الرسائل</h1>
        <p className="mt-2 text-gray-600">تواصل مباشر داخل المدرسة في الوقت الحقيقي.</p>
      </header>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <aside className="rounded-xl bg-white p-4 shadow-md lg:col-span-1">
          <h2 className="mb-3 text-lg font-bold text-primary-700">المحادثات</h2>

          {users.length === 0 ? (
            <div className="rounded-lg border border-dashed border-primary-200 bg-primary-50 p-4 text-center">
              <p className="mb-3 text-sm text-gray-600">لا يوجد مستخدمون ضمن المدرسة.</p>
              <Link
                href="/dashboard/settings"
                className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-primary-600 px-4 py-2 text-sm text-white hover:bg-primary-700"
              >
                تحديث الإعدادات
              </Link>
            </div>
          ) : (
            <ul className="space-y-2">
              {users.map((user) => (
                <li key={user.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedUserId(user.id)}
                    className={`w-full min-h-[44px] rounded-lg px-3 py-2 text-right ${
                      selectedUserId === user.id
                        ? "bg-primary-600 text-white"
                        : "bg-beige-50 text-gray-800 hover:bg-primary-50"
                    }`}
                  >
                    <p className="font-semibold">{user.full_name}</p>
                    <p className={`text-xs ${selectedUserId === user.id ? "text-primary-100" : "text-gray-500"}`}>
                      {user.role || "مستخدم"}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <div className="rounded-xl bg-white p-4 shadow-md lg:col-span-2">
          {selectedUser ? (
            <>
              <div className="mb-3 border-b border-gray-100 pb-3">
                <p className="font-bold text-primary-700">{selectedUser.full_name}</p>
                <p className="text-xs text-gray-500">{selectedUser.role || "مستخدم"}</p>
              </div>

              <div className="h-[420px] space-y-3 overflow-y-auto rounded-lg bg-beige-50 p-3">
                {messages.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-center text-gray-600">
                    لا توجد رسائل في هذه المحادثة بعد.
                  </div>
                ) : (
                  messages.map((message) => {
                    const mine = message.sender_id === currentUserId;

                    return (
                      <article key={message.id} className={`flex ${mine ? "justify-start" : "justify-end"}`}>
                        <div
                          className={`max-w-[80%] rounded-xl px-4 py-3 text-sm ${
                            mine ? "bg-primary-600 text-white" : "bg-white text-gray-800"
                          }`}
                        >
                          <p className="leading-7">{message.content}</p>
                          <p className={`mt-1 text-xs ${mine ? "text-primary-100" : "text-gray-500"}`}>
                            {formatDateTime(message.created_at)}
                          </p>
                        </div>
                      </article>
                    );
                  })
                )}
                <div ref={listEndRef} />
              </div>

              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(event) => setNewMessage(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void sendMessage();
                    }
                  }}
                  className="w-full rounded-lg border border-gray-200 px-3 py-3 text-[16px] outline-none ring-primary-200 focus:ring"
                  placeholder="اكتب رسالتك هنا"
                />
                <button
                  type="button"
                  disabled={sending}
                  onClick={() => {
                    void sendMessage();
                  }}
                  className="min-h-[44px] rounded-lg bg-primary-600 px-5 py-2 text-white hover:bg-primary-700 disabled:opacity-60"
                >
                  {sending ? "جارٍ الإرسال..." : "إرسال"}
                </button>
              </div>
            </>
          ) : (
            <div className="flex h-[420px] items-center justify-center rounded-lg bg-beige-50 text-center text-gray-600">
              اختر محادثة من القائمة لعرض الرسائل.
            </div>
          )}
        </div>
      </section>
    </section>
  );
}
