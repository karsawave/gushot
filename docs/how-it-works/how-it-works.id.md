# Cara kerja GuShot

[English](how-it-works.md) · **Bahasa Indonesia**

GuShot membaca satu config JSON lalu menjalankan Chrome atau Edge yang sudah terpasang sesuai isi config itu. Anda tidak menulis kode browser; cukup jelaskan halaman dan langkahnya, GuShot yang mengubahnya menjadi file PNG, atau video untuk shot yang memintanya.

## Alur lengkap

```mermaid
flowchart TD
    A["node shot.cjs config.json [filter] [--check] [--md file]"] --> B["Baca config<br/>isi nilai {{ENV}}<br/>peringatkan kunci tak dikenal"]
    B --> C["Pilih shot<br/>(semua, atau yang namanya cocok dengan filter)"]
    C --> D["Cari Chrome / Edge<br/>config, CHROME_PATH, folder instalasi, PATH"]
    D --> E{"Shot berikutnya"}
    E --> F{"Shot memakai sesi<br/>yang belum dibuka?"}
    F -- ya --> G["Buka sesi<br/>(login tersimpan atau login penuh, lihat di bawah)"]
    F -- tidak --> V
    G --> V{"video dan bukan --check?"}
    V -- ya --> R["Rekam: buka url, jalankan langkah,<br/>tampilkan sorotan, simpan gif / mp4 / webm"]
    R --> M3["Cetak OK file (video)"]
    M3 --> E
    V -- tidak --> H["Buka url, jalankan langkah shot"]
    H --> I["Pasang replaceText, blur, hide, css<br/>gambar kotak, nomor, keterangan"]
    I --> J{"--check?"}
    J -- tidak --> K["Simpan PNG<br/>halaman, seluruh halaman, atau elemen + padding"]
    J -- ya --> L["Tidak menyimpan apa pun"]
    K --> M["Cetak OK file (new / changed / unchanged)"]
    L --> M2["Cetak OK nama (checked)"]
    M --> N["Hapus penanda"]
    M2 --> N
    N --> E
    H -. error .-> X["Cetak FAIL nama - alasan<br/>tutup sesi itu, lanjut"]
    R -. error .-> X
    X --> E
    E -- shot habis --> Z["Ringkasan, kode keluar<br/>0 semua OK, 1 ada yang gagal"]
```

## Membuka sesi

Sesi adalah daftar langkah login. Sesi dijalankan sekali per run; shot berikutnya yang menyebut sesi itu memakai ulang tab yang sudah login. Kalau `"keepLogin"` diisi, login juga bisa dipakai ulang antar-run.

```mermaid
flowchart TD
    A["Shot pertama yang menyebut sesi"] --> B{"keepLogin diisi dan<br/>.gushot/sesi.json disimpan<br/>kurang dari keepLogin menit lalu?"}
    B -- ya --> C["Pulihkan cookie + localStorage,<br/>buka halaman tersimpan"]
    C --> D{"Selector wait terakhir<br/>di sesi itu muncul?"}
    D -- ya --> OK["Sesi siap<br/>(login tersimpan dipakai ulang)"]
    D -- tidak --> DEL["Hapus file tersimpan"]
    DEL --> FULL
    B -- tidak --> FULL["Konteks browser baru,<br/>jalankan langkah login (termasuk OTP)"]
    FULL --> S{"keepLogin diisi?"}
    S -- ya --> SAVE["Simpan cookie + localStorage<br/>ke .gushot/ (diabaikan git)"]
    SAVE --> OK2["Sesi siap"]
    S -- tidak --> OK2
```

```mermaid
sequenceDiagram
    participant S1 as shot 02_dashboard
    participant S2 as shot 03_new_order
    participant Tab as tab admin
    S1->>Tab: buka sesi (login atau login tersimpan)
    S1->>Tab: buka url, potret
    S2->>Tab: pakai ulang (sudah login)
    S2->>Tab: jalankan langkah, potret
```

Shot dengan `"freshSession": true` membuka ulang sesinya di konteks browser baru (dengan `keepLogin`, dari login tersimpan). Kalau sebuah shot gagal, sesinya ditutup supaya shot berikutnya mulai dari keadaan bersih.

## Tiga hal lain yang perlu diingat

**Path dihitung dari file config.** `out`, `otp.file`, `cwd` milik langkah `run`, halaman lokal seperti `"./app.html"`, `chrome`, `ffmpeg`, dan folder `.gushot/` semuanya dihitung dari folder tempat file config berada, bukan dari tempat Anda menjalankan perintah.

**Penanda bersifat sementara.** Blur, elemen yang disembunyikan, kotak sorot, nomor, dan keterangan dipasang tepat sebelum memotret lalu dihapus tepat setelahnya, jadi tidak terbawa ke shot berikutnya. Pengecualiannya `replaceText`: teks halaman itu sendiri yang diganti, jadi teks contoh tetap ada sampai ada shot yang membuka `url` lagi.

**Kerangka Markdown ditulis paling akhir.** Dengan `--md`, setelah browser ditutup, GuShot menulis satu bagian per shot yang berhasil (`caption`, path gambar relatif terhadap file Markdown, `text` atau `note` sorotan sebagai langkah bernomor). Bagian ini tidak butuh browser, jadi tetap jalan dengan `--check`. Lihat [tutorial 7](../guide-text/guide-text.id.md).

**Video menjaga blur di setiap frame.** Untuk shot `video`, blur, hide, dan css tambahan dipasang sebelum perekaman dimulai dan dipasang lagi begitu setiap halaman baru dimuat, jadi data pribadi tidak sempat terlihat saat pindah halaman. Lihat [tutorial 6](../video/record-a-flow.id.md).

Berikutnya: [1. Screenshot pertama](../getting-started/first-screenshots.id.md)
