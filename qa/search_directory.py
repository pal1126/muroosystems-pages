"""Expose the static directory without inactive keyword controls."""
from pathlib import Path
import sys

style = '<noscript><style>.search-workspace #site-search-form,.search-workspace .search-suggestions,.search-workspace #site-search-status,.search-workspace #site-search-results{display:none!important}</style></noscript>'
for language in ("ja", "en"):
    page = Path(sys.argv[1]) / language / "search" / "index.html"
    html = page.read_text(encoding="utf-8")
    if 'class="search-directory"' not in html or '</head>' not in html:
        raise ValueError(f"Missing search directory or document head in {page}")
    if style not in html:
        page.write_text(html.replace("</head>", style + "</head>", 1), encoding="utf-8")
