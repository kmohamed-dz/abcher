"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

import MobileNav from "@/components/MobileNav";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import { getCurrentProfile } from "@/lib/getCurrentProfile";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const hasCheckedRef = useRef(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (hasCheckedRef.current) {
      return;
    }

    hasCheckedRef.current = true;

    const guard = async () => {
      try {
        const { user, profile } = await getCurrentProfile();

        if (!user) {
          router.replace("/login");
          return;
        }

        if (!profile?.school_id) {
          toast("أكمل إعداد الحساب أولًا للمتابعة إلى لوحة التحكم.", {
            id: "dashboard-missing-school",
          });
          router.replace("/onboarding");
          return;
        }

        setReady(true);
      } catch (error) {
        const message = error instanceof Error ? error.message : "تعذر تحميل بيانات الحساب.";
        console.warn("[auth:dashboard-guard]", message);
        toast.error(`تعذر التحقق من الحساب. (${message})`, {
          id: "dashboard-guard-error",
        });
        router.replace("/onboarding");
      }
    };

    void guard();
  }, [router]);

  if (!ready) {
    return (
      <section dir="rtl" className="flex min-h-screen items-center justify-center bg-app">
        <div className="h-11 w-11 animate-spin rounded-full border-4 border-primary-100 border-t-primary-600" />
      </section>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-app">
      <div className="mx-auto flex min-h-screen w-full max-w-[1600px]">
        <aside className="hidden border-l border-primary-100 lg:block lg:w-72">
          <Sidebar />
        </aside>

        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <Topbar />
          <main className="flex-1 px-4 py-5 pb-24 md:px-6 md:py-6 md:pb-6">{children}</main>
        </div>
      </div>

      <MobileNav />
    </div>
  );
}
