# Status Pengerjaan — Mockup EWS SightBased.id

Catatan serah-terima. `docs/01`–`05` tetap spesifikasi yang mengikat; berkas ini
hanya merekam **keadaan sekarang**, keputusan yang sudah diambil, dan utang yang
belum lunas. Bila berkas ini bertentangan dengan `docs/`, `docs/` yang benar.

Terakhir diperbarui: 8 September 2026.

---

## 1. Sudah sampai mana

Mengikuti urutan pengerjaan di `CLAUDE.md`:

| # | Pekerjaan | Keadaan |
|---|---|---|
| 1 | Kerangka: `assets/*`, enam HTML bernavigasi | **Selesai** |
| 2 | `data/*.json` | **Selesai** — dibangkitkan `tools/buat_data.py` |
| 3 | `instrumentasi.html` | **Selesai** — keenam komponen `docs/02` Bagian 3 |
| 4 | `index.html` | **Selesai** — termasuk denah MapLibre dan penampang |
| 5 | `risiko.html` | **Belum** — masih kerangka placeholder |
| 6 | `konstruksi.html`, `op.html`, `laporan.html` | **Belum** — masih kerangka, dan memang sengaja dangkal |

Isi data saat ini: Bendungan Sedayu, pengelola PT Tirta Nusa Energi, TMA 92,54 mdpl.
49 instrumen, 81 kanal (30 `scalar`, 48 `vector3`, 3 `profile`), 1.612 pembacaan.
Sebaran status: 38 normal, 5 waspada, 1 siaga, 2 data tidak cukup, 2 basi,
1 basi kritis. Nol `awas` aktif — itu disyaratkan `docs/03` Bagian 6.

---

## 2. Cara menjalankan

```bash
python tools/serve.py          # http://localhost:8080/index.html
python tools/buat_data.py      # bangkitkan ulang data/*.json
```

**Pakai `tools/serve.py`, bukan `python -m http.server`.** Server bawaan tidak
mengirim `Cache-Control`, sehingga peramban menyimpan `assets/*.js` dan perubahan
tidak terlihat sampai muat ulang paksa. Ini sudah pernah memakan satu putaran
bolak-balik, dan saat demo ke klien akibatnya lebih buruk: layar bisa menampilkan
label atau angka versi lama tanpa tanda apa pun.

---

## 3. Peta berkas

| Berkas | Isi |
|---|---|
| `assets/status.js` | **Sumber tunggal** palet status, quality flag, pemformat WIB, agregasi |
| `assets/nav.js` | Pita, header, sidebar, catatan decision support. Branding ada di konstanta paling atas |
| `assets/data.js` | Store Alpine: muat JSON, indeks, state halaman instrumentasi, envelope dari sebaran |
| `assets/charts.js` | Pulau ECharts: sparkline, penampang, deret utama, profil kedalaman, sebaran vs TMA |
| `assets/map.js` | Pulau MapLibre: denah situs skematik |
| `tools/parameter.py` | Tahap taksir — baca xlsx, keluarkan parameter agregat saja |
| `tools/buat_data.py` | Tahap bangkitkan — seluruh deret sintetis dari parameter |
| `tools/serve.py` | Server statis tanpa cache |

---

## 4. Keputusan yang sudah diambil user

Jangan diubah tanpa bertanya lagi.

| Hal | Keputusan |
|---|---|
| Nama produk | `SightBased.id`, lambang SVG sebaris di `nav.js` |
| Klien | `PT Tirta Nusa Energi` — **swasta**, sengaja bukan BBWS atau instansi pemerintah |
| Teks pita | `PRATINJAU PRODUK · data contoh, bukan data bendungan sungguhan` |
| Kanal `vector3` | Tiga deret dalam **satu** grafik, bukan tiga panel bertumpuk |
| Peta | Skematik tanpa peta dasar eksternal, supaya tidak bergantung jaringan |
| Ambang | 2,5/3,5/4,5 sigma; patok 8/14/22 mm; inklinometer 12/20/32 mm — milik user |

User pernah **menolak** tiga penambahan field data: kurva envelope per kanal,
`ambang_sigma` di `kanal.json`, dan satu bacaan `bad`. Konsekuensinya ada di
Bagian 6.

---

## 5. Aturan yang paling mudah dilanggar sesi berikutnya

**5.1 Jangan pernah menyalin data asli ke `data/`.** `data-asli/*.xlsx` berisi
data bendungan sungguhan dan sudah di-gitignore. Alurnya dua tahap:
`parameter.py` membaca xlsx **hanya untuk menaksir belasan angka agregat**,
lalu `buat_data.py` membangkitkan seluruh deret baru dari angka itu.

Versi terdahulu menyalin bacaan asli lalu "menyamarkannya" dengan offset elevasi
dan geser tanggal. Itu tidak memenuhi `docs/03` Bagian 1.2 — selisih, korelasi
terhadap TMA, dan seluruh bentuk perilaku tetap milik bendungan aslinya, dan
`data/` ikut ter-commit ke GitHub. Jangan kembali ke sana.

**5.2 Buka di peramban sebelum melapor selesai.** Empat bug lolos dari
pemeriksaan Node dan hanya terlihat di layar:

- Alpine v3 hanya memproses pohon yang berakar `x-data`; tanpa itu seluruh
  `x-if` diabaikan **tanpa galat konsol** dan halaman diam di "Memuat data".
- ECharts pada elemen berlebar nol membuat kanvas 0×0 — instansnya ada,
  grafiknya tidak pernah tergambar.
- Layer `symbol` MapLibre menuntut sumber `glyphs`; gaya tanpa peta dasar tidak
  punya, jadi `text-field` diterima tanpa keluhan lalu tidak menggambar apa pun.
- `stack` ECharts meleset ke dimensi salah pada sumbu bertipe `value`.

Chrome headless cukup: `--headless=new --screenshot=... --window-size=1366,768`.

**5.3 Angka dan warna.** Nol angka data di HTML, nol warna status di luar
`status.js`. Keduanya sudah bersih; jaga tetap begitu.

**5.4 Konsistensi angka lintas panel.** Pernah terjadi grafik membantah panel di
sebelahnya: pita envelope menempatkan P-07 pada 1,5σ padahal panelnya menyebut
waspada 2,9σ, dan PG-01 berstatus waspada dengan perpindahan 0,66 mm terhadap
ambang 8 mm. Kalau menambah panel baru, periksa angkanya cocok dengan panel lain.

---

## 6. Utang yang belum lunas

**6.1 Pemilih bendungan masih placeholder.** Header menampilkan `[BENDUNGAN A/B/C]`
padahal `bendungan.json` sudah berisi Bendungan Sedayu, Karangwuni, dan Tirtomulyo.
Sebabnya `nav.js` menyalin daftar itu sebagai konstanta sendiri, padahal itu data.
Perbaikannya: pemilih membaca store Alpine. Ini satu-satunya placeholder tersisa
dan paling terlihat.

**6.2 `kSigmaNormal: 2.5` di `assets/data.js`.** Satu-satunya angka rekayasa yang
tinggal di JS, mencerminkan `K_WASPADA` di generator. Kalau ambang berubah di
generator, angka ini harus ikut diubah manual. Muncul karena penambahan
`ambang_sigma` ke `kanal.json` ditolak.

**6.3 Lencana quality `bad` tidak pernah tampil.** Data hanya punya 1 `suspect`,
1 `unverified`, 1 `estimated`, nol `bad`. `docs/04` Bagian 4 mendaftar lima
lencana; satu tidak terdemokan.

**6.4 Peta genangan `risiko.html`** butuh berkas PNG overlay dari user, atau
placeholder.

**6.5 Sembilan commit belum ter-push** ke `origin/main`
(`github.com/ib-fauzan/ews-mockup`). Periksa juga apakah repo itu publik —
isinya sudah aman (nol data asli), tapi statusnya perlu Anda ketahui.

---

## 7. Pertentangan yang hanya user bisa selesaikan

`docs/01` menyatakan dokumen induk di repo terpisah **`ews-system`** adalah sumber
kebenaran, dan repo itu tidak terjangkau dari sini. Dua hal berpotensi bertentangan:

- Teks pita sudah diganti di repo ini. Bila dokumen induk masih mengunci
  "MOCKUP — seluruh data adalah karangan", keduanya perlu diselaraskan.
- Nama produk sudah ditetapkan `SightBased.id`. Dokumen induk mungkin masih
  menulis `[NAMA PRODUK]`.
