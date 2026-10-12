# Cara kerja GuShot

[English](how-it-works.md) · **Bahasa Indonesia**

GuShot membaca satu config JSON lalu menjalankan Chrome atau Edge yang sudah terpasang sesuai isi config itu. Anda tidak menulis kode browser; cukup jelaskan halaman dan langkahnya, GuShot yang mengubahnya menjadi file PNG.

## Alur lengkap

```mermaid
flowchart TD
    A["node shot.cjs config.json [filter] [--check]"] --> B["Baca config<br/>isi nilai {{ENV}}<br/>peringatkan kunci tak dikenal"]
    B --> C["Pilih shot<br/>(semua, atau yang namanya cocok dengan filter)"]
    C --> D["Cari Chrome / Edge<br/>config, CHROME_PATH, folder instalasi, PATH"]
    D --> E{"Shot berikutnya"}
    E --> F{"Shot memakai sesi<br/>yang belum dibuka?"}
    F -- ya --> G["Jalankan langkah login sesi itu<br/>(sekali, lalu tab dipakai ulang)"]
    F -- tidak --> H
    G --> H["Buka url, jalankan langkah shot"]
    H --> I["Pasang blur, hide, css<br/>gambar kotak sorot dan nomor"]
    I --> J{"--check?"}
    J -- tidak --> K["Simpan PNG<br/>halaman, seluruh halaman, atau elemen + padding"]
    J -- ya --> L["Tidak menyimpan apa pun"]
    K --> M["Cetak OK file (new / changed / unchanged)"]
    L --> M2["Cetak OK nama (checked)"]
    M --> N["Hapus penanda"]
    M2 --> N
    N --> E
    H -. error .-> X["Cetak FAIL nama - alasan<br/>tutup sesi itu, lanjut"]
    X --> E
    E -- shot habis --> Z["Ringkasan, kode keluar<br/>0 semua OK, 1 ada yang gagal"]
```

## Tiga hal yang perlu diingat

**Sesi login sekali saja.** Sesi adalah daftar langkah login. Shot pertama yang menyebut sesi itu menjalankan langkahnya di konteks browser baru; shot berikutnya memakai ulang tab yang sudah login. Shot dengan `"freshSession": true` login ulang dulu. Kalau sebuah shot gagal, sesinya ditutup supaya shot berikutnya mulai dari keadaan bersih.

```mermaid
sequenceDiagram
    participant S1 as shot 02_dashboard
    participant S2 as shot 03_new_order
    participant Tab as tab admin
    S1->>Tab: buka konteks baru, jalankan langkah login
    S1->>Tab: buka url, potret
    S2->>Tab: pakai ulang (sudah login)
    S2->>Tab: jalankan langkah, potret
```

**Path dihitung dari file config.** `out`, `otp.file`, `cwd` milik langkah `run`, halaman lokal seperti `"./app.html"`, dan `chrome` semuanya dihitung dari folder tempat file config berada, bukan dari tempat Anda menjalankan perintah.

**Penanda bersifat sementara.** Blur, elemen yang disembunyikan, kotak sorot, dan nomor dipasang tepat sebelum memotret lalu dihapus tepat setelahnya, jadi tidak terbawa ke shot berikutnya.

Berikutnya: [1. Screenshot pertama](../getting-started/first-screenshots.id.md)
