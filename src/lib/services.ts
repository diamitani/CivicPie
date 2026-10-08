import { readFileSync } from 'fs';
import { join } from 'path';

/* Server-side loader for the GovServ nationwide services registry.
   The 3.9MB JSON lives in data/ and is read only on the server —
   never import this module (or the raw JSON) into a client component. */

export interface ServiceLink {
  label: string;
  url: string;
}

export interface ServiceContact {
  kind: string;
  label: string;
  value: string;
}

export interface ServiceScope {
  level: 'state' | 'city' | 'county' | 'federal';
  state: string;
  city?: string;
  county?: string;
  country?: string;
}

export interface GovService {
  id: string;
  name: string;
  agency: string;
  category: string;
  description: string;
  scope: ServiceScope;
  eligibility: string[];
  deadlines: { label: string; date: string | null; note: string }[];
  prerequisites: string[];
  whatToBring: string[];
  contacts: ServiceContact[];
  applyLinks: ServiceLink[];
  languages: string[];
  sources: string[];
  cost: string;
  verifiedAt: string;
}

export interface ServiceSummary {
  id: string;
  name: string;
  agency: string;
  category: string;
  scope: ServiceScope;
  description: string;
  cost: string;
  applyUrl: string | null;
}

let cache: GovService[] | null = null;

export function loadServices(): GovService[] {
  if (cache) return cache;
  const raw = readFileSync(join(process.cwd(), 'data', 'govserv-services.json'), 'utf8');
  cache = JSON.parse(raw) as GovService[];
  return cache;
}

export function getService(id: string): GovService | null {
  return loadServices().find((s) => s.id === id) || null;
}

function summaryOf(s: GovService): ServiceSummary {
  return {
    id: s.id,
    name: s.name,
    agency: s.agency,
    category: s.category,
    scope: s.scope,
    description: s.description.length > 200 ? s.description.slice(0, 200).trimEnd() + '…' : s.description,
    cost: s.cost,
    applyUrl: s.applyLinks && s.applyLinks.length > 0 ? s.applyLinks[0].url : null,
  };
}

export interface ServiceFilters {
  q?: string;
  state?: string;
  category?: string;
  level?: string;
  limit?: number;
  offset?: number;
}

export function searchServices(filters: ServiceFilters): { total: number; data: ServiceSummary[] } {
  const { q, state, category, level } = filters;
  const limit = Math.min(Math.max(filters.limit ?? 25, 1), 100);
  const offset = Math.max(filters.offset ?? 0, 0);

  const terms = (q || '')
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 0);

  const matches = loadServices().filter((s) => {
    if (state && s.scope.state !== state.toUpperCase()) return false;
    if (category && s.category !== category) return false;
    if (level && s.scope.level !== level) return false;
    if (terms.length > 0) {
      const hay = `${s.name} ${s.description} ${s.agency} ${s.category}`.toLowerCase();
      if (!terms.every((t) => hay.includes(t))) return false;
    }
    return true;
  });

  return {
    total: matches.length,
    data: matches.slice(offset, offset + limit).map(summaryOf),
  };
}

export interface ServicesMeta {
  total: number;
  states: { code: string; count: number }[];
  categories: { name: string; count: number }[];
  levels: { level: string; count: number }[];
}

export function servicesMeta(): ServicesMeta {
  const services = loadServices();
  const states = new Map<string, number>();
  const categories = new Map<string, number>();
  const levels = new Map<string, number>();
  for (const s of services) {
    states.set(s.scope.state, (states.get(s.scope.state) || 0) + 1);
    categories.set(s.category, (categories.get(s.category) || 0) + 1);
    levels.set(s.scope.level, (levels.get(s.scope.level) || 0) + 1);
  }
  const byCount = (a: [string, number], b: [string, number]) => b[1] - a[1];
  return {
    total: services.length,
    states: [...states.entries()].sort(byCount).map(([code, count]) => ({ code, count })),
    categories: [...categories.entries()].sort(byCount).map(([name, count]) => ({ name, count })),
    levels: [...levels.entries()].sort(byCount).map(([level, count]) => ({ level, count })),
  };
}
