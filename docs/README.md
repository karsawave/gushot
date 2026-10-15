# GuShot docs

**English** · [Bahasa Indonesia](README.id.md)

Tutorials, in the order you will probably need them. Each folder has the tutorial, a config you can run against the [demo app](../demo/) (no server needed), and the screenshots that config produces.

| Tutorial | You will learn |
|---|---|
| [How GuShot works](how-it-works/how-it-works.md) | what happens between `node shot.cjs` and the PNG files |
| [1. Your first screenshots](getting-started/first-screenshots.md) | install, write a config, capture pages at desktop and phone size |
| [2. Logging in, with OTP](login/login-and-otp.md) | sessions, passwords from the environment, reading a one-time code from a log |
| [3. Blur, hide, highlight, number](annotations/blur-highlight-numbering.md) | protect personal data and point at what the guide talks about |
| [4. Keeping screenshots current](maintenance/update-after-ui-change.md) | rerun after a UI change, see what changed, catch broken selectors in CI |
| [5. Using it with an AI agent](ai-agents/use-with-ai-agents.md) | let Claude Code, Codex, Copilot, Cursor, or Gemini CLI write and run the config |
| [6. Recording a flow as a video](video/record-a-flow.md) | record steps as GIF/MP4 with blur kept on, and skip the login on later runs |
| [7. Keeping the guide text with the screenshots](guide-text/guide-text.md) | captions and step text in the config, a Markdown skeleton with `--md`, sample names with `replaceText` |

Every key and step is listed in [REFERENCE.md](../skills/guide-screenshots/references/REFERENCE.md).

## Running the examples

Install the dependency once, from the repo root:

```bash
npm install --omit=dev --prefix skills/guide-screenshots/scripts
```

Then run a tutorial's config from its folder, for example:

```bash
cd docs/login
APP_PASSWORD=demo node ../../skills/guide-screenshots/scripts/shot.cjs example.json
```

On Windows PowerShell, set the variable with `$env:APP_PASSWORD='demo'` first. The examples that do not log in need no variable.
