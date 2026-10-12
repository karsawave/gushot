# Demo

**English** · [Bahasa Indonesia](#bahasa-indonesia)

A fake orders app, "Kedai Orders", in a single HTML file, and the GuShot config that captures it. No server is needed: the config opens `app.html` straight from disk.

| File | What it is |
|---|---|
| [`app.html`](app.html) | the app: login, a 6-digit email code, a dashboard with customer data, and a "New order" modal |
| [`gushot.json`](gushot.json) | the config that logs in and takes the four screenshots |
| [`screenshots/`](screenshots/) | the result, committed so you can see it without running anything |
| [`gushot-demo.mp4`](gushot-demo.mp4), [`gushot-demo.gif`](gushot-demo.gif) | a 30-second recording of the run, shown in the main README |
| [`record/`](record/) | the script that makes the video: `node demo/record/record.cjs` from the repo root (needs ffmpeg) |

## Run it

Install the dependency once, from the repo root:

```bash
npm install --omit=dev --prefix skills/guide-screenshots/scripts
```

Then, from this folder:

```bash
# macOS / Linux / Git Bash
DEMO_PASSWORD=demo node ../skills/guide-screenshots/scripts/shot.cjs gushot.json
```

```powershell
# Windows PowerShell
$env:DEMO_PASSWORD='demo'; node ../skills/guide-screenshots/scripts/shot.cjs gushot.json
```

The four PNGs in `screenshots/` are overwritten. Any password works; the demo app does not check it. To watch the browser do the steps, add `"headless": false` to `gushot.json`.

## What the config does

1. **Logs in** (`sessions.admin`): opens `app.html`, types the email and the password from `DEMO_PASSWORD`, and clicks Sign in.
2. **Enters the email code**: a `run` step writes `Your Kedai code: 482913` to `mail.log`, standing in for a real app that logs outgoing mail in development. The `otp` step reads the code from that file and types it in.
3. **Blurs personal data** on every shot: `alwaysBlur` covers customer names, phone numbers, and the signed-in user.
4. **Takes four shots:**

| Shot | Shows | Uses |
|---|---|---|
| `01_login` | the login form, steps numbered 1 to 3 | `highlight` with `label`, no session |
| `02_dashboard` | the orders table, "+ New order" highlighted | `session`, `highlight` |
| `03_new_order` | only the modal, fields numbered 1 to 4 | `steps` (click, wait), `element`, `highlight` with `label` |
| `04_mobile` | the dashboard at phone width | `viewport`, `freshSession` |

To try your own changes, edit `gushot.json` (for example, add `"fullPage": true` or another selector to `highlight`) and run it again. To capture just one shot, add part of its name: `... gushot.json 03`.

---

## Bahasa Indonesia

Aplikasi pesanan fiktif "Kedai Orders" dalam satu file HTML, beserta config GuShot untuk memotretnya. Tidak perlu server: config membuka `app.html` langsung dari disk.

| File | Isi |
|---|---|
| [`app.html`](app.html) | aplikasinya: login, kode 6 digit via email, dasbor berisi data pelanggan, dan modal "New order" |
| [`gushot.json`](gushot.json) | config yang login lalu mengambil empat screenshot |
| [`screenshots/`](screenshots/) | hasilnya, ikut di-commit supaya bisa dilihat tanpa menjalankan apa pun |
| [`gushot-demo.mp4`](gushot-demo.mp4), [`gushot-demo.gif`](gushot-demo.gif) | rekaman 30 detik saat dijalankan |
| [`record/`](record/) | skrip pembuat video: `node demo/record/record.cjs` dari folder utama repo (butuh ffmpeg) |

### Menjalankan

Pasang dependensinya sekali, dari folder utama repo:

```bash
npm install --omit=dev --prefix skills/guide-screenshots/scripts
```

Lalu dari folder ini:

```bash
# macOS / Linux / Git Bash
DEMO_PASSWORD=demo node ../skills/guide-screenshots/scripts/shot.cjs gushot.json
```

```powershell
# Windows PowerShell
$env:DEMO_PASSWORD='demo'; node ../skills/guide-screenshots/scripts/shot.cjs gushot.json
```

Keempat PNG di `screenshots/` akan ditimpa. Password apa saja bisa dipakai karena aplikasi demo tidak memeriksanya. Untuk melihat browser menjalankan langkah-langkahnya, tambahkan `"headless": false` di `gushot.json`.

### Yang dilakukan config

1. **Login** (`sessions.admin`): membuka `app.html`, mengetik email dan password dari `DEMO_PASSWORD`, lalu klik Sign in.
2. **Mengisi kode email**: langkah `run` menulis `Your Kedai code: 482913` ke `mail.log`, meniru aplikasi sungguhan yang mencatat email keluar ke log saat development. Langkah `otp` membaca kode dari file itu lalu mengetikkannya.
3. **Mem-blur data pribadi** di semua shot: `alwaysBlur` mencakup nama pelanggan, nomor HP, dan nama pengguna yang login.
4. **Mengambil empat shot:**

| Shot | Isi | Memakai |
|---|---|---|
| `01_login` | form login, langkah diberi nomor 1 sampai 3 | `highlight` dengan `label`, tanpa sesi |
| `02_dashboard` | tabel pesanan, tombol "+ New order" disorot | `session`, `highlight` |
| `03_new_order` | hanya modal, kolom diberi nomor 1 sampai 4 | `steps` (klik, tunggu), `element`, `highlight` dengan `label` |
| `04_mobile` | dasbor selebar layar HP | `viewport`, `freshSession` |

Untuk mencoba perubahan sendiri, ubah `gushot.json` (misalnya tambahkan `"fullPage": true` atau selector lain di `highlight`), lalu jalankan lagi. Untuk satu shot saja, tambahkan sebagian namanya: `... gushot.json 03`.
