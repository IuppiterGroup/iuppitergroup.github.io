# Remove land claimed by realms (in the snapshot year) from the peoples layer.
import json, sys, math
from shapely.geometry import shape, mapping
from shapely.ops import unary_union
from shapely.validation import make_valid
from shapely.strtree import STRtree
cur, pdir = sys.argv[1], sys.argv[2]
feats = [f for f in json.load(open(cur))['features'] if f['properties']['Kind'] == 'p']
geoms = [make_valid(shape(f['geometry'])).simplify(0.01) for f in feats]
spans = [(f['properties']['FromYear'], f['properties']['ToYear']) for f in feats]
tree = STRtree(geoms)
def sq_km(g): return sum(p.area * 12392.0 * math.cos(math.radians(p.centroid.y)) for p in (g.geoms if g.geom_type == 'MultiPolygon' else [g]))
idx = json.load(open(f'{pdir}/praw_index.json'))
# colonies and modern countries that the source lists among peoples; they are not peoples
NOT_PEOPLES = {'Acadian Peninsula (UK)', 'Antigua and Barbuda', 'Bahamas', 'Barbados (UK)', 'Belize', 'Cayenne', 'Dominica',
               'Grenada', 'Guadeloupe', 'Jamaica (UK)', 'Luisiana', 'Martinique', "Rupert's Land", 'Saint Lucia',
               'Saint Vincent and the Grenadines', 'Surinam', 'Trinidad', 'Virgin Islands (Danemark)', 'Virgin Islands (UK)', 'Virginia'}
out = []
for y, n in idx:
    fc = json.load(open(f'{pdir}/praw_{y}.geojson'))
    res = []
    for f in fc['features']:
        if f['properties']['n'] in NOT_PEOPLES: continue
        g = make_valid(shape(f['geometry']))
        cand = [geoms[i] for i in tree.query(g) if spans[i][0] <= y <= spans[i][1]]
        if cand: g = g.difference(unary_union(cand))
        if g.is_empty: continue
        parts = [p for p in (g.geoms if hasattr(g, 'geoms') else [g]) if p.geom_type == 'Polygon' and sq_km(p) > 2500]
        if not parts: continue
        g = unary_union(parts)
        res.append({'type': 'Feature', 'properties': {'n': f['properties']['n']}, 'geometry': mapping(g)})
    json.dump({'type': 'FeatureCollection', 'features': res}, open(f'{pdir}/pcut_{y}.geojson', 'w'))
    out.append([y, len(res)])
print(out)
