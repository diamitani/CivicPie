import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

let _directoryCache: any = null;
let _agenciesCache: any = null;

function loadJson(filename: string) {
  const fp = join(process.cwd(), 'public', 'data', filename);
  if (!existsSync(fp)) return null;
  return JSON.parse(readFileSync(fp, 'utf-8'));
}

/**
 * GET /api/search?q=...
 * Full-text search across directory listings, agencies, and civic groups.
 */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.toLowerCase().trim();
  const type = request.nextUrl.searchParams.get('type') || 'all'; // all | directory | agencies | groups
  const limit = parseInt(request.nextUrl.searchParams.get('limit') || '20');

  if (!q || q.length < 2) {
    return NextResponse.json({ error: '?q= parameter required (min 2 chars)' }, { status: 400 });
  }

  const results: any[] = [];

  // Search directory
  if (type === 'all' || type === 'directory') {
    if (!_directoryCache) _directoryCache = loadJson('ward_directory.json');
    const dir = _directoryCache;
    if (dir) {
      for (const [category, entries] of Object.entries(dir)) {
        for (const entry of entries as any[]) {
          if (
            entry.name?.toLowerCase().includes(q) ||
            entry.category?.toLowerCase().includes(q) ||
            entry.neighborhood?.toLowerCase().includes(q) ||
            entry.address?.toLowerCase().includes(q)
          ) {
            results.push({ ...entry, _type: 'directory', _category: category });
          }
        }
      }
    }
  }

  // Search agencies
  if (type === 'all' || type === 'agencies') {
    if (!_agenciesCache) {
      const wd = loadJson('ward_data.json');
      _agenciesCache = wd?.agencies || [];
    }
    for (const agency of _agenciesCache) {
      if (
        agency.name?.toLowerCase().includes(q) ||
        agency.description?.toLowerCase().includes(q) ||
        agency.services?.some((s: string) => s.toLowerCase().includes(q))
      ) {
        results.push({ ...agency, _type: 'agency' });
      }
    }
  }

  // Search civic groups
  if (type === 'all' || type === 'groups') {
    const wd = _agenciesCache ? null : loadJson('ward_data.json');
    const groups = wd?.civicGroups || _agenciesCache ? [] : [];
    if (!_agenciesCache) {
      const wd2 = loadJson('ward_data.json');
      for (const group of (wd2?.civicGroups || [])) {
        if (
          group.name?.toLowerCase().includes(q) ||
          group.focus?.toLowerCase().includes(q) ||
          group.description?.toLowerCase().includes(q) ||
          group.tags?.some((t: string) => t.toLowerCase().includes(q))
        ) {
          results.push({ ...group, _type: 'civic_group' });
        }
      }
    }
  }

  // Deduplicate by id+name
  const seen = new Set();
  const unique = results.filter(r => {
    const key = `${r.id}-${r.name}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return NextResponse.json({
    query: q,
    total: unique.length,
    results: unique.slice(0, limit),
  });
}
