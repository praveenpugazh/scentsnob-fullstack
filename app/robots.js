export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/account', '/checkout', '/api/'],
      },
    ],
    sitemap: 'https://scentsnobdecants.vercel.app/sitemap.xml',
  };
}
