"""Generate PDFs from markdown papers for the Iuppiter Group site."""
import os, re
from fpdf import FPDF

WORKSPACE = r"C:\Users\Owner\.openclaw\workspace"
OUT = os.path.join(WORKSPACE, "iuppitergroup-site", "papers")
os.makedirs(OUT, exist_ok=True)

papers = [
    (os.path.join(WORKSPACE, "antimatter_report"), "antimatter-report.pdf", "Antimatter Report"),
    (os.path.join(WORKSPACE, "centrifuge_gravity_report"), "stellar-centrifuge-study.pdf", "Stellar Centrifuge Feasibility Study"),
    (os.path.join(WORKSPACE, "papers", "housewife-tax-policy.md"), "housewife-tax-policy.pdf", "Housewife Tax Policy Paper"),
]

def find_main_md(path):
    if os.path.isfile(path) and path.endswith(".md"):
        return path
    if os.path.isdir(path):
        for f in sorted(os.listdir(path)):
            if f.endswith(".md"):
                return os.path.join(path, f)
    return None

def clean_md(text):
    # Strip markdown formatting for plain text PDF
    text = re.sub(r'#{1,6}\s*', '', text)  # headers
    text = re.sub(r'\*\*(.+?)\*\*', r'\1', text)  # bold
    text = re.sub(r'\*(.+?)\*', r'\1', text)  # italic
    text = re.sub(r'\[([^\]]+)\]\([^\)]+\)', r'\1', text)  # links
    text = re.sub(r'`([^`]+)`', r'\1', text)  # inline code
    return text

for src, outname, title in papers:
    md_file = find_main_md(src)
    if not md_file:
        print(f"SKIP: no markdown found for {title}")
        continue
    
    with open(md_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    content = clean_md(content)
    
    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()
    
    # Title
    pdf.set_font('Helvetica', 'B', 18)
    pdf.cell(0, 12, title, new_x="LMARGIN", new_y="NEXT", align='C')
    pdf.ln(4)
    pdf.set_font('Helvetica', 'I', 10)
    pdf.cell(0, 6, 'Iuppiter Group  |  jupitergroup.org', new_x="LMARGIN", new_y="NEXT", align='C')
    pdf.ln(8)
    
    # Body
    pdf.set_font('Helvetica', '', 10)
    for line in content.split('\n'):
        line = line.strip()
        if not line:
            pdf.ln(4)
            continue
        # Encode to latin-1 with replacement for unsupported chars
        safe = line.encode('latin-1', 'replace').decode('latin-1')
        pdf.multi_cell(0, 5, safe)
    
    outpath = os.path.join(OUT, outname)
    pdf.output(outpath)
    print(f"OK: {outpath}")

print("Done")
