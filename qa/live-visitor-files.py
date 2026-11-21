"""Compare visitor-facing Pages URLs with the browser-tested release."""
from os import environ
from pathlib import Path
from time import sleep
from urllib.error import URLError
from urllib.request import urlopen

base = environ["SITE_URL"].rstrip("/")
assets = ["site.js", "search-engine.js", "search-excerpts.js", "site-search.js",
          "site-search-en.js", "site-search-ja.json", "site-search-en.json"]
routes = [f"{lang}/{page}" for lang in ("ja", "en")
          for page in ("", "business/", "company/", "projects/", "contact/", "search/")]
routes.extend("assets/" + name for name in assets)
for route in routes:
    path = Path("public", route)
    expected = (path / "index.html" if path.is_dir() else path).read_bytes()
    for attempt in range(4):
        try:
            with urlopen(f"{base}/{route}", timeout=20) as response:
                if response.status == 200 and response.read() == expected:
                    print("Verified", route, len(expected), "bytes")
                    break
                problem = "response differs from release"
        except (URLError, TimeoutError) as error:
            problem = str(error)
        if attempt < 3:
            sleep(5)
    else:
        raise SystemExit(f"{route}: {problem}")
