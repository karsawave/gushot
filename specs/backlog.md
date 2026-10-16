# Spesifikasi backlog GuShot

Status per 2026-10-16. Urutan sesuai prioritas. Setiap item mengikuti aturan AGENTS.md: kunci baru masuk `KEYS`, `ALIAS`, `REFERENCE.md`, dan `aliases-id.md`; pesan baru ditulis di `MSG.en` dan `MSG.id`; ada kasus baru di `test/run.cjs`; perubahan dicatat di CHANGELOG bagian Unreleased.

---

## 1. Script pembantu bersama (`init`) — SELESAI (Unreleased)

**Masalah.** Config ITSM mengulang blok `js` yang sama (`sleep`, `clickText`, `fill`, `stripTag`) di 35 shot. Kalau satu fungsi diperbaiki, 35 salinannya harus ikut diubah.

**Config.**
```json
{ "init": "var sleep = ms => new Promise(r => setTimeout(r, ms)); ...",
  "shots": [{ "name": "01", "steps": [{ "js": "(async()=>{ await sleep(500); })()" }] }] }
```
- Kunci root `init` (alias `awal`): string JS, atau `{ "file": "helpers.js" }` yang path-nya relatif terhadap config.

**Perilaku.**
- Dijalankan di setiap dokumen baru lewat `page.evaluateOnNewDocument` di `newPage()`, jadi tetap ada setelah navigasi, termasuk di sesi login dan shot `video`.
- Kode dijalankan sebelum script halaman, saat `<body>` belum ada. Pekerjaan DOM harus ditaruh di dalam fungsi. Ini disederhanakan dari rencana awal (menunggu `DOMContentLoaded`), karena pembungkus fungsi membuat `var` tidak lagi global.
- Error di `init` hanya muncul di console halaman, tidak dilaporkan GuShot.

**Batasan.** Variabel harus dideklarasikan dengan `var` atau dipasang ke `window` supaya terlihat dari langkah `js`.

**Uji.** Config dengan `init: "window.twice = x => x * 2"` dan langkah `js` yang melempar error kalau `twice(2) !== 4`, lalu sekali lagi setelah `open` ke halaman lain.

**Usaha.** Kecil, sekitar 15 baris.

---

## 2. Kasus uji yang kurang — SELESAI

**Masalah.** Baris run di awal kerangka `--md` hanya diuji untuk bahasa Inggris tanpa `--check`.

**Uji baru.**
- `GUSHOT_LANG=id` dengan `--md`: baris pertama diawali `> Run GuShot <tanggal>: baru: x01_login, x02_text_still_replaced`.
- `--check --md`: baris pertama `> GuShot run <tanggal> (--check, no images saved)`.
- `freezeTime` bukan tanggal (`"besok"`): exit 1, pesan `freezeTime "besok" is not a date`.

**Usaha.** Kecil, hanya `test/run.cjs`.

---

## 3. Cek juklak terhadap config (`--guide`)

**Masalah.** Keterangan gambar di juklak dan `caption` di config bisa diam-diam berbeda. Gambar yang dipakai juklak juga bisa tidak punya shot lagi.

**CLI.** `node shot.cjs config.json --check --guide docs/juklak.md`. Bisa juga tanpa `--check`, jadi pengecekan dilakukan setelah gambar diperbarui.

**Perilaku.** Setelah run, GuShot membaca file Markdown dan, untuk setiap `![alt](path)` yang menunjuk ke folder `out`:
- **gambar tanpa shot**: gambar yang dipakai juklak, tapi tidak dibuat shot mana pun;
- **keterangan beda**: shot punya `caption`, tapi alt atau baris miring di bawah gambar berbeda;
- **shot tidak dipakai**: shot yang gambarnya tidak dirujuk juklak, hanya sebagai info.

Hasilnya satu baris per temuan dengan prefix `GUIDE`. Exit code 1 kalau ada temuan jenis 1 atau 2, supaya bisa dipakai di CI.

**Batasan.** Hanya gambar Markdown, bukan `<img>` HTML. Path dibandingkan setelah dinormalisasi relatif terhadap file juklak.

**Uji.** `test/guide.md` berisi satu gambar yang cocok, satu dengan alt beda, dan satu tanpa shot. Diharapkan dua temuan dan exit 1.

**Usaha.** Sedang, sekitar 40 baris.

---

## 4. Varian bahasa atau tema (`variants`)

**Masalah.** Aplikasi dua bahasa atau dengan mode gelap butuh semua shot dipotret dua kali, sehingga config harus ditulis dua kali.

**Config.**
```json
"variants": [
  { "suffix": "-id", "steps": [{ "open": "/lang/id" }] },
  { "suffix": "-en", "steps": [{ "open": "/lang/en" }], "theme": "dark" }
]
```
- Kunci root `variants` (alias `varian`): setiap varian punya `suffix` (wajib), dan boleh punya `steps` (dijalankan sekali setelah login sesi), `theme`, serta `viewport`.

**Perilaku.**
- Semua shot dijalankan sekali per varian. Nama file menjadi `<name><suffix>.png`, dan filter nama mencocokkan nama yang sudah diberi akhiran.
- Setiap varian memakai sesi browser sendiri, supaya bahasa dan cookie tidak bercampur.
- `--md` menulis satu kerangka per varian: `kerangka-id.md`, `kerangka-en.md`.

**Batasan.** `caption` dan `text` tetap satu bahasa. Teks per bahasa (`caption: { "id": "...", "en": "..." }`) belum dibuat; tunggu ada kebutuhan nyata.

**Uji.** Dua varian dengan `replaceText` berbeda pada `page.html`. Diharapkan dua PNG dengan akhiran yang benar dan isi yang berbeda.

**Usaha.** Sedang, karena menyentuh loop utama, cache sesi, dan `--md`.

---

## 5. Rekam login sendiri (`recordLogin`)

**Masalah.** Login SSO, captcha, atau OTP lewat SMS tidak bisa diotomatiskan. Langkah `cookie` harus diisi manual satu per satu.

**CLI.** `node shot.cjs config.json --login admin`

**Perilaku.**
- Membuka browser yang terlihat di halaman awal sesi (`open` pertama), lalu menunggu sampai selector `wait` terakhir sesi itu muncul. Artinya Anda selesai login, dengan batas waktu 5 menit.
- Setelah itu cookie dan localStorage disimpan ke `.gushot/admin.json`, dengan format dan pengecekan yang sama seperti `keepLogin`.
- Run berikutnya memakai login itu selama masih berlaku, memakai fungsi `restoreLogin()` yang sudah ada.

**Batasan.**
- Butuh layar, jadi tidak bisa di CI.
- File sesi berisi cookie hidup; aturan `.gushot/` yang ada tetap berlaku.

**Uji.** Sulit diotomatiskan karena butuh interaksi. Uji sebagian dengan `--login` dalam mode headless pada halaman yang langsung menampilkan selector `wait`: file sesi harus tertulis.

**Usaha.** Sedang, sebagian besar memakai ulang kode `keepLogin`.

---

## 6. Mode HP sungguhan (`device`)

**Masalah.** `viewport` hanya mengubah ukuran. Aplikasi yang membaca user agent atau dukungan sentuh tetap menampilkan versi desktop.

**Config.** `{ "name": "04_mobile", "device": "iPhone 13" }`, juga bisa di root.

**Perilaku.** Memakai `KnownDevices` bawaan puppeteer-core lewat `page.emulate()`, yang mengatur viewport, user agent, `isMobile`, dan `hasTouch`. Kalau ada `viewport` juga, `viewport` yang dipakai. Nama perangkat yang tidak dikenal membuat shot gagal dengan daftar 5 nama yang paling mirip.

**Uji.** `page.html` dengan langkah `js` yang melempar error kalau `navigator.maxTouchPoints === 0`.

**Usaha.** Kecil, sekitar 10 baris.

---

## 7. Iframe (`frame`)

**Masalah.** `click`, `fill`, `type`, dan `waitText` tidak bisa menjangkau elemen di dalam iframe.

**Config.** `{ "frame": "#payment-iframe", "fill": { "Card number": "4111..." } }`. `frame` adalah selector iframe di halaman utama dan berlaku untuk langkah itu saja.

**Perilaku.** `run()` mencari iframe-nya, mengambil `contentFrame()`, lalu menjalankan langkah pada frame itu. Iframe dari domain lain tetap bisa dijangkau lewat CDP.

**Batasan.**
- `highlight`, `blur`, dan `replaceText` tetap hanya untuk halaman utama.
- Iframe di dalam iframe belum didukung.

**Uji.** Halaman uji dengan `<iframe srcdoc>` berisi form. Langkah `fill` dengan `frame` diharapkan berhasil.

**Usaha.** Sedang, karena fungsi langkah harus menerima frame selain page.

---

## 8. Penomoran gambar otomatis

**Masalah.** Kalau ada gambar baru di tengah bab, semua nomor "Gambar 6.x" setelahnya harus diubah manual di config dan di juklak.

**Config.**
```json
"captionNumber": "Gambar {chapter}.{n}",
"shots": [{ "name": "02", "chapter": 6, "caption": "Contoh halaman daftar" }]
```
- Kunci root `captionNumber` adalah pola. Kunci shot `chapter` mengatur bab, dan `{n}` diulang dari 1 setiap bab berganti.

**Perilaku.** Nomor hanya dipakai di `--md` dan `--guide`; gambarnya sendiri tidak berubah. Diagram yang dibuat agent tidak ikut dinomori, sehingga perlu kunci `skipNumbers: 1` per shot untuk memberi tempat bagi diagram.

**Batasan.** Juklak yang sudah ada tetap harus disalin ulang dari kerangka.

**Uji.** Tiga shot di dua bab, dengan `skipNumbers` di salah satunya. Diharapkan nomornya 6.1, 6.3, dan 7.1.

**Usaha.** Sedang. Sebaiknya dikerjakan setelah nomor 3.

---

## 9. Rilis 1.6.0

**Isi.** Bagian Unreleased saat ini: `freezeTime`, gambar `before:`, dan daftar gambar yatim, ditambah item lain yang selesai sebelum rilis.

**Langkah.** Self-test lulus, lalu versi naik di keempat file (hanya baris versi GuShot, bukan dependensi seperti `once`), CHANGELOG diberi judul `## 1.6.0 (tanggal)`, commit `Release 1.6.0`, tag `v1.6.0`, push, `gh release create` dengan judul `GuShot 1.6.0`, lalu cek CI.

**Usaha.** Kecil.
