# 2. Logging in, with OTP

**English** · [Bahasa Indonesia](login-and-otp.id.md)

Most guide pages are behind a login. In this tutorial you log in once with a password from the environment, enter a one-time code that the app writes to a log file, and capture pages as the logged-in user.

## The login flow

```mermaid
sequenceDiagram
    participant G as GuShot
    participant B as Browser
    participant L as mail.log
    G->>B: open login page
    G->>B: type email, type password from APP_PASSWORD
    G->>B: click Sign in
    Note over B,L: the app sends the code,<br/>in development it is written to a log
    G->>L: run step writes the code (demo only)
    G->>L: otp step reads the newest code
    G->>B: type the code, click Verify
    G->>B: wait for #app
    Note over G,B: session admin is ready,<br/>every shot with session admin reuses it
```

## The config

[example.json](example.json) in this folder:

```json
{
  "out": "screenshots",
  "viewport": { "width": 1100, "height": 640 },
  "alwaysBlur": [".customer", ".phone", ".contact"],
  "sessions": {
    "admin": [
      { "open": "../../demo/app.html" },
      { "type": "#email", "text": "rina@kedai.example" },
      { "type": "#password", "text": "{{APP_PASSWORD}}" },
      { "click": "#login button" },
      { "run": "node -e \"require('fs').appendFileSync('mail.log','Your Kedai code: 482913\\n')\"" },
      { "otp": { "file": "mail.log", "pattern": "Kedai code: (\\d{6})", "into": "#code", "submit": { "clickText": "Verify" } } },
      { "wait": "#app" }
    ]
  },
  "shots": [
    { "name": "01_otp_page", "url": "../../demo/app.html", "steps": [
      { "type": "#email", "text": "rina@kedai.example" },
      { "type": "#password", "text": "{{APP_PASSWORD}}" },
      { "click": "#login button" },
      { "wait": "#code" }
    ] },
    { "name": "02_dashboard", "session": "admin" }
  ]
}
```

What each part does:

- **`sessions.admin`** is the login, written once. Name sessions after roles (`admin`, `cashier`, `customer`) when your guide covers several.
- **`{{APP_PASSWORD}}`** is replaced with the `APP_PASSWORD` environment variable. Passwords never go in the file.
- **`run`** writes a code to `mail.log`. The demo app has no mail server, so this stands in for it. In your app you leave this step out, because the app writes the code itself.
- **`otp`** waits for a line matching `pattern` in `file`, takes capture group 1 (the `(\d{6})` part), types it into `into`, and runs `submit`. It only reads lines written after the previous step, so an old code is never reused.
- **`01_otp_page`** has no session: it shows the page between password and code, so the guide can explain that step.
- **`02_dashboard`** uses the session, so it starts already logged in.

## Run it

```bash
cd docs/login
APP_PASSWORD=demo node ../../skills/guide-screenshots/scripts/shot.cjs example.json
```

PowerShell: `$env:APP_PASSWORD='demo'; node ../../skills/guide-screenshots/scripts/shot.cjs example.json`

## Result

| `01_otp_page.png` | `02_dashboard.png` |
|---|---|
| ![Code entry page](screenshots/01_otp_page.png) | ![Dashboard after login](screenshots/02_dashboard.png) |

The email address, customer names, phone numbers, and user name are blurred by `alwaysBlur`. Tutorial 3 covers that.

## For your own app

1. **Find the real selectors.** Open the login page, right-click the email field, and choose Inspect. Prefer `#id` or `[name=email]` over long class chains.
2. **Find where the code goes in development.** Laravel with `MAIL_MAILER=log` writes mail to `storage/logs/laravel.log`; many apps print it to the console log. Point `otp.file` there and write a `pattern` that matches the line, for example `"Your code is (\\d{6})"`.
3. **Make the app's base URL match `base`.** If the app thinks it lives at another host, its CSS and cookies break.
4. **Watch out for login rate limits.** Add a `run` step that clears the limiter (for example `php artisan cache:clear`) at the start of the session.
5. **Login cannot be automated (SSO, captcha)?** Log in once in your own browser, copy the session cookie (DevTools > Application > Cookies), and start the session with it instead of the login steps:

   ```json
   "admin": [
     { "cookie": { "name": "laravel_session", "value": "{{SESSION_COOKIE}}" } },
     { "open": "/dashboard" },
     { "wait": ".main-content" }
   ]
   ```

   The value comes from the environment, never from the file. It stops working when that session expires or you log out.

```mermaid
flowchart TD
    A[Shot shows the login page instead of the app] --> B{Login steps passed?}
    B -- "FAIL: element not found" --> C[Fix the selector, or add a wait step before it]
    B -- "FAIL: OTP not found" --> D["Check otp.file path and pattern,<br/>is mail going to a real inbox?"]
    B -- yes --> E[Session cookie lost:<br/>check base URL, HTTP vs HTTPS, cookie domain]
```

To skip the login and OTP on later runs, see `keepLogin` in [tutorial 6](../video/record-a-flow.md#skipping-the-login-on-every-run).

Next: [3. Blur, hide, highlight, number](../annotations/blur-highlight-numbering.md)
