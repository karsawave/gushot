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

Do not capture screenshots by hand through a browser tool and do not write a new browser-automation script: write or edit the JSON config, then run `scripts/shot.cjs`.

## Language

- Reply to the user in the language they write in (English primary, Indonesian supported). Guide file names and captions follow the language of the guide being written.
- Write new configs with English keys. Indonesian keys (`buka`, `ketik`, `klik`, `sorot`, `nama`, `sesi`, ...) are aliases: when editing an existing config that uses them, keep its style.
- Set `"lang": "id"` in the config if the user wants Indonesian terminal messages.

## Key summary

Root: `base`, `scale` (2 = sharp for PDF/print), `keepLogin` (minutes; skip login/OTP on later runs), `ffmpeg`, `out`, `viewport`, `theme`, `alwaysBlur`, `css`, `delay`, `sessions` ({ name: [steps] }), `shots`.
Shot: `name`, `session`, `url`, `steps`, `element` (+`padding` px of context), `fullPage`, `blur`, `hide`, `highlight` (selectors, or `{ selector, label, note }`: numbered badge matching the guide's step numbers, short callout text), `video` (`true`/`"gif"`/`"webm"`: record url + steps instead of a PNG; needs ffmpeg), `viewport`, `freshSession`, `delay`.
Steps: `open`, `type`+`text`, `click`, `clickText` (+`within`), `select`+`value`, `press`, `wait` (ms or selector), `waitText`, `scrollTo`, `js`, `run` (+`cwd`), `otp` { `file`, `pattern` (regex, group 1 = code), `into`, `submit` }.

## Workflow

1. **Look for an existing config** in the project (`**/screenshot*.json`, `**/shots*.json`). Found = add/edit entries, do not create a new one.
   None = copy `assets/config.example.json` to the project's docs folder (e.g. `docs/screenshots.json`) and adapt it.
2. **Learn the login flow from the code, do not guess:** login page, input selectors, whether there is 2FA/OTP, where the OTP is written in local dev (log/mail log), login rate limits (add a `run` step that clears the cache if needed), demo accounts from seeders/fixtures.
3. **Prepare a local server** with sample data (seeders). Common requirements: the app's base URL setting (e.g. `APP_URL`) must match `base`, otherwise CSS fails to load; real OTP/email delivery is disabled so codes are written to the log. If you must change `.env` or similar, back it up first, restore it afterwards, and tell the user.
4. **Write shot entries.** Name them in guide order (`01_login`, `02_dashboard`, ...) or follow the project's existing naming. Use `highlight` for the button a guide step talks about, `element` for modals/forms.
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
