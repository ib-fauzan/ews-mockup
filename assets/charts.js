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
    ikutiUkuran: ikutiUkuran,
  };
})(window);
