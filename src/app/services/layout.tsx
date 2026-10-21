import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Government Services & Grants',
  description: 'Public services, assistance programs, and grant opportunities from official sources.',
};

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
