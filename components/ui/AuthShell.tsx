import Link from "next/link";
import { type ReactNode } from "react";

import Card from "@/components/ui/Card";

interface AuthShellProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}

export default function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <main dir="rtl" className="min-h-screen bg-app">
      <div className="grid min-h-screen lg:grid-cols-2">
        <section className="relative overflow-hidden bg-brand-600 bg-mosque-pattern p-6 text-white lg:p-10">
          <div className="mx-auto flex h-full w-full max-w-xl flex-col justify-between">
            <div className="rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-sm text-white/90">منصة المدارس القرآنية</p>
              <h2 className="mt-2 text-2xl font-extrabold">إدارة مدرسية بطابع عربي واضح</h2>
            </div>

            <div className="relative hidden h-64 lg:block">
              <div className="absolute bottom-0 right-0 h-40 w-40 rounded-t-full border-2 border-white/25" />
              <div className="absolute bottom-0 right-20 h-56 w-56 rounded-t-full border-2 border-white/20" />
              <div className="absolute bottom-0 right-44 h-32 w-32 rounded-t-full border-2 border-white/20" />
              <div className="absolute bottom-0 left-12 h-20 w-16 rounded-t-full bg-white/10" />
              <div className="absolute bottom-20 left-[5.25rem] h-8 w-2 bg-white/30" />
            </div>
          </div>
        </section>

        <section className="relative flex items-center justify-center px-4 py-8 md:px-8">
          <Link href="/" className="absolute right-6 top-6 text-xl font-extrabold text-brand-700">
            أبشر
          </Link>

          <Card className="w-full max-w-[480px] bg-[#FFFCF7] p-6 md:p-8">
            <header className="mb-6 space-y-2 text-center">
              <h1 className="text-2xl font-extrabold text-brand-700 md:text-3xl">{title}</h1>
              {subtitle ? <p className="text-sm leading-7 text-gray-600">{subtitle}</p> : null}
            </header>

            <div className="space-y-4">{children}</div>

            {footer ? <footer className="mt-6 text-center text-sm text-gray-600">{footer}</footer> : null}
          </Card>
        </section>
      </div>
    </main>
  );
}
