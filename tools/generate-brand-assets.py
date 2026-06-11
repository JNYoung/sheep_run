from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "brand"
ASSETS = ROOT / "public" / "assets" / "v1"


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    barn = Image.open(asset_path("structures/barn")).convert("RGBA")
    sheep = Image.open(asset_path("sprites/sheep/sheep_idle_south")).convert("RGBA")

    icon_1024 = make_icon(1024, barn, sheep)
    for size in (192, 512, 1024):
        icon_1024.resize((size, size), Image.Resampling.LANCZOS).save(OUT / f"icon-{size}.png")

    make_icon(1024, barn, sheep, maskable=True).resize((512, 512), Image.Resampling.LANCZOS).save(OUT / "maskable-icon-512.png")
    splash = make_splash((1080, 1920), barn, sheep)
    feature = make_feature_graphic((1024, 500), barn, sheep)
    splash.save(OUT / "splash-1080x1920.png")
    feature.save(OUT / "feature-graphic-1024x500.png")
    sync_android_assets(icon_1024, splash, feature)
    print(f"generated brand assets in {OUT}")


def make_icon(size, barn, sheep, maskable=False):
    img = vertical_gradient((size, size), (147, 220, 246), (104, 198, 94))
    draw = ImageDraw.Draw(img)
    s = size / 1024
    draw.ellipse((90 * s, 648 * s, 934 * s, 1040 * s), fill=(83, 171, 81, 255))
    draw.ellipse((140 * s, 590 * s, 884 * s, 870 * s), fill=(147, 217, 103, 255))
    draw.ellipse((706 * s, 94 * s, 850 * s, 238 * s), fill=(255, 222, 96, 255))

    barn_layer = fit_image(barn, (610 if maskable else 670) * s)
    paste_center(img, barn_layer, (size * 0.54, size * 0.59))
    sheep_layer = fit_image(sheep, (420 if maskable else 470) * s)
    paste_center(img, sheep_layer, (size * 0.46, size * 0.68))

    shade = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    shade_draw = ImageDraw.Draw(shade)
    shade_draw.rounded_rectangle((28 * s, 28 * s, size - 28 * s, size - 28 * s), radius=130 * s, outline=(255, 255, 255, 116), width=max(6, int(12 * s)))
    img.alpha_composite(shade)
    return img.convert("RGB")


def asset_path(stem):
    for suffix in (".webp", ".png"):
        candidate = ASSETS / f"{stem}{suffix}"
        if candidate.exists():
            return candidate
    raise FileNotFoundError(f"Missing runtime asset: {stem}")


def make_splash(size, barn, sheep):
    width, height = size
    img = vertical_gradient(size, (142, 221, 247), (116, 201, 95))
    draw = ImageDraw.Draw(img)
    draw.ellipse((-width * 0.14, height * 0.58, width * 1.14, height * 1.06), fill=(102, 187, 82, 255))
    draw.ellipse((width * 0.12, height * 0.49, width * 0.88, height * 0.78), fill=(159, 222, 108, 255))
    draw.ellipse((width * 0.70, height * 0.08, width * 0.84, height * 0.16), fill=(255, 225, 102, 255))

    barn_layer = fit_image(barn, width * 0.58)
    paste_center(img, barn_layer, (width * 0.52, height * 0.42))
    sheep_layer = fit_image(sheep, width * 0.42)
    paste_center(img, sheep_layer, (width * 0.45, height * 0.55))
    return img.convert("RGB")


def make_feature_graphic(size, barn, sheep):
    width, height = size
    img = vertical_gradient(size, (121, 213, 247), (120, 204, 94))
    draw = ImageDraw.Draw(img)
    draw.ellipse((-70, 314, 710, 650), fill=(98, 181, 80, 255))
    draw.ellipse((410, 246, 1120, 604), fill=(156, 221, 106, 255))
    draw.ellipse((800, 48, 900, 148), fill=(255, 224, 96, 255))

    barn_layer = fit_image(barn, 330)
    paste_center(img, barn_layer, (770, 320))
    sheep_layer = fit_image(sheep, 230)
    paste_center(img, sheep_layer, (650, 365))

    font = load_font(86)
    sub_font = load_font(30)
    draw.text((70, 145), "赶了个羊", fill=(91, 58, 36), font=font, stroke_width=4, stroke_fill=(255, 246, 214))
    draw.text((78, 252), "200 levels of cozy sheep traffic puzzles", fill=(91, 58, 36), font=sub_font)
    return img.convert("RGB")


def fit_image(source, target_width):
    width = int(target_width)
    height = int(source.height * (width / source.width))
    return source.resize((width, height), Image.Resampling.LANCZOS)


def paste_center(base, overlay, center):
    x = int(center[0] - overlay.width / 2)
    y = int(center[1] - overlay.height / 2)
    shadow = Image.new("RGBA", overlay.size, (0, 0, 0, 0))
    alpha = overlay.getchannel("A").filter(ImageFilter.GaussianBlur(max(4, overlay.width // 42)))
    shadow.putalpha(alpha.point(lambda value: int(value * 0.28)))
    base.alpha_composite(shadow, (x, y + max(6, overlay.height // 18)))
    base.alpha_composite(overlay, (x, y))


def vertical_gradient(size, top, bottom):
    width, height = size
    img = Image.new("RGBA", size)
    px = img.load()
    for y in range(height):
        t = y / max(1, height - 1)
        color = tuple(int(top[i] * (1 - t) + bottom[i] * t) for i in range(3)) + (255,)
        for x in range(width):
            px[x, y] = color
    return img


def load_font(size):
    candidates = [
        "/System/Library/Fonts/PingFang.ttc",
        "/System/Library/Fonts/STHeiti Light.ttc",
        "/Library/Fonts/Arial Unicode.ttf",
    ]
    for candidate in candidates:
        try:
            return ImageFont.truetype(candidate, size)
        except OSError:
            continue
    return ImageFont.load_default()


def sync_android_assets(icon, splash, feature):
    res = ROOT / "android" / "app" / "src" / "main" / "res"
    if not res.exists():
        return

    icon_sizes = {
        "mipmap-mdpi": 48,
        "mipmap-hdpi": 72,
        "mipmap-xhdpi": 96,
        "mipmap-xxhdpi": 144,
        "mipmap-xxxhdpi": 192,
    }
    foreground_sizes = {
        "mipmap-mdpi": 108,
        "mipmap-hdpi": 162,
        "mipmap-xhdpi": 216,
        "mipmap-xxhdpi": 324,
        "mipmap-xxxhdpi": 432,
    }
    for folder, size in icon_sizes.items():
        target_dir = res / folder
        target_dir.mkdir(parents=True, exist_ok=True)
        resized = icon.resize((size, size), Image.Resampling.LANCZOS)
        resized.save(target_dir / "ic_launcher.png")
        resized.save(target_dir / "ic_launcher_round.png")

    for folder, size in foreground_sizes.items():
        target_dir = res / folder
        target_dir.mkdir(parents=True, exist_ok=True)
        icon.resize((size, size), Image.Resampling.LANCZOS).save(target_dir / "ic_launcher_foreground.png")

    (res / "drawable").mkdir(parents=True, exist_ok=True)
    save_android_webp(splash.resize((1080, 1920), Image.Resampling.LANCZOS), res / "drawable" / "splash.webp")
    splash_sizes = {
        "mdpi": (360, 640),
        "hdpi": (540, 960),
        "xhdpi": (720, 1280),
        "xxhdpi": (1080, 1920),
        "xxxhdpi": (1440, 2560),
    }
    for density, size in splash_sizes.items():
        target_dir = res / f"drawable-port-{density}"
        target_dir.mkdir(parents=True, exist_ok=True)
        save_android_webp(splash.resize(size, Image.Resampling.LANCZOS), target_dir / "splash.webp")

        land_dir = res / f"drawable-land-{density}"
        land_dir.mkdir(parents=True, exist_ok=True)
        save_android_webp(cover(feature, (size[1], size[0])), land_dir / "splash.webp")


def cover(source, size):
    width, height = size
    scale = max(width / source.width, height / source.height)
    resized = source.resize((int(source.width * scale), int(source.height * scale)), Image.Resampling.LANCZOS)
    left = (resized.width - width) // 2
    top = (resized.height - height) // 2
    return resized.crop((left, top, left + width, top + height))


def save_android_webp(image, target):
    target.with_suffix(".png").unlink(missing_ok=True)
    image.save(target, "WEBP", quality=82, method=6)


if __name__ == "__main__":
    main()
