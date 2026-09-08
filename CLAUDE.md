# Mockup EWS Bendungan — Panduan Kerja untuk Claude Code

Mockup web semi-interaktif sebagai materi presentasi ke calon klien / pemilik
infrastruktur. **Bukan aplikasi Django, bukan produk, bukan tempat data asli.**

Folder ini berdiri sendiri sebagai repo tersendiri, dan `docs/` di dalamnya adalah acuan
yang berlaku. Dokumen induk berada di repo terpisah **`ews-system`** dan tidak dapat
dijangkau dari sini — bila ada pertentangan, dokumen induk yang benar; laporkan, jangan
diam-diam pilih salah satu.

---

## Baca dulu sebelum bekerja

| Berkas | Isi |
|---|---|
| `docs/01-brief-mockup.md` | Tujuan, non-tujuan, audiens, lingkup halaman, yang harus disiapkan user |
| `docs/02-halaman-komponen.md` | Spesifikasi isi tiap halaman dan komponen bersama |
| `docs/03-skema-data-dummy.md` | Struktur JSON dan aturan pembangkitan angka |
| `docs/04-status-dan-tampilan.md` | Tujuh status, quality flag, aturan agregasi tampilan |
| `docs/05-stack-frontend.md` | Stack, konvensi kode, jalur pemindahan ke proyek utama |
| `STATUS.md` | **Baca lebih dulu.** Sudah sampai mana, keputusan yang sudah diambil user, utang yang belum lunas, dan jebakan yang sudah pernah memakan waktu |

**Dokumen adalah sumber kebenaran, bukan kode.** `STATUS.md` bukan spesifikasi —
ia merekam keadaan; bila bertentangan dengan `docs/`, `docs/` yang benar.

---

## Batasan yang tidak boleh dilanggar

**Sistem ini decision support, BUKAN life-safety system.**

- Jangan pernah menulis teks yang menyiratkan sistem menjamin keselamatan, menggantikan
  RTD, atau memicu evakuasi. Tidak ada "peringatan dini ke masyarakat", "evakuasi
  otomatis", "sirene", "24/7 terjamin".
- Setiap halaman berstatus memuat catatan decision support (`docs/01` Bagian 5), di
  tempat yang terbaca.
- Pita **PRATINJAU PRODUK · data contoh, bukan data bendungan sungguhan** permanen
  di header, tidak bisa ditutup.

**Aturan data — pelanggaran atas ini adalah bug serius, bukan preferensi gaya:**

1. Semua angka dibaca dari `data/*.json` lewat `fetch()`. **Nol angka hardcode di HTML.**
2. Seluruh isi `data/` adalah karangan. **Tidak ada data bendungan asli**, tanpa pengecualian.
   Alurnya dua tahap: `tools/parameter.py` membaca `data-asli/*.xlsx` hanya untuk
   menaksir belasan angka agregat, lalu `tools/buat_data.py` membangkitkan seluruh
   deret baru dari angka itu. **Menyalin bacaan asli lalu menggesernya tidak
   memenuhi syarat ini** — selisih dan korelasinya tetap milik bendungan aslinya.
3. Timestamp UTC di JSON, konversi ke WIB hanya di lapisan tampilan. Setiap waktu yang
   tampil wajib berlabel zona waktu.
4. Bacaan menyimpan **nilai mentah DAN nilai terkonversi**. Nilai mentah sumber kebenaran.
5. **Ambang menempel di kanal, bukan di instrumen.** Patok geser punya 3 kanal;
   inklinometer menghasilkan profil terhadap kedalaman, bukan satu angka.
6. **Jangan pernah menampilkan hijau untuk sesuatu yang tidak diketahui.**
   `insufficient_data` dan `stale` adalah status tersendiri, bukan varian normal.
7. Status tingkat aset **tidak pernah warna telanjang** — selalu disertai cacahan dan
   nama instrumennya.
8. Data buruk (`suspect`, `bad`) ditampilkan dengan penanda berbeda, tidak disembunyikan.

---

## Stack

Tailwind + Alpine.js + Apache ECharts + MapLibre GL JS, semuanya lewat CDN.
Tanpa npm, tanpa build step. Detail dan larangan pustaka di `docs/05`.

Pemetaan status → warna dan label **hanya ada di `assets/status.js`.**

---

## Urutan pengerjaan

| Urutan | Pekerjaan | Kedalaman | Keadaan |
|---|---|---|---|
| 1 | Kerangka: `assets/*.js`, `style.css`, enam HTML bernavigasi, catatan decision support terpasang | — | Selesai |
| 2 | `data/*.json` lengkap sesuai `docs/03` | — | Selesai |
| 3 | `instrumentasi.html` | **Paling dalam** — inti MVP dan inti nilai jual | Selesai |
| 4 | `index.html` | Dalam — kesan pertama klien | Selesai |
| 5 | `risiko.html` | Sedang | **Berikutnya** |
| 6 | `konstruksi.html`, `op.html`, `laporan.html` | Dangkal — sudah dikunci sebagai mockup | Belum |

Tiga halaman terakhir memang sengaja dangkal. Jangan diperdalam tanpa diminta.

---

## Menjalankan dan memeriksa

```bash
python tools/serve.py          # http://localhost:8080/index.html
python tools/buat_data.py      # bangkitkan ulang data/*.json
```

Pakai `tools/serve.py`, bukan `python -m http.server` — yang bawaan tidak mengirim
`Cache-Control`, jadi perubahan pada `assets/*.js` tidak terlihat sampai muat ulang paksa.

**Buka halaman di peramban sebelum melapor selesai.** Empat bug pernah lolos dari
pemeriksaan Node dan hanya terlihat di layar; yang terburuk membuat seluruh dasbor
diam di "Memuat data" **tanpa satu pun galat konsol**. Rinciannya di `STATUS.md`
Bagian 5.2.

---

## Cara bekerja denganku

**Gunakan plan mode untuk halaman besar.** Tunjukkan rencana dan daftar berkas yang akan
disentuh sebelum menulis kode.

**Satu halaman per sesi.** Minta enam halaman sekaligus menghasilkan enam halaman
dangkal. Selesaikan satu, tunjukkan, baru lanjut.

**Commit kecil per unit logis.** Satu halaman selesai, satu commit.

**Jangan melebar dari yang diminta.** Kalau melihat perbaikan lain yang layak, sebutkan
di akhir, jangan langsung dikerjakan.

**Kalau ragu soal domain, tanya.** Perilaku piezometer, penetapan ambang, tafsir data
instrumentasi — ini keputusan rekayasa yang diambil user, bukan diusulkan sepihak lalu
diimplementasikan.

### Boleh diputuskan sendiri
Tata letak, penamaan kelas dan fungsi, struktur komponen, pemilihan ikon, jenis grafik
ECharts, warna di luar palet status, isi teks dummy non-teknis.

### Harus ditanya dulu
Angka ambang batas, satuan, jenis instrumen di luar daftar `docs/03` Bagian 5, perubahan
palet status, penambahan halaman, penambahan pustaka di luar `docs/05`, apa pun yang
menyiratkan klaim kemampuan sistem.

---

## Istilah domain

| Istilah | Arti |
|---|---|
| **TMA** | Tinggi Muka Air waduk. Variabel bebas untuk hampir semua analisis korelasi |
| **PFM** | Potential Failure Mode |
| **RTD** | Rencana Tindak Darurat |
| **Piezometer VW** | Vibrating wire. Butuh koreksi suhu dan barometrik |
| **Patok geser** | Titik survei deformasi permukaan. 3 kanal: dX, dY, dZ |
| **Inklinometer** | Deformasi lateral. Menghasilkan **profil terhadap kedalaman** |
| **V-notch** | Ambang ukur debit rembesan |
| **Envelope** | Rentang perilaku normal instrumen pada kondisi TMA tertentu |
| **Kanal** | Satu deret pengukuran dari sebuah instrumen. Ambang menempel di sini |
| **Quality flag** | Penanda keandalan sebuah pembacaan |
| **Tingkat peringatan** | Normal → Waspada → Siaga → Awas |

---

## Kesalahan yang mudah terjadi di folder ini

- Menganggap semua instrumen menghasilkan satu angka. Tidak — ada `scalar`, `vector3`,
  dan `profile`. Karena itu ada entitas kanal.
- Menulis angka langsung di HTML karena "cuma mockup". Ini yang paling sering terjadi
  dan paling mahal diperbaiki.
- Membuat dashboard yang seluruhnya hijau. Demo yang menipu diri sendiri.
- Menampilkan status aset sebagai warna tunggal tanpa cacahan.
- Memakai Chart.js atau Leaflet karena lebih ringkas. Hasilnya tidak bisa dipindah ke
  proyek utama.
- Menyembunyikan bacaan `suspect` supaya grafik terlihat rapi.
- Mendemokan kondisi `awas` aktif. Mengundang pertanyaan yang tidak ingin dijawab di
  ruang rapat.
- Memperdalam halaman modul sekunder tanpa diminta.

---

## Checklist sebelum ditunjukkan ke klien

Diperiksa 8 September 2026. Yang tercentang sudah diverifikasi terhadap kode dan
data, bukan diasumsikan.

- [x] Enam halaman saling terhubung, tidak ada tautan mati
- [x] Catatan decision support terbaca di index, instrumentasi, risiko
- [x] Pita label tampil di semua halaman
- [x] `insufficient_data` dan `stale` terlihat nyata di dashboard
- [x] Ada minimal satu kanal `vector3` dan satu `profile` yang tampil benar
- [x] Semua angka dari `data/*.json`, nol angka hardcode
- [x] Grafik utama punya overlay TMA pada sumbu-y kedua
- [x] Panel scatter nilai vs TMA berfungsi
- [x] Panel penjelasan muncul untuk instrumen di atas normal
- [x] Ada satu instrumen pembawa narasi penyimpangan lambat — P-03, siaga
- [x] Semua waktu berlabel WIB
- [x] Nol kalimat berklaim life-safety
- [x] Slot logo klien ada di header
- [x] Dibuka di 1366×768 tanpa scroll horizontal

Belum lolos, dan sengaja dicatat terbuka:

- [ ] `risiko.html` masih kerangka — catatan decision support sudah terpasang,
      tetapi ketiga komponennya belum diisi
- [ ] Pemilih bendungan di header masih `[BENDUNGAN A]`, padahal data sudah
      menyebut Bendungan Sedayu (`STATUS.md` Bagian 6.1)
- [ ] Lencana quality `bad` tidak pernah tampil karena datanya tidak ada
