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

    // indeks turunan
    kanalPerInstrumen: {},
    agregat: {},          // id instrumen -> {peringatan, kebasian, takDapatDinilai}

    async muat() {
      try {
        var nama = ['bendungan', 'instrumen', 'kanal', 'pembacaan', 'kejadian', 'pfm'];
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
        this._indeks();
        this.siap = true;
      } catch (e) {
        this.galat = e.message;
      }
    },

    _indeks() {
      var self = this;
      this.kanalPerInstrumen = {};
      this.kanal.forEach(function (k) {
        (self.kanalPerInstrumen[k.id_instrumen] =
          self.kanalPerInstrumen[k.id_instrumen] || []).push(k);
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
