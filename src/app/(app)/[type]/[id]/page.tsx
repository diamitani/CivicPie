import DistrictPageClient from './DistrictPageClient';

const KNOWN_DISTRICTS: { type: 'ward' | 'city' | 'county' | 'state' | 'federal'; ids: string[] }[] = [
  { type: 'ward', ids: ['chicago-48'] },
  { type: 'city', ids: ['chicago', 'new-york', 'los-angeles', 'houston', 'phoenix', 'philadelphia',
    'san-antonio', 'san-diego', 'dallas', 'austin', 'jacksonville', 'fort-worth', 'columbus',
    'charlotte', 'indianapolis', 'san-francisco', 'seattle', 'denver', 'nashville', 'washington-dc',
    'el-paso', 'boston', 'portland', 'las-vegas', 'detroit', 'memphis', 'louisville', 'baltimore',
    'milwaukee', 'albuquerque', 'tucson', 'fresno', 'sacramento', 'atlanta', 'kansas-city',
    'omaha', 'miami', 'minneapolis', 'tulsa', 'tampa', 'new-orleans', 'cleveland', 'honolulu',
    'cincinnati', 'orlando', 'pittsburgh', 'st-louis', 'anchorage', 'lincoln'] },
  { type: 'county', ids: ['cook'] },
  { type: 'state', ids: ['alabama', 'alaska', 'arizona', 'arkansas', 'california', 'colorado',
    'connecticut', 'delaware', 'florida', 'georgia', 'hawaii', 'idaho', 'illinois', 'indiana',
    'iowa', 'kansas', 'kentucky', 'louisiana', 'maine', 'maryland', 'massachusetts', 'michigan',
    'minnesota', 'mississippi', 'missouri', 'montana', 'nebraska', 'nevada', 'new-hampshire',
    'new-jersey', 'new-mexico', 'new-york', 'north-carolina', 'north-dakota', 'ohio', 'oklahoma',
    'oregon', 'pennsylvania', 'rhode-island', 'south-carolina', 'south-dakota', 'tennessee',
    'texas', 'utah', 'vermont', 'virginia', 'washington', 'west-virginia', 'wisconsin', 'wyoming'] },
  { type: 'federal', ids: ['us'] },
];

export function generateStaticParams() {
  const params: { type: string; id: string }[] = [];
  for (const group of KNOWN_DISTRICTS) {
    for (const id of group.ids) {
      params.push({ type: group.type, id });
    }
  }
  return params;
}

export default function DistrictPage() {
  return <DistrictPageClient />;
}
