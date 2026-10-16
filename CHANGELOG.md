# Changelog

## 1.7.0 (2026-10-16)

- New root key `guide` (alias `panduan`): `{ "version", "date", "appVersion" }`. `--md` starts the skeleton with them as YAML front matter, for the guide's cover, plus a suggested revision row. GuShot reminds you to raise `version` when images changed since the last run with the same version.

## 1.6.0 (2026-10-16)

- New root key `init` (alias `awal`): helper code for `js` steps, run on every page before its own scripts and after every navigation. Write shared helpers once instead of repeating them in every shot. A string, or `{ "file": "helpers.js" }`.
- Self-test: the `--md` run line in Indonesian and with `--check`, and a clear failure for a `freezeTime` that is not a date.
- New root key `freezeTime` (alias `bekukanWaktu`): the page's clock starts at a fixed time and keeps running, so "today", calendars, and "2 hours ago" no longer make images `changed` on every run. Dates printed by the server are not affected.
- A `changed` shot keeps the image it replaced in `.gushot/prev/<name>.png` next to the config (git-ignored) and names it in the `OK` line, so the change can be compared side by side.
- After a run, GuShot lists PNG files in the output folder that no shot makes, usually left over after a shot was renamed or removed.

## 1.5.0 (2026-10-15)

- `--md` starts the skeleton with a line recording the run date and the `changed` and `new` shots, to copy into the guide's revision history.
- `references/writing.md`: every guide gets a document control block (version, date, app version) and a revision history table, updated whenever images or text change. SKILL.md step 8 points to it.

## 1.4.0 (2026-10-15)

- New `--md <file>` writes a Markdown skeleton of the guide: per shot a heading with its `name`, the image with its `caption` as alt text and as an italic line under it, and the markers' step text as a numbered list. Rerun after a UI change and the text that belongs to the images comes back with them.
- New shot key `caption` (alias `keterangan`) and highlight key `text` (alias `teks`): step text that goes into `--md` without being drawn on the image. `note` is used too.
- New `replaceText` (root and shot, alias `gantiTeks`): swaps real text for sample text in the page and form fields before capturing, e.g. customer names. An empty replacement removes the text.
- New `references/writing.md` for agents writing the guide text: kinds of subsection, when to add a flow diagram (Mermaid) and only if the project's builder renders it, one main scenario plus "Variation" subsections, when numbered markers are required, a project style file for language rules, `waitText` on every quoted label so `--check` catches renamed labels.
- SKILL.md: check every `new`/`changed` image, not a sample of one or two.
- New tutorial 7: keeping the guide text with the screenshots.
- `keepLogin` says why a saved login was not reused (for example `expired`) instead of silently logging in again.
- The `keepLogin` self-test runs over a local HTTP server like a real app, instead of a `file://` page; it failed once on Linux CI without a visible reason.

## 1.3.0 (2026-10-14)

Found while redoing the asset management guide of a real app with `fill`:

- `fill` waits for a label to appear (up to `timeout`), so fields revealed by an earlier choice are found. An application form showed "Application Type" only after its category loaded.
- `fill` lets the page's network requests finish after each field, so chained dropdowns that reload over AJAX (Asset Code -> Category -> Model) are ready before the next field. Before, Category could be chosen and then wiped by the reload.
- `fill` sets date fields that use flatpickr through its API and keeps the calendar closed, and takes the focus off typed fields; before, an open calendar covered the Vendor and Supplier fields in the image.
- SKILL.md: images too tall to read once scaled into a PDF: crop to the part the step discusses, or close the sections it does not.
- `select` and `fill` prefer an option whose text matches exactly over one that only starts with the value: `"LAPTOP"` no longer picks "LAPTOP / NOTEBOOK" listed above it.

## 1.2.1 (2026-10-14)

- SKILL.md: trees, accordions, tabs, and `<details>` that are closed by default (often loaded by AJAX when opened) must be opened and waited for before the capture. Found on a real app where an infrastructure map was captured collapsed.

## 1.2.0 (2026-10-13)

Fixes and steps found while using GuShot on a real app (36 screenshots for an asset management guide):

- `element` captures elements taller than the viewport whole. A long modal used to be cut off, with the page behind it in the image.
- Highlight boxes, numbers, and notes are drawn on top of the page instead of as an outline on the element, so they stay sharp on blurred fields and are not cut off by the element's parents.
- `select` takes the start of the option text as well as its value, waits for options loaded by AJAX, and works with Select2.
- New `fill` step fills a form by label text: `{ "fill": { "Asset Name": "Laptop", "Active": true } }`. Indonesian alias: `isi`.
- New `cookie` step reuses an existing session cookie when the login cannot be automated (SSO, captcha).
- SKILL.md: numbered markers must use the step numbers of the guide text ("2. Fill in NIP" gets marker 2), steps that point at nothing get no marker, highlight the whole field group, and crop to the form so markers stay readable. Tutorial 3 shows a matching text and config.
- SKILL.md tells agents not to write their own browser scripts, to use a `js` step instead, and to report what GuShot could not do.
- Chrome is started once more when it refuses its fresh temporary profile ("browser is already running"), a hiccup seen on Windows.

## 1.1.0 (2026-10-13)

- Numbered highlights: `"highlight": [{ "selector": "#save", "label": "1" }]` puts a numbered badge on the top-right corner of the red box, to match "click 1, then 2" in the guide. Plain selectors still work.
- `scale` at the root sets the pixel density for every shot; `2` gives sharp images for PDF, print, and HiDPI screens. Indonesian alias: `skala`.
- `--check` runs every step without saving images, to find selectors broken by UI changes (works in CI).
- `padding` on a shot with `element` keeps some of the page around the element. Indonesian alias: `jarak`.
- Each `OK` line says `new`, `changed`, or `unchanged` compared with the previous file, plus a `Changed: X, new: Y.` summary, so you know which images to update in the guide.
- Demo uses numbered steps in `01_login` and `03_new_order`; video and GIF re-recorded. The video's last scene now shows the four screenshots (it was blank), and the recorder lives in `demo/record/`.
- CI runs the self-test on Ubuntu, Windows, and macOS.
- `docs/`: seven tutorials (how it works, first screenshots, login with OTP, blur/highlight/numbering/notes, keeping screenshots current, AI agents, video and keepLogin) with flow diagrams and example configs that run against the demo app.
- Indonesian versions of all tutorials (`docs/**/*.id.md`).
- `GUSHOT_LANG` sets the terminal language; the old name `SHOT_LANG` still works.
- GitHub issue templates for bug reports and feature ideas.
- Callout notes: `"highlight": [{ "selector": "#save", "note": "Save here" }]` puts a short text box below the red box (above it near the bottom of the screen). Indonesian alias: `catatan`.
- Video shots: `"video": "gif" | "mp4" | "webm" | true` records opening the page and every step, then holds on the highlights. Blur and hide apply to every frame, also after navigations. Needs ffmpeg (`"ffmpeg"` sets its path); a clear error otherwise.
- `keepLogin` (minutes) saves each session's cookies and localStorage to `.gushot/` next to the config and reuses them on later runs, skipping the login and OTP. A saved login is used only if the session's last `wait` selector appears. The folder is git-ignored automatically. Indonesian alias: `ingatLogin`.
- "How it works" diagrams cover video shots and keepLogin.
- Browser lookup no longer relies on fixed paths: it uses `PROGRAMFILES`, `PROGRAMFILES(X86)`, and `LOCALAPPDATA` on Windows (any drive, per-user installs), `~/Applications` on macOS, and searches `PATH` everywhere. A relative `chrome` in the config resolves from the config file.

## 1.0.0 (2026-10-09)

First public release of GuShot (Guide User Shot).

- `guide-screenshots` Agent Skill and Claude Code plugin.
- One JSON config: sessions with login and OTP from a log file, clicks, modals, blur, hide, highlight, per-shot viewport.
- English config keys with Indonesian aliases; English and Indonesian terminal messages.
- Warning for unknown config keys (likely typos).
- Self-test (`node test/run.cjs`) and CI.
- `demo/`: sample app, config, and the screenshots it produces.
