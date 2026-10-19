# 5. Using it with an AI agent

**English** · [Bahasa Indonesia](use-with-ai-agents.id.md)

GuShot ships as an Agent Skill. With it installed, you ask an AI coding agent for screenshots in plain words, and the agent does the work of tutorials 1 to 4: it reads your app, writes the config, runs it, and checks the result.

## What the agent does

```mermaid
flowchart TD
    A["You: 'Make screenshots of login and<br/>the order list for the user guide'"] --> B[Agent loads the guide-screenshots skill]
    B --> C{Config already in the project?}
    C -- yes --> D[Add or edit shots in it]
    C -- no --> E[Copy the example config into docs/]
    D --> F
    E --> F["Read the app's code:<br/>login page, selectors, OTP log, demo accounts"]
    F --> G[Start the app with sample data if needed]
    G --> H[Write shots: names in guide order,<br/>highlight, blur for personal data]
    H --> I["Run shot.cjs (only changed shots)"]
    I --> J{FAIL?}
    J -- yes --> K[Fix selector or step, rerun that shot]
    K --> I
    J -- no --> L[Look at every new or changed image]
    L --> M[Insert images into the guide, report back]
```

The skill tells the agent to use GuShot instead of taking screenshots by hand or writing its own browser script, to keep passwords in environment variables, and to blur personal data.

## Install

### Claude Code

```
/plugin marketplace add rombyar/gushot
/plugin install gushot@gushot
```

### Codex, GitHub Copilot, Cursor, Gemini CLI

Copy the skill folder into `~/.agents/skills/`, which all four read:

```bash
git clone https://github.com/rombyar/gushot.git
mkdir -p ~/.agents/skills
cp -r gushot/skills/guide-screenshots ~/.agents/skills/
```

```powershell
git clone https://github.com/rombyar/gushot.git
New-Item -ItemType Directory -Force "$HOME\.agents\skills" | Out-Null
Copy-Item -Recurse gushot\skills\guide-screenshots "$HOME\.agents\skills\"
```

Gemini CLI can also install it directly:

```bash
gemini skills install https://github.com/rombyar/gushot.git --path skills/guide-screenshots
```

The [main README](../../README.md#using-it-with-an-ai-agent) lists the folder each agent reads and how to call the skill.

### Updating

An installed copy keeps its version until you update it: see [Updating](../../README.md#updating) in the README.

## Your first guide

Not sure what to ask? Copy this, change the lines to fit your app, and send it:

```
Use guide-screenshots to make a user guide for my app.

- App URL: http://localhost:3000
- Login: user admin@example.com, password in the env var APP_PASSWORD
- Readers: staff who use the app every day
- Tasks to cover: log in, <task 1>, <task 2>
- Output: images in docs/guide/screenshots, text in docs/guide.md
- Blur personal data (names, phone numbers, emails).

Look at the app first and show me the list of shots before you capture.
```

- Replace the `<...>` parts with real tasks, such as "add a customer" or "print an invoice".
- Do not put the real password in the prompt. Set it in the env var before you start the agent (`APP_PASSWORD=...`, or `$env:APP_PASSWORD='...'` in PowerShell).
- The agent answers with a shot list. Fix it if needed, then say "go". It captures, checks the images, and writes the text.

## Example requests

Open your app's project in the agent and ask:

| You want | Ask |
|---|---|
| A first set of screenshots | "Use guide-screenshots to capture the login page, the dashboard, and the new order form for the user guide in docs/guide.md." |
| One step explained with numbers | "Screenshot the new order modal with the customer, item, quantity, and save button numbered 1 to 4." |
| A phone version | "Add phone-size versions of the dashboard and order list." |
| An update after a redesign | "The header changed. Check which guide screenshots are broken or changed and update them." |
| The guide text too | "Write the order chapter of docs/guide.md with screenshots. Follow docs/guide-style.md." |
| Indonesian | "Buatkan screenshot halaman login dan dasbor untuk buku panduan, nama file pakai bahasa Indonesia." |

In Claude Code you can also start with the command: `/guide-screenshots capture the login page and the dashboard`.

## What to check afterwards

- The agent reports how many shots succeeded and which files it wrote.
- It tells you if it changed environment files such as `.env` (for example to send mail to a log), and restores them.
- Open a few images yourself: logged in, styled, personal data blurred.
- If it wrote guide text: step numbers match the markers, and quoted button names match the screen. It follows [writing.md](../../skills/guide-screenshots/references/writing.md) and your style file if the project has one.

## Where it cannot work

The agent has to run commands on the machine where your app runs, or one that can reach it. Chat assistants that run in a cloud sandbox cannot open your `localhost` and have no Chrome. Which kinds of app and login GuShot can handle: [Which apps it fits](../../README.md#which-apps-it-fits).

Back to the [docs index](../README.md).
