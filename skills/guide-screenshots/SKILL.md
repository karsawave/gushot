---
name: guide-screenshots
description: Capture screenshots for web app user guides, tutorials, manuals, and illustrated docs automatically with a bundled Node script driven by a JSON config (login with OTP, clicks, modals, blur of sensitive data, highlight boxes, mobile sizes). Use when asked to create, add, or update screenshots for a user guide, tutorial, manual, onboarding doc, or step-by-step documentation of any web application (also "screenshot panduan", "juklak", "buku panduan").
license: MIT
compatibility: Requires Node.js 18+, npm, a local Chrome or Edge, and shell access to run commands. Works with any agent that supports Agent Skills.
metadata:
  version: "1.1.0"
---

# Guide screenshots

All paths below are relative to **this skill's folder** (the folder containing this SKILL.md). Resolve them to absolute paths before running commands from the user's project. Below, `<SKILL>` = that absolute folder.

- Script: `scripts/shot.cjs` (puppeteer-core, uses the local Chrome/Edge).
- Example config: `assets/config.example.json`.
- Full key reference: `references/REFERENCE.md`. Read it only when you need an option not listed here.
- Indonesian key aliases: `references/aliases-id.md`.

First run only: `npm install --omit=dev --prefix "<SKILL>/scripts"`. The script exits with code 2 and prints this command if the dependency is missing.

Do not capture screenshots by hand through a browser tool and do not write a new browser-automation script (no own Puppeteer/Playwright/CDP code, no separate `shot.mjs`): write or edit the JSON config, then run `scripts/shot.cjs`. If a step cannot be expressed with the steps below, use a `js` step inside the config, and tell the user what GuShot could not do so it can be added.

## Language

- Reply to the user in the language they write in (English primary, Indonesian supported). Guide file names and captions follow the language of the guide being written.
- Write new configs with English keys. Indonesian keys (`buka`, `ketik`, `klik`, `sorot`, `nama`, `sesi`, ...) are aliases: when editing an existing config that uses them, keep its style.
- Set `"lang": "id"` in the config if the user wants Indonesian terminal messages.

## Key summary

Root: `base`, `scale` (2 = sharp for PDF/print), `keepLogin` (minutes; skip login/OTP on later runs), `ffmpeg`, `out`, `viewport`, `theme`, `alwaysBlur`, `css`, `delay`, `sessions` ({ name: [steps] }), `shots`.
Shot: `name`, `session`, `url`, `steps`, `element` (+`padding` px of context; elements taller than the viewport, such as long modals, are captured whole), `fullPage`, `blur`, `hide`, `highlight` (selectors, or `{ selector, label, note }`: numbered badge matching the guide's step numbers, short callout text), `video` (`true`/`"gif"`/`"webm"`: record url + steps instead of a PNG; needs ffmpeg), `viewport`, `freshSession`, `delay`.
Steps: `open`, `type`+`text`, `fill` ({ label text: value }, finds fields by their `<label>`; checkboxes take `true`/`false`; + optional `within`), `click`, `clickText` (+`within`), `select`+`value` (value or start of the option text; waits for options loaded by AJAX; works with Select2), `cookie` ({ `name`, `value` }: reuse an existing session when the login cannot be automated, e.g. SSO or captcha; value from env), `press`, `wait` (ms or selector), `waitText`, `scrollTo`, `js`, `run` (+`cwd`), `otp` { `file`, `pattern` (regex, group 1 = code), `into`, `submit` }.

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
   - Write the guide text and the config together, step by step, and check each image against its step list before moving on.
5. **Sensitive data must be blurred** (`blur`): passwords, PINs, OTPs, 2FA QR codes/secrets, tokens, real order/record IDs, people's names and contacts. Put app-wide selectors in `alwaysBlur`. Blur also applies to every frame of a `video`. `keepLogin` writes live session cookies to `.gushot/` next to the config: never commit that folder (it has its own `.gitignore`), and do not enable `keepLogin` on shared machines.
6. **Run**, preferably only the changed entries (filter = substring of `name`):
   ```bash
   node "<SKILL>/scripts/shot.cjs" <config.json> <filter>
   ```
   Add `--check` to run the steps without saving images, e.g. to find selectors broken by a UI change.
   Passwords come from env (`{{APP_PASSWORD}}` in the config), never written in the JSON.
7. **Check the output.** Every shot prints `OK <file> (new|changed|unchanged)` or `FAIL <name> - <reason>`; only `new`/`changed` images need updating in the guide; exit code 1 means at least one failed. For `FAIL`, fix the selector/step and rerun only that shot. If you can view images, open 1-2 of the PNGs (not all) to confirm CSS loaded, the session is logged in, and blur applied. If you cannot view images, check that file sizes are not suspiciously small and ask the user to glance at one.
8. **Insert into the guide** (Markdown/HTML) and rebuild the PDF if the project has a builder for it.

## Common problems

| Symptom | Cause |
|---|---|
| Page without CSS | app base URL host differs from `base` |
| `OTP not found` | OTP went to real email/gateway instead of the log, or the `pattern` regex is wrong |
| Redirected back to login | session/cookie failed; check cookie domain, HTTPS vs HTTP |
| `text "X" not found` | element not rendered yet: add `{ "wait": selector }` before it |
| Cropped image / mid-animation | raise `delay`, or use `fullPage: true` |
| Exit code 2 | dependency not installed: run the npm command above |

Report to the user: OK/failed counts, files created, and any environment changes you made.
