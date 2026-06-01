-- Run in Supabase SQL editor
create table if not exists otp_codes (
  email      text primary key,
  otp        text not null,
  expires_at timestamptz not null,
  created_at timestamptz default now()
);

-- Service role only
alter table otp_codes enable row level security;
create policy "Service role only" on otp_codes using (auth.role() = 'service_role');
