-- Create tables for universal assessment and general study plans
create table if not exists user_assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal text not null, -- 'general' | 'ielts' | 'toefl' etc
  self_level text not null, -- 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'
  answers jsonb not null,
  score jsonb not null,
  created_at timestamptz default now()
);

create index if not exists idx_user_assessments_user on user_assessments(user_id);

create table if not exists study_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  band text not null, -- 'A1'..'C2'
  goal text not null,
  plan jsonb not null,
  source text not null default 'template', -- 'template' | 'llm'
  created_at timestamptz default now()
);

create index if not exists idx_study_plans_user on study_plans(user_id);

alter table profiles add column if not exists current_plan_id uuid references study_plans(id) on delete set null;

-- RLS policies (open to owner only)
alter table user_assessments enable row level security;
alter table study_plans enable row level security;

do $$ begin
  create policy "own assessments" on user_assessments
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "own plans" on study_plans
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;


