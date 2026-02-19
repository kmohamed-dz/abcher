-- ==============================
-- Abshir - Supabase Setup Script
-- ==============================

create extension if not exists "pgcrypto";

-- ---------- Enums ----------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type public.user_role as enum (
      'school_admin',
      'teacher',
      'student',
      'parent',
      'authority_admin'
    );
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'attendance_status') then
    create type public.attendance_status as enum ('present', 'absent', 'late');
  end if;
end
$$;

-- ---------- Core Tables ----------
create table if not exists public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  wilaya text not null,
  address text,
  logo_url text,
  school_code text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role public.user_role,
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
  status public.attendance_status not null default 'present',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint attendance_student_date_unique unique (student_id, date)
);

create table if not exists public.homework (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  title text not null,
  level text not null,
  details text,
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.exams (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  title text not null,
  level text not null,
  exam_date date not null,
  max_score numeric(6,2) not null check (max_score > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.exam_results (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  exam_id uuid not null references public.exams(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  score numeric(6,2) not null check (score >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint exam_results_exam_student_unique unique (exam_id, student_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  sender_name text not null,
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  title text not null,
  body text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.library_files (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  name text not null,
  file_path text not null,
  public_url text not null,
  size bigint not null default 0,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  actor_name text,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ---------- Indexes ----------
create index if not exists profiles_school_id_idx on public.profiles (school_id);
create index if not exists students_school_id_idx on public.students (school_id);
create index if not exists teachers_school_id_idx on public.teachers (school_id);
create index if not exists attendance_school_id_idx on public.attendance (school_id);
create index if not exists attendance_date_idx on public.attendance (date);
create index if not exists attendance_student_id_idx on public.attendance (student_id);
create index if not exists homework_school_id_idx on public.homework (school_id);
create index if not exists exams_school_id_idx on public.exams (school_id);
create index if not exists exam_results_school_id_idx on public.exam_results (school_id);
create index if not exists messages_school_id_idx on public.messages (school_id);
create index if not exists notifications_school_id_idx on public.notifications (school_id);
create index if not exists library_files_school_id_idx on public.library_files (school_id);
create index if not exists activities_school_id_idx on public.activities (school_id);

-- ---------- Updated At Trigger ----------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at_schools on public.schools;
create trigger set_updated_at_schools
before update on public.schools
for each row
execute function public.set_updated_at();

drop trigger if exists set_updated_at_profiles on public.profiles;
create trigger set_updated_at_profiles
before update on public.profiles
for each row
execute function public.set_updated_at();

drop trigger if exists set_updated_at_students on public.students;
create trigger set_updated_at_students
before update on public.students
for each row
execute function public.set_updated_at();

drop trigger if exists set_updated_at_teachers on public.teachers;
create trigger set_updated_at_teachers
before update on public.teachers
for each row
execute function public.set_updated_at();

drop trigger if exists set_updated_at_attendance on public.attendance;
create trigger set_updated_at_attendance
before update on public.attendance
for each row
execute function public.set_updated_at();

drop trigger if exists set_updated_at_homework on public.homework;
create trigger set_updated_at_homework
before update on public.homework
for each row
execute function public.set_updated_at();

drop trigger if exists set_updated_at_exams on public.exams;
create trigger set_updated_at_exams
before update on public.exams
for each row
execute function public.set_updated_at();

drop trigger if exists set_updated_at_exam_results on public.exam_results;
create trigger set_updated_at_exam_results
before update on public.exam_results
for each row
execute function public.set_updated_at();

-- ---------- Auth Helper Functions ----------
create or replace function public.current_school_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.school_id
  from public.profiles p
  where p.id = auth.uid()
  limit 1;
$$;

create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select p.role
  from public.profiles p
  where p.id = auth.uid()
  limit 1;
$$;

-- ---------- Row Level Security ----------
alter table public.schools enable row level security;
alter table public.profiles enable row level security;
alter table public.students enable row level security;
alter table public.teachers enable row level security;
alter table public.attendance enable row level security;
alter table public.homework enable row level security;
alter table public.exams enable row level security;
alter table public.exam_results enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;
alter table public.library_files enable row level security;
alter table public.activities enable row level security;

-- ---------- Schools Policies ----------
drop policy if exists schools_select_own on public.schools;
create policy schools_select_own
on public.schools
for select
to authenticated
using (
  id = public.current_school_id()
  or public.current_user_role() = 'authority_admin'
);

drop policy if exists schools_insert_authenticated on public.schools;
create policy schools_insert_authenticated
on public.schools
for insert
to authenticated
with check (true);

drop policy if exists schools_update_admin on public.schools;
create policy schools_update_admin
on public.schools
for update
to authenticated
using (
  id = public.current_school_id()
  and public.current_user_role() in ('school_admin', 'authority_admin')
)
with check (id = public.current_school_id());

drop policy if exists schools_delete_admin on public.schools;
create policy schools_delete_admin
on public.schools
for delete
to authenticated
using (
  id = public.current_school_id()
  and public.current_user_role() in ('school_admin', 'authority_admin')
);

-- ---------- Profiles Policies ----------
drop policy if exists profiles_select_self_or_school on public.profiles;
create policy profiles_select_self_or_school
on public.profiles
for select
to authenticated
using (
  id = auth.uid()
  or (school_id is not null and school_id = public.current_school_id())
);

drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self
on public.profiles
for insert
to authenticated
with check (id = auth.uid());

drop policy if exists profiles_update_self_or_admin on public.profiles;
create policy profiles_update_self_or_admin
on public.profiles
for update
to authenticated
using (
  id = auth.uid()
  or (
    school_id = public.current_school_id()
    and public.current_user_role() in ('school_admin', 'authority_admin')
  )
)
with check (
  id = auth.uid()
  or school_id = public.current_school_id()
);

-- ---------- School Scoped Policies ----------
drop policy if exists students_select_school on public.students;
create policy students_select_school
on public.students
for select
to authenticated
using (school_id = public.current_school_id());

drop policy if exists students_insert_school on public.students;
create policy students_insert_school
on public.students
for insert
to authenticated
with check (school_id = public.current_school_id());

drop policy if exists students_update_school on public.students;
create policy students_update_school
on public.students
for update
to authenticated
using (school_id = public.current_school_id())
with check (school_id = public.current_school_id());

drop policy if exists students_delete_school on public.students;
create policy students_delete_school
on public.students
for delete
to authenticated
using (school_id = public.current_school_id());

drop policy if exists teachers_select_school on public.teachers;
create policy teachers_select_school
on public.teachers
for select
to authenticated
using (school_id = public.current_school_id());

drop policy if exists teachers_insert_school on public.teachers;
create policy teachers_insert_school
on public.teachers
for insert
to authenticated
with check (school_id = public.current_school_id());

drop policy if exists teachers_update_school on public.teachers;
create policy teachers_update_school
on public.teachers
for update
to authenticated
using (school_id = public.current_school_id())
with check (school_id = public.current_school_id());

drop policy if exists teachers_delete_school on public.teachers;
create policy teachers_delete_school
on public.teachers
for delete
to authenticated
using (school_id = public.current_school_id());

drop policy if exists attendance_select_school on public.attendance;
create policy attendance_select_school
on public.attendance
for select
to authenticated
using (school_id = public.current_school_id());

drop policy if exists attendance_insert_school on public.attendance;
create policy attendance_insert_school
on public.attendance
for insert
to authenticated
with check (school_id = public.current_school_id());

drop policy if exists attendance_update_school on public.attendance;
create policy attendance_update_school
on public.attendance
for update
to authenticated
using (school_id = public.current_school_id())
with check (school_id = public.current_school_id());

drop policy if exists attendance_delete_school on public.attendance;
create policy attendance_delete_school
on public.attendance
for delete
to authenticated
using (school_id = public.current_school_id());

drop policy if exists homework_select_school on public.homework;
create policy homework_select_school
on public.homework
for select
to authenticated
using (school_id = public.current_school_id());

drop policy if exists homework_insert_school on public.homework;
create policy homework_insert_school
on public.homework
for insert
to authenticated
with check (school_id = public.current_school_id());

drop policy if exists homework_update_school on public.homework;
create policy homework_update_school
on public.homework
for update
to authenticated
using (school_id = public.current_school_id())
with check (school_id = public.current_school_id());

drop policy if exists homework_delete_school on public.homework;
create policy homework_delete_school
on public.homework
for delete
to authenticated
using (school_id = public.current_school_id());

drop policy if exists exams_select_school on public.exams;
create policy exams_select_school
on public.exams
for select
to authenticated
using (school_id = public.current_school_id());

drop policy if exists exams_insert_school on public.exams;
create policy exams_insert_school
on public.exams
for insert
to authenticated
with check (school_id = public.current_school_id());

drop policy if exists exams_update_school on public.exams;
create policy exams_update_school
on public.exams
for update
to authenticated
using (school_id = public.current_school_id())
with check (school_id = public.current_school_id());

drop policy if exists exams_delete_school on public.exams;
create policy exams_delete_school
on public.exams
for delete
to authenticated
using (school_id = public.current_school_id());

drop policy if exists exam_results_select_school on public.exam_results;
create policy exam_results_select_school
on public.exam_results
for select
to authenticated
using (school_id = public.current_school_id());

drop policy if exists exam_results_insert_school on public.exam_results;
create policy exam_results_insert_school
on public.exam_results
for insert
to authenticated
with check (school_id = public.current_school_id());

drop policy if exists exam_results_update_school on public.exam_results;
create policy exam_results_update_school
on public.exam_results
for update
to authenticated
using (school_id = public.current_school_id())
with check (school_id = public.current_school_id());

drop policy if exists exam_results_delete_school on public.exam_results;
create policy exam_results_delete_school
on public.exam_results
for delete
to authenticated
using (school_id = public.current_school_id());

drop policy if exists messages_select_school on public.messages;
create policy messages_select_school
on public.messages
for select
to authenticated
using (school_id = public.current_school_id());

drop policy if exists messages_insert_school on public.messages;
create policy messages_insert_school
on public.messages
for insert
to authenticated
with check (school_id = public.current_school_id());

drop policy if exists messages_delete_school on public.messages;
create policy messages_delete_school
on public.messages
for delete
to authenticated
using (school_id = public.current_school_id());

drop policy if exists notifications_select_school on public.notifications;
create policy notifications_select_school
on public.notifications
for select
to authenticated
using (school_id = public.current_school_id());

drop policy if exists notifications_insert_school on public.notifications;
create policy notifications_insert_school
on public.notifications
for insert
to authenticated
with check (school_id = public.current_school_id());

drop policy if exists notifications_update_school on public.notifications;
create policy notifications_update_school
on public.notifications
for update
to authenticated
using (school_id = public.current_school_id())
with check (school_id = public.current_school_id());

drop policy if exists notifications_delete_school on public.notifications;
create policy notifications_delete_school
on public.notifications
for delete
to authenticated
using (school_id = public.current_school_id());

drop policy if exists library_files_select_school on public.library_files;
create policy library_files_select_school
on public.library_files
for select
to authenticated
using (school_id = public.current_school_id());

drop policy if exists library_files_insert_school on public.library_files;
create policy library_files_insert_school
on public.library_files
for insert
to authenticated
with check (school_id = public.current_school_id());

drop policy if exists library_files_update_school on public.library_files;
create policy library_files_update_school
on public.library_files
for update
to authenticated
using (school_id = public.current_school_id())
with check (school_id = public.current_school_id());

drop policy if exists library_files_delete_school on public.library_files;
create policy library_files_delete_school
on public.library_files
for delete
to authenticated
using (school_id = public.current_school_id());

drop policy if exists activities_select_school on public.activities;
create policy activities_select_school
on public.activities
for select
to authenticated
using (school_id = public.current_school_id());

drop policy if exists activities_insert_school on public.activities;
create policy activities_insert_school
on public.activities
for insert
to authenticated
with check (school_id = public.current_school_id());

drop policy if exists activities_update_school on public.activities;
create policy activities_update_school
on public.activities
for update
to authenticated
using (school_id = public.current_school_id())
with check (school_id = public.current_school_id());

drop policy if exists activities_delete_school on public.activities;
create policy activities_delete_school
on public.activities
for delete
to authenticated
using (school_id = public.current_school_id());

-- ---------- Storage Buckets ----------
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('library', 'library', true)
on conflict (id) do nothing;

alter table storage.objects enable row level security;

-- Avatars policies

drop policy if exists avatars_select_authenticated on storage.objects;
create policy avatars_select_authenticated
on storage.objects
for select
to authenticated
using (bucket_id = 'avatars');

drop policy if exists avatars_insert_owner on storage.objects;
create policy avatars_insert_owner
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists avatars_update_owner on storage.objects;
create policy avatars_update_owner
on storage.objects
for update
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists avatars_delete_owner on storage.objects;
create policy avatars_delete_owner
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Library policies

drop policy if exists library_select_school on storage.objects;
create policy library_select_school
on storage.objects
for select
to authenticated
using (
  bucket_id = 'library'
  and public.current_school_id() is not null
  and (storage.foldername(name))[1] = public.current_school_id()::text
);

drop policy if exists library_insert_school on storage.objects;
create policy library_insert_school
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'library'
  and public.current_school_id() is not null
  and (storage.foldername(name))[1] = public.current_school_id()::text
);

drop policy if exists library_update_school on storage.objects;
create policy library_update_school
on storage.objects
for update
to authenticated
using (
  bucket_id = 'library'
  and public.current_school_id() is not null
  and (storage.foldername(name))[1] = public.current_school_id()::text
)
with check (
  bucket_id = 'library'
  and public.current_school_id() is not null
  and (storage.foldername(name))[1] = public.current_school_id()::text
);

drop policy if exists library_delete_school on storage.objects;
create policy library_delete_school
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'library'
  and public.current_school_id() is not null
  and (storage.foldername(name))[1] = public.current_school_id()::text
);

-- ---------- Realtime ----------
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
