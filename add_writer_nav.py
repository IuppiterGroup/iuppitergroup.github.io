"""Add Writer link to nav on all site pages."""
import os
import re

site_dir = os.path.dirname(os.path.abspath(__file__))

# Pages to update (not writer.html — it already has it)
pages = [
    "index.html",
    "about.html",
    "chrome-extensions.html",
    "contact.html",
    "games.html",
    "quotes.html",
    "research.html",
    "software.html",
    "tos.html",
]

WRITER_LINK = '<li><a href="writer.html">Writer</a></li>'

# Insert after the Software link
SOFTWARE_PATTERN = re.compile(
    r'(<li><a href="software\.html"(?:[^>]*)>Software</a></li>)',
    re.IGNORECASE
)

for page in pages:
    path = os.path.join(site_dir, page)
    if not os.path.exists(path):
        print(f"SKIP (not found): {page}")
        continue

    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    if 'href="writer.html"' in content:
        print(f"SKIP (already has Writer link): {page}")
        continue

    new_content, count = SOFTWARE_PATTERN.subn(
        r'\1\n      ' + WRITER_LINK,
        content
    )

    if count == 0:
        print(f"WARNING: No Software link found in {page} — skipping")
        continue

    with open(path, "w", encoding="utf-8") as f:
        f.write(new_content)

    print(f"Updated: {page}")

print("Done.")
