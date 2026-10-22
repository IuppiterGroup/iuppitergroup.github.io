// Pack simplified layers into compact TopoJSON for Orbis Terrarum. Run by build.sh from its work folder.
import fs from 'node:fs';
import { topology } from 'topojson-server';
import { geoArea, geoBounds } from 'd3-geo';
import polylabel from 'polylabel';

const SNAPS = 'bc3000 bc2000 bc1500 bc1000 bc700 bc500 bc400 bc323 bc300 bc200 bc100 bc1 100 200 300 400 500 600 700 800 900 1000 1100 1200 1279 1300 1400 1492 1500 1530 1600 1650 1700 1715 1783 1800 1815 1880 1900 1914 1920 1930 1938 1945 1960 1994 2010'.split(' ');
const yearOf = s => s.startsWith('bc') ? -parseInt(s.slice(2), 10) : parseInt(s, 10);
const R2 = 6371 * 6371;

const peopleRe = /hunter|gatherer|cultures?\b|culture$|tribes|tribal|peoples|nomad|farmers|pastoral|forag|fisher|fichers|aborig|bantu|khoisan|inuit|polynes|austronesian|papuan|saami|ainu|dravidian|semites|berbers|\bcelts\b|slavs|slavic|germanic|finno|siberian|amerindian|arawak|carib\b|tupi|eskimo|aleut|maoris?\b|guanches|tuareg|complex$|focus$|chiefdoms$|shellfish|bison|mammal|maize|manioc|rice cultures|megalith|horizon$|tradition$/i;
const stateRe = /empire|kingdom|viceroy|spain|portug|france|french|brit|engl|dutch|nether|maya|aztec|inca|chim[uú]|toltec|tiwanaku|huari|\bwari\b|moche|nazca|olmec|muisca|mexica|tarasc|pur[eé]pech|zapotec|mixtec|teotihuac|monte alb|\bnew |colony|united states|mexico|brazil|canada|haiti|colombia|peru|chile|argentin|confeder|republic|captaincy|governorate|state of|venezuela|bolivia|ecuador|paraguay|uruguay|guatemala|honduras|nicaragua|salvador|costa rica|panama|cuba|texas|russian america|danish|swed|courland|hudson|louisiana|florida|alaska/i;

function rewindPoly(rings) {
  const a = geoArea({ type: 'Polygon', coordinates: rings });
  return a > 2 * Math.PI ? rings.map(r => r.slice().reverse()) : rings;
}
function rewind(geom) {
  if (!geom) return geom;
  if (geom.type === 'Polygon') geom.coordinates = rewindPoly(geom.coordinates);
  else if (geom.type === 'MultiPolygon') geom.coordinates = geom.coordinates.map(rewindPoly);
  return geom;
}
function largestPolygon(geom) {
  const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.type === 'MultiPolygon' ? geom.coordinates : [];
  let best = null, bestA = -1;
  for (const p of polys) {
    const a = geoArea({ type: 'Polygon', coordinates: p });
    if (a > bestA && a < 2 * Math.PI) { bestA = a; best = p; }
  }
  return best;
}

function labelPoint(poly) {
  const lat0 = poly[0].reduce((s, c) => s + c[1], 0) / poly[0].length;
  const k = Math.cos(lat0 * Math.PI / 180) || 1;
  const rings = poly.map(r => r.map(([x, y]) => [x * k, y]));
  const p = polylabel(rings, 0.05);
  return [+(p[0] / k).toFixed(2), +p[1].toFixed(2)];
}

const index = [];
for (const s of SNAPS) {
  const year = yearOf(s);
  const gj = JSON.parse(fs.readFileSync(`tmp/s_${s}.geojson`, 'utf8'));
  const feats = [];
  for (const f of gj.features) {
    if (!f.geometry) continue;
    rewind(f.geometry);
    const name = (f.properties.NAME || '').trim();
    if (!name) continue;
    let a = geoArea(f);
    if (a > 2 * Math.PI) continue; // winding error guard
    const km2 = Math.round(a * R2);
    const big = largestPolygon(f.geometry);
    if (!big) continue;
    const lp = labelPoint(big);
    const bb = geoBounds({ type: 'Polygon', coordinates: big }).flat().map(v => +v.toFixed(1));
    const subj = (f.properties.SUBJECTO || '').trim();
    let cls = 's';
    const lonC = lp[0];
    if (peopleRe.test(name)) cls = 'p';
    else if (year < 1800 && lonC < -30 && !stateRe.test(name)) cls = 'p';
    else if (year < 1880 && lonC > 112 && lp[1] < -10 && lp[1] > -45 && !/south wales|colony|british|diemen|australia|zealand/i.test(name)) cls = 'p';
    if (/denmark|norway|iceland|greenland|sweden/i.test(name)) cls = 's';
    const props = { n: name, c: cls, a: km2, l: lp, b: bb };
    if (subj && subj !== name && !/claim/i.test(subj)) props.v = subj;
    feats.push({ type: 'Feature', properties: props, geometry: f.geometry });
  }
  const topo = topology({ p: { type: 'FeatureCollection', features: feats } }, 1e5);
  const out = `out/snap_${year}.json`;
  fs.writeFileSync(out, JSON.stringify(topo));
  index.push({ y: year, f: `data/snap_${year}.json`, n: feats.length, kb: Math.round(fs.statSync(out).size / 1024) });
}

const base = {};
for (const k of ['land', 'lakes', 'rivers', 'mountains']) {
  const gj = JSON.parse(fs.readFileSync(`tmp/${k}.geojson`, 'utf8'));
  for (const f of gj.features) {
    rewind(f.geometry);
    const p = f.properties || {};
    f.properties = k === 'rivers' ? { r: p.scalerank, n: p.name || '' } : k === 'mountains' ? { n: p.NAME || '' } : {};
  }
  base[k] = gj;
}
fs.writeFileSync('out/base.json', JSON.stringify(topology(base, 1e5)));
fs.writeFileSync('out/index.json', JSON.stringify(index));
console.log(index.map(i => `${i.y}:${i.n}f/${i.kb}k`).join('  '));
console.log('base', Math.round(fs.statSync('out/base.json').size / 1024), 'k');
