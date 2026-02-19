import Link from "next/link";
import { BarChart3, BookOpen, MessagesSquare, Users } from "lucide-react";

const features = [
  {
    title: "إدارة متكاملة للطلبة",
    description: "تسجيل الطلبة وتتبع مستواهم وملفاتهم بسهولة داخل لوحة واحدة.",
    icon: Users,
  },
  {
    title: "متابعة الحضور يوميًا",
    description: "توثيق حضور الطلبة وتأخرهم وغيابهم مع تقارير دقيقة وفورية.",
    icon: BookOpen,
  },
  {
    title: "تقارير واضحة",
    description: "قراءة مؤشرات الأداء بسرعة ومشاركة النتائج مع الإدارة والأولياء.",
    icon: BarChart3,
  },
  {
    title: "تواصل لحظي",
    description: "إرسال رسائل مباشرة بين الإدارة والمعلمين ضمن بيئة مدرسية آمنة.",
    icon: MessagesSquare,
  },
];

const steps = [
  "سجّل حساب المدرسة وأكمل بيانات المؤسسة.",
  "أضف الطلبة والمعلمين وحدد المستويات الدراسية.",
  "ابدأ إدارة الحضور والواجبات والنتائج من لوحة التحكم.",
];

export default function LandingPage() {
  return (
    <main dir="rtl" className="min-h-screen bg-beige-100 text-gray-900">
      <section className="pattern-bg border-b border-primary-100">
        <div className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <p className="mb-4 text-sm font-semibold text-primary-700">منصة أبشر لإدارة المدارس القرآنية</p>
            <h1 className="mb-6 text-3xl font-extrabold leading-tight text-primary-700 md:text-5xl">
              إدارة مدرستك القرآنية بذكاء ووضوح
            </h1>
            <p className="mb-8 text-base leading-8 text-gray-700 md:text-lg">
              أبشر يوفر لك كل ما تحتاجه لإدارة الطلبة والمعلمين والحضور والنتائج والتواصل اليومي من مكان
              واحد، وبواجهة عربية مصممة للمدارس القرآنية.
            </p>
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/register"
                className="min-h-[44px] rounded-lg bg-primary-600 px-6 py-3 text-base font-semibold text-white transition hover:bg-primary-700"
              >
                إنشاء حساب المدرسة
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
        <h2 className="mb-8 text-center text-2xl font-bold text-primary-700 md:text-3xl">مميزات أبشر الأساسية</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {features.map(({ title, description, icon: Icon }) => (
            <article key={title} className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-primary-50">
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
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-primary-50 md:p-8">
          <h2 className="mb-4 text-2xl font-bold text-primary-700">كيف يعمل النظام؟</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {steps.map((step, index) => (
              <div key={step} className="rounded-xl border border-primary-100 bg-beige-50 p-4">
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
              الدخول
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
