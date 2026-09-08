/**
 * nav.js — kerangka bersama: pita mockup, header, sidebar, catatan decision support.
 *
 * docs/05 Bagian 3.4: header dan sidebar di-inject dari sini. Jangan menyalin
 * markup ini ke enam berkas HTML — satu perubahan akan berarti enam suntingan.
 *
 * Halaman menandai dirinya lewat atribut pada <body>:
 *   data-halaman="index"   — menentukan entri sidebar yang aktif
 *   data-catatan-ds        — memasang catatan decision support (index,
 *                            instrumentasi, risiko saja)
 *
 * Urutan pemuatan skrip penting. Berkas ini menyuntik markup ber-x-data, jadi
 * harus berjalan SEBELUM Alpine. status.js dan nav.js dimuat tanpa `defer`;
 * Alpine dimuat dengan `defer` sehingga baru jalan setelah markup tersuntik.
 *
 * Warna di berkas ini semuanya netral (zinc). Tidak ada warna status di sini —
 * docs/04 Bagian 7 menaruh itu hanya di status.js. Pita mockup pun sengaja
 * memakai zinc gelap, bukan kuning, supaya tidak tertukar dengan `waspada`.
 */
(function (global) {
  'use strict';

  // --- Branding ---------------------------------------------------------------
  // docs/01 Bagian 7: nama produk, bendungan, dan logo adalah keputusan user.
  // Nama produk dan lambangnya sudah ditetapkan; nama bendungan dan identitas
  // pengguna masih placeholder. Ganti di sini saja — satu titik.

  var PRODUK = {
    nama: 'SightBased.id',
    tagline: 'Sistem Pemantauan Bendungan',
  };

  // Lambang produk sebagai SVG sebaris: lensa dengan garis muka air di
  // tengahnya. Tanpa berkas gambar, jadi tetap tajam di proyektor dan tidak
  // menambah permintaan jaringan saat demo.
  // Lambang produk sebagai SVG sebaris: muka air di dalam lensa. Versi
  // pertama memakai titik di atas lengkung, yang terbaca sebagai wajah
  // tersenyum — salah nada untuk produk keamanan bendungan.
  // Tanpa berkas gambar, jadi tetap tajam di proyektor dan tidak menambah
  // permintaan jaringan saat demo.
  var LAMBANG =
    '<svg viewBox="0 0 32 32" class="h-8 w-8 shrink-0" aria-hidden="true">' +
      '<defs><clipPath id="ews-lensa"><circle cx="16" cy="16" r="11.6"/></clipPath></defs>' +
      '<g clip-path="url(#ews-lensa)">' +
        '<path d="M-2 17.6c3.4 0 3.4-2.6 6.8-2.6s3.4 2.6 6.8 2.6 3.4-2.6 6.8-2.6 ' +
          '3.4 2.6 6.8 2.6 3.4-2.6 6.8-2.6V32H-2z" fill="#0369a1" opacity="0.9"/>' +
      '</g>' +
      '<circle cx="16" cy="16" r="11.6" fill="none" stroke="#0369a1" stroke-width="2.4"/>' +
      '<path d="M16 2.2v3.4M16 26.4v3.4M2.2 16h3.4M26.4 16h3.4" ' +
        'stroke="#0369a1" stroke-width="2" stroke-linecap="round"/>' +
    '</svg>';
  var BENDUNGAN = [
    { kode: 'A', nama: '[BENDUNGAN A]', aktif: true },
    { kode: 'B', nama: '[BENDUNGAN B]', aktif: false },
    { kode: 'C', nama: '[BENDUNGAN C]', aktif: false },
  ];

  // Klien karangan. Namanya sengaja dibuat sama dengan `pengelola` di
  // data/bendungan.json supaya header dan data tidak bercerita berbeda.
  // "Wilayah Tengah" bukan nama balai yang benar-benar ada.
  var KLIEN = {
    nama: 'BBWS Wilayah Tengah',
    peran: 'Pengelola bendungan',
  };

  // Lambang klien sengaja abstrak: tiga guratan air pada ubin membulat.
  // BUKAN bentuk perisai, segel, atau lambang negara — mockup ini tidak boleh
  // terlihat memakai emblem instansi pemerintah yang sungguhan.
  var LAMBANG_KLIEN =
    '<svg viewBox="0 0 32 32" class="h-9 w-9 shrink-0" aria-hidden="true">' +
      '<rect x="1.5" y="1.5" width="29" height="29" rx="7" fill="#0f766e"/>' +
      '<path d="M7 12.6c2 0 2-1.9 4-1.9s2 1.9 4 1.9 2-1.9 4-1.9 2 1.9 4 1.9" ' +
        'fill="none" stroke="#ffffff" stroke-width="1.9" stroke-linecap="round" opacity="0.95"/>' +
      '<path d="M7 17.4c2 0 2-1.9 4-1.9s2 1.9 4 1.9 2-1.9 4-1.9 2 1.9 4 1.9" ' +
        'fill="none" stroke="#ffffff" stroke-width="1.9" stroke-linecap="round" opacity="0.75"/>' +
      '<path d="M7 22.2c2 0 2-1.9 4-1.9s2 1.9 4 1.9 2-1.9 4-1.9 2 1.9 4 1.9" ' +
        'fill="none" stroke="#ffffff" stroke-width="1.9" stroke-linecap="round" opacity="0.5"/>' +
    '</svg>';

  var PENGGUNA = {
    nama: 'Rahmat Wijaya',
    peran: 'Engineer keamanan bendungan',
  };

  // --- Navigasi --------------------------------------------------------------
  // Enam entri, docs/01 Bagian 6. Modul sekunder sengaja dangkal dan diberi
  // penanda halus agar tidak disalahpahami sebagai fitur yang belum jadi.

  var NAVIGASI = [
    {
      kelompok: 'Modul primer',
      entri: [
        { id: 'index', label: 'Pengawasan Bendungan', modul: 'Dam Surveillance', href: 'index.html' },
        { id: 'instrumentasi', label: 'Pemantauan Instrumentasi', modul: 'Instrumentation Monitoring', href: 'instrumentasi.html' },
        { id: 'risiko', label: 'Analisis Risiko', modul: 'Risk Analysis', href: 'risiko.html' },
      ],
    },
    {
      kelompok: 'Modul sekunder',
      ringkas: true,
      entri: [
        { id: 'konstruksi', label: 'Riwayat Konstruksi', modul: 'Construction Histories', href: 'konstruksi.html' },
        { id: 'op', label: 'Operasi & Pemeliharaan', modul: 'Operational & Maintenance', href: 'op.html' },
        { id: 'laporan', label: 'Pelaporan', modul: 'Reporting', href: 'laporan.html' },
      ],
    },
  ];

  /** Teks persis docs/01 Bagian 5. Jangan diubah satu kata pun. */
  var TEKS_CATATAN_DS =
    'Sistem ini adalah alat bantu pengambilan keputusan. Penilaian akhir kondisi ' +
    'keamanan bendungan berada pada pengelola bendungan bersertifikat dan tidak ' +
    'menggantikan prosedur pemantauan manual maupun Rencana Tindak Darurat yang berlaku.';

  // Kata-katanya ditetapkan user; fungsinya tidak berubah. Pita tetap
  // permanen dan tetap menyatakan dua hal yang melindungi user bila
  // tangkapan layar beredar tanpa konteks: ini pratinjau, dan angkanya
  // bukan data bendungan sungguhan.
  var TEKS_PITA = 'PRATINJAU PRODUK · data contoh, bukan data bendungan sungguhan';

  var esc = global.EWSStatus.escapeHTML;

  /** Placeholder bergaya jelas-belum-final, supaya tidak tertukar saat demo. */
  function ph(teks) {
    return '<span class="ews-placeholder">' + esc(teks) + '</span>';
  }

  // --- Render ----------------------------------------------------------------

  /**
   * Pita label mockup. Permanen — tanpa tombol tutup, tanpa x-show.
   * docs/02 Bagian 1.1 dan docs/05 Bagian 5: tidak ada versi bersih tanpa label.
   */
  function renderPita() {
    return (
      '<div role="note" class="ews-pita flex items-center justify-center gap-2 ' +
      'bg-zinc-900 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-zinc-50">' +
        '<span aria-hidden="true">▲</span>' +
        '<span>' + esc(TEKS_PITA) + '</span>' +
      '</div>'
    );
  }

  function renderPemilihBendungan() {
    var aktif = BENDUNGAN.filter(function (b) { return b.aktif; })[0] || BENDUNGAN[0];

    var opsi = BENDUNGAN.map(function (b) {
      if (b.aktif) {
        return (
          '<li>' +
            '<button type="button" @click="buka = false" ' +
            'class="flex w-full items-center justify-between gap-3 px-3 py-2 text-left ' +
            'text-sm hover:bg-zinc-100">' +
              ph(b.nama) +
              '<span aria-hidden="true" class="text-zinc-500">✓</span>' +
            '</button>' +
          '</li>'
        );
      }
      return (
        '<li>' +
          '<button type="button" disabled title="Tidak aktif pada mockup ini" ' +
          'class="flex w-full cursor-not-allowed items-center justify-between gap-3 px-3 ' +
          'py-2 text-left text-sm opacity-50">' +
            ph(b.nama) +
            '<span class="text-xs uppercase tracking-wide text-zinc-500">nonaktif</span>' +
          '</button>' +
        '</li>'
      );
    }).join('');

    return (
      '<div class="relative" x-data="{ buka: false }" @keydown.escape="buka = false" ' +
      '@click.outside="buka = false">' +
        '<button type="button" @click="buka = !buka" :aria-expanded="buka" ' +
        'aria-haspopup="listbox" ' +
        'class="flex items-center gap-2 rounded border border-zinc-300 bg-white px-3 py-1.5 ' +
        'text-sm hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-400">' +
          '<span class="text-xs uppercase tracking-wide text-zinc-500">Bendungan</span>' +
          ph(aktif.nama) +
          '<span aria-hidden="true" class="text-zinc-500">▾</span>' +
        '</button>' +
        '<ul role="listbox" x-show="buka" x-cloak x-transition.opacity ' +
        'class="absolute left-0 z-20 mt-1 w-64 overflow-hidden rounded border ' +
        'border-zinc-300 bg-white shadow-lg">' +
          opsi +
        '</ul>' +
      '</div>'
    );
  }

  /** Header, docs/02 Bagian 1.1. */
  function renderHeader() {
    return (
      '<header class="flex items-center justify-between gap-4 border-b border-zinc-200 ' +
      'bg-white px-4 py-2">' +

        // Kiri: logo konsultan + nama produk
        '<div class="flex min-w-0 items-center gap-3">' +
          LAMBANG +
          '<div class="min-w-0">' +
            '<div class="truncate text-base font-semibold tracking-tight text-zinc-900">' +
              esc(PRODUK.nama) + '</div>' +
            '<div class="truncate text-xs text-zinc-500">' + esc(PRODUK.tagline) + '</div>' +
          '</div>' +
        '</div>' +

        // Tengah: pemilih bendungan
        '<div class="shrink-0">' + renderPemilihBendungan() + '</div>' +

        // Kanan: slot logo klien, lalu pengguna demo dan perannya
        '<div class="flex min-w-0 items-center gap-3">' +
          LAMBANG_KLIEN +
          '<div class="min-w-0">' +
            '<div class="truncate text-sm font-medium text-zinc-900">' +
              esc(KLIEN.nama) + '</div>' +
            '<div class="truncate text-xs text-zinc-500">' + esc(KLIEN.peran) + '</div>' +
          '</div>' +
          '<div class="h-8 w-px shrink-0 bg-zinc-200"></div>' +
          '<div class="min-w-0 text-right">' +
            '<div class="truncate text-sm text-zinc-900">' + esc(PENGGUNA.nama) + '</div>' +
            '<div class="truncate text-xs text-zinc-500">' + esc(PENGGUNA.peran) + '</div>' +
          '</div>' +
        '</div>' +
      '</header>'
    );
  }

  /** Sidebar, docs/02 Bagian 1.2. */
  function renderSidebar(halamanAktif) {
    var kelompok = NAVIGASI.map(function (k) {
      var entri = k.entri.map(function (e) {
        var aktif = e.id === halamanAktif;
        var kelas = aktif
          ? 'border-l-2 border-zinc-900 bg-white font-semibold text-zinc-900'
          : 'border-l-2 border-transparent text-zinc-600 hover:bg-white hover:text-zinc-900';
        return (
          '<li>' +
            '<a href="' + e.href + '"' + (aktif ? ' aria-current="page"' : '') +
            ' class="block px-3 py-2 text-sm leading-tight ' + kelas + '">' +
              '<span class="block">' + esc(e.label) + '</span>' +
              '<span class="block text-xs font-normal text-zinc-400">' + esc(e.modul) + '</span>' +
            '</a>' +
          '</li>'
        );
      }).join('');

      var penandaRingkas = k.ringkas
        ? '<span title="Halaman modul sekunder sengaja ringkas pada mockup ini" ' +
          'class="rounded border border-zinc-300 px-1 text-[10px] normal-case ' +
          'tracking-normal text-zinc-500">ringkas</span>'
        : '';

      return (
        '<div class="py-3">' +
          '<div class="mb-1 flex items-center gap-2 px-3 text-xs font-semibold ' +
          'uppercase tracking-wide text-zinc-400">' +
            '<span>' + esc(k.kelompok) + '</span>' + penandaRingkas +
          '</div>' +
          '<ul>' + entri + '</ul>' +
        '</div>'
      );
    }).join('');

    return (
      '<nav aria-label="Navigasi modul" ' +
      'class="h-full w-56 shrink-0 divide-y divide-zinc-200 border-r border-zinc-200 bg-zinc-50">' +
        kelompok +
      '</nav>'
    );
  }

  /**
   * Catatan decision support, docs/01 Bagian 5.
   * Disuntik di atas konten utama — dokumen mensyaratkan "di tempat yang
   * terbaca", bukan tempelan kecil di footer.
   */
  function renderCatatanDS() {
    return (
      '<aside role="note" class="mb-5 flex gap-3 border-l-4 border-zinc-500 ' +
      'bg-zinc-100 px-4 py-3">' +
        '<span aria-hidden="true" class="mt-0.5 flex h-5 w-5 shrink-0 items-center ' +
        'justify-center rounded-full bg-zinc-600 text-xs font-bold text-white">i</span>' +
        '<p class="text-sm leading-relaxed text-zinc-700">' + esc(TEKS_CATATAN_DS) + '</p>' +
      '</aside>'
    );
  }

  // --- Pemasangan ------------------------------------------------------------

  function pasang(id, markup) {
    var wadah = document.getElementById(id);
    if (wadah) wadah.innerHTML = markup;
    return wadah;
  }

  function init() {
    var halaman = document.body.getAttribute('data-halaman') || '';

    pasang('ews-pita', renderPita());
    pasang('ews-header', renderHeader());
    pasang('ews-sidebar', renderSidebar(halaman));

    if (document.body.hasAttribute('data-catatan-ds')) {
      pasang('ews-catatan-ds', renderCatatanDS());
    }
  }

  // Berkas ini dimuat di akhir <body> tanpa defer, jadi <body> sudah ada.
  init();

  global.EWSNav = {
    PRODUK: PRODUK,
    BENDUNGAN: BENDUNGAN,
    NAVIGASI: NAVIGASI,
    TEKS_CATATAN_DS: TEKS_CATATAN_DS,
    renderCatatanDS: renderCatatanDS,
  };
})(window);
