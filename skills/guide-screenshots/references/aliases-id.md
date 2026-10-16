# Indonesian key aliases / Alias kunci bahasa Indonesia

English keys are primary. These Indonesian keys are accepted too and may be mixed. Example: `test/config.test.id.json` in the repo.

Kunci utama berbahasa Inggris. Kunci bahasa Indonesia di bawah tetap diterima dan boleh dicampur.

| Indonesia | English | Arti |
|---|---|---|
| `panduan`: `versi`, `tanggal`, `versiAplikasi` | `guide`: `version`, `date`, `appVersion` | versi dokumen panduan |
| `awal` | `init` | kode pembantu untuk langkah `js`, dijalankan di setiap halaman |
| `varian`: `akhiran`, `langkah`, `tema` | `variants`: `suffix`, `steps`, `theme` | potret semua shot per bahasa atau tema |
| `nomorGambar` | `captionNumber` | pola nomor gambar, mis. `"Gambar {chapter}.{n}"` |
| `bab` | `chapter` | bab untuk `{chapter}`, berlaku sampai bab berikutnya |
| `lewatiNomor` | `skipNumbers` | kosongkan nomor untuk gambar non-GuShot (diagram) |
| `perangkat` | `device` | tiru HP atau tablet (ukuran, user agent, sentuhan) |
| `bekukanWaktu` | `freezeTime` | jam halaman mulai dari waktu ini |
| `bahasa` | `lang` | bahasa pesan terminal |
| `ingatLogin` | `keepLogin` | simpan login antar-run (menit) |
| `skala` | `scale` | kerapatan piksel (`2` = tajam untuk cetak/PDF) |
| `keluar` | `out` | folder hasil |
| `blurSelalu` | `alwaysBlur` | selector yang selalu dikaburkan |
| `kekuatanBlur` | `blurStrength` | radius blur (px) |
| `warnaSorot` | `highlightColor` | warna kotak sorot |
| `tema` | `theme` | `light` / `dark` |
| `jeda` | `delay` | ms tambahan sebelum memotret |
| `sesi` | `sessions` (root) / `session` (shot) | langkah login per peran / sesi yang dipakai shot |
| `nama` | `name` | nama file |
| `langkah` | `steps` | aksi sebelum memotret |
| `elemen` | `element` | potret satu elemen saja |
| `penuh` | `fullPage` | seluruh halaman |
| `jarak` | `padding` | ruang di sekitar `element` (px) |
| `sembunyikan` | `hide` | selector yang disembunyikan |
| `sorot` | `highlight` | beri kotak merah |
| `keterangan` | `caption` | keterangan gambar (dipakai `--md`) |
| `gantiTeks` | `replaceText` | ganti teks asli dengan contoh di halaman |
| `sesiBaru` | `freshSession` | buka ulang sesi di konteks browser baru dulu |
| `buka` | `open` | buka halaman |
| `ketik` + `teks` | `type` + `text` | ketik ke input |
| `klik` | `click` | klik selector |
| `klikTeks` + `di` | `clickText` + `within` | klik berdasarkan teks |
| `pilih` + `nilai` | `select` + `value` | pilih dropdown (nilai atau awal teks opsi; termasuk Select2) |
| `isi` | `fill` | isi kolom berdasarkan teks label |
| `tekan` | `press` | tekan tombol keyboard |
| `tunggu` + `batas` | `wait` + `timeout` | tunggu ms atau selector |
| `tungguTeks` | `waitText` | tunggu teks muncul |
| `gulirKe` | `scrollTo` | gulir ke elemen |
| `perintah` | `run` | jalankan perintah shell |
| `otp`: `pola`, `ke`, `kirim`, `coba` | `otp`: `pattern`, `into`, `submit`, `tries` | isi OTP dari file |
| `highlight`: `catatan` | `highlight`: `note` | teks keterangan di samping kotak sorot |
| `highlight`: `teks` | `highlight`: `text` | teks langkah untuk `--md` saja, tidak digambar |
