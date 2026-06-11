#!/usr/bin/env python3
from pathlib import Path
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
RES = ROOT / "android" / "app" / "src" / "main" / "res"


def convert_splash(path: Path) -> tuple[int, int]:
    before = path.stat().st_size
    with Image.open(path) as image:
        image.save(path.with_suffix(".webp"), "WEBP", quality=82, method=6)
    after = path.with_suffix(".webp").stat().st_size
    path.unlink()
    return before, after


def main() -> None:
    total_before = 0
    total_after = 0
    count = 0
    for path in sorted(RES.rglob("splash.png")):
        before, after = convert_splash(path)
        total_before += before
        total_after += after
        count += 1
        print(f"{path.relative_to(ROOT)} -> {path.with_suffix('.webp').relative_to(ROOT)} {before / 1024:.1f}KB -> {after / 1024:.1f}KB")
    print(f"optimized {count} Android splash resource(s); saved {(total_before - total_after) / 1024:.1f}KB")


if __name__ == "__main__":
    main()
