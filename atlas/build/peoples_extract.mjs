// Extract the peoples-without-a-state layer from the earlier snapshot files.
import fs from 'node:fs';
import { feature } from 'topojson-client';
const [,, srcDir, outDir] = process.argv;
const idx = JSON.parse(fs.readFileSync(`${srcDir}/index.json`, 'utf8'));
const out = [];
for (const s of idx) {
  const t = JSON.parse(fs.readFileSync(`${srcDir}/snap_${s.y}.json`, 'utf8'));
  const fc = feature(t, t.objects.p);
  fc.features = fc.features.filter(f => f.properties.c === 'p').map(f => ({ type: 'Feature', properties: { n: f.properties.n }, geometry: f.geometry }));
  fs.writeFileSync(`${outDir}/praw_${s.y}.geojson`, JSON.stringify(fc));
  out.push([s.y, fc.features.length]);
}
fs.writeFileSync(`${outDir}/praw_index.json`, JSON.stringify(out));
console.log(out.length, 'snapshots');
