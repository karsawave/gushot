// Self-test: runs the test configs and checks the expected result
// (3 OK, 1 deliberate failure -> exit 1, plus a warning for the deliberate typo key),
// plus a --check run of every example config in docs/ and demo/ so they cannot go stale.
// Exits 0 when everything matches. Usage: node test/run.cjs
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const shot = (...args) => {
  const r = spawnSync(process.execPath, [path.join(__dirname, '../skills/guide-screenshots/scripts/shot.cjs'), ...args], {
    cwd: __dirname, encoding: 'utf8', env: { ...process.env, TEST_PASSWORD: 'x' },
  });
  return { status: r.status, out: r.stdout + r.stderr };
};
// PNG width is a big-endian uint32 at byte 16.
const pngWidth = (f) => fs.readFileSync(path.join(__dirname, 'output', f)).readUInt32BE(16);

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
  ['keepLogin: second run reuses the saved login', () => {
    const dir = path.join(__dirname, '.gushot');
    fs.rmSync(dir, { recursive: true, force: true });
    const a = shot('config.keep.json');
    const saved = fs.existsSync(path.join(dir, 'user.json')) && fs.readFileSync(path.join(dir, '.gitignore'), 'utf8').trim() === '*';
    const b = shot('config.keep.json');
    return a.status === 0 && !a.out.includes('saved login reused') && saved
      && b.status === 0 && b.out.includes('session "user": saved login reused') || a.out + b.out;
  }],
  ['video: records a flow, clear error without ffmpeg', () => {
    const missing = shot('config.noffmpeg.json');
    if (missing.status !== 1 || !missing.out.includes('ffmpeg not found')) return missing.out;
    if (spawnSync('ffmpeg', ['-version']).error) { console.log('     (ffmpeg not installed here, recording part skipped)'); return true; }
    const f = path.join(__dirname, 'output', 'v01_open_form.mp4');
    fs.rmSync(f, { force: true });
    const r = shot('config.video.json');
    return r.status === 0 && r.out.includes('v01_open_form.mp4 (video)') && fs.statSync(f).size > 10000 || r.out;
  }],
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
let bad = 0;
for (const [name, run] of cases) {
  const res = run();
  console.log(res === true ? 'PASS' : 'FAIL', name);
  if (res !== true) { bad++; console.log(res); }
}
process.exit(bad ? 1 : 0);
