# 03 — Skema Data Dummy

| | |
|---|---|
| **Versi dokumen** | 0.1 — Draf awal |
| **Status** | Draf |

> Skema ini adalah **penyederhanaan tampilan** dari model data induk
> (`../docs/03-model-data.md`). Struktur entitas dipertahankan agar markup mockup dapat
> dipindah ke proyek utama; kolom yang tidak berdampak pada tampilan dibuang.

---

## 1. Aturan mutlak

**1.1 Semua angka dibaca dari `data/*.json` lewat `fetch()`. Nol angka hardcode di HTML.**
User akan mengganti isi JSON dengan data karangan yang lebih realistis, dan itu harus
bisa dilakukan tanpa menyentuh tampilan.

**1.2 Seluruh isi `data/` adalah karangan.** Tidak ada data bendungan asli di folder ini,
tanpa pengecualian.

**1.3 Timestamp ditulis UTC dengan sufiks `Z`. Konversi ke WIB hanya di lapisan tampilan.**
Ini melatih pola yang benar sejak awal dan mencegah bug senyap saat markup dipindah.

**1.4 Ambang batas menempel di kanal, bukan di instrumen.** Konsekuensi dari entitas
`channel`. Kalau ambang ditaruh di `instrumen.json`, patok geser dan inklinometer tidak
akan tertampung.

**1.5 Bacaan menyimpan nilai mentah DAN nilai terkonversi.** Nilai mentah adalah sumber
kebenaran. Jangan pernah hanya menyimpan hasil konversi.

---

## 2. Berkas

```
data/
├── bendungan.json      1 aktif + 2 nonaktif (untuk mendemokan multi-aset)
├── instrumen.json      inventaris instrumen
├── kanal.json          deret pengukuran + ambang + status
├── pembacaan.json      time series 30 hari
├── kejadian.json       riwayat transisi level
└── pfm.json            register potential failure mode
```

---

## 3. Struktur

### 3.1 `bendungan.json`

```jsonc
{
  "id": "bdg-01",
  "nama": "[NAMA KARANGAN]",
  "sungai": "",
  "pengelola": "",
  "tipe": "urugan_zonal",        // urugan_homogen | urugan_zonal | beton_gravity | rcc
  "lat": 0.0, "lon": 0.0,
  "tinggi_m": 0,
  "elevasi_puncak_mdpl": 0,
  "tma_sekarang_mdpl": 0,
  "tma_diperbarui": "2026-09-06T23:00:00Z",
  "tma_historis_min": 0,          // untuk mendeteksi kondisi di luar rentang
  "tma_historis_max": 0,
  "aktif": true
}
```

`tma_historis_min` dan `tma_historis_max` ada supaya mockup bisa mendemokan peringatan
"TMA di luar rentang historis" tanpa menghitung apa pun.

### 3.2 `instrumen.json`

```jsonc
{
  "id": "P-03",
  "id_bendungan": "bdg-01",
  "jenis": "piezometer_vw",       // piezometer_vw | patok_geser | inklinometer
                                  // v_notch | tma | arr | termometer
  "lokasi": "Hulu STA 0+250, El. 88.50",
  "zona": "inti",                 // inti | filter | hilir | fondasi | tumpuan
  "lat": 0.0, "lon": 0.0,
  "interval_jadwal_hari": 1,
  "status_alat": "aktif",         // aktif | rusak | kalibrasi
  "dibaca_terakhir": "2026-09-06T23:00:00Z",
  "indikator_pfm": ["PFM-02"],
  "relevansi_pfm": "primary"      // primary | secondary | null
}
```

### 3.3 `kanal.json`

```jsonc
{
  "id": "P-03-head",
  "id_instrumen": "P-03",
  "nama": "Tinggi tekan",
  "tipe": "scalar",               // scalar | vector3 | profile
  "satuan": "m",
  "aturan_utama": "R-2",          // R-1 | R-2 | R-3 | R-4
  "ambang": { "waspada": 0, "siaga": 0, "awas": 0 },
  "envelope": {
    "tersedia": true,
    "median_pada_tma_sekarang": 0,
    "sigma": 0,
    "z_sekarang": 0
  },
  "status": "normal",             // lihat 04-status-dan-tampilan.md
  "alasan_status": ""             // wajib diisi bila status bukan normal
}
```

Untuk `vector3`, buat tiga kanal terpisah (`PG-08-dx`, `PG-08-dy`, `PG-08-dz`).
Untuk `profile`, `ambang` berlaku per kedalaman — pada mockup cukup satu ambang global
dan catatan bahwa versi produksi menetapkannya per kedalaman.

### 3.4 `pembacaan.json`

```jsonc
{
  "id_kanal": "P-03-head",
  "waktu": "2026-09-06T23:00:00Z",
  "nilai_mentah": 0,
  "nilai_terkonversi": 0,
  "quality": "good",              // good | estimated | unverified | suspect | bad
  "petugas": "Nama Petugas"
}
```

Untuk kanal `profile`, `nilai_terkonversi` berupa larik `[{kedalaman_m, nilai}]`.

### 3.5 `kejadian.json`

```jsonc
{
  "waktu": "2026-08-21T02:00:00Z",
  "id_instrumen": "P-03",
  "id_kanal": "P-03-head",
  "dari": "waspada", "ke": "siaga",
  "aturan": "R-2",
  "nilai_teramati": 0,
  "nilai_harapan": 0,
  "simpangan_z": 0,
  "provisional": false,           // true bila bacaan pemicu berstatus unverified
  "tindak_lanjut": "Inspeksi lapangan 22 Agustus, dilanjutkan pemantauan harian"
}
```

### 3.6 `pfm.json`

```jsonc
{
  "id": "PFM-02",
  "nama": "Erosi buluh pada kontak fondasi",
  "lokasi": "",
  "tingkat_kepercayaan": "sedang",
  "instrumen_indikator": ["P-03", "P-07", "VN-02"],
  "ringkasan_rtd": ""
}
```

---

## 4. Aturan pembangkitan angka

Engineer bendungan akan langsung mengenali grafik yang polanya mengada-ada. Ini bagian
yang paling menentukan kredibilitas demo.

**4.1 TMA sebagai penggerak.** Bangkitkan deret TMA lebih dulu — pola musiman dengan
kenaikan bertahap dan sedikit derau. Seluruh instrumen lain diturunkan darinya.

**4.2 Piezometer mengikuti TMA dengan tundaan.** Respons piezometer terhadap perubahan
TMA tidak seketika. Beri tundaan 1–7 hari yang berbeda-beda antar instrumen: makin
dekat ke hulu makin cepat responsnya.

**4.3 Rembesan V-notch naik mengikuti TMA,** hubungannya tidak linear.

**4.4 Patok geser bergerak sangat lambat.** Deformasi kumulatif dalam orde milimeter per
bulan, dengan derau pengukuran yang relatif besar terhadap sinyalnya.

**4.5 Derau proporsional, bukan seragam.** Jangan pakai angka acak seragam untuk semua
instrumen.

**4.6 Sisipkan cerita, bukan hanya angka.** Demo yang bagus punya satu narasi teknis
yang bisa diceritakan ke klien:

- Satu piezometer (mis. `P-03`) menyimpang perlahan dari envelope-nya selama ~60 hari
  hingga mencapai `siaga` — pola khas erosi buluh yang berkembang, yang tidak akan
  tertangkap ambang absolut. Ini demo paling kuat yang bisa Anda tunjukkan.
- Satu instrumen dengan bacaan `suspect` akibat lompatan nilai (salah ketik petugas).
- Satu instrumen `stale` karena tidak dibaca sejak lama.
- Dua instrumen `insufficient_data` — satu karena data historis kurang, satu karena
  TMA di luar rentang historis.

**4.7 Rentang waktu 30 hari** untuk `pembacaan.json`, kecuali instrumen pembawa narasi
4.6 yang perlu 90 hari agar tren lambatnya terlihat.

---

## 5. Komposisi inventaris yang wajar

Angka acuan untuk bendungan urugan sedang. Sesuaikan bila user menetapkan lain.

| Jenis | Jumlah | Kanal |
|---|---|---|
| Piezometer VW | 20–30 | 1 per instrumen |
| Patok geser | 15–20 | 3 per instrumen |
| Inklinometer | 2–4 | 1 profil per instrumen |
| V-notch | 3–5 | 1 per instrumen |
| Duga air (TMA) | 1 | 1 |
| ARR (curah hujan) | 1 | 1 |

Jumlah harus realistis. Demo dengan 3 piezometer terlihat seperti mainan; dengan 200
terlihat mengada-ada.

---

## 6. Sebaran status yang wajib ada

Dashboard yang seluruhnya hijau adalah demo yang menipu diri sendiri. Data dummy wajib
memuat sekurang-kurangnya:

| Status | Minimum |
|---|---|
| `siaga` | 1 instrumen |
| `waspada` | 3 instrumen |
| `insufficient_data` | 2 instrumen |
| `stale` | 2 instrumen |
| quality `suspect` | 1 bacaan |
| quality `unverified` (provisional) | 1 bacaan |

`awas` **tidak** dimunculkan sebagai kondisi aktif. Demo yang menampilkan bendungan
dalam kondisi Awas mengundang pertanyaan yang tidak ingin Anda jawab di ruang rapat.
Cukup tampilkan level Awas di legenda dan di riwayat kejadian yang sudah selesai.
