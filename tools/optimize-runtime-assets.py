#!/usr/bin/env python3
from pathlib import Path
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
ASSET_ROOT = ROOT / "public" / "assets" / "v1"

MAX_DIMENSIONS = {
    "structures": 640,
    "sprites/sheep": 220,
    "obstacles": 256,
    "scene": 256,
    "ui": 224,
}


def max_dimension(path: Path) -> int:
    relative = path.relative_to(ASSET_ROOT).as_posix()
    for prefix, size in MAX_DIMENSIONS.items():
        if relative.startswith(prefix):
            return size
    return 256


def optimize_png(path: Path) -> tuple[int, int, tuple[int, int], tuple[int, int], Path]:
    before_size = path.stat().st_size
    with Image.open(path) as image:
        image.load()
        before_dimensions = image.size
        limit = max_dimension(path)
        if max(image.size) > limit:
            image.thumbnail((limit, limit), Image.Resampling.LANCZOS)
        if image.mode not in ("RGBA", "LA"):
            image = image.convert("RGBA")
        out = path.with_suffix(".webp")
        image.save(out, "WEBP", quality=82, method=6)
    after_size = out.stat().st_size
    with Image.open(out) as optimized:
        after_dimensions = optimized.size
    path.unlink()
    return before_size, after_size, before_dimensions, after_dimensions, out


def main() -> None:
    total_before = 0
    total_after = 0
    changed = 0
    for path in sorted(ASSET_ROOT.rglob("*.png")):
        before_size, after_size, before_dimensions, after_dimensions, out = optimize_png(path)
        total_before += before_size
        total_after += after_size
        if before_size != after_size or before_dimensions != after_dimensions:
            changed += 1
            print(
                f"{path.relative_to(ROOT)} -> {out.relative_to(ROOT)} "
                f"{before_dimensions[0]}x{before_dimensions[1]} -> {after_dimensions[0]}x{after_dimensions[1]} "
                f"{before_size / 1024:.1f}KB -> {after_size / 1024:.1f}KB"
            )
    saved = total_before - total_after
    print(f"optimized {changed} file(s); saved {saved / 1024:.1f}KB")


if __name__ == "__main__":
    main()
