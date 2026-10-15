# GuShot

[![test](https://github.com/rombyar/gushot/actions/workflows/test.yml/badge.svg)](https://github.com/rombyar/gushot/actions/workflows/test.yml)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**English** · [Bahasa Indonesia](README.id.md)

GuShot (Guide User Shot) takes the screenshots for a web app's user guide. You describe the pages, logins, and clicks in one JSON file, run one command, and get every image at the same size, with sensitive data blurred and the relevant buttons highlighted. When the UI changes, rerun it instead of redoing the screenshots by hand. The image captions and step text can live in the same file, so `--md` gives you an updated Markdown skeleton of the guide too.

![GuShot demo: login, OTP, blur, highlight, modal](demo/gushot-demo.gif)

## Contents

- [Requirements](#requirements)
- [Which apps it fits](#which-apps-it-fits)
- [Quick start](#quick-start)
- [Writing a config](#writing-a-config)
- [Running](#running)
- [Using it with an AI agent](#using-it-with-an-ai-agent)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)

Step-by-step tutorials with runnable examples and flow diagrams are in [docs/](docs/README.md).

## Requirements

- Node.js 18 or newer
- Google Chrome or Microsoft Edge. It is found in the usual install folders on any drive, per-user installs included, or anywhere on `PATH`; otherwise set `CHROME_PATH`
- The web app you want to capture, running somewhere the browser can reach (usually a local dev server with sample data)
- Only for `video` shots: [ffmpeg](https://ffmpeg.org/download.html) on `PATH`, or set `"ffmpeg"` in the config

Works on Windows, macOS, and Linux.

## Which apps it fits

GuShot drives Chrome or Edge, so it works for **web apps** you can run with sample data: server-rendered apps (Laravel, Django, Rails, PHP), single-page apps (React, Vue, Angular), admin and CRUD screens, AJAX dropdown chains, Select2, flatpickr, long modals, and phone-sized layouts of a responsive site.

| Situation | What to expect |
|---|---|
| Login with an OTP written to a log or mail log | works (`otp` step) |
| SSO or captcha login | use an existing session cookie (`cookie` step) |
| OTP by SMS or an authenticator app | turn 2FA off on the local server, or use `cookie` |
| Production server without sample data | possible, but images change with the data, real data may show, and steps that save write to production. Use a local copy |
| Live charts, clocks, animations | the image changes every run; `hide` that part or fix it with a `js` step |
| Canvas or WebGL (maps, drawing editors) | captured, but `clickText`, `fill`, and `replaceText` cannot reach inside |
| Iframes from another domain (payment pages) | captured, but their fields cannot be clicked or filled |
| Downloads, print dialogs, OS dialogs | not captured |
| CSS classes that change every build | configs break often; use `clickText`, `fill` by label, or ask for stable `data-*` attributes |
| Desktop or native mobile apps | not supported |

## Quick start

Get the code and install the one dependency (`puppeteer-core`, which drives your existing Chrome; it does not download a browser):

```bash
git clone https://github.com/rombyar/gushot.git
cd gushot
npm install --omit=dev --prefix skills/guide-screenshots/scripts
```

Try it on the demo app that ships with the repo:

```bash
cd demo
DEMO_PASSWORD=demo node ../skills/guide-screenshots/scripts/shot.cjs gushot.json
```

```
OK    screenshots/01_login.png
OK    screenshots/02_dashboard.png
OK    screenshots/03_new_order.png
OK    screenshots/04_mobile.png

Done: 4 OK, 0 failed. Output in /path/to/gushot/demo/screenshots
```

The images are in `demo/screenshots/`; [demo/README.md](demo/README.md) explains each step of that config. On Windows PowerShell, set the variable first: `$env:DEMO_PASSWORD='demo'`, then run the same `node` command.

## Writing a config

A config has three parts:

- **`sessions`**: how to log in, as a list of steps. Each session runs once and the logged-in tab is reused by every shot that names it.
- **`shots`**: the screenshots, in guide order. Each shot opens a `url`, optionally runs more `steps` (open a menu, fill a form), and saves `<name>.png`.
- **Settings** at the top: the app's `base` URL, the output folder, the viewport size, and what to blur on every page.

```json
{
  "base": "http://localhost:3000",
  "out": "screenshots",
  "alwaysBlur": [".customer-name", ".phone"],
  "sessions": {
    "admin": [
      { "open": "/login" },
      { "type": "#email", "text": "admin@example.com" },
      { "type": "#password", "text": "{{APP_PASSWORD}}" },
      { "click": "button[type=submit]" },
      { "wait": "nav" }
    ]
  },
  "shots": [
    { "name": "01_login", "url": "/login", "highlight": ["button[type=submit]"] },
    { "name": "02_dashboard", "session": "admin", "url": "/dashboard" },
    {
      "name": "03_new_order",
      "session": "admin",
      "url": "/orders",
      "steps": [{ "clickText": "New order" }, { "wait": ".modal" }],
      "element": ".modal"
    }
  ]
}
```

What you will use most:

| In a shot | Does |
|---|---|
| `highlight` | draws a red box around the elements a guide step talks about; `{ "selector": "#save", "label": "2", "note": "Save here" }` adds a numbered badge and a short callout |
| `caption` | the image caption; `--md` writes it as the heading. A highlight's `"text": "Click Save"` is step text for `--md` only, not drawn |
| `replaceText` | swaps real text for sample text before capturing: `{ "Budi Santoso": "Sample Customer" }` (also at the top, for every shot) |
| `blur` | blurs extra elements in this shot (`alwaysBlur` does it for every shot) |
| `element` | captures only one element, such as a modal or a form; add `"padding": 16` to keep some of the page around it |
| `fullPage` | captures the whole scrolling page |
| `viewport` | uses another size for this shot, e.g. `{ "width": 390, "height": 844 }` for a phone |
| `video` | records the shot's steps as `"gif"`, `"mp4"`, or `"webm"` instead of a PNG (needs ffmpeg) |

| Step | Example |
|---|---|
| open a page | `{ "open": "/settings" }` |
| type | `{ "type": "#email", "text": "a@b.c" }` |
| fill a form by label | `{ "fill": { "Asset Name": "Laptop", "Supplier": "PT Sinar Jaya", "Active": true } }` |
| choose an option | `{ "select": "#supplier", "value": "PT Sinar" }` (also Select2 and options loaded later) |
| click | `{ "click": "#save" }` or by visible text: `{ "clickText": "Save" }` |
| wait | `{ "wait": ".modal" }` (selector) or `{ "wait": 1000 }` (ms) |
| one-time code | `{ "otp": { "file": "logs/app.log", "pattern": "code: (\\d{6})", "into": "#otp" } }` |

The OTP step reads the newest code from a file your app writes in development (a log or mail log), so logins with two-factor codes work without a phone.

Selectors are normal CSS selectors. Paths in the config, like `out` and `otp.file`, are relative to the config file.

**Secrets:** never write passwords in the config. `{{APP_PASSWORD}}` is replaced with the `APP_PASSWORD` environment variable when the config is loaded.

Every key and step, including `select`, `press`, `scrollTo`, `hide`, `theme`, and running a shell command before a shot: [REFERENCE.md](skills/guide-screenshots/references/REFERENCE.md). A larger example with OTP: [config.example.json](skills/guide-screenshots/assets/config.example.json).

## Running

```bash
node <path-to>/shot.cjs my-guide.json             # every shot
node <path-to>/shot.cjs my-guide.json 03 login    # only shots whose name contains "03" or "login"
node <path-to>/shot.cjs my-guide.json --check     # run the steps, save nothing
node <path-to>/shot.cjs my-guide.json --md guide-skeleton.md   # also write a Markdown skeleton
```

- Each shot prints `OK <file>` or `FAIL <name> - <reason>`. A failed shot does not stop the rest.
- Each `OK` line says whether the image is `new`, `changed`, or `unchanged` compared with the file it replaced, and the last line counts them. After a UI change, update only the changed images in your guide.
- A misspelled key prints a `WARN unknown key` line instead of being silently ignored.
- Exit code: `0` all shots OK, `1` at least one failed, `2` the dependency is not installed.
- `--check` runs every step but saves no images. Use it after a UI change, or in CI, to find broken selectors early.
- `--md <file>` writes, per shot, its `caption`, the image, and the highlights' step text as a numbered list. The file is overwritten every run: copy from it into your guide. See [tutorial 7](docs/guide-text/guide-text.md).
- `"scale": 2` in the config gives double-resolution images that stay sharp in a PDF or on a HiDPI screen.
- `"keepLogin": 60` in the config keeps each session's login for 60 minutes, so later runs skip the login and OTP. It is saved in `.gushot/` next to the config, which is git-ignored automatically.
- Add `"headless": false` to the config to watch the browser while it works.

## Using it with an AI agent

GuShot is also an [Agent Skill](https://agentskills.io). Once installed, you ask the agent in plain words ("make screenshots of the login page and the dashboard for the user guide"). It reads your app's code to work out the login flow, writes the config, runs it, and checks the images. When it also writes the guide text, it follows [writing.md](skills/guide-screenshots/references/writing.md) and your project's own style file, if you have one.

The agent has to run commands on the same machine as your app, or one that can reach it. Agents that run in a cloud sandbox, such as a chat in the browser, cannot open your `localhost` and have no Chrome.

### Claude Code

Install it as a plugin:

```
/plugin marketplace add rombyar/gushot
/plugin install gushot@gushot
```

Then, in your project: `/guide-screenshots capture the login page and the dashboard`.

### Codex, GitHub Copilot, Cursor, Gemini CLI, and others

Most agents load skills from a `skills` folder. Copy the `guide-screenshots` folder there:

```bash
git clone https://github.com/rombyar/gushot.git
mkdir -p ~/.agents/skills
cp -r gushot/skills/guide-screenshots ~/.agents/skills/
```

```powershell
# Windows PowerShell
git clone https://github.com/rombyar/gushot.git
New-Item -ItemType Directory -Force "$HOME\.agents\skills" | Out-Null
Copy-Item -Recurse gushot\skills\guide-screenshots "$HOME\.agents\skills\"
```

`~/.agents/skills/` makes the skill available in all your projects. To share it with a team instead, copy it into `.agents/skills/` inside the project and commit it.

| Agent | Folder it reads (personal / project) | How to call the skill |
|---|---|---|
| [Codex](https://learn.chatgpt.com/docs/build-skills) (CLI, IDE) | `~/.agents/skills/` / `.agents/skills/` | type `$guide-screenshots`, or just describe the task |
| [GitHub Copilot](https://code.visualstudio.com/docs/copilot/customization/agent-skills) (VS Code agent mode) | `~/.agents/skills/`, `~/.copilot/skills/` / `.agents/skills/`, `.github/skills/` | type `/guide-screenshots` in chat |
| [Cursor](https://cursor.com/docs/context/skills) | `~/.agents/skills/`, `~/.cursor/skills/` / `.agents/skills/`, `.cursor/skills/` | type `/guide-screenshots` in Agent chat |
| [Gemini CLI](https://geminicli.com/docs/cli/skills/) | `~/.agents/skills/`, `~/.gemini/skills/` / `.agents/skills/`, `.gemini/skills/` | describe the task; Gemini asks to activate the skill |
| Claude Code without the plugin | `~/.claude/skills/` / `.claude/skills/` | type `/guide-screenshots` |

Gemini CLI can also install it straight from GitHub:

```bash
gemini skills install https://github.com/rombyar/gushot.git --path skills/guide-screenshots
```

For any other agent, check [the list of agents that support skills](https://agentskills.io) and its docs for the folder name. The skill folder has everything it needs; on the first run the agent installs its one dependency inside it.

## Troubleshooting

| Problem | Likely cause |
|---|---|
| Page has no styling | The app's own base URL setting (for example `APP_URL`) does not match `base` |
| `OTP not found` | The code went to a real email or SMS instead of the log file, or `pattern` does not match the log line |
| Shots show the login page | The login steps failed or the session cookie was not kept; check HTTP vs HTTPS and the cookie domain |
| `text "X" not found` | The element was not on screen yet; add `{ "wait": "<selector>" }` before the click |
| Half-finished animation in the image | Increase `delay` (default 500 ms) |
| `Chrome/Edge not found` | Set `CHROME_PATH` or `"chrome"` in the config to the browser's executable |

Use sample data from seeders, not real customer data. Blur anything personal anyway.

## Indonesian

Indonesian config keys (`buka`, `klik`, `sorot`, ...) work as aliases of the English ones, see [aliases-id.md](skills/guide-screenshots/references/aliases-id.md). `"lang": "id"` or `GUSHOT_LANG=id` switches the terminal messages to Indonesian.

## Contributing

```
skills/guide-screenshots/   the skill: SKILL.md, scripts/shot.cjs, references, example config
demo/                       demo app, its config, and the screenshots/video it produces
docs/                       tutorials, each with a runnable example config
test/                       self-test (no server needed)
.claude-plugin/             Claude Code plugin manifests
.github/                    CI workflow, issue templates, social preview image
```

Run the self-test before sending changes:

```bash
node test/run.cjs
```

It runs test configs against a local page and checks the results: English and Indonesian keys (each with one failing shot and one misspelled key on purpose), numbered highlights and notes, `scale`, `padding`, `--check`, the new/changed/unchanged report, `keepLogin`, `replaceText` and the `--md` skeleton, `video` (the recording part is skipped when ffmpeg is not installed), and a `--check` run of every example in `docs/` and `demo/`. CI runs the same test on Ubuntu, Windows, and macOS for every push and pull request; changes to `main` need it to pass. See [AGENTS.md](AGENTS.md) for the conventions and [CHANGELOG.md](CHANGELOG.md) for releases. Bugs and ideas go in [issues](https://github.com/rombyar/gushot/issues/new/choose).

## License

[MIT](LICENSE)
