import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: '2026 General Election — Your Ballot, Poll Hours & Polling Place',
  description: 'Election Day is November 3, 2026. See every U.S. Senate, Governor and U.S. House candidate on your ballot, poll hours, mail-ballot deadlines and the official polling-place lookup for all 50 states and D.C.',
};

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
