"""Check that deployed homepage markup and all responsive photo assets match the release."""
from hashlib import sha256
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin
from urllib.request import urlopen
import os


class Hero(HTMLParser):
    def __init__(self):
        super().__init__()
        self.inside = False
        self.sources = []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "figure":
            self.inside = "hf-hero-visual" in a.get("class", "").split()
        if self.inside and tag in {"img", "source"}:
            self.sources.append((tag, a))

    def handle_endtag(self, tag):
        if tag == "figure":
            self.inside = False


base = os.environ["SITE_URL"].rstrip("/") + "/"
assets = set()
for lang in ("ja", "en"):
    route = f"{lang}/"
    expected = Hero()
    expected.feed(Path("public", route, "index.html").read_text())
    live = Hero()
    with urlopen(base + route, timeout=30) as response:
        live.feed(response.read().decode())
    if live.sources != expected.sources or [tag for tag, _ in live.sources] != ["source", "img"]:
        raise ValueError(f"Live hero differs from release: {route}")
    source, fallback = [attrs for _, attrs in live.sources]
    assets.update(urljoin(base, item.strip().split()[0]) for item in source["srcset"].split(","))
    assets.add(urljoin(base, fallback["src"]))
if len(assets) != 5:
    raise ValueError("Expected four shared WebP variants and one JPEG")
for url in sorted(assets):
    if not url.startswith(base + "assets/"):
        raise ValueError(url)
    path = Path("public", url.removeprefix(base))
    mime = "image/webp" if path.suffix == ".webp" else "image/jpeg"
    with urlopen(url, timeout=30) as response:
        data = response.read()
        if response.headers.get_content_type() != mime or sha256(data).digest() != sha256(path.read_bytes()).digest():
            raise ValueError(f"Published image differs: {url}")
    print("Live image verified", path.name, len(data))
