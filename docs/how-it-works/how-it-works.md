# How GuShot works

**English** · [Bahasa Indonesia](how-it-works.id.md)

GuShot reads one JSON config and drives your installed Chrome or Edge through it. You never write browser code; you describe pages and steps, and GuShot turns them into PNG files.

## The whole run

```mermaid
flowchart TD
    A["node shot.cjs config.json [filter] [--check]"] --> B["Read config<br/>replace {{ENV}} values<br/>warn about unknown keys"]
    B --> C["Pick shots<br/>(all, or names matching the filter)"]
    C --> D["Find Chrome / Edge<br/>config, CHROME_PATH, install folders, PATH"]
    D --> E{"Next shot"}
    E --> F{"Shot uses a session<br/>that is not open yet?"}
    F -- yes --> G["Run the session's login steps<br/>(once, then reuse the tab)"]
    F -- no --> H
    G --> H["Open url, run the shot's steps"]
    H --> I["Apply blur, hide, css<br/>draw highlight boxes and numbers"]
    I --> J{"--check?"}
    J -- no --> K["Save PNG<br/>page, full page, or element + padding"]
    J -- yes --> L["Save nothing"]
    K --> M["Print OK file (new / changed / unchanged)"]
    L --> M2["Print OK name (checked)"]
    M --> N["Remove annotations"]
    M2 --> N
    N --> E
    H -. error .-> X["Print FAIL name - reason<br/>close that session, continue"]
    X --> E
    E -- no more shots --> Z["Summary, exit code<br/>0 all OK, 1 something failed"]
```

## Three ideas to keep in mind

**Sessions log in once.** A session is a list of login steps. The first shot that names it runs those steps in a fresh browser context; later shots reuse the logged-in tab. A shot with `"freshSession": true` logs in again first. If a shot fails, its session is closed so the next shot starts clean.

```mermaid
sequenceDiagram
    participant S1 as shot 02_dashboard
    participant S2 as shot 03_new_order
    participant Tab as admin tab
    S1->>Tab: open new context, run login steps
    S1->>Tab: open url, capture
    S2->>Tab: reuse (already logged in)
    S2->>Tab: run steps, capture
```

**Paths are relative to the config file.** `out`, `otp.file`, a `run` step's `cwd`, a local page like `"./app.html"`, and `chrome` all resolve from the folder that holds the config, not from where you run the command.

**Annotations are temporary.** Blur, hidden elements, highlight boxes, and numbers are added right before the capture and removed right after, so they never leak into the next shot.

Next: [1. Your first screenshots](../getting-started/first-screenshots.md)
