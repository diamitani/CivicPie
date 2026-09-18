// 100-input lookup regression for CivicPie launch QA.
// Spawns `next start`, runs 100 /api/lookup inputs, asserts no 500s,
// territory coverage, North Liberty routing, and clean invalid-input handling.
// Exit 0 = all assertions pass.
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const PORT = 3211;
const BASE = `http://localhost:${PORT}`;

const TERRITORIES = [
  { zip: '00901', delegate: 'Pablo', governor: 'Gonz' },
  { zip: '96910', delegate: 'Moylan', governor: 'Leon Guerrero' },
  { zip: '00802', delegate: 'Plaskett', governor: 'Bryan' },
  { zip: '96799', delegate: 'Amata', governor: 'Pula' },
  { zip: '96950', delegate: 'King-Hinds', governor: 'Apatang' },
];

const LOCAL = [
  { zip: '52317', expectHref: '/city/north-liberty', expectLocal: true },
  { zip: '60660', expectHref: null, expectLocal: true }, // Ward 48
  { zip: '60601', expectHref: null, expectLocal: true }, // Chicago Loop ward
  { zip: '60602', expectHref: null, expectLocal: true }, // Chicago Loop ward
];

const STATE_ZIPS = [
  '10001', '90001', '77001', '85001', '19101', '78201', '92101',
  '75201', '78701', '32099', '76101', '43085', '28201', '46201', '94101',
  '98101', '80201', '37201', '20001', '79901', '02101', '97201', '89101',
  '48201', '38101', '40201', '21201', '53201', '87101', '85701', '93701',
  '95814', '30301', '64101', '68101', '33101', '55401', '74101', '33601',
  '70112', '44101', '96801', '45201', '32801', '15201', '63101', '99501',
  '68501', '50301', '52240', '52401', '52801', '83701', '59101', '58102',
  '57101', '82001', '84101', '59601', '89701', '87501', '73101', '72201',
  '39201', '36101', '99801', '19901', '05401', '03301', '02901', '06101',
  '08601', '23218', '25301', '27601', '29201', '29601', '05701', '04401',
  '21202', '19103', '90002', '77002', '85002',
];

const INVALID = ['00000', '99999', '1234', '123456', 'abcde', 'ZIPCODE', '', '9021O'];

const INPUTS = [
  ...TERRITORIES.map((t) => t.zip),
  ...LOCAL.map((l) => l.zip),
  ...STATE_ZIPS,
  ...INVALID,
];

console.log(`Total inputs: ${INPUTS.length}`);

let pass = 0;
let fail = 0;
const failures = [];
function check(cond, label, detail = '') {
  if (cond) {
    pass++;
  } else {
    fail++;
    failures.push(`${label} ${detail}`);
    console.error(`✗ FAIL ${label} ${detail}`);
  }
}

async function lookup(q) {
  const res = await fetch(`${BASE}/api/lookup?address=${encodeURIComponent(q)}`);
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

const server = spawn('npx', ['next', 'start', '-p', String(PORT)], {
  cwd: new URL('..', import.meta.url).pathname,
  stdio: 'ignore',
});

async function waitForServer() {
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch(`${BASE}/api/health`);
      if (r.ok) return;
    } catch {}
    await sleep(1500);
  }
  throw new Error('server did not start');
}

try {
  await waitForServer();

  let validOk = 0;
  let validTotal = 0;

  for (const q of INPUTS) {
    const { status, body } = await lookup(q);
    const isInvalid = INVALID.includes(q);
    check(status !== 500, `no-500:${q || '(empty)'}`, `got ${status}`);

    if (isInvalid) {
      check(status === 404 || status === 400, `invalid-rejected:${q || '(empty)'}`, `got ${status}`);
      continue;
    }

    validTotal++;
    const terr = TERRITORIES.find((t) => t.zip === q);
    const loc = LOCAL.find((l) => l.zip === q);

    if (terr) {
      const fed = JSON.stringify(body.federal_officials || []);
      const st = JSON.stringify(body.state_officials || []);
      check(status === 200, `territory-200:${q}`, `got ${status}`);
      check(fed.includes(terr.delegate), `territory-delegate:${q}`, `missing ${terr.delegate}`);
      check(st.includes(terr.governor), `territory-governor:${q}`, `missing ${terr.governor}`);
      if (status === 200 && fed.includes(terr.delegate) && st.includes(terr.governor)) validOk++;
      continue;
    }
    if (loc) {
      check(status === 200, `local-200:${q}`, `got ${status}`);
      check(body.coverage === 'local', `local-coverage:${q}`, `got ${body.coverage}`);
      if (loc.expectHref) {
        check(body.district_href === loc.expectHref, `local-href:${q}`, `got ${body.district_href}`);
      }
      const offs = body.officials || [];
      check(offs.length > 0, `local-officials:${q}`, `got ${offs.length}`);
      if (status === 200 && body.coverage === 'local' && offs.length > 0) validOk++;
      continue;
    }
    // Regular state ZIP: expect 200 with federal officials.
    const fedCount = (body.federal_officials || []).length;
    check(status === 200, `state-200:${q}`, `got ${status} ${body.error || ''}`);
    check(fedCount > 0, `state-federal:${q}`, `got ${fedCount}`);
    if (status === 200 && fedCount > 0) validOk++;
  }

  console.log(`\n── Summary ──`);
  console.log(`Assertions: ${pass} passed, ${fail} failed`);
  console.log(`Valid inputs resolving with data: ${validOk}/${validTotal}`);
  if (failures.length) {
    console.log(`\nFailures:\n${failures.join('\n')}`);
    process.exitCode = 1;
  } else {
    console.log('ALL REGRESSION CHECKS PASSED');
  }
} finally {
  server.kill();
}
