import type { Metadata } from 'next';
import ServicesDirectory from './ServicesDirectory';

export const metadata: Metadata = {
  title: 'Services — CivicPie',
  description:
    'Search thousands of verified government services — DMV, benefits, licensing, records and more — with links to the official application pages. From CivicPie.',
};

export default function ServicesPage() {
  return <ServicesDirectory />;
}
