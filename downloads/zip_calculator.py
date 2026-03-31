import zipfile, os

base = os.path.dirname(os.path.abspath(__file__))
src_dir = os.path.join(base, 'iuppiter-calculator')
out_zip = os.path.join(base, 'iuppiter-calculator.zip')

include = ['manifest.json', 'popup.html', 'popup.css', 'popup.js',
           'icon16.png', 'icon48.png', 'icon128.png']

with zipfile.ZipFile(out_zip, 'w', zipfile.ZIP_DEFLATED) as zf:
    for fname in include:
        fpath = os.path.join(src_dir, fname)
        zf.write(fpath, os.path.join('iuppiter-calculator', fname))
        print(f"  Added: {fname}")

print(f"\nZip created: {out_zip}")
