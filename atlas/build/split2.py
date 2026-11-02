# Split the curated realms into time windows; collect relations (from the source) and realm spans.
import json, re, sys
cur, raw, outdir = sys.argv[1], sys.argv[2], sys.argv[3]
feats = json.load(open(cur))['features']

def windows():
    w, y = [], -3400
    while y <= 2024:
        step = 200 if y < -1000 else 100 if y < -500 else 50 if y < 1000 else 25 if y < 1800 else 10
        w.append((y, min(2024, y + step - 1))); y += step
    return w

rows, realms = [], {}
for i, f in enumerate(feats):
    p = f['properties']
    rows.append((i, p, f['geometry']))
    if p['Kind'] == 'p':
        r = realms.setdefault(p['Name'], {'f': p['FromYear'], 't': p['ToYear']})
        r['f'] = min(r['f'], p['FromYear']); r['t'] = max(r['t'], p['ToYear'])

rel = {}
for f in json.load(open(raw))['features']:
    p = f['properties']
    if p['Type'] != 'RELATION': continue
    name = p['Name'].strip()
    m = re.match(r'^\((Allegiance|Vassalage) of (.+) to (.+)\)$', name) or re.match(r'^\((Personal union) of (.+) with (.+)\)$', name) or re.match(r'^\((Alliance) between (.+) and (.+)\)$', name)
    if not m: continue
    kind = {'Allegiance': 'v', 'Vassalage': 'v', 'Personal union': 'u', 'Alliance': 'a'}[m.group(1)]
    if kind == 'a': continue
    r = rel.setdefault(name, {'k': kind, 'a': m.group(2), 'b': m.group(3), 'y': []})
    r['y'].append([p['FromYear'], p['ToYear']])
for r in rel.values(): r['y'].sort()

index = []
for a, b in windows():
    out = []
    for i, p, g in rows:
        if p['FromYear'] <= b and p['ToYear'] >= a:
            props = {'i': i, 'n': p['Name'], 'k': p['Kind'], 'f': p['FromYear'], 't': p['ToYear']}
            if p.get('MemberOf'): props['m'] = p['MemberOf']
            if p.get('Overlord'): props['o'] = p['Overlord']
            out.append({'type': 'Feature', 'properties': props, 'geometry': g})
    json.dump({'type': 'FeatureCollection', 'features': out}, open(f'{outdir}/w_{a}.geojson', 'w'))
    index.append([a, b, len(out)])
json.dump(index, open(f'{outdir}/windows.json', 'w'))
json.dump(rel, open(f'{outdir}/relations.json', 'w'))
json.dump(realms, open(f'{outdir}/realms.json', 'w'))
print(len(rows), 'rows;', len(index), 'windows;', len(rel), 'relations;', len(realms), 'realms')
