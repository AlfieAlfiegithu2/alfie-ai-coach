create table if not exists jobs_vocab_seed (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  total int not null default 5000,
  completed int not null default 0,
  status text not null default 'running', -- running|paused|done|failed
  last_term text,
  last_error text,
  level int, -- current level bucket being processed
  started_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table jobs_vocab_seed enable row level security;
create policy "jobs_owner" on jobs_vocab_seed for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists idx_jobs_vocab_seed_user on jobs_vocab_seed(user_id);

