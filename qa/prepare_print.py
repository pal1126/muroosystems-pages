"""Prepare bilingual corporate pages for print and PDF export."""
from pathlib import Path
from urllib.parse import urlsplit
from html import escape
import re
import shutil
import sys


def prepare_print(root, destination):
    css = "corporate-print.css"
    shutil.copyfile(Path(__file__).with_name(css), root / "assets" / css)
    prefix = urlsplit(destination).path.rstrip("/")
    link = f'<link rel="stylesheet" media="print" href="{prefix}/assets/{css}">'
    for lang in ("ja", "en"):
        for route in ("company", "projects", "business", "contact"):
            path = root / lang / route / "index.html"
            source = path.read_text()
            if link in source:
                continue
            url = escape(f"{destination.rstrip('/')}/{lang}/{route}/", quote=True)
            source, count = re.subn(r"<main\b", f'<main data-print-url="{url}"', source, count=1)
            if count != 1 or "</head>" not in source:
                raise ValueError(f"Missing document structure: {path}")
            path.write_text(source.replace("</head>", link + "\n</head>", 1))


if __name__ == "__main__":
    prepare_print(Path(sys.argv[1]), sys.argv[2])
