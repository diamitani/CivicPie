import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Find Your Officials',
  description: 'Search 20,000+ elected officials — mayors, council members, state legislators, and Congress — by name, place, or ZIP code.',
};

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
