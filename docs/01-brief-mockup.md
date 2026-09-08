# 01 — Brief Mockup

| | |
|---|---|
| **Versi dokumen** | 0.1 — Draf awal |
| **Penyusun** | Iqbal Fauzan Herlambang |
| **Status** | Draf |

> Dokumen ini adalah turunan dari dokumen proyek induk, yang berada di repo terpisah
> **`ews-system`**. Di repo mockup ini, dokumen ini beserta 02–05 adalah acuan yang
> berlaku. **Sumber kebenaran tetap dokumen induk.** Bila ada pertentangan, dokumen
> induk yang benar — laporkan, jangan diam-diam pilih salah satu.

---

## 1. Tujuan

Membangun mockup web semi-interaktif sebagai **materi presentasi kepada calon klien
dan pemilik infrastruktur.**

Sasarannya meyakinkan bahwa produk ini layak dibangun dan layak dibayar. Bukan
membuktikan logikanya benar, dan bukan mengejar kelengkapan fitur.

## 2. Non-tujuan

Dinyatakan eksplisit agar tidak menyeret lingkup:

- **Bukan** aplikasi Django. Tidak ada backend, tidak ada basis data, tidak ada autentikasi.
- **Bukan** implementasi logika ambang batas. Status pada mockup adalah nilai yang
  ditulis di berkas JSON, bukan hasil hitungan.
- **Bukan** tempat data asli. Seluruh isi `data/` adalah karangan.
- **Bukan** produk yang di-deploy ke klien untuk dipakai.

## 3. Audiens

| Peran | Yang dicari saat melihat demo |
|---|---|
| **Pemilik / pengelola** | Apakah saya bisa tahu kondisi aset saya dalam 10 detik |
| **Engineer klien** | Apakah orang ini paham instrumentasi bendungan, atau cuma bikin dashboard cantik |
| **Pengadaan / keuangan** | Apakah ini terlihat seperti produk sungguhan |

Audiens kedua yang paling menentukan. Engineer bendungan akan langsung mengenali
grafik yang polanya mengada-ada, ambang yang tidak masuk akal, atau dashboard yang
seluruhnya hijau. Kredibilitas teknis lebih penting daripada estetika.

## 4. Klasifikasi sistem — mengikat tampilan

**Sistem ini decision support, BUKAN life-safety system.**

Konsekuensi yang wajib tercermin di mockup:

- Tidak boleh ada klaim bahwa sistem menjamin keselamatan, menggantikan RTD, atau
  memicu evakuasi.
- Tidak boleh ada kata "peringatan dini ke masyarakat", "evakuasi otomatis", "sirene",
  "24/7 terjamin", "real-time monitoring keselamatan".
- Setiap halaman yang menampilkan status peringatan memuat catatan pada Bagian 5.
- Bila nanti muncul pertanyaan klien soal sirene: itu antarmuka pemicu ke sistem
  terpisah, bukan pemindahan tanggung jawab.

## 5. Catatan wajib

Teks ini muncul di setiap halaman yang menampilkan status, di tempat yang terbaca —
bukan tempelan kecil di footer:

> Sistem ini adalah alat bantu pengambilan keputusan. Penilaian akhir kondisi keamanan
> bendungan berada pada pengelola bendungan bersertifikat dan tidak menggantikan
> prosedur pemantauan manual maupun Rencana Tindak Darurat yang berlaku.

## 6. Lingkup halaman

Mengikuti pembagian modul dokumen induk `01-project-overview.md` Bagian 6.

### Modul primer

| Halaman | Modul | Kedalaman |
|---|---|---|
| `instrumentasi.html` | Instrumentation Monitoring | **Paling dalam.** Inti MVP dan inti nilai jual |
| `index.html` | Dam Surveillance | Dalam. Kesan pertama |
| `risiko.html` | Risk Analysis | Sedang. Register PFM statis + peta genangan |

### Modul sekunder

| Halaman | Modul | Kedalaman |
|---|---|---|
| `konstruksi.html` | Construction Histories | Dangkal |
| `op.html` | Operational & Maintenance | Dangkal |
| `laporan.html` | Reporting | Dangkal |

**Prinsip pemenggalan:** modul sekunder sengaja dangkal. Di dokumen induk statusnya
sudah dikunci sebagai mockup — halaman bernavigasi tanpa logika, cukup untuk
mendemokan visi produk. Jangan diperdalam tanpa diminta.

## 7. Yang harus disiapkan user sebelum generate

Claude Code tidak boleh menebak enam hal ini. Bila belum ada, tanyakan.

| # | Kebutuhan | Catatan |
|---|---|---|
| 1 | **Nama produk** | Di dokumen induk masih `[NAMA PRODUK]`. Header mockup butuh nama |
| 2 | **Bendungan fiktif** | Nama karangan, tipe, tinggi, elevasi puncak, sungai, koordinat kasar |
| 3 | **Inventaris instrumen** | Jumlah per jenis. Harus realistis — 3 piezometer terlihat mainan |
| 4 | **Angka ambang sementara** | Tidak perlu benar, perlu masuk akal |
| 5 | **Gambar peta genangan** | PNG untuk overlay di `risiko.html`, atau placeholder |
| 6 | **Logo** | Logo konsultan + slot kosong logo klien |

## 8. Risiko mockup

| Risiko | Mitigasi |
|---|---|
| Klien mengira mockup adalah produk jadi | Label "Pratinjau produk · data contoh" permanen di header |
| Dashboard seluruhnya hijau → terlihat menipu | Wajib ada `insufficient_data` dan `stale` di data dummy |
| Data karangan tidak masuk akal → kredibilitas hilang di depan engineer | Pola data mengikuti `03-skema-data-dummy.md` Bagian 4 |
| Mockup jadi barang buangan | Stack disamakan dengan proyek induk, markup dapat dipindah ke `frontend/templates/` |
| Data asli bocor lewat repo mockup | `data/` hanya berisi karangan. Tidak ada pengecualian |

## 9. Definisi selesai

Mockup siap ditunjukkan ke klien bila seluruh checklist di `CLAUDE.md` Bagian 8 lolos.
