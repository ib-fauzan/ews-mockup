# 05 — Stack dan Konvensi Frontend

| | |
|---|---|
| **Versi dokumen** | 0.1 — Draf awal |
| **Status** | Draf |

> Stack sengaja disamakan dengan dokumen `05-tech-stack.md` (berada di repo terpisah
> `ews-system`) supaya markup mockup dapat
> dipindah menjadi `frontend/templates/` di proyek utama. **Mockup ini bukan barang
> buangan.** Karena itu jangan memilih pustaka lain yang "lebih gampang untuk mockup".

---

## 1. Stack

| Kebutuhan | Pakai | Jangan pakai |
|---|---|---|
| CSS | Tailwind (CDN) | Bootstrap, CSS custom besar |
| Interaksi | Alpine.js (CDN) | React, Vue, jQuery, HTMX |
| Grafik | Apache ECharts (CDN) | Chart.js, Plotly, D3 langsung |
| Peta | MapLibre GL JS (CDN) | Leaflet, Google Maps, Mapbox GL |
| Server lokal | Live Server atau `python -m http.server` | Node, bundler, framework |

Tanpa `npm install`. Tanpa build step. Folder ini harus bisa dibuka di komputer mana pun
hanya dengan browser dan satu server statis.

**Catatan soal HTMX.** Proyek utama memakai HTMX, mockup tidak. HTMX butuh server yang
mengembalikan fragmen HTML; mockup tidak punya server. Interaksi mockup ditangani
Alpine.js, dan nanti sebagian digantikan HTMX saat dipindah ke Django. Ini pergantian
yang wajar dan sudah diperhitungkan.

---

## 2. Struktur folder

```
mockup/
├── CLAUDE.md
├── docs/                  01–05
├── index.html             Dam Surveillance
├── instrumentasi.html     Instrumentation Monitoring
├── risiko.html            Risk Analysis
├── konstruksi.html        Construction Histories
├── op.html                Operational & Maintenance
├── laporan.html           Reporting
├── data/                  JSON dummy — lihat docs/03
└── assets/
    ├── nav.js             header, sidebar, catatan decision support
    ├── status.js          palet, label, pemformat waktu, lencana
    ├── charts.js          pembungkus ECharts
    ├── map.js             pembungkus MapLibre
    └── style.css          hanya yang tidak bisa dicapai Tailwind
```

---

## 3. Konvensi kode

**3.1 Satu sumber untuk status.** Pemetaan status → warna, label, dan ikon hanya ada di
`assets/status.js`. Tidak boleh ada warna status yang ditulis langsung di HTML.

**3.2 Semua data lewat `fetch()`.** Nol angka hardcode. Muat JSON sekali saat halaman
siap, simpan di store Alpine, halaman membaca dari sana.

**3.3 Waktu.** Simpan UTC, tampilkan WIB. Satu fungsi pemformat di `status.js`, dipakai
di mana-mana. Setiap waktu yang tampil di layar wajib berlabel zona waktunya.

**3.4 Header dan sidebar di-inject lewat `nav.js`.** Jangan menyalin markup header ke
enam berkas HTML — satu perubahan akan berarti enam suntingan.

**3.5 ECharts dan MapLibre sebagai pulau.** Bungkus tiap grafik dan peta dalam fungsi
inisialisasi tersendiri di `charts.js` / `map.js`. Halaman memanggil fungsi, tidak
menyusun opsi ECharts langsung di HTML. Ini yang memungkinkan pemindahan ke Django
nanti tanpa menulis ulang.

**3.6 Bahasa.** Seluruh teks antarmuka Bahasa Indonesia. Istilah teknis mengikuti
peristilahan yang berlaku di lingkungan keamanan bendungan. Nama variabel dan fungsi
boleh Inggris.

**3.7 Satuan.** mdpl untuk elevasi, m untuk tinggi tekan, l/detik untuk debit rembesan,
mm untuk deformasi, mm/jam untuk curah hujan. Satuan selalu ditampilkan, tidak pernah
diasumsikan.

**3.8 Responsif seperlunya.** Sasaran utama layar 1366×768 dan 1920×1080. Tidak perlu
tampilan ponsel — demo dilakukan di laptop atau proyektor.

---

## 4. CDN

Kunci versi mayornya. Jangan pakai tautan `@latest` — demo yang rusak karena pustaka
berubah adalah kegagalan yang mudah dihindari.

Muat ECharts dan MapLibre hanya di halaman yang memakainya. Halaman modul sekunder
tidak perlu memuat keduanya.

---

## 5. Deployment demo

Mockup adalah situs statis. Cukup unggah isi folder ini ke hosting statis mana pun.

**Jangan tautkan mockup ke domain produksi sistem.** Pakai subdomain atau URL terpisah
yang jelas berbeda, supaya tangkapan layar demo tidak pernah tertukar dengan sistem
sungguhan.

Pita label **PRATINJAU PRODUK · data contoh, bukan data bendungan sungguhan** tetap
tampil di versi yang dideploy. Tidak ada versi "bersih tanpa label".

---

## 6. Jalur pemindahan ke proyek utama

Dicatat sekarang supaya keputusan hari ini tidak menyulitkan nanti.

| Bagian mockup | Menjadi |
|---|---|
| `*.html` | `frontend/templates/*.html` dengan blok Django |
| `assets/nav.js` | Django template partial (`_header.html`, `_sidebar.html`) |
| `assets/status.js` | Template filter Django + sebagian tetap JS |
| `assets/charts.js` | `frontend/static/js/charts/` — pulau ECharts, hampir tanpa perubahan |
| `assets/map.js` | `frontend/static/js/maps/` — hampir tanpa perubahan |
| `data/*.json` | Endpoint DRF |
| Interaksi Alpine | Sebagian diganti HTMX, sisanya tetap Alpine |

`charts.js` dan `map.js` adalah bagian yang paling utuh terbawa. Karena itu keduanya
layak dikerjakan dengan serius sejak di mockup, tidak asal jadi.
