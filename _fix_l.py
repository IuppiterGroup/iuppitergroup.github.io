import glob

files = glob.glob('*.html')
total = 0
span = '<span class="l-as-i">l</span>'

for f in files:
    with open(f, 'r', encoding='utf-8') as fh:
        content = fh.read()
    # Skip if already wrapped
    if span in content:
        continue
    new = content.replace('luppiter', span + 'uppiter')
    if new != content:
        changes = content.count('luppiter')
        total += changes
        with open(f, 'w', encoding='utf-8') as fh:
            fh.write(new)
        print(f'{f}: {changes}')

print(f'Total: {total}')
