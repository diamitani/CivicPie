import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Explore Your Government',
  description: 'Browse districts, cities, and states to see who represents you and what your government is doing.',
};

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
