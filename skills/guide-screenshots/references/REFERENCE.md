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
| `blurStrength` | blur radius in px (default 6) |
| `highlightColor` | highlight box color (default `#e11d48`) |
| `css` | extra CSS while capturing (e.g. hide a debug bar) |
| `delay` | extra ms before every capture (default 500) |
| `headless` | `false` to watch the browser work |
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
| `element` | capture only this element (e.g. a modal) |
| `padding` | with `element`: px of surrounding page to include on each side, e.g. `16` |
| `fullPage` | `true` = whole page, not just the viewport |
| `blur` | extra selectors to blur |
| `hide` | selectors to hide |
| `highlight` | elements outlined with a red box (the button a guide step mentions): `["#save"]`, or with a numbered badge: `[{ "selector": "#name", "label": "1" }, { "selector": "#save", "label": "2" }]` |
| `viewport` | size for this shot only (e.g. mobile) |
| `freshSession` | `true` = log in again first (clean state) |
| `delay` | extra ms before capturing |

## Steps

One object = one action:

| Step | Example |
|---|---|
| open | `{ "open": "/login" }`, a full URL, or a local file `"./page.html"` |
| type | `{ "type": "#email", "text": "a@b.c" }` |
| click | `{ "click": "button[type=submit]" }` |
| click by text | `{ "clickText": "Save" }` (optional `"within": "button"`) |
| select | `{ "select": "select#status", "value": "active" }` |
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
- `WARN unknown key "x"` (`PERINGATAN` with `lang: id`): a config key the tool does not know, most likely a typo; it is ignored. Keys starting with `_` or `$` are allowed for comments.
- `--check` anywhere on the command line runs every step and checks that `element` exists, but saves no images. Use it after UI changes, or in CI, to find broken selectors.
- Exit 0 = all OK, 1 = at least one shot failed (others still run), 2 = dependency missing.
