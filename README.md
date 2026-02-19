# أبشر - نظام إدارة المدارس القرآنية

منصة SaaS عربية RTL مبنية بـ **Next.js 14 + TypeScript + Tailwind CSS + Supabase** لإدارة الطلبة والمعلمين والحضور والواجبات والنتائج والرسائل.

## 1) استنساخ المشروع
```bash
git clone https://github.com/kmohamed-dz/abcher.git
cd abcher
```

## 2) تثبيت الحزم
```bash
npm install
```

## 3) إعداد قاعدة بيانات Supabase
1. افتح مشروع Supabase.
2. ادخل إلى **SQL Editor**.
3. نفّذ ملف `SUPABASE_SETUP.sql` بالكامل.
4. تأكد من إنشاء Bucketين:
- `avatars`
- `library`

## 4) إعداد متغيرات البيئة
انسخ الملف المثال ثم أضف القيم الصحيحة من لوحة Supabase:

```bash
cp .env.local.example .env.local
```

الحد الأدنى المطلوب لتشغيل المصادقة:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

اختياري (إذا استُخدم لاحقًا في وظائف سيرفر مخصصة):
```env
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
```

إعدادات Redirect في Supabase Auth:
- `Site URL`: `http://localhost:3000`
- `Redirect URLs`:
  - `http://localhost:3000/auth/callback`
  - `http://localhost:3000/update-password`

## 5) تشغيل المشروع محليًا
```bash
npm run dev
```

ثم افتح:
`http://localhost:3000`

## 6) بناء المشروع للإنتاج
```bash
npm run build
npm start
```

## 7) النشر على Vercel
1. اربط المشروع بـ Vercel.
2. أضف نفس متغيرات البيئة الموجودة في `.env.local` داخل إعدادات Vercel.
3. نفّذ النشر.

## ملاحظات مهمة
- كل الاستعلامات (باستثناء auth) تعتمد على `school_id`.
- رفع الصورة الشخصية يتم داخل bucket `avatars`.
- مكتبة الموارد تستخدم bucket `library`.
- الرسائل تعمل عبر Supabase Realtime.
- سياسات RLS مفعلة لكل الجداول في `SUPABASE_SETUP.sql`.
