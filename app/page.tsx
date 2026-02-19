import Link from "next/link";
import { BookOpenCheck, ChartNoAxesCombined, MessageCircle, Users } from "lucide-react";

const features = [
  {
    title: "إدارة الطلبة",
    description: "ملفات متكاملة للطلبة مع المستويات وولي الأمر والمتابعة اليومية.",
    icon: Users,
  },
  {
    title: "الحضور الذكي",
    description: "تسجيل الحضور والغياب والتأخر بسرعة مع تقارير دقيقة ومباشرة.",
    icon: BookOpenCheck,
  },
  {
    title: "نتائج وتقارير",
    description: "لوحات قياس واضحة لمعدلات الأداء والغياب والواجبات والاختبارات.",
    icon: ChartNoAxesCombined,
  },
  {
    title: "تواصل فوري",
    description: "رسائل داخلية بين الإدارة والمعلمين والأولياء في بيئة آمنة.",
    icon: MessageCircle,
  },
];

const steps = [
  "أنشئ حساب المدرسة أو اربط حسابك بمدرسة موجودة.",
  "أضف الطلبة والمعلمين واضبط المستويات والإعدادات.",
  "ابدأ إدارة الحضور والواجبات والنتائج والتواصل اليومي.",
];

export default function LandingPage() {
  return (
    <main dir="rtl" className="min-h-screen bg-beige-100 text-gray-900">
      <section className="pattern-bg border-b border-primary-100">
        <div className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <p className="mb-4 text-sm font-semibold text-primary-700">أبشر لإدارة المدارس القرآنية</p>
            <h1 className="mb-6 text-3xl font-extrabold leading-tight text-primary-700 md:text-5xl">
              منصة عربية شاملة لإدارة المدرسة القرآنية
            </h1>
            <p className="mb-8 text-base leading-8 text-gray-700 md:text-lg">
              من التسجيل حتى التقارير النهائية، أبشر يساعد الإدارة والمعلمين على تنظيم العمل اليومي في بيئة
              عربية RTL واضحة وسهلة.
            </p>
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/register"
                className="min-h-[44px] rounded-lg bg-primary-600 px-6 py-3 text-base font-semibold text-white transition hover:bg-primary-700"
              >
                إنشاء حساب
              </Link>
              <Link
                href="/login"
                className="min-h-[44px] rounded-lg border border-primary-600 bg-white px-6 py-3 text-base font-semibold text-primary-700 transition hover:bg-primary-50"
              >
                تسجيل الدخول
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 md:px-6 md:py-16">
        <h2 className="mb-8 text-center text-2xl font-bold text-primary-700 md:text-3xl">مزايا النظام</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {features.map(({ title, description, icon: Icon }) => (
            <article key={title} className="rounded-xl bg-white p-6 shadow-md">
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary-100 text-primary-700">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mb-2 text-lg font-bold text-gray-900">{title}</h3>
              <p className="leading-7 text-gray-600">{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 md:px-6 md:pb-24">
        <div className="rounded-xl bg-white p-6 shadow-md md:p-8">
          <h2 className="mb-5 text-2xl font-bold text-primary-700">كيف يعمل أبشر؟</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {steps.map((step, index) => (
              <div key={step} className="rounded-lg border border-primary-100 bg-beige-50 p-4">
                <p className="mb-2 text-sm font-bold text-primary-700">الخطوة {index + 1}</p>
                <p className="leading-7 text-gray-700">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-primary-100 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-sm text-gray-600 md:flex-row md:items-center md:justify-between md:px-6">
          <p>© {new Date().getFullYear()} أبشر. جميع الحقوق محفوظة.</p>
          <div className="flex items-center gap-4">
            <Link href="/login" className="hover:text-primary-700">
              دخول
            </Link>
            <Link href="/register" className="hover:text-primary-700">
              تسجيل
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
