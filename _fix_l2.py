import glob, re

files = glob.glob('*.html')
span = '<span class="l-as-i">l</span>'
total = 0

for f in files:
    with open(f, 'r', encoding='utf-8') as fh:
        content = fh.read()
    
    # First revert ALL spans back to plain luppiter
    reverted = content.replace(span + 'uppiter', 'luppiter')
    
    # Now selectively wrap only in visible HTML body text (not in tags attributes, title, meta, mailto, href, etc.)
    # Strategy: split by HTML tags, only replace in text nodes
    def replace_visible(text):
        # Don't replace inside <title>, <meta>, or attribute values
        result = []
        i = 0
        while i < len(text):
            if text[i] == '<':
                # Find end of tag
                end = text.find('>', i)
                if end == -1:
                    result.append(text[i:])
                    break
                tag = text[i:end+1]
                result.append(tag)
                
                # If it's a <title> tag, skip until </title>
                if tag.lower().startswith('<title'):
                    close = text.find('</title>', end+1)
                    if close != -1:
                        result.append(text[end+1:close])
                        i = close
                        continue
                
                # If it's a <meta tag, already captured
                i = end + 1
            else:
                # Text node - find next tag
                next_tag = text.find('<', i)
                if next_tag == -1:
                    chunk = text[i:]
                    result.append(chunk.replace('luppiter', span + 'uppiter'))
                    break
                else:
                    chunk = text[i:next_tag]
                    result.append(chunk.replace('luppiter', span + 'uppiter'))
                    i = next_tag
        return ''.join(result)
    
    new = replace_visible(reverted)
    
    if new != content:
        with open(f, 'w', encoding='utf-8') as fh:
            fh.write(new)
        print(f'{f}: fixed')
        total += 1

print(f'Files fixed: {total}')
