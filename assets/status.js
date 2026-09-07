/**
 * status.js — sumber tunggal pemetaan status, quality flag, dan pemformat waktu.
 *
 * docs/04 Bagian 7: pemetaan status ke warna dan label HANYA ada di berkas ini.
 * Jangan menulis warna status langsung di HTML mana pun.
 *
 * docs/04 Bagian 1 (P-1): abu-abu harus jelas berbeda dari hijau, termasuk bagi
 * pengguna dengan gangguan pembedaan warna. Karena itu tiap status dibedakan juga
 * oleh ikon dan pola, tidak semata warna — proyektor ruang rapat mereproduksi
 * warna dengan buruk.
 */
(function (global) {
  'use strict';

  /**
   * Tujuh status kanal, docs/04 Bagian 2.
   *
   * urutan  — makin besar makin genting; dipakai untuk mengurutkan agregasi.
   *           insufficient_data dan stale BUKAN varian normal, jadi tidak
   *           diletakkan di bawah normal. Keduanya pernyataan "sistem tidak tahu".
   * pola    — nama kelas di style.css; null bila polos.
   */
  var STATUS = {
    normal: {
      kode: 'normal',
      label: 'Normal',
      ikon: '●',
      urutan: 1,
      teks: '#166534',
      latar: '#dcfce7',
      garis: '#86efac',
      pola: null,
    },
    waspada: {
      kode: 'waspada',
      label: 'Waspada',
      ikon: '▲',
      urutan: 4,
      teks: '#854d0e',
      latar: '#fef9c3',
      garis: '#fde047',
      pola: null,
    },
    siaga: {
      kode: 'siaga',
      label: 'Siaga',
      ikon: '▲▲',
      urutan: 5,
      teks: '#9a3412',
      latar: '#ffedd5',
      garis: '#fdba74',
      pola: null,
    },
    awas: {
      kode: 'awas',
      label: 'Awas',
      ikon: '■',
      urutan: 6,
      teks: '#991b1b',
      latar: '#fee2e2',
      garis: '#fca5a5',
      pola: null,
    },
    insufficient_data: {
      kode: 'insufficient_data',
      label: 'Data tidak cukup',
      ikon: '?',
      urutan: 2,
      teks: '#44403c',
      latar: '#f5f5f4',
      garis: '#a8a29e',
      pola: null,
    },
    stale: {
      kode: 'stale',
      label: 'Basi',
      ikon: '◷',
      urutan: 3,
      teks: '#44403c',
      latar: '#f5f5f4',
      garis: '#a8a29e',
      pola: 'pola-basi',
    },
    stale_kritis: {
      kode: 'stale_kritis',
      label: 'Basi kritis',
      ikon: '◷◷',
      urutan: 7,
      teks: '#292524',
      latar: '#e7e5e4',
      garis: '#78716c',
      pola: 'pola-basi-kritis',
    },
  };

  /** Lima quality flag pada bacaan, docs/04 Bagian 4. */
  var QUALITY = {
    good: {
      kode: 'good',
      label: null,               // tanpa lencana di tabel
      teks: null,
      latar: null,
      garis: null,
    },
    estimated: {
      kode: 'estimated',
      label: 'Estimasi',
      teks: '#44403c',
      latar: '#f5f5f4',
      garis: '#a8a29e',
    },
    unverified: {
      kode: 'unverified',
      label: 'Belum diverifikasi',
      teks: '#854d0e',
      latar: '#fef9c3',
      garis: '#fde047',
    },
    suspect: {
      kode: 'suspect',
      label: 'Meragukan',
      teks: '#9a3412',
      latar: '#ffedd5',
      garis: '#fdba74',
    },
    bad: {
      kode: 'bad',
      label: 'Tidak valid',
      teks: '#991b1b',
      latar: '#fee2e2',
      garis: '#fca5a5',
    },
  };

  var STATUS_TIDAK_DIKENAL = {
    kode: 'tidak_dikenal',
    label: 'Status tidak dikenal',
    ikon: '!',
    urutan: 0,
    teks: '#44403c',
    latar: '#f5f5f4',
    garis: '#a8a29e',
    pola: null,
  };

  function status(kode) {
    return STATUS[kode] || STATUS_TIDAK_DIKENAL;
  }

  function labelStatus(kode) {
    return status(kode).label;
  }

  function warnaStatus(kode) {
    var s = status(kode);
    return { teks: s.teks, latar: s.latar, garis: s.garis };
  }

  function quality(kode) {
    return QUALITY[kode] || null;
  }

  function escapeHTML(teks) {
    return String(teks).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /**
   * Lencana status. Warna + ikon + label, tidak pernah warna telanjang.
   * docs/04 Bagian 1 (P-3) mengikat ini di tingkat aset; di tingkat kanal pun
   * label tetap dibawa supaya tangkapan layar tetap terbaca.
   */
  function lencanaStatus(kode, opsi) {
    var s = status(kode);
    var o = opsi || {};
    var gaya = 'color:' + s.teks + ';background-color:' + s.latar + ';border-color:' + s.garis + ';';
    var kelas = 'ews-lencana' + (s.pola ? ' ' + s.pola : '');
    var label = o.tanpaLabel ? '' : '<span>' + escapeHTML(s.label) + '</span>';
    return (
      '<span class="' + kelas + '" style="' + gaya + '" title="' + escapeHTML(s.label) + '">' +
      '<span class="ews-lencana-ikon" aria-hidden="true">' + s.ikon + '</span>' +
      label +
      '</span>'
    );
  }

  /** Lencana quality flag. `good` tidak menghasilkan lencana, docs/04 Bagian 4. */
  function lencanaQuality(kode) {
    var q = quality(kode);
    if (!q || !q.label) return '';
    var gaya = 'color:' + q.teks + ';background-color:' + q.latar + ';border-color:' + q.garis + ';';
    return '<span class="ews-lencana" style="' + gaya + '">' + escapeHTML(q.label) + '</span>';
  }

  // --- Waktu -----------------------------------------------------------------
  // docs/05 Bagian 3.3: simpan UTC, tampilkan WIB. Satu pemformat, dipakai
  // di mana-mana. Setiap waktu yang tampil wajib berlabel zona waktunya.

  var WIB = 'Asia/Jakarta';
  var BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

  function bagianWIB(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    // en-CA memberi urutan yang stabil untuk diurai kembali: YYYY-MM-DD, HH:mm
    var f = new Intl.DateTimeFormat('en-CA', {
      timeZone: WIB,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false,
    });
    var p = {};
    f.formatToParts(d).forEach(function (bagian) { p[bagian.type] = bagian.value; });
    return {
      tanggal: p.day,
      bulan: BULAN[parseInt(p.month, 10) - 1],
      tahun: p.year,
      jam: p.hour,
      menit: p.minute,
      objek: d,
    };
  }

  /** "07 Sep 2026, 14:30 WIB" — bentuk lengkap. */
  function formatWIB(iso) {
    var b = bagianWIB(iso);
    if (!b) return '—';
    return b.tanggal + ' ' + b.bulan + ' ' + b.tahun + ', ' + b.jam + ':' + b.menit + ' WIB';
  }

  /** "07 Sep, 14:30 WIB" — untuk kolom tabel yang sempit. */
  function formatWIBSingkat(iso) {
    var b = bagianWIB(iso);
    if (!b) return '—';
    return b.tanggal + ' ' + b.bulan + ', ' + b.jam + ':' + b.menit + ' WIB';
  }

  /** "07 Sep 2026 WIB" — tanpa jam. */
  function formatTanggalWIB(iso) {
    var b = bagianWIB(iso);
    if (!b) return '—';
    return b.tanggal + ' ' + b.bulan + ' ' + b.tahun + ' WIB';
  }

  /**
   * "9 hari lalu" — untuk kolom umur bacaan, docs/04 Bagian 3 memakai bentuk ini
   * pada alasan status `stale`. Selalu dipasangkan dengan waktu absolut, tidak
   * pernah berdiri sendiri.
   */
  function formatWIBRelatif(iso, sekarang) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    var acuan = sekarang ? new Date(sekarang) : new Date();
    var detik = Math.round((acuan - d) / 1000);
    var depan = detik < 0;
    var abs = Math.abs(detik);

    var teks;
    if (abs < 60) teks = 'kurang dari semenit';
    else if (abs < 3600) teks = Math.floor(abs / 60) + ' menit';
    else if (abs < 86400) teks = Math.floor(abs / 3600) + ' jam';
    else teks = Math.floor(abs / 86400) + ' hari';

    if (teks === 'kurang dari semenit') return depan ? 'sebentar lagi' : 'baru saja';
    return depan ? teks + ' lagi' : teks + ' lalu';
  }

  global.EWSStatus = {
    STATUS: STATUS,
    QUALITY: QUALITY,
    status: status,
    labelStatus: labelStatus,
    warnaStatus: warnaStatus,
    quality: quality,
    lencanaStatus: lencanaStatus,
    lencanaQuality: lencanaQuality,
    formatWIB: formatWIB,
    formatWIBSingkat: formatWIBSingkat,
    formatTanggalWIB: formatTanggalWIB,
    formatWIBRelatif: formatWIBRelatif,
    escapeHTML: escapeHTML,
  };
})(window);
