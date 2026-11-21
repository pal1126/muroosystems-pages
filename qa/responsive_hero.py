"""Generate responsive variants of the existing homepage photograph."""
from pathlib import Path
import re
import sys
from PIL import Image


def prepare_hero(root):
    assets = root / "assets"
    original = assets / "modular.jpg"
    with Image.open(original) as image:
        widths = [width for width in (480, 800, 1200) if width < image.width] + [image.width]
        for width in widths:
            height = round(image.height * width / image.width)
            target = assets / f"modular-{width}.webp"
            image.resize((width, height), Image.Resampling.LANCZOS).save(target, quality=84, method=6)
            print(f"Hero {width}px: {target.stat().st_size} bytes (JPEG: {original.stat().st_size})")
    image_tag = re.compile(r'(<figure class="hf-hero-visual">)(<img\b[^>]*\bsrc="([^"]*/assets/)modular\.jpg"[^>]*>)')
    for file in (root / "ja/index.html", root / "en/index.html", root / "index.html"):
        html = file.read_text()
        def picture(match):
            candidates = ", ".join(f"{match[3]}modular-{w}.webp {w}w" for w in widths)
            sizes = "(max-width: 760px) 100vw, (max-width: 1440px) 48vw, 700px"
            return f'{match[1]}<picture><source type="image/webp" srcset="{candidates}" sizes="{sizes}">{match[2]}</picture>'
        html, count = image_tag.subn(picture, html, count=1)
        if not count and file.parent != root and 'modular-480.webp' not in html:
            raise ValueError(f"Homepage image not found: {file}")
        if count:
            file.write_text(html)


if __name__ == "__main__":
    prepare_hero(Path(sys.argv[1]))
