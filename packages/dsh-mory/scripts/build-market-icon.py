"""Build the marketplace-only PNG from Mory's original SVG geometry.

Requires Pillow. No font is bundled: pass --font or use a local Cooper Black /
Georgia Bold font. This helper is not part of the Node runtime build.
"""
from __future__ import annotations

import argparse
import math
import os
from pathlib import Path
import re
import xml.etree.ElementTree as ET

from PIL import Image, ImageDraw, ImageFont

PACKAGE = Path(__file__).resolve().parents[1]
SVG = PACKAGE / "icon.svg"
OUTPUT = PACKAGE / "assets" / "market-icon.png"


def find_font(explicit: str | None) -> Path:
    candidates = [Path(explicit)] if explicit else []
    fonts = Path(os.environ.get("WINDIR", "C:/Windows")) / "Fonts"
    candidates.extend([fonts / "COOPBL.TTF", fonts / "coopbl.ttf", fonts / "georgiab.ttf"])
    candidates.extend([
        Path("/usr/share/fonts/truetype/msttcorefonts/Georgia_Bold.ttf"),
        Path("/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf"),
    ])
    for path in candidates:
        if path.is_file():
            return path
    raise SystemExit("Pass --font with the path to a locally licensed bold serif font.")


def render(size: int, font_path: Path) -> Image.Image:
    root = ET.parse(SVG).getroot()
    namespace = {"svg": "http://www.w3.org/2000/svg"}
    side = float(root.attrib["viewBox"].split()[2])
    working = size * 4
    scale = working / side
    canvas = Image.new("RGBA", (working, working), (0, 0, 0, 0))
    styles = "".join(root.find("svg:defs/svg:style", namespace).itertext())
    fills: dict[str, str] = {}
    for selectors, declarations in re.findall(r"([^{}]+)\{([^{}]+)\}", styles):
        match = re.search(r"\bfill:\s*(#[0-9a-fA-F]{6})", declarations)
        if match:
            for selector in selectors.split(","):
                fills[selector.strip().removeprefix(".")] = match.group(1)

    for rect in root.findall(".//svg:rect", namespace):
        layer = Image.new("RGBA", canvas.size)
        draw = ImageDraw.Draw(layer)
        x, y, width, height = (float(rect.get(key, "0")) for key in ("x", "y", "width", "height"))
        draw.rounded_rectangle(
            (x * scale, y * scale, (x + width) * scale, (y + height) * scale),
            radius=float(rect.get("rx", "0")) * scale,
            fill=fills[rect.attrib["class"]],
        )
        transform = rect.get("transform")
        if transform:
            match = re.fullmatch(r"translate\(([-\d.]+)[, ]+([-\d.]+)\)\s+rotate\(([-\d.]+)\)", transform)
            if not match:
                raise ValueError(f"Unsupported source transform: {transform}")
            tx, ty, angle = map(float, match.groups())
            cosine, sine = math.cos(math.radians(angle)), math.sin(math.radians(angle))
            tx, ty = tx * scale, ty * scale
            layer = layer.transform(
                canvas.size,
                Image.Transform.AFFINE,
                (cosine, sine, -cosine * tx - sine * ty,
                 -sine, cosine, sine * tx - cosine * ty),
                resample=Image.Resampling.BICUBIC,
            )
        canvas.alpha_composite(layer)

    # Keep the original two-line ME.MORY lockup. A local bold serif fallback is
    # rasterized explicitly so marketplace visitors need no installed SVG font.
    text_layer = Image.new("RGBA", canvas.size)
    font = ImageFont.truetype(str(font_path), round(86 * scale))
    color = fills["cls-2"]
    for word, baseline, maximum_width in [("ME.", 198.47, 162), ("MORY", 281.47, 245)]:
        bounds = font.getbbox(word, anchor="ls")
        word_image = Image.new("RGBA", (bounds[2] - bounds[0] + 4, bounds[3] - bounds[1] + 4))
        draw = ImageDraw.Draw(word_image)
        draw.text((2 - bounds[0], 2 - bounds[1]), word, font=font, fill=color, anchor="ls")
        target_width = min(word_image.width, round(maximum_width * scale))
        if target_width != word_image.width:
            word_image = word_image.resize((target_width, word_image.height), Image.Resampling.LANCZOS)
        text_layer.alpha_composite(word_image, (round(64.68 * scale), round(baseline * scale + bounds[1] - 2)))
    text_layer = text_layer.rotate(
        1.97, resample=Image.Resampling.BICUBIC,
        center=(64.68 * scale, 198.47 * scale),
    )
    canvas.alpha_composite(text_layer)
    return canvas.resize((size, size), Image.Resampling.LANCZOS)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--font", help="Locally licensed bold serif TTF/OTF font")
    parser.add_argument("--size", type=int, default=512)
    args = parser.parse_args()
    if not 180 <= args.size <= 2048:
        parser.error("size must be between 180 and 2048 pixels")
    font = find_font(args.font)
    output = render(args.size, font)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    output.save(OUTPUT, format="PNG", optimize=True)
    with Image.open(OUTPUT) as check:
        check.verify()
    print(f"Created {OUTPUT.relative_to(PACKAGE)}: {args.size}x{args.size} PNG, {OUTPUT.stat().st_size} bytes; font: {font.name}")


if __name__ == "__main__":
    main()
