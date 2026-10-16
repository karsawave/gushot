#!/usr/bin/env node
/**
 * GuShot (Guide User Shot): capture web app user-guide screenshots from a single JSON config.
 *
 *   node shot.cjs <config.json> [filter...] [--check] [--md <file>] [--guide <file>] [--login <session>]
 *   filter  = only shots whose name contains that text
 *   --check = run every step but save no images (catch broken selectors)
 *   --md    = also write a Markdown guide skeleton (caption, image, numbered notes per shot)
 *   --guide = check a Markdown guide against the config (images without a shot, captions that differ)
 *   --login = log in by hand once in a visible browser and save it for keepLogin (SSO, captcha)
 *
 * Config format: see ../assets/config.example.json and ../references/REFERENCE.md.
 * Config keys are English; the Indonesian keys from v1 are accepted as aliases.
 * {{NAME}} in the config is replaced from the environment (e.g. passwords), so
 * secrets never live in the file. Output language: "lang" in config or
 * GUSHOT_LANG env (old name SHOT_LANG still works), "en" (default) or "id".
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { pathToFileURL } = require('url');
const { execSync, spawnSync } = require('child_process');
let puppeteer;
try {
  puppeteer = require('puppeteer-core');
} catch {
  console.error(`Dependency missing. Run once:\n  npm install --omit=dev --prefix "${__dirname}"`);
  process.exit(2);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- messages (en primary, id secondary) ----------
const MSG = {
  en: {
    usage: 'Usage: node shot.cjs <config.json> [filter...] [--check] [--md <file>] [--guide <file>] [--login <session>]',
    envMissing: (k) => `Environment variable ${k} is not set`,
    noChrome: 'Chrome/Edge not found, set "chrome" in the config or the CHROME_PATH env',
    textNotFound: (t) => `text "${t}" not found`,
    unknownStep: (s) => `unknown step: ${s}`,
    cmdFailed: (c) => `  (command failed, continuing): ${c}`,
    otpNotFound: (f) => `OTP not found in ${f}`,
    noSession: (n) => `session "${n}" is not defined in the config`,
    noElement: (s) => `element ${s} not found`,
    noOption: (v) => `option "${v}" not found`,
    noLabel: (l) => `field label not found: ${l}`,
    unknownKey: (k) => `WARN unknown key "${k}" (typo?), ignored`,
    reusedLogin: (n) => `      (session "${n}": saved login reused)`,
    loginNotReused: (n, why) => `      (session "${n}": saved login not usable, logging in again: ${why})`,
    noFfmpeg: 'ffmpeg not found (needed for "video"): install it, or set "ffmpeg" in the config to its path',
    video: 'video',
    noShots: 'No matching shots.',
    ok: 'OK   ', fail: 'FAIL ', checked: (n) => `${n} (checked, not saved)`,
    state: { new: 'new', changed: 'changed', same: 'unchanged' },
    changes: (c, n) => `Changed: ${c}, new: ${n}.`,
    mdWritten: (f) => `Guide skeleton: ${f}`,
    before: (f) => `, before: ${f}`,
    guideNoVersion: '"guide" needs a "version", e.g. { "version": "1.0" }',
    variantNoSuffix: 'every variant needs a "suffix", e.g. { "suffix": "-en" }',
    guideNoShot: (w, src) => `${w}: ${src} is used by the guide but no shot makes it`,
    loginNeeds: '--login needs "keepLogin" (minutes) in the config, and the session needs an "open" step and a "wait" selector that only shows when logged in',
    loginWaiting: (n, sel) => `Log in as "${n}" in the browser window. Waiting up to 5 minutes for ${sel} ...`,
    loginSaved: (n, f, m) => `Login for "${n}" saved to ${f}; runs in the next ${m} minutes skip the login`,
    noDevice: (n, l) => `unknown device "${n}"${l.length ? `, did you mean: ${l.join(', ')}` : ''} (names as in puppeteer KnownDevices)`,
    guideAlt: (w, n, a, c) => `${w}: ${n} alt text "${a}" differs from its caption "${c}"`,
    guideItalic: (w, n, a, c) => `${w}: ${n} caption line "${a}" differs from its caption "${c}"`,
    guideUnused: (l) => `shots not used in the guide (info): ${l.join(', ')}`,
    guideNotRaised: (v) => `Images changed since version ${v}; raise guide.version in the config`,
    revisionRow: (v, d, what) => `Revision row: | ${v} | ${d} | ${what} | (reason) |`,
    orphans: (out, l) => `Images in ${out} that no shot makes (renamed or removed?): ${l.join(', ')}`,
    badTime: (v) => `freezeTime "${v}" is not a date, use e.g. "2026-01-15T09:00:00"`,
    mdRun: (d, c, n) => `> GuShot run ${d}: ${[c.length && `changed: ${c.join(', ')}`, n.length && `new: ${n.join(', ')}`].filter(Boolean).join('; ') || 'no image changes'}`,
    mdRunCheck: (d) => `> GuShot run ${d} (--check, no images saved)`,
    done: (ok, bad, out) => `\nDone: ${ok} OK, ${bad} failed. Output in ${out}`,
  },
  id: {
    usage: 'Pemakaian: node shot.cjs <config.json> [saring...] [--check] [--md <file>] [--guide <file>] [--login <session>]',
    envMissing: (k) => `Environment ${k} belum diisi`,
    noChrome: 'Chrome/Edge tidak ditemukan, isi "chrome" di konfigurasi atau env CHROME_PATH',
    textNotFound: (t) => `teks "${t}" tidak ditemukan`,
    unknownStep: (s) => `langkah tidak dikenal: ${s}`,
    cmdFailed: (c) => `  (perintah gagal, lanjut): ${c}`,
    otpNotFound: (f) => `OTP tidak ditemukan di ${f}`,
    noSession: (n) => `sesi "${n}" tidak ada di konfigurasi`,
    noElement: (s) => `elemen ${s} tidak ada`,
    noOption: (v) => `opsi "${v}" tidak ditemukan`,
    noLabel: (l) => `label kolom tidak ditemukan: ${l}`,
    unknownKey: (k) => `PERINGATAN key "${k}" tidak dikenal (salah ketik?), diabaikan`,
    reusedLogin: (n) => `      (sesi "${n}": login tersimpan dipakai ulang)`,
    loginNotReused: (n, why) => `      (sesi "${n}": login tersimpan tidak bisa dipakai, login ulang: ${why})`,
    noFfmpeg: 'ffmpeg tidak ditemukan (dibutuhkan "video"): pasang ffmpeg, atau isi "ffmpeg" di konfigurasi dengan path-nya',
    video: 'video',
    noShots: 'Tidak ada shot yang cocok.',
    ok: 'OK   ', fail: 'GAGAL', checked: (n) => `${n} (diperiksa, tidak disimpan)`,
    state: { new: 'baru', changed: 'berubah', same: 'sama' },
    changes: (c, n) => `Berubah: ${c}, baru: ${n}.`,
    mdWritten: (f) => `Kerangka panduan: ${f}`,
    before: (f) => `, sebelumnya: ${f}`,
    guideNoVersion: '"guide" butuh "version", contoh: { "version": "1.0" }',
    variantNoSuffix: 'setiap varian butuh "suffix", contoh: { "suffix": "-en" }',
    guideNoShot: (w, src) => `${w}: ${src} dipakai panduan tapi tidak dibuat shot mana pun`,
    loginNeeds: '--login butuh "keepLogin" (menit) di config, dan sesinya butuh langkah "open" serta selector "wait" yang hanya muncul setelah login',
    loginWaiting: (n, sel) => `Silakan login sebagai "${n}" di jendela browser. Menunggu ${sel} paling lama 5 menit ...`,
    loginSaved: (n, f, m) => `Login "${n}" disimpan di ${f}; run dalam ${m} menit ke depan tidak perlu login`,
    noDevice: (n, l) => `perangkat "${n}" tidak dikenal${l.length ? `, mungkin: ${l.join(', ')}` : ''} (nama sesuai KnownDevices puppeteer)`,
    guideAlt: (w, n, a, c) => `${w}: teks alt ${n} "${a}" beda dengan caption "${c}"`,
    guideItalic: (w, n, a, c) => `${w}: baris keterangan ${n} "${a}" beda dengan caption "${c}"`,
    guideUnused: (l) => `shot yang tidak dipakai panduan (info): ${l.join(', ')}`,
    guideNotRaised: (v) => `Gambar berubah sejak versi ${v}; naikkan guide.version di config`,
    revisionRow: (v, d, what) => `Baris revisi: | ${v} | ${d} | ${what} | (alasan) |`,
    orphans: (out, l) => `Gambar di ${out} yang tidak dibuat shot mana pun (ganti nama atau dihapus?): ${l.join(', ')}`,
    badTime: (v) => `freezeTime "${v}" bukan tanggal, contoh: "2026-01-15T09:00:00"`,
    mdRun: (d, c, n) => `> Run GuShot ${d}: ${[c.length && `berubah: ${c.join(', ')}`, n.length && `baru: ${n.join(', ')}`].filter(Boolean).join('; ') || 'tidak ada gambar yang berubah'}`,
    mdRunCheck: (d) => `> Run GuShot ${d} (--check, tidak ada gambar yang disimpan)`,
    done: (ok, bad, out) => `\nSelesai: ${ok} OK, ${bad} gagal. Hasil di ${out}`,
  },
};
const ENV_LANG = process.env.GUSHOT_LANG || process.env.SHOT_LANG;
let T = MSG[(ENV_LANG || 'en').slice(0, 2)] || MSG.en;

// ---------- Indonesian key aliases ----------
const ALIAS = {
  root: { ingatLogin: 'keepLogin', skala: 'scale', keluar: 'out', blurSelalu: 'alwaysBlur', kekuatanBlur: 'blurStrength', warnaSorot: 'highlightColor',
    jeda: 'delay', tema: 'theme', sesi: 'sessions', bahasa: 'lang', gantiTeks: 'replaceText', bekukanWaktu: 'freezeTime', awal: 'init', panduan: 'guide', perangkat: 'device', nomorGambar: 'captionNumber', varian: 'variants' },
  shot: { nama: 'name', sesi: 'session', langkah: 'steps', elemen: 'element', penuh: 'fullPage',
    sembunyikan: 'hide', jarak: 'padding', sorot: 'highlight', sesiBaru: 'freshSession', jeda: 'delay', keterangan: 'caption', gantiTeks: 'replaceText', perangkat: 'device', bab: 'chapter', lewatiNomor: 'skipNumbers' },
  step: { buka: 'open', ketik: 'type', teks: 'text', klik: 'click', klikTeks: 'clickText', di: 'within',
    pilih: 'select', nilai: 'value', tekan: 'press', tunggu: 'wait', tungguTeks: 'waitText', batas: 'timeout',
    gulirKe: 'scrollTo', perintah: 'run', isi: 'fill' },
  otp: { pola: 'pattern', ke: 'into', kirim: 'submit', coba: 'tries' },
  highlight: { catatan: 'note', teks: 'text' },
  guide: { versi: 'version', tanggal: 'date', versiAplikasi: 'appVersion' },
  variant: { akhiran: 'suffix', langkah: 'steps', tema: 'theme' },
};
const alias = (o, map) => (o && typeof o === 'object' && !Array.isArray(o)
  ? Object.fromEntries(Object.entries(o).map(([k, v]) => [map[k] || k, v])) : o);

// Known keys (after aliasing). Anything else is most likely a typo: warn once, don't fail.
// Keys starting with "_" or "$" are free for comments / $schema.
const KEYS = {
  root: 'base keepLogin ffmpeg scale out viewport theme alwaysBlur blurStrength highlightColor css delay headless chrome lang replaceText freezeTime init guide device captionNumber variants sessions shots',
  shot: 'name session url steps video element padding fullPage blur hide highlight viewport freshSession delay caption replaceText device chapter skipNumbers',
  step: 'open type text click clickText within select value fill cookie press wait waitText timeout scrollTo js run cwd otp',
  otp: 'file pattern into submit tries',
  highlight: 'selector label note text',
  guide: 'version date appVersion',
  variant: 'suffix steps theme viewport',
};
const warned = new Set();
const check = (o, kind) => {
  for (const k of Object.keys(o || {})) {
    if (/^[_$]/.test(k) || KEYS[kind].split(' ').includes(k) || warned.has(k)) continue;
    warned.add(k);
    console.warn(T.unknownKey(k));
  }
  return o;
};
const step = (s) => {
  const r = check(alias(s, ALIAS.step), 'step');
  if (r.otp) r.otp = check(alias(r.otp, ALIAS.otp), 'otp');
  if (r.otp?.submit && typeof r.otp.submit === 'object') r.otp.submit = step(r.otp.submit);
  return r;
};

// ---------- config ----------
const args = process.argv.slice(2);
const CHECK = args.includes('--check');
const mdAt = args.indexOf('--md');
const MD = mdAt < 0 ? null : path.resolve(args.splice(mdAt, 2)[1] || 'guide.md');
const loginAt = args.indexOf('--login');
const LOGIN = loginAt < 0 ? null : args.splice(loginAt, 2)[1];
if (loginAt >= 0 && !LOGIN) { console.error(T.usage); process.exit(1); }
const guideAt = args.indexOf('--guide');
const GUIDE = guideAt < 0 ? null : args.splice(guideAt, 2)[1];
if (guideAt >= 0 && !GUIDE) { console.error(T.usage); process.exit(1); }
const [configFile, ...filters] = args.filter((a) => a !== '--check');
if (!configFile) { console.error(T.usage); process.exit(1); }
const configDir = path.dirname(path.resolve(configFile));
const raw = fs.readFileSync(configFile, 'utf8').replace(/\{\{(\w+)\}\}/g, (_, k) => {
  if (process.env[k] === undefined) throw new Error(T.envMissing(k));
  return JSON.stringify(process.env[k]).slice(1, -1);
});
const cfg = alias(JSON.parse(raw), ALIAS.root);
if (!ENV_LANG && cfg.lang) T = MSG[cfg.lang] || MSG.en;
check(cfg, 'root');
if (cfg.guide) {
  cfg.guide = check(alias(cfg.guide, ALIAS.guide), 'guide');
  if (!cfg.guide.version) { console.error(T.guideNoVersion); process.exit(1); }
}
cfg.shots = (cfg.shots || []).map((s) => {
  const r = check(alias(s, ALIAS.shot), 'shot');
  r.steps = (r.steps || []).map(step);
  // "#save" or { "selector": "#save", "label": "1", "note": "Click to save" }
  // (numbered badge for "click 1, then 2"; note = short callout text next to the box).
  r.highlight = (r.highlight || []).map((h) => (typeof h === 'string' ? { selector: h } : check(alias(h, ALIAS.highlight), 'highlight')));
  return r;
});
for (const n of Object.keys(cfg.sessions || {})) cfg.sessions[n] = cfg.sessions[n].map(step);
// captionNumber "Gambar {chapter}.{n}": numbers the captions in config order, over all shots (not only
// filtered ones), so a shot keeps its number when run alone. `chapter` carries over to the next shots
// and restarts {n}; `skipNumbers` leaves room for figures GuShot does not make (diagrams).
if (cfg.captionNumber) {
  let chapter = '', n = 0;
  for (const s of cfg.shots) {
    if (s.chapter !== undefined && String(s.chapter) !== chapter) { chapter = String(s.chapter); n = 0; }
    n += s.skipNumbers || 0;
    if (!s.caption || s.video) continue;
    n++;
    s.caption = `${cfg.captionNumber.replace('{chapter}', chapter).replace('{n}', n)} ${s.caption}`;
  }
}

const BASE = (cfg.base || '').replace(/\/$/, '');
// variants: every shot once per variant (language, theme, size), saved as <name><suffix>, each variant in
// its own browser sessions. Expanded after captionNumber so a shot has the same number in every variant.
if (cfg.variants) {
  cfg.variants = cfg.variants.map((v) => {
    const r = check(alias(v, ALIAS.variant), 'variant');
    if (!r.suffix) { console.error(T.variantNoSuffix); process.exit(1); }
    r.steps = (r.steps || []).map(step);
    return r;
  });
  cfg.shots = cfg.variants.flatMap((v) => cfg.shots.map((s) => ({
    ...s, variant: v, name: s.name.replace(/(\.png)?$/, `${v.suffix}$1`),
    viewport: v.viewport || s.viewport ? { ...v.viewport, ...s.viewport } : undefined,
  })));
}

const OUT = path.resolve(configDir, cfg.out || 'output');
// "init": "code" or { "file": "helpers.js" } (relative to the config).
const INIT = cfg.init?.file ? fs.readFileSync(path.resolve(configDir, cfg.init.file), 'utf8') : cfg.init;
// scale 2 = sharp images for print/PDF and HiDPI screens (pixel size doubles).
const VIEWPORT = { width: 1280, height: 900, deviceScaleFactor: cfg.scale ?? 1, ...(cfg.viewport || {}) };
// "./page.html" = local file relative to the config folder.
const absUrl = (u) => (/^[a-z]+:/i.test(u) ? u
  : u.startsWith('./') || u.startsWith('../') ? pathToFileURL(path.resolve(configDir, u)).href
  : BASE + u);

function findChrome() {
  if (cfg.chrome) return path.resolve(configDir, cfg.chrome);
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const env = process.env;
  // Windows: install folders come from the environment (any drive, per-user installs too).
  const win = [env.PROGRAMFILES, env['PROGRAMFILES(X86)'], env.LOCALAPPDATA].filter(Boolean).flatMap((d) => [
    path.join(d, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    path.join(d, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
  ]);
  // macOS: system-wide and per-user Applications folders.
  const mac = ['/Applications', path.join(os.homedir(), 'Applications')].flatMap((d) => [
    path.join(d, 'Google Chrome.app', 'Contents', 'MacOS', 'Google Chrome'),
    path.join(d, 'Microsoft Edge.app', 'Contents', 'MacOS', 'Microsoft Edge'),
    path.join(d, 'Chromium.app', 'Contents', 'MacOS', 'Chromium'),
  ]);
  // Anywhere on PATH (Linux packages, snap, /opt symlinks, portable installs).
  const names = ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser', 'microsoft-edge', 'chrome', 'msedge'];
  const ext = process.platform === 'win32' ? '.exe' : '';
  const onPath = (env.PATH || '').split(path.delimiter).filter(Boolean).flatMap((d) => names.map((n) => path.join(d, n + ext)));
  const found = [...win, ...mac, ...onPath].find((p) => fs.existsSync(p));
  if (!found) throw new Error(T.noChrome);
  return found;
}

// ---------- browser actions ----------
// Find an element by its visible text (buttons, links, labels); shortest match wins.
async function byText(page, text, selector = 'button, a, [role=button], label, summary, li, span') {
  const h = await page.evaluateHandle((s, t) => [...document.querySelectorAll(s)]
    .filter((e) => e.offsetParent !== null && e.innerText?.trim().includes(t))
    .sort((a, b) => a.innerText.length - b.innerText.length)[0] || null, selector, text);
  const el = h.asElement();
  if (!el) throw new Error(T.textNotFound(text));
  return el;
}

const settle = (page, ms = 400) => page.waitForNetworkIdle({ idleTime: ms, timeout: 15000 }).catch(() => {});

// Pick an option of a <select> by value or by the start of its text, waiting for options that load
// later (AJAX). A native change event is enough for Select2 and similar plugins: they listen to it.
async function choose(page, handle, value, timeout) {
  const ok = await page.waitForFunction((e, v) => {
    const t = String(v).trim().toLowerCase();
    const text = (x) => x.text.trim().toLowerCase();
    // Exact text before "starts with", so "LAPTOP" does not pick "LAPTOP / NOTEBOOK" listed above it.
    const o = [...e.options].find((x) => x.value === String(v))
      || [...e.options].find((x) => x.value && text(x) === t)
      || [...e.options].find((x) => x.value && text(x).startsWith(t));
    if (!o) return false;
    e.value = o.value;
    e.dispatchEvent(new Event('input', { bubbles: true }));
    e.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }, { timeout: timeout ?? 15000, polling: 250 }, handle, value).catch(() => null);
  if (!ok) throw new Error(T.noOption(value));
}

// { "fill": { "Asset Name": "Laptop", "Supplier": "PT Sinar Jaya", "Active": true } }: find each field
// by its visible <label> text (inside `within`, else inside an open modal, else the page) and fill it.
// Real forms change while they are filled: a choice can reveal more fields, or reload the options of
// the next dropdown over AJAX (Asset Code -> Category -> Model). So each label is waited for, and
// after each field the page's network requests are allowed to finish before the next one.
async function fillByLabel(page, fields, within, timeout) {
  const missing = [];
  for (const [label, value] of Object.entries(fields)) {
    const until = Date.now() + (timeout ?? 15000);
    let h = null;
    for (;;) {
      h = (await findByLabel(page, label, within)).asElement();
      if (h || Date.now() > until) break;
      await sleep(250);
    }
    if (!h) { missing.push(label); continue; }
    const kind = await h.evaluate((e) => (e._flatpickr ? 'picker' : e.tagName === 'SELECT' ? 'select'
      : ['checkbox', 'radio'].includes(e.type) ? 'check'
        : e.readOnly || ['date', 'datetime-local', 'time', 'month', 'week', 'color', 'range'].includes(e.type) ? 'set' : 'type'));
    if (kind === 'select') await choose(page, h, value, timeout);
    else if (kind === 'check') await h.evaluate((e, v) => { if (e.checked !== !!v) e.click(); }, value);
    else if (kind === 'picker') {
      // flatpickr turns date fields into text fields that open a calendar on focus; typing there
      // left the calendar open over the form in the image. Use its API and keep it closed.
      await h.evaluate((e, v) => { e._flatpickr.setDate(v, true); e._flatpickr.close(); }, String(value));
    } else if (kind === 'set') {
      await h.evaluate((e, v) => {
        e.value = v;
        e.dispatchEvent(new Event('input', { bubbles: true }));
        e.dispatchEvent(new Event('change', { bubbles: true }));
      }, String(value));
    } else {
      await h.evaluate((e) => { e.value = ''; e.focus(); });
      await h.type(String(value));
      await h.evaluate((e) => e.blur()); // close autocomplete lists and pickers that open on focus
    }
    await settle(page, 300);
  }
  if (missing.length) throw new Error(T.noLabel(missing.join(', ')));
}

function findByLabel(page, label, within) {
  return page.evaluateHandle((lbl, root) => {
    const norm = (x) => x.replace(/\*/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
    const visible = (e) => e.getClientRects().length > 0;
    const scope = (root && document.querySelector(root))
      || [...document.querySelectorAll('.modal.show, dialog[open]')].find(visible) || document;
    const labels = [...scope.querySelectorAll('label')].filter(visible);
    const want = norm(lbl);
    const L = labels.find((x) => norm(x.textContent) === want) || labels.find((x) => norm(x.textContent).startsWith(want));
    if (!L) return null;
    if (L.control) return L.control;
    for (let n = L.parentElement, i = 0; n && i < 3; n = n.parentElement, i++) {
      const c = n.querySelector('input:not([type=hidden]), select, textarea');
      if (c) return c;
    }
    return null;
  }, label, within || null);
}

// One step = one object with one action key. See README for the list.
async function run(page, l) {
  if (l.open) { await page.goto(absUrl(l.open), { waitUntil: 'networkidle2' }); return; }
  if (l.type) { await page.waitForSelector(l.type, { visible: true }); await page.click(l.type, { clickCount: 3 }); await page.type(l.type, String(l.text ?? '')); return; }
  if (l.click) { await page.waitForSelector(l.click, { visible: true }); await page.click(l.click); await settle(page); return; }
  if (l.clickText) { await (await byText(page, l.clickText, l.within)).click(); await settle(page); return; }
  if (l.select) { await choose(page, await page.waitForSelector(l.select, { timeout: l.timeout ?? 15000 }), l.value, l.timeout); await settle(page); return; }
  if (l.fill) { await fillByLabel(page, l.fill, l.within, l.timeout); await settle(page); return; }
  if (l.cookie) { await page.browserContext().setCookie({ path: '/', ...(BASE ? { domain: new URL(BASE).hostname } : {}), ...l.cookie }); return; }
  if (l.press) { await page.keyboard.press(l.press); await settle(page); return; }
  if (l.wait !== undefined) {
    if (typeof l.wait === 'number') await sleep(l.wait);
    else await page.waitForSelector(l.wait, { visible: true, timeout: l.timeout ?? 15000 });
    return;
  }
  if (l.waitText) { await page.waitForFunction((t) => document.body.innerText.includes(t), { timeout: l.timeout ?? 15000 }, l.waitText); return; }
  if (l.scrollTo) { await page.$eval(l.scrollTo, (e) => e.scrollIntoView({ block: 'start' })); await sleep(300); return; }
  if (l.js) { await page.evaluate(l.js); await settle(page); return; }
  if (l.run) { try { execSync(l.run, { cwd: path.resolve(configDir, l.cwd || '.'), stdio: 'ignore' }); } catch { console.log(T.cmdFailed(l.run)); } return; }
  if (l.otp) { await fillOtp(page, l.otp); return; }
  throw new Error(T.unknownStep(JSON.stringify(l)));
}

// OTP is read from a file (e.g. the app log): last regex match written AFTER
// the previous step, typed into the input.
async function fillOtp(page, o) {
  const file = path.resolve(configDir, o.file);
  const re = new RegExp(o.pattern, 'g');
  const from = page.__otpFrom ?? 0;
  let code = null;
  for (let i = 0; i < (o.tries ?? 60) && !code; i++) {
    await sleep(250);
    const text = fs.existsSync(file) ? fs.readFileSync(file, 'utf8').slice(from) : '';
    const all = [...text.matchAll(re)];
    code = all.length ? all[all.length - 1][1] : null;
  }
  if (!code) throw new Error(T.otpNotFound(o.file));
  await page.waitForSelector(o.into, { visible: true });
  await page.click(o.into);
  await page.keyboard.type(code, { delay: 50 });
  if (o.submit) await run(page, typeof o.submit === 'string' ? { click: o.submit } : o.submit);
}

async function newPage(browser, theme = cfg.theme) {
  const page = await (await browser.createBrowserContext()).newPage();
  if (theme) await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: theme }]);
  // freezeTime: the page's clock starts at that moment and runs on from there, so "today" and
  // "2 hours ago" stay the same between runs while timers and animations still work.
  // Only dates made in the browser; dates the server prints are not affected.
  // init: shared helper code for `js` steps, run at the start of every page (before the page's own
  // scripts), so `var` and `window.x` helpers are there after every navigation.
  if (INIT) await page.evaluateOnNewDocument(INIT);
  if (cfg.freezeTime) {
    const at = new Date(cfg.freezeTime).getTime();
    if (Number.isNaN(at)) throw new Error(T.badTime(cfg.freezeTime));
    await page.evaluateOnNewDocument((at) => {
      const Real = Date, shift = at - Real.now(), now = () => Real.now() + shift;
      globalThis.Date = new Proxy(Real, {
        construct: (t, a, nt) => Reflect.construct(Real, a.length ? a : [now()], nt),
        apply: () => new Real(now()).toString(), // Date() without new
        get: (t, k) => (k === 'now' ? now : Reflect.get(t, k)),
      });
    }, at);
  }
  return page;
}

// keepLogin (minutes): after a login, cookies + localStorage go to <config folder>/.gushot/<session>.json
// so the next run can skip the login and OTP. The folder gets its own .gitignore. A saved login is
// only trusted if the session's last `wait` selector shows up; otherwise it is deleted and the
// session logs in normally.
const loginFile = (name) => path.join(configDir, '.gushot', `${name}.json`);
const verifySelector = (steps) => [...steps].reverse().find((x) => typeof x.wait === 'string')?.wait;

async function restoreLogin(page, name, steps) {
  const file = loginFile(name), verify = verifySelector(steps);
  if (!cfg.keepLogin || !verify || !fs.existsSync(file)) return false;
  try {
    const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (Date.now() - saved.savedAt > cfg.keepLogin * 60000) throw new Error('expired');
    if (saved.cookies.length) await page.browserContext().setCookie(...saved.cookies);
    await page.goto(saved.url, { waitUntil: 'networkidle2' });
    if (Object.keys(saved.storage).length) {
      await page.evaluate((st) => Object.entries(st).forEach(([k, v]) => localStorage.setItem(k, v)), saved.storage);
      await page.reload({ waitUntil: 'networkidle2' });
    }
    await page.waitForSelector(verify, { visible: true, timeout: 5000 });
    console.log(T.reusedLogin(name));
    return true;
  } catch (e) {
    // Say why, so an expired or rejected login is not a silent extra login (and can be diagnosed).
    console.log(T.loginNotReused(name, String(e.message || e).split('\n')[0]));
    fs.rmSync(file, { force: true });
    return false;
  }
}

// --login <session>: for logins that cannot be scripted (SSO, captcha, OTP by SMS). Opens the session's
// first page in a visible browser, waits up to 5 minutes for its last `wait` selector (= you are logged
// in), and saves the login like keepLogin does. Later runs reuse it until keepLogin minutes pass.
async function recordLogin(browser, name) {
  const steps = cfg.sessions?.[name];
  if (!steps) throw new Error(T.noSession(name));
  const verify = verifySelector(steps), start = steps.find((x) => x.open)?.open;
  if (!cfg.keepLogin || !verify || !start) throw new Error(T.loginNeeds);
  const page = await newPage(browser);
  await page.goto(absUrl(start), { waitUntil: 'networkidle2' });
  console.log(T.loginWaiting(name, verify));
  await page.waitForSelector(verify, { visible: true, timeout: 5 * 60000 });
  await saveLogin(page, name, steps);
  console.log(T.loginSaved(name, path.relative(process.cwd(), loginFile(name)), cfg.keepLogin));
}

async function saveLogin(page, name, steps) {
  if (!cfg.keepLogin || !verifySelector(steps)) return;
  gushotDir();
  const storage = await page.evaluate(() => ({ ...localStorage })).catch(() => ({}));
  const data = { savedAt: Date.now(), url: page.url(), cookies: await page.browserContext().cookies(), storage };
  fs.writeFileSync(loginFile(name), JSON.stringify(data), { mode: 0o600 });
}

// A session per variant: log in (or restore the saved login), then run the variant's steps, e.g. switch
// the app's language. The saved login is taken before those steps, so all variants share it.
async function newSession(browser, name, variant) {
  const page = await loginSession(browser, name, variant?.theme ?? cfg.theme);
  for (const l of variant?.steps || []) await run(page, l);
  return page;
}

async function loginSession(browser, name, theme) {
  let page = await newPage(browser, theme);
  const steps = name ? cfg.sessions?.[name] : null;
  if (name && !steps) throw new Error(T.noSession(name));
  if (name && await restoreLogin(page, name, steps)) return page;
  if (name && cfg.keepLogin) { await page.browserContext().close(); page = await newPage(browser, theme); } // clean slate after a failed restore
  const otpFile = (steps || []).find((x) => x.otp)?.otp.file;
  for (const l of steps || []) {
    // Mark the OTP file size before each trigger step so old codes are ignored.
    if (otpFile && !l.otp) {
      const f = path.resolve(configDir, otpFile);
      page.__otpFrom = fs.existsSync(f) ? fs.statSync(f).size : 0;
    }
    await run(page, l);
  }
  if (name) await saveLogin(page, name, steps);
  return page;
}

const outFile = (s) => path.join(OUT, s.name.endsWith('.png') ? s.name : `${s.name}.png`);
// <config folder>/.gushot/ holds saved logins, previous images, and the last guide version.
// It ignores itself in git, since logins are live session cookies.
function gushotDir(sub = '') {
  const dir = path.join(configDir, '.gushot');
  fs.mkdirSync(path.join(dir, sub), { recursive: true });
  fs.writeFileSync(path.join(dir, '.gitignore'), '*\n');
  return path.join(dir, sub);
}
// --guide <file.md>: the guide's images in the output folder must come from a shot, and a shot's
// caption must match the image's alt text and the italic line under it. Returns the number of problems.
function checkGuide(file) {
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  const byFile = new Map(cfg.shots.map((s) => [path.resolve(outFile(s)), s]));
  const used = new Set();
  let problems = 0;
  const say = (msg, isProblem = true) => { console.log(`GUIDE ${msg}`); if (isProblem) problems++; };
  lines.forEach((line, i) => {
    for (const [, alt, src] of line.matchAll(/!\[([^\]]*)\]\(<?([^)\s>]+)>?[^)]*\)/g)) {
      const img = path.resolve(path.dirname(file), decodeURI(src));
      if (path.relative(OUT, img).startsWith('..') || !img.endsWith('.png')) continue; // not one of ours
      const where = `${path.basename(file)}:${i + 1}`;
      const s = byFile.get(img);
      if (!s) { say(T.guideNoShot(where, src)); continue; }
      used.add(s.name);
      if (!s.caption) continue;
      if (alt !== s.caption) say(T.guideAlt(where, s.name, alt, s.caption));
      const next = lines.slice(i + 1).find((l) => l.trim());
      const italic = next?.trim().match(/^\*([^*].*)\*$/)?.[1];
      if (italic !== undefined && italic !== s.caption) say(T.guideItalic(where, s.name, italic, s.caption));
    }
  });
  const unused = cfg.shots.filter((s) => !s.video && !used.has(s.name)).map((s) => s.name);
  if (unused.length) say(T.guideUnused(unused), false);
  return problems;
}

// The image a `changed` shot replaced goes to .gushot/prev/, so the change can be compared.
function keepPrevious(s, old) {
  const f = path.join(gushotDir('prev'), path.basename(outFile(s)));
  fs.writeFileSync(f, old);
  return f;
}

// Highlight (red box, optional numbered badge and callout note) the elements a guide step refers to.
// Everything is drawn as separate overlay elements on <body>, not on the element itself, so a blur on
// the element does not blur the box and an `overflow: hidden` parent does not cut it off.
async function annotate(page, s) {
  if (!s.highlight.length) return;
  await page.evaluate((hl, color) => hl.forEach(({ selector, label, note }) => document.querySelectorAll(selector).forEach((e) => {
    const r = e.getBoundingClientRect();
    if (!r.width && !r.height) return;
    const add = (css, text) => {
      const d = document.createElement('div');
      d.className = 'gushot-label';
      if (text !== undefined) d.textContent = text;
      d.style.cssText = `position:absolute;z-index:2147483647;pointer-events:none;${css}`;
      document.body.appendChild(d);
      return d;
    };
    add(`left:${r.left + scrollX - 6}px;top:${r.top + scrollY - 6}px;width:${r.width + 12}px;height:${r.height + 12}px;`
      + `box-sizing:border-box;border:3px solid ${color};border-radius:4px`);
    if (label !== undefined) {
      add(`left:${r.right + scrollX - 10}px;top:${r.top + scrollY - 14}px;min-width:24px;height:24px;padding:0 6px;`
        + `box-sizing:border-box;border-radius:12px;background:${color};color:#fff;`
        + 'font:700 13px/24px system-ui,sans-serif;text-align:center;box-shadow:0 0 0 2px #fff', label);
    }
    if (note) {
      // Below the box, or above it when there is no room; kept inside the viewport horizontally.
      const n = add('max-width:260px;padding:6px 10px;border-radius:6px;'
        + `background:#111827;color:#fff;border-left:3px solid ${color};font:500 13px/1.4 system-ui,sans-serif;`
        + 'box-shadow:0 4px 12px rgba(0,0,0,.25);white-space:normal', note);
      const below = r.bottom + 14 + n.offsetHeight <= innerHeight;
      const left = Math.max(8, Math.min(r.left, innerWidth - n.offsetWidth - 8));
      n.style.left = `${left + scrollX}px`;
      n.style.top = `${(below ? r.bottom + 14 : r.top - 14 - n.offsetHeight) + scrollY}px`;
    }
  })), s.highlight, cfg.highlightColor || '#e11d48');
}

async function unannotate(page) {
  await page.evaluate(() => document.querySelectorAll('.gushot-label').forEach((b) => b.remove()));
}

// An element taller than the viewport (a long modal) would be cut off, with the page behind it in
// the image. Make the viewport tall enough first; the caller restores it.
// device: a phone or tablet from puppeteer's KnownDevices (size, pixel density, user agent, touch).
// A shot's viewport still wins; "scale" in the config replaces the device's pixel density.
function findDevice(name) {
  const all = puppeteer.KnownDevices;
  const hit = Object.keys(all).find((k) => k.toLowerCase() === String(name).toLowerCase());
  if (hit) return all[hit];
  // Suggest the names sharing the longest start with what was typed, newest (last in the list) first.
  const typed = String(name).toLowerCase();
  const shared = (k) => { let i = 0; while (i < k.length && k[i].toLowerCase() === typed[i]) i++; return i; };
  const names = Object.keys(all).filter((k) => !/landscape/i.test(k)).reverse();
  const best = Math.max(...names.map(shared));
  throw new Error(T.noDevice(name, best >= 3 ? names.filter((k) => shared(k) === best).slice(0, 5) : []));
}
async function setView(page, s) {
  const name = s.device ?? cfg.device;
  if (!name && !s.viewport) return false;
  const d = name ? findDevice(name) : null;
  if (d) await page.setUserAgent(d.userAgent);
  await page.setViewport({ ...(d ? { ...d.viewport, ...(cfg.scale ? { deviceScaleFactor: cfg.scale } : {}) } : VIEWPORT), ...s.viewport });
  return true;
}
let UA; // the browser's own user agent, set at launch
async function resetView(page) {
  await page.setUserAgent(UA);
  await page.setViewport(VIEWPORT);
}

async function fitViewport(page, el, s) {
  const vp = page.viewport();
  const need = await el.evaluate((e, p) => {
    const r = e.getBoundingClientRect();
    return Math.ceil(Math.max(0, r.top) + Math.max(r.height, e.scrollHeight) + p + 20);
  }, s.padding || 0);
  if (need <= vp.height) return null;
  await page.setViewport({ ...vp, height: need });
  await settle(page, 300);
  await sleep(300);
  return vp;
}

// blur + hide + extra css for one shot.
function shotCss(s) {
  const blur = [...(cfg.alwaysBlur || []), ...(s.blur || [])];
  const css = [];
  if (blur.length) css.push(`${blur.join(',')}{filter:blur(${cfg.blurStrength ?? 6}px)!important}`);
  if (s.hide?.length) css.push(`${s.hide.join(',')}{visibility:hidden!important}`);
  if (cfg.css) css.push(cfg.css);
  return css.join('\n');
}

// replaceText: { "real text": "sample text" } from root and shot, in text and form fields.
// Changes the DOM itself, so it lasts until the page is opened again.
async function replaceText(page, s) {
  const map = Object.entries({ ...cfg.replaceText, ...s.replaceText });
  if (!map.length) return;
  await page.evaluate((map) => {
    const swap = (t) => map.reduce((acc, [a, b]) => acc.split(a).join(b), t);
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (w.nextNode()) { const t = swap(w.currentNode.nodeValue); if (t !== w.currentNode.nodeValue) w.currentNode.nodeValue = t; }
    document.querySelectorAll('input, textarea').forEach((e) => { e.value = swap(e.value); });
  }, map);
}

// video: true | "mp4" | "gif" | "webm". Records the shot's url + steps (with a pause after each
// step so viewers can follow), then holds on the highlights. Needs ffmpeg.
async function record(page, s) {
  const fmt = s.video === true ? 'mp4' : s.video;
  const ffmpeg = cfg.ffmpeg ? path.resolve(configDir, cfg.ffmpeg) : 'ffmpeg';
  if (spawnSync(ffmpeg, ['-version']).error) throw new Error(T.noFfmpeg);
  const file = path.join(OUT, `${s.name}.${fmt}`);
  // Blur must be on every frame, also right after a navigation, so the style is added as soon as
  // each new document exists. The 1px dot changes color all the time so the screencast keeps
  // sending frames while the page is still (it only sends frames on repaint; an opacity animation
  // runs on the GPU without a repaint, so it would not help).
  const inject = (css) => {
    const add = () => {
      const st = document.createElement('style');
      st.className = 'gushot-video';
      st.textContent = `${css}\n@keyframes gushot-tick{to{background:rgba(127,127,127,.03)}}`;
      const dot = document.createElement('div');
      dot.className = 'gushot-video';
      dot.style.cssText = 'position:fixed;right:0;bottom:0;width:1px;height:1px;background:rgba(127,127,127,.02);'
        + 'pointer-events:none;z-index:2147483647;animation:gushot-tick .2s steps(2) infinite alternate';
      document.documentElement.append(st, dot);
    };
    if (document.documentElement) add();
    else new MutationObserver((m, o) => { if (document.documentElement) { o.disconnect(); add(); } }).observe(document, { childList: true });
  };
  const css = shotCss(s);
  const { identifier } = await page.evaluateOnNewDocument(inject, css);
  await page.evaluate(inject, css);
  const rec = await page.screencast({ path: file, format: fmt, ffmpegPath: ffmpeg, ...(fmt === 'gif' ? { loop: Infinity } : {}) });
  try {
    await sleep(800);
    if (s.url) await page.goto(absUrl(s.url), { waitUntil: 'networkidle2' });
    for (const l of s.steps) { await run(page, l); await sleep(700); }
    await settle(page, 600);
    await replaceText(page, s);
    await annotate(page, s);
    await sleep(2500); // hold on the result; the screencast also lags a little behind the page
  } finally {
    await rec.stop();
    await unannotate(page).catch(() => {});
    await page.removeScriptToEvaluateOnNewDocument(identifier);
    await page.evaluate(() => document.querySelectorAll('.gushot-video').forEach((e) => e.remove())).catch(() => {});
  }
  return file;
}

async function capture(page, s) {
  await settle(page, 600);
  await sleep(s.delay ?? cfg.delay ?? 500);
  await replaceText(page, s);
  const css = shotCss(s);
  const tag = css ? await page.addStyleTag({ content: css }) : null;
  const file = outFile(s);
  const el = s.element ? await page.$(s.element) : null;
  if (s.element && !el) throw new Error(T.noElement(s.element));
  // Resize first, then draw the highlights, so they are placed on the final layout.
  const restore = el && !CHECK ? await fitViewport(page, el, s) : null;
  try {
    await annotate(page, s);
    if (CHECK) {
      // Only check that the steps ran and the element exists.
    } else if (el && s.padding) {
      // Element plus some surrounding page, clamped to the page edges.
      await el.scrollIntoView();
      const r = await el.boundingBox();
      const { sx, sy } = await page.evaluate(() => ({ sx: scrollX, sy: scrollY }));
      const p = s.padding;
      const x = Math.max(0, r.x + sx - p), y = Math.max(0, r.y + sy - p);
      await page.screenshot({ path: file, captureBeyondViewport: true,
        clip: { x, y, width: r.x + sx + r.width + p - x, height: r.y + sy + r.height + p - y } });
    } else if (el) {
      await el.screenshot({ path: file });
    } else {
      await page.screenshot({ path: file, fullPage: !!s.fullPage });
    }
  } finally {
    await unannotate(page);
    if (tag) await tag.evaluate((t) => t.remove());
    if (restore) await page.setViewport(restore);
  }
  return file;
}

// --md skeleton: front matter (guide), the run line, a revision row to copy, then one section per shot
// headed by its name (the guide's own headings are section titles): image, caption, numbered steps.
function writeSkeleton(md, list, changed, added) {
  const sections = list.map((s) => {
    const title = s.caption || s.name;
    const file = s.video ? path.join(OUT, `${s.name}.${s.video === true ? 'mp4' : s.video}`) : outFile(s);
    const rel = path.relative(path.dirname(md), file).split(path.sep).join('/');
    const notes = s.highlight.filter((h) => h.text || h.note).map((h, i) => `${h.label || i + 1}. ${h.text || h.note}`);
    return [`## ${s.name}`, s.video ? `[${title}](${rel})` : `![${title}](${rel})`, ...(s.caption ? [`*${title}*`] : []), ...(notes.length ? [notes.join('\n')] : [])].join('\n\n');
  });
  const day = new Date().toLocaleDateString('sv'); // local YYYY-MM-DD
  const run = CHECK ? T.mdRunCheck(day) : T.mdRun(day, changed, added);
  const g = cfg.guide;
  const head = g ? [['---', `version: ${JSON.stringify(String(g.version))}`, `date: ${g.date || day}`,
    ...(g.appVersion ? [`appVersion: ${JSON.stringify(String(g.appVersion))}`] : []), '---'].join('\n')] : [];
  const what = [changed.length && `changed: ${changed.join(', ')}`, added.length && `new: ${added.join(', ')}`].filter(Boolean).join('; ');
  const row = g && !CHECK && what ? [`<!-- ${T.revisionRow(g.version, g.date || day, what)} -->`] : [];
  fs.mkdirSync(path.dirname(md), { recursive: true });
  fs.writeFileSync(md, `${[...head, run, ...row, ...sections].join('\n\n')}\n`);
  console.log(T.mdWritten(path.relative(process.cwd(), md)));
}

// ---------- main ----------
(async () => {
  if (!CHECK) fs.mkdirSync(OUT, { recursive: true });
  const shots = cfg.shots.filter((s) => !filters.length || filters.some((t) => s.name.includes(t)));
  if (!shots.length && !LOGIN) { console.log(T.noShots); return; }

  const launch = () => puppeteer.launch({
    executablePath: findChrome(),
    headless: cfg.headless ?? !LOGIN, // --login needs a window to log in by hand
    defaultViewport: VIEWPORT,
    acceptInsecureCerts: true,
  });
  // Chrome sometimes refuses its fresh temp profile ("already running", seen on Windows CI).
  // One retry with a new profile fixes it; anything else is a real error.
  const browser = await launch().catch(async (e) => {
    if (!/already running/i.test(e.message)) throw e;
    await sleep(1000);
    return launch();
  });
  UA = await browser.userAgent(); // restored after a shot with "device"
  if (LOGIN) { await recordLogin(browser, LOGIN); await browser.close(); return; }
  const pages = {}; // one logged-in tab per session, reused across shots
  const failed = [];
  const counts = { new: 0, changed: 0 }; // tells the guide writer which images to re-insert
  const touched = { new: [], changed: [] }; // the same, by name, for the --md revision line

  for (const s of shots) {
    const key = `${s.session || '_guest'}${s.variant ? `@${s.variant.suffix}` : ''}`;
    try {
      if (s.freshSession && pages[key]) { await pages[key].browserContext().close(); delete pages[key]; }
      pages[key] ||= await newSession(browser, s.session, s.variant);
      const page = pages[key];
      const viewSet = await setView(page, s);
      if (s.video && !CHECK) {
        const file = await record(page, s);
        console.log(T.ok, path.relative(process.cwd(), file), `(${T.video})`);
        if (viewSet) await resetView(page);
        continue;
      }
      if (s.url) await page.goto(absUrl(s.url), { waitUntil: 'networkidle2' });
      for (const l of s.steps) await run(page, l);
      const old = fs.existsSync(outFile(s)) ? fs.readFileSync(outFile(s)) : null;
      const file = await capture(page, s);
      if (CHECK) console.log(T.ok, T.checked(s.name));
      else {
        const state = old === null ? 'new' : old.equals(fs.readFileSync(file)) ? 'same' : 'changed';
        if (state !== 'same') { counts[state]++; touched[state].push(s.name); }
        // Keep the replaced image out of the guide's folder, so the change can be looked at side by side.
        const prev = state === 'changed' ? keepPrevious(s, old) : null;
        console.log(T.ok, path.relative(process.cwd(), file), `(${T.state[state]}${prev ? T.before(path.relative(process.cwd(), prev)) : ''})`);
      }
      if (viewSet) await resetView(page);
    } catch (e) {
      failed.push(s.name);
      console.log(T.fail, s.name, '-', e.message.split('\n')[0]);
      // A session may be broken after an error (open modal etc.); start clean next time.
      await pages[key]?.browserContext().close().catch(() => {});
      delete pages[key];
    }
  }

  await browser.close();
  // PNGs in the output folder that no shot makes: left over after a shot was renamed or removed.
  const made = new Set(cfg.shots.map((s) => path.basename(outFile(s))));
  const orphans = fs.existsSync(OUT) ? fs.readdirSync(OUT).filter((f) => f.endsWith('.png') && !made.has(f)) : [];
  if (orphans.length) console.log(T.orphans(path.relative(process.cwd(), OUT) || '.', orphans));
  // guide.version: remind to raise it when images changed since the last run with the same version.
  // The config is never edited; the last version is kept in .gushot/guide.json.
  if (cfg.guide && !CHECK) {
    const state = path.join(gushotDir(), 'guide.json');
    const last = fs.existsSync(state) ? JSON.parse(fs.readFileSync(state, 'utf8')).version : null;
    if (last === cfg.guide.version && touched.changed.length + touched.new.length) console.log(T.guideNotRaised(last));
    fs.writeFileSync(state, JSON.stringify({ version: cfg.guide.version }));
  }
  // --md: one skeleton, or one per variant (guide-en.md, guide-id.md) since each language is its own guide.
  for (const v of MD ? cfg.variants || [null] : []) {
    const file = v ? MD.replace(/(\.md)?$/i, `${v.suffix}$1`) : MD;
    const own = (n) => !v || n.endsWith(v.suffix);
    writeSkeleton(file, shots.filter((s) => !failed.includes(s.name) && (!v || s.variant === v)),
      touched.changed.filter(own), touched.new.filter(own));
  }
  const guideProblems = GUIDE ? checkGuide(path.resolve(GUIDE)) : 0;
  console.log(T.done(shots.length - failed.length, failed.length, OUT));
  if (!CHECK) console.log(T.changes(counts.changed, counts.new));
  process.exit(failed.length || guideProblems ? 1 : 0);
})().catch((e) => { console.error(e.message); process.exit(1); });
