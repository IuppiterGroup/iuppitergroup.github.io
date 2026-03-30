"""Remove Writer nav link from all site pages."""
import os
import re

site_dir = os.path.dirname(os.path.abspath(__file__))

pages = [
    "index.html", "about.html", "chrome-extensions.html",
    "contact.html", "games.html", "quotes.html",
    "research.html", "software.html", "tos.html",
]

# Remove the Writer li line (with optional surrounding whitespace/newline)
WRITER_PATTERN = re.compile(
    r'\n\s*<li><a href="writer\.html">Writer</a></li>',
    re.IGNORECASE
)

for page in pages:
    path = os.path.join(site_dir, page)
    if not os.path.exists(path):
        print(f"SKIP (not found): {page}")
        continue
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    if 'href="writer.html"' not in content:
        print(f"SKIP (no Writer link): {page}")
        continue
    new_content = WRITER_PATTERN.sub("", content)
    with open(path, "w", encoding="utf-8") as f:
        f.write(new_content)
    print(f"Reverted: {page}")

print("Done.")
