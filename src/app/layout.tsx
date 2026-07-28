import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CivicPie — Hyperlocal Civic Engagement',
  description: 'Your city. Your government. In one place. Find your district, officials, events, elections, and community resources.',
  openGraph: {
    title: 'CivicPie — Hyperlocal Civic Engagement',
    description: 'Local info. Real impact. Nonpartisan. Powered by public data.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;900&family=Lora:ital,wght@0,400;0,600;1,400;1,600&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
