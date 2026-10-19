# GuShot

[![test](https://github.com/rombyar/gushot/actions/workflows/test.yml/badge.svg)](https://github.com/rombyar/gushot/actions/workflows/test.yml)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

[English](README.md) · **Bahasa Indonesia**

GuShot (Guide User Shot) membuat screenshot untuk buku panduan aplikasi web. Halaman, login, dan klik ditulis di satu file JSON, lalu satu perintah memotret semuanya dengan ukuran yang sama, data sensitif di-blur, dan tombol yang dibahas diberi sorotan. Kalau tampilan aplikasi berubah, cukup jalankan ulang, tidak perlu memotret manual lagi. Keterangan gambar dan teks langkah juga bisa disimpan di file yang sama, jadi `--md` sekaligus menghasilkan kerangka panduan Markdown yang ikut diperbarui.

![Demo GuShot: login, OTP, blur, sorotan, modal](demo/gushot-demo.gif)

## Isi

- [Kebutuhan](#kebutuhan)
- [Cocok untuk aplikasi apa](#cocok-untuk-aplikasi-apa)
- [Mulai cepat](#mulai-cepat)
- [Menulis config](#menulis-config)
- [Menjalankan](#menjalankan)
- [Dipakai lewat agen AI](#dipakai-lewat-agen-ai)
- [Masalah umum](#masalah-umum)
- [Berkontribusi](#berkontribusi)

Tutorial langkah demi langkah, lengkap dengan contoh yang bisa dijalankan dan diagram alur, ada di [docs/](docs/README.id.md).

## Kebutuhan

- Node.js 18 atau lebih baru
- Google Chrome atau Microsoft Edge. Dicari otomatis di folder instalasi biasa di drive mana pun, termasuk instalasi per-user, atau di mana saja di `PATH`; kalau tidak ketemu, isi `CHROME_PATH`
- Aplikasi web yang mau dipotret, berjalan di alamat yang bisa dibuka browser (biasanya server lokal dengan data contoh)
- Khusus shot `video`: [ffmpeg](https://ffmpeg.org/download.html) di `PATH`, atau isi `"ffmpeg"` di config

Jalan di Windows, macOS, dan Linux.

## Cocok untuk aplikasi apa

GuShot menjalankan Chrome atau Edge, jadi cocok untuk **aplikasi web** yang bisa dijalankan dengan data contoh: aplikasi yang dirender server (Laravel, Django, Rails, PHP), aplikasi satu halaman (React, Vue, Angular), layar admin dan CRUD, dropdown berantai AJAX, Select2, flatpickr, modal panjang, dan tampilan HP dari situs responsif.

| Kondisi | Yang terjadi |
|---|---|
| Login dengan OTP yang ditulis ke log atau log email | bisa (langkah `otp`) |
| Login SSO atau captcha | login manual sekali dengan `--login <sesi>` (butuh `keepLogin`), atau pakai cookie sesi yang sudah ada (langkah `cookie`) |
| OTP lewat SMS atau aplikasi authenticator | login manual dengan `--login`, matikan 2FA di server lokal, atau pakai `cookie` |
| Server produksi tanpa data contoh | bisa, tapi gambar ikut berubah mengikuti data, data asli bisa terpotret, dan langkah yang menyimpan menulis ke produksi. Pakai salinan lokal |
| UI beberapa bahasa, atau mode terang dan gelap | `variants` memotret semua shot per bahasa atau tema dari satu config |
| Tanggal, jam, "2 jam lalu" | `"freezeTime": "2026-01-15T09:00:00"` menetapkan tanggal yang dibuat di browser; tanggal yang dicetak server butuh data contoh bertanggal tetap |
| Grafik live, animasi | gambar berubah setiap run; sembunyikan dengan `hide` atau tetapkan nilainya lewat langkah `js` |
| Canvas atau WebGL (peta, editor gambar) | ikut terpotret, tapi `clickText`, `fill`, dan `replaceText` tidak bisa menjangkau isinya |
| Form di dalam iframe (halaman pembayaran, editor tersisip) | tambahkan `"frame": "#iframe"` pada langkah untuk klik atau isi di dalamnya; sorotan dan blur tetap hanya untuk halaman utama |
| Unduhan, dialog cetak, dialog bawaan OS | tidak terpotret |
| Class CSS yang berganti setiap build | config sering rusak; pakai `clickText`, `fill` berdasarkan label, atau minta atribut `data-*` yang tetap |
| Aplikasi desktop atau mobile native | tidak didukung |

## Mulai cepat

Ambil kodenya lalu pasang satu dependensinya (`puppeteer-core`, yang menjalankan Chrome yang sudah terpasang; tidak mengunduh browser baru):

```bash
git clone https://github.com/rombyar/gushot.git
cd gushot
npm install --omit=dev --prefix skills/guide-screenshots/scripts
```

Coba dengan aplikasi demo yang ada di repo:

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

Gambarnya ada di `demo/screenshots/`; [demo/README.md](demo/README.md) menjelaskan setiap langkah config tersebut. Di Windows PowerShell, isi variabelnya dulu: `$env:DEMO_PASSWORD='demo'`, lalu jalankan perintah `node` yang sama.

## Menulis config

Config terdiri dari tiga bagian:

- **`sessions`**: cara login, berupa daftar langkah. Setiap sesi dijalankan sekali, lalu tab yang sudah login dipakai ulang oleh semua shot yang menyebut nama sesi itu.
- **`shots`**: daftar screenshot, urut sesuai panduan. Setiap shot membuka `url`, bisa menjalankan `steps` tambahan (membuka menu, mengisi form), lalu menyimpan `<name>.png`.
- **Pengaturan** di bagian atas: URL dasar aplikasi (`base`), folder hasil, ukuran layar, dan elemen yang selalu di-blur.

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
      "name": "03_pesanan_baru",
      "session": "admin",
      "url": "/orders",
      "steps": [{ "clickText": "New order" }, { "wait": ".modal" }],
      "element": ".modal"
    }
  ]
}
```

Yang paling sering dipakai:

| Di dalam shot | Fungsi |
|---|---|
| `highlight` | memberi kotak merah pada elemen yang dibahas di langkah panduan; `{ "selector": "#save", "label": "2", "note": "Simpan di sini" }` menambah nomor langkah dan teks keterangan |
| `caption` | keterangan gambar; `--md` menuliskannya sebagai teks alt dan baris miring di bawah gambar. `"text": "Klik Simpan"` pada sorotan adalah teks langkah khusus `--md`, tidak digambar |
| `replaceText` | mengganti teks asli dengan teks contoh sebelum memotret: `{ "Budi Santoso": "Pelanggan Contoh" }` (bisa juga di bagian atas, untuk semua shot) |
| `blur` | mem-blur elemen tambahan di shot ini (`alwaysBlur` berlaku untuk semua shot) |
| `element` | memotret satu elemen saja, misalnya modal atau form; tambahkan `"padding": 16` supaya sebagian halaman di sekitarnya ikut terlihat |
| `fullPage` | memotret seluruh halaman sampai bawah |
| `viewport` | ukuran layar khusus shot ini, misalnya `{ "width": 390, "height": 844 }` untuk HP |
| `device` | meniru HP atau tablet, misalnya `"iPhone 13"`: ukuran, user agent, dan sentuhan, jadi situs menampilkan tampilan HP yang sebenarnya |
| `video` | merekam langkah shot sebagai `"gif"`, `"mp4"`, atau `"webm"`, bukan PNG (butuh ffmpeg) |

| Langkah | Contoh |
|---|---|
| buka halaman | `{ "open": "/settings" }` |
| ketik | `{ "type": "#email", "text": "a@b.c" }` |
| isi form berdasarkan label | `{ "fill": { "Asset Name": "Laptop", "Supplier": "PT Sinar Jaya", "Active": true } }` |
| pilih opsi | `{ "select": "#supplier", "value": "PT Sinar" }` (termasuk Select2 dan opsi yang dimuat belakangan) |
| klik | `{ "click": "#save" }` atau berdasarkan teks: `{ "clickText": "Simpan" }` |
| tunggu | `{ "wait": ".modal" }` (selector) atau `{ "wait": 1000 }` (ms) |
| kode OTP | `{ "otp": { "file": "logs/app.log", "pattern": "code: (\\d{6})", "into": "#otp" } }` |

Langkah OTP membaca kode terbaru dari file yang ditulis aplikasi saat development (log biasa atau log email), jadi login dengan kode dua langkah bisa jalan tanpa HP.

Selector memakai selector CSS biasa. Path di dalam config, seperti `out` dan `otp.file`, dihitung dari folder file config.

**Rahasia:** jangan tulis password di config. `{{APP_PASSWORD}}` diganti dengan isi variabel environment `APP_PASSWORD` saat config dibaca.

Semua kunci dan langkah, termasuk `select`, `press`, `scrollTo`, `hide`, `theme`, dan menjalankan perintah shell sebelum memotret: [REFERENCE.md](skills/guide-screenshots/references/REFERENCE.md) (bahasa Inggris). Contoh lengkap dengan OTP: [config.example.json](skills/guide-screenshots/assets/config.example.json).

Kunci config juga bisa ditulis dalam bahasa Indonesia (`buka`, `klik`, `sorot`, ...): [daftar alias](skills/guide-screenshots/references/aliases-id.md). Tambahkan `"lang": "id"` (atau env `GUSHOT_LANG=id`) supaya pesan terminal berbahasa Indonesia.

## Menjalankan

```bash
node <path>/shot.cjs panduan.json             # semua shot
node <path>/shot.cjs panduan.json 03 login    # hanya shot yang namanya mengandung "03" atau "login"
node <path>/shot.cjs panduan.json --check     # jalankan langkah, tanpa menyimpan gambar
node <path>/shot.cjs panduan.json --md kerangka.md   # sekaligus menulis kerangka Markdown
node <path>/shot.cjs panduan.json --check --guide panduan.md   # cek gambar dan keterangan panduan terhadap config
```

- Setiap shot mencetak `OK <file>` atau `FAIL <nama> - <alasan>`. Shot yang gagal tidak menghentikan yang lain.
- Setiap baris `OK` menyebut apakah gambarnya `new` (baru), `changed` (berubah), atau `unchanged` (sama) dibanding file sebelumnya, dan baris terakhir menghitungnya. Setelah tampilan aplikasi berubah, cukup perbarui gambar yang berubah di panduan.
- Kunci yang salah ketik memunculkan baris `WARN unknown key`, tidak diabaikan diam-diam.
- Kode keluar: `0` semua OK, `1` ada yang gagal, `2` dependensi belum dipasang.
- `--check` menjalankan semua langkah tanpa menyimpan gambar. Pakai setelah tampilan berubah, atau di CI, untuk menemukan selector yang rusak lebih awal.
- `--md <file>` menulis, per shot, `caption`-nya, gambarnya, dan teks langkah dari sorotan sebagai daftar bernomor. File ini ditimpa setiap run: salin isinya ke panduan Anda. Lihat [tutorial 7](docs/guide-text/guide-text.id.md).
- `"scale": 2` di config menghasilkan gambar resolusi ganda yang tetap tajam di PDF atau layar HiDPI.
- Gambar yang `changed` menyimpan gambar lamanya di `.gushot/prev/`, dan setiap run mendaftar gambar di folder output yang tidak lagi dibuat shot mana pun.
- `"keepLogin": 60` di config menyimpan login tiap sesi selama 60 menit, jadi run berikutnya tidak perlu login dan OTP lagi. Disimpan di `.gushot/` di samping config, yang otomatis diabaikan git.
- Tambahkan `"headless": false` di config untuk melihat browser saat bekerja.

## Dipakai lewat agen AI

GuShot juga sebuah [Agent Skill](https://agentskills.io). Setelah dipasang, cukup minta ke agen dengan bahasa biasa ("buatkan screenshot halaman login dan dasbor untuk buku panduan"). Agen akan membaca kode aplikasi Anda untuk memahami alur login, menulis config, menjalankannya, lalu memeriksa gambarnya. Kalau agen juga menulis teks panduannya, agen mengikuti [writing.md](skills/guide-screenshots/references/writing.md) dan file gaya milik proyek Anda, kalau ada.

Untuk juklak pertama, salin prompt ini, isi bagian `[...]`, lalu kirim ke agen. Hapus baris yang tidak perlu.

```
Pakai GuShot (skill guide-screenshots) untuk membuat buku panduan aplikasi [NAMA APLIKASI].

- URL aplikasi: [URL, misal http://localhost:3000]
- Login: user [USERNAME/EMAIL], password di env var [NAMA_ENV, misal APP_PASSWORD]
- Pembaca: [SIAPA PEMBACANYA, misal staf admin gudang]
- Tugas yang dibahas, urut:
  1. [TUGAS 1, misal Login]
  2. [TUGAS 2]
  3. [TUGAS 3]
- Hasil: gambar di [FOLDER]/screenshots, teks di [FOLDER].md
- Nama file dan teks dalam bahasa Indonesia.
- Blur data pribadi: [DATA, misal nama, nomor telepon, email].

Lihat aplikasinya dulu dan tunjukkan daftar screenshot sebelum mulai mengambil.
```

Contoh isian, untuk aplikasi stok barang:

```
Pakai GuShot (skill guide-screenshots) untuk membuat buku panduan aplikasi StockPro.

- URL aplikasi: http://localhost:8000
- Login: user admin@stockpro.test, password di env var APP_PASSWORD
- Pembaca: staf gudang yang mencatat barang masuk dan keluar
- Tugas yang dibahas, urut:
  1. Login
  2. Tambah barang baru
  3. Catat barang masuk
  4. Cetak laporan stok bulanan
- Hasil: gambar di docs/panduan/screenshots, teks di docs/panduan.md
- Nama file dan teks dalam bahasa Indonesia.
- Blur data pribadi: nama pemasok, nomor telepon, email.

Lihat aplikasinya dulu dan tunjukkan daftar screenshot sebelum mulai mengambil.
```

Jangan tulis password asli di prompt: isi env var sebelum menjalankan agen (`APP_PASSWORD=...`, atau `$env:APP_PASSWORD='...'` di PowerShell).

Agennya harus bisa menjalankan perintah di komputer yang sama dengan aplikasi Anda, atau yang bisa mengaksesnya. Agen yang berjalan di sandbox cloud, misalnya chat di browser, tidak bisa membuka `localhost` Anda dan tidak punya Chrome.

### Claude Code

Pasang sebagai plugin:

```
/plugin marketplace add rombyar/gushot
/plugin install gushot@gushot
```

Lalu di proyek Anda: `/guide-screenshots buatkan screenshot halaman login dan dasbor`.

### Codex, GitHub Copilot, Cursor, Gemini CLI, dan lainnya

Sebagian besar agen membaca skill dari folder `skills`. Salin folder `guide-screenshots` ke sana:

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

Dengan `~/.agents/skills/`, skill bisa dipakai di semua proyek Anda. Kalau ingin dibagikan ke tim, salin ke `.agents/skills/` di dalam proyek lalu commit.

| Agen | Folder yang dibaca (pribadi / proyek) | Cara memanggil skill |
|---|---|---|
| [Codex](https://learn.chatgpt.com/docs/build-skills) (CLI, IDE) | `~/.agents/skills/` / `.agents/skills/` | ketik `$guide-screenshots`, atau langsung jelaskan tugasnya |
| [GitHub Copilot](https://code.visualstudio.com/docs/copilot/customization/agent-skills) (agent mode VS Code) | `~/.agents/skills/`, `~/.copilot/skills/` / `.agents/skills/`, `.github/skills/` | ketik `/guide-screenshots` di chat |
| [Cursor](https://cursor.com/docs/context/skills) | `~/.agents/skills/`, `~/.cursor/skills/` / `.agents/skills/`, `.cursor/skills/` | ketik `/guide-screenshots` di Agent chat |
| [Gemini CLI](https://geminicli.com/docs/cli/skills/) | `~/.agents/skills/`, `~/.gemini/skills/` / `.agents/skills/`, `.gemini/skills/` | jelaskan tugasnya; Gemini akan minta izin mengaktifkan skill |
| Claude Code tanpa plugin | `~/.claude/skills/` / `.claude/skills/` | ketik `/guide-screenshots` |

Gemini CLI juga bisa memasangnya langsung dari GitHub:

```bash
gemini skills install https://github.com/rombyar/gushot.git --path skills/guide-screenshots
```

Untuk agen lain, lihat [daftar agen yang mendukung skill](https://agentskills.io) dan dokumentasinya untuk nama foldernya. Folder skill sudah berisi semua yang dibutuhkan; saat pertama dipakai, agen akan memasang satu dependensinya di dalam folder itu.

### Memperbarui

Salinan yang sudah terpasang tidak memperbarui dirinya sendiri, jadi agent bisa terus memakai skill lama tanpa aturan yang lebih baru. Versi yang dipakai tertulis di `version` di bagian atas `SKILL.md` skill; bandingkan dengan [Releases](https://github.com/rombyar/gushot/releases).

- Plugin Claude Code: `/plugin marketplace update gushot`, lalu perbarui GuShot dari `/plugin` (atau uninstall lalu install lagi), dan mulai sesi baru.
- Folder skill yang disalin: `git pull` di clone Anda, salin ulang `skills/guide-screenshots` menimpa folder lama, lalu jalankan baris `npm install` dari Mulai cepat di dalamnya.

## Masalah umum

| Masalah | Kemungkinan penyebab |
|---|---|
| Halaman tampil tanpa CSS | Pengaturan URL dasar aplikasi (misalnya `APP_URL`) tidak sama dengan `base` |
| `OTP not found` | Kode terkirim ke email atau SMS sungguhan, bukan ke file log, atau `pattern` tidak cocok dengan baris log |
| Hasil screenshot malah halaman login | Langkah login gagal atau cookie sesi tidak tersimpan; cek HTTP vs HTTPS dan domain cookie |
| `text "X" not found` | Elemen belum tampil; tambahkan `{ "wait": "<selector>" }` sebelum klik |
| Gambar tertangkap di tengah animasi | Naikkan `delay` (bawaan 500 ms) |
| `Chrome/Edge not found` | Isi `CHROME_PATH` atau `"chrome"` di config dengan path browser |

Pakai data contoh dari seeder, bukan data pelanggan asli. Data pribadi tetap di-blur.

## Berkontribusi

```
skills/guide-screenshots/   skill-nya: SKILL.md, scripts/shot.cjs, referensi, contoh config
demo/                       aplikasi demo, config-nya, serta screenshot dan video hasilnya
docs/                       tutorial, masing-masing dengan contoh config yang bisa dijalankan
test/                       uji mandiri (tidak butuh server)
.claude-plugin/             manifest plugin Claude Code
.github/                    workflow CI, template issue, gambar social preview
```

Jalankan uji mandiri sebelum mengirim perubahan:

```bash
node test/run.cjs
```

Uji ini menjalankan config uji terhadap halaman lokal lalu memeriksa hasilnya: kunci Inggris dan Indonesia (masing-masing sengaja berisi satu shot yang gagal dan satu kunci yang salah ketik), sorotan bernomor dan keterangan, `scale`, `padding`, `--check`, laporan new/changed/unchanged, `keepLogin`, `replaceText` dan kerangka `--md`, `video` (bagian rekaman dilewati kalau ffmpeg tidak terpasang), serta `--check` untuk semua contoh di `docs/` dan `demo/`. CI menjalankan uji yang sama di Ubuntu, Windows, dan macOS setiap push dan pull request; perubahan ke `main` harus lulus uji ini. Aturan pengembangan: kunci config berbahasa Inggris, dengan alias Indonesia di map `ALIAS` dan di [aliases-id.md](skills/guide-screenshots/references/aliases-id.md); pesan terminal ada di `MSG.en` dan `MSG.id`; setiap halaman dokumentasi berpasangan `nama.md` dan `nama.id.md`; perubahan yang terlihat pengguna dicatat di bagian `## Unreleased` di [CHANGELOG.md](CHANGELOG.md). Laporan bug dan ide fitur lewat [issues](https://github.com/rombyar/gushot/issues/new/choose).

## Lisensi

[MIT](LICENSE)
