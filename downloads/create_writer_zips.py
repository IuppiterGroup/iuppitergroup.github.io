"""Create Iuppiter Writer download zips."""
import zipfile
import os
import shutil

base = os.path.dirname(os.path.abspath(__file__))
projects = os.path.join(base, "..", "..", "projects", "word-clone")
downloads = base

# --- Web version ---
web_zip_path = os.path.join(downloads, "iuppiter-writer-web.zip")
with zipfile.ZipFile(web_zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
    zf.write(os.path.join(projects, "iuppiter-writer.html"), "iuppiter-writer.html")
print(f"Created: {web_zip_path}")

# --- Desktop version ---
desktop_zip_path = os.path.join(downloads, "iuppiter-writer-desktop.zip")
with zipfile.ZipFile(desktop_zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
    zf.write(os.path.join(projects, "iuppiter_writer.py"), "iuppiter_writer.py")
    zf.write(os.path.join(downloads, "iuppiter-writer-desktop-readme.md"), "README.md")
print(f"Created: {desktop_zip_path}")

print("Done.")
