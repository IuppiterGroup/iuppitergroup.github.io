import os, re
from fpdf import FPDF

src = r"C:\Users\Owner\.openclaw\workspace\papers\housewife-tax-policy.md"
out = r"C:\Users\Owner\.openclaw\workspace\iuppitergroup-site\papers\housewife-tax-policy.pdf"

with open(src, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('\u2014', '--').replace('\u2013', '-')
content = content.replace('\u2018', "'").replace('\u2019', "'")
content = content.replace('\u201c', '"').replace('\u201d', '"')
content = content.replace('\u2026', '...')
content = re.sub(r'[\u200b\u200c\u200d\ufeff\u00a0]', ' ', content)
content = re.sub(r'#{1,6}\s*', '', content)
content = re.sub(r'\*\*(.+?)\*\*', r'\1', content)
content = re.sub(r'\*(.+?)\*', r'\1', content)
content = re.sub(r'\[([^\]]+)\]\([^\)]+\)', r'\1', content)
content = re.sub(r'`([^`]+)`', r'\1', content)

lines = [line.strip() for line in content.split('\n')]
lines = [l for l in lines if not re.match(r'^[-:|]+$', l)]
lines = [l.replace('|', ' ') for l in lines]
content = '\n'.join(lines)
content = content.encode('ascii', 'ignore').decode('ascii')
# Collapse multiple spaces
content = re.sub(r'  +', ' ', content)

pdf = FPDF()
pdf.set_auto_page_break(auto=True, margin=15)
pdf.set_left_margin(10)
pdf.set_right_margin(10)
pdf.add_page()
pdf.set_font('Helvetica', 'B', 16)
pdf.cell(0, 12, 'Housewife Tax Policy Paper', new_x="LMARGIN", new_y="NEXT", align='C')
pdf.ln(3)
pdf.set_font('Helvetica', 'I', 9)
pdf.cell(0, 5, 'Iuppiter Group  |  jupitergroup.org', new_x="LMARGIN", new_y="NEXT", align='C')
pdf.ln(6)
pdf.set_font('Helvetica', '', 9)

# Use write() which handles wrapping more gracefully
for para in content.split('\n\n'):
    para = para.replace('\n', ' ').strip()
    if not para:
        continue
    pdf.write(4.5, para)
    pdf.ln(6)

pdf.output(out)
sz = os.path.getsize(out)
print(f"OK: {out} ({sz} bytes)")
