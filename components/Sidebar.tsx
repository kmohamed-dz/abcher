"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpenCheck,
  ChartColumn,
  ClipboardCheck,
  Home,
  Library,
  MessageSquare,
  Settings,
  ShieldCheck,
  Trophy,
  Users,
} from "lucide-react";

import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "الرئيسية", icon: Home },
  { href: "/dashboard/teachers", label: "المعلمون", icon: Users },
  { href: "/dashboard/attendance", label: "الحضور", icon: ClipboardCheck },
  { href: "/dashboard/homework", label: "الواجبات", icon: BookOpenCheck },
  { href: "/dashboard/results", label: "النتائج", icon: Trophy },
  { href: "/dashboard/messages", label: "الرسائل", icon: MessageSquare },
  { href: "/dashboard/reports", label: "التقارير", icon: ChartColumn },
  { href: "/dashboard/library", label: "المكتبة", icon: Library },
  { href: "/dashboard/authority", label: "الجهة الوصية", icon: ShieldCheck },
  { href: "/dashboard/settings", label: "الإعدادات", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <div dir="rtl" className="sticky top-0 flex h-screen flex-col bg-white px-4 py-6">
      <div className="mb-6 px-2">
        <p className="text-xs font-semibold text-primary-700">نظام الإدارة</p>
        <h2 className="mt-1 text-2xl font-extrabold text-brand-700">أبشر</h2>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-h-[44px] items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition",
                active
                  ? "bg-brand-600 text-white shadow-md"
                  : "text-gray-700 hover:bg-primary-50 hover:text-brand-700",
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-4 rounded-2xl bg-primary-50 p-3 text-xs leading-6 text-gray-600">
        واجهة إدارة المدرسة القرآنية بوضوح وسهولة.
      </div>
    </div>
  );
}
