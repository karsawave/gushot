# Dokumentasi GuShot

[English](README.md) · **Bahasa Indonesia**

Tutorial, diurutkan sesuai kebutuhan yang biasanya muncul. Setiap folder berisi tutorial, config yang bisa dijalankan terhadap [aplikasi demo](../demo/) (tanpa server), dan screenshot hasil config tersebut.

| Tutorial | Yang dipelajari |
|---|---|
| [Cara kerja GuShot](how-it-works/how-it-works.id.md) | apa yang terjadi antara `node shot.cjs` dan file PNG |
| [1. Screenshot pertama](getting-started/first-screenshots.id.md) | pasang, tulis config, potret halaman ukuran desktop dan HP |
| [2. Login, termasuk OTP](login/login-and-otp.id.md) | sesi, password dari environment, membaca kode OTP dari log |
| [3. Blur, sembunyikan, sorot, beri nomor](annotations/blur-highlight-numbering.id.md) | melindungi data pribadi dan menunjuk bagian yang dibahas panduan |
| [4. Menjaga screenshot tetap terbaru](maintenance/update-after-ui-change.id.md) | jalankan ulang setelah tampilan berubah, lihat yang berubah, tangkap selector rusak di CI |
| [5. Dipakai lewat agen AI](ai-agents/use-with-ai-agents.id.md) | biarkan Claude Code, Codex, Copilot, Cursor, atau Gemini CLI menulis dan menjalankan config |

Semua kunci dan langkah ada di [REFERENCE.md](../skills/guide-screenshots/references/REFERENCE.md) (bahasa Inggris). Kunci bahasa Indonesia: [aliases-id.md](../skills/guide-screenshots/references/aliases-id.md).

## Menjalankan contoh

Pasang dependensinya sekali, dari folder utama repo:

```bash
npm install --omit=dev --prefix skills/guide-screenshots/scripts
```

Lalu jalankan config sebuah tutorial dari foldernya, misalnya:

```bash
cd docs/login
APP_PASSWORD=demo node ../../skills/guide-screenshots/scripts/shot.cjs example.json
```

Di Windows PowerShell, isi variabelnya dulu dengan `$env:APP_PASSWORD='demo'`. Contoh yang tidak login tidak butuh variabel apa pun. Tambahkan `"lang": "id"` di config (atau env `GUSHOT_LANG=id`) supaya pesan terminal berbahasa Indonesia.
