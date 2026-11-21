import re
import sys
from pathlib import Path

COMPANY_NAME = "NUKEM Technologies  GmbH"


def update_profiles(directory: Path) -> None:
    for lang, suffix in (("ja", "（NUKEM）"), ("en", " (NUKEM)")):
        path = directory / lang / "company" / "index.html"
        source = path.read_text()
        pattern = r'(<article id="nukem-technologies"[^>]*>(?:(?!</article>).)*?<p class="entity-name">)NUKEM Technologies\s+GmbH(?:\s*[(（]NUKEM[)）])?(</p>)'
        updated, count = re.subn(pattern, lambda m: m[1] + COMPANY_NAME + suffix + m[2], source, flags=re.S)
        if count != 1:
            raise ValueError(f"Missing NUKEM profile name: {path}")
        if updated != source:
            path.write_text(updated)


if __name__ == '__main__':
    update_profiles(Path(sys.argv[1]))
