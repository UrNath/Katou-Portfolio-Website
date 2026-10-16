#!/usr/bin/env python3
"""Make a real poster and silent five-second preview from an authorized video source.

Usage:
  python3 scripts/build-clip-media.py chi-c5 'https://www.youtube.com/shorts/CV0M6jECxoM'
  python3 scripts/build-clip-media.py chi-c6 'https://www.youtube.com/shorts/eFPKjgtlaHs'
  python3 scripts/build-clip-media.py miu-new /path/to/source.mp4 --wide

Requires ffmpeg and ffprobe; for YouTube URLs, also requires yt-dlp.
Only use videos you have permission to use. No complete source videos are committed.
"""
from __future__ import annotations

import argparse
import shutil
import subprocess
import tempfile
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent.parent


def run(command: list[str]) -> None:
    print("+", " ".join(command))
    subprocess.run(command, check=True)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("clip_id", help="Clip id used for poster/preview filenames")
    parser.add_argument("source", help="Local video path or original YouTube video URL")
    parser.add_argument("--wide", action="store_true", help="Use 960x540, otherwise 540x960")
    args = parser.parse_args()

    if not args.clip_id or any(c not in "abcdefghijklmnopqrstuvwxyz0123456789-" for c in args.clip_id):
        parser.error("clip_id must contain only lowercase letters, digits, and hyphens")
    for binary in ("ffmpeg", "ffprobe"):
        if not shutil.which(binary):
            parser.error(f"{binary} is not installed or not on PATH")

    width, height = (960, 540) if args.wide else (540, 960)
    poster = ROOT / "src/assets/posters" / f"{args.clip_id}.webp"
    preview = ROOT / "public/media/previews" / f"{args.clip_id}.mp4"
    poster.parent.mkdir(parents=True, exist_ok=True)
    preview.parent.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory(prefix="nk-media-") as folder:
        temp = Path(folder)
        parsed = urlparse(args.source)
        if parsed.scheme in ("http", "https"):
            if parsed.hostname not in ("youtube.com", "www.youtube.com", "youtu.be", "m.youtube.com"):
                parser.error("Remote sources must be original YouTube URLs")
            if not shutil.which("yt-dlp"):
                parser.error("Install yt-dlp first: python3 -m pip install -U yt-dlp")
            run([
                "yt-dlp", "--no-playlist", "--no-overwrites", "--no-part",
                "-f", "bestvideo[height<=720]/best[height<=720]/best",
                "--download-sections", "*00:00:00-00:00:08",
                "--force-keyframes-at-cuts",
                "-o", str(temp / "source.%(ext)s"), args.source,
            ])
            sources = sorted(temp.glob("source.*"))
            if not sources:
                raise RuntimeError("YouTube did not provide the video; use a local source file instead")
            source = sources[0]
        else:
            source = Path(args.source).expanduser().resolve()
            if not source.is_file():
                parser.error(f"Source not found: {source}")

        # Keep the original aspect ratio and crop only if necessary.
        scale = (
            f"scale={width}:{height}:force_original_aspect_ratio=increase,"
            f"crop={width}:{height}"
        )
        run([
            "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
            "-ss", "1", "-i", str(source), "-frames:v", "1",
            "-vf", scale, "-c:v", "libwebp", "-q:v", "65",
            str(poster),
        ])
        run([
            "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
            "-ss", "0", "-t", "5", "-i", str(source),
            "-an", "-vf", f"fps=15,{scale},format=yuv420p",
            "-c:v", "libx264", "-preset", "medium", "-crf", "32",
            "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(preview),
        ])
    print(f"Created {poster.relative_to(ROOT)}")
    print(f"Created {preview.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
