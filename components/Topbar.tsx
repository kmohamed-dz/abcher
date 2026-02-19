"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Search } from "lucide-react";

import NotificationBell from "@/components/NotificationBell";
import { createClient } from "@/lib/supabase/client";

interface UserInfo {
  full_name: string | null;
  role: string | null;
}

const supabase = createClient();

export default function Topbar() {
  const [userName, setUserName] = useState("المستخدم");
  const [role, setRole] = useState("-");

  useEffect(() => {
    const loadUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("full_name, role")
        .eq("id", user.id)
        .maybeSingle<UserInfo>();

      if (data?.full_name) {
        setUserName(data.full_name);
      }

      if (data?.role) {
        setRole(data.role);
      }
    };

    void loadUser();
  }, []);

  return (
    <header dir="rtl" className="sticky top-0 z-30 border-b border-primary-100 bg-white/95 px-4 py-3 backdrop-blur md:px-6">
      <div className="flex items-center justify-between gap-4">
        <div className="relative w-full max-w-lg">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            placeholder="بحث سريع..."
            className="min-h-[44px] w-full rounded-xl border border-gray-200 bg-white py-2 pr-10 pl-3 text-[16px] outline-none ring-brand-600/20 focus:ring"
          />
        </div>

        <div className="flex items-center gap-3">
          <NotificationBell />

          <Link href="/dashboard/settings" className="hidden min-h-[44px] items-center rounded-xl border border-primary-100 px-3 text-right sm:flex">
            <div>
              <p className="text-sm font-semibold text-gray-900">{userName}</p>
              <p className="text-xs text-gray-500">{role}</p>
            </div>
          </Link>
        </div>
      </div>
    </header>
  );
}
