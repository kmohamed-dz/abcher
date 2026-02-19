"use client";

import type { ReactNode } from "react";

import MobileNav from "@/components/MobileNav";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";

export default function DashboardLayout({ children }: { children: ReactNode }) {
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
