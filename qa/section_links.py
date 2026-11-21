"""Keep language switchers on section IDs present in both translations."""
from html.parser import HTMLParser
from pathlib import Path
import re
import sys


class Sections(HTMLParser):
    def __init__(self):
        super().__init__()
        self.inside_main = False
        self.ids = set()

    def handle_starttag(self, tag, attrs):
        if tag == "main":
            self.inside_main = True
        anchor = dict(attrs).get("id", "")
        if (self.inside_main and tag in {"article", "section", "span", "h2", "h3"}
                and re.fullmatch(r"[A-Za-z][\w.-]*", anchor, re.ASCII)):
            self.ids.add(anchor)

    def handle_endtag(self, tag):
        if tag == "main":
            self.inside_main = False


def apply_section_links(root):
    script_tag = re.compile(r'<script\b(?=[^>]*\bsrc="[^"]*/assets/site\.js")[^>]*>')
    pages = anchors = 0
    for ja in sorted((root / "ja").rglob("index.html")):
        en = root / "en" / ja.relative_to(root / "ja")
        if not en.is_file():
            continue
        files = (ja, en)
        texts = [file.read_text() for file in files]
        ids = []
        for source in texts:
            parser = Sections()
            parser.feed(source)
            ids.append(parser.ids)
        shared = sorted(ids[0] & ids[1])
        for file, source in zip(files, texts):
            def annotate(match):
                tag = re.sub(r' data-shared-sections="[^"]*"', "", match[0])
                return tag[:-1] + ' data-shared-sections="' + " ".join(shared) + '">' if shared else tag
            updated = script_tag.sub(annotate, source)
            if updated != source:
                file.write_text(updated)
        if shared and all(script_tag.search(source) for source in texts):
            pages += 1
            anchors += len(shared)
    asset = root / "assets" / "site.js"
    original = asset.read_text()
    marker = "// Bilingual section navigation"
    addition = Path(__file__).with_name("section-links.js").read_text()
    asset.write_text(original.partition(marker)[0].rstrip() + "\n\n" + addition)
    print(f"Bilingual section navigation: {pages} page pairs, {anchors} shared section IDs")


if __name__ == "__main__":
    apply_section_links(Path(sys.argv[1]))
