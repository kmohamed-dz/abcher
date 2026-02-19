# تشغيل مخطط Supabase (Abshir)

هذا الدليل يشرح طريقتين لتطبيق ملف `SUPABASE_SETUP.sql` على مشروع Supabase.

## المتطلبات
- لديك مشروع Supabase جاهز.
- لديك صلاحية الوصول إلى SQL Editor أو Supabase CLI.
- الملف المطلوب: `SUPABASE_SETUP.sql` من جذر المشروع.

## Option A: SQL Editor (الطريقة الأسرع)
1. افتح لوحة Supabase.
2. ادخل إلى **SQL Editor**.
3. أنشئ Query جديد.
4. الصق محتوى الملف `SUPABASE_SETUP.sql` بالكامل.
5. اضغط **Run**.
6. تأكد من إنشاء الجداول داخل `public`:
   - `profiles`, `schools`, `students`, `teachers`, `attendance`, `homework`, `exams`, `results`, `messages`, `notifications`, `library`

## Option B: Supabase CLI Migrations

### 1) تثبيت وربط CLI
```bash
npm i -g supabase
supabase login
```

### 2) تهيئة مجلد Supabase (إذا غير موجود)
```bash
supabase init
```

### 3) ربط المشروع المحلي بالمشروع السحابي
```bash
supabase link --project-ref <PROJECT_REF>
```

### 4) إنشاء migration جديد
```bash
supabase migration new init_abshir_schema
```

### 5) نسخ SQL داخل ملف migration
انسخ محتوى `SUPABASE_SETUP.sql` إلى ملف migration الذي تم إنشاؤه داخل:
`supabase/migrations/<timestamp>_init_abshir_schema.sql`

### 6) تطبيق migrations
```bash
supabase db push
```

## التحقق بعد التطبيق
نفّذ في SQL Editor:
```sql
select table_name
from information_schema.tables
where table_schema = 'public'
order by table_name;
```

وتحقق من وجود سياسات RLS:
```sql
select schemaname, tablename, policyname
from pg_policies
where schemaname = 'public'
order by tablename, policyname;
```

## تنبيه مهم جدًا
- **SQL Editor يعمل بصلاحيات admin** وبالتالي يمكنه تجاوز RLS أثناء الاختبار.
- لاختبار RLS فعليًا من التطبيق، استخدم مفاتيح:
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - جلسة مستخدم حقيقية عبر تسجيل الدخول
- لا تعتمد على نجاح الاستعلام في SQL Editor كدليل على أن سياسات RLS صحيحة من جهة العميل.
