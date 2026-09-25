import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import './globals.css';

const SITE_URL = 'https://civicpie.com';
const TITLE = 'CivicPie — Hyperlocal Civic Engagement';
const DESCRIPTION =
  'Your city. Your government. In one place. Find your district, officials, events, elections, and community resources. Free, nonpartisan, no account required.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: '%s — CivicPie',
  },
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: 'Local info. Real impact. Nonpartisan. Powered by public data.',
    url: SITE_URL,
    siteName: 'CivicPie',
    type: 'website',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'CivicPie — Hyperlocal Civic Engagement',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: 'Local info. Real impact. Nonpartisan. Powered by public data.',
    images: ['/og-image.png'],
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
      <body className="antialiased">
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
