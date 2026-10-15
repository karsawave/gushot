# How GuShot works

**English** · [Bahasa Indonesia](how-it-works.id.md)

GuShot reads one JSON config and drives your installed Chrome or Edge through it. You never write browser code; you describe pages and steps, and GuShot turns them into PNG files, or videos for shots that ask for one.

## The whole run

```mermaid
flowchart TD
    A["node shot.cjs config.json [filter] [--check] [--md file]"] --> B["Read config<br/>replace {{ENV}} values<br/>warn about unknown keys"]
    B --> C["Pick shots<br/>(all, or names matching the filter)"]
    C --> D["Find Chrome / Edge<br/>config, CHROME_PATH, install folders, PATH"]
    D --> E{"Next shot"}
    E --> F{"Shot uses a session<br/>that is not open yet?"}
    F -- yes --> G["Open the session<br/>(saved login or full login, see below)"]
    F -- no --> V
    G --> V{"video and not --check?"}
    V -- yes --> R["Record: open url, run steps,<br/>show highlights, save gif / mp4 / webm"]
    R --> M3["Print OK file (video)"]
    M3 --> E
    V -- no --> H["Open url, run the shot's steps"]
    H --> I["Apply replaceText, blur, hide, css<br/>draw boxes, numbers, notes"]
    I --> J{"--check?"}
    J -- no --> K["Save PNG<br/>page, full page, or element + padding"]
    J -- yes --> L["Save nothing"]
    K --> M["Print OK file (new / changed / unchanged)"]
    L --> M2["Print OK name (checked)"]
    M --> N["Remove annotations"]
    M2 --> N
    N --> E
    H -. error .-> X["Print FAIL name - reason<br/>close that session, continue"]
    R -. error .-> X
    X --> E
    E -- no more shots --> Z["Summary, exit code<br/>0 all OK, 1 something failed"]
```

## Opening a session

A session is a list of login steps. It runs once per run; every later shot that names it reuses the logged-in tab. With `"keepLogin"` set, the login can also be reused across runs.

```mermaid
flowchart TD
    A["First shot that names the session"] --> B{"keepLogin set and<br/>.gushot/session.json saved<br/>less than keepLogin minutes ago?"}
    B -- yes --> C["Restore cookies + localStorage,<br/>open the saved page"]
    C --> D{"Last wait selector<br/>of the session appears?"}
    D -- yes --> OK["Session ready<br/>(saved login reused)"]
    D -- no --> DEL["Delete the saved file"]
    DEL --> FULL
    B -- no --> FULL["Fresh browser context,<br/>run the login steps (OTP included)"]
    FULL --> S{"keepLogin set?"}
    S -- yes --> SAVE["Save cookies + localStorage<br/>to .gushot/ (git-ignored)"]
    SAVE --> OK2["Session ready"]
    S -- no --> OK2
```

```mermaid
sequenceDiagram
    participant S1 as shot 02_dashboard
    participant S2 as shot 03_new_order
    participant Tab as admin tab
    S1->>Tab: open the session (login or saved login)
    S1->>Tab: open url, capture
    S2->>Tab: reuse (already logged in)
    S2->>Tab: run steps, capture
```

A shot with `"freshSession": true` starts its session again in a new browser context (with `keepLogin`, from the saved login). If a shot fails, its session is closed so the next shot starts clean.

## Three more things to keep in mind

**Paths are relative to the config file.** `out`, `otp.file`, a `run` step's `cwd`, a local page like `"./app.html"`, `chrome`, `ffmpeg`, and the `.gushot/` folder all resolve from the folder that holds the config, not from where you run the command.

**Annotations are temporary.** Blur, hidden elements, highlight boxes, numbers, and notes are added right before the capture and removed right after, so they never leak into the next shot. `replaceText` is the exception: it changes the page text itself, so the sample text stays until a shot opens a `url` again.

**The Markdown skeleton comes last.** With `--md`, after the browser closes, GuShot writes one section per successful shot (`caption`, image path relative to the Markdown file, highlight `text` or `note` as numbered steps). It needs no browser, so it works with `--check` too. See [tutorial 7](../guide-text/guide-text.md).

**Videos keep blur on every frame.** For a `video` shot, blur, hide, and extra css are added before recording starts and again as soon as each new page loads, so private data does not flash by between pages. See [tutorial 6](../video/record-a-flow.md).

Next: [1. Your first screenshots](../getting-started/first-screenshots.md)
