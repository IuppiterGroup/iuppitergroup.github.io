"""Redraw the Zhou-era states (Spring and Autumn, Warring States) from their seats of power.

Cliopatria keeps the outer extent of the Zhou states about right, but inside it the states are
misplaced: Qin's shape misses Xianyang, Yan's misses Ji (Beijing), and Wei and Zhao are swapped.
This script keeps the outer extent and redraws the states inside it from dated lists of the
cities each state held, so every capital sits in its own state and conquests happen in the
year they happened. Borders follow the midlines between rival cities, with a gentle wobble so
they do not look ruled.

Usage: python3 china_fix.py <in.geojson> <out.geojson>
"""
import json, sys, math
from shapely.geometry import shape, mapping, Point, Polygon, MultiPoint, box
from shapely.ops import unary_union, voronoi_diagram
from shapely.validation import make_valid

SRC, OUT = sys.argv[1:3]
START, END = -750, -222
COMPS = ('(Spring and Autumn States)', '(Warring States China)')
A, Z = -800, -221

# Wei valley and Tianshui: the Qin heartland that the source leaves out before 316 B.C.
GUANZHONG = Polygon([(104.6, 34.0), (106.0, 33.85), (108.0, 33.8), (109.6, 34.05), (110.35, 34.35),
                     (110.5, 34.75), (110.2, 35.2), (109.0, 35.6), (107.5, 35.75), (106.0, 35.6), (104.6, 35.2)])

# Central Shanxi (Jin from 541 B.C., then Zhao) and Dai in the north (Zhao from 475 B.C.), also left out by the source
EXTRA = [(GUANZHONG, A),
         (Polygon([(111.0, 36.6), (111.0, 37.6), (111.6, 38.6), (112.6, 39.0), (113.5, 38.6), (113.8, 37.6), (113.6, 36.8), (112.3, 36.4)]), -541),
         (Polygon([(112.2, 38.9), (112.6, 39.8), (113.6, 40.6), (115.0, 40.6), (115.3, 40.0), (114.8, 39.3), (114.2, 38.9), (113.4, 38.2)]), -475)]

def S(lon, lat, f=A, t=Z): return (lon, lat, f, t)

# Each entry: a city or district and the years (inclusive, B.C. negative) the state held it.
SEEDS = {
 'Eastern Zhou': [S(112.45, 34.68, A, -257), S(112.78, 34.72, A, -257), S(112.13, 34.73, A, -257), S(113.08, 34.95, A, -636)],
 'Jin': [S(111.7, 35.7, A, -404), S(111.35, 35.62, A, -404), S(111.52, 36.08, A, -404), S(111.7, 36.57, -661, -404),
         S(110.3, 34.85, A, -404), S(111.2, 35.1, A, -404), S(111.2, 34.78, -655, -404), S(110.88, 34.52, -655, -404),
         S(113.08, 34.95, -635, -404), S(113.1, 36.2, -594, -404), S(112.55, 37.85, -541, -404), S(114.48, 36.6, -550, -404),
         S(114.5, 37.07, -550, -404), S(112.73, 38.42, -500, -404), S(110.4, 35.5, A, -641), S(112.92, 35.8, -594, -404),
         S(113.9, 35.3, -600, -404), S(114.2, 35.6, -550, -404), S(112.75, 37.68, -541, -404), S(111.13, 37.52, -541, -404),
         S(114.55, 39.85, -475, -404), S(112.95, 35.08, -635, -404)],
 'Wei': [S(111.2, 35.1, -403, -287), S(110.3, 34.85, -403, -291), S(111.35, 35.62, -403, -287), S(111.7, 35.7, -403, -287),
         S(111.52, 36.08, -375, -287), S(110.4, 35.5, -409, -331), S(109.95, 34.8, -409, -331), S(109.6, 36.0, -400, -331),
         S(110.0, 37.0, -400, -329), S(111.2, 34.78, -403, -325), S(110.88, 34.52, -403, -331), S(114.3, 34.8, -403, -226),
         S(114.42, 35.04, -403, -226), S(114.2, 34.4, -403, -226), S(114.35, 36.32, -403, -242), S(113.9, 35.3, -403, -241),
         S(113.08, 34.95, -403, -276), S(114.2, 35.6, -403, -242), S(115.65, 34.42, -284, -226), S(115.55, 35.07, -284, -226),
         S(115.45, 34.85, -284, -226), S(114.3, 38.3, -406, -381), S(114.85, 38.02, -406, -381), S(115.0, 38.52, -406, -381),
         S(114.7, 38.75, -406, -381)],
 'Zhao': [S(112.55, 37.85, -403, -247), S(114.48, 36.6, -403, -229), S(114.5, 37.07, -403, -229), S(114.55, 39.85, -403, -223),
          S(112.73, 38.42, -403, -229), S(112.75, 37.68, -403, -247), S(111.13, 37.52, -403, -329), S(113.3, 40.08, -300, -223),
          S(111.65, 40.82, -300, -235), S(115.7, 38.0, -403, -229), S(114.85, 38.02, -296, -229), S(114.3, 38.3, -296, -229),
          S(115.0, 38.52, -296, -229), S(114.7, 38.75, -296, -229), S(114.35, 36.32, -241, -237)],
 'Han': [S(111.52, 36.08, -403, -376), S(112.15, 34.5, -403, -308), S(113.47, 34.15, -403, -231), S(113.73, 34.4, -375, -231),
         S(113.1, 36.2, -403, -263), S(112.92, 35.8, -403, -263), S(112.84, 34.17, -403, -231), S(112.95, 35.08, -403, -263),
         S(113.38, 34.79, -375, -250), S(112.53, 33.0, -301, -292), S(113.8, 34.2, -375, -231)],
 'Zheng': [S(113.73, 34.4, A, -376), S(113.38, 34.79, A, -376), S(113.8, 34.2, A, -376), S(113.47, 34.15, A, -404), S(114.1, 34.7, A, -376)],
 'Wey': [S(114.2, 35.6, A, -661), S(114.5, 35.55, A, -404), S(115.0, 35.7, A, -243), S(114.9, 35.95, A, -404), S(115.3, 35.6, A, -243)],
 'Cao': [S(115.55, 35.07, A, -488), S(115.45, 34.85, A, -488)],
 'Song': [S(115.65, 34.42, A, -287), S(116.35, 34.42, A, -287), S(116.4, 33.93, A, -287), S(117.2, 34.27, -573, -287),
          S(115.55, 35.07, -487, -287), S(115.45, 34.85, -487, -287), S(115.2, 34.15, A, -287), S(117.16, 35.08, -296, -287)],
 'Chen': [S(114.88, 33.73, A, -479), S(115.2, 33.4, A, -479), S(114.0, 33.85, A, -479)],
 'Cai': [S(114.27, 33.27, A, -531), S(114.98, 32.75, -529, -494), S(116.72, 32.7, -493, -448)],
 'Lu': [S(116.99, 35.6, A, -249), S(116.5, 35.73, A, -249), S(117.27, 35.66, A, -249), S(116.59, 35.41, A, -249), S(116.85, 35.95, A, -300)],
 'Zhu': [S(116.97, 35.4, A, -262)],
 'Teng': [S(117.16, 35.08, A, -297)],
 'Xue': [S(117.25, 34.82, A, -299)],
 'Qi': [S(118.35, 36.85), S(117.0, 36.67), S(116.23, 36.86), S(116.45, 36.29), S(115.98, 36.45), S(116.3, 37.45), S(119.1, 36.7),
        S(120.48, 37.65), S(121.4, 37.5), S(120.45, 36.4), S(118.83, 35.58), S(119.5, 35.4), S(116.85, 38.3), S(118.0, 37.4),
        S(117.65, 36.2), S(117.1, 36.2), S(118.35, 35.1), S(116.85, 35.95, -299, Z), S(117.25, 34.82, -298, -285),
        S(115.65, 34.42, -286, -285), S(116.35, 34.42, -286, -285), S(116.4, 33.93, -286, -285), S(117.2, 34.27, -286, -285),
        S(115.55, 35.07, -286, -285), S(115.45, 34.85, -286, -285), S(115.2, 34.15, -286, -285), S(117.16, 35.08, -286, -285)],
 'Yan': [S(116.38, 39.9, A, -227), S(115.5, 39.3, A, -227), S(115.97, 39.48, A, -227), S(116.85, 40.38, A, -227), S(118.18, 39.63, A, -227),
         S(117.2, 39.1, A, -227), S(115.47, 38.87, A, -227), S(119.6, 39.93, -660, -227), S(115.52, 40.4, -300, -227),
         S(117.9, 40.95, -300, -227), S(121.13, 41.1, -300, Z), S(123.18, 41.27, -300, Z), S(121.67, 42.0, -300, Z)],
 'Zhongshan': [S(114.3, 38.3, -506, -407), S(114.85, 38.02, -506, -407), S(115.0, 38.52, -506, -407), S(114.7, 38.75, -506, -407),
               S(114.3, 38.3, -380, -297), S(114.85, 38.02, -380, -297), S(115.0, 38.52, -380, -297), S(114.7, 38.75, -380, -297)],
 'Wu': [S(120.6, 31.3, A, -474), S(120.3, 31.57, A, -474), S(119.97, 31.78, A, -474), S(119.45, 32.2, A, -474),
        S(118.8, 32.06, -570, -474), S(119.42, 32.39, -486, -474), S(119.0, 33.6, -512, -474), S(120.1, 30.87, A, -474),
        S(120.58, 30.0, A, -601), S(120.15, 30.27, A, -601)],
 'Yue': [S(120.58, 30.0, -600, -335), S(120.15, 30.27, -600, -335), S(121.55, 29.87, -600, -335), S(119.65, 29.08, -600, -335),
         S(120.6, 31.3, -473, -335), S(120.3, 31.57, -473, -335), S(119.97, 31.78, -473, -335), S(119.45, 32.2, -473, -335),
         S(118.8, 32.06, -473, -335), S(119.42, 32.39, -473, -335), S(119.0, 33.6, -473, -335), S(120.1, 30.87, -473, -335)],
 'Chu': [S(112.2, 30.35, A, -279), S(110.98, 30.83, A, -279), S(112.12, 32.0, A, -280), S(112.25, 31.72, A, -280),
         S(112.53, 33.0, -688, -302), S(114.07, 32.13, -680, -224), S(114.27, 33.27, -530, -224), S(114.98, 32.75, -493, -224),
         S(116.72, 32.7, -447, -224), S(114.88, 33.73, -478, -224), S(114.0, 33.85, -478, -224), S(115.2, 33.4, -478, -224),
         S(116.78, 32.57, -447, -224), S(117.27, 31.86, -600, -224), S(116.5, 31.75, -622, -224), S(117.05, 30.5, -600, -224),
         S(114.87, 30.4, A, -224), S(115.99, 29.7, -550, -224), S(115.86, 28.68, -500, -224), S(112.94, 28.23, -600, -224),
         S(113.13, 29.37, -700, -224), S(111.7, 29.03, -600, -278), S(110.4, 28.45, -500, -278), S(112.2, 31.03, A, -279),
         S(111.3, 30.7, A, -279), S(113.37, 31.69, A, -279), S(118.5, 33.0, -500, -224), S(113.0, 32.9, -688, -224),
         S(119.0, 33.6, -334, -224), S(118.8, 32.06, -334, -224), S(119.42, 32.39, -334, -224), S(119.45, 32.2, -334, -224),
         S(119.97, 31.78, -334, -224), S(120.3, 31.57, -334, -224), S(120.6, 31.3, -334, -224), S(120.1, 30.87, -334, -224),
         S(120.58, 30.0, -334, -224), S(120.15, 30.27, -334, -224), S(121.55, 29.87, -334, -224), S(119.65, 29.08, -334, -224),
         S(117.2, 34.27, -284, -224), S(116.35, 34.42, -284, -224), S(116.4, 33.93, -284, -224), S(115.2, 34.15, -284, -224),
         S(116.99, 35.6, -248, -224), S(116.5, 35.73, -248, -224), S(117.27, 35.66, -248, -224), S(116.59, 35.41, -248, -224),
         S(116.97, 35.4, -261, -224), S(117.16, 35.08, -284, -224), S(117.25, 34.82, -284, -224)],
 'Qin': [S(105.7, 34.6), S(107.15, 34.37), S(107.4, 34.5), S(108.7, 34.35), S(109.2, 34.4), S(110.1, 34.55, -700, Z),
         S(106.7, 35.5, -700, Z), S(107.6, 35.7, -272, Z), S(109.5, 36.6, -328, Z), S(109.6, 36.0, -330, Z), S(110.0, 37.0, -328, Z),
         S(110.4, 35.5, -640, -410), S(110.4, 35.5, -330, Z), S(109.95, 34.8, -700, -410), S(109.95, 34.8, -330, Z),
         S(109.9, 33.87, -500, Z), S(107.0, 33.07, -312, Z), S(109.0, 32.7, -312, Z), S(104.07, 30.67, -316, Z),
         S(106.55, 29.56, -316, Z), S(105.97, 31.58, -316, Z), S(104.7, 31.47, -316, Z), S(103.76, 29.55, -316, Z),
         S(110.88, 34.52, -330, Z), S(111.2, 34.78, -324, Z), S(110.3, 34.85, -290, Z), S(111.2, 35.1, -286, Z),
         S(111.35, 35.62, -286, Z), S(111.7, 35.7, -286, Z), S(111.52, 36.08, -286, Z), S(112.15, 34.5, -307, Z),
         S(112.53, 33.0, -291, Z), S(112.12, 32.0, -279, Z), S(112.25, 31.72, -279, Z), S(112.2, 30.35, -278, Z),
         S(111.3, 30.7, -278, Z), S(110.98, 30.83, -278, Z), S(112.2, 31.03, -278, Z), S(113.37, 31.69, -278, Z),
         S(111.7, 29.03, -277, Z), S(110.4, 28.45, -277, Z), S(113.08, 34.95, -275, Z), S(112.95, 35.08, -262, Z),
         S(113.1, 36.2, -260, Z), S(112.92, 35.8, -260, Z), S(112.45, 34.68, -256, Z), S(112.78, 34.72, -256, Z),
         S(112.13, 34.73, -256, Z), S(113.38, 34.79, -249, Z), S(112.55, 37.85, -246, Z), S(112.75, 37.68, -246, Z),
         S(111.13, 37.52, -328, Z), S(114.35, 36.32, -236, Z), S(114.2, 35.6, -241, Z), S(113.9, 35.3, -240, Z),
         S(115.0, 35.7, -242, Z), S(115.3, 35.6, -242, Z), S(111.65, 40.82, -234, Z), S(114.48, 36.6, -228, Z), S(114.5, 37.07, -228, Z),
         S(112.73, 38.42, -228, Z), S(115.7, 38.0, -228, Z), S(114.85, 38.02, -228, Z), S(114.3, 38.3, -228, Z),
         S(115.0, 38.52, -228, Z), S(114.7, 38.75, -228, Z), S(113.73, 34.4, -230, Z), S(113.47, 34.15, -230, Z),
         S(112.84, 34.17, -230, Z), S(113.8, 34.2, -230, Z), S(114.3, 34.8, -225, Z), S(114.42, 35.04, -225, Z), S(114.2, 34.4, -225, Z),
         S(115.65, 34.42, -225, Z), S(115.55, 35.07, -225, Z), S(115.45, 34.85, -225, Z), S(116.38, 39.9, -226, Z),
         S(115.5, 39.3, -226, Z), S(115.97, 39.48, -226, Z), S(116.85, 40.38, -226, Z), S(118.18, 39.63, -226, Z),
         S(117.2, 39.1, -226, Z), S(115.47, 38.87, -226, Z), S(119.6, 39.93, -226, Z), S(115.52, 40.4, -226, Z), S(117.9, 40.95, -226, Z),
         S(113.3, 40.08, -222, Z), S(114.55, 39.85, -222, Z)],
}
# the last of Chu's land fell in 223 and 222 B.C.
for lon, lat, f, t in list(SEEDS['Chu']):
    if t == -224: SEEDS['Qin'].append((lon, lat, -223, Z))

def wobble(x, y):
    dx = 0.04 * (math.sin(1.9 * x + 0.7 * y + 0.3) + 0.6 * math.sin(4.1 * x - 2.3 * y + 1.7) + 0.3 * math.sin(7.7 * y + 2.9 * x))
    dy = 0.04 * (math.sin(1.3 * x - 1.7 * y + 2.1) + 0.6 * math.sin(3.7 * y + 2.9 * x + 0.4) + 0.3 * math.sin(8.3 * x - 1.1 * y))
    return x + dx, y + dy

def warp(poly):
    poly = poly.segmentize(0.03)
    return Polygon([wobble(*c) for c in poly.exterior.coords], [[wobble(*c) for c in r.coords] for r in poly.interiors])

def clean(g):
    if g is None or g.is_empty: return None
    g = make_valid(g)
    if g.geom_type == 'GeometryCollection':
        g = unary_union([p for p in g.geoms if p.geom_type in ('Polygon', 'MultiPolygon')])
    return None if g.is_empty else g

data = json.load(open(SRC))
feats = data['features']
def is_member(p):
    return p.get('Kind') == 'p' and any(c in (p.get('MemberOf') or '') for c in COMPS)
members = [f for f in feats if f['geometry'] and is_member(f['properties']) and f['properties']['ToYear'] >= START and f['properties']['FromYear'] <= END]
others = [f for f in feats if f not in members]
member_ids = {id(f) for f in members}
other_plain = [(f['properties'], shape(f['geometry'])) for f in feats if f['geometry'] and id(f) not in member_ids
               and f['properties'].get('Kind') == 'p' and f['properties']['ToYear'] >= START and f['properties']['FromYear'] <= END
               and f['properties']['Name'] not in ('Qin Dynasty',)]
mgeo = [(f['properties'], shape(f['geometry'])) for f in members]

bounds = {START, END + 1, -480}
for p, g in mgeo:
    for y in (p['FromYear'], p['ToYear'] + 1):
        if START < y <= END: bounds.add(y)
for pts in SEEDS.values():
    for lon, lat, f, t in pts:
        for y in (f, t + 1):
            if START < y <= END: bounds.add(y)
bounds = sorted(bounds)

new_feats = []
kept_tails = []
# member rows reaching past the redrawn years keep their outer years
for f in members:
    p = f['properties']
    for lo, hi in ((p['FromYear'], START - 1), (END + 1, p['ToYear'])):
        if lo <= hi and (lo < START or hi > END):
            q = dict(p); q['FromYear'], q['ToYear'] = max(lo, p['FromYear']), min(hi, p['ToYear'])
            if q['FromYear'] <= q['ToYear']: kept_tails.append({'type': 'Feature', 'properties': q, 'geometry': f['geometry']})

for a, b in zip(bounds, bounds[1:]):
    y = a
    act = [g for p, g in mgeo if p['FromYear'] <= y <= p['ToYear']]
    if not act: continue
    env = unary_union(act)
    adds = []
    for poly, since in EXTRA:
        if y < since: continue
        blockers = [g for p, g in other_plain if p['FromYear'] <= y <= p['ToYear'] and g.intersects(poly)]
        adds.append(poly.difference(unary_union(blockers)) if blockers else poly)
    env = clean(unary_union([env] + adds).buffer(0.01).buffer(-0.01))
    pts, owner = [], []
    seen = set()
    for name, lst in SEEDS.items():
        for lon, lat, f, t in lst:
            if f <= y <= t and (lon, lat) not in seen:
                seen.add((lon, lat)); pts.append(Point(lon, lat)); owner.append(name)
    cells = voronoi_diagram(MultiPoint(pts), envelope=box(90, 10, 140, 55))
    by_state = {}
    for c in cells.geoms:
        k = next(i for i, p in enumerate(pts) if c.contains(p))
        by_state.setdefault(owner[k], []).append(warp(c))
    comp = COMPS[0] if b - 1 <= -481 else COMPS[1]
    shapes = {n: clean(unary_union(cs)) for n, cs in by_state.items()}
    for p, n in zip(pts, owner):
        if env.contains(p) and not shapes[n].contains(p): print('  seat outside its state:', n, p.x, p.y, a)
    for name, cs in by_state.items():
        g = clean(unary_union(cs).intersection(env))
        if g is None: continue
        new_feats.append({'type': 'Feature', 'properties': {'Name': name, 'FromYear': a, 'ToYear': b - 1, 'Kind': 'p', 'MemberOf': comp},
                          'geometry': mapping(g)})

# merge identical consecutive rows (same state, same shape) to keep the files small
new_feats.sort(key=lambda f: (f['properties']['Name'], f['properties']['FromYear']))
merged = []
for f in new_feats:
    if merged and merged[-1]['properties']['Name'] == f['properties']['Name'] and merged[-1]['properties']['ToYear'] + 1 == f['properties']['FromYear'] \
       and merged[-1]['properties']['MemberOf'] == f['properties']['MemberOf'] and shape(merged[-1]['geometry']).symmetric_difference(shape(f['geometry'])).area < 0.01:
        merged[-1]['properties']['ToYear'] = f['properties']['ToYear']
    else:
        merged.append(f)

# composite outlines follow the redrawn members
for f in others:
    p = f['properties']
    if p.get('Kind') == 'c' and p['Name'] in COMPS and p['ToYear'] >= START and p['FromYear'] <= END:
        y = max(p['FromYear'], START)
        gs = [shape(m['geometry']) for m in merged if m['properties']['FromYear'] <= y <= m['properties']['ToYear']]
        if gs: f['geometry'] = mapping(clean(unary_union(gs).buffer(0.05, join_style=2).buffer(-0.05, join_style=2)))

data['features'] = others + kept_tails + merged
json.dump(data, open(OUT, 'w'))
print(f'Zhou-era states redrawn: {len(members)} source rows replaced by {len(merged)} rows over {len(bounds) - 1} periods')
