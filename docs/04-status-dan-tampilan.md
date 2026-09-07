# 04 — Status dan Aturan Tampilan

| | |
|---|---|
| **Versi dokumen** | 0.1 — Draf awal |
| **Status** | Draf |

> Turunan tampilan dari dokumen `04-threshold-logic.md` (berada di repo terpisah
> `ews-system`). Mockup **tidak menghitung**
> status — status dibaca dari `kanal.json`. Yang diatur di sini adalah bagaimana status
> itu ditampilkan.

---

## 1. Prinsip yang mengikat tampilan

**P-1. Tidak tahu bukan berarti normal.** Menampilkan hijau untuk sesuatu yang tidak
diketahui adalah kegagalan paling berbahaya dalam sistem seperti ini. Berlaku penuh di
mockup.

**P-2. Setiap penilaian harus bisa dijelaskan.** Bila status di atas normal, tampilan
wajib menunjukkan nilai teramati, nilai harapan, besar simpangan, dan aturan yang
terpicu.

**P-3. Tidak pernah warna telanjang.** Status tingkat aset selalu disertai cacahan dan
nama instrumennya.

**P-4. Data buruk ditampilkan, bukan disembunyikan.** Bacaan `suspect` dan `bad` tetap
terlihat di grafik dan tabel dengan penanda berbeda.

---

## 2. Daftar status kanal

Tujuh keadaan. Mockup wajib memperlihatkan semuanya, bukan hanya empat yang bagus.

| Status | Label tampilan | Warna | Kapan |
|---|---|---|---|
| `normal` | Normal | Hijau | Bacaan ada dan di dalam envelope |
| `waspada` | Waspada | Kuning | |
| `siaga` | Siaga | Oranye | |
| `awas` | Awas | Merah | |
| `insufficient_data` | Data tidak cukup | Abu-abu polos | Data historis kurang, atau TMA di luar rentang historis |
| `stale` | Basi | Abu-abu bergaris | Umur bacaan > 2× interval jadwal |
| `stale_kritis` | Basi kritis | Abu-abu bergaris tebal | Umur bacaan > 4× interval jadwal |

**Abu-abu harus jelas berbeda dari hijau**, termasuk bagi pengguna dengan gangguan
pembedaan warna. Bedakan juga dengan pola atau ikon, jangan hanya warna.

`stale` dan `insufficient_data` bukan varian dari normal. Keduanya adalah pernyataan
bahwa sistem tidak tahu, dan itu informasi yang bernilai.

---

## 3. Alasan status — wajib

Setiap kanal berstatus bukan `normal` harus punya `alasan_status` terisi. Tampilkan
alasannya, bukan hanya labelnya.

| Status | Contoh alasan yang ditampilkan |
|---|---|
| `insufficient_data` | "TMA 96,2 mdpl berada di atas maksimum historis 94,8 mdpl. Penilaian envelope tidak berlaku." |
| `insufficient_data` | "Jumlah sampel historis pada rentang TMA ini di bawah minimum." |
| `stale` | "Terakhir dibaca 9 hari lalu. Jadwal harian." |
| `waspada` | "Simpangan 2,8σ dari envelope korelasi TMA (R-2)." |

Untuk TMA di luar rentang historis, tampilkan peringatan lengkapnya:

> TMA di luar rentang data historis. Penilaian envelope tidak berlaku. Kembali ke
> penilaian ambang absolut dan pengamatan langsung.

---

## 4. Quality flag pada bacaan

| Quality | Label | Tampilan di grafik | Tampilan di tabel |
|---|---|---|---|
| `good` | — | Titik normal | Tanpa lencana |
| `estimated` | Estimasi | Titik kosong | Lencana abu-abu |
| `unverified` | Belum diverifikasi | Titik bertanda | Lencana kuning |
| `suspect` | Meragukan | Titik silang, tidak masuk garis tren | Lencana oranye |
| `bad` | Tidak valid | Titik silang abu-abu | Lencana merah |

**Peringatan yang berasal dari bacaan `unverified` ditandai `provisional`** secara
eksplisit di antarmuka. Ini muncul di daftar kejadian dan di panel penjelasan.

---

## 5. Agregasi tampilan

### 5.1 Kanal → Instrumen

Status instrumen adalah level tertinggi di antara kanal aktifnya.

Untuk inklinometer, satu kedalaman bermasalah menaikkan status seluruh instrumen. Itu
benar — tampilan kemudian menunjukkan kedalaman mana yang memicu.

### 5.2 Instrumen → Aset

**Jangan** mengambil level tertinggi lalu menampilkannya sebagai warna tunggal.

Format wajib:

```
SIAGA — 1 instrumen (P-03)
Waspada — 3 instrumen (P-07, P-11, VN-02)
Normal — 34 instrumen
Data tidak cukup — 2 instrumen (P-19, INK-02)
Basi — 2 instrumen (PG-08, PG-12)
```

Bila daftar instrumen terlalu panjang, tampilkan tiga pertama lalu "+n lainnya".
Cacahan tidak pernah disembunyikan.

### 5.3 Penonjolan indikator PFM

Instrumen dengan `relevansi_pfm: "primary"` ditampilkan lebih menonjol pada level yang
sama, dan diurutkan lebih atas di daftar "perlu perhatian".

Alasannya: piezometer yang menjadi indikator utama erosi buluh pada kontak fondasi
lebih bermakna daripada termometer yang menyimpang pada tingkat yang sama.

---

## 6. Aturan yang berlaku di produksi tapi tidak disimulasikan di mockup

Dicatat agar Claude Code tidak mencoba mengimplementasikannya, dan agar Anda tidak
menjanjikan yang belum ada saat demo.

| Mekanisme | Status di mockup |
|---|---|
| Histeresis dan debounce (`confirm_n`, `release_n`) | Tidak disimulasikan. Status statis dari JSON |
| Penurunan manual untuk `siaga` dan `awas` | Tampilkan sebagai tombol nonaktif dengan keterangan |
| Evaluasi R-1 sampai R-4 | Tidak dihitung. Nama aturan pemicu ditulis di JSON |
| Pemasangan ulang model HST | Tidak ada |
| Notifikasi | Tampilkan riwayat kejadian saja, tanpa pengiriman |

Bila klien bertanya apakah fitur-fitur ini sudah jalan, jawabannya tidak — ini mockup.
Jangan buat tampilan yang menyiratkan sebaliknya.

---

## 7. Palet

Ditetapkan sekali di `assets/status.js`, dipakai semua halaman. Jangan menulis warna
status langsung di HTML mana pun.

Syarat: kontras teks terhadap latar memenuhi WCAG AA, dan tiap status dibedakan juga
oleh ikon atau pola — tidak semata warna. Ruang rapat sering memakai proyektor dengan
reproduksi warna buruk; ini bukan pertimbangan estetika.
