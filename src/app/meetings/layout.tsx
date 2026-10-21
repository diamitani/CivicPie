import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Public Meetings',
  description: 'Upcoming city council, board, and committee meetings with dates, times, and agendas from official sources.',
};

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
