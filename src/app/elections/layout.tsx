import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: '2026 Elections & Key Dates',
  description: 'Election Day is November 3, 2026. Registration deadlines, early voting, and candidate filings for your state.',
};

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
