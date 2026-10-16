# Config reference

Full example: [../assets/config.example.json](../assets/config.example.json). Relative paths in a config resolve from the config file's folder. `{{ENV_NAME}}` anywhere in the config is replaced from the environment (use it for passwords).

Indonesian keys are accepted as aliases: [aliases-id.md](aliases-id.md).

## Root

| Key | Meaning |
|---|---|
| `base` | app base URL; shot `url` may be relative (`/admin`) |
| `out` | output folder (default `output`) |
| `scale` | pixel density for every shot: `2` gives sharp images for print, PDF, and HiDPI screens (default 1) |
| `viewport` | default `{ width: 1280, height: 900, deviceScaleFactor: scale }` |
| `theme` | `light` / `dark` (prefers-color-scheme) |
| `alwaysBlur` | CSS selectors blurred in every shot |
| `replaceText` | `{ "real text": "sample text" }` swapped in every shot, in page text and form fields; `""` removes the text. Merged with the shot's own `replaceText` |
| `init` | helper code for `js` steps, run at the start of every page before the page's own scripts, also after each navigation: `"var sleep = (ms) => new Promise((r) => setTimeout(r, ms));"`, or `{ "file": "helpers.js" }` relative to the config. Declare helpers with `var` or on `window`. The page has no `<body>` yet when it runs, so put DOM work inside functions |
| `guide` | the document's version, for the guide's cover and revision history: `{ "version": "1.1", "date": "2026-10-16", "appVersion": "ITSM 2.3" }`. `version` is required; `date` defaults to the day of the run. With `--md`, the skeleton starts with these as YAML front matter plus a suggested revision row. After a run where images changed but `version` is the same as last time, GuShot prints a reminder to raise it (the last version is kept in `.gushot/guide.json`). GuShot never edits the config |
| `freezeTime` | the page's clock starts at this time and keeps running, e.g. `"2026-01-15T09:00:00"`: "today", calendars, and "2 hours ago" stay the same between runs. Only dates made in the browser; dates the server prints are not affected (use sample data with fixed dates, or `replaceText`) |
| `blurStrength` | blur radius in px (default 6) |
| `highlightColor` | highlight box color (default `#e11d48`) |
| `css` | extra CSS while capturing (e.g. hide a debug bar) |
| `delay` | extra ms before every capture (default 500) |
| `headless` | `false` to watch the browser work |
| `keepLogin` | minutes to keep a session's login between runs, e.g. `60`. After logging in, cookies and localStorage are saved to `.gushot/<session>.json` next to the config (the folder gets its own `.gitignore`); the next run restores them and skips the login and OTP. A saved login is used only if the session's last `wait` selector appears, otherwise it is deleted and the session logs in normally; the terminal says why (expired, selector not found, ...). Only works for apps that keep the login in cookies or localStorage. The file holds live session cookies: do not enable it on shared machines, delete `.gushot/` to force a fresh login |
| `ffmpeg` | path to ffmpeg for `video` shots, absolute or relative to the config file (default: `ffmpeg` on `PATH`) |
| `chrome` | browser executable path, absolute or relative to the config file. Without it: `CHROME_PATH`, then Chrome/Edge in the install folders from `PROGRAMFILES`, `PROGRAMFILES(X86)`, and `LOCALAPPDATA` (Windows) or `/Applications` and `~/Applications` (macOS), then `google-chrome`, `chromium`, `microsoft-edge`, `chrome`, or `msedge` anywhere on `PATH` |
| `lang` | `en` / `id` terminal messages (or env `GUSHOT_LANG`; the old name `SHOT_LANG` still works) |
| `sessions` | `{ name: [steps...] }` login steps per role; run once, reused across shots |
| `shots` | list of screenshots |

## Shot

| Key | Meaning |
|---|---|
| `name` | file name (`.png` added automatically); CLI filter matches substrings of it |
| `session` | session name; empty = guest |
| `url` | page to open |
| `steps` | actions before capturing (click a button, open a modal, fill a form) |
| `video` | record the shot instead of a PNG: `true` or `"mp4"`, `"gif"` (loops), `"webm"`. Records opening `url` and every step, with a short pause after each, then holds on the `highlight` boxes. `alwaysBlur`, `blur`, and `hide` apply to every frame. Saved as `<name>.<format>`. Needs ffmpeg. `element`, `padding`, and `fullPage` do not apply |
| `element` | capture only this element (e.g. a modal). If it is taller than the viewport (a long modal), the viewport is made taller for this capture so the whole element is in the image |
| `padding` | with `element`: px of surrounding page to include on each side, e.g. `16` |
| `fullPage` | `true` = whole page, not just the viewport |
| `blur` | extra selectors to blur |
| `hide` | selectors to hide |
| `highlight` | elements marked with a red box (drawn on top of the page, so it stays sharp over blurred fields and is not cut off by the element's parents) (the button a guide step mentions): `["#save"]`, or with a numbered badge: `[{ "selector": "#name", "label": "1" }, { "selector": "#save", "label": "2" }]`. Add `"note": "Click to save"` for a short callout below the box (above it near the bottom of the screen). `"text"` is step text for `--md` only, not drawn: use it instead of `note` when callouts would crowd the image |
| `viewport` | size for this shot only (e.g. mobile) |
| `freshSession` | `true` = start the session again in a new browser context first (clean state). With `keepLogin`, a still-valid saved login is reused instead of logging in |
| `delay` | extra ms before capturing |
| `caption` | image caption; `--md` uses it as alt text and as an italic line under the image (default: `name`, no italic line) |
| `replaceText` | `{ "real text": "sample text" }` for this shot, on top of the root one. Runs after `steps`, just before the capture (or before the end of a `video`). It changes the page itself, so the next shot in the same session still shows the sample text unless it opens a `url` |

## Steps

One object = one action:

| Step | Example |
|---|---|
| open | `{ "open": "/login" }`, a full URL, or a local file `"./page.html"` |
| type | `{ "type": "#email", "text": "a@b.c" }` |
| click | `{ "click": "button[type=submit]" }` |
| click by text | `{ "clickText": "Save" }` (optional `"within": "button"`) |
| select | `{ "select": "select#status", "value": "active" }`. `value` is the option value, its exact text, or the start of its text (`"PT Sinar"`); an exact text match wins, so `"LAPTOP"` picks "LAPTOP" even when "LAPTOP / NOTEBOOK" is listed first. Waits up to `timeout` (15 s) for options loaded by AJAX. Works with Select2 and similar plugins |
| fill by label | `{ "fill": { "Asset Name": "Laptop", "Supplier": "PT Sinar Jaya", "Purchase Date": "2026-03-10", "Active": true } }`. Each key is the visible text of a field's `<label>` (exact, or the start of it; `*` ignored). Looks inside `within` if given, else inside an open modal (`.modal.show`, `dialog[open]`), else the page. Text fields are typed, selects work like `select`, checkboxes take `true`/`false`, date and read-only fields are set directly, and date fields with a flatpickr calendar are set through flatpickr so the calendar stays closed. Typed fields lose focus afterwards, so autocomplete lists and pickers that open on focus do not cover the form in the image. Fields are filled in the order written. Each label is waited for up to `timeout` (15 s), so fields revealed by an earlier choice are found, and after each field the page's network requests are allowed to finish, so dropdowns that reload over AJAX (Asset Code -> Category -> Model, Company -> Location -> Spot) are ready before the next field. Labels that are not found fail the shot with their names |
| cookie | `{ "cookie": { "name": "app_session", "value": "{{SESSION_COOKIE}}" } }`, usually first in a session, followed by `open`. For logins that cannot be automated (SSO, captcha): copy the session cookie from your browser into an environment variable. Domain defaults to the host of `base`; `domain`, `path`, `secure`, `httpOnly` can be set |
| press key | `{ "press": "Enter" }` |
| wait | `{ "wait": 1000 }` or `{ "wait": ".modal" }` (optional `"timeout"`) |
| wait for text | `{ "waitText": "Saved" }` |
| scroll | `{ "scrollTo": "#section-2" }` |
| JavaScript | `{ "js": "document.querySelector('x').click()" }` |
| shell command | `{ "run": "npm run seed", "cwd": "../app" }` (failure = continue) |
| OTP from file | `{ "otp": { "file": "logs/app.log", "pattern": "code: (\\d{6})", "into": "#otp", "submit": "button[type=submit]" } }` |

OTP: the code is capture group 1 of the last `pattern` match written to `file` after the previous step. Works for apps that write OTPs/emails to a log in local development. `submit` is a selector or a step object; optional `tries` (default 60, 250 ms each).

## Output and exit codes

- One line per shot: `OK <file> (new|changed|unchanged)` or `FAIL <name> - <reason>` (`GAGAL` with `lang: id`), then a summary and `Changed: X, new: Y.` The state compares the file with the one it replaces, so after a rerun you know which images to update in the guide.
- A `changed` shot also prints `before: .gushot/prev/<name>.png`: the image it replaced, kept next to the config (git-ignored) so you can compare the two. Overwritten at the next change.
- `Images in <out> that no shot makes (...)`: PNG files in the output folder that no shot in the config produces, usually left over after a shot was renamed or removed. Delete them, or fix the guide if it still uses them. Works best with one output folder per config.
- A `video` shot prints `OK <file> (video)`; videos are not compared with the previous file.
- `WARN unknown key "x"` (`PERINGATAN` with `lang: id`): a config key the tool does not know, most likely a typo; it is ignored. Keys starting with `_` or `$` are allowed for comments.
- `--check` anywhere on the command line runs every step and checks that `element` exists, but saves no images. Use it after UI changes, or in CI, to find broken selectors.
- `--md <file>` also writes a Markdown skeleton. With `guide` set, it starts with YAML front matter (`version`, `date`, `appVersion`) and ends the header with `<!-- Revision row: | version | date | changed/new shots | (reason) | -->`. The run line records the run: date plus the `changed` and `new` shots (or that it was a `--check` run), for the guide's revision history. Then one section per successful shot: `## name`, the image (path relative to the Markdown file; absolute when the image is on another drive), the caption as an italic line under it, and each `highlight` `text` (or `note`) as a numbered list (number = `label`, or the order). The file is overwritten each run; copy from it into the guide. Works with `--check` too. Sections follow the order of `shots`, so keep the shots in the same order as the images in the guide.
- `--guide <file.md>` checks a Markdown guide against the config after the run (also with `--check`). For every `![alt](path)` that points into the output folder it prints a `GUIDE` line when no shot makes that image, when the alt text differs from the shot's `caption`, or when the italic line right under the image differs from it. Shots the guide does not use are listed as info. Any problem makes the exit code 1, so it can run in CI. Only Markdown images, not HTML `<img>`; paths resolve from the guide's folder.
- Exit 0 = all OK, 1 = at least one shot failed (others still run) or `--guide` found a problem, 2 = dependency missing.
