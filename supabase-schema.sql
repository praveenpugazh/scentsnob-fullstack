-- ================================================================
-- SCENT SNOB DECANTS — Supabase Schema
-- Run this in your Supabase SQL editor
-- ================================================================

-- ── Products (decants catalogue) ─────────────────────────────────
create table if not exists products (
  id          uuid primary key default gen_random_uuid(),
  brand       text not null,
  name        text not null,
  notes       text,
  category    text not null default 'dupe', -- 'dupe' | 'niche' | 'designer'
  p5          integer not null default 0,
  p10         integer not null default 0,
  p20         integer not null default 0,
  image_url   text,
  sold_out    boolean not null default false,
  visible     boolean not null default true,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ── Partials ─────────────────────────────────────────────────────
create table if not exists partials (
  id          uuid primary key default gen_random_uuid(),
  brand       text not null,
  name        text not null,
  notes       text,
  full_ml     integer not null,
  ml_left     integer not null,
  p5          integer not null default 0,
  p10         integer not null default 0,
  price       integer not null default 0, -- whole bottle price
  condition   text,
  image_url   text,
  sold_out    boolean not null default false,
  visible     boolean not null default false, -- drop system
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ── Orders ───────────────────────────────────────────────────────
create table if not exists orders (
  id          uuid primary key default gen_random_uuid(),
  order_ref   text unique not null, -- e.g. SS-001
  customer    text not null,
  phone       text,
  address     text,
  items       jsonb not null default '[]',
  subtotal    integer not null default 0,
  shipping    integer not null default 0,
  total       integer not null default 0,
  status      text not null default 'Pending', -- Pending | Paid | Shipped | Delivered | Cancelled
  notes       text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ── Bottles (stock tracker) ──────────────────────────────────────
create table if not exists bottles (
  id          uuid primary key default gen_random_uuid(),
  brand       text not null,
  name        text not null,
  start_ml    numeric not null,
  notes       text,
  created_at  timestamptz default now()
);

-- ── Auto-update updated_at ────────────────────────────────────────
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger products_updated_at before update on products
  for each row execute function update_updated_at();

create trigger partials_updated_at before update on partials
  for each row execute function update_updated_at();

create trigger orders_updated_at before update on orders
  for each row execute function update_updated_at();

-- ── Row Level Security ────────────────────────────────────────────
alter table products enable row level security;
alter table partials  enable row level security;
alter table orders    enable row level security;
alter table bottles   enable row level security;

-- Public read for products and partials
create policy "Public read products" on products for select using (true);
create policy "Public read partials" on partials for select using (true);

-- Orders: public insert (checkout), service role for everything else
create policy "Public insert orders" on orders for insert with check (true);
create policy "Service role all orders" on orders using (auth.role() = 'service_role');
create policy "Service role all products" on products using (auth.role() = 'service_role');
create policy "Service role all partials" on partials using (auth.role() = 'service_role');
create policy "Service role all bottles" on bottles using (auth.role() = 'service_role');
create policy "Public read bottles" on bottles for select using (true);
