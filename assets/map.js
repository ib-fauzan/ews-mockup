/**
 * map.js — pulau MapLibre.
 *
 * docs/05 Bagian 3.5: tiap peta dibungkus fungsi inisialisasi tersendiri.
 * Halaman memanggil fungsi, tidak menyusun opsi MapLibre langsung di HTML.
 *
 * Peta ini sengaja TIDAK memakai peta dasar eksternal. Dua alasan:
 *
 *   1. Bendungannya karangan. Menaruhnya di atas medan sungguhan berarti
 *      menempelkan aset fiktif pada tempat nyata, dan koordinat mana pun yang
 *      dipakai akan menunjuk ke suatu lokasi betulan.
 *   2. Demo tidak boleh bergantung pada jaringan. Ruang rapat klien bukan
 *      tempat yang baik untuk mengetahui ubin peta gagal dimuat.
 *
 * Yang digambar adalah denah situs dari data/bendungan.json — sama seperti
 * gambar tata letak instrumentasi yang biasa dipakai engineer bendungan.
 *
 * Warna status tidak ditulis di sini; semuanya dari status.js.
 */
(function (global) {
  'use strict';

  var S = global.EWSStatus;

  var WARNA = {
    latar: '#f8fafc',
    waduk: '#dbeafe',
    waduk_garis: '#93c5fd',
    tapak: '#e7e5e4',
    tapak_garis: '#a8a29e',
    puncak: '#44403c',
    pelimpah: '#d6d3d1',
    sungai: '#93c5fd',
    teks: '#52525b',
  };

  function fitur(geometri, tipe, koordinat, sifat) {
    return {
      type: 'Feature',
      properties: sifat || {},
      geometry: { type: tipe, coordinates: koordinat },
    };
  }

  function koleksi(daftar) {
    return { type: 'FeatureCollection', features: daftar };
  }

  /**
   * Denah instrumen, docs/02 Bagian 2.3.
   *
   * @param el        elemen wadah
   * @param bendungan objek bendungan (memuat geometri.denah)
   * @param titik     [{id, lon, lat, jenis, status, label}]
   * @param opsi      {onKlik}
   */
  function denahInstrumen(el, bendungan, titik, opsi) {
    if (!el || !bendungan || !bendungan.geometri || !bendungan.geometri.denah) return null;
    var d = bendungan.geometri.denah;
    var o = opsi || {};

    var peta = new maplibregl.Map({
      container: el,
      attributionControl: false,
      center: d.pusat,
      zoom: 15.4,
      minZoom: 13,
      maxZoom: 18,
      style: {
        version: 8,
        sources: {},
        layers: [{ id: 'latar', type: 'background', paint: { 'background-color': WARNA.latar } }],
      },
    });
    peta.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    peta.addControl(new maplibregl.ScaleControl({ maxWidth: 90, unit: 'metric' }), 'bottom-left');

    peta.on('load', function () {
      peta.addSource('waduk', { type: 'geojson', data: fitur(null, 'Polygon', [d.waduk]) });
      peta.addLayer({ id: 'waduk-isi', type: 'fill', source: 'waduk',
        paint: { 'fill-color': WARNA.waduk } });
      peta.addLayer({ id: 'waduk-tepi', type: 'line', source: 'waduk',
        paint: { 'line-color': WARNA.waduk_garis, 'line-width': 1 } });

      peta.addSource('sungai', { type: 'geojson', data: fitur(null, 'LineString', d.sungai) });
      peta.addLayer({ id: 'sungai-garis', type: 'line', source: 'sungai',
        paint: { 'line-color': WARNA.sungai, 'line-width': 3 } });

      peta.addSource('pelimpah', { type: 'geojson', data: fitur(null, 'Polygon', [d.pelimpah]) });
      peta.addLayer({ id: 'pelimpah-isi', type: 'fill', source: 'pelimpah',
        paint: { 'fill-color': WARNA.pelimpah } });

      peta.addSource('tapak', { type: 'geojson', data: fitur(null, 'Polygon', [d.tapak]) });
      peta.addLayer({ id: 'tapak-isi', type: 'fill', source: 'tapak',
        paint: { 'fill-color': WARNA.tapak } });
      peta.addLayer({ id: 'tapak-tepi', type: 'line', source: 'tapak',
        paint: { 'line-color': WARNA.tapak_garis, 'line-width': 1 } });

      peta.addSource('puncak', { type: 'geojson', data: fitur(null, 'LineString', d.puncak) });
      peta.addLayer({ id: 'puncak-garis', type: 'line', source: 'puncak',
        paint: { 'line-color': WARNA.puncak, 'line-width': 2.5 } });

      // --- instrumen ---------------------------------------------------
      // Warna dari status.js. Lingkaran saja tidak cukup: pengguna dengan
      // gangguan pembedaan warna dan proyektor buruk membutuhkan pembeda
      // kedua, jadi status yang tidak dapat dinilai diberi tepi putus.
      var fitur_titik = titik.map(function (t) {
        var st = S.status(t.status);
        return fitur(null, 'Point', [t.lon, t.lat], {
          id: t.id,
          jenis: t.jenis,
          label: t.label,
          status: t.status,
          warna: st.latar,
          garis: st.teks,
          jari: S.dapatDinilai(t.status) ? 6 : 5,
          // Label hanya untuk yang perlu perhatian. Melabeli 49 titik
          // dalam 400 m membuat MapLibre membuang hampir semuanya, jadi
          // justru tidak ada label yang terbaca sama sekali.
          tampilkan_label: t.status !== 'normal' ? t.id : '',
        });
      });
      peta.addSource('instrumen', { type: 'geojson', data: koleksi(fitur_titik) });
      peta.addLayer({
        id: 'instrumen-titik', type: 'circle', source: 'instrumen',
        paint: {
          'circle-radius': ['get', 'jari'],
          'circle-color': ['get', 'warna'],
          'circle-stroke-color': ['get', 'garis'],
          'circle-stroke-width': 1.6,
        },
      });
      // Label memakai Marker HTML, bukan layer symbol. Layer symbol menuntut
      // sumber `glyphs` di gaya peta, dan gaya tanpa peta dasar tidak punya
      // satu pun — text-field diterima tanpa keluhan lalu tidak menggambar
      // apa-apa. Marker HTML tidak bergantung pada glyph dan tetap bekerja
      // sepenuhnya luring.
      // Marker HTML tidak punya penghindaran tabrakan seperti layer symbol,
      // jadi label diselang-seling atas dan bawah penanda.
      titik.filter(function (t) { return t.status !== 'normal'; })
        .forEach(function (t, k) {
          var elm = document.createElement('div');
          elm.className = 'ews-peta-label';
          elm.textContent = t.id;
          var atas = k % 2 === 0;
          new maplibregl.Marker({
            element: elm,
            anchor: atas ? 'bottom' : 'top',
            offset: [0, atas ? -9 : 9],
          }).setLngLat([t.lon, t.lat]).addTo(peta);
        });

      peta.on('mouseenter', 'instrumen-titik', function () {
        peta.getCanvas().style.cursor = 'pointer';
      });
      peta.on('mouseleave', 'instrumen-titik', function () {
        peta.getCanvas().style.cursor = '';
      });
      peta.on('click', 'instrumen-titik', function (e) {
        var p = e.features[0].properties;
        new maplibregl.Popup({ closeButton: true, offset: 10 })
          .setLngLat(e.features[0].geometry.coordinates.slice())
          .setHTML(
            '<div style="font:13px system-ui;min-width:190px">' +
            '<div style="font-weight:600;margin-bottom:.25rem">' + S.escapeHTML(p.id) + '</div>' +
            '<div style="color:#71717a;margin-bottom:.35rem">' + S.escapeHTML(p.jenis) + '</div>' +
            S.lencanaStatus(p.status) +
            '<div style="margin-top:.4rem;color:#52525b">' + S.escapeHTML(p.label || '') + '</div>' +
            '<a href="instrumentasi.html#' + encodeURIComponent(p.id) + '" ' +
            'style="display:inline-block;margin-top:.5rem;color:#0369a1">Lihat instrumen &rarr;</a>' +
            '</div>')
          .addTo(peta);
        if (o.onKlik) o.onKlik(p.id);
      });

      // Bingkai ke seluruh situs: tapak, genangan, sungai, dan instrumen.
      var semua = d.tapak.concat(d.waduk, d.sungai, d.pelimpah,
        titik.map(function (t) { return [t.lon, t.lat]; }));
      var b = semua.reduce(function (a, c) {
        return [Math.min(a[0], c[0]), Math.min(a[1], c[1]),
                Math.max(a[2], c[0]), Math.max(a[3], c[1])];
      }, [180, 90, -180, -90]);
      peta.fitBounds([[b[0], b[1]], [b[2], b[3]]], { padding: 34, duration: 0 });
    });

    return peta;
  }

  global.EWSMap = { denahInstrumen: denahInstrumen };
})(window);
