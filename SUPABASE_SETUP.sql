-- =====================================================
-- أبشر | إعداد قاعدة البيانات (Supabase + RLS)
-- =====================================================
-- ملاحظات مهمة:
-- 1) هذا الملف لا يحذف الجداول افتراضيًا.
-- 2) كل البيانات متعددة المستأجرين تعتمد على school_id.
-- 3) طبّق هذا الملف مرة واحدة عبر SQL Editor أو migration.

create extension if not exists "pgcrypto";

-- =====================================================
-- دوال مساعدة (RLS)
-- =====================================================
create or replace function public.current_school_id()
returns uuid
language plpgsql
stable
set search_path = public
as $$
declare
  v_school_id uuid;
begin
  -- يسمح بتشغيل الملف لأول مرة حتى لو جدول profiles لم يُنشأ بعد.
  if to_regclass('public.profiles') is null then
    return null;
  end if;

  execute 'select school_id from public.profiles where id = auth.uid() limit 1'
  into v_school_id;

  return v_school_id;
end;
$$;

create or replace function public.current_user_role()
returns text
language plpgsql
stable
set search_path = public
as $$
declare
  v_role text;
begin
  -- يسمح بتشغيل الملف لأول مرة حتى لو جدول profiles لم يُنشأ بعد.
  if to_regclass('public.profiles') is null then
    return null;
  end if;

  execute 'select role from public.profiles where id = auth.uid() limit 1'
  into v_role;

  return v_role;
end;
$$;

create or replace function public.can_manage_school_data()
returns boolean
language sql
stable
set search_path = public
as $$
  select coalesce(public.current_user_role() in ('school_admin', 'teacher'), false);
$$;

create or replace function public.is_authority_admin()
returns boolean
language sql
stable
set search_path = public
as $$
  select coalesce(public.current_user_role() = 'authority_admin', false);
$$;

-- lookup آمن لمدرسة عبر school_code أثناء onboarding (بدون كشف قائمة المدارس).
create or replace function public.find_school_id_by_code(p_school_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_role text;
  v_school_id uuid;
begin
  if v_user_id is null or p_school_code is null or btrim(p_school_code) = '' then
    return null;
  end if;

  select p.role, p.school_id
  into v_role, v_school_id
  from public.profiles p
  where p.id = v_user_id
  limit 1;

  if v_school_id is not null then
    return v_school_id;
  end if;

  -- مدير المدرسة ينشئ مدرسة جديدة بدل الانضمام لمدرسة برمز.
  if v_role = 'school_admin' then
    return null;
  end if;

  select s.id
  into v_school_id
  from public.schools s
  where upper(s.school_code) = upper(trim(p_school_code))
  limit 1;

  return v_school_id;
end;
$$;

grant execute on function public.find_school_id_by_code(text) to authenticated;

-- =====================================================
-- الجداول الأساسية المطلوبة من الواجهة
-- =====================================================
create table if not exists public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  wilaya text not null,
  address text,
  school_code text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role text check (role in ('school_admin', 'teacher', 'student', 'parent', 'authority_admin')),
  school_id uuid references public.schools(id) on delete set null,
  phone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  full_name text not null,
  level text not null,
  parent_phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.teachers (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  full_name text not null,
  specialization text not null,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  date date not null,
  status text not null check (status in ('present', 'absent', 'late', 'excused', 'حاضر', 'غائب', 'متأخر', 'بعذر')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint attendance_student_date_unique unique (student_id, date)
);

create table if not exists public.homework (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  title text not null,
  description text,
  level text not null,
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.exams (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  title text not null,
  exam_date date not null,
  max_score numeric(8,2) not null check (max_score > 0),
  level text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.results (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  exam_id uuid not null references public.exams(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  score numeric(8,2) not null check (score >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint results_exam_student_unique unique (exam_id, student_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  receiver_id uuid not null references auth.users(id) on delete cascade,
  sender_name text not null,
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  title text not null,
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.library (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  title text not null,
  level text not null,
  file_name text not null,
  file_type text not null,
  file_path text not null,
  public_url text not null,
  uploaded_by_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =====================================================
-- جداول إضافية مستخدمة فعليًا في الواجهة
-- =====================================================
create table if not exists public.homework_submissions (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  homework_id uuid not null references public.homework(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint homework_submissions_homework_student_unique unique (homework_id, student_id)
);

create table if not exists public.teacher_notes (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  teacher_name text not null,
  note text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =====================================================
-- فهارس الأداء (school_id / foreign keys / created_at / date)
-- =====================================================
create index if not exists schools_created_at_idx on public.schools (created_at desc);

create index if not exists profiles_school_id_idx on public.profiles (school_id);
create index if not exists profiles_created_at_idx on public.profiles (created_at desc);

create index if not exists students_school_id_idx on public.students (school_id);
create index if not exists students_created_at_idx on public.students (created_at desc);

create index if not exists teachers_school_id_idx on public.teachers (school_id);
create index if not exists teachers_created_at_idx on public.teachers (created_at desc);

create index if not exists attendance_school_id_idx on public.attendance (school_id);
create index if not exists attendance_student_id_idx on public.attendance (student_id);
create index if not exists attendance_date_idx on public.attendance (date);
create index if not exists attendance_created_at_idx on public.attendance (created_at desc);

create index if not exists homework_school_id_idx on public.homework (school_id);
create index if not exists homework_due_date_idx on public.homework (due_date);
create index if not exists homework_created_at_idx on public.homework (created_at desc);

create index if not exists exams_school_id_idx on public.exams (school_id);
create index if not exists exams_exam_date_idx on public.exams (exam_date);
create index if not exists exams_created_at_idx on public.exams (created_at desc);

create index if not exists results_school_id_idx on public.results (school_id);
create index if not exists results_exam_id_idx on public.results (exam_id);
create index if not exists results_student_id_idx on public.results (student_id);
create index if not exists results_created_at_idx on public.results (created_at desc);

create index if not exists messages_school_id_idx on public.messages (school_id);
create index if not exists messages_sender_id_idx on public.messages (sender_id);
create index if not exists messages_receiver_id_idx on public.messages (receiver_id);
create index if not exists messages_created_at_idx on public.messages (created_at desc);

create index if not exists notifications_school_id_idx on public.notifications (school_id);
create index if not exists notifications_user_id_idx on public.notifications (user_id);
create index if not exists notifications_created_at_idx on public.notifications (created_at desc);

create index if not exists library_school_id_idx on public.library (school_id);
create index if not exists library_created_at_idx on public.library (created_at desc);

create index if not exists homework_submissions_school_id_idx on public.homework_submissions (school_id);
create index if not exists homework_submissions_homework_id_idx on public.homework_submissions (homework_id);
create index if not exists homework_submissions_student_id_idx on public.homework_submissions (student_id);
create index if not exists homework_submissions_created_at_idx on public.homework_submissions (created_at desc);

create index if not exists teacher_notes_school_id_idx on public.teacher_notes (school_id);
create index if not exists teacher_notes_student_id_idx on public.teacher_notes (student_id);
create index if not exists teacher_notes_created_at_idx on public.teacher_notes (created_at desc);

-- =====================================================
-- Trigger عام لتحديث updated_at
-- =====================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_schools_updated_at on public.schools;
create trigger trg_schools_updated_at before update on public.schools
for each row execute function public.set_updated_at();

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists trg_students_updated_at on public.students;
create trigger trg_students_updated_at before update on public.students
for each row execute function public.set_updated_at();

drop trigger if exists trg_teachers_updated_at on public.teachers;
create trigger trg_teachers_updated_at before update on public.teachers
for each row execute function public.set_updated_at();

drop trigger if exists trg_attendance_updated_at on public.attendance;
create trigger trg_attendance_updated_at before update on public.attendance
for each row execute function public.set_updated_at();

drop trigger if exists trg_homework_updated_at on public.homework;
create trigger trg_homework_updated_at before update on public.homework
for each row execute function public.set_updated_at();

drop trigger if exists trg_exams_updated_at on public.exams;
create trigger trg_exams_updated_at before update on public.exams
for each row execute function public.set_updated_at();

drop trigger if exists trg_results_updated_at on public.results;
create trigger trg_results_updated_at before update on public.results
for each row execute function public.set_updated_at();

drop trigger if exists trg_notifications_updated_at on public.notifications;
create trigger trg_notifications_updated_at before update on public.notifications
for each row execute function public.set_updated_at();

drop trigger if exists trg_library_updated_at on public.library;
create trigger trg_library_updated_at before update on public.library
for each row execute function public.set_updated_at();

drop trigger if exists trg_homework_submissions_updated_at on public.homework_submissions;
create trigger trg_homework_submissions_updated_at before update on public.homework_submissions
for each row execute function public.set_updated_at();

drop trigger if exists trg_teacher_notes_updated_at on public.teacher_notes;
create trigger trg_teacher_notes_updated_at before update on public.teacher_notes
for each row execute function public.set_updated_at();

-- =====================================================
-- Trigger: إنشاء profile تلقائيًا بعد التسجيل
-- =====================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1), 'مستخدم جديد'),
    nullif(new.raw_user_meta_data->>'phone', '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- =====================================================
-- Trigger اختياري: إشعار الغياب
-- =====================================================
create or replace function public.notify_absence()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_name text;
  v_parent_phone text;
begin
  if new.status not in ('absent', 'غائب') then
    return new;
  end if;

  if tg_op = 'UPDATE' and old.status in ('absent', 'غائب') then
    return new;
  end if;

  select s.full_name, s.parent_phone
  into v_student_name, v_parent_phone
  from public.students s
  where s.id = new.student_id;

  insert into public.notifications (school_id, user_id, title, message)
  values (
    new.school_id,
    null,
    'تنبيه غياب طالب',
    format(
      'تم تسجيل غياب الطالب %s بتاريخ %s. هاتف ولي الأمر: %s',
      coalesce(v_student_name, 'غير معروف'),
      new.date::text,
      coalesce(v_parent_phone, 'غير متوفر')
    )
  );

  return new;
end;
$$;

drop trigger if exists trg_notify_absence on public.attendance;
create trigger trg_notify_absence
after insert or update of status on public.attendance
for each row execute function public.notify_absence();

-- =====================================================
-- تمكين RLS على كل الجداول
-- =====================================================
alter table public.schools enable row level security;
alter table public.profiles enable row level security;
alter table public.students enable row level security;
alter table public.teachers enable row level security;
alter table public.attendance enable row level security;
alter table public.homework enable row level security;
alter table public.exams enable row level security;
alter table public.results enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;
alter table public.library enable row level security;
alter table public.homework_submissions enable row level security;
alter table public.teacher_notes enable row level security;

-- =====================================================
-- سياسات profiles (المستخدم يرى/يعدل صفه فقط)
-- =====================================================
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
on public.profiles
for select to authenticated
using (id = auth.uid());

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own
on public.profiles
for insert to authenticated
with check (id = auth.uid());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
on public.profiles
for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- =====================================================
-- سياسات schools
-- =====================================================
-- نزيل أي سياسات قديمة/مضافة يدويًا على schools حتى نتجنب التعارضات.
do $$
declare
  p record;
begin
  for p in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'schools'
  loop
    execute format('drop policy if exists %I on public.schools', p.policyname);
  end loop;
end
$$;

-- select: عضو المدرسة يرى مدرسته فقط، والجهة الوصية ترى الكل.
create policy schools_select_members_or_authority
on public.schools
for select to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (p.school_id = schools.id or p.role = 'authority_admin')
  )
);

-- insert: يسمح لمدير المدرسة/الجهة الوصية، وكذلك حالة onboarding الأولى (role null + school_id null).
create policy schools_insert_admin_or_authority
on public.schools
for insert to authenticated
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (
        p.role in ('school_admin', 'authority_admin')
        or (p.role is null and p.school_id is null)
      )
  )
);

-- update: مدير المدرسة يعدّل مدرسته فقط، والجهة الوصية تعدّل أي مدرسة.
create policy schools_update_admin_or_authority
on public.schools
for update to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (
        p.role = 'authority_admin'
        or (p.role = 'school_admin' and p.school_id = schools.id)
      )
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (
        p.role = 'authority_admin'
        or (p.role = 'school_admin' and p.school_id = schools.id)
      )
  )
);

-- =====================================================
-- سياسات جداول المدرسة (school_id)
-- =====================================================
-- students
 drop policy if exists students_select_same_school on public.students;
create policy students_select_same_school
on public.students
for select to authenticated
using (school_id = public.current_school_id());

drop policy if exists students_manage_admin_teacher on public.students;
create policy students_manage_admin_teacher
on public.students
for all to authenticated
using (school_id = public.current_school_id() and public.can_manage_school_data())
with check (school_id = public.current_school_id() and public.can_manage_school_data());

-- teachers
 drop policy if exists teachers_select_same_school on public.teachers;
create policy teachers_select_same_school
on public.teachers
for select to authenticated
using (school_id = public.current_school_id());

drop policy if exists teachers_manage_admin_only on public.teachers;
create policy teachers_manage_admin_only
on public.teachers
for all to authenticated
using (school_id = public.current_school_id() and public.current_user_role() = 'school_admin')
with check (school_id = public.current_school_id() and public.current_user_role() = 'school_admin');

-- attendance
 drop policy if exists attendance_select_same_school on public.attendance;
create policy attendance_select_same_school
on public.attendance
for select to authenticated
using (school_id = public.current_school_id());

drop policy if exists attendance_manage_admin_teacher on public.attendance;
create policy attendance_manage_admin_teacher
on public.attendance
for all to authenticated
using (school_id = public.current_school_id() and public.can_manage_school_data())
with check (school_id = public.current_school_id() and public.can_manage_school_data());

-- homework
 drop policy if exists homework_select_same_school on public.homework;
create policy homework_select_same_school
on public.homework
for select to authenticated
using (school_id = public.current_school_id());

drop policy if exists homework_manage_admin_teacher on public.homework;
create policy homework_manage_admin_teacher
on public.homework
for all to authenticated
using (school_id = public.current_school_id() and public.can_manage_school_data())
with check (school_id = public.current_school_id() and public.can_manage_school_data());

-- exams
 drop policy if exists exams_select_same_school on public.exams;
create policy exams_select_same_school
on public.exams
for select to authenticated
using (school_id = public.current_school_id());

drop policy if exists exams_manage_admin_teacher on public.exams;
create policy exams_manage_admin_teacher
on public.exams
for all to authenticated
using (school_id = public.current_school_id() and public.can_manage_school_data())
with check (school_id = public.current_school_id() and public.can_manage_school_data());

-- results
 drop policy if exists results_select_same_school on public.results;
create policy results_select_same_school
on public.results
for select to authenticated
using (school_id = public.current_school_id());

drop policy if exists results_manage_admin_teacher on public.results;
create policy results_manage_admin_teacher
on public.results
for all to authenticated
using (school_id = public.current_school_id() and public.can_manage_school_data())
with check (school_id = public.current_school_id() and public.can_manage_school_data());

-- messages
 drop policy if exists messages_select_conversation_or_staff on public.messages;
create policy messages_select_conversation_or_staff
on public.messages
for select to authenticated
using (
  school_id = public.current_school_id()
  and (
    sender_id = auth.uid()
    or receiver_id = auth.uid()
    or public.current_user_role() in ('school_admin', 'teacher')
  )
);

drop policy if exists messages_insert_same_school on public.messages;
create policy messages_insert_same_school
on public.messages
for insert to authenticated
with check (
  school_id = public.current_school_id()
  and sender_id = auth.uid()
  and public.current_user_role() in ('school_admin', 'teacher', 'student', 'parent')
);

drop policy if exists messages_update_sender_or_staff on public.messages;
create policy messages_update_sender_or_staff
on public.messages
for update to authenticated
using (
  school_id = public.current_school_id()
  and (sender_id = auth.uid() or public.current_user_role() in ('school_admin', 'teacher'))
)
with check (
  school_id = public.current_school_id()
  and (sender_id = auth.uid() or public.current_user_role() in ('school_admin', 'teacher'))
);

drop policy if exists messages_delete_sender_or_staff on public.messages;
create policy messages_delete_sender_or_staff
on public.messages
for delete to authenticated
using (
  school_id = public.current_school_id()
  and (sender_id = auth.uid() or public.current_user_role() in ('school_admin', 'teacher'))
);

-- notifications
 drop policy if exists notifications_select_same_school on public.notifications;
create policy notifications_select_same_school
on public.notifications
for select to authenticated
using (school_id = public.current_school_id());

drop policy if exists notifications_insert_admin_teacher on public.notifications;
create policy notifications_insert_admin_teacher
on public.notifications
for insert to authenticated
with check (school_id = public.current_school_id() and public.can_manage_school_data());

drop policy if exists notifications_update_same_school on public.notifications;
create policy notifications_update_same_school
on public.notifications
for update to authenticated
using (school_id = public.current_school_id())
with check (school_id = public.current_school_id());

-- library
 drop policy if exists library_select_same_school on public.library;
create policy library_select_same_school
on public.library
for select to authenticated
using (school_id = public.current_school_id());

drop policy if exists library_manage_admin_teacher on public.library;
create policy library_manage_admin_teacher
on public.library
for all to authenticated
using (school_id = public.current_school_id() and public.can_manage_school_data())
with check (school_id = public.current_school_id() and public.can_manage_school_data());

-- homework_submissions
 drop policy if exists homework_submissions_select_same_school on public.homework_submissions;
create policy homework_submissions_select_same_school
on public.homework_submissions
for select to authenticated
using (school_id = public.current_school_id());

drop policy if exists homework_submissions_manage_admin_teacher on public.homework_submissions;
create policy homework_submissions_manage_admin_teacher
on public.homework_submissions
for all to authenticated
using (school_id = public.current_school_id() and public.can_manage_school_data())
with check (school_id = public.current_school_id() and public.can_manage_school_data());

-- teacher_notes
 drop policy if exists teacher_notes_select_same_school on public.teacher_notes;
create policy teacher_notes_select_same_school
on public.teacher_notes
for select to authenticated
using (school_id = public.current_school_id());

drop policy if exists teacher_notes_manage_admin_teacher on public.teacher_notes;
create policy teacher_notes_manage_admin_teacher
on public.teacher_notes
for all to authenticated
using (school_id = public.current_school_id() and public.can_manage_school_data())
with check (school_id = public.current_school_id() and public.can_manage_school_data());

-- =====================================================
-- وظيفة إحصاءات الجهة الوصية (مجمّعة فقط)
-- =====================================================
create or replace function public.authority_dashboard_aggregates()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  schools_per_wilaya jsonb;
  students_per_wilaya jsonb;
  total_teachers_count integer;
  avg_attendance numeric;
begin
  if not public.is_authority_admin() then
    raise exception 'غير مصرح';
  end if;

  select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb)
  into schools_per_wilaya
  from (
    select s.wilaya, count(*)::int as count
    from public.schools s
    group by s.wilaya
    order by count desc, s.wilaya asc
  ) t;

  select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb)
  into students_per_wilaya
  from (
    select sc.wilaya, count(st.id)::int as count
    from public.students st
    join public.schools sc on sc.id = st.school_id
    group by sc.wilaya
    order by count desc, sc.wilaya asc
  ) t;

  select count(*)::int into total_teachers_count from public.teachers;

  with per_school as (
    select
      a.school_id,
      case
        when count(*) = 0 then 0
        else (sum(case when a.status in ('present', 'late', 'excused', 'حاضر', 'متأخر', 'بعذر') then 1 else 0 end)::numeric / count(*)::numeric) * 100
      end as attendance_rate
    from public.attendance a
    group by a.school_id
  )
  select coalesce(round(avg(attendance_rate), 2), 0)
  into avg_attendance
  from per_school;

  return jsonb_build_object(
    'schools_per_wilaya', schools_per_wilaya,
    'students_per_wilaya', students_per_wilaya,
    'total_teachers', coalesce(total_teachers_count, 0),
    'avg_attendance_rate', coalesce(avg_attendance, 0)
  );
end;
$$;

grant execute on function public.authority_dashboard_aggregates() to authenticated;

-- =====================================================
-- Realtime: تفعيل messages في publication
-- =====================================================
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end
$$;

-- =====================================================
-- Storage buckets (avatars + library)
-- =====================================================
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('library', 'library', true)
on conflict (id) do nothing;

-- ملاحظة:
-- في بعض مشاريع Supabase يظهر خطأ:
-- ERROR: must be owner of table objects
-- عند محاولة تعديل storage.objects عبر دور postgres.
-- لذلك نطبّق سياسات Storage فقط إذا كان الدور الحالي يملك الجدول.
do $$
declare
  v_is_owner boolean := false;
begin
  select (c.relowner = r.oid)
  into v_is_owner
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  join pg_roles r on r.rolname = current_user
  where n.nspname = 'storage'
    and c.relname = 'objects'
  limit 1;

  if coalesce(v_is_owner, false) then
    alter table storage.objects enable row level security;

    -- avatars: المستخدم يدير ملفه فقط داخل {user_id}/...
    drop policy if exists avatars_select on storage.objects;
    create policy avatars_select
    on storage.objects
    for select to authenticated
    using (bucket_id = 'avatars');

    drop policy if exists avatars_insert on storage.objects;
    create policy avatars_insert
    on storage.objects
    for insert to authenticated
    with check (
      bucket_id = 'avatars'
      and (storage.foldername(name))[1] = auth.uid()::text
    );

    drop policy if exists avatars_update on storage.objects;
    create policy avatars_update
    on storage.objects
    for update to authenticated
    using (
      bucket_id = 'avatars'
      and (storage.foldername(name))[1] = auth.uid()::text
    )
    with check (
      bucket_id = 'avatars'
      and (storage.foldername(name))[1] = auth.uid()::text
    );

    drop policy if exists avatars_delete on storage.objects;
    create policy avatars_delete
    on storage.objects
    for delete to authenticated
    using (
      bucket_id = 'avatars'
      and (storage.foldername(name))[1] = auth.uid()::text
    );

    -- library: ملفات المدرسة داخل {school_id}/...
    drop policy if exists library_select on storage.objects;
    create policy library_select
    on storage.objects
    for select to authenticated
    using (
      bucket_id = 'library'
      and (storage.foldername(name))[1] = public.current_school_id()::text
    );

    drop policy if exists library_insert on storage.objects;
    create policy library_insert
    on storage.objects
    for insert to authenticated
    with check (
      bucket_id = 'library'
      and public.can_manage_school_data()
      and (storage.foldername(name))[1] = public.current_school_id()::text
    );

    drop policy if exists library_update on storage.objects;
    create policy library_update
    on storage.objects
    for update to authenticated
    using (
      bucket_id = 'library'
      and public.can_manage_school_data()
      and (storage.foldername(name))[1] = public.current_school_id()::text
    )
    with check (
      bucket_id = 'library'
      and public.can_manage_school_data()
      and (storage.foldername(name))[1] = public.current_school_id()::text
    );

    drop policy if exists library_delete on storage.objects;
    create policy library_delete
    on storage.objects
    for delete to authenticated
    using (
      bucket_id = 'library'
      and public.can_manage_school_data()
      and (storage.foldername(name))[1] = public.current_school_id()::text
    );
  else
    raise notice 'Skipping storage.objects policies: current role is not owner.';
    raise notice 'Apply Storage policies manually from Supabase Dashboard > Storage > Policies.';
  end if;
exception
  when undefined_table then
    raise notice 'storage.objects not found yet. Configure Storage policies after enabling Storage.';
end
$$;
