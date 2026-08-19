#!/usr/bin/env python3
"""
JDM Miami Motors - Engine image downloader
------------------------------------------
Downloads all catalogue images from Facebook's CDN into per-engine folders.

WHY THIS EXISTS: the images were scraped as URLs, but Facebook CDN links carry
an expiry token (the `oe=` parameter). Run this SOON (within a few days of the
scrape) or the links will 403.

USAGE:
    python3 download_images.py

Requires: Python 3.8+, `requests`  (pip install requests)

Output: ./engine_images/<Make_Code_Displacement>/img_01.jpg, img_02.jpg, ...
        plus a catalog.csv summarising everything.
"""

import json, os, csv, time, sys

try:
    import requests
except ImportError:
    print("Please install requests first:  pip install requests")
    sys.exit(1)

MANIFEST = "download_manifest.json"
OUTDIR   = "engine_images"
HEADERS  = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                          "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"}

def main():
    if not os.path.exists(MANIFEST):
        print(f"Can't find {MANIFEST} - run this script in the same folder as it.")
        sys.exit(1)

    manifest = json.load(open(MANIFEST))
    os.makedirs(OUTDIR, exist_ok=True)

    total_imgs = sum(len(m["images"]) for m in manifest)
    print(f"{len(manifest)} engines / {total_imgs} images to download\n")

    rows = []
    ok = fail = 0
    for i, item in enumerate(manifest, 1):
        folder = os.path.join(OUTDIR, item["folder"])
        os.makedirs(folder, exist_ok=True)

        saved_files = []
        for j, url in enumerate(item["images"], 1):
            ext = ".jpg"
            fname = f"img_{j:02d}{ext}"
            fpath = os.path.join(folder, fname)
            if os.path.exists(fpath):           # resume support
                saved_files.append(fname); ok += 1; continue
            try:
                r = requests.get(url, headers=HEADERS, timeout=30)
                if r.status_code == 200 and len(r.content) > 1000:
                    with open(fpath, "wb") as f:
                        f.write(r.content)
                    saved_files.append(fname); ok += 1
                else:
                    print(f"  [{item['folder']}] img {j}: HTTP {r.status_code} "
                          f"(link may have expired)")
                    fail += 1
            except Exception as e:
                print(f"  [{item['folder']}] img {j}: {type(e).__name__}")
                fail += 1
            time.sleep(0.15)                    # be gentle

        rows.append({
            "folder": item["folder"],
            "make": item.get("make") or "",
            "code": item.get("code") or "",
            "category": item.get("category") or "",
            "fuel": item.get("fuel") or "",
            "displacement": item.get("displacement") or "",
            "images_saved": len(saved_files),
            "caption": item.get("caption") or "",
            "post_url": item.get("post_url") or "",
        })
        print(f"[{i}/{len(manifest)}] {item['folder']:28s} {len(saved_files)} imgs")

    # write summary csv
    with open("catalog.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        w.writeheader(); w.writerows(rows)

    print(f"\nDONE. {ok} downloaded, {fail} failed.")
    print(f"Images in ./{OUTDIR}/  |  summary in catalog.csv")
    if fail:
        print("\nNOTE: failures are almost always expired Facebook links. "
              "If many failed, the scrape needs re-running to refresh the URLs.")

if __name__ == "__main__":
    main()
