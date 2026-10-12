# AGENTS.md

This repo is one Agent Skill: `skills/guide-screenshots/` (see its `SKILL.md`). To capture user-guide screenshots, follow that skill. Do not write a new browser-automation script.

Working on the tool itself:

- Code: `skills/guide-screenshots/scripts/shot.cjs` (single file, CommonJS, only dependency `puppeteer-core`).
- Keep the skill folder self-contained: anything the skill needs lives inside it, paths in `SKILL.md` stay relative to the skill folder, no agent-specific variables.
- Config keys are English; Indonesian aliases live in the `ALIAS` map. When adding a key, update `KEYS`, `ALIAS`, `references/REFERENCE.md`, and `references/aliases-id.md`.
- Terminal messages live in `MSG.en` and `MSG.id`; add both.
- Self-test after changes (CI runs the same on Ubuntu, Windows, and macOS; `main` requires it to pass; exit 0 = pass):
  ```bash
  node test/run.cjs
  ```
  The video test needs ffmpeg; without it only the recording part is skipped. New features get a case in `test/run.cjs`, and an example in `docs/` when users need one (the self-test runs every `docs/*/example.json` with `--check`).
- Add user-visible changes under `## Unreleased` in `CHANGELOG.md`; keep the version in `SKILL.md`, `scripts/package.json`, `package-lock.json`, and `.claude-plugin/plugin.json` in sync. Docs come in pairs: `name.md` (English) and `name.id.md` (Indonesian).
