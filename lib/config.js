/**
 * SITE CONFIG
 * ─────────────────────────────────────────────────────────────────
 * This is the ONLY file that needs to change to deploy a new
 * white-label instance of this fragrance decant platform.
 *
 * After forking the repo:
 *  1. Edit every value below
 *  2. Set the .env variables for the new Supabase / Razorpay / Gmail
 *  3. Deploy — everything else reads from here automatically
 * ─────────────────────────────────────────────────────────────────
 */

const config = {
  // ── Brand ────────────────────────────────────────────────────────
  siteName: 'Scent Snob Decants',
  siteNameShort: 'Scent Snob', // used in nav logo (first part)
  siteNameAccent: 'Decants', // gold-coloured second part
  tagline: "India's Niche Decant House",
  description:
    'Authentic decants from bottles we personally source. Try before you commit to a full bottle.',

  // ── About page story (keep it personal) ─────────────────────────
  aboutStory:
    'Scent Snob Decants started as a personal obsession. Niche perfumes cost ₹15,000–₹50,000 a bottle — and most people never get to try them before committing. We fix that. We source authentic bottles, decant them ourselves, and ship them across India so you can explore the world of niche fragrance without the financial risk.',

  // ── Contact ──────────────────────────────────────────────────────
  whatsappNumber: '918754519509', // full international format, no +
  whatsappDisplay: '+91 87545 19509', // displayed to users
  instagram: 'the_scent_snob_', // handle without @
  upiId: 'praveenpugazh14@okicici',
  upiName: 'Praveen P',

  // ── Admin ────────────────────────────────────────────────────────
  adminEmail: 'praveenpugazh14@gmail.com',

  // ── URLs ─────────────────────────────────────────────────────────
  siteUrl: 'https://scentsnobdecants.vercel.app',

  // ── Cloudinary ───────────────────────────────────────────────────
  cloudinaryCloud: 'dlakipgdf',

  // ── Shipping ─────────────────────────────────────────────────────
  freeShippingThreshold: 3000, // ₹
  shippingCharge: 160, // ₹

  // ── Business identity for SEO / structured data ──────────────────
  city: 'Bangalore',
  state: 'Karnataka',
  country: 'India',
  countryCode: 'IN',
  locale: 'en_IN',

  // ── SEO ──────────────────────────────────────────────────────────
  seoTitle: 'Scent Snob Decants — Niche Perfume Decants India',
  seoDescription:
    "India's premium niche perfume decant house. Try Xerjoff, Amouage, Creed, Tom Ford and 285+ fragrances in 5ml, 10ml, 20ml & 30ml. PAN India delivery.",
  googleVerification: 'OF__TsA71H_Dy3SD2HjZ28B1VjR8VVlH6ygRljKz2mY',

  // ── Email ────────────────────────────────────────────────────────
  emailFromName: 'Scent Snob Decants',
  emailOrdersName: 'Scent Snob Orders',
  otpSubject: 'Your Scent Snob login code',

  // ── OTP Login greeting ───────────────────────────────────────────
  otpGreeting: 'Scent Snob',

  // ── Hero stats (shown on homepage) ───────────────────────────────
  heroStats: [
    { value: '285', label: 'Fragrances' },
    { value: '5ml', label: 'Starting from' },
    { value: 'PAN India', label: 'Delivery' }
  ],

  // ── Theme ────────────────────────────────────────────────────────
  // Primary accent colour (gold). Change this to rebrand entirely.
  accentColor: '#b09060',

  // ── Copyright year ───────────────────────────────────────────────
  copyrightYear: '2026'
}

export default config

// Named exports for convenient destructuring
export const {
  siteName,
  siteNameShort,
  siteNameAccent,
  tagline,
  description,
  aboutStory,
  whatsappNumber,
  whatsappDisplay,
  instagram,
  upiId,
  upiName,
  adminEmail,
  siteUrl,
  cloudinaryCloud,
  freeShippingThreshold,
  shippingCharge,
  city,
  state,
  country,
  countryCode,
  locale,
  seoTitle,
  seoDescription,
  googleVerification,
  emailFromName,
  emailOrdersName,
  otpSubject,
  otpGreeting,
  heroStats,
  accentColor,
  copyrightYear
} = config
