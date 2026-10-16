---
name: guide-screenshots
description: Capture screenshots for web app user guides, tutorials, manuals, and illustrated docs automatically with a bundled Node script driven by a JSON config (login with OTP, clicks, modals, blur of sensitive data, highlight boxes, mobile sizes). Use when asked to create, add, or update screenshots for a user guide, tutorial, manual, onboarding doc, or step-by-step documentation of any web application (also "screenshot panduan", "juklak", "buku panduan").
license: MIT
compatibility: Requires Node.js 18+, npm, a local Chrome or Edge, and shell access to run commands. Works with any agent that supports Agent Skills.
metadata:
  version: "1.7.0"
---

# Guide screenshots

All paths below are relative to **this skill's folder** (the folder containing this SKILL.md). Resolve them to absolute paths before running commands from the user's project. Below, `<SKILL>` = that absolute folder.

- Script: `scripts/shot.cjs` (puppeteer-core, uses the local Chrome/Edge).
- Example config: `assets/config.example.json`.
- Full key reference: `references/REFERENCE.md`. Read it only when you need an option not listed here.
- Indonesian key aliases: `references/aliases-id.md`.
- Writing the guide text around the screenshots: `references/writing.md`. Read it before writing or editing guide text.

First run only: `npm install --omit=dev --prefix "<SKILL>/scripts"`. The script exits with code 2 and prints this command if the dependency is missing.

Do not capture screenshots by hand through a browser tool and do not write a new browser-automation script (no own Puppeteer/Playwright/CDP code, no separate `shot.mjs`): write or edit the JSON config, then run `scripts/shot.cjs`. If a step cannot be expressed with the steps below, use a `js` step inside the config, and tell the user what GuShot could not do so it can be added.

## Language

- Reply to the user in the language they write in (English primary, Indonesian supported). Guide file names and captions follow the language of the guide being written.
- Write new configs with English keys. Indonesian keys (`buka`, `ketik`, `klik`, `sorot`, `nama`, `sesi`, ...) are aliases: when editing an existing config that uses them, keep its style.
- Set `"lang": "id"` in the config if the user wants Indonesian terminal messages.

## Key summary

Root: `base`, `scale` (2 = sharp for PDF/print), `keepLogin` (minutes; skip login/OTP on later runs), `ffmpeg`, `out`, `viewport`, `theme`, `alwaysBlur`, `replaceText`, `freezeTime` (page clock starts at a fixed time; browser dates only), `guide` ({ `version`, `date`, `appVersion` }: document version, written as front matter by `--md`; raise it when images change), `variants` ([{ `suffix`, `steps`, `theme`, `viewport` }]: every shot once per language or theme, saved as `<name><suffix>`; `--md` writes one skeleton per variant), `captionNumber` (`"Gambar {chapter}.{n}"`: numbers captions in config order; shots set `chapter`, and `skipNumbers` for diagrams), `init` (helper code for `js` steps on every page; write shared helpers once here, not in every shot), `css`, `delay`, `sessions` ({ name: [steps] }), `shots`.
Shot: `name`, `session`, `url`, `steps`, `element` (+`padding` px of context; elements taller than the viewport, such as long modals, are captured whole), `fullPage`, `blur`, `hide`, `highlight` (selectors, or `{ selector, label, note, text }`: numbered badge matching the guide's step numbers, short callout text), `video` (`true`/`"gif"`/`"webm"`: record url + steps instead of a PNG; needs ffmpeg), `viewport`, `device` (`"iPhone 13"`: phone size, user agent, and touch; use for mobile shots instead of only a small viewport), `freshSession`, `delay`, `caption` (image caption, used by `--md`), `replaceText` ({ "real text": "sample" } in page text and fields; `""` removes it).
Steps: `open`, `type`+`text`, `fill` ({ label text: value }, finds fields by their `<label>`, in the order written; waits for fields that appear later and for AJAX-reloaded dropdowns between fields; checkboxes take `true`/`false`, a checkbox in a list is filled by its own label; + optional `within`), `click`, `clickText` (+`within`), `select`+`value` (value or start of the option text; waits for options loaded by AJAX; works with Select2), `cookie` ({ `name`, `value` }: reuse an existing session when the login cannot be automated, e.g. SSO or captcha; value from env; or ask the user to run `--login <session>` once with `keepLogin` set and log in by hand), `press`, `wait` (ms or selector), `waitText`, `scrollTo`, `js`, `run` (+`cwd`), `otp` { `file`, `pattern` (regex, group 1 = code), `into`, `submit` }.

## Workflow

1. **Look for an existing config** in the project (`**/screenshot*.json`, `**/shots*.json`). Found = add/edit entries, do not create a new one.
   None = copy `assets/config.example.json` to the project's docs folder (e.g. `docs/screenshots.json`) and adapt it.
2. **Learn the login flow from the code, do not guess:** login page, input selectors, whether there is 2FA/OTP, where the OTP is written in local dev (log/mail log), login rate limits (add a `run` step that clears the cache if needed), demo accounts from seeders/fixtures.
3. **Prepare a local server** with sample data (seeders). Common requirements: the app's base URL setting (e.g. `APP_URL`) must match `base`, otherwise CSS fails to load; real OTP/email delivery is disabled so codes are written to the log. If you must change `.env` or similar, back it up first, restore it afterwards, and tell the user.
4. **Write shot entries.** Name them in guide order (`01_login`, `02_dashboard`, ...) or follow the project's existing naming. Use `highlight` for the button a guide step talks about, `element` for modals/forms.
   **Numbered markers must match the guide text**, or readers get lost:
   - A marker's `label` is the number of the step in the guide text that refers to it. If the text says "2. Fill in NIP / Email", that field gets `"label": "2"`, not `"1"`.
   - Only steps that point at something on screen get a marker. "1. Open the app" gets none, so the numbers in an image may start at 2 or skip numbers. That is correct.
   - Do not write "(marker 1)" in the text; the matching number is enough.
   - Highlight what the reader sees as one control: the whole field with its icon or button (e.g. `.input-group`, the form row), not the bare `input` inside it.
   - When a step is about one form or modal, crop to it (`element` + `padding` ~24) so markers stay readable when the image is scaled down in the document. Whole-page shots are for "where is this menu" steps.
   - Write the guide text and the config together, step by step, and check each image against its step list before moving on. Put the step text in the marker's `text` (only written by `--md`) or `note` (also drawn on the image) and the image caption in `caption`, so both live only in the config; follow `references/writing.md`.
5. **Sensitive data must be blurred** (`blur`): passwords, PINs, OTPs, 2FA QR codes/secrets, tokens, real order/record IDs, people's names and contacts. Put app-wide selectors in `alwaysBlur`. Where a blurred name would make the step unclear, swap the real text for a sample with `replaceText` instead. Blur also applies to every frame of a `video`. `keepLogin` writes live session cookies to `.gushot/` next to the config: never commit that folder (it has its own `.gitignore`), and do not enable `keepLogin` on shared machines.
6. **Run**, preferably only the changed entries (filter = substring of `name`):
   ```bash
   node "<SKILL>/scripts/shot.cjs" <config.json> <filter>
   ```
   Add `--check` to run the steps without saving images, e.g. to find selectors broken by a UI change. Add `--md <file>` to also write a Markdown skeleton (caption, image, numbered notes per shot) to copy into the guide.
   Passwords come from env (`{{APP_PASSWORD}}` in the config), never written in the JSON.
7. **Check the output.** Every shot prints `OK <file> (new|changed|unchanged)` or `FAIL <name> - <reason>`; only `new`/`changed` images need updating in the guide; exit code 1 means at least one failed. For `FAIL`, fix the selector/step and rerun only that shot. A `changed` line names the replaced image (`before: .gushot/prev/<name>.png`); compare the two to write the revision reason. A line listing images that no shot makes means leftovers from renamed or removed shots: check the guide does not still use them. If you can view images, open every `new`/`changed` PNG to confirm CSS loaded, the session is logged in, and blur applied. If you cannot view images, check that file sizes are not suspiciously small and ask the user to glance at one.
8. **Insert into the guide** (Markdown/HTML), raise `guide.version` in the config, copy the skeleton's front matter, and add a revision row, then run once more with `--check --guide <guide.md>` and fix every `GUIDE` line (see `references/writing.md`), and rebuild the PDF if the project has a builder for it.

## Common problems

| Symptom | Cause |
|---|---|
| Page without CSS | app base URL host differs from `base` |
| `OTP not found` | OTP went to real email/gateway instead of the log, or the `pattern` regex is wrong |
| Redirected back to login | session/cookie failed; check cookie domain, HTTPS vs HTTP |
| `text "X" not found` | element not rendered yet: add `{ "wait": selector }` before it |
| Cropped image / mid-animation | raise `delay`, or use `fullPage: true` |
| Image so tall that its text is unreadable once it is scaled into the guide or PDF | the page shows sections the step does not discuss (long lists, "Unassigned" groups). Crop with `element` to the part the step talks about, or close the other sections first with a `js` step (for example `details.open = false`). Aim for an image that fits one page |
| Tree, accordion, tab, or `<details>` still closed in the image, or showing "Loading…" / "Expand to load" | the content is collapsed by default and often fetched by AJAX only when opened. Add a step that opens it (`click` the "Expand all" button or the item itself), then wait for the content: `{ "wait": "<selector of a loaded child>" }`, or a `js` step that waits until the loading text is gone. Open only the part the guide step talks about, so the image does not get too long. Check every shot of a tree, map, or menu page for this before reporting done |
| Exit code 2 | dependency not installed: run the npm command above |

Report to the user: OK/failed counts, files created, and any environment changes you made.
