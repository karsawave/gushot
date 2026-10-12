#!/usr/bin/env node
/**
 * GuShot (Guide User Shot): capture web app user-guide screenshots from a single JSON config.
 *
 *   node shot.cjs <config.json> [filter...] [--check]
 *   filter  = only shots whose name contains that text
 *   --check = run every step but save no images (catch broken selectors)
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
const { execSync } = require('child_process');
const crypto = require('crypto');
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
    usage: 'Usage: node shot.cjs <config.json> [filter...] [--check]',
    envMissing: (k) => `Environment variable ${k} is not set`,
    noChrome: 'Chrome/Edge not found, set "chrome" in the config or the CHROME_PATH env',
    textNotFound: (t) => `text "${t}" not found`,
    unknownStep: (s) => `unknown step: ${s}`,
    cmdFailed: (c) => `  (command failed, continuing): ${c}`,
    otpNotFound: (f) => `OTP not found in ${f}`,
    noSession: (n) => `session "${n}" is not defined in the config`,
    noElement: (s) => `element ${s} not found`,
    unknownKey: (k) => `WARN unknown key "${k}" (typo?), ignored`,
    noShots: 'No matching shots.',
    ok: 'OK   ', fail: 'FAIL ', checked: (n) => `${n} (checked, not saved)`,
    state: { new: 'new', changed: 'changed', same: 'unchanged' },
    changes: (c, n) => `Changed: ${c}, new: ${n}.`,
    done: (ok, bad, out) => `\nDone: ${ok} OK, ${bad} failed. Output in ${out}`,
  },
  id: {
    usage: 'Pemakaian: node shot.cjs <config.json> [saring...] [--check]',
    envMissing: (k) => `Environment ${k} belum diisi`,
    noChrome: 'Chrome/Edge tidak ditemukan, isi "chrome" di konfigurasi atau env CHROME_PATH',
    textNotFound: (t) => `teks "${t}" tidak ditemukan`,
    unknownStep: (s) => `langkah tidak dikenal: ${s}`,
    cmdFailed: (c) => `  (perintah gagal, lanjut): ${c}`,
    otpNotFound: (f) => `OTP tidak ditemukan di ${f}`,
    noSession: (n) => `sesi "${n}" tidak ada di konfigurasi`,
    noElement: (s) => `elemen ${s} tidak ada`,
    unknownKey: (k) => `PERINGATAN key "${k}" tidak dikenal (salah ketik?), diabaikan`,
    noShots: 'Tidak ada shot yang cocok.',
    ok: 'OK   ', fail: 'GAGAL', checked: (n) => `${n} (diperiksa, tidak disimpan)`,
    state: { new: 'baru', changed: 'berubah', same: 'sama' },
    changes: (c, n) => `Berubah: ${c}, baru: ${n}.`,
    done: (ok, bad, out) => `\nSelesai: ${ok} OK, ${bad} gagal. Hasil di ${out}`,
  },
};
const ENV_LANG = process.env.GUSHOT_LANG || process.env.SHOT_LANG;
let T = MSG[(ENV_LANG || 'en').slice(0, 2)] || MSG.en;

// ---------- Indonesian key aliases ----------
const ALIAS = {
  root: { skala: 'scale', keluar: 'out', blurSelalu: 'alwaysBlur', kekuatanBlur: 'blurStrength', warnaSorot: 'highlightColor',
    jeda: 'delay', tema: 'theme', sesi: 'sessions', bahasa: 'lang' },
  shot: { nama: 'name', sesi: 'session', langkah: 'steps', elemen: 'element', penuh: 'fullPage',
    sembunyikan: 'hide', jarak: 'padding', sorot: 'highlight', sesiBaru: 'freshSession', jeda: 'delay' },
  step: { buka: 'open', ketik: 'type', teks: 'text', klik: 'click', klikTeks: 'clickText', di: 'within',
    pilih: 'select', nilai: 'value', tekan: 'press', tunggu: 'wait', tungguTeks: 'waitText', batas: 'timeout',
    gulirKe: 'scrollTo', perintah: 'run' },
  otp: { pola: 'pattern', ke: 'into', kirim: 'submit', coba: 'tries' },
};
const alias = (o, map) => (o && typeof o === 'object' && !Array.isArray(o)
  ? Object.fromEntries(Object.entries(o).map(([k, v]) => [map[k] || k, v])) : o);

// Known keys (after aliasing). Anything else is most likely a typo: warn once, don't fail.
// Keys starting with "_" or "$" are free for comments / $schema.
const KEYS = {
  root: 'base scale out viewport theme alwaysBlur blurStrength highlightColor css delay headless chrome lang sessions shots',
  shot: 'name session url steps element padding fullPage blur hide highlight viewport freshSession delay',
  step: 'open type text click clickText within select value press wait waitText timeout scrollTo js run cwd otp',
  otp: 'file pattern into submit tries',
  highlight: 'selector label',
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
cfg.shots = (cfg.shots || []).map((s) => {
  const r = check(alias(s, ALIAS.shot), 'shot');
  r.steps = (r.steps || []).map(step);
  // "#save" or { "selector": "#save", "label": "1" } (numbered badge for "click 1, then 2").
  r.highlight = (r.highlight || []).map((h) => (typeof h === 'string' ? { selector: h } : check(h, 'highlight')));
  return r;
});
for (const n of Object.keys(cfg.sessions || {})) cfg.sessions[n] = cfg.sessions[n].map(step);

const BASE = (cfg.base || '').replace(/\/$/, '');
const OUT = path.resolve(configDir, cfg.out || 'output');
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

// One step = one object with one action key. See README for the list.
async function run(page, l) {
  if (l.open) { await page.goto(absUrl(l.open), { waitUntil: 'networkidle2' }); return; }
  if (l.type) { await page.waitForSelector(l.type, { visible: true }); await page.click(l.type, { clickCount: 3 }); await page.type(l.type, String(l.text ?? '')); return; }
  if (l.click) { await page.waitForSelector(l.click, { visible: true }); await page.click(l.click); await settle(page); return; }
  if (l.clickText) { await (await byText(page, l.clickText, l.within)).click(); await settle(page); return; }
  if (l.select) { await page.select(l.select, l.value); await settle(page); return; }
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

async function newSession(browser, name) {
  const page = await (await browser.createBrowserContext()).newPage();
  if (cfg.theme) await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: cfg.theme }]);
  const steps = name ? cfg.sessions?.[name] : null;
  if (name && !steps) throw new Error(T.noSession(name));
  const otpFile = (steps || []).find((x) => x.otp)?.otp.file;
  for (const l of steps || []) {
    // Mark the OTP file size before each trigger step so old codes are ignored.
    if (otpFile && !l.otp) {
      const f = path.resolve(configDir, otpFile);
      page.__otpFrom = fs.existsSync(f) ? fs.statSync(f).size : 0;
    }
    await run(page, l);
  }
  return page;
}

const outFile = (s) => path.join(OUT, s.name.endsWith('.png') ? s.name : `${s.name}.png`);
const hashOf = (f) => (fs.existsSync(f) ? crypto.createHash('sha1').update(fs.readFileSync(f)).digest('hex') : null);

async function capture(page, s) {
  await settle(page, 600);
  await sleep(s.delay ?? cfg.delay ?? 500);
  const blur = [...(cfg.alwaysBlur || []), ...(s.blur || [])];
  const css = [];
  if (blur.length) css.push(`${blur.join(',')}{filter:blur(${cfg.blurStrength ?? 6}px)!important}`);
  if (s.hide?.length) css.push(`${s.hide.join(',')}{visibility:hidden!important}`);
  if (cfg.css) css.push(cfg.css);
  const tag = css.length ? await page.addStyleTag({ content: css.join('\n') }) : null;

  // Highlight (red box, optional numbered badge) the elements a guide step refers to.
  if (s.highlight.length) {
    await page.evaluate((hl, color) => hl.forEach(({ selector, label }) => document.querySelectorAll(selector).forEach((e) => {
      e.dataset.shotOutline = e.style.outline; e.style.outline = `3px solid ${color}`; e.style.outlineOffset = '3px';
      if (label === undefined) return;
      const r = e.getBoundingClientRect();
      const b = document.createElement('div');
      b.className = 'gushot-label';
      b.textContent = label;
      b.style.cssText = `position:absolute;z-index:2147483647;left:${r.right + scrollX - 10}px;top:${r.top + scrollY - 14}px;`
        + `min-width:24px;height:24px;padding:0 6px;box-sizing:border-box;border-radius:12px;background:${color};color:#fff;`
        + 'font:700 13px/24px system-ui,sans-serif;text-align:center;box-shadow:0 0 0 2px #fff';
      document.body.appendChild(b);
    })), s.highlight, cfg.highlightColor || '#e11d48');
  }

  const file = outFile(s);
  if (s.element) {
    const el = await page.$(s.element);
    if (!el) throw new Error(T.noElement(s.element));
    if (CHECK) { /* element exists, nothing to save */ } else if (s.padding) {
      // Element plus some surrounding page, clamped to the page edges.
      await el.scrollIntoView();
      const b = await el.boundingBox();
      const { sx, sy } = await page.evaluate(() => ({ sx: scrollX, sy: scrollY }));
      const p = s.padding;
      const x = Math.max(0, b.x + sx - p), y = Math.max(0, b.y + sy - p);
      await page.screenshot({ path: file, captureBeyondViewport: true,
        clip: { x, y, width: b.x + sx + b.width + p - x, height: b.y + sy + b.height + p - y } });
    } else {
      await el.screenshot({ path: file });
    }
  } else if (!CHECK) {
    await page.screenshot({ path: file, fullPage: !!s.fullPage });
  }

  if (s.highlight.length) {
    await page.evaluate((hl) => {
      hl.forEach(({ selector }) => document.querySelectorAll(selector).forEach((e) => {
        e.style.outline = e.dataset.shotOutline || ''; e.style.outlineOffset = '';
      }));
      document.querySelectorAll('.gushot-label').forEach((b) => b.remove());
    }, s.highlight);
  }
  if (tag) await tag.evaluate((t) => t.remove());
  return file;
}

// ---------- main ----------
(async () => {
  if (!CHECK) fs.mkdirSync(OUT, { recursive: true });
  const shots = cfg.shots.filter((s) => !filters.length || filters.some((t) => s.name.includes(t)));
  if (!shots.length) { console.log(T.noShots); return; }

  const browser = await puppeteer.launch({
    executablePath: findChrome(),
    headless: cfg.headless ?? true,
    defaultViewport: VIEWPORT,
    acceptInsecureCerts: true,
  });
  const pages = {}; // one logged-in tab per session, reused across shots
  const failed = [];
  const counts = { new: 0, changed: 0 }; // tells the guide writer which images to re-insert

  for (const s of shots) {
    const key = s.session || '_guest';
    try {
      if (s.freshSession && pages[key]) { await pages[key].browserContext().close(); delete pages[key]; }
      pages[key] ||= await newSession(browser, s.session);
      const page = pages[key];
      if (s.viewport) await page.setViewport({ ...VIEWPORT, ...s.viewport });
      if (s.url) await page.goto(absUrl(s.url), { waitUntil: 'networkidle2' });
      for (const l of s.steps) await run(page, l);
      const before = hashOf(outFile(s));
      const file = await capture(page, s);
      if (CHECK) console.log(T.ok, T.checked(s.name));
      else {
        const state = before === null ? 'new' : before === hashOf(file) ? 'same' : 'changed';
        if (state !== 'same') counts[state]++;
        console.log(T.ok, path.relative(process.cwd(), file), `(${T.state[state]})`);
      }
      if (s.viewport) await page.setViewport(VIEWPORT);
    } catch (e) {
      failed.push(s.name);
      console.log(T.fail, s.name, '-', e.message.split('\n')[0]);
      // A session may be broken after an error (open modal etc.); start clean next time.
      await pages[key]?.browserContext().close().catch(() => {});
      delete pages[key];
    }
  }

  await browser.close();
  console.log(T.done(shots.length - failed.length, failed.length, OUT));
  if (!CHECK) console.log(T.changes(counts.changed, counts.new));
  process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.error(e.message); process.exit(1); });
