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
        self.ids = set()
        self.destination = None
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if "id" in a:
            self.ids.add(a["id"])
        if tag == "a" and "name" in a:
            self.ids.add(a["name"])
        for key in ("href", "src", "poster"):
            if a.get(key):
                self.refs.append(a[key])
        if tag == "meta" and a.get("http-equiv", "").lower() == "refresh":
            self.redirect = True
            self.destination = a["content"].split("=", 1)[1].strip("'\" ")
            self.refs.append(self.destination)

pages = sorted(root.rglob("*.html"))
errors = []
parsed = {}
checked = redirects = pairs = 0
for file in pages:
    rel = file.relative_to(root)
    page = Page()
    page.feed(file.read_text())
    parsed[file] = page
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
section_redirects = 0
for file, page in parsed.items():
    if not page.redirect:
        continue
    source = base + prefix + file.relative_to(root).as_posix()
    url = urlsplit(urljoin(source, page.destination))
    if url.netloc != "pal1126.github.io" or not url.path.startswith(prefix):
        errors.append(f"{file}: redirect outside published site")
        continue
    target = root / unquote(url.path[len(prefix):])
    if target.is_dir():
        target /= "index.html"
    landing = parsed.get(target)
    if landing is None or landing.redirect:
        errors.append(f"{file}: expected direct HTML destination {url.geturl()}")
    elif url.fragment:
        section_redirects += 1
        if unquote(url.fragment) not in landing.ids:
            errors.append(f"{file}: missing destination section {url.fragment}")
print(json.dumps(dict(html=len(pages), redirects=redirects, language_pairs=pairs, references=checked, section_redirects=section_redirects, errors=errors[:30])), flush=True)
if errors:
    raise SystemExit(1)
