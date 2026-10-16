#!/usr/bin/env python3
"""Fetch real YouTube thumbnail images, convert to WebP, and print video metadata.

Requires Pillow. Never generates artwork: each poster is a crop of a real public
thumbnail for the exact video ID. Pass clip-id:youtube-id:orientation arguments.
"""
from __future__ import annotations
import io
import json
import sys
import urllib.parse
import urllib.request
from pathlib import Path
from PIL import Image, ImageOps, ImageStat

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "src/assets/posters"
HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; NassuKatou-Portfolio/1.0)"}


def get(url: str) -> bytes:
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=15) as res:
        return res.read()


def thumbnail(video_id: str) -> Image.Image:
    options = ["maxresdefault", "sddefault", "hqdefault"]
    for quality in options:
        try:
            img = Image.open(io.BytesIO(get(f"https://i.ytimg.com/vi/{video_id}/{quality}.jpg")))
            img.load()
            # YouTube returns a 120x90 missing-thumbnail placeholder on 404-equivalents.
            if img.width < 320 or img.height < 180:
                continue
            if sum(ImageStat.Stat(img.convert("RGB")).stddev) < 8:
                continue
            return img.convert("RGB")
        except (OSError, ValueError, TimeoutError):
            continue
    raise RuntimeError(f"No valid public YouTube thumbnail found for {video_id}")


def metadata(video_id: str) -> dict:
    url = "https://www.youtube.com/oembed?" + urllib.parse.urlencode({
        "url": f"https://www.youtube.com/watch?v={video_id}", "format": "json"
    })
    try:
        data = json.loads(get(url).decode("utf-8"))
        return {"id": video_id, "title": data.get("title"), "channel": data.get("author_name")}
    except Exception as error:
        return {"id": video_id, "error": str(error)[:200]}


def main():
    if len(sys.argv) == 1:
        raise SystemExit("Usage: python scripts/fetch-youtube-posters.py id:youtubeId:vertical|landscape...")
    OUT.mkdir(parents=True, exist_ok=True)
    for item in sys.argv[1:]:
        clip_id, video_id, orientation = item.split(":")
        if not clip_id.replace("-", "").isalnum() or len(video_id) != 11:
            raise ValueError(f"Invalid clip id or video id {item}")
        if orientation not in ("vertical", "landscape"):
            raise ValueError("Orientation must be vertical or landscape")
        print("METADATA", json.dumps(metadata(video_id), ensure_ascii=False), flush=True)
        image = thumbnail(video_id)
        size = (540, 960) if orientation == "vertical" else (960, 540)
        poster = ImageOps.fit(image, size, method=Image.Resampling.LANCZOS, centering=(0.5, 0.5))
        destination = OUT / f"{clip_id}.webp"
        poster.save(destination, "WEBP", quality=76, method=6)
        print(f"Poster created: {destination.relative_to(ROOT)}, {destination.stat().st_size} bytes", flush=True)


if __name__ == "__main__":
    main()
