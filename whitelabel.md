# Decant Platform — White Label Setup

## To launch your own version in ~1 hour

### Step 1 — Fork / clone the repo

### Step 2 — Edit `lib/config.js`

This is the **only file** you need to change to rebrand:

```js
siteName:       'Your Brand Name',
siteNameShort:  'Your Brand',
siteNameAccent: 'Decants',
tagline:        "India's Niche Decant House",
description:    "Your one-liner...",
aboutStory:     "Your personal story...",

whatsappNumber: '91XXXXXXXXXX',    // your number, no +
whatsappDisplay: '+91 XXXXX XXXXX',
instagram:      'your_handle',     // no @
upiId:          'yourname@upi',
upiName:        'Your Name',

adminEmail:     'you@gmail.com',   // who can access /admin
siteUrl:        'https://yoursite.vercel.app',
```

### Step 3 — Set environment variables

In Vercel (or `.env.local` for local dev):

```env
# Supabase (create a new project at supabase.com)
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Razorpay (your own account at razorpay.com)
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_live_xxx
RAZORPAY_KEY_SECRET=xxx

# Gmail (App Password — enable 2FA first)
GMAIL_USER=you@gmail.com
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx

# Admin email (who can log into /admin)
NEXT_PUBLIC_ADMIN_EMAIL=you@gmail.com

# Cloudinary (for product images)
# Update lib/config.js cloudinaryCloud field with your cloud name
```

### Step 4 — Run the database migrations

In your Supabase SQL editor, run the schema file:
```
supabase-schema.sql
```

Then the migrations for new features:
```
supabase_migration_is_new_ADD_COLUMN.sql
supabase_migration_ml_remaining.sql
supabase_migration_combos.sql
supabase_migration_tracking.sql
```

### Step 5 — Deploy

```bash
git add .
git commit -m "initial setup"
git push
```

Connect repo to Vercel → add env vars → deploy.

---

## What's shared between instances

- All the code, features, admin panel
- The pricing formula (`lib/pricing.js`)
- The DB schema structure

## What's separate per instance

- Supabase project (separate DB, separate customers)
- Razorpay account (separate payments)
- Gmail account (separate OTP / order emails)
- Cloudinary account (separate images)
- The `lib/config.js` values (brand, contact, URLs)
- Vercel project (separate deployments)

---

## Feature list

- Full storefront with Brands, Partials, Combos, About
- Admin panel: Orders, Products, Partials, Combos, Stock, Pricing, Discounts
- OTP login (customers stay logged in)
- Wishlist
- Razorpay checkout + WhatsApp checkout
- Product Excel import
- Bulk WhatsApp order import
- Customer email notifications (order confirmed, shipped, delivered)
- Dark / light mode toggle
- Mobile responsive
- SEO ready (sitemap, structured data, robots.txt)