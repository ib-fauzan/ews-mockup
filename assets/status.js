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
   * Tujuh status kanal, docs/04 Bagian 2, tersebar pada DUA SUMBU yang tidak
   * boleh dicampur:
   *
   *   peringkat — tingkat peringatan: normal → waspada → siaga → awas.
   *               Bernilai null untuk status yang bukan tingkat peringatan.
   *               Hanya sumbu ini yang boleh dibandingkan sebagai "lebih genting".
   *
   *   kebasian  — kepatuhan operasional: 0 tidak basi, 1 basi, 2 basi kritis.
   *               Ini soal bacaan yang tidak masuk sesuai jadwal, BUKAN soal
   *               bendungan yang lebih berbahaya. Karena itu `stale_kritis`
   *               tidak pernah mengalahkan `awas` — keduanya menjawab
   *               pertanyaan yang berbeda dan ditampilkan berdampingan
   *               (docs/04 Bagian 5.2).
   *
   * `insufficient_data` tidak berada di sumbu mana pun: peringkat null karena
   * tidak dapat dinilai, kebasian 0 karena bacaannya tetap datang tepat waktu.
   *
   * urutanTampil — urutan baris pada kartu ringkasan aset, mengikuti contoh
   *                docs/04 Bagian 5.2: peringatan tertinggi dulu, lalu normal,
   *                lalu status "sistem tidak tahu".
   * pola         — nama kelas di style.css; null bila polos.
   */
  var STATUS = {
    normal: {
      kode: 'normal',
      label: 'Normal',
      ikon: '●',
      peringkat: 0,
      kebasian: 0,
      urutanTampil: 4,
      teks: '#166534',
      latar: '#dcfce7',
      garis: '#86efac',
      pola: null,
    },
    waspada: {
      kode: 'waspada',
      label: 'Waspada',
      ikon: '▲',
      peringkat: 1,
      kebasian: 0,
      urutanTampil: 3,
      teks: '#854d0e',
      latar: '#fef9c3',
      garis: '#fde047',
      pola: null,
    },
    siaga: {
      kode: 'siaga',
      label: 'Siaga',
      ikon: '▲▲',
      peringkat: 2,
      kebasian: 0,
      urutanTampil: 2,
      teks: '#9a3412',
      latar: '#ffedd5',
      garis: '#fdba74',
      pola: null,
    },
    awas: {
      kode: 'awas',
      label: 'Awas',
      ikon: '■',
      peringkat: 3,
      kebasian: 0,
      urutanTampil: 1,
      teks: '#991b1b',
      latar: '#fee2e2',
      garis: '#fca5a5',
      pola: null,
    },
    insufficient_data: {
      kode: 'insufficient_data',
      label: 'Data tidak cukup',
      ikon: '?',
      peringkat: null,
      kebasian: 0,
      urutanTampil: 5,
      teks: '#44403c',
      latar: '#f5f5f4',
      garis: '#a8a29e',
      pola: null,
    },
    stale: {
      kode: 'stale',
      label: 'Basi',
      ikon: '◷',
      peringkat: null,
      kebasian: 1,
      urutanTampil: 6,
      teks: '#44403c',
      latar: '#f5f5f4',
      garis: '#a8a29e',
      pola: 'pola-basi',
    },
    stale_kritis: {
      kode: 'stale_kritis',
      label: 'Basi kritis',
      ikon: '◷◷',
      peringkat: null,
      kebasian: 2,
      urutanTampil: 7,
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
    peringkat: null,
    kebasian: 0,
    urutanTampil: 8,
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

  // --- Agregasi --------------------------------------------------------------

  function peringkatStatus(kode) { return status(kode).peringkat; }
  function kebasianStatus(kode) { return status(kode).kebasian; }

  /** Hanya empat tingkat peringatan yang dapat dinilai dan dibandingkan. */
  function dapatDinilai(kode) { return status(kode).peringkat !== null; }

  /**
   * Agregasi kanal → instrumen, docs/04 Bagian 5.1.
   *
   * Mengembalikan dua keluaran, bukan satu status tunggal, karena kedua sumbu
   * menjawab pertanyaan yang berbeda:
   *
   *   peringatan      kode tingkat peringatan tertinggi di antara kanal yang
   *                   dapat dinilai; null bila tidak satu pun dapat dinilai
   *   kebasian        derajat kebasian tertinggi (0/1/2) di antara semua kanal
   *   takDapatDinilai cacah kanal tanpa peringkat (basi atau data tidak cukup)
   *
   * Kebasian tidak pernah menaikkan `peringatan`. Instrumen yang seluruh
   * kanalnya basi menghasilkan peringatan null dengan kebasian 2 — dan
   * tampilan wajib menyatakan keduanya, bukan memilih salah satu. Menukar ini
   * jadi satu angka akan membuat instrumen yang sekadar telat dibaca tampil
   * lebih genting daripada instrumen berstatus awas.
   */
  function agregasiKanal(kodeKanal) {
    var daftar = kodeKanal || [];
    var hasil = { peringatan: null, kebasian: 0, takDapatDinilai: 0, jumlahKanal: daftar.length };

    daftar.forEach(function (kode) {
      var s = status(kode);
      if (s.peringkat === null) {
        hasil.takDapatDinilai += 1;
      } else if (hasil.peringatan === null || s.peringkat > peringkatStatus(hasil.peringatan)) {
        hasil.peringatan = s.kode;
      }
      if (s.kebasian > hasil.kebasian) hasil.kebasian = s.kebasian;
    });

    return hasil;
  }

  /**
   * Pembanding untuk urutan baris kartu ringkasan aset, docs/04 Bagian 5.2:
   * peringatan tertinggi dulu, lalu normal, lalu status "sistem tidak tahu".
   */
  function bandingkanTampil(kodeA, kodeB) {
    return status(kodeA).urutanTampil - status(kodeB).urutanTampil;
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
    peringkatStatus: peringkatStatus,
    kebasianStatus: kebasianStatus,
    dapatDinilai: dapatDinilai,
    agregasiKanal: agregasiKanal,
    bandingkanTampil: bandingkanTampil,
    formatWIB: formatWIB,
    formatWIBSingkat: formatWIBSingkat,
    formatTanggalWIB: formatTanggalWIB,
    formatWIBRelatif: formatWIBRelatif,
    escapeHTML: escapeHTML,
  };
})(window);
