import './globals.css';

export const metadata = {
  title: 'Scent Snob Decants — Niche & Designer Perfume Decants',
  description: 'Authentic 5ml perfume decants. Niche, Designer & Middle Eastern fragrances. Based in India, ships PAN India.',
  icons: { icon: '/favicon.png', apple: '/favicon.png' },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin:0 }}>{children}</body>
    </html>
  );
}
