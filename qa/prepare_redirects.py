"""Retain bookmark queries and fragments on static legacy routes."""
from pathlib import Path
import re
import sys

REFRESH = re.compile(r'<meta\b(?=[^>]*http-equiv=["\']refresh["\'])[^>]*>', re.I)
SCRIPT = """<script>
(() => {
  const link = document.querySelector('a[href]');
  if (!link) return;
  const target = new URL(link.href);
  if (target.origin !== location.origin) return;
  for (const key of new Set(new URLSearchParams(location.search).keys())) {
    if (target.searchParams.has(key)) continue;
    for (const value of new URLSearchParams(location.search).getAll(key)) target.searchParams.append(key, value);
  }
  if (!target.hash) target.hash = location.hash;
  location.replace(target.href);
})();
</script>"""


def prepare_redirects(root):
    for path in root.rglob("*.html"):
        source = path.read_text()
        refresh = REFRESH.search(source)
        if not refresh or "<noscript>" in source or not re.search(r'<a\s+[^>]*href=', source, re.I):
            continue
        source = REFRESH.sub(lambda m: "<noscript>" + m[0] + "</noscript>", source, count=1)
        source = re.sub(r"<script>(?:(?!</script>).)*location\.replace(?:(?!</script>).)*</script>", "", source, flags=re.S)
        path.write_text(source.replace("</body>", SCRIPT + "</body>", 1))


if __name__ == "__main__":
    prepare_redirects(Path(sys.argv[1]))
