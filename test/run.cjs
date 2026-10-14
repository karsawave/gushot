// Self-test: runs the test configs and checks the expected result
// (3 OK, 1 deliberate failure -> exit 1, plus a warning for the deliberate typo key),
// plus a --check run of every example config in docs/ and demo/ so they cannot go stale.
// Exits 0 when everything matches. Usage: node test/run.cjs
const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const shot = (...args) => {
  const r = spawnSync(process.execPath, [path.join(__dirname, '../skills/guide-screenshots/scripts/shot.cjs'), ...args], {
    cwd: __dirname, encoding: 'utf8', env: { ...process.env, TEST_PASSWORD: 'x' },
  });
  return { status: r.status, out: r.stdout + r.stderr };
};
// Async variant, for when this process must keep serving HTTP while the shot runs.
const shotAsync = (env, ...args) => new Promise((resolve) => {
  const c = spawn(process.execPath, [path.join(__dirname, '../skills/guide-screenshots/scripts/shot.cjs'), ...args], {
    cwd: __dirname, env: { ...process.env, ...env },
  });
  let out = '';
  c.stdout.on('data', (d) => { out += d; });
  c.stderr.on('data', (d) => { out += d; });
  c.on('close', (status) => resolve({ status, out }));
});
// Local HTTP server for pages that need a real origin (cookies) or AJAX: serves test/*.html, plus
// /api/categories and /api/models answering 400 ms late, like the dropdown chain of a real asset form.
async function withServer(run) {
  const api = {
    '/api/categories': (q) => ({ A: [{ v: '9', t: 'APPLICATION' }], B: [{ v: '2', t: 'LAPTOP / NOTEBOOK' }, { v: '1', t: 'LAPTOP' }] })[q.get('code')] || [],
    '/api/models': (q) => ({ 1: [{ v: '11', t: 'THINKPAD E14' }, { v: '10', t: 'THINKPAD' }], 2: [{ v: '20', t: 'IDEAPAD' }] })[q.get('cat')] || [],
  };
  const server = require('http').createServer((req, res) => {
    const u = new URL(req.url, 'http://x');
    if (api[u.pathname]) {
      setTimeout(() => { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(api[u.pathname](u.searchParams))); }, 400);
      return;
    }
    const f = path.join(__dirname, path.basename(u.pathname));
    if (!fs.existsSync(f)) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(fs.readFileSync(f));
  });
  await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
  try { return await run(`http://127.0.0.1:${server.address().port}`); } finally { server.close(); }
}
// PNG width / height are big-endian uint32 at bytes 16 / 20.
const png = (f) => fs.readFileSync(path.join(__dirname, 'output', f));
const pngWidth = (f) => png(f).readUInt32BE(16);
const pngHeight = (f) => png(f).readUInt32BE(20);
// Count pure highlight-red pixels in a PNG (a blurred box would have almost none).
async function redPixels(f) {
  const puppeteer = require('../skills/guide-screenshots/scripts/node_modules/puppeteer-core');
  const chrome = [process.env.CHROME_PATH, ...[process.env.PROGRAMFILES, process.env['PROGRAMFILES(X86)'], process.env.LOCALAPPDATA]
    .filter(Boolean).map((d) => path.join(d, 'Google/Chrome/Application/chrome.exe')),
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium']
    .find((p) => p && fs.existsSync(p));
  const b = await puppeteer.launch({ executablePath: chrome });
  try {
    const page = await b.newPage();
    return await page.evaluate(async (src) => {
      const img = new Image();
      img.src = src;
      await img.decode();
      const c = document.createElement('canvas');
      c.width = img.width; c.height = img.height;
      const x = c.getContext('2d');
      x.drawImage(img, 0, 0);
      const d = x.getImageData(0, 0, c.width, c.height).data;
      let n = 0;
      for (let i = 0; i < d.length; i += 4) if (d[i] > 200 && d[i + 1] < 60 && d[i + 2] < 110) n++;
      return n;
    }, `data:image/png;base64,${png(f).toString('base64')}`);
  } finally { await b.close(); }
}

const cases = [
  ['English keys, numbered highlight, element padding', () => {
    const r = shot('config.test.json');
    return r.status === 1 && r.out.includes('Done: 3 OK, 1 failed') && r.out.includes('unknown key "higlight"')
      && pngWidth('t02_modal.png') === 254 || r.out; // 234px modal + 2 x 10px padding
  }],
  ['Indonesian keys, scale 2', () => {
    const r = shot('config.test.id.json');
    return r.status === 1 && r.out.includes('Selesai: 3 OK, 1 gagal') && r.out.includes('key "sorrot" tidak dikenal')
      && pngWidth('u01_setelah_login.png') === 2560 || r.out;
  }],
  ['--check saves nothing', () => {
    const f = path.join(__dirname, 'output', 't02_modal.png');
    fs.rmSync(f, { force: true });
    const r = shot('config.test.json', 't02', '--check');
    return r.status === 0 && r.out.includes('t02_modal (checked, not saved)') && !fs.existsSync(f) || r.out;
  }],
  ['change report: new, then unchanged', () => {
    fs.rmSync(path.join(__dirname, 'output', 't03_mobile.png'), { force: true });
    const a = shot('config.test.json', 't03');
    const b = shot('config.test.json', 't03');
    return a.out.includes('t03_mobile.png (new)') && a.out.includes('Changed: 0, new: 1.')
      && b.out.includes('t03_mobile.png (unchanged)') && b.out.includes('Changed: 0, new: 0.') || a.out + b.out;
  }],
  // Over HTTP like a real app (file:// pages have odd storage rules); both runs share one server, so
  // the saved login's origin stays the same.
  ['keepLogin: second run reuses the saved login', () => withServer(async (base) => {
    const dir = path.join(__dirname, '.gushot');
    fs.rmSync(dir, { recursive: true, force: true });
    const env = { TEST_BASE: base, TEST_PASSWORD: 'x' };
    const a = await shotAsync(env, 'config.keep.json');
    const saved = fs.existsSync(path.join(dir, 'user.json')) && fs.readFileSync(path.join(dir, '.gitignore'), 'utf8').trim() === '*';
    const b = await shotAsync(env, 'config.keep.json');
    return a.status === 0 && !a.out.includes('saved login reused') && saved
      && b.status === 0 && b.out.includes('session "user": saved login reused') || a.out + b.out;
  })],
  ['video: records a flow, clear error without ffmpeg', () => {
    const missing = shot('config.noffmpeg.json');
    if (missing.status !== 1 || !missing.out.includes('ffmpeg not found')) return missing.out;
    if (spawnSync('ffmpeg', ['-version']).error) { console.log('     (ffmpeg not installed here, recording part skipped)'); return true; }
    const f = path.join(__dirname, 'output', 'v01_open_form.mp4');
    fs.rmSync(f, { force: true });
    const r = shot('config.video.json');
    return r.status === 0 && r.out.includes('v01_open_form.mp4 (video)') && fs.statSync(f).size > 10000 || r.out;
  }],
  ['fill by label, async select, long modal, sharp highlight on blur', async () => {
    const r = shot('config.form.json');
    if (!(r.status === 1 && r.out.includes('Done: 4 OK, 1 failed') && r.out.includes('field label not found: Asset Nmae'))) return r.out;
    if (pngHeight('f03_long_modal.png') < 1400) return `long modal cut off: ${pngHeight('f03_long_modal.png')}px high`;
    const red = await redPixels('f04_sharp_highlight_on_blur.png');
    return red > 300 || `highlight looks blurred: only ${red} red pixels`;
  }],
  ['cookie step sets a session cookie', () => withServer(async (base) => {
    const r = await shotAsync({ TEST_BASE: base, TEST_SESSION: 'abc123' }, 'config.cookie.json');
    return r.status === 0 && r.out.includes('c01_session_cookie') || r.out;
  })],
  ['fill: AJAX-chained dropdowns, field revealed later, exact option text', () => withServer(async (base) => {
    const r = await shotAsync({ TEST_BASE: base }, 'config.cascade.json');
    return r.status === 0 && r.out.includes('Done: 2 OK, 0 failed') || r.out;
  })],
  ['docs and demo examples still run (--check)', () => {
    const docs = fs.readdirSync(path.join(__dirname, '../docs'))
      .filter((d) => fs.existsSync(path.join(__dirname, '../docs', d, 'example.json'))).map((d) => `docs/${d}`);
    const bad = [...docs, 'demo'].map((dir) => {
      const cfg = dir === 'demo' ? 'gushot.json' : 'example.json';
      const r = spawnSync(process.execPath, [path.join(__dirname, '../skills/guide-screenshots/scripts/shot.cjs'), cfg, '--check'], {
        cwd: path.join(__dirname, '..', dir), encoding: 'utf8', env: { ...process.env, APP_PASSWORD: 'x', DEMO_PASSWORD: 'x' },
      });
      return r.status === 0 && !/WARN|PERINGATAN/.test(r.stdout + r.stderr) ? '' : `${dir}:\n${r.stdout}${r.stderr}`;
    }).join('');
    return bad === '' || bad;
  }],
];
(async () => {
  let bad = 0;
  for (const [name, run] of cases) {
    const res = await run();
    console.log(res === true ? 'PASS' : 'FAIL', name);
    if (res !== true) { bad++; console.log(res); }
  }
  process.exit(bad ? 1 : 0);
})();
