# منصة أبشر - Abshir Dashboard

منصة **Next.js 14 + TypeScript + Supabase** لإدارة المدارس القرآنية باللغة العربية وواجهة RTL.

## المميزات
- إدارة الطلبة والمعلمين (CRUD كامل)
- تسجيل الحضور اليومي مع `upsert` على `(student_id, date)`
- تقارير الحضور ونسبة الالتزام وتصدير CSV
- رسائل فورية عبر Supabase Realtime
- إدارة الواجبات والاختبارات والنتائج
- صفحة ملف الطالب (حضور + نتائج)
- رفع الصورة الشخصية إلى bucket `avatars`
- مكتبة ملفات تعليمية عبر Supabase Storage
- صلاحيات وحماية بيانات عبر RLS لكل الجداول

## المتطلبات
- Node.js 18+
- npm 9+
- مشروع Supabase جاهز

## متغيرات البيئة المطلوبة
أنشئ ملف `.env.local` وأضف:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
```

## إعداد قاعدة البيانات (Supabase)
1. افتح Supabase Dashboard.
2. اذهب إلى SQL Editor.
3. الصق محتوى ملف `SUPABASE_SETUP.sql` وشغّله بالكامل.
4. تأكد من إنشاء buckets التالية:
- `avatars`
- `library`

## التشغيل المحلي
```bash
npm install
npm run dev
```

ثم افتح:
`http://localhost:3000`

## أوامر مفيدة
```bash
npm run build
npm run lint
```

## ملاحظات مهمة
- جميع الاستعلامات (عدا auth) مربوطة بـ `school_id`.
- صفحة الجهة الوصية تظهر فقط للدور `authority_admin`.
- إعدادات المدرسة تظهر فقط للدور `school_admin`.
- جميع الواجهات مبنية باتجاه RTL ومتوافقة مع العربية.
