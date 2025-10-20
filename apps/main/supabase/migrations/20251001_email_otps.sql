-- Create table for email OTPs used during pre-verification
create table if not exists public.email_otps (
  id bigserial primary key,
  email text not null,
  code text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

-- Basic index to speed up lookups
create index if not exists email_otps_email_idx on public.email_otps (email);
create index if not exists email_otps_email_code_idx on public.email_otps (email, code);

-- Row Level Security: allow inserts/selects from edge functions (service role)
alter table public.email_otps enable row level security;
create policy "service-role full access" on public.email_otps for all to service_role using (true) with check (true);


