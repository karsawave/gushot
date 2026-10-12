# Changelog

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
