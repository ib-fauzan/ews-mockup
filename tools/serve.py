"""
serve.py — server statis untuk demo, tanpa cache.

Jalankan dari root repo:
    python tools/serve.py            # port 8080
    python tools/serve.py 9000       # port lain

MENGAPA BUKAN `python -m http.server`
-------------------------------------
Server bawaan hanya mengirim `Last-Modified` tanpa `Cache-Control`. Peramban
lalu menyimpan assets/*.js secara heuristik dan tidak bertanya lagi, sehingga
perubahan pada nav.js atau data/*.json tidak terlihat sampai muat ulang paksa.

Saat menyunting itu membingungkan. Saat demo ke klien itu berbahaya: layar
bisa menampilkan angka atau label versi lama tanpa ada tanda apa pun bahwa
yang tampil sudah basi.

Server ini mengirim `Cache-Control: no-store` untuk semua berkas, jadi
peramban selalu mengambil versi terbaru.
"""

import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

AKAR = Path(__file__).resolve().parent.parent


class TanpaCache(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, format, *args):
        # Ringkas: hanya yang bukan 200, supaya tautan mati terlihat.
        if not str(args[1]).startswith("2"):
            sys.stderr.write("%s %s\n" % (args[1], args[0]))


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
    handler = partial(TanpaCache, directory=str(AKAR))
    with ThreadingHTTPServer(("127.0.0.1", port), handler) as httpd:
        print(f"Mockup EWS di http://localhost:{port}/index.html")
        print("Cache-Control: no-store — perubahan langsung terlihat tanpa muat ulang paksa.")
        print("Ctrl+C untuk berhenti.")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nberhenti.")


if __name__ == "__main__":
    main()
