"""Validate one content agent's output. Usage: python3 validate.py <AGENT>   (e.g. A, B, F1)
Checks out/events_<A>.json, out/realms_<A>_info.json, out/cities_<A>.json against the schema in BRIEF.md."""
import json, re, sys, os
A = sys.argv[1]
here = os.path.dirname(os.path.abspath(__file__))
errs, warns = [], []
DASH = re.compile('[—–]')

def bad_text(where, s):
    if DASH.search(s): errs.append(f'{where}: contains an em or en dash; rewrite with a comma, colon, semicolon, or "to"')
    if re.search(r'\bclaim(s|ed)?\b', s, re.I) and re.search(r'Christ|Jesus|resurrect|apostle|gospel', s, re.I):
        errs.append(f'{where}: do not call Christian founding events "claims"')

def year_ok(y): return isinstance(y, int) and y != 0 and -3200 <= y <= 2024

def check_date(where, y, d):
    num = str(abs(y))
    if y < 0 and not (d.endswith('B.C.') and num in d): errs.append(f'{where}: d "{d}" must end with B.C. and contain {num}')
    if y > 0 and not ('A.D.' in d and num in d): errs.append(f'{where}: d "{d}" must read like "A.D. {y}" or "c. A.D. {y}"')

p = f'{here}/out/events_{A}.json'
if os.path.exists(p):
    ev = json.load(open(p))
    seen = set()
    for i, e in enumerate(ev):
        w = f'event {i} ({e.get("t", "?")})'
        for k, typ in (('y', int), ('d', str), ('t', str), ('p', str), ('x', str), ('lvl', int), ('ll', list)):
            if not isinstance(e.get(k), typ): errs.append(f'{w}: missing or wrong type for {k}')
        if errs and errs[-1].startswith(w): continue
        if not year_ok(e['y']): errs.append(f'{w}: bad year {e["y"]}')
        check_date(w, e['y'], e['d'])
        if e['lvl'] not in (1, 2, 3): errs.append(f'{w}: lvl must be 1, 2, or 3')
        lon, lat = e['ll']
        if not (-180 <= lon <= 180 and -60 <= lat <= 80): errs.append(f'{w}: ll out of range {e["ll"]}')
        n = len(e['x'].split())
        if not 25 <= n <= 95: warns.append(f'{w}: text is {n} words (aim 35 to 75)')
        if len(e['t']) > 48: warns.append(f'{w}: title over 48 characters')
        for k in ('t', 'p', 'x', 'd'): bad_text(w, e[k])
        key = (e['y'], e['t'])
        if key in seen: errs.append(f'{w}: duplicate')
        seen.add(key)
    print(f'events: {len(ev)}  by level {dict((l, sum(1 for e in ev if e.get("lvl") == l)) for l in (1, 2, 3))}')
else: warns.append('no events file yet')

p = f'{here}/out/realms_{A}_info.json'
names = {r['name']: r for r in json.load(open(f'{here}/realms_{A}.json'))}
if os.path.exists(p):
    info = json.load(open(p))
    for n, c in info.items():
        w = f'realm "{n}"'
        if n not in names: errs.append(f'{w}: not in realms_{A}.json (names must match exactly)'); continue
        r = names[n]
        for k in ('gov', 'faith', 'x'):
            if not isinstance(c.get(k), str) or not c[k].strip(): errs.append(f'{w}: missing {k}')
            else: bad_text(w, c[k])
        if isinstance(c.get('x'), str) and len(c['x'].split()) > 70: warns.append(f'{w}: summary over 70 words')
        for k in ('cap', 'rulers'):
            v = c.get(k, [])
            if not isinstance(v, list): errs.append(f'{w}: {k} must be a list'); continue
            for item in v:
                if not (isinstance(item, list) and len(item) == 3 and isinstance(item[0], str) and year_ok(item[1]) and year_ok(item[2]) and item[1] <= item[2]):
                    errs.append(f'{w}: bad {k} entry {item} (want ["Name", from, to] with from <= to, no year 0)'); continue
                bad_text(w, item[0])
                if item[2] < r['from'] - 30 or item[1] > r['to'] + 1: warns.append(f'{w}: {k} entry {item} falls outside the realm span {r["from"]} to {r["to"]}')
        if r['tier'] == 'A' and not c.get('rulers') and r['kind'] == 'realm': warns.append(f'{w}: tier A realm without rulers')
    missing = [n for n, r in names.items() if n not in info]
    missA = [n for n in missing if names[n]['tier'] == 'A']
    if missA: errs.append(f'tier A realms missing: {missA[:20]}{" ..." if len(missA) > 20 else ""}')
    print(f'realms: {len(info)} of {len(names)} covered; {len(missing)} not covered')
else: warns.append('no realms file yet')

p = f'{here}/out/cities_{A}.json'
if os.path.exists(p):
    cs = json.load(open(p))
    for i, c in enumerate(cs):
        w = f'city {i} {c[:1]}'
        if not (isinstance(c, list) and len(c) == 6 and isinstance(c[0], str) and all(isinstance(v, (int, float)) for v in c[1:3])
                and year_ok(c[3]) and year_ok(c[4]) and c[3] <= c[4] and c[5] in (2, 3, 4)):
            errs.append(f'{w}: want ["Name", lon, lat, from, to, rank 2 to 4]'); continue
        bad_text(w, c[0])
    print(f'cities: {len(cs)}')
else: warns.append('no cities file yet')

for w in warns[:60]: print('WARN', w)
if len(warns) > 60: print(f'... {len(warns) - 60} more warnings')
for e in errs[:80]: print('ERROR', e)
if len(errs) > 80: print(f'... {len(errs) - 80} more errors')
print('OK' if not errs else f'{len(errs)} errors')
