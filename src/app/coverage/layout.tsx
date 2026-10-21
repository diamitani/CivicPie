import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Coverage Map & Live Lookup',
  description: 'See where CivicPie has hyperlocal coverage and look up any U.S. address for its representatives.',
};

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
