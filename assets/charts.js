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

  // Palet deret non-status. Warna status tidak dipakai untuk garis biasa,
  // supaya garis tren tidak pernah tertukar dengan tingkat peringatan.
  var DERET = ['#0369a1', '#7c3aed', '#0f766e'];
  var TMA_WARNA = '#93c5fd';
  var PITA = 'rgba(120,113,108,0.18)';

  /**
   * Grafik utama deret waktu, docs/02 Bagian 3.3.
   *
   * Dipakai kanal `scalar` maupun `vector3`. Untuk vector3, ketiga kanal
   * (dX, dY, dZ) digambar sebagai tiga deret pada satu sumbu mm, sesuai
   * pilihan yang diambil user dari dua opsi docs/02 Bagian 3.2.
   *
   * @param kanalDeret [{kanal, bacaan}] satu untuk scalar, tiga untuk vector3
   * @param tma        [[waktu, mdpl]] untuk overlay sumbu-y kedua
   * @param envelope   fungsi(tma) -> {median, sigma} | null, boleh null
   * @param k          pengali sigma yang menandai batas rentang normal
   */
  function deretUtama(el, kanalDeret, tma, envelope, k) {
    if (!el || !kanalDeret || !kanalDeret.length) return null;
    var satuan = kanalDeret[0].kanal.satuan;
    var tmaPer = {};
    (tma || []).forEach(function (d) { tmaPer[d[0].slice(0, 10)] = d[1]; });

    var seri = [];

    // --- pita envelope --------------------------------------------------
    // Dua deret bertumpuk: batas bawah tak terlihat, lalu ketebalan pita.
    // Bin tanpa cukup sampel menghasilkan null dan ECharts memutus areanya
    // di situ. Envelope tanpa dasar tidak digambar seolah punya dasar.
    if (envelope && kanalDeret.length === 1) {
      var bawah = [], tebal = [];
      kanalDeret[0].bacaan.forEach(function (b) {
        var e = envelope(tmaPer[b.waktu.slice(0, 10)]);
        bawah.push([b.waktu, e ? e.median - k * e.sigma : null]);
        tebal.push([b.waktu, e ? 2 * k * e.sigma : null]);
      });
      seri.push({
        name: 'batas bawah', type: 'line', stack: 'pita', silent: true, z: 1,
        showSymbol: false, lineStyle: { opacity: 0 }, areaStyle: { opacity: 0 },
        data: bawah, tooltip: { show: false },
      });
      seri.push({
        name: 'Rentang normal', type: 'line', stack: 'pita', silent: true, z: 1,
        showSymbol: false, lineStyle: { opacity: 0 }, areaStyle: { color: PITA },
        data: tebal, tooltip: { show: false },
      });
    }

    // --- deret nilai ----------------------------------------------------
    kanalDeret.forEach(function (kd, idx) {
      var baik = [], buruk = [];
      kd.bacaan.forEach(function (b) {
        // docs/04 P-4: bacaan suspect dan bad tetap terlihat, tapi
        // dikeluarkan dari garis tren supaya tidak menyeret bentuk kurva.
        if (b.quality === 'suspect' || b.quality === 'bad') {
          buruk.push({ value: [b.waktu, b.nilai_terkonversi], quality: b.quality });
          baik.push([b.waktu, null]);
        } else {
          baik.push([b.waktu, b.nilai_terkonversi]);
        }
      });

      var deret = {
        name: kd.kanal.nama, type: 'line', showSymbol: false, connectNulls: false,
        lineStyle: { width: 1.8, color: DERET[idx % DERET.length] },
        itemStyle: { color: DERET[idx % DERET.length] },
        data: baik, z: 4,
      };

      // Ambang absolut untuk kanal beraturan R-3 (patok geser, inklinometer).
      // Warna garis diambil dari status.js, bukan ditulis di sini.
      if (idx === 0 && kd.kanal.ambang) {
        deret.markLine = {
          silent: true, symbol: 'none',
          lineStyle: { type: 'dashed', width: 1 },
          data: Object.keys(kd.kanal.ambang).map(function (nama) {
            var st = S.status(nama);
            return {
              yAxis: kd.kanal.ambang[nama],
              lineStyle: { color: st.teks },
              label: { formatter: st.label, color: st.teks, fontSize: 9 },
            };
          }),
        };
      }
      seri.push(deret);

      if (buruk.length) {
        seri.push({
          name: 'Bacaan diragukan', type: 'scatter', symbol: 'pin', symbolSize: 18,
          itemStyle: { color: '#ffffff', borderColor: '#9a3412', borderWidth: 1.8 },
          data: buruk, z: 6,
          tooltip: {
            formatter: function (p) {
              var q = S.QUALITY[p.data.quality];
              return S.formatWIB(p.value[0]) + '<br/><b>' + p.value[1] + '</b> ' + satuan +
                     '<br/>' + (q ? q.label : p.data.quality);
            },
          },
        });
      }
    });

    // --- overlay TMA pada sumbu-y kedua ---------------------------------
    // Inilah yang membuat grafik bermakna secara teknis: nilai instrumen
    // hanya bisa dinilai relatif terhadap TMA yang menggerakkannya.
    if (tma && tma.length) {
      seri.push({
        name: 'TMA', type: 'line', yAxisIndex: 1, showSymbol: false, z: 2,
        lineStyle: { width: 1.4, color: TMA_WARNA, type: 'dashed' },
        data: tma,
      });
    }

    var grafik = echarts.init(el, null, { renderer: 'svg' });
    grafik.setOption({
      animation: false,
      grid: { left: 62, right: 64, top: 46, bottom: 30 },
      legend: {
        top: 0, left: 'center', itemWidth: 18, itemHeight: 10,
        textStyle: { fontSize: 10, color: NETRAL },
        data: seri.map(function (x) { return x.name; })
                  .filter(function (n) { return n !== 'batas bawah'; }),
      },
      tooltip: {
        trigger: 'axis',
        formatter: function (ps) {
          var baris = [S.formatWIB(ps[0].value[0])];
          ps.forEach(function (p) {
            if (p.seriesName === 'batas bawah' || p.value[1] == null) return;
            var u = satuan;
            if (p.seriesName === 'TMA') u = 'mdpl';
            else if (p.seriesName === 'Rentang normal') u = satuan + ' (lebar pita)';
            baris.push(p.marker + ' ' + p.seriesName + ': <b>' +
                       Number(p.value[1]).toFixed(3) + '</b> ' + u);
          });
          return baris.join('<br/>');
        },
      },
      xAxis: {
        type: 'time',
        axisLine: { lineStyle: { color: GARIS } },
        axisLabel: {
          color: NETRAL, fontSize: 10, hideOverlap: true,
          formatter: function (v) {
            return S.formatTanggalWIB(new Date(v).toISOString()).replace(' WIB', '');
          },
        },
      },
      yAxis: [
        {
          type: 'value', scale: true, name: satuan,
          nameTextStyle: { color: NETRAL, fontSize: 10 },
          axisLabel: { color: NETRAL, fontSize: 10 },
          splitLine: { lineStyle: { color: GARIS } },
        },
        {
          type: 'value', scale: true, name: 'TMA mdpl', position: 'right',
          nameTextStyle: { color: TMA_WARNA, fontSize: 10 },
          axisLabel: { color: TMA_WARNA, fontSize: 10 },
          splitLine: { show: false },
        },
      ],
      series: seri,
    });
    return grafik;
  }

  /**
   * Kanal `profile`, docs/02 Bagian 3.2: deviasi terhadap KEDALAMAN, bukan
   * satu angka terhadap waktu.
   *
   * Sumbu kedalaman dibalik supaya permukaan berada di atas, seperti gambar
   * inklinometer pada umumnya. Beberapa tanggal ditumpuk, dari pudar (lama)
   * ke pekat (baru), sehingga arah perkembangan terbaca sekali lihat.
   * Tanpa overlay TMA — inklinometer tidak dinilai terhadap TMA.
   */
  function profilKedalaman(el, kanal, bacaan) {
    if (!el || !bacaan || !bacaan.length) return null;
    var n = bacaan.length;

    var seri = bacaan.map(function (b, i) {
      var pekat = 0.28 + 0.72 * (n === 1 ? 1 : i / (n - 1));
      var warna = 'rgba(3,105,161,' + pekat.toFixed(2) + ')';
      return {
        name: S.formatTanggalWIB(b.waktu).replace(' WIB', ''),
        type: 'line', showSymbol: true, symbolSize: 5,
        lineStyle: { width: i === n - 1 ? 2.4 : 1.2, color: warna },
        itemStyle: { color: warna },
        data: (b.nilai_terkonversi || []).map(function (t) { return [t[1], t[0]]; }),
      };
    });

    if (kanal.ambang && seri.length) {
      seri[seri.length - 1].markLine = {
        silent: true, symbol: 'none',
        lineStyle: { type: 'dashed', width: 1 },
        data: Object.keys(kanal.ambang).map(function (nama) {
          var st = S.status(nama);
          return {
            xAxis: kanal.ambang[nama],
            lineStyle: { color: st.teks },
            label: { formatter: st.label, color: st.teks, fontSize: 9 },
          };
        }),
      };
    }

    var grafik = echarts.init(el, null, { renderer: 'svg' });
    grafik.setOption({
      animation: false,
      grid: { left: 64, right: 24, top: 34, bottom: 44 },
      legend: {
        top: 0, right: 0, itemWidth: 18, itemHeight: 10,
        textStyle: { fontSize: 10, color: NETRAL },
      },
      tooltip: {
        trigger: 'item',
        formatter: function (p) {
          return p.seriesName + ' WIB<br/>kedalaman <b>' + p.value[1] + '</b> m' +
                 '<br/>deviasi <b>' + p.value[0] + '</b> ' + kanal.satuan;
        },
      },
      xAxis: {
        type: 'value', name: 'deviasi (' + kanal.satuan + ')',
        nameLocation: 'middle', nameGap: 24,
        nameTextStyle: { color: NETRAL, fontSize: 10 },
        axisLabel: { color: NETRAL, fontSize: 10 },
        splitLine: { lineStyle: { color: GARIS } },
      },
      yAxis: {
        type: 'value', inverse: true, name: 'kedalaman (m)',
        nameLocation: 'middle', nameGap: 40, nameRotate: 90,
        nameTextStyle: { color: NETRAL, fontSize: 10 },
        axisLabel: { color: NETRAL, fontSize: 10 },
        splitLine: { lineStyle: { color: GARIS } },
      },
      series: seri,
    });
    return grafik;
  }

  /**
   * Sebaran nilai terhadap TMA, docs/02 Bagian 3.5.
   *
   * Sebaran historis, garis median, pita envelope, dan bacaan terakhir
   * disorot. Ini visual paling meyakinkan bagi engineer klien: konsep
   * envelope korelasi tertangkap sekali lihat, tanpa perlu dijelaskan.
   */
  function sebaranTMA(el, kanal, titik, envelope, terakhir, k) {
    if (!el || !titik || !titik.length) return null;

    var nilaiTMA = titik.map(function (t) { return t[0]; });
    var min = Math.min.apply(null, nilaiTMA);
    var maks = Math.max.apply(null, nilaiTMA);
    var langkah = Math.max(0.05, (maks - min) / 80);

    // Pita digambar sebagai poligon, BUKAN dua deret bertumpuk.
    // `stack` ECharts menumpuk pada sumbu kategori; di sumbu bertipe value
    // penumpukan meleset ke dimensi yang salah sehingga sumbu-X ikut
    // dijumlahkan dan pita berubah jadi garis diagonal sampai 200 mdpl.
    // Bug ini tidak muncul di grafik utama karena sumbunya bertipe time.
    var med = [], segmen = [], jalan = [];
    for (var t = min; t <= maks + 1e-9; t += langkah) {
      var e = envelope ? envelope(t) : null;
      med.push([t, e ? e.median : null]);
      if (e) {
        jalan.push([t, e.median - k * e.sigma, e.median + k * e.sigma]);
      } else if (jalan.length > 1) {
        segmen.push(jalan); jalan = [];
      } else {
        jalan = [];
      }
    }
    if (jalan.length > 1) segmen.push(jalan);

    // Batas sumbu ditetapkan eksplisit. Seri `custom` memakai indeks segmen
    // sebagai datanya, dan ECharts ikut memasukkan indeks itu ke perhitungan
    // rentang sumbu — sumbu-X tertarik sampai nol dan seluruh sebaran
    // menggumpal di satu pojok. Dengan batas eksplisit, seri custom tidak
    // lagi bisa menyeret skala.
    var semuaY = titik.map(function (t) { return t[1]; });
    segmen.forEach(function (seg) {
      seg.forEach(function (p) { semuaY.push(p[1], p[2]); });
    });
    if (terakhir) semuaY.push(terakhir[1]);
    var yMin = Math.min.apply(null, semuaY), yMaks = Math.max.apply(null, semuaY);
    var yPad = Math.max(1e-3, (yMaks - yMin) * 0.08);
    var xPad = Math.max(1e-3, (maks - min) * 0.04);

    var st = S.status(kanal.status);
    var grafik = echarts.init(el, null, { renderer: 'svg' });
    grafik.setOption({
      animation: false,
      grid: { left: 62, right: 20, top: 30, bottom: 42 },
      legend: {
        top: 0, right: 0, itemWidth: 18, itemHeight: 10,
        textStyle: { fontSize: 10, color: NETRAL },
        data: ['Riwayat', 'Median', 'Rentang normal', 'Bacaan terakhir'],
      },
      tooltip: {
        trigger: 'item',
        formatter: function (p) {
          if (!p.value || p.value[1] == null) return '';
          return 'TMA <b>' + Number(p.value[0]).toFixed(2) + '</b> mdpl<br/>' +
                 p.seriesName + ' <b>' + Number(p.value[1]).toFixed(3) + '</b> ' + kanal.satuan;
        },
      },
      xAxis: {
        type: 'value', min: min - xPad, max: maks + xPad, name: 'TMA (mdpl)',
        nameLocation: 'middle', nameGap: 24,
        nameTextStyle: { color: NETRAL, fontSize: 10 },
        axisLabel: { color: NETRAL, fontSize: 10,
                     formatter: function (v) { return v.toFixed(1); } },
        splitLine: { lineStyle: { color: GARIS } },
      },
      yAxis: {
        type: 'value', min: yMin - yPad, max: yMaks + yPad, name: kanal.satuan,
        nameTextStyle: { color: NETRAL, fontSize: 10 },
        axisLabel: { color: NETRAL, fontSize: 10,
                     formatter: function (v) { return v.toFixed(1); } },
        splitLine: { lineStyle: { color: GARIS } },
      },
      series: [
        {
          name: 'Rentang normal', type: 'custom', silent: true, z: 1,
          data: segmen.map(function (_, i) { return i; }),
          tooltip: { show: false },
          renderItem: function (params, api) {
            var seg = segmen[params.dataIndex];
            if (!seg) return null;
            var atas = seg.map(function (p) { return api.coord([p[0], p[2]]); });
            var bawah = seg.slice().reverse().map(function (p) {
              return api.coord([p[0], p[1]]);
            });
            return { type: 'polygon', shape: { points: atas.concat(bawah) },
                     style: { fill: PITA } };
          },
        },
        {
          name: 'Riwayat', type: 'scatter', symbolSize: 4, z: 3,
          itemStyle: { color: 'rgba(113,113,122,0.42)' }, data: titik,
        },
        {
          name: 'Median', type: 'line', showSymbol: false, z: 4, connectNulls: false,
          lineStyle: { width: 1.6, color: '#57534e' }, data: med,
        },
        {
          name: 'Bacaan terakhir', type: 'scatter', symbolSize: 14, z: 8,
          itemStyle: { color: st.latar, borderColor: st.teks, borderWidth: 2.2 },
          data: terakhir ? [terakhir] : [],
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
    deretUtama: deretUtama,
    profilKedalaman: profilKedalaman,
    sebaranTMA: sebaranTMA,
    ikutiUkuran: ikutiUkuran,
  };
})(window);
