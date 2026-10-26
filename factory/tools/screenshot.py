#!/usr/bin/env python3
"""Screenshot a page with headless Firefox and split it into readable tiles.

Usage: screenshot.py <url> <width> <out-dir> <name>

Writes <out-dir>/<name>-0.png, <name>-1.png, ... and prints their paths.
A tall page shot as one image gets scaled down until the text is unreadable,
so the page is trimmed to its content and cut into 1200 px tall tiles.

200 % browser zoom on a 360 px phone lays out like a 180 px wide viewport,
so pass width 180 for the zoom check. (Firefox ignores devPixelsPerPx in
headless screenshots.)
"""
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image

TILE_HEIGHT = 1200
SHOT_HEIGHT = 12000

# The Firefox snap can only write below ~/snap/firefox/common/.
SNAP_DIR = Path.home() / "snap/firefox/common"


def main() -> None:
    url, width, out_dir, name = sys.argv[1], int(sys.argv[2]), Path(sys.argv[3]), sys.argv[4]
    out_dir.mkdir(parents=True, exist_ok=True)
    SNAP_DIR.mkdir(parents=True, exist_ok=True)
    work = Path(tempfile.mkdtemp(prefix="factory-shot-", dir=SNAP_DIR))
    try:
        (work / "profile").mkdir()
        shot = work / "shot.png"
        subprocess.run(
            ["firefox", "--headless", "--no-remote", "--profile", str(work / "profile"),
             f"--window-size={width},{SHOT_HEIGHT}", "--screenshot", str(shot), url],
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=90, check=False,
        )
        if not shot.exists():
            sys.exit(f"Firefox wrote no screenshot for {url}")

        image = Image.open(shot).convert("RGB")
        # The bottom rows can hold a border artifact, so sample the page background above them.
        background = image.getpixel((image.width - 1, image.height - 20))
        content_bottom = max(
            (y for y in range(0, image.height - 20, 4)
             if any(image.getpixel((x, y)) != background for x in range(0, image.width, 4))),
            default=0,
        ) + 16
        for index, top in enumerate(range(0, content_bottom, TILE_HEIGHT)):
            tile = out_dir / f"{name}-{index}.png"
            image.crop((0, top, image.width, min(top + TILE_HEIGHT, content_bottom))).save(tile)
            print(tile)
    finally:
        shutil.rmtree(work, ignore_errors=True)


if __name__ == "__main__":
    main()
