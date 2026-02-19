"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardCheck, Home, MessageSquare, Settings, Users } from "lucide-react";

import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "الرئيسية", icon: Home },
  { href: "/dashboard/students", label: "الطلبة", icon: Users },
  { href: "/dashboard/attendance", label: "الحضور", icon: ClipboardCheck },
  { href: "/dashboard/messages", label: "الرسائل", icon: MessageSquare },
  { href: "/dashboard/settings", label: "الإعدادات", icon: Settings },
];

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <nav dir="rtl" className="fixed inset-x-0 bottom-0 z-40 border-t border-primary-100 bg-white md:hidden">
      <ul className="grid grid-cols-5">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex min-h-[44px] flex-col items-center justify-center gap-1 py-2 text-xs font-semibold",
                  active ? "text-brand-600" : "text-gray-500",
                )}
              >
                <Icon className={cn("h-4 w-4", active ? "text-brand-600" : "text-gray-500")} />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
