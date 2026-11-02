"""Remove stray specks from the curated realms: small detached pieces of a realm that sit inside another realm's land
in the same years (digitizing leftovers in the source, such as fragments of Germany near Istanbul and in Estonia).
Islands are kept, because they do not sit inside another realm.

Usage: python3 despeckle.py <curated.geojson> <out.geojson>
"""
import json, sys, math
from shapely.geometry import shape, mapping
from shapely.ops import unary_union
from shapely.strtree import STRtree
from shapely.validation import make_valid

src, out = sys.argv[1:3]
fc = json.load(open(src))
feats = fc['features']
def sq_km(g): return sum(p.area * 12392.0 * math.cos(math.radians(p.centroid.y)) for p in (g.geoms if g.geom_type == 'MultiPolygon' else [g]))
plain = [i for i, f in enumerate(feats) if f['properties']['Kind'] == 'p']
geoms = {i: make_valid(shape(feats[i]['geometry'])) for i in plain}
idx = list(geoms)
tree = STRtree([geoms[i] for i in idx])
dropped = 0
for i in plain:
    g = geoms[i]
    parts = list(g.geoms) if g.geom_type == 'MultiPolygon' else [g]
    if len(parts) < 2: continue
    p = feats[i]['properties']
    keep = []
    for q in parts:
        if sq_km(q) >= 400: keep.append(q); continue
        cover = 0.0
        for k in tree.query(q):
            j = idx[k]
            if j == i: continue
            o = feats[j]['properties']
            if o['Name'] == p['Name'] or o['ToYear'] < p['FromYear'] or o['FromYear'] > p['ToYear']: continue
            try: cover += q.intersection(geoms[j]).area
            except Exception: pass
        if cover >= 0.5 * q.area: dropped += 1
        else: keep.append(q)
    if len(keep) < len(parts):
        feats[i]['geometry'] = mapping(unary_union(keep))
json.dump(fc, open(out, 'w'))
print('specks dropped:', dropped)
