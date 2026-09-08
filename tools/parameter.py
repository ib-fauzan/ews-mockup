"""
parameter.py — tahap TAKSIR.

Membaca berkas xlsx di data-asli/ SATU KALI untuk menaksir parameter agregat,
lalu mengembalikan belasan angka ringkasan. Deret waktu aslinya dibuang di
sini dan tidak pernah keluar dari modul ini.

docs/03 Bagian 1.2 melarang data bendungan asli berada di data/, tanpa
pengecualian. Yang boleh menyeberang batas ini hanya parameter perilaku —
rentang, amplitudo musiman, koefisien respons, lebar sebaran residu — bukan
pengukuran. Dari parameter itu buat_data.py membangkitkan deret yang
sepenuhnya baru.

Bila data-asli/ tidak ada, PARAMETER_BAWAAN dipakai dan hasilnya tetap sah.
Skrip ini karena itu bisa dijalankan siapa pun tanpa memegang berkas asli.
"""

import numpy as np
import pandas as pd
from pathlib import Path

AKAR = Path(__file__).resolve().parent.parent
DIR_ASLI = AKAR / "data-asli"

# Parameter cadangan bila xlsx tidak tersedia. Angkanya masuk akal untuk
# bendungan urugan zonal sedang di iklim tropis muson.
PARAMETER_BAWAAN = {
    "sumber": "bawaan",
    "tma_min": 84.20,          # mdpl
    "tma_max": 96.80,
    "tma_tengah": 91.10,
    "tma_amplitudo": 4.30,     # setengah ayunan musiman
    "tma_fase": 60,            # hari-ke saat PUNCAK musim basah (dipakai lewat cos)
    "tma_sigma": 0.055,        # derau harian
    "tma_ar": 0.86,            # kelembaman deret TMA
    "piezo_koef": 0.62,        # dh_piezo / dTMA, rata-rata
    "piezo_koef_sebar": 0.18,  # ragam antar instrumen
    "piezo_sisa_sigma": 0.19,  # lebar sebaran residu terhadap envelope (m), <=0.50
    "piezo_tundaan_maks": 7,   # hari
    "vnotch_eksponen": 1.85,   # Q ~ (TMA - ambang)^n
    "vnotch_skala": 0.42,
    "vnotch_sisa_rel": 0.05,   # derau relatif terhadap nilai, <=0.07
    "hujan_hari_kering": 0.58, # proporsi hari tanpa hujan
    "hujan_bentuk": 0.85,      # parameter bentuk gamma
    "hujan_skala": 11.0,       # mm
}


def _muat_sheet(xl, nama):
    df = xl.parse(nama)
    df["DATE"] = pd.to_datetime(df["DATE"], errors="coerce")
    df = df.dropna(subset=["DATE"])
    kolom = [c for c in df.columns if c not in ("NO", "DATE")]
    panjang = df.melt(id_vars="DATE", value_vars=kolom, var_name="kol", value_name="nilai")
    panjang["nilai"] = pd.to_numeric(panjang["nilai"], errors="coerce")
    return panjang.dropna(subset=["nilai"])


def taksir():
    """
    Kembalikan dict parameter. Mencari xlsx mana pun di data-asli/; bila tidak
    ada, langsung pakai PARAMETER_BAWAAN.
    """
    if not DIR_ASLI.is_dir():
        return dict(PARAMETER_BAWAAN)
    berkas = sorted(DIR_ASLI.glob("*.xlsx"))
    if not berkas:
        return dict(PARAMETER_BAWAAN)

    par = dict(PARAMETER_BAWAAN)
    par["sumber"] = "taksiran dari data-asli (parameter saja)"

    try:
        xl = pd.ExcelFile(berkas[0])
        tersedia = set(xl.sheet_names)

        # --- TMA: rentang, musiman, kelembaman ---------------------------
        if "TMA" in tersedia:
            t = _muat_sheet(xl, "TMA")
            harian = t.groupby("DATE")["nilai"].mean().sort_index()
            if len(harian) > 400:
                par["tma_min"] = float(harian.quantile(0.01))
                par["tma_max"] = float(harian.quantile(0.99))
                par["tma_tengah"] = float(harian.median())
                # amplitudo musiman dari rata-rata per hari-dalam-tahun
                doy = harian.groupby(harian.index.dayofyear).mean()
                par["tma_amplitudo"] = float((doy.max() - doy.min()) / 2.0)
                par["tma_fase"] = int(doy.idxmax())
                selisih = harian.diff().dropna()
                par["tma_sigma"] = float(selisih.std())
                # koefisien AR(1) dari autokorelasi lag-1 residu musiman
                par["tma_ar"] = float(np.clip(harian.autocorr(lag=1), 0.5, 0.98))

            # --- Piezometer: koefisien respons & lebar residu -------------
            koef, sisa = [], []
            for sheet in ("PIEZOMETER-PE", "PIEZOMETER-PF", "OSP", "OW"):
                if sheet not in tersedia:
                    continue
                d = _muat_sheet(xl, sheet)
                for kol, sub in d.groupby("kol"):
                    gab = (sub.groupby("DATE")["nilai"].mean()
                              .to_frame("v").join(harian.rename("tma"), how="inner")
                              .dropna())
                    if len(gab) < 120 or gab["tma"].std() < 0.5:
                        continue
                    b, a = np.polyfit(gab["tma"], gab["v"], 1)
                    if 0.02 < b < 1.6:
                        koef.append(float(b))
                        sisa.append(float((gab["v"] - (a + b * gab["tma"])).std()))
            if len(koef) >= 3:
                par["piezo_koef"] = float(np.median(koef))
                par["piezo_koef_sebar"] = float(np.clip(np.std(koef), 0.05, 0.45))
                par["piezo_sisa_sigma"] = float(np.clip(np.median(sisa), 0.03, 0.50))

            # --- V-notch: eksponen hubungan tak linear --------------------
            if "V_NOTCH" in tersedia:
                d = _muat_sheet(xl, "V_NOTCH")
                gab = (d.groupby("DATE")["nilai"].mean()
                         .to_frame("q").join(harian.rename("tma"), how="inner").dropna())
                gab = gab[gab["q"] > 0]
                if len(gab) > 120:
                    dasar = float(gab["tma"].min()) - 0.5
                    x = np.log(np.maximum(gab["tma"] - dasar, 1e-3))
                    y = np.log(gab["q"])
                    n, _ = np.polyfit(x, y, 1)
                    if 1.3 < n < 3.5:
                        par["vnotch_eksponen"] = float(n)
                    par["vnotch_sisa_rel"] = float(np.clip(
                        (gab["q"].std() / max(gab["q"].mean(), 1e-6)) * 0.35, 0.02, 0.07))

        # --- Curah hujan: proporsi hari kering + sebaran hari basah -------
        if "CH" in tersedia:
            d = _muat_sheet(xl, "CH")
            h = d.groupby("DATE")["nilai"].sum()
            if len(h) > 300:
                par["hujan_hari_kering"] = float(np.clip((h <= 0.2).mean(), 0.3, 0.8))
                basah = h[h > 0.2]
                if len(basah) > 50:
                    m, v = float(basah.mean()), float(basah.var())
                    if v > 0:
                        par["hujan_bentuk"] = float(np.clip(m * m / v, 0.3, 3.0))
                        par["hujan_skala"] = float(np.clip(v / m, 2.0, 40.0))
    except Exception as e:  # noqa: BLE001 — taksiran gagal bukan alasan berhenti
        par = dict(PARAMETER_BAWAAN)
        par["sumber"] = f"bawaan (taksiran gagal: {type(e).__name__})"

    return par


def ringkas(par):
    lebar = max(len(k) for k in par)
    baris = [f"  {k.ljust(lebar)}  {v}" for k, v in par.items()]
    return "\n".join(baris)
