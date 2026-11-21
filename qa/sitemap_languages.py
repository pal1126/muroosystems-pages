"""Publish matching HTML and XML language links for indexed Pages URLs."""
import re
import sys
from html import escape
from html.parser import HTMLParser
from pathlib import Path
from xml.etree import ElementTree as ET

SITEMAP = "http://www.sitemaps.org/schemas/sitemap/0.9"
XHTML = "http://www.w3.org/1999/xhtml"


class Head(HTMLParser):
    def __init__(self):
        super().__init__()
        self.remove = []
        self.excluded = False
        self.metadata = {}

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "meta":
            key = a.get("property") or a.get("name")
            if key:
                self.metadata[key] = a.get("content", "")
        rel = a.get("rel", "").lower().split()
        if tag == "link" and ("canonical" in rel or ("alternate" in rel and a.get("hreflang") in {"ja", "en", "x-default"})):
            self.remove.append(self.get_starttag_text())
        if tag == "meta" and (a.get("http-equiv", "").lower() == "refresh" or
                (a.get("name", "").lower() == "robots" and "noindex" in a.get("content", "").lower())):
            self.excluded = True


def publish(root, base):
    base = base.rstrip("/") + "/"
    sitemap = root / "sitemap.xml"
    tree = ET.parse(sitemap)
    records = {}
    for entry in tree.getroot().findall(f"{{{SITEMAP}}}url"):
        loc = entry.findtext(f"{{{SITEMAP}}}loc", "")
        route = loc.removeprefix(base)
        if not loc.startswith(base) or not re.fullmatch(r"(?:ja|en)/(?:[\w.-]+/)*", route) or ".." in route.split("/"):
            raise ValueError(f"Unexpected sitemap URL: {loc}")
        if route in records:
            raise ValueError(f"Duplicate sitemap URL: {loc}")
        records[route] = entry

    for route, entry in records.items():
        path = root / route / "index.html"
        source = path.read_text()
        head, boundary, body = source.partition("</head>")
        parsed = Head()
        parsed.feed(head)
        if not boundary or parsed.excluded:
            raise ValueError(f"Excluded or invalid sitemap destination: {route}")
        suffix = route.split("/", 1)[1]
        variants = {lang: lang + "/" + suffix for lang in ("ja", "en")}
        if not all(other in records for other in variants.values()):
            raise ValueError(f"Unpaired sitemap URL: {route}")
        variants["x-default"] = variants["ja"]
        for original in parsed.remove:
            head = head.replace(original, "", 1)
        links = [f'<link rel="canonical" href="{escape(base + route)}">']
        meta = parsed.metadata
        if not meta.get("og:title") or not meta.get("og:description") or meta.get("og:url") != base + route:
            raise ValueError(f"Incomplete sharing metadata: {route}")
        alternate = "en_GB" if route.startswith("ja/") else "ja_JP"
        if "og:locale:alternate" not in meta:
            links.append(f'<meta property="og:locale:alternate" content="{alternate}">')
        image = meta.get("og:image") or base + "assets/muroo.png"
        alt = meta.get("og:image:alt") or "Muroosystems Corporation"
        for attr, key, value in (("property", "og:image", image), ("property", "og:image:alt", alt),
                                  ("name", "twitter:image", image), ("name", "twitter:image:alt", alt)):
            if not meta.get(key):
                links.append(f'<meta {attr}="{key}" content="{escape(value)}">')
        for child in entry.findall(f"{{{XHTML}}}link"):
            entry.remove(child)
        for lang, other in variants.items():
            attrs = {"rel": "alternate", "hreflang": lang, "href": base + other}
            ET.SubElement(entry, f"{{{XHTML}}}link", attrs)
            links.append(f'<link rel="alternate" hreflang="{lang}" href="{escape(base + other)}">')
        path.write_text(head.rstrip() + "\n" + "\n".join(links) + "\n" + boundary + body)

    ET.register_namespace("", SITEMAP)
    ET.register_namespace("xhtml", XHTML)
    ET.indent(tree, space="  ")
    tree.write(sitemap, encoding="utf-8", xml_declaration=True)
    print(f"Published {len(records)} indexed URLs and {3 * len(records)} language references")


if __name__ == "__main__":
    publish(Path(sys.argv[1]), sys.argv[2])
