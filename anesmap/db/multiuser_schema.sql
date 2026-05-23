-- Multi-user schema for AnesMap
-- Run in Supabase SQL editor.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  role text not null default 'student' check (role in ('student', 'admin')),
  weekly_goal_minutes integer not null default 300 check (weekly_goal_minutes between 30 and 6000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('flashcards', 'simulados')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_sec integer default 0 check (duration_sec >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.flashcard_progress (
  user_id uuid not null references public.profiles(id) on delete cascade,
  card_id text not null,
  ease_factor numeric(4,2) not null default 2.50,
  repetitions integer not null default 0,
  interval_days integer not null default 0,
  next_review_at timestamptz not null default now(),
  last_quality integer not null default 0 check (last_quality between 0 and 5),
  updated_at timestamptz not null default now(),
  primary key (user_id, card_id)
);

create table if not exists public.flashcard_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  card_id text not null,
  event_type text not null check (event_type in ('view', 'flip', 'grade')),
  quality integer check (quality between 0 and 5),
  created_at timestamptz not null default now()
);

create table if not exists public.simulado_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  track text not null check (track in ('ME1', 'ME2', 'ME3')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_sec integer default 0 check (duration_sec >= 0),
  score_percent numeric(5,2) default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.simulado_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.simulado_attempts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  question_id text not null,
  selected text not null check (selected in ('A', 'B', 'C', 'D')),
  correct boolean not null,
  answered_at timestamptz not null default now(),
  unique (attempt_id, question_id)
);

create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_sessions_user_created on public.study_sessions(user_id, created_at desc);
create index if not exists idx_flashcard_events_user_created on public.flashcard_events(user_id, created_at desc);
create index if not exists idx_flashcard_events_card on public.flashcard_events(card_id);
create index if not exists idx_attempts_user_created on public.simulado_attempts(user_id, created_at desc);
create index if not exists idx_answers_attempt on public.simulado_answers(attempt_id);
create index if not exists idx_answers_user_question on public.simulado_answers(user_id, question_id);

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user_profile();

alter table public.profiles enable row level security;
alter table public.study_sessions enable row level security;
alter table public.flashcard_progress enable row level security;
alter table public.flashcard_events enable row level security;
alter table public.simulado_attempts enable row level security;
alter table public.simulado_answers enable row level security;

drop policy if exists "profiles self read" on public.profiles;
create policy "profiles self read"
on public.profiles
for select
to authenticated
using (id = auth.uid() or exists (
  select 1 from public.profiles p
  where p.id = auth.uid() and p.role = 'admin'
));

drop policy if exists "profiles self update" on public.profiles;
create policy "profiles self update"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid() and role in ('student', 'admin'));

drop policy if exists "sessions owner all" on public.study_sessions;
create policy "sessions owner all"
on public.study_sessions
for all
to authenticated
using (user_id = auth.uid() or exists (
  select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
))
with check (user_id = auth.uid() or exists (
  select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
));

drop policy if exists "flashcard_progress owner all" on public.flashcard_progress;
create policy "flashcard_progress owner all"
on public.flashcard_progress
for all
to authenticated
using (user_id = auth.uid() or exists (
  select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
))
with check (user_id = auth.uid() or exists (
  select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
));

drop policy if exists "flashcard_events owner all" on public.flashcard_events;
create policy "flashcard_events owner all"
on public.flashcard_events
for all
to authenticated
using (user_id = auth.uid() or exists (
  select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
))
with check (user_id = auth.uid() or exists (
  select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
));

drop policy if exists "simulado_attempts owner all" on public.simulado_attempts;
create policy "simulado_attempts owner all"
on public.simulado_attempts
for all
to authenticated
using (user_id = auth.uid() or exists (
  select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
))
with check (user_id = auth.uid() or exists (
  select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
));

drop policy if exists "simulado_answers owner all" on public.simulado_answers;
create policy "simulado_answers owner all"
on public.simulado_answers
for all
to authenticated
using (user_id = auth.uid() or exists (
  select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
))
with check (user_id = auth.uid() or exists (
  select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
));
