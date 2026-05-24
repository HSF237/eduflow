-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/nzmngjspohqbpjuizdun/sql

create extension if not exists "uuid-ossp";

create table if not exists schools (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  address text,
  phone text,
  code text unique not null,
  principal_id uuid references auth.users(id),
  principal_email text,
  attendance_threshold int default 75,
  created_at timestamptz default now()
);

create table if not exists teachers (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) unique,
  school_id uuid references schools(id) on delete cascade,
  name text not null,
  email text not null,
  status text default 'Active',
  created_at timestamptz default now()
);

create table if not exists classes (
  id uuid default uuid_generate_v4() primary key,
  school_id uuid references schools(id) on delete cascade,
  name text not null,
  section text,
  teacher_id uuid references teachers(id) on delete set null,
  parent_code text unique,
  created_at timestamptz default now()
);

create table if not exists students (
  id uuid default uuid_generate_v4() primary key,
  school_id uuid references schools(id) on delete cascade,
  class_id uuid references classes(id) on delete set null,
  name text not null,
  roll_number text,
  admission_number text,
  parent_name text,
  parent_email text,
  created_at timestamptz default now()
);

create table if not exists attendance (
  id uuid default uuid_generate_v4() primary key,
  school_id uuid references schools(id) on delete cascade,
  class_id uuid references classes(id) on delete cascade,
  student_id uuid references students(id) on delete cascade,
  date date not null,
  status text not null check (status in ('present', 'absent', 'late', 'half-day')),
  marked_by uuid references auth.users(id),
  created_at timestamptz default now(),
  unique(student_id, date)
);

create table if not exists exams (
  id uuid default uuid_generate_v4() primary key,
  school_id uuid references schools(id) on delete cascade,
  class_id uuid references classes(id) on delete cascade,
  name text not null,
  type text not null,
  subject text,
  max_marks int default 100,
  date date,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

create table if not exists marks (
  id uuid default uuid_generate_v4() primary key,
  exam_id uuid references exams(id) on delete cascade,
  student_id uuid references students(id) on delete cascade,
  school_id uuid references schools(id) on delete cascade,
  marks_obtained numeric,
  created_at timestamptz default now(),
  unique(exam_id, student_id)
);

create table if not exists messages (
  id uuid default uuid_generate_v4() primary key,
  school_id uuid references schools(id) on delete cascade,
  class_id uuid references classes(id) on delete cascade,
  student_id uuid references students(id) on delete cascade,
  sender_type text check (sender_type in ('teacher', 'parent')),
  sender_name text,
  message text not null,
  created_at timestamptz default now()
);

create table if not exists leave_requests (
  id uuid default uuid_generate_v4() primary key,
  school_id uuid references schools(id) on delete cascade,
  student_id uuid references students(id) on delete cascade,
  class_id uuid references classes(id) on delete cascade,
  from_date date,
  to_date date,
  reason text,
  status text default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz default now()
);

-- Allow all (open RLS for development)
alter table schools enable row level security;
alter table teachers enable row level security;
alter table classes enable row level security;
alter table students enable row level security;
alter table attendance enable row level security;
alter table exams enable row level security;
alter table marks enable row level security;
alter table messages enable row level security;
alter table leave_requests enable row level security;

create policy "allow_all_schools" on schools for all using (true) with check (true);
create policy "allow_all_teachers" on teachers for all using (true) with check (true);
create policy "allow_all_classes" on classes for all using (true) with check (true);
create policy "allow_all_students" on students for all using (true) with check (true);
create policy "allow_all_attendance" on attendance for all using (true) with check (true);
create policy "allow_all_exams" on exams for all using (true) with check (true);
create policy "allow_all_marks" on marks for all using (true) with check (true);
create policy "allow_all_messages" on messages for all using (true) with check (true);
create policy "allow_all_leaves" on leave_requests for all using (true) with check (true);
