import { NextRequest, NextResponse } from 'next/server';
import { serverError } from '@/lib/civic/http';
import { allStates, electionMeta, houseRace, racesForState, stateInfo } from '@/lib/civic/election';

// GET /api/elections                      → all 50 states + DC: Election Day facts + race counts
// GET /api/elections?state=IL             → one state's Election Day facts + every 2026 race
// GET /api/elections?state=IL&district=9  → same, House narrowed to one district (0 = at-large)
export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const st = (sp.get('state') || '').trim().toUpperCase();
    const meta = electionMeta();

    if (!st) {
      const states = allStates().map((s) => {
        const r = racesForState(s.abbr);
        return {
          ...s,
          race_counts: { senate: r.senate.length, governor: r.governor.length, house: r.house.length },
        };
      });
      return NextResponse.json({ ok: true, meta, states });
    }

    const info = stateInfo(st);
    if (!info) {
      return NextResponse.json({ error: `Unknown state "${st}" — use a two-letter code like IL` }, { status: 404 });
    }
    const races = racesForState(st);
    const dRaw = sp.get('district');
    if (dRaw !== null && dRaw !== '') {
      const d = Number(dRaw);
      if (!Number.isInteger(d) || d < 0 || d > 60) {
        return NextResponse.json({ error: 'district must be a whole number (0 = at-large)' }, { status: 400 });
      }
      const one = houseRace(st, d);
      if (!one) {
        return NextResponse.json({ error: `No 2026 House race for ${st} district ${d}` }, { status: 404 });
      }
      races.house = [one];
    }
    return NextResponse.json({ ok: true, meta, state: info, races });
  } catch (e) {
    return serverError(e, 'elections');
  }
}
