"""Merge the content agents' files into the site's atlas/info/ files and report problems.
Usage: python3 merge.py <site repo>"""
import json, glob, os, re, sys, math
from shapely.geometry import shape, Point
from shapely.ops import unary_union
from shapely.strtree import STRtree

here = os.path.dirname(os.path.abspath(__file__))
dest = os.path.join(sys.argv[1], 'atlas', 'info'); os.makedirs(dest, exist_ok=True)
land = [shape(f['geometry']) for f in json.load(open('/home/claude/atlas-proto/tmp/land.geojson'))['features'] if f['geometry']]
tree = STRtree(land)
def on_land(lon, lat, tol=0.12):
    p = Point(lon, lat)
    return any(land[i].distance(p) <= tol for i in tree.query(p.buffer(tol)))

events, realms, cities, problems = [], {}, [], []
existing = {(e['y'], e['t']) for e in json.load(open(f'{here}/existing_events.json'))}
for f in sorted(glob.glob(f'{here}/out/events_*.json')):
    a = re.search(r'events_(\w+)\.json', f).group(1)
    for e in json.load(open(f)):
        if (e['y'], e['t']) in existing: continue
        e = {k: e[k] for k in ('y', 'd', 't', 'p', 'll', 'x', 'lvl')}; e['_a'] = a
        e['ll'] = [round(e['ll'][0], 2), round(e['ll'][1], 2)]
        if not on_land(*e['ll']): problems.append(f'[{a}] event at sea: {e["y"]} {e["t"]} {e["ll"]}')
        events.append(e)
for f in sorted(glob.glob(f'{here}/out/realms_*_info.json')):
    a = re.search(r'realms_(\w+)_info\.json', f).group(1)
    for n, c in json.load(open(f)).items():
        if n in realms: problems.append(f'[{a}] realm card written twice: {n}'); continue
        out = {k: c[k] for k in ('x', 'gov', 'faith') if c.get(k)}
        for k in ('cap', 'rulers'):
            if c.get(k): out[k] = c[k]
        realms[n] = out
for f in sorted(glob.glob(f'{here}/out/cities_*.json')):
    for c in json.load(open(f)): cities.append([c[0], round(c[1], 2), round(c[2], 2), c[3], c[4], c[5]])

# same event twice from two writers (same year, near the same place, similar title)
events.sort(key=lambda e: (e['y'], e['lvl']))
dupes = []
for i, e in enumerate(events):
    for g in events[i + 1:i + 8]:
        if g['y'] != e['y']: break
        if abs(g['ll'][0] - e['ll'][0]) < 1.5 and abs(g['ll'][1] - e['ll'][1]) < 1.5: dupes.append((e['y'], e['t'], e['_a'], g['t'], g['_a']))
for d in dupes: problems.append(f'possible duplicate events: {d}')
# a city already in the base list, or twice
base = json.load(open(f'{here}/existing_cities.json'))
uniq = []
def clash(c, pool):
    return any(o[0] == c[0] and o[3] <= c[4] and c[3] <= o[4] and abs(o[1] - c[1]) < .6 and abs(o[2] - c[2]) < .6 for o in pool)
for c in cities:
    if clash(c, base) or clash(c, uniq): continue
    uniq.append(c)
# events: drop the second copy of an event two writers both told
DROP = set(map(tuple, json.load(open(f'{here}/drop_events.json')))) if os.path.exists(f'{here}/drop_events.json') else set()
events = [e for e in events if (e['y'], e['t'], e['_a']) not in DROP]
for e in events: del e['_a']

json.dump(events, open(f'{dest}/events.json', 'w'), ensure_ascii=False, separators=(',', ':'))
json.dump(realms, open(f'{dest}/realms.json', 'w'), ensure_ascii=False, separators=(',', ':'))
json.dump(uniq, open(f'{dest}/cities.json', 'w'), ensure_ascii=False, separators=(',', ':'))
print(f'events {len(events)}  realm cards {len(realms)}  cities {len(uniq)}')
for p in problems: print(p)
