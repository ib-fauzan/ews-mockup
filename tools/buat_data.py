"""
buat_data.py — membangkitkan data/*.json SINTETIS untuk mockup EWS.

Jalankan dari root repo:
    python tools/buat_data.py

Butuh: numpy, pandas, openpyxl (dua terakhir hanya untuk tahap taksir)

MENGAPA SINTETIS
----------------
docs/03 Bagian 1.2: seluruh isi data/ adalah karangan, tidak ada data
bendungan asli di folder itu, tanpa pengecualian. Menggeser elevasi dengan
satu konstanta dan mengganti kode instrumen TIDAK memenuhi syarat itu —
selisih, korelasi terhadap TMA, dan seluruh bentuk perilaku tetap milik
bendungan aslinya.

Karena itu skrip bekerja dua tahap:

  1. TAKSIR      tools/parameter.py membaca data-asli/*.xlsx bila ada, dan
                 mengembalikan belasan angka agregat saja: rentang TMA,
                 amplitudo musiman, koefisien respons piezometer, lebar
                 sebaran residu, eksponen rembesan. Tanpa xlsx pun jalan.

  2. BANGKITKAN  Seluruh deret di bawah ini dibangkitkan ulang dari parameter
                 itu dengan RNG berbenih tetap. Nol bacaan asli di keluaran.

Perilaku yang dijaga tetap benar secara teknis (docs/03 Bagian 4): piezometer
tertinggal di belakang TMA dengan tundaan berbeda-beda, rembesan naik tak
linear, patok geser bergerak milimeter per bulan dengan derau besar terhadap
sinyalnya, dan derau proporsional — bukan seragam untuk semua instrumen.

AMBANG BATAS
------------
Angka ambang di bawah ini dipertahankan apa adanya dari skrip versi
sebelumnya. Penetapan ambang adalah keputusan rekayasa milik user, bukan
sesuatu yang boleh diusulkan skrip ini.
"""

import json, math, os, sys
from datetime import timedelta
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))
import parameter as par_mod

AKAR = Path(__file__).resolve().parent.parent
KELUAR = AKAR / "data"

BENIH = 20260905
SEKARANG = pd.Timestamp("2026-09-05 23:00")
HARI_RIWAYAT = 1095          # 3 tahun, cukup untuk membentuk envelope musiman
HARI_PEMBACAAN = 30          # docs/03 Bagian 4.7
HARI_PEMBACAAN_NARASI = 90   # instrumen pembawa narasi penyimpangan lambat
HARI_DRIFT = 60              # panjang penyimpangan lambat P-03

# --- Ambang (dipertahankan dari skrip user) ---------------------------------
K_WASPADA, K_SIAGA, K_AWAS = 2.5, 3.5, 4.5
LEBAR_BIN = 0.5
MIN_SAMPEL_BIN = 12
AMBANG_PATOK = {"waspada": 8.0, "siaga": 14.0, "awas": 22.0}       # mm
AMBANG_INKLINO = {"waspada": 12.0, "siaga": 20.0, "awas": 32.0}    # mm

# --- Identitas karangan ------------------------------------------------------
NAMA_BENDUNGAN = "Bendungan Sedayu"
SUNGAI = "Kali Sedayu"
PENGELOLA = "BBWS Wilayah Tengah"
LAT, LON = -7.0412, 111.3875
EL_HILIR = 68.5          # mdpl, muka air hilir; batas bawah tinggi tekan

# --- Inventaris (docs/03 Bagian 5) ------------------------------------------
N_PIEZO, N_PATOK, N_INKLINO, N_VNOTCH = 24, 16, 3, 4

# Sebaran status yang wajib ada (docs/03 Bagian 6). Ditetapkan eksplisit, tidak
# diserahkan ke kebetulan RNG — demo tidak boleh bergantung pada undian.
TARGET = {
    "P-03": "siaga",              # narasi penyimpangan lambat, docs/03 Bagian 4.6
    "P-07": "waspada",
    "P-11": "waspada",
    "VN-02": "waspada",
    "P-19": "insufficient_data",  # riwayat pendek: TMA kini di luar cakupannya
    "IN-02": "insufficient_data", # riwayat kurang dari tiga siklus tahunan
    "PG-08": "stale",
    "PG-12": "stale",
    "PG-15": "stale_kritis",
}
Z_TARGET = {"waspada": 2.9, "siaga": 3.8}
ZONA_PIEZO = ["inti", "fondasi", "tumpuan", "filter"]
# Indikator PFM-02 (erosi buluh pada kontak fondasi) wajib duduk di zona
# fondasi, dan indikator PFM-03 (rembesan lewat tubuh) di zona inti.
ZONA_KHUSUS = {"P-03": "fondasi", "P-07": "fondasi", "P-11": "inti"}


def utc(t, jam="23:00:00"):
    return t.strftime(f"%Y-%m-%dT{jam}Z")


# ============================================================================
# Pembangkitan deret dasar
# ============================================================================

def deret_tma(par, rng, tanggal):
    """docs/03 Bagian 4.1 — TMA sebagai penggerak: musiman + derau berkelembaman."""
    n = len(tanggal)
    doy = np.array([t.dayofyear for t in tanggal], dtype=float)
    # cos, bukan sin: sin menggeser puncak 91 hari sehingga musim kemarau
    # jatuh di bulan yang salah. Dengan cos, puncak tepat di tma_fase.
    musiman = par["tma_amplitudo"] * np.cos(2 * np.pi * (doy - par["tma_fase"]) / 365.25)
    galat = np.zeros(n)
    for i in range(1, n):
        galat[i] = par["tma_ar"] * galat[i - 1] + rng.normal(0, par["tma_sigma"])
    tma = par["tma_tengah"] + musiman + galat
    return np.clip(tma, par["tma_min"], par["tma_max"])


def tertunda(deret, hari):
    """Geser deret ke depan `hari`, isi awal dengan nilai pertama."""
    if hari <= 0:
        return deret.copy()
    return np.concatenate([np.full(hari, deret[0]), deret[:-hari]])


def envelope(nilai, tma, tma_kini):
    """
    Envelope R-2 binned pada TMA, median + MAD. docs/04 Bagian 2 dan 3.
    Kembalikan (median, sigma, cacah_sampel) atau None bila tidak memenuhi.
    """
    tepi = math.floor(tma_kini / LEBAR_BIN) * LEBAR_BIN
    m = (tma >= tepi) & (tma < tepi + LEBAR_BIN)
    dalam = nilai[m]
    if len(dalam) < MIN_SAMPEL_BIN:
        return None, len(dalam)
    med = float(np.median(dalam))
    sigma = 1.4826 * float(np.median(np.abs(dalam - med)))
    if sigma < 1e-6:
        return None, len(dalam)
    return (med, sigma, int(len(dalam))), len(dalam)


def status_dari_z(z):
    a = abs(z)
    if a >= K_AWAS:
        return "awas"
    if a >= K_SIAGA:
        return "siaga"
    if a >= K_WASPADA:
        return "waspada"
    return "normal"


# ============================================================================
# Instrumen skalar: piezometer, V-notch, TMA, ARR
# ============================================================================

def bangun_skalar(par, rng, tanggal, tma):
    """
    Membangkitkan seluruh instrumen berkanal `scalar` beserta deret riwayatnya.
    Mengembalikan (instrumen, kanal, pembacaan, sebaran).
    """
    instrumen, kanal, pembacaan, sebaran = [], [], [], []
    n = len(tanggal)
    tma_kini = float(tma[-1])

    def daftar():
        # (kode, jenis, zona, jadwal, satuan, nama_kanal, akhiran)
        for i in range(1, N_PIEZO + 1):
            kode_p = f"P-{i:02d}"
            zona = ZONA_KHUSUS.get(kode_p, ZONA_PIEZO[(i - 1) % len(ZONA_PIEZO)])
            yield (kode_p, "piezometer_vw", zona, 1, "mdpl", "Tinggi tekan", "head")
        for i in range(1, N_VNOTCH + 1):
            yield (f"VN-{i:02d}", "v_notch", "hilir", 1, "l/detik", "Debit rembesan", "q")
        yield ("TMA-01", "tma", "waduk", 1, "mdpl", "Tinggi muka air", "el")
        yield ("CH-01", "arr", "waduk", 1, "mm", "Curah hujan", "ch")

    for kode, jenis, zona, jadwal, satuan, nama_kanal, akhiran in daftar():
        target = TARGET.get(kode, "normal")
        id_kanal = f"{kode}-{akhiran}"

        # --- deret riwayat --------------------------------------------------
        if jenis == "piezometer_vw":
            # docs/03 Bagian 4.2 — tundaan berbeda antar instrumen; zona inti
            # (lebih dekat hulu) merespons lebih cepat daripada tumpuan.
            dasar_tundaan = {"inti": 1, "filter": 3, "fondasi": 5, "tumpuan": 6}[zona]
            tundaan = int(np.clip(dasar_tundaan + rng.integers(-1, 2), 1,
                                  par["piezo_tundaan_maks"]))
            # Tinggi tekan adalah fraksi dari selisih TMA terhadap muka air
            # hilir, bukan regresi bebas: h = el_hilir + frac*(TMA - el_hilir).
            # Model bebas menghasilkan tinggi tekan 20 mdpl saat waduk 94 mdpl —
            # mustahil secara fisik dan langsung dikenali engineer.
            pengali = {"inti": 2.2, "filter": 1.5, "fondasi": 1.0, "tumpuan": 0.72}[zona]
            frac = float(np.clip(
                rng.normal(par["piezo_koef"] * pengali, par["piezo_koef_sebar"] * 0.22),
                0.12, 0.92))
            # derau proporsional terhadap responsnya, bukan seragam (Bagian 4.5)
            sig = par["piezo_sisa_sigma"] * (0.55 + 0.9 * frac)
            nilai = EL_HILIR + frac * (tertunda(tma, tundaan) - EL_HILIR)                 + rng.normal(0, sig, n)

        elif jenis == "v_notch":
            # docs/03 Bagian 4.3 — naik mengikuti TMA, hubungannya tak linear
            # Tinggi tekan penggerak rembesan diukur dari muka air hilir, bukan
            # dari TMA minimum. Memakai TMA minimum sebagai datum membuat h
            # kecil sehingga dQ/Q = n*dh/h melonjak — rembesan tampak berubah
            # dua kali lipat hanya karena waduk naik satu meter.
            tundaan = int(rng.integers(1, 4))
            tinggi = np.maximum(tertunda(tma, tundaan) - EL_HILIR, 0.5)
            # Dikalibrasi ke debit acuan tiap ambang ukur, jadi eksponen hanya
            # mengatur kepekaan terhadap TMA — bukan skala absolutnya.
            acuan = float(rng.uniform(2.5, 9.0))          # l/detik pada TMA rata-rata
            nilai = acuan * (tinggi / tinggi.mean()) ** par["vnotch_eksponen"]
            nilai *= 1.0 + rng.normal(0, par["vnotch_sisa_rel"], n)
            nilai = np.maximum(nilai, 0.0)
            sig = float(np.std(nilai) * 0.25)

        elif jenis == "tma":
            nilai = tma + rng.normal(0, 0.01, n)
            sig = 0.01
        else:  # arr
            basah = rng.random(n) > par["hujan_hari_kering"]
            nilai = np.where(basah,
                             rng.gamma(par["hujan_bentuk"], par["hujan_skala"], n), 0.0)
            nilai = np.round(np.maximum(nilai, 0.0), 1)
            sig = 1.0

        # --- riwayat pendek untuk kasus insufficient_data -------------------
        mulai = 0
        if target == "insufficient_data":
            mulai = n - 150   # instrumen baru terpasang; cakupan TMA-nya sempit

        # --- envelope dari perilaku mapan (di luar jendela penyimpangan) ----
        riw_n, riw_t = nilai[mulai:n - HARI_DRIFT], tma[mulai:n - HARI_DRIFT]
        env, cacah_bin = envelope(riw_n, riw_t, tma_kini)

        # --- suntikkan penyimpangan agar status mendarat di target ----------
        if target in Z_TARGET and env:
            med, sigma, _ = env
            tujuan = med + Z_TARGET[target] * sigma
            selisih = tujuan - nilai[-1]
            ramp = np.linspace(0.0, selisih, HARI_DRIFT)
            nilai[n - HARI_DRIFT:] += ramp

        # --- status dan alasan ----------------------------------------------
        ambang = None
        z = med_kini = sigma_kini = None
        if target == "insufficient_data":
            # Dua sebab berbeda, dan alasannya harus cocok dengan angkanya.
            # Versi sebelumnya memakai cabang terbalik sehingga menuliskan
            # "TMA di atas cakupan" untuk TMA yang justru di dalam cakupan.
            status = "insufficient_data"
            atas = float(riw_t.max()) if len(riw_t) else tma_kini
            bawah = float(riw_t.min()) if len(riw_t) else tma_kini
            if tma_kini > atas or tma_kini < bawah:
                arah = "di atas" if tma_kini > atas else "di bawah"
                batas = atas if tma_kini > atas else bawah
                alasan = (f"TMA {tma_kini:.2f} mdpl {arah} cakupan riwayat instrumen ini "
                          f"({batas:.2f} mdpl). Penilaian envelope tidak berlaku.")
            else:
                alasan = (f"Hanya {cacah_bin} sampel historis pada rentang TMA ini, "
                          f"minimum {MIN_SAMPEL_BIN}.")
        elif jenis in ("tma", "arr") or env is None:
            status, alasan = "normal", ""
            if env is None and jenis not in ("tma", "arr"):
                status = "insufficient_data"
                alasan = (f"Hanya {cacah_bin} sampel historis pada rentang TMA ini, "
                          f"minimum {MIN_SAMPEL_BIN}.")
        else:
            med, sigma, _ = env
            z = (float(nilai[-1]) - med) / sigma
            status = status_dari_z(z)
            med_kini, sigma_kini = round(med, 3), round(sigma, 4)
            alasan = ("" if status == "normal"
                      else f"Simpangan {abs(z):.1f} sigma dari envelope korelasi TMA (R-2).")
            z = round(z, 2)

        instrumen.append({
            "id": kode, "id_bendungan": "bdg-01", "jenis": jenis,
            "lokasi": f"Zona {zona}, STA 0+{rng.integers(60, 460):03d}",
            "zona": zona,
            "lat": round(LAT + float(rng.uniform(-0.004, 0.004)), 6),
            "lon": round(LON + float(rng.uniform(-0.004, 0.004)), 6),
            "interval_jadwal_hari": jadwal,
            "status_alat": "aktif",
            "dibaca_terakhir": utc(tanggal[-1]),
            "indikator_pfm": [], "relevansi_pfm": None,
        })
        kanal.append({
            "id": id_kanal, "id_instrumen": kode, "nama": nama_kanal,
            "tipe": "scalar", "satuan": satuan,
            "aturan_utama": "R-1" if jenis == "arr" else "R-2",
            "ambang": ambang,
            "envelope": {
                "tersedia": env is not None and target != "insufficient_data",
                "median_pada_tma_sekarang": med_kini,
                "sigma": sigma_kini,
                "z_sekarang": z,
            },
            "status": status, "alasan_status": alasan,
        })

        # --- pembacaan yang diekspor ----------------------------------------
        jendela = HARI_PEMBACAAN_NARASI if kode == "P-03" else HARI_PEMBACAAN
        for i in range(n - jendela, n):
            pembacaan.append({
                "id_kanal": id_kanal,
                "waktu": utc(tanggal[i]),
                "nilai_mentah": round(float(nilai[i]), 3),
                "nilai_terkonversi": round(float(nilai[i]), 3),
                "quality": "good",
                "petugas": "Petugas OP",
            })

        # --- sebaran nilai vs TMA untuk panel scatter (docs/02 Bagian 3.5) ---
        if jenis not in ("tma", "arr"):
            langkah = max(1, (n - mulai) // 260)
            sebaran.append({
                "id_kanal": id_kanal,
                "titik": [[round(float(tma[i]), 2), round(float(nilai[i]), 3)]
                          for i in range(mulai, n, langkah)],
            })

    return instrumen, kanal, pembacaan, sebaran


# ============================================================================
# Patok geser (vector3) dan inklinometer (profile)
# ============================================================================

def bangun_patok(rng, tanggal):
    """
    docs/03 Bagian 4.4 — deformasi kumulatif orde milimeter per bulan, dengan
    derau pengukuran yang relatif besar terhadap sinyalnya. Tiga kanal per
    instrumen (dX, dY, dZ), docs/03 Bagian 3.3.
    """
    instrumen, kanal, pembacaan = [], [], []
    nama = {"dx": "Perpindahan X", "dy": "Perpindahan Y", "dz": "Penurunan Z"}

    for i in range(1, N_PATOK + 1):
        kode = f"PG-{i:02d}"
        target = TARGET.get(kode, "normal")
        # kebasian: bacaan berhenti jauh sebelum sekarang (docs/04 Bagian 2)
        umur = {"stale": 23, "stale_kritis": 61}.get(target, 0)
        terakhir = tanggal[-1] - timedelta(days=umur)

        instrumen.append({
            "id": kode, "id_bendungan": "bdg-01", "jenis": "patok_geser",
            "lokasi": f"Puncak bendungan, STA 0+{40 * i:03d}", "zona": "puncak",
            "lat": round(LAT + float(rng.uniform(-0.003, 0.003)), 6),
            "lon": round(LON + float(rng.uniform(-0.003, 0.003)), 6),
            "interval_jadwal_hari": 7,
            "status_alat": "aktif" if umur == 0 else "kalibrasi",
            "dibaca_terakhir": utc(terakhir, "03:00:00"),
            "indikator_pfm": ["PFM-01"],
            "relevansi_pfm": "primary" if i <= 3 else "secondary",
        })

        # satu patok bergerak nyata supaya sumbu vector3 tidak seragam
        sumbu_bergerak = "dz" if i == 1 else None
        for sumbu in ("dx", "dy", "dz"):
            idk = f"{kode}-{sumbu}"
            laju = 0.22 if sumbu == sumbu_bergerak else float(rng.uniform(0.02, 0.07))
            sigma = 1.1
            if target in ("stale", "stale_kritis"):
                status = target
                alasan = (f"Terakhir dibaca {umur} hari lalu. Jadwal tiap 7 hari.")
                z = None
            else:
                geser_total = laju * (HARI_PEMBACAAN_NARASI / 30.0)
                z = round(geser_total / sigma, 2)
                status = "waspada" if sumbu == sumbu_bergerak else "normal"
                alasan = ("Laju perpindahan 90 hari melampaui ambang (R-3)."
                          if status == "waspada" else "")

            kanal.append({
                "id": idk, "id_instrumen": kode, "nama": nama[sumbu],
                "tipe": "vector3", "satuan": "mm", "aturan_utama": "R-3",
                "ambang": dict(AMBANG_PATOK),
                "envelope": {"tersedia": status not in ("stale", "stale_kritis"),
                             "median_pada_tma_sekarang": 0.0,
                             "sigma": sigma if status not in ("stale", "stale_kritis") else None,
                             "z_sekarang": z},
                "status": status, "alasan_status": alasan,
            })

            for h in range(HARI_PEMBACAAN_NARASI, -1, -7):
                t = tanggal[-1] - timedelta(days=h)
                if t > terakhir:
                    continue
                nilai = laju * (HARI_PEMBACAAN_NARASI - h) / 30.0 + rng.normal(0, sigma)
                pembacaan.append({
                    "id_kanal": idk, "waktu": utc(t, "03:00:00"),
                    "nilai_mentah": round(float(nilai), 2),
                    "nilai_terkonversi": round(float(nilai), 2),
                    "quality": "good", "petugas": "Tim survei",
                })

    return instrumen, kanal, pembacaan


def bangun_inklino(rng, tanggal):
    """
    Kanal `profile`: deviasi terhadap KEDALAMAN, bukan satu angka.
    docs/03 Bagian 3.3 dan 3.4.
    """
    instrumen, kanal, pembacaan = [], [], []
    kedalaman = np.arange(0.0, 24.5, 1.5)

    for i in range(1, N_INKLINO + 1):
        kode = f"IN-{i:02d}"
        target = TARGET.get(kode, "normal")
        instrumen.append({
            "id": kode, "id_bendungan": "bdg-01", "jenis": "inklinometer",
            "lokasi": f"Lereng hilir, STA 0+{150 + 90 * i:03d}", "zona": "hilir",
            "lat": round(LAT + float(rng.uniform(-0.003, 0.003)), 6),
            "lon": round(LON + float(rng.uniform(-0.003, 0.003)), 6),
            "interval_jadwal_hari": 30, "status_alat": "aktif",
            "dibaca_terakhir": utc(tanggal[-1], "03:00:00"),
            "indikator_pfm": ["PFM-01"],
            "relevansi_pfm": "primary" if i == 1 else "secondary",
        })

        # IN-01 membawa tonjolan yang tumbuh; IN-02 riwayatnya terlalu pendek
        tumbuh = 3.2 if i == 1 else 0.35
        if target == "insufficient_data":
            status = "insufficient_data"
            alasan = ("Riwayat kurang dari tiga siklus tahunan; envelope belum "
                      "dapat dibentuk.")
        elif i == 1:
            status = "waspada"
            alasan = ("Deviasi pada kedalaman 6-9 m melampaui ambang waspada (R-3). "
                      "Kedalaman lain masih normal.")
        else:
            status, alasan = "normal", ""

        kanal.append({
            "id": f"{kode}-a", "id_instrumen": kode, "nama": "Deviasi sumbu A",
            "tipe": "profile", "satuan": "mm", "aturan_utama": "R-3",
            "ambang": dict(AMBANG_INKLINO),
            "envelope": {"tersedia": target != "insufficient_data",
                         "median_pada_tma_sekarang": None,
                         "sigma": None, "z_sekarang": None},
            "status": status, "alasan_status": alasan,
        })

        if target == "insufficient_data":
            jadwal = [30, 0]
        else:
            jadwal = [90, 60, 30, 0]
        for k, h in enumerate(jadwal):
            t = tanggal[-1] - timedelta(days=h)
            profil = [[round(float(d), 1),
                       round(float(math.exp(-((d - 7.5) ** 2) / 12.0) * (3.0 + tumbuh * k)
                                   + rng.normal(0, 0.4)), 2)]
                      for d in kedalaman]
            pembacaan.append({
                "id_kanal": f"{kode}-a", "waktu": utc(t, "03:00:00"),
                "nilai_mentah": profil, "nilai_terkonversi": profil,
                "quality": "good", "petugas": "Tim survei",
            })

    return instrumen, kanal, pembacaan


# ============================================================================
# Quality flag, kejadian, PFM
# ============================================================================

def tandai_quality(pembacaan):
    """
    docs/03 Bagian 6 mensyaratkan minimal satu bacaan `suspect` dan satu
    `unverified`. docs/04 Bagian 1 (P-4): bacaan buruk ditampilkan, bukan
    disembunyikan — jadi keduanya sengaja ditaruh di instrumen yang terlihat.
    """
    def indeks(prefix):
        return [i for i, p in enumerate(pembacaan) if p["id_kanal"].startswith(prefix)]

    # salah ketik petugas: nilai terbaca sepuluh kali lipat
    ip = indeks("P-05")
    if len(ip) >= 6:
        p = pembacaan[ip[-4]]
        p["quality"] = "suspect"
        p["nilai_mentah"] = round(p["nilai_mentah"] * 10, 3)
        p["nilai_terkonversi"] = p["nilai_mentah"]

    # bacaan pemicu peringatan P-07 belum diverifikasi -> kejadian provisional
    i7 = indeks("P-07")
    if len(i7) >= 3:
        pembacaan[i7[-1]]["quality"] = "unverified"

    # beberapa bacaan hasil estimasi, tersebar
    i11 = indeks("P-11")
    if len(i11) >= 8:
        pembacaan[i11[-6]]["quality"] = "estimated"


def bangun_kejadian(kanal, tanggal):
    """
    Riwayat transisi tingkat peringatan, docs/03 Bagian 3.5.

    Level `awas` muncul HANYA sebagai kejadian lama yang sudah selesai
    (docs/03 Bagian 6). Tidak ada instrumen yang berstatus awas sekarang —
    mendemokan kondisi awas aktif mengundang pertanyaan yang tidak ingin
    dijawab di ruang rapat.
    """
    ak = tanggal[-1]

    def w(hari, jam="02:00:00"):
        return utc(ak - timedelta(days=hari), jam)

    return [
        {"waktu": w(74), "id_instrumen": "P-14", "id_kanal": "P-14-head",
         "dari": "siaga", "ke": "awas", "aturan": "R-2",
         "nilai_teramati": 89.42, "nilai_harapan": 86.90, "simpangan_z": 4.7,
         "provisional": False,
         "tindak_lanjut": "SELESAI - sumbatan pipa pengukur ditemukan dan dibersihkan "
                          "12 Juli. Bacaan kembali ke envelope dalam 3 hari."},
        {"waktu": w(71), "id_instrumen": "P-14", "id_kanal": "P-14-head",
         "dari": "awas", "ke": "normal", "aturan": "R-2",
         "nilai_teramati": 87.05, "nilai_harapan": 86.90, "simpangan_z": 0.3,
         "provisional": False,
         "tindak_lanjut": "SELESAI - dikonfirmasi pembacaan manual dua siklus."},
        {"waktu": w(41), "id_instrumen": "P-03", "id_kanal": "P-03-head",
         "dari": "normal", "ke": "waspada", "aturan": "R-2",
         "nilai_teramati": 84.88, "nilai_harapan": 84.10, "simpangan_z": 2.6,
         "provisional": False,
         "tindak_lanjut": "Pemantauan harian, inspeksi visual kaki hilir"},
        {"waktu": w(9), "id_instrumen": "P-03", "id_kanal": "P-03-head",
         "dari": "waspada", "ke": "siaga", "aturan": "R-2",
         "nilai_teramati": 85.31, "nilai_harapan": 84.10, "simpangan_z": 3.8,
         "provisional": False,
         "tindak_lanjut": "Inspeksi lapangan dijadwalkan, pembacaan dinaikkan "
                          "jadi dua kali sehari"},
        {"waktu": w(6), "id_instrumen": "VN-02", "id_kanal": "VN-02-q",
         "dari": "normal", "ke": "waspada", "aturan": "R-2",
         "nilai_teramati": 2.41, "nilai_harapan": 1.88, "simpangan_z": 2.9,
         "provisional": False,
         "tindak_lanjut": "Pengamatan kekeruhan air rembesan"},
        {"waktu": w(2), "id_instrumen": "P-07", "id_kanal": "P-07-head",
         "dari": "normal", "ke": "waspada", "aturan": "R-2",
         "nilai_teramati": 88.16, "nilai_harapan": 87.55, "simpangan_z": 2.9,
         "provisional": True,
         "tindak_lanjut": "Menunggu verifikasi bacaan pemicu"},
        {"waktu": w(1, "03:00:00"), "id_instrumen": "PG-01", "id_kanal": "PG-01-dz",
         "dari": "normal", "ke": "waspada", "aturan": "R-3",
         "nilai_teramati": 8.9, "nilai_harapan": 0.0, "simpangan_z": 2.7,
         "provisional": False,
         "tindak_lanjut": "Survei ulang untuk menyingkirkan kesalahan pengukuran"},
    ]


def bangun_pfm():
    """Register PFM, docs/03 Bagian 3.6. Statis, tanpa perhitungan."""
    return [
        {"id": "PFM-01", "nama": "Deformasi lereng hilir",
         "lokasi": "Lereng hilir STA 0+150 sampai 0+330",
         "tingkat_kepercayaan": "sedang",
         "instrumen_indikator": ["PG-01", "PG-02", "IN-01"],
         "ringkasan_rtd": "Pemantauan deformasi diperketat bila laju perpindahan "
                          "melampaui ambang waspada dua siklus berturut-turut."},
        {"id": "PFM-02", "nama": "Erosi buluh pada kontak fondasi",
         "lokasi": "Kontak fondasi zona inti STA 0+220",
         "tingkat_kepercayaan": "tinggi",
         "instrumen_indikator": ["P-03", "P-07", "VN-02"],
         "ringkasan_rtd": "Kenaikan tinggi tekan disertai kenaikan debit dan "
                          "kekeruhan rembesan menjadi dasar inspeksi segera."},
        {"id": "PFM-03", "nama": "Rembesan terkonsentrasi melalui tubuh bendungan",
         "lokasi": "Zona inti dan filter",
         "tingkat_kepercayaan": "sedang",
         "instrumen_indikator": ["VN-01", "VN-02", "P-11"],
         "ringkasan_rtd": "Pengamatan visual kaki hilir dan pengukuran kekeruhan "
                          "pada tiap kenaikan debit di luar envelope."},
        {"id": "PFM-04", "nama": "Retak transversal pada puncak",
         "lokasi": "Puncak bendungan",
         "tingkat_kepercayaan": "rendah",
         "instrumen_indikator": ["PG-08", "PG-12", "IN-02"],
         "ringkasan_rtd": "Inspeksi visual berkala; instrumen indikator saat ini "
                          "belum memberi pembacaan mutakhir."},
    ]


def tautkan_pfm(instrumen, pfm):
    """Isi indikator_pfm dan relevansi_pfm dari register, docs/04 Bagian 5.3."""
    peta = {}
    for p in pfm:
        for k, kode in enumerate(p["instrumen_indikator"]):
            peta.setdefault(kode, []).append((p["id"], "primary" if k == 0 else "secondary"))
    for ins in instrumen:
        if ins["id"] in peta:
            pasangan = peta[ins["id"]]
            ins["indikator_pfm"] = [a for a, _ in pasangan]
            ins["relevansi_pfm"] = ("primary" if any(r == "primary" for _, r in pasangan)
                                    else "secondary")


# ============================================================================
# Penulisan dan swauji
# ============================================================================

def tulis(berkas):
    os.makedirs(KELUAR, exist_ok=True)
    for nama, obj in berkas.items():
        p = KELUAR / nama
        with open(p, "w", encoding="utf-8") as f:
            json.dump(obj, f, ensure_ascii=False, separators=(",", ":"))
        print(f"  {nama:<20} {os.path.getsize(p) / 1024:7.1f} KB")


def swauji(kanal, pembacaan):
    """
    Memastikan sebaran status docs/03 Bagian 6 benar-benar terpenuhi. Kalau
    tidak, lebih baik skrip gagal sekarang daripada demo tampak seluruhnya
    hijau di depan klien.
    """
    per_instrumen = {}
    for k in kanal:
        per_instrumen.setdefault(k["id_instrumen"], []).append(k["status"])

    def cacah(st):
        return sum(1 for v in per_instrumen.values() if st in v)

    q = [p["quality"] for p in pembacaan]
    syarat = [
        ("siaga >= 1", cacah("siaga") >= 1),
        ("waspada >= 3", cacah("waspada") >= 3),
        ("insufficient_data >= 2", cacah("insufficient_data") >= 2),
        ("stale >= 2", cacah("stale") >= 2),
        ("quality suspect >= 1", q.count("suspect") >= 1),
        ("quality unverified >= 1", q.count("unverified") >= 1),
        ("tidak ada awas aktif", cacah("awas") == 0),
        ("ada kanal vector3", any(k["tipe"] == "vector3" for k in kanal)),
        ("ada kanal profile", any(k["tipe"] == "profile" for k in kanal)),
        ("alasan terisi bila bukan normal",
         all(k["alasan_status"] for k in kanal if k["status"] != "normal")),
    ]
    print("\n  swauji docs/03 Bagian 6:")
    gagal = []
    for nama, ok in syarat:
        print(f"    {'OK  ' if ok else 'GAGAL'}  {nama}")
        if not ok:
            gagal.append(nama)
    if gagal:
        raise SystemExit("\nswauji gagal: " + ", ".join(gagal))

    print("\n  sebaran status instrumen:")
    ringkas = {}
    for kode, daftar in per_instrumen.items():
        urut = ["awas", "siaga", "waspada", "stale_kritis", "stale",
                "insufficient_data", "normal"]
        tertinggi = next((s for s in urut if s in daftar), "normal")
        ringkas.setdefault(tertinggi, []).append(kode)
    for st in ["siaga", "waspada", "normal", "insufficient_data", "stale", "stale_kritis"]:
        if st in ringkas:
            d = sorted(ringkas[st])
            contoh = ", ".join(d[:3]) + (f", +{len(d) - 3} lainnya" if len(d) > 3 else "")
            print(f"    {st:<18} {len(d):>3} instrumen  ({contoh})")


def main():
    rng = np.random.default_rng(BENIH)

    par = par_mod.taksir()
    print("parameter perilaku")
    print(f"  sumber: {par['sumber']}")
    print(par_mod.ringkas({k: (round(v, 4) if isinstance(v, float) else v)
                           for k, v in par.items() if k != "sumber"}))

    tanggal = [SEKARANG - timedelta(days=d) for d in range(HARI_RIWAYAT - 1, -1, -1)]
    tma = deret_tma(par, rng, tanggal)
    print(f"\nderet TMA sintetis: {tma.min():.2f}-{tma.max():.2f} mdpl, "
          f"sekarang {tma[-1]:.2f} mdpl pada {tanggal[-1].date()}")

    ins_s, kan_s, bac_s, sebaran = bangun_skalar(par, rng, tanggal, tma)
    ins_p, kan_p, bac_p = bangun_patok(rng, tanggal)
    ins_i, kan_i, bac_i = bangun_inklino(rng, tanggal)

    instrumen = ins_s + ins_p + ins_i
    kanal = kan_s + kan_p + kan_i
    pembacaan = bac_s + bac_p + bac_i

    tandai_quality(pembacaan)
    pfm = bangun_pfm()
    tautkan_pfm(instrumen, pfm)
    kejadian = bangun_kejadian(kanal, tanggal)

    # Riwayat TMA dipotong agar rentang historis konsisten dengan deret sintetis.
    bendungan = [
        {"id": "bdg-01", "nama": NAMA_BENDUNGAN, "sungai": SUNGAI,
         "pengelola": PENGELOLA, "tipe": "urugan_zonal",
         "lat": LAT, "lon": LON,
         "tinggi_m": 33.5,
         "elevasi_puncak_mdpl": round(float(tma.max()) + 4.5, 2),
         "tma_sekarang_mdpl": round(float(tma[-1]), 2),
         "tma_diperbarui": utc(tanggal[-1]),
         "tma_historis_min": round(float(tma.min()), 2),
         "tma_historis_max": round(float(tma.max()), 2),
         "aktif": True},
        {"id": "bdg-02", "nama": "Bendungan Karangwuni", "aktif": False},
        {"id": "bdg-03", "nama": "Bendungan Tirtomulyo", "aktif": False},
    ]

    print(f"\ninstrumen={len(instrumen)}  kanal={len(kanal)}  "
          f"pembacaan={len(pembacaan)}  kejadian={len(kejadian)}  pfm={len(pfm)}\n")
    tulis({
        "bendungan.json": bendungan,
        "instrumen.json": instrumen,
        "kanal.json": kanal,
        "pembacaan.json": pembacaan,
        "kejadian.json": kejadian,
        "pfm.json": pfm,
        "sebaran.json": sebaran,
    })
    swauji(kanal, pembacaan)
    print("\nseluruh angka di data/ dibangkitkan dari parameter, bukan disalin.")


if __name__ == "__main__":
    main()
