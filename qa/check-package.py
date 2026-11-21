from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlsplit, unquote
import json

root = Path("public")
prefix = "/muroosystems-pages/"
base = "https://pal1126.github.io"
class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.refs = []
        self.redirect = False
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        for key in ("href", "src", "poster"):
            if a.get(key):
                self.refs.append(a[key])
        if tag == "meta" and a.get("http-equiv", "").lower() == "refresh":
            self.redirect = True
            self.refs.append(a["content"].split("=", 1)[1].strip("'\" "))

pages = sorted(root.rglob("*.html"))
errors = []
checked = redirects = pairs = 0
for file in pages:
    rel = file.relative_to(root)
    page = Page()
    page.feed(file.read_text())
    redirects += page.redirect
    if rel.parts[0] == "ja":
        pairs += 1
        if not root.joinpath("en", *rel.parts[1:]).is_file():
            errors.append(str(rel) + " missing English counterpart")
    for ref in page.refs:
        url = urlsplit(urljoin(base + prefix + rel.as_posix(), ref))
        if url.hostname != "pal1126.github.io" or url.scheme not in ("http","https"):
            continue
        checked += 1
        target = root / unquote(url.path.removeprefix(prefix)).lstrip("/")
        if target.is_dir():
            target /= "index.html"
        if not url.path.startswith(prefix) or not target.is_file():
            errors.append(f"{rel} -> {ref}")
print(json.dumps(dict(html=len(pages), redirects=redirects, language_pairs=pairs, references=checked, errors=errors[:30]), flush=True))
if errors:
    raise SystemExit(1)
