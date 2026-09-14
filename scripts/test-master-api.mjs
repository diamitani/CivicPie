// API QA harness: builds are assumed fresh; starts `next start`, asserts real
// data on every endpoint, then tears the server down. Exit 0 = all pass.
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const PORT = 3210;
const BASE = `http://localhost:${PORT}`;

async function get(path) {
  const res = await fetch(BASE + path);
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

function assert(cond, label, detail = '') {
  if (!cond) {
    console.error(`✗ FAIL ${label} ${detail}`);
    process.exitCode = 1;
  } else {
    console.log(`✓ ${label}`);
  }
}

async function waitForServer(server) {
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch(BASE + '/api/health');
      if (r.ok) return;
    } catch {}
    await sleep(1500);
  }
  throw new Error('server did not start');
}

const server = spawn('npx', ['next', 'start', '-p', String(PORT)], {
  cwd: new URL('..', import.meta.url).pathname,
  stdio: 'ignore',
});
try {
  await waitForServer(server);

  // 1. Health + real counts
  let r = await get('/api/health');
  assert(r.status === 200 && r.body.ok, 'health 200');
  assert(r.body.source === 'seed', 'source=seed', JSON.stringify(r.body.source));
  assert(r.body.counts.officials === 7977, 'officials=7977', r.body.counts?.officials);
  assert(r.body.counts.candidates === 7077, 'candidates=7077', r.body.counts?.candidates);
  assert(r.body.counts.districts === 101, 'districts=101', r.body.counts?.districts);
  assert(r.body.counts.agencies === 15, 'agencies=15', r.body.counts?.agencies);

  // 2. Real Census lookup — Patrick's building, Ward 48
  r = await get('/api/lookup?address=' + encodeURIComponent('6007 N Sheridan Rd, Chicago, IL'));
  assert(r.status === 200, 'lookup 200');
  assert(r.body.district_id === 'il-chicago-ward-48', 'ward 48', r.body.district_id);
  const names = (r.body.officials || []).map((o) => o.name);
  assert(names.includes('Leni Manaa-Hoppenworth'), 'alderperson present', names.slice(0, 3).join(','));

  // 2b. Out-of-coverage ZIP (North Liberty, IA) → structured 200, NEVER 404
  r = await get('/api/lookup?address=' + encodeURIComponent('52317'));
  assert(r.status === 200, '52317 lookup 200 (no 404)', r.status);
  assert(r.body.coverage === 'none', "coverage='none'", r.body.coverage);
  assert(r.body.state_abbr === 'IA', 'state_abbr=IA', r.body.state_abbr);
  const fed = (r.body.federal_officials || []).map((o) => o.name);
  assert(fed.includes('Chuck Grassley') && fed.includes('Joni Ernst'), 'IA senators present', fed.slice(0, 4).join(','));
  assert((r.body.state_officials || []).length > 0, 'IA state officials present', (r.body.state_officials || []).length);
  assert(typeof r.body.message === 'string' && r.body.message.length > 0, 'coverage message present');

  // 2c. Chicago ZIP → local coverage, ward 48 (unchanged behavior + coverage flag)
  r = await get('/api/lookup?address=' + encodeURIComponent('60660'));
  assert(r.status === 200, '60660 lookup 200', r.status);
  assert(r.body.coverage === 'local', "coverage='local'", r.body.coverage);
  assert(r.body.district_id === 'il-chicago-ward-48', '60660 → ward 48', r.body.district_id);
  assert((r.body.officials || []).length >= 1, '60660 officials present');

  // 3. Officials — pagination cap + total
  r = await get('/api/officials?level=federal&limit=1000');
  assert(r.status === 200, 'officials 200');
  assert(r.body.total === 556, 'total=556 (full count)', r.body.total);
  assert(r.body.data.length === 200, 'page capped at 200', r.body.data.length);

  // 4. Officials search
  r = await get('/api/officials?q=' + encodeURIComponent('Manaa'));
  assert(r.status === 200 && r.body.total >= 1, 'search finds alderperson', r.body.total);

  // 5. District detail
  r = await get('/api/districts/il-chicago-ward-48');
  assert(r.status === 200, 'district 200');
  assert(r.body.data.official_count >= 1, 'district official_count', r.body.data.official_count);

  // 6. Districts filter
  r = await get('/api/districts?type=ward&city=Chicago&state=IL');
  assert(r.status === 200 && r.body.total === 50, '50 Chicago wards', r.body.total);

  // 7. Candidates
  r = await get('/api/candidates?district_id=il-chicago-ward-48');
  assert(r.status === 200, 'candidates 200');

  // 8. Agencies
  r = await get('/api/agencies?level=federal');
  assert(r.status === 200 && r.body.total >= 1, 'agencies found', r.body.total);

  // 9. Malformed address → 404, not 500
  r = await get('/api/lookup?address=' + encodeURIComponent('zzz not a real place qqq'));
  assert(r.status === 404, 'bad address 404', r.status);

  // 10. Missing param → 400
  r = await get('/api/lookup');
  assert(r.status === 400, 'missing address 400', r.status);

  console.log(process.exitCode ? '\nSOME TESTS FAILED' : '\nALL TESTS PASSED');
} finally {
  server.kill('SIGTERM');
  setTimeout(() => server.kill('SIGKILL'), 3000);
}
