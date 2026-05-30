-- Run in Supabase SQL editor
alter table orders add column if not exists payment_id text;
alter table orders add column if not exists razorpay_order_id text;
