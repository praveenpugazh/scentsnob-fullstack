-- ================================================================
-- AUTH MIGRATION — Run this in Supabase SQL editor
-- Adds user_id to orders so customers can see their order history
-- ================================================================

-- 1. Add user_id column to orders (nullable — guest orders still work)
alter table orders
  add column if not exists user_id uuid references auth.users(id) on delete set null;

-- 2. Index for fast lookup by user
create index if not exists orders_user_id_idx on orders(user_id);

-- 3. RLS: Users can read their own orders
create policy "Users read own orders"
  on orders for select
  using (auth.uid() = user_id);

-- 4. Allow authenticated users to insert orders (with their user_id)
--    (The existing "Public insert orders" policy already covers this,
--     but we update it to be explicit)
drop policy if exists "Public insert orders" on orders;
create policy "Public insert orders"
  on orders for insert
  with check (true);

-- Done! Existing orders (without user_id) are unaffected.
-- New orders from logged-in customers will have user_id set.
