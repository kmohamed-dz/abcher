-- =========================================
-- أبشر - إعداد قاعدة البيانات (Supabase)
-- =========================================

create extension if not exists "pgcrypto";

-- =========================
-- Helper functions
-- =========================
create or replace function public.current_school_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select school_id from public.profiles where id = auth.uid();
$$;

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role::text from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin_or_teacher()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() in ('school_admin', 'teacher'), false);
$$;

-- =========================
-- Tables
-- =========================
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
  role text check (role in ('school_admin','teacher','student','parent','authority_admin')),
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
  status text not null check (status in ('present','absent','late','excused')),
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
  user_id uuid references auth.users(id) on delete cascade,
  title text not null,
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
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
  created_at timestamptz not null default now()
);

-- جداول مساعدة لصفحة الطالب
create table if not exists public.homework_submissions (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  homework_id uuid not null references public.homework(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  constraint homework_submission_unique unique (homework_id, student_id)
);

create table if not exists public.teacher_notes (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  teacher_name text not null,
  note text not null,
  created_at timestamptz not null default now()
);

-- =========================
-- Indexes
-- =========================
create index if not exists profiles_school_id_idx on public.profiles (school_id);
create index if not exists students_school_id_idx on public.students (school_id);
create index if not exists teachers_school_id_idx on public.teachers (school_id);
create index if not exists attendance_school_id_idx on public.attendance (school_id);
create index if not exists attendance_student_id_idx on public.attendance (student_id);
create index if not exists attendance_date_idx on public.attendance (date);
create index if not exists homework_school_id_idx on public.homework (school_id);
create index if not exists exams_school_id_idx on public.exams (school_id);
create index if not exists results_school_id_idx on public.results (school_id);
create index if not exists results_student_id_idx on public.results (student_id);
create index if not exists messages_school_id_idx on public.messages (school_id);
create index if not exists notifications_school_id_idx on public.notifications (school_id);
create index if not exists library_school_id_idx on public.library (school_id);
create index if not exists homework_submissions_school_id_idx on public.homework_submissions (school_id);
create index if not exists teacher_notes_school_id_idx on public.teacher_notes (school_id);

-- =========================
-- updated_at trigger
-- =========================
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
create trigger trg_schools_updated_at
before update on public.schools
for each row execute function public.set_updated_at();

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists trg_students_updated_at on public.students;
create trigger trg_students_updated_at
before update on public.students
for each row execute function public.set_updated_at();

drop trigger if exists trg_teachers_updated_at on public.teachers;
create trigger trg_teachers_updated_at
before update on public.teachers
for each row execute function public.set_updated_at();

drop trigger if exists trg_attendance_updated_at on public.attendance;
create trigger trg_attendance_updated_at
before update on public.attendance
for each row execute function public.set_updated_at();

drop trigger if exists trg_homework_updated_at on public.homework;
create trigger trg_homework_updated_at
before update on public.homework
for each row execute function public.set_updated_at();

drop trigger if exists trg_exams_updated_at on public.exams;
create trigger trg_exams_updated_at
before update on public.exams
for each row execute function public.set_updated_at();

drop trigger if exists trg_results_updated_at on public.results;
create trigger trg_results_updated_at
before update on public.results
for each row execute function public.set_updated_at();

-- =========================
-- Auto profile on signup
-- =========================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1), 'مستخدم جديد')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- =========================
-- Absence notification trigger
-- =========================
create or replace function public.notify_absence()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  student_name text;
  parent_phone_value text;
begin
  if new.status <> 'absent' then
    return new;
  end if;

  if tg_op = 'UPDATE' and old.status = 'absent' then
    return new;
  end if;

  select s.full_name, s.parent_phone
    into student_name, parent_phone_value
  from public.students s
  where s.id = new.student_id;

  insert into public.notifications (school_id, title, message)
  values (
    new.school_id,
    'تنبيه غياب طالب',
    format(
      'تسجيل غياب للطالب %s بتاريخ %s. هاتف ولي الأمر: %s',
      coalesce(student_name, 'غير معروف'),
      new.date::text,
      coalesce(parent_phone_value, 'غير متوفر')
    )
  );

  return new;
end;
$$;

drop trigger if exists trg_notify_absence on public.attendance;
create trigger trg_notify_absence
after insert or update of status on public.attendance
for each row execute function public.notify_absence();

-- =========================
-- RLS enable
-- =========================
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

-- =========================
-- Profiles policies (فقط المستخدم نفسه)
-- =========================
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

-- =========================
-- Schools policies
-- =========================
drop policy if exists schools_select_by_membership on public.schools;
create policy schools_select_by_membership
on public.schools
for select to authenticated
using (id = public.current_school_id());

drop policy if exists schools_insert_authenticated on public.schools;
create policy schools_insert_authenticated
on public.schools
for insert to authenticated
with check (true);

drop policy if exists schools_update_admin on public.schools;
create policy schools_update_admin
on public.schools
for update to authenticated
using (id = public.current_school_id() and public.current_user_role() = 'school_admin')
with check (id = public.current_school_id());

-- =========================
-- School scoped policy template
-- =========================
-- SELECT for same school members
-- INSERT/UPDATE/DELETE for admin/teacher only where needed

-- Students
drop policy if exists students_select_school on public.students;
create policy students_select_school
on public.students
for select to authenticated
using (school_id = public.current_school_id());

drop policy if exists students_manage_school on public.students;
create policy students_manage_school
on public.students
for all to authenticated
using (school_id = public.current_school_id() and public.is_admin_or_teacher())
with check (school_id = public.current_school_id() and public.is_admin_or_teacher());

-- Teachers
drop policy if exists teachers_select_school on public.teachers;
create policy teachers_select_school
on public.teachers
for select to authenticated
using (school_id = public.current_school_id());

drop policy if exists teachers_manage_school on public.teachers;
create policy teachers_manage_school
on public.teachers
for all to authenticated
using (school_id = public.current_school_id() and public.current_user_role() = 'school_admin')
with check (school_id = public.current_school_id() and public.current_user_role() = 'school_admin');

-- Attendance
drop policy if exists attendance_select_school on public.attendance;
create policy attendance_select_school
on public.attendance
for select to authenticated
using (school_id = public.current_school_id());

drop policy if exists attendance_manage_school on public.attendance;
create policy attendance_manage_school
on public.attendance
for all to authenticated
using (school_id = public.current_school_id() and public.is_admin_or_teacher())
with check (school_id = public.current_school_id() and public.is_admin_or_teacher());

-- Homework
drop policy if exists homework_select_school on public.homework;
create policy homework_select_school
on public.homework
for select to authenticated
using (school_id = public.current_school_id());

drop policy if exists homework_manage_school on public.homework;
create policy homework_manage_school
on public.homework
for all to authenticated
using (school_id = public.current_school_id() and public.is_admin_or_teacher())
with check (school_id = public.current_school_id() and public.is_admin_or_teacher());

-- Exams
drop policy if exists exams_select_school on public.exams;
create policy exams_select_school
on public.exams
for select to authenticated
using (school_id = public.current_school_id());

drop policy if exists exams_manage_school on public.exams;
create policy exams_manage_school
on public.exams
for all to authenticated
using (school_id = public.current_school_id() and public.is_admin_or_teacher())
with check (school_id = public.current_school_id() and public.is_admin_or_teacher());

-- Results
drop policy if exists results_select_school on public.results;
create policy results_select_school
on public.results
for select to authenticated
using (school_id = public.current_school_id());

drop policy if exists results_manage_school on public.results;
create policy results_manage_school
on public.results
for all to authenticated
using (school_id = public.current_school_id() and public.is_admin_or_teacher())
with check (school_id = public.current_school_id() and public.is_admin_or_teacher());

-- Messages
drop policy if exists messages_select_school on public.messages;
create policy messages_select_school
on public.messages
for select to authenticated
using (school_id = public.current_school_id());

drop policy if exists messages_insert_school on public.messages;
create policy messages_insert_school
on public.messages
for insert to authenticated
with check (
  school_id = public.current_school_id()
  and sender_id = auth.uid()
);

-- Notifications
drop policy if exists notifications_select_school on public.notifications;
create policy notifications_select_school
on public.notifications
for select to authenticated
using (school_id = public.current_school_id());

drop policy if exists notifications_update_school on public.notifications;
create policy notifications_update_school
on public.notifications
for update to authenticated
using (school_id = public.current_school_id())
with check (school_id = public.current_school_id());

drop policy if exists notifications_insert_admin_teacher on public.notifications;
create policy notifications_insert_admin_teacher
on public.notifications
for insert to authenticated
with check (school_id = public.current_school_id() and public.is_admin_or_teacher());

-- Library
drop policy if exists library_select_school on public.library;
create policy library_select_school
on public.library
for select to authenticated
using (school_id = public.current_school_id());

drop policy if exists library_manage_school on public.library;
create policy library_manage_school
on public.library
for all to authenticated
using (school_id = public.current_school_id() and public.is_admin_or_teacher())
with check (school_id = public.current_school_id() and public.is_admin_or_teacher());

-- Homework submissions
drop policy if exists homework_submissions_select_school on public.homework_submissions;
create policy homework_submissions_select_school
on public.homework_submissions
for select to authenticated
using (school_id = public.current_school_id());

drop policy if exists homework_submissions_manage_school on public.homework_submissions;
create policy homework_submissions_manage_school
on public.homework_submissions
for all to authenticated
using (school_id = public.current_school_id())
with check (school_id = public.current_school_id());

-- Teacher notes
drop policy if exists teacher_notes_select_school on public.teacher_notes;
create policy teacher_notes_select_school
on public.teacher_notes
for select to authenticated
using (school_id = public.current_school_id());

drop policy if exists teacher_notes_manage_school on public.teacher_notes;
create policy teacher_notes_manage_school
on public.teacher_notes
for all to authenticated
using (school_id = public.current_school_id() and public.is_admin_or_teacher())
with check (school_id = public.current_school_id() and public.is_admin_or_teacher());

-- =========================
-- Authority admin aggregated reads only (safe)
-- =========================
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
  if public.current_user_role() <> 'authority_admin' then
    raise exception 'غير مصرح';
  end if;

  select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb)
  into schools_per_wilaya
  from (
    select wilaya, count(*)::int as count
    from public.schools
    group by wilaya
    order by count desc, wilaya asc
  ) t;

  select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb)
  into students_per_wilaya
  from (
    select s.wilaya, count(st.id)::int as count
    from public.students st
    join public.schools s on s.id = st.school_id
    group by s.wilaya
    order by count desc, s.wilaya asc
  ) t;

  select count(*)::int into total_teachers_count from public.teachers;

  with per_school as (
    select
      school_id,
      case
        when count(*) = 0 then 0
        else (sum(case when status in ('present','late','excused') then 1 else 0 end)::numeric / count(*)::numeric) * 100
      end as attendance_rate
    from public.attendance
    group by school_id
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

-- =========================
-- Realtime for messages
-- =========================
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

-- =========================
-- Storage buckets
-- =========================
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('library', 'library', true)
on conflict (id) do nothing;

alter table storage.objects enable row level security;

-- avatars: user owns own folder {user_id}/...
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

-- library: school folder {school_id}/...
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
  and public.is_admin_or_teacher()
  and (storage.foldername(name))[1] = public.current_school_id()::text
);

drop policy if exists library_update on storage.objects;
create policy library_update
on storage.objects
for update to authenticated
using (
  bucket_id = 'library'
  and public.is_admin_or_teacher()
  and (storage.foldername(name))[1] = public.current_school_id()::text
)
with check (
  bucket_id = 'library'
  and public.is_admin_or_teacher()
  and (storage.foldername(name))[1] = public.current_school_id()::text
);

drop policy if exists library_delete on storage.objects;
create policy library_delete
on storage.objects
for delete to authenticated
using (
  bucket_id = 'library'
  and public.is_admin_or_teacher()
  and (storage.foldername(name))[1] = public.current_school_id()::text
);
