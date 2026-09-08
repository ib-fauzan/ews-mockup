# 02 — Halaman dan Komponen

| | |
|---|---|
| **Versi dokumen** | 0.1 — Draf awal |
| **Status** | Draf |

Spesifikasi isi tiap halaman. Tata letak bebas diputuskan; **isi dan aturan tampilan
tidak.**

---

## 1. Kerangka bersama

Dipakai semua halaman, dibangun lebih dulu sebelum halaman mana pun.

### 1.1 Header

| Elemen | Isi |
|---|---|
| Kiri | Logo konsultan + nama produk |
| Tengah | Pemilih bendungan (dropdown) — pada mockup isinya satu bendungan aktif + dua nonaktif |
| Kanan | Slot logo klien, lalu nama pengguna demo dan perannya |
| Pita atas | Label permanen: **PRATINJAU PRODUK · data contoh, bukan data bendungan sungguhan** |

Pita label mockup tidak boleh bisa ditutup. Ini melindungi Anda kalau tangkapan layar
demo beredar tanpa konteks.

### 1.2 Sidebar

Enam entri sesuai `01-brief-mockup.md` Bagian 6, dengan pemisah antara modul primer
dan sekunder. Entri modul sekunder diberi penanda halus bahwa isinya masih ringkas.

### 1.3 Catatan decision support

Komponen tersendiri di `assets/nav.js`, di-inject ke `index.html`,
`instrumentasi.html`, dan `risiko.html`. Teks persis mengikuti
`01-brief-mockup.md` Bagian 5.

---

## 2. `index.html` — Dam Surveillance

Halaman ringkasan. Pertanyaan yang harus terjawab dalam 10 detik: **kondisi bendungan
saya sekarang bagaimana, dan apa yang perlu saya lihat.**

### Komponen

**2.1 Kartu ringkasan status aset**

Menampilkan level tertinggi **disertai cacahan dan nama instrumennya.** Tidak pernah
warna telanjang.

```
SIAGA — 1 instrumen (P-03)
Waspada — 3 instrumen (P-07, P-11, VN-02)
Normal — 34 instrumen
Data tidak cukup — 2 instrumen (P-19, INK-02)
Basi — 2 instrumen (PG-08, PG-12)
```

Aturan tampilan ini setara pentingnya dengan matematikanya. Satu instrumen bermasalah
tidak boleh membuat seluruh bendungan tampak merah — pengguna akan belajar
mengabaikannya.

**2.2 Panel TMA**

TMA sekarang (mdpl), elevasi puncak, tinggi jagaan, waktu pembacaan terakhir berlabel
WIB. Grafik sparkline 30 hari.

Bila TMA di luar rentang historis, tampilkan peringatan eksplisit:

> TMA di luar rentang data historis. Penilaian envelope tidak berlaku. Kembali ke
> penilaian ambang absolut dan pengamatan langsung.

**2.3 Peta instrumen**

MapLibre. Penanda berwarna sesuai status kanal tertinggi tiap instrumen. Klik penanda
→ popup ringkas → tautan ke `instrumentasi.html` untuk instrumen itu.

**2.4 Daftar kejadian terakhir**

Transisi level 30 hari terakhir. Kolom: waktu (WIB), instrumen, transisi, aturan yang
terpicu, status tindak lanjut. Sertakan minimal satu baris berlabel **provisional**
(bacaan `unverified`).

**2.5 Instrumen perlu perhatian**

Tabel pendek: instrumen berstatus di atas normal, `insufficient_data`, atau `stale`,
diurutkan berdasarkan tingkat kepentingan. Instrumen yang berperan sebagai indikator
utama PFM ditampilkan lebih menonjol.

---

## 3. `instrumentasi.html` — Instrumentation Monitoring

**Halaman terpenting.** Ini yang membedakan produk ini dari dashboard time-series biasa.

### Komponen

**3.1 Daftar instrumen**

Panel kiri. Dapat difilter menurut jenis, status, dan zona bendungan. Setiap baris
menampilkan kode instrumen, jenis, status, dan waktu bacaan terakhir.

**3.2 Panel detail instrumen**

Isinya bergantung pada tipe kanal. **Tiga tipe harus tampil berbeda** — ini konsekuensi
langsung dari entitas `channel` di model data induk:

| Tipe kanal | Instrumen | Tampilan |
|---|---|---|
| `scalar` | Piezometer VW, V-notch, TMA, ARR | Satu grafik time-series |
| `vector3` | Patok geser | Tiga kanal (dX, dY, dZ) — tiga deret dalam satu grafik, atau tiga panel bertumpuk |
| `profile` | Inklinometer | Grafik nilai terhadap **kedalaman**, dengan pemilih tanggal atau beberapa tanggal ditumpuk |

Mockup wajib menampilkan minimal satu contoh tiap tipe. Kalau tabel memaksa satu baris
satu angka per instrumen, desainnya akan bertabrakan dengan model data dan harus
dibongkar ulang.

**3.3 Grafik utama**

ECharts. Wajib memuat:

- Deret nilai terkonversi
- **Overlay TMA pada sumbu-y kedua** — ini yang membuat grafik bermakna secara teknis
- Pita envelope (rentang normal) sebagai area berbayang
- Penanda titik yang berstatus di atas normal
- Titik `suspect` dan `bad` ditampilkan berbeda, tidak disembunyikan diam-diam

**3.4 Panel penjelasan**

Setiap penilaian harus bisa dijelaskan. Saat instrumen berstatus di atas normal,
tampilkan: nilai teramati, nilai yang diharapkan, besar simpangan, aturan mana yang
terpicu, dan dasar penetapan ambangnya.

Tanpa panel ini, mockup hanya terlihat seperti dashboard biasa. Dengan panel ini,
terlihat seperti alat rekayasa.

**3.5 Panel scatter nilai vs TMA**

Sebaran historis instrumen terhadap TMA, dengan garis median dan pita envelope, serta
titik bacaan terakhir disorot. Ini visual paling meyakinkan bagi engineer klien —
sekali lihat, konsep envelope korelasi langsung tertangkap.

**3.6 Tabel bacaan**

Kolom: waktu (WIB), nilai mentah, nilai terkonversi, quality flag, petugas. Nilai
mentah dan terkonversi **keduanya ditampilkan** — nilai mentah adalah sumber kebenaran.

---

## 4. `risiko.html` — Risk Analysis

### Komponen

**4.1 Register PFM**

Tabel statis: kode PFM, deskripsi mekanisme, lokasi, instrumen indikator, tingkat
kepercayaan. Kolom instrumen indikator tertaut ke `instrumentasi.html`.

**4.2 Peta genangan**

MapLibre dengan overlay hasil dambreak pra-hitung sebagai image layer. Sertakan
keterangan bahwa pemodelan dikerjakan di luar sistem dan yang ditampilkan adalah hasil
pra-hitung.

**Jangan** menulis apa pun yang menyiratkan sistem menghitung genangan secara langsung
atau memicu evakuasi.

**4.3 Ringkasan RTD**

Tampilan ringkas tingkat kesiapsiagaan dan rute evakuasi. Statis. Tegaskan bahwa RTD
yang berlaku adalah dokumen resmi, bukan tampilan ini.

---

## 5. Halaman modul sekunder

Tiga halaman berikut sengaja dangkal. Struktur, judul, tabel kosong atau berisi sedikit
baris contoh, tanpa logika.

| Halaman | Isi minimal |
|---|---|
| `konstruksi.html` | Linimasa konstruksi, daftar dokumen, gambar zonasi bendungan, tabel data teknis final |
| `op.html` | Daftar laporan survei operator, jadwal pemeliharaan, tabel status pintu |
| `laporan.html` | Daftar laporan berkala dengan tombol unduh nonaktif, pratinjau satu laporan contoh |

---

## 6. Komponen bersama yang dipakai ulang

| Komponen | Tempat | Dipakai di |
|---|---|---|
| Lencana status | `assets/status.js` | Semua halaman |
| Kartu ringkasan aset | `assets/nav.js` | `index.html` |
| Catatan decision support | `assets/nav.js` | index, instrumentasi, risiko |
| Pemformat waktu WIB | `assets/status.js` | Semua halaman |
| Lencana quality flag | `assets/status.js` | instrumentasi |

Pemetaan status ke warna dan label **hanya boleh ada di `assets/status.js`.** Kalau
ditulis langsung di enam halaman, satu perubahan berarti enam suntingan dan pasti ada
yang terlewat.
