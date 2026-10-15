#!/usr/bin/env python3
"""
Build lightweight gallery thumbnails.

    python3 scripts/make_gallery_thumbs.py

For every image in   assets/images/gallery/<tab>/
writes a WebP to     assets/images/gallery-thumbs/<tab>/<same name>.webp

The gallery grid shows the thumbnail; clicking opens the full-resolution
original in the lightbox. If a thumbnail is missing, the grid just falls
back to the original, so forgetting to run this never breaks anything -
it only makes the page slower.

Run it after adding or replacing gallery images, then commit the new
files in gallery-thumbs/. Only new or changed images are reprocessed,
and thumbnails whose original was deleted are removed.

Needs Pillow:   pip3 install Pillow
"""
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets" / "images" / "gallery"
DST = ROOT / "assets" / "images" / "gallery-thumbs"

# Rows display at most ~350 CSS px tall; x2 keeps them sharp on retina.
MAX_HEIGHT = 800
MAX_WIDTH = 1600   # caps very wide panoramas
QUALITY = 82

EXTS = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif"}


def main():
    made = skipped = removed = 0
    expected = set()

    for src in sorted(SRC.rglob("*")):
        if not src.is_file() or src.suffix.lower() not in EXTS:
            continue
        rel = src.relative_to(SRC)
        dst = (DST / rel).with_suffix(".webp")
        expected.add(dst)

        if dst.exists() and dst.stat().st_mtime >= src.stat().st_mtime:
            skipped += 1
            continue

        with Image.open(src) as im:
            im = ImageOps.exif_transpose(im)  # honour phone rotation flags
            if im.mode not in ("RGB", "RGBA"):
                im = im.convert("RGBA" if "A" in im.getbands() else "RGB")
            im.thumbnail((MAX_WIDTH, MAX_HEIGHT), Image.LANCZOS)
            dst.parent.mkdir(parents=True, exist_ok=True)
            im.save(dst, "WEBP", quality=QUALITY, method=6)

        kb_in = src.stat().st_size / 1024
        kb_out = dst.stat().st_size / 1024
        print(f"  {rel}: {kb_in:,.0f} KB -> {kb_out:,.0f} KB")
        made += 1

    if DST.exists():
        for old in DST.rglob("*.webp"):
            if old not in expected:
                old.unlink()
                print(f"  removed stale {old.relative_to(DST)}")
                removed += 1

    print(f"Done: {made} made, {skipped} up to date, {removed} removed.")


if __name__ == "__main__":
    main()
