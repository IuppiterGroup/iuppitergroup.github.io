import zipfile, os

src = os.path.join(os.path.dirname(__file__), 'downloads', 'iuppiter-calculator')
out = os.path.join(os.path.dirname(__file__), 'downloads', 'iuppiter-calculator.zip')

include = ['manifest.json', 'popup.html', 'popup.css', 'popup.js',
           'icon16.png', 'icon48.png', 'icon128.png']

with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as zf:
    for fname in include:
        fpath = os.path.join(src, fname)
        if os.path.exists(fpath):
            zf.write(fpath, fname)
            print(f'  added: {fname}')
        else:
            print(f'  MISSING: {fname}')

print(f'\nZip written: {out}')
