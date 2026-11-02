"""Curate Cliopatria for the atlas: apply corrections.json, resolve postwar overlaps,
mark realms nested inside larger realms, fill coastal gaps, and rebuild composite outlines.

Usage: python3 curate.py <cliopatria.geojson> <land.geojson> <corrections.json> <out.geojson>
"""
import json, sys, time, math
from multiprocessing import Pool
from shapely.geometry import shape, mapping, box, Polygon, Point
from shapely.ops import unary_union
from shapely.validation import make_valid
from shapely.strtree import STRtree

SRC, LAND, CORR, OUT = sys.argv[1:5]
T0 = time.time()
def log(*a): print(f'[{time.time() - T0:6.1f}s]', *a, flush=True)

def clean(g):
    if g is None or g.is_empty: return None
    if not g.is_valid: g = make_valid(g)
    if g.geom_type == 'GeometryCollection':
        parts = [p for p in g.geoms if p.geom_type in ('Polygon', 'MultiPolygon')]
        g = unary_union(parts) if parts else None
    if g is None or g.is_empty or g.geom_type not in ('Polygon', 'MultiPolygon'): return None
    return g

def sq_km(g):
    if g is None or g.is_empty: return 0.0
    parts = g.geoms if g.geom_type == 'MultiPolygon' else [g]
    return sum(p.area * 12392.0 * math.cos(math.radians(p.centroid.y)) for p in parts)

C = json.load(open(CORR))
land_all = unary_union([clean(shape(f['geometry'])) for f in json.load(open(LAND))['features'] if f.get('geometry')])
land_for_grow = land_all
raw = json.load(open(SRC))['features']
rows = []
for f in raw:
    p = f['properties']
    if p['Type'] != 'POLITY' or not f.get('geometry'): continue
    g = clean(shape(f['geometry']))
    if g is None: continue
    name = p['Name'].strip()
    rows.append({'name': name, 'orig': name, 'f': p['FromYear'], 't': p['ToYear'], 'g': g,
                 'm': (p.get('MemberOf') or '').strip(), 'kind': 'c' if name.startswith('(') else 'p',
                 'comp': (p.get('Components') or '').strip(), 'ov': None})
log(len(rows), 'rows loaded')

def alive(): return [r for r in rows if r.get('g') is not None and not r.get('dead')]

def split(names, y0, y1):
    """Split rows of the given names so that every row is either inside [y0, y1] or outside it.
    Returns the rows inside."""
    names = set([names] if isinstance(names, str) else names)
    out = []
    for r in list(rows):
        if r.get('dead') or r['name'] not in names or r['t'] < y0 or r['f'] > y1: continue
        if r['f'] < y0:
            a = dict(r); a['t'] = y0 - 1; rows.append(a); r['f'] = y0
        if r['t'] > y1:
            b = dict(r); b['f'] = y1 + 1; rows.append(b); r['t'] = y1
        out.append(r)
    return out

def at(names, year):
    names = set([names] if isinstance(names, str) else names)
    return [r for r in alive() if r['name'] in names and r['f'] <= year <= r['t']]

def overlapping(names, f0, t0):
    names = set([names] if isinstance(names, str) else names)
    return [r for r in alive() if r['name'] in names and r['f'] <= t0 and r['t'] >= f0]

def region(spec):
    if 'island' in spec:
        P = Point(*spec['island'])
        g = next(p for p in (land_all.geoms if land_all.geom_type == 'MultiPolygon' else [land_all]) if p.contains(P))
        if 'bbox' in spec: g = g.intersection(box(*spec['bbox']))
        return clean(g)
    if 'name' not in spec and 'names' not in spec:
        g = clean(Polygon(spec['poly'])) if 'poly' in spec else clean(box(*spec['bbox']))
        if 'poly' in spec and 'bbox' in spec: g = clean(g.intersection(box(*spec['bbox'])))
        return g
    names = spec.get('names') or [spec['name']]
    gs = [r['g'] for r in at(names, spec['year'])]
    if not gs: raise SystemExit(f'region not found: {spec}')
    g = unary_union(gs)
    if 'bbox' in spec: g = g.intersection(box(*spec['bbox']))
    if 'poly' in spec: g = g.intersection(Polygon(spec['poly']))
    if 'add_bbox' in spec: g = g.union(box(*spec['add_bbox']))
    if 'minus' in spec:
        m = [r['g'] for r in at(spec['minus']['name'], spec['minus']['year'])]
        if m: g = g.difference(unary_union(m))
    return clean(g)

def report(kind, rule, n):
    flag = '' if n else '   <-- matched nothing'
    log(f'{kind:9s} {rule.get("name") or rule.get("occupiers") or rule.get("a")} {rule.get("from")}..{rule.get("to")}: {n} rows{flag}')

# ---------- explicit corrections ----------
for r in C.get('drop', []):
    hit = split(r['name'], r['from'], r['to'])
    for x in hit: x['dead'] = True
    report('drop', r, len(hit))

for r in C.get('rename', []):
    hit = split(r['name'], r['from'], r['to'])
    for x in hit:
        x['name'] = r['new']
        if r.get('merge'): x['made'] = True
        if 'overlord' in r: x['ov'] = r['overlord']
    report('rename', r, len(hit))

for r in C.get('extend', []):
    src = at(r['name'], r['copy_year'])
    if not src: report('extend', r, 0); continue
    g = clean(unary_union([x['g'] for x in src]))
    # the extended realm takes its land back from anything drawn over it in those years
    hit_names = {x['name'] for x in alive() if x['kind'] == 'p' and x['name'] != r['name'] and x['f'] <= r['to'] and x['t'] >= r['from'] and x['g'].intersects(g)}
    for x in split(hit_names, r['from'], r['to']):
        if x['g'] is not None and x['g'].intersects(g): x['g'] = clean(x['g'].difference(g))
    rows.append({'name': r['name'], 'orig': src[0]['orig'], 'f': r['from'], 't': r['to'], 'g': g, 'm': src[0]['m'], 'kind': 'p', 'comp': '', 'ov': None})
    report('extend', r, 1)

for r in C.get('add', []):
    base = clean(Polygon(r['poly'])) if 'poly' in r else clean(box(*r['bbox']))
    if r.get('minus_all'):
        minus_rows = [x for x in alive() if x['kind'] == 'p' and x['f'] <= r['to'] and x['t'] >= r['from'] and x['g'].intersects(base)]
    else:
        minus_rows = overlapping(r.get('minus', []), r['from'], r['to'])
    cuts = sorted({r['from'], r['to'] + 1} | {x['f'] for x in minus_rows if r['from'] < x['f'] <= r['to']} | {x['t'] + 1 for x in minus_rows if r['from'] <= x['t'] < r['to']})
    n = 0
    for a, b in zip(cuts, cuts[1:]):
        m = [x['g'] for x in minus_rows if x['f'] <= b - 1 and x['t'] >= a]
        g = clean(base.difference(unary_union(m))) if m else base
        if g is None or sq_km(g) < 50: continue
        rows.append({'name': r['name'], 'orig': r['name'], 'f': a, 't': b - 1, 'g': g, 'm': '', 'kind': 'p', 'comp': '', 'ov': r.get('overlord'), 'made': True}); n += 1
    report('add', r, n)

for r in C.get('fill', []):
    if not at(r['name'], r['copy_year']): report('fill', r, 0); continue
    base = unary_union([x['g'] for x in at(r['name'], r['copy_year'])])
    if 'bbox' in r: base = clean(base.intersection(box(*r['bbox'])))
    if base is None: report('fill', r, 0); continue
    src = at(r['name'], r['copy_year'])[0]
    nm = r.get('as', r['name'])
    if r.get('minus_all'):
        minus_rows = [x for x in alive() if x['kind'] == 'p' and x['f'] <= r['to'] and x['t'] >= r['from'] and x['g'].intersects(base)]
    else:
        minus_rows = overlapping(r.get('minus', []), r['from'], r['to'])
    cuts = sorted({r['from'], r['to'] + 1} | {x['f'] for x in minus_rows if r['from'] < x['f'] <= r['to']} | {x['t'] + 1 for x in minus_rows if r['from'] <= x['t'] < r['to']})
    n = 0
    for a, b in zip(cuts, cuts[1:]):
        m = [x['g'] for x in minus_rows if x['f'] <= b - 1 and x['t'] >= a]
        g = clean(base.difference(unary_union(m)) if m else base)
        if g is None or sq_km(g) < r.get('min_km2', 0): continue
        rows.append({'name': nm, 'orig': nm if 'as' in r else src['orig'], 'f': a, 't': b - 1, 'g': g, 'm': '' if 'as' in r else src['m'], 'kind': 'p', 'comp': '', 'ov': r.get('overlord'), 'made': True}); n += 1
    report('fill', r, n)

for r in C.get('grow', []):
    lon, lat = r['point']; k = r['km'] / 111.32
    disc = Polygon([(lon + k / math.cos(math.radians(lat)) * math.cos(t * math.pi / 24), lat + k * math.sin(t * math.pi / 24)) for t in range(48)])
    disc = clean(disc.intersection(land_for_grow)) if land_for_grow is not None else disc
    hit = split(r['name'], r['from'], r['to'])
    for x in hit: x['g'] = clean(unary_union([x['g'], disc]))
    others = {o['name'] for o in overlapping([o['name'] for o in alive() if o['kind'] == 'p' and o['name'] != r['name']], r['from'], r['to']) if o['g'].intersects(disc)}
    for o in split(others, r['from'], r['to']):
        if o['g'] is not None and o['g'].intersects(disc): o['g'] = clean(o['g'].difference(disc))
    report('grow', r, len(hit))

for r in C.get('cut', []):
    hit = split(r['name'], r['from'], r['to'])
    reg = clean(box(*r['bbox'])) if 'bbox' in r else region(r['region']) if 'region' in r else clean(Polygon(r['poly'])) if 'poly' in r else None
    if 'outside_bbox' in r: reg = clean(box(-180, -90, 180, 90).difference(box(*r['outside_bbox'])))
    keep = box(*r['keep_bbox']) if 'keep_bbox' in r else None
    for x in hit:
        if reg is not None:
            piece = clean(x['g'].intersection(reg))
            x['g'] = clean(x['g'].difference(reg))
            if piece is not None and r.get('give_to'):
                gy0, gy1 = r['give_to_years']
                f0, t0 = max(x['f'], gy0), min(x['t'], gy1)
                if f0 <= t0:
                    rows.append({'name': r['give_to'], 'orig': r['give_to'], 'f': f0, 't': t0, 'g': piece, 'm': '', 'kind': 'p', 'comp': '', 'ov': None, 'made': True})
        if keep is not None and x['g'] is not None:
            x['g'] = clean(x['g'].intersection(keep))
    report('cut', r, len(hit))

for r in C.get('subtract', []):
    hit = split(r['name'], r['from'], r['to'])
    for x in hit:
        m = [y['g'] for y in overlapping(r['minus'], x['f'], x['t']) if y is not x]
        if m: x['g'] = clean(x['g'].difference(unary_union(m)))
    report('subtract', r, len(hit))

for r in C.get('occupy', []):
    hit = split(r['occupiers'], r['from'], r['to'])
    inside = region(r['inside']) if 'inside' in r else None
    home = region(r['outside']) if 'outside' in r else None
    n = 0
    for x in hit:
        if x['g'] is None: continue
        piece = clean(x['g'].intersection(inside)) if inside is not None else clean(x['g'].difference(home))
        if piece is None or sq_km(piece) < r.get('min_km2', 200): continue
        x['g'] = clean(x['g'].difference(piece))
        rows.append({'name': r['new'], 'orig': r['new'], 'f': x['f'], 't': x['t'], 'g': piece, 'm': '', 'kind': 'p', 'comp': '', 'ov': r.get('overlord'), 'made': True}); n += 1
    report('occupy', r, n)

for r in C.get('contest', []):
    split([r['a'], r['b']], r['from'], r['to'])
    A = [x for x in overlapping(r['a'], r['from'], r['to'])]
    B = [x for x in overlapping(r['b'], r['from'], r['to'])]
    bounds = sorted({r['from'], r['to'] + 1} | {x['f'] for x in A + B if r['from'] < x['f'] <= r['to']} | {x['t'] + 1 for x in A + B if r['from'] <= x['t'] < r['to']})
    for lo, hi in zip(bounds, bounds[1:]): split([r['a'], r['b']], lo, hi - 1)
    n = 0
    for a in overlapping(r['a'], r['from'], r['to']):
        for b in overlapping(r['b'], a['f'], a['t']):
            if a['g'] is None or b['g'] is None: continue
            piece = clean(a['g'].intersection(b['g']))
            if piece is None or sq_km(piece) < 200: continue
            a['g'] = clean(a['g'].difference(piece)); b['g'] = clean(b['g'].difference(piece))
            rows.append({'name': r['new'], 'orig': r['new'], 'f': max(a['f'], b['f']), 't': min(a['t'], b['t']), 'g': piece, 'm': '', 'kind': 'p', 'comp': '', 'ov': r.get('overlord'), 'made': True}); n += 1
    report('contest', r, n)

for r in C.get('unmember', []):
    n = 0
    for x in split([r['composite']], r['from'], r['to']):
        if x['kind'] == 'c':
            x['comp'] = ';'.join(c for c in x['comp'].split(';') if c.strip() not in r['names']); n += 1
    for x in split(r['names'], r['from'], r['to']):
        x['m'] = ';'.join(c for c in x['m'].split(';') if c.strip() != r['composite']); x['no_enroll'] = r['composite']; n += 1
    report('unmember', r, n)

rows[:] = alive()
log(len(rows), 'rows after explicit corrections')

# ---------- pieces made by rules join a same-name realm drawn in the same years ----------
merged = 0
for name in sorted({r['name'] for r in rows if r.get('made') and r['kind'] == 'p'}):
    for mr in [r for r in alive() if r['name'] == name and r.get('made') and r['kind'] == 'p']:
        cands = [o for o in alive() if o['name'] == name and o['kind'] == 'p' and o is not mr and o['f'] <= mr['t'] and o['t'] >= mr['f']]
        bounds = sorted(b for b in {mr['f'], mr['t'] + 1} | {o['f'] for o in cands} | {o['t'] + 1 for o in cands} if mr['f'] <= b <= mr['t'] + 1)
        for a, b in zip(bounds, bounds[1:]): split([name], a, b - 1)
    grp = [r for r in alive() if r['name'] == name and r['kind'] == 'p']
    buckets = {}
    for r in grp: buckets.setdefault((r['f'], r['t'], r['ov'] or None), []).append(r)
    for key, rs in buckets.items():
        if len(rs) < 2 or not any(r.get('made') for r in rs): continue
        rs.sort(key=lambda r: (bool(r.get('made')), -sq_km(r['g'])))
        base = rs[0]
        base['g'] = clean(unary_union([r['g'] for r in rs]).buffer(0.002).buffer(-0.002))
        for r in rs[1:]: r['dead'] = True; merged += 1
rows[:] = alive()
log('rule-made pieces merged into same-name realms:', merged)

# ---------- postwar overlaps ----------
GREAT = set(C['great_powers_after_1945']['names'])
plain = [r for r in rows if r['kind'] == 'p']
tree = STRtree([r['g'] for r in plain])
for name in sorted(GREAT): split(name, 1945, 9999)
changed = 0
for r in [x for x in rows if x['kind'] == 'p' and x['name'] in GREAT and x['f'] >= 1945]:
    cands = []
    for i in tree.query(r['g']):
        o = plain[i]
        if o is r or o['name'] in GREAT or o['kind'] != 'p' or o.get('g') is None: continue
        if o['t'] < r['f'] or o['f'] > r['t']: continue
        if not o['g'].intersects(r['g']): continue
        if sq_km(o['g'].intersection(r['g'])) < 20: continue
        cands.append(o)
    if not cands: continue
    cuts = sorted({r['f'], r['t'] + 1} | {o['f'] for o in cands if r['f'] < o['f'] <= r['t']} | {o['t'] + 1 for o in cands if r['f'] <= o['t'] < r['t']})
    base, f0, t0 = r, r['f'], r['t']
    segs = list(zip(cuts, cuts[1:]))
    for k, (a, b) in enumerate(segs):
        seg = base if k == 0 else dict(base)
        seg['f'], seg['t'] = a, b - 1
        m = [o['g'] for o in cands if o['f'] <= b - 1 and o['t'] >= a]
        g0 = base['orig_g'] if 'orig_g' in base else base['g']
        if k == 0: base['orig_g'] = g0
        seg['g'] = clean(g0.difference(unary_union(m))) if m else g0
        if k > 0: rows.append(seg)
    changed += 1
for r in rows: r.pop('orig_g', None)
rows[:] = alive()
log('postwar overlaps resolved on', changed, 'rows')

# ---------- nested realms before 1945 (drawn as subordinate to the larger realm) ----------
plain = [r for r in rows if r['kind'] == 'p']
simple = [r['g'].simplify(0.01, preserve_topology=True) for r in plain]
areas = [sq_km(g) for g in simple]
tree = STRtree(simple)
nested = 0
for i, r in enumerate(plain):
    if r['ov'] or r['f'] >= 1945 or areas[i] < 50: continue
    best, bestfrac = None, 0
    for j in tree.query(simple[i]):
        o = plain[j]
        if j == i or o['name'] == r['name'] or areas[j] <= areas[i] * 1.2: continue
        if o['t'] < r['f'] or o['f'] > r['t']: continue
        try: inter = simple[i].intersection(simple[j])
        except Exception: continue
        frac = sq_km(inter) / max(areas[i], 1)
        if frac >= 0.85 and frac > bestfrac: best, bestfrac = o['name'], frac
    if best: r['ov'] = best; nested += 1
log('nested realms marked:', nested)

# ---------- coastal gaps ----------
land = unary_union([clean(shape(f['geometry'])) for f in json.load(open(LAND))['features'] if f.get('geometry')])
coast = clean(land.difference(land.buffer(-0.25)))
coast_parts = list(coast.geoms) if coast.geom_type == 'MultiPolygon' else [coast]
log('coastal band ready:', len(coast_parts), 'parts')

def init_worker(p_simple, p_spans, p_names, p_coast):
    global W_SIMPLE, W_SPANS, W_NAMES, W_TREE, W_COAST, W_CTREE
    W_SIMPLE, W_SPANS, W_NAMES, W_COAST = p_simple, p_spans, p_names, p_coast
    W_TREE = STRtree(W_SIMPLE); W_CTREE = STRtree(W_COAST)

def grow(i):
    g = W_SIMPLE[i]
    try:
        zone = g.buffer(0.25)
        cp = [W_COAST[k] for k in W_CTREE.query(zone)]
        if not cp: return i, None
        cand = zone.intersection(unary_union(cp)).difference(g)
        if cand.is_empty: return i, None
        f0, t0 = W_SPANS[i]
        others = [W_SIMPLE[j] for j in W_TREE.query(cand) if j != i and W_NAMES[j] != W_NAMES[i] and W_SPANS[j][0] <= t0 and W_SPANS[j][1] >= f0]
        if others: cand = cand.difference(unary_union(others))
        if cand.is_empty: return i, None
        near = g.buffer(0.03)
        parts = cand.geoms if cand.geom_type == 'MultiPolygon' else [cand]
        keep = [p for p in parts if p.geom_type == 'Polygon' and p.intersects(near)]
        return i, (unary_union(keep).wkb if keep else None)
    except Exception:
        return i, None

from shapely import wkb
plain = [r for r in rows if r['kind'] == 'p']
psimple = [r['g'].simplify(0.01, preserve_topology=True) for r in plain]
with Pool(2, initializer=init_worker, initargs=(psimple, [(r['f'], r['t']) for r in plain], [r['name'] for r in plain], coast_parts)) as pool:
    grown = 0
    for k, (i, add) in enumerate(pool.imap_unordered(grow, range(len(plain)), chunksize=64)):
        if add:
            plain[i]['g'] = clean(plain[i]['g'].union(wkb.loads(add))); grown += 1
        if k % 2000 == 0: log(f'  coastal fill {k}/{len(plain)}')
log('coastal gaps filled on', grown, 'rows')

# small realms can be swallowed by a neighbor's coastal fill; these rules run after it
for r in C.get('post_subtract', []):
    hit = split(r['name'], r['from'], r['to'])
    for x in hit:
        m = [y['g'] for y in overlapping(r['minus'], x['f'], x['t']) if y is not x]
        if m: x['g'] = clean(x['g'].difference(unary_union(m)))
    report('post_subtract', r, len(hit))
rows[:] = alive()

# ---------- composite outlines rebuilt from members ----------
by_orig = {}
for r in rows:
    if r['kind'] == 'p': by_orig.setdefault(r['orig'], []).append(r)
comp_rows = {}
for r in rows:
    if r['kind'] == 'c': comp_rows.setdefault(r['name'], []).append(r)
def members(r, depth=0):
    out = []
    for nm in filter(None, r['comp'].split(';')):
        nm = nm.strip()
        if nm.startswith('(') and depth < 3:
            for cr in comp_rows.get(nm, []):
                if cr['f'] <= r['t'] and cr['t'] >= r['f']: out += members(cr, depth + 1)
        else:
            out += [x for x in by_orig.get(nm, []) if x['f'] <= r['t'] and x['t'] >= r['f']]
    return out
plain_rows = [x for x in rows if x['kind'] == 'p']
ptree = STRtree([x['g'] for x in plain_rows])
enrolled = 0
rebuilt = 0
for r in [x for x in rows if x['kind'] == 'c']:
    ms = members(r)
    if not ms: r['g'] = None; continue
    g = clean(unary_union([m['g'] for m in ms]))
    # close hairline gaps between members and drop small interior holes so the outline traces the outer edge
    g = clean(g.buffer(0.05, join_style=2).buffer(-0.05, join_style=2)) or g
    parts = []
    for q in (g.geoms if g.geom_type == 'MultiPolygon' else [g]):
        parts.append(Polygon(q.exterior, [h for h in q.interiors if Polygon(h).area > 0.3]))
    r['g'] = clean(unary_union(parts)); rebuilt += 1
    # realms fully enclosed by the composite (holes in its outline) belong to it too, such as Saxony inside the Empire
    filled = clean(unary_union([Polygon(q.exterior) for q in (r['g'].geoms if r['g'].geom_type == 'MultiPolygon' else [r['g']])]))
    if filled is None: continue
    mine = {id(m) for m in ms}
    for k in ptree.query(filled):
        x = plain_rows[k]
        if id(x) in mine or x['t'] < r['f'] or x['f'] > r['t'] or r['name'] in x['m'].split(';') or x.get('no_enroll') == r['name']: continue
        try: inside = x['g'].intersection(filled).area / max(x['g'].area, 1e-9)
        except Exception: continue
        if inside >= 0.9:
            x['m'] = ';'.join(filter(None, [x['m'], r['name']])); enrolled += 1
    r['g'] = clean(r['g'].union(filled)) or r['g']
log('realms enrolled in enclosing composites:', enrolled)
rows[:] = alive()
log('composites rebuilt:', rebuilt)

# ---------- write ----------
feats = []
for r in rows:
    props = {'Name': r['name'], 'FromYear': r['f'], 'ToYear': r['t'], 'Kind': r['kind'], 'MemberOf': r['m']}
    if r['ov']: props['Overlord'] = r['ov']
    feats.append({'type': 'Feature', 'properties': props, 'geometry': mapping(r['g'])})
json.dump({'type': 'FeatureCollection', 'features': feats}, open(OUT, 'w'))
log('wrote', len(feats), 'rows to', OUT)
