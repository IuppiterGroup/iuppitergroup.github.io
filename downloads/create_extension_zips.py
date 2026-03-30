"""
Creates distribution zips for both Chrome extensions.
Excludes dev-only files (.py scripts, .git, __pycache__, etc.)
"""
import zipfile
import os

SKIP_EXTENSIONS = {'.py'}
SKIP_DIRS = {'__pycache__', '.git', '.vscode', 'node_modules'}
SKIP_FILES = {'generate_icons.py', '.DS_Store', 'Thumbs.db'}

def add_dir_to_zip(zf, src_dir, arc_prefix):
    for root, dirs, files in os.walk(src_dir):
        # Prune unwanted dirs
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS and not d.startswith('.')]
        for fname in files:
            if fname in SKIP_FILES:
                continue
            ext = os.path.splitext(fname)[1].lower()
            if ext in SKIP_EXTENSIONS:
                continue
            filepath = os.path.join(root, fname)
            rel = os.path.relpath(filepath, src_dir)
            arcname = os.path.join(arc_prefix, rel)
            zf.write(filepath, arcname)
            print(f"  + {arcname}")

downloads_dir = os.path.dirname(os.path.abspath(__file__))

# ── Hush ──────────────────────────────────────────────────────────────────────
hush_src = r"C:\Users\Owner\.openclaw\workspace\projects\hush-extension"
hush_zip = os.path.join(downloads_dir, "hush-extension.zip")
print(f"\nPacking Hush → {hush_zip}")
with zipfile.ZipFile(hush_zip, 'w', zipfile.ZIP_DEFLATED) as zf:
    add_dir_to_zip(zf, hush_src, "hush-extension")
print("Done.")

# ── Iuppiter Tab Manager ──────────────────────────────────────────────────────
tab_src = r"C:\Users\Owner\.openclaw\workspace-main\projects\tab-manager-extension"
tab_zip = os.path.join(downloads_dir, "iuppiter-tab-manager.zip")
print(f"\nPacking Iuppiter Tab Manager → {tab_zip}")
with zipfile.ZipFile(tab_zip, 'w', zipfile.ZIP_DEFLATED) as zf:
    add_dir_to_zip(zf, tab_src, "iuppiter-tab-manager")
print("Done.")

print("\nAll zips created successfully.")
