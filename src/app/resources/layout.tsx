import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Civic Resources',
  description: 'Guides and official resources for voters, residents, and small businesses.',
};

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
