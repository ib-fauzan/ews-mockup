/**
 * data.js — lapisan pemuatan data dan agregasi tampilan.
 *
 * docs/05 Bagian 3.2: seluruh angka lewat fetch(). Muat JSON sekali saat
 * halaman siap, simpan di store Alpine, halaman membaca dari sana. Nol angka
 * hardcode di HTML.
 *
 * Berkas ini tidak memetakan status ke warna — itu hanya milik status.js.
 */
document.addEventListener('alpine:init', function () {
  var S = window.EWSStatus;

  Alpine.store('ews', {
    siap: false,
    galat: null,
    bendungan: null,
    instrumen: [],
    kanal: [],
    pembacaan: [],
    kejadian: [],
    pfm: [],
    sebaran: [],

    // indeks turunan
    kanalPerInstrumen: {},
    sebaranPerKanal: {},
    bacaanPerKanal: {},
    agregat: {},          // id instrumen -> {peringatan, kebasian, takDapatDinilai}

    async muat() {
      try {
        var nama = ['bendungan', 'instrumen', 'kanal', 'pembacaan', 'kejadian', 'pfm',
                    'sebaran'];
        var hasil = await Promise.all(nama.map(function (n) {
          return fetch('data/' + n + '.json').then(function (r) {
            if (!r.ok) throw new Error(n + '.json ' + r.status);
            return r.json();
          });
        }));
        this.bendungan = hasil[0].filter(function (b) { return b.aktif; })[0] || hasil[0][0];
        this.instrumen = hasil[1];
        this.kanal = hasil[2];
        this.pembacaan = hasil[3];
        this.kejadian = hasil[4];
        this.pfm = hasil[5];
        this.sebaran = hasil[6];
        this._indeks();
        this._dariHash();
        this.siap = true;
      } catch (e) {
        this.galat = e.message;
      }
    },

    /**
     * Pilih instrumen dari location.hash, supaya tautan
     * instrumentasi.html#P-03 dari index.html dan dari popup peta mendarat
     * pada instrumen yang dimaksud, bukan pada yang pertama.
     */
    _dariHash() {
      var self = this;
      function terapkan() {
        var id = decodeURIComponent((location.hash || '').replace(/^#/, ''));
        if (id && self.instrumen.some(function (i) { return i.id === id; })) {
          self.terpilih = id;
        }
      }
      terapkan();
      window.addEventListener('hashchange', terapkan);
    },

    _indeks() {
      var self = this;
      this.kanalPerInstrumen = {};
      this.kanal.forEach(function (k) {
        (self.kanalPerInstrumen[k.id_instrumen] =
          self.kanalPerInstrumen[k.id_instrumen] || []).push(k);
      });
      this.sebaranPerKanal = {};
      this.sebaran.forEach(function (x) { self.sebaranPerKanal[x.id_kanal] = x; });

      this.bacaanPerKanal = {};
      this.pembacaan.forEach(function (p) {
        (self.bacaanPerKanal[p.id_kanal] = self.bacaanPerKanal[p.id_kanal] || []).push(p);
      });

      this.agregat = {};
      this.instrumen.forEach(function (i) {
        var daftar = self.kanalPerInstrumen[i.id] || [];
        self.agregat[i.id] = S.agregasiKanal(daftar.map(function (k) { return k.status; }));
      });
    },

    /**
     * Ember tampilan sebuah instrumen pada kartu ringkasan.
     *
     * Dua sumbu tidak dilebur: instrumen ditempatkan menurut tingkat
     * peringatannya, dan kebasian dibawa terpisah sebagai penanda. Instrumen
     * normal yang salah satu kanalnya basi tetap masuk baris Normal, tapi
     * membawa penanda basi — tidak pernah tampil hijau polos (docs/04 P-1).
     */
    ember(id) {
      var a = this.agregat[id] || { peringatan: null, kebasian: 0, takDapatDinilai: 0 };
      if (a.peringatan) return a.peringatan;
      if (a.kebasian === 2) return 'stale_kritis';
      if (a.kebasian === 1) return 'stale';
      return 'insufficient_data';
    },

    /** Kartu ringkasan status aset, docs/04 Bagian 5.2. */
    get ringkasan() {
      var self = this;
      var kelompok = {};
      this.instrumen.forEach(function (i) {
        var e = self.ember(i.id);
        (kelompok[e] = kelompok[e] || []).push(i.id);
      });
      return Object.keys(kelompok)
        .sort(S.bandingkanTampil)
        .map(function (kode) {
          var d = kelompok[kode].sort();
          return {
            kode: kode,
            label: S.labelStatus(kode),
            jumlah: d.length,
            nama: d.slice(0, 3).join(', '),
            sisa: Math.max(0, d.length - 3),
          };
        });
    },

    /** Cacah instrumen yang membawa penanda basi, apa pun tingkat peringatannya. */
    get jumlahBasi() {
      var self = this;
      return this.instrumen.filter(function (i) {
        return (self.agregat[i.id] || {}).kebasian > 0;
      }).length;
    },

    /**
     * Instrumen perlu perhatian, docs/02 Bagian 2.5.
     * Di atas normal, tidak dapat dinilai, atau basi. Indikator utama PFM
     * diurutkan lebih atas pada tingkat yang sama (docs/04 Bagian 5.3).
     */
    get perluPerhatian() {
      var self = this;
      return this.instrumen
        .filter(function (i) {
          var a = self.agregat[i.id];
          return a && (a.kebasian > 0 || a.takDapatDinilai > 0 ||
            (a.peringatan && a.peringatan !== 'normal'));
        })
        .map(function (i) {
          var a = self.agregat[i.id];
          var kanal = (self.kanalPerInstrumen[i.id] || []);
          var pemicu = kanal.filter(function (k) { return k.alasan_status; })[0];
          return {
            instrumen: i,
            ember: self.ember(i.id),
            kebasian: a.kebasian,
            alasan: pemicu ? pemicu.alasan_status : '',
            utama: i.relevansi_pfm === 'primary',
          };
        })
        .sort(function (x, y) {
          var px = S.peringkatStatus(x.ember), py = S.peringkatStatus(y.ember);
          if ((py === null ? -1 : py) !== (px === null ? -1 : px)) {
            return (py === null ? -1 : py) - (px === null ? -1 : px);
          }
          if (x.utama !== y.utama) return x.utama ? -1 : 1;
          return x.instrumen.id.localeCompare(y.instrumen.id);
        });
    },

    /** Kejadian terbaru lebih dulu. */
    get kejadianTerbaru() {
      return this.kejadian.slice().sort(function (a, b) {
        return new Date(b.waktu) - new Date(a.waktu);
      });
    },

    /** Deret TMA untuk sparkline. */
    get deretTMA() {
      var kanalTMA = this.kanal.filter(function (k) {
        return k.tipe === 'scalar' && k.id.indexOf('TMA') === 0;
      })[0];
      if (!kanalTMA) return [];
      return this.pembacaan
        .filter(function (p) { return p.id_kanal === kanalTMA.id; })
        .map(function (p) { return [p.waktu, p.nilai_terkonversi]; });
    },

    /**
     * Instrumen beserta status agregatnya, untuk peta denah dan penampang.
     * Status memakai ember yang sama dengan kartu ringkasan supaya peta dan
     * kartu tidak pernah bercerita berbeda tentang instrumen yang sama.
     */
    get instrumenBerstatus() {
      var self = this;
      return this.instrumen.map(function (i) {
        var kanal = self.kanalPerInstrumen[i.id] || [];
        var pemicu = kanal.filter(function (k) { return k.alasan_status; })[0];
        return Object.assign({}, i, {
          status: self.ember(i.id),
          label: pemicu ? pemicu.alasan_status : (kanal[0] ? kanal[0].nama : ''),
        });
      });
    },


    // ======================================================================
    // Halaman instrumentasi
    // ======================================================================

    terpilih: null,
    filter: { jenis: '', status: '', zona: '' },

    /** Instrumen aktif; jatuh ke yang pertama bila hash tidak dikenal. */
    get instrumenTerpilih() {
      var self = this;
      return this.instrumen.filter(function (i) { return i.id === self.terpilih; })[0] ||
             this.daftarTersaring[0] || this.instrumen[0] || null;
    },

    get daftarJenis() {
      return [...new Set(this.instrumen.map(function (i) { return i.jenis; }))].sort();
    },
    get daftarZona() {
      return [...new Set(this.instrumen.map(function (i) { return i.zona; }))].sort();
    },
    get daftarStatus() {
      var self = this;
      return [...new Set(this.instrumen.map(function (i) { return self.ember(i.id); }))]
        .sort(S.bandingkanTampil);
    },

    /**
     * Daftar instrumen setelah filter, docs/02 Bagian 3.1.
     * Statusnya memakai ember() yang sama dengan kartu ringkasan index.html,
     * supaya satu instrumen tidak pernah bercerita beda di dua halaman.
     */
    get daftarTersaring() {
      var self = this, f = this.filter;
      return this.instrumen
        .filter(function (i) {
          if (f.jenis && i.jenis !== f.jenis) return false;
          if (f.zona && i.zona !== f.zona) return false;
          if (f.status && self.ember(i.id) !== f.status) return false;
          return true;
        })
        .map(function (i) {
          return { instrumen: i, ember: self.ember(i.id),
                   kebasian: (self.agregat[i.id] || {}).kebasian || 0 };
        })
        .sort(function (a, b) {
          var pa = S.peringkatStatus(a.ember), pb = S.peringkatStatus(b.ember);
          pa = pa === null ? -1 : pa; pb = pb === null ? -1 : pb;
          if (pa !== pb) return pb - pa;
          return a.instrumen.id.localeCompare(b.instrumen.id);
        });
    },

    /** Kanal milik instrumen aktif, urut sesuai urutan di kanal.json. */
    get kanalTerpilih() {
      var i = this.instrumenTerpilih;
      return i ? (this.kanalPerInstrumen[i.id] || []) : [];
    },

    bacaan(idKanal) {
      return this.bacaanPerKanal[idKanal] || [];
    },

    /** Deret TMA sebagai [waktu, nilai]; dipakai overlay sumbu-y kedua. */
    get deretTMAOverlay() {
      var k = this.kanal.filter(function (x) { return x.id.indexOf('TMA') === 0; })[0];
      if (!k) return [];
      return this.bacaan(k.id).map(function (p) {
        return [p.waktu, p.nilai_terkonversi];
      });
    },

    /** Peta waktu -> TMA, untuk menautkan tiap bacaan ke TMA hari itu. */
    get tmaPerWaktu() {
      var peta = {};
      this.deretTMAOverlay.forEach(function (d) { peta[d[0].slice(0, 10)] = d[1]; });
      return peta;
    },

    /**
     * Envelope sebagai fungsi TMA, dibin dari sebaran historis.
     *
     * kanal.json hanya menyimpan median dan sigma pada TMA sekarang, jadi pita
     * envelope sepanjang waktu tidak bisa dibaca langsung. Bahan mentahnya
     * sudah ada di sebaran.titik, jadi binning dikerjakan di sini — cara yang
     * sama dengan generator, bukan angka baru.
     *
     * Bin yang sampelnya kurang mengembalikan null, dan pita sengaja PUTUS di
     * situ. Envelope tanpa dasar tidak boleh digambar seolah punya dasar
     * (docs/04 P-1 dalam bentuk grafik).
     *
     * LEBAR_BIN dan MIN_SAMPEL adalah parameter analisis yang mencerminkan
     * generator, bukan besaran bendungan.
     */
    envelopeUntuk(kanal, tmaKini) {
      var LEBAR_BIN = 0.5, MIN_SAMPEL = 8;
      var sb = this.sebaranPerKanal[kanal.id];
      if (!sb || !sb.titik || !sb.titik.length) return null;

      var ember = {};
      sb.titik.forEach(function (t) {
        var kunci = Math.floor(t[0] / LEBAR_BIN) * LEBAR_BIN;
        (ember[kunci] = ember[kunci] || []).push(t[1]);
      });

      function median(a) {
        var s = a.slice().sort(function (x, y) { return x - y; });
        var m = Math.floor(s.length / 2);
        return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
      }

      var tabel = {};
      Object.keys(ember).forEach(function (k) {
        var v = ember[k];
        if (v.length < MIN_SAMPEL) return;
        var med = median(v);
        var mad = median(v.map(function (x) { return Math.abs(x - med); }));
        var sigma = 1.4826 * mad;
        if (sigma < 1e-6) return;
        tabel[k] = { median: med, sigma: sigma, n: v.length };
      });

      function mentah(tma) {
        if (tma == null) return null;
        return tabel[Math.floor(tma / LEBAR_BIN) * LEBAR_BIN] || null;
      }

      // --- penjangkaran ke kanal.json -----------------------------------
      // sebaran.titik mencakup SELURUH riwayat, termasuk jendela penyimpangan
      // yang sedang diselidiki. Envelope pada kanal.json justru dibangun
      // dengan mengecualikan jendela itu — memang begitu praktiknya, karena
      // rentang normal tidak boleh ikut bergeser oleh anomali yang sedang
      // dinilai.
      //
      // Tanpa koreksi, pita hasil binning di sini menempatkan P-07 pada 1,5
      // sigma padahal statusnya waspada 2,9 sigma: grafik membantah panel di
      // sebelahnya. kanal.json yang berwenang atas envelope pada TMA
      // sekarang, jadi sebaran hanya dipakai untuk BENTUK kurva, lalu
      // digeser dan diskalakan agar berimpit dengan kanal.json di bin TMA
      // sekarang.
      var geser = 0, skala = 1;
      var env = kanal.envelope;
      var acuan = mentah(tmaKini);
      if (env && env.tersedia && acuan &&
          env.median_pada_tma_sekarang != null && env.sigma) {
        geser = env.median_pada_tma_sekarang - acuan.median;
        skala = env.sigma / acuan.sigma;
      }

      return function (tma) {
        var b = mentah(tma);
        if (!b) return null;
        return { median: b.median + geser, sigma: b.sigma * skala, n: b.n };
      };
    },

    /**
     * Pengali sigma yang menandai tepi rentang normal pada grafik.
     *
     * CATATAN: ini satu-satunya angka rekayasa yang tinggal di JS. Nilainya
     * mencerminkan K_WASPADA di tools/buat_data.py — di bawah pengali ini
     * status dinilai normal. Idealnya dibaca dari kanal.json supaya lapisan
     * tampilan tetap nol angka, tetapi penambahan field itu tidak jadi
     * dilakukan. Bila ambang berubah di generator, angka ini harus ikut.
     */
    kSigmaNormal: 2.5,

    /** Nilai terkonversi terakhir sebuah kanal; null untuk kanal profile. */
    nilaiTerakhir(idKanal) {
      var r = this.bacaan(idKanal);
      if (!r.length) return null;
      var v = r[r.length - 1].nilai_terkonversi;
      return typeof v === 'number' ? v : null;
    },

    /** Kalimat dasar penetapan ambang untuk panel penjelasan, docs/02 3.4. */
    dasarAmbang(kanal) {
      if (kanal.ambang) {
        var bagian = Object.keys(kanal.ambang).map(function (n) {
          return S.labelStatus(n).toLowerCase() + ' ' + kanal.ambang[n];
        });
        return 'Dasar ambang: nilai absolut yang ditetapkan pada kanal ini — ' +
               bagian.join(', ') + ' ' + kanal.satuan +
               ' (aturan ' + kanal.aturan_utama + ').';
      }
      if (kanal.envelope && kanal.envelope.tersedia) {
        return 'Dasar ambang: envelope korelasi TMA yang dibentuk dari riwayat ' +
               'instrumen ini. Rentang normal adalah median pada TMA yang sama ' +
               'plus minus ' + this.kSigmaNormal + ' sigma (aturan ' +
               kanal.aturan_utama + ').';
      }
      return 'Envelope belum dapat dibentuk, sehingga tidak ada ambang yang berlaku.';
    },

    /**
     * Blok tampilan per instrumen terpilih, docs/02 Bagian 3.2.
     *
     * Tiga tipe kanal wajib tampil berbeda, dan itu konsekuensi langsung dari
     * entitas kanal di model data — bukan pilihan tata letak:
     *
     *   scalar   satu blok per kanal, grafik deret waktu + overlay TMA
     *   vector3  SATU blok berisi ketiga kanal sebagai tiga deret sebidang,
     *            supaya hubungan antar sumbu terbaca (dZ bergerak sendiri
     *            berarti penurunan, bukan geser)
     *   profile  satu blok per kanal, grafik nilai terhadap kedalaman
     */
    get blokKanal() {
      var self = this;
      var daftar = this.kanalTerpilih;
      if (!daftar.length) return [];
      var tmaKini = this.bendungan ? this.bendungan.tma_sekarang_mdpl : null;

      function baris(k, r) {
        var arr = Array.isArray(r.nilai_terkonversi);
        var dev = arr ? r.nilai_terkonversi.map(function (t) { return t[1]; }) : null;
        return {
          kunci: k.id + r.waktu,
          kanal: k.nama,
          waktu: S.formatWIB(r.waktu),
          mentah: arr ? dev.length + ' titik profil' : r.nilai_mentah,
          terkonversi: arr
            ? Math.min.apply(null, dev).toFixed(2) + ' .. ' +
              Math.max.apply(null, dev).toFixed(2) + ' ' + k.satuan
            : r.nilai_terkonversi,
          lencana: S.lencanaQuality(r.quality),
          petugas: r.petugas,
        };
      }

      function tabelDari(kanalArr) {
        var rows = [];
        kanalArr.forEach(function (k) {
          self.bacaan(k.id).forEach(function (r) { rows.push(baris(k, r)); });
        });
        return rows.reverse();
      }

      var blok = [];
      var vector = daftar.filter(function (k) { return k.tipe === 'vector3'; });

      if (vector.length) {
        blok.push({
          kunci: 'v3-' + vector[0].id_instrumen,
          judul: 'Perpindahan tiga sumbu',
          tipe: 'vector3',
          kanal: vector,
          deret: vector.map(function (k) {
            return { kanal: k, bacaan: self.bacaan(k.id) };
          }),
          bacaan: null,
          envelope: null,
          sebaran: null,
          tabel: tabelDari(vector),
          catatanGrafik: 'Tiga kanal pada satu sumbu supaya hubungan antar arah ' +
                         'terbaca. Garis putus adalah ambang absolut; garis TMA ' +
                         'pada sumbu kanan. Waktu WIB.',
        });
      }

      daftar.filter(function (k) { return k.tipe !== 'vector3'; }).forEach(function (k) {
        var profil = k.tipe === 'profile';
        var env = (!profil && self.sebaranPerKanal[k.id])
          ? self.envelopeUntuk(k, tmaKini) : null;

        var sb = null;
        if (env && self.sebaranPerKanal[k.id]) {
          var akhir = self.bacaan(k.id).slice(-1)[0];
          sb = {
            titik: self.sebaranPerKanal[k.id].titik,
            terakhir: (akhir && tmaKini != null &&
                       typeof akhir.nilai_terkonversi === 'number')
              ? [tmaKini, akhir.nilai_terkonversi] : null,
          };
        }

        blok.push({
          kunci: k.id,
          judul: k.nama,
          tipe: k.tipe,
          kanal: [k],
          deret: [{ kanal: k, bacaan: self.bacaan(k.id) }],
          bacaan: [self.bacaan(k.id)],
          envelope: env,
          sebaran: sb,
          tabel: tabelDari([k]),
          catatanGrafik: profil
            ? 'Deviasi terhadap kedalaman, beberapa tanggal ditumpuk dari pudar ' +
              '(lama) ke pekat (baru). Garis putus adalah ambang absolut. ' +
              'Inklinometer tidak dinilai terhadap TMA, jadi tanpa overlay TMA.'
            : 'Area berbayang adalah rentang normal pada TMA hari itu; area ' +
              'terputus berarti sampel historis pada rentang TMA tersebut ' +
              'kurang. Garis TMA pada sumbu kanan. Waktu WIB.',
        });
      });

      return blok;
    },

    get tinggiJagaan() {
      if (!this.bendungan) return null;
      return this.bendungan.elevasi_puncak_mdpl - this.bendungan.tma_sekarang_mdpl;
    },

    /** TMA di luar rentang historis -> penilaian envelope tidak berlaku. */
    get tmaDiLuarRentang() {
      var b = this.bendungan;
      if (!b) return false;
      return b.tma_sekarang_mdpl > b.tma_historis_max ||
             b.tma_sekarang_mdpl < b.tma_historis_min;
    },
  });

  Alpine.store('ews').muat();
});
