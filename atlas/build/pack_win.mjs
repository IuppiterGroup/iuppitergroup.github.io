// Pack one simplified window GeoJSON into TopoJSON with label points and bounds.
import fs from 'node:fs';
import { topology } from 'topojson-server';
import { geoArea, geoBounds } from 'd3-geo';
import polylabel from 'polylabel';
const [,, src, out, obj = 's'] = process.argv;
const rewindPoly = r => geoArea({ type: 'Polygon', coordinates: r }) > 2 * Math.PI ? r.map(x => x.slice().reverse()) : r;
function rewind(g) { if (g.type === 'Polygon') g.coordinates = rewindPoly(g.coordinates); else if (g.type === 'MultiPolygon') g.coordinates = g.coordinates.map(rewindPoly); return g; }
function largest(g) {
  const ps = g.type === 'Polygon' ? [g.coordinates] : g.coordinates; let best = null, ba = -1;
  for (const p of ps) { const a = geoArea({ type: 'Polygon', coordinates: p }); if (a > ba) { ba = a; best = p; } } return best;
}
function label(poly) {
  const lat0 = poly[0].reduce((s, c) => s + c[1], 0) / poly[0].length, k = Math.cos(lat0 * Math.PI / 180) || 1;
  const p = polylabel(poly.map(r => r.map(([x, y]) => [x * k, y])), 0.05);
  return [+(p[0] / k).toFixed(2), +p[1].toFixed(2)];
}
let gj = { features: [] }; try { gj = JSON.parse(fs.readFileSync(src, 'utf8')); } catch (e) {}
if (!Array.isArray(gj.features)) gj.features = gj.geometries ? [] : [];
const feats = [];
for (const f of gj.features) {
  if (!f.geometry || !f.geometry.coordinates.length) continue;
  rewind(f.geometry);
  const big = largest(f.geometry); if (!big) continue;
  const p = f.properties;
  p.a = Math.round(geoArea(f) * 6371 * 6371);
  p.l = label(big);
  p.b = geoBounds({ type: 'Polygon', coordinates: big }).flat().map(v => +v.toFixed(1));
  feats.push({ type: 'Feature', properties: p, geometry: f.geometry });
}
fs.writeFileSync(out, JSON.stringify(topology({ [obj]: { type: 'FeatureCollection', features: feats } }, 1e5)));
console.log(out, feats.length, Math.round(fs.statSync(out).size / 1024) + 'KB');
