-- Supabase Schema for LiveDance Academy
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Students Table
create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone_number text not null unique,
  date_registered timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Lessons Table
create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  date date not null,
  time time not null,
  price numeric(10, 2) not null default 0.00,
  lesson_code text not null unique,
  status text not null check (status in ('scheduled', 'live', 'ended')) default 'scheduled',
  meeting_room text not null
);

-- 3. Payments Table
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.students(id) on delete cascade not null,
  lesson_id uuid references public.lessons(id) on delete cascade not null,
  status text not null check (status in ('pending', 'approved', 'rejected')) default 'pending',
  paid_at timestamp with time zone,
  unique (student_id, lesson_id)
);

-- 4. Attendance Table
create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.students(id) on delete cascade not null,
  lesson_id uuid references public.lessons(id) on delete cascade not null,
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  left_at timestamp with time zone
);

-- Enable Row Level Security (RLS)
alter table public.students enable row level security;
alter table public.lessons enable row level security;
alter table public.payments enable row level security;
alter table public.attendance enable row level security;

-- Drop existing policies if any
drop policy if exists "Admins have full access to students" on public.students;
drop policy if exists "Admins have full access to lessons" on public.lessons;
drop policy if exists "Admins have full access to payments" on public.payments;
drop policy if exists "Admins have full access to attendance" on public.attendance;

drop policy if exists "Public/Students can view lessons" on public.lessons;
drop policy if exists "Public/Students can check payments" on public.payments;
drop policy if exists "Students can insert attendance" on public.attendance;
drop policy if exists "Students can update attendance" on public.attendance;

-- Admin policies (requires authenticated user)
create policy "Admins have full access to students" on public.students for all using (auth.role() = 'authenticated');
create policy "Admins have full access to lessons" on public.lessons for all using (auth.role() = 'authenticated');
create policy "Admins have full access to payments" on public.payments for all using (auth.role() = 'authenticated');
create policy "Admins have full access to attendance" on public.attendance for all using (auth.role() = 'authenticated');

-- Student/Public policies
create policy "Public/Students can view lessons" on public.lessons for select using (true);
create policy "Public/Students can check payments" on public.payments for select using (true);
create policy "Students can insert attendance" on public.attendance for insert with check (true);
create policy "Students can update attendance" on public.attendance for update using (true);

-- Enable realtime subscriptions for key tables (lessons and payments)
-- (In Supabase, you do this by adding them to the supabase_realtime publication)
begin;
  -- remove the tables if they were already added to avoid errors
  alter publication supabase_realtime remove table public.lessons;
  alter publication supabase_realtime remove table public.payments;
exception
  when others then null;
end;

alter publication supabase_realtime add table public.lessons;
alter publication supabase_realtime add table public.payments;
