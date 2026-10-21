import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'About CivicPie',
  description: 'CivicPie is a free, nonpartisan civic directory built on public data — who we are and how the data works.',
};

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
