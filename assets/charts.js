/**
 * charts.js — pulau ECharts.
 *
 * docs/05 Bagian 3.5: tiap grafik dibungkus fungsi inisialisasi tersendiri.
 * Halaman memanggil fungsi, tidak menyusun opsi ECharts langsung di HTML.
 * Ini bagian yang paling utuh terbawa ke proyek utama nanti, jadi dikerjakan
 * serius sejak di mockup.
 *
 * Warna status tidak ditulis di sini — diambil dari status.js.
 */
(function (global) {
  'use strict';

  var S = global.EWSStatus;
  var NETRAL = '#71717a';
  var GARIS = '#e4e4e7';

  function wibSingkat(iso) { return S.formatWIBSingkat(iso); }

  /**
   * Sparkline TMA, docs/02 Bagian 2.2.
   * Menampilkan deret TMA beserta garis acuan elevasi puncak bila muat.
   */
  function sparklineTMA(el, deret, opsi) {
    if (!el || !deret || !deret.length) return null;
    var o = opsi || {};
    var grafik = echarts.init(el, null, { renderer: 'svg' });
    grafik.setOption({
      animation: false,
      grid: { left: 44, right: 10, top: 10, bottom: 22 },
      tooltip: {
        trigger: 'axis',
        formatter: function (p) {
          var t = p[0];
          return wibSingkat(t.value[0]) + '<br/><b>' +
                 t.value[1].toFixed(2) + '</b> mdpl';
        },
      },
      xAxis: {
        type: 'time',
        axisLine: { lineStyle: { color: GARIS } },
        axisLabel: {
          color: NETRAL, fontSize: 10, hideOverlap: true,
          formatter: function (v) {
            var d = new Date(v);
            return S.formatTanggalWIB(d.toISOString()).replace(' WIB', '');
          },
        },
      },
      yAxis: {
        type: 'value', scale: true,
        name: 'mdpl', nameTextStyle: { color: NETRAL, fontSize: 10 },
        axisLabel: { color: NETRAL, fontSize: 10, formatter: '{value}' },
        splitLine: { lineStyle: { color: GARIS } },
      },
      series: [{
        type: 'line',
        showSymbol: false,
        smooth: false,
        lineStyle: { width: 1.6, color: '#0369a1' },
        areaStyle: { color: 'rgba(3,105,161,0.08)' },
        data: deret.map(function (d) { return { value: [d[0], d[1]] }; }),
        markLine: o.puncak ? {
          silent: true, symbol: 'none',
          label: { formatter: 'Elevasi puncak', color: NETRAL, fontSize: 10 },
          lineStyle: { color: NETRAL, type: 'dashed', width: 1 },
          data: [{ yAxis: o.puncak }],
        } : undefined,
      }],
    });
    return grafik;
  }

  /**
   * Penampang melintang bendungan dengan instrumen pada elevasinya.
   *
   * Ini penampang TIPIKAL: seluruh instrumen sepanjang 400 m puncak
   * diproyeksikan ke satu potongan, sebagaimana lazim pada gambar
   * instrumentasi. Bukan potongan pada satu STA tertentu, dan keterangan di
   * halaman menyatakan itu supaya tidak disalahbaca.
   *
   * Geometri datang dari data/bendungan.json, tidak ada koordinat di sini.
   */
  function penampang(el, geometri, instrumen) {
    if (!el || !geometri) return null;

    var g = geometri;
    var tepi = g.batas_jarak[1];
    var elDasar = g.fondasi[0][1];
    // Sumbu-y harus memuat instrumen TERDALAM, bukan sekadar garis fondasi.
    // Piezometer fondasi duduk di bawahnya, dan batas tetap membuat delapan
    // instrumen terpotong keluar sumbu tanpa jejak apa pun di layar.
    var elTerdalam = (instrumen || []).reduce(function (m, i) {
      return (i.elevasi_mdpl != null && i.elevasi_mdpl < m) ? i.elevasi_mdpl : m;
    }, elDasar);
    var yMin = Math.floor(Math.min(elDasar, elTerdalam) - 4);
    var yMaks = g.el_puncak_mdpl + 4;
    var air = g.muka_air;

    // Titik potong muka air dengan lereng hulu, untuk menggambar genangan.
    function potongLerengHulu(elevasi) {
      for (var i = 0; i < g.tubuh.length - 1; i++) {
        var a = g.tubuh[i], b = g.tubuh[i + 1];
        if (a[1] <= elevasi && elevasi <= b[1] && b[1] > a[1]) {
          var t = (elevasi - a[1]) / (b[1] - a[1]);
          return a[0] + t * (b[0] - a[0]);
        }
      }
      return g.tubuh[1][0];
    }

    function poligon(titik, isi, garis) {
      return {
        type: 'custom', silent: true, z: 1,
        data: [0],
        renderItem: function (params, api) {
          return {
            type: 'polygon',
            shape: { points: titik.map(function (p) { return api.coord(p); }) },
            style: { fill: isi, stroke: garis || 'transparent', lineWidth: garis ? 1 : 0 },
          };
        },
      };
    }

    var elToeHulu = g.tubuh[0][1];
    var genangan = [
      [-tepi, air.sekarang_mdpl],
      [potongLerengHulu(air.sekarang_mdpl), air.sekarang_mdpl],
      [g.tubuh[1][0], elToeHulu],
      [-tepi, elToeHulu],
    ];
    var tubuhTertutup = g.tubuh.concat([[tepi, yMin], [-tepi, yMin]]);

    var titikInstrumen = (instrumen || [])
      .filter(function (i) {
        return i.elevasi_mdpl != null && i.jenis !== 'tma' && i.jenis !== 'arr';
      })
      .map(function (i) {
        var st = S.status(i.status);
        return {
          value: [i.jarak_sumbu_m, i.elevasi_mdpl],
          name: i.id,
          jenis: i.jenis,
          statusLabel: st.label,
          itemStyle: { color: st.latar, borderColor: st.teks, borderWidth: 1.6 },
          symbolSize: S.dapatDinilai(i.status) ? 11 : 9,
        };
      });

    var grafik = echarts.init(el, null, { renderer: 'svg' });
    grafik.setOption({
      animation: false,
      grid: { left: 52, right: 16, top: 16, bottom: 34 },
      tooltip: {
        trigger: 'item',
        formatter: function (p) {
          if (!p.data || !p.data.name) return '';
          return '<b>' + p.data.name + '</b><br/>' + p.data.jenis +
                 '<br/>El. ' + p.data.value[1].toFixed(2) + ' mdpl' +
                 '<br/>' + p.data.statusLabel;
        },
      },
      xAxis: {
        type: 'value', min: -tepi, max: tepi,
        name: 'jarak dari sumbu (m)', nameLocation: 'middle', nameGap: 20,
        nameTextStyle: { color: NETRAL, fontSize: 10 },
        axisLabel: { color: NETRAL, fontSize: 10 },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value', min: yMin, max: yMaks,
        name: 'mdpl', nameTextStyle: { color: NETRAL, fontSize: 10 },
        axisLabel: { color: NETRAL, fontSize: 10 },
        splitLine: { lineStyle: { color: GARIS } },
      },
      series: [
        poligon(genangan, '#dbeafe'),
        poligon(tubuhTertutup, '#e7e5e4', '#a8a29e'),
        poligon(g.inti, '#d6d3d1', '#78716c'),
        {
          type: 'line', silent: true, z: 2, showSymbol: false,
          lineStyle: { color: '#a8a29e', width: 1, type: 'dashed' },
          data: g.fondasi,
        },
        {
          type: 'scatter', z: 5, data: titikInstrumen,
          markLine: {
            silent: true, symbol: 'none',
            label: { fontSize: 9, color: NETRAL, position: 'insideEndTop' },
            lineStyle: { color: '#60a5fa', type: 'dashed', width: 1 },
            data: [
              { yAxis: air.sekarang_mdpl, label: { formatter: 'TMA sekarang' } },
              { yAxis: air.normal_mdpl, label: { formatter: 'Muka air normal' },
                lineStyle: { color: '#93c5fd' } },
            ],
          },
        },
      ],
    });
    return grafik;
  }

  /**
   * Pasang ulang ukuran saat jendela ATAU elemennya sendiri berubah ukuran.
   *
   * ResizeObserver-nya bukan kemewahan: saat Alpine baru menyisipkan blok
   * lewat x-if, elemen sempat berlebar nol pada tik pertama. ECharts terlanjur
   * menghitung kanvas 0x0 dan grafik tidak pernah tergambar walau instansnya
   * terbentuk. Observer menggambar ulang begitu lebarnya ada.
   */
  function ikutiUkuran(daftar, el) {
    global.addEventListener('resize', function () {
      daftar.forEach(function (g) { if (g) g.resize(); });
    });
    if (el && global.ResizeObserver) {
      new ResizeObserver(function () {
        daftar.forEach(function (g) { if (g) g.resize(); });
      }).observe(el);
    }
  }

  global.EWSCharts = {
    sparklineTMA: sparklineTMA,
    penampang: penampang,
    ikutiUkuran: ikutiUkuran,
  };
})(window);
