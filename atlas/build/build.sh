#!/usr/bin/env bash
# Rebuild atlas/data from the original sources. Run from the repository root:
#   bash atlas/build/build.sh
# Needs git, curl, Python 3 with shapely (pip install shapely), and Node 18 or newer.
# Takes about 15 minutes. Corrections to the source data live in atlas/build/corrections.json.
set -euo pipefail
REPO="$(pwd)"
BUILD="$REPO/atlas/build"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
cd "$WORK"
mkdir -p src tmp out snaps win simp ppl

echo "== Sources"
git clone --depth 1 https://github.com/Seshat-Global-History-Databank/cliopatria clio
unzip -q -o clio/cliopatria.geojson.zip -d clio/raw
CLIO="$(ls clio/raw/*.geojson | head -1)"
git clone --depth 1 https://github.com/aourednik/historical-basemaps hb
NE=https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson
for f in ne_50m_land ne_50m_lakes ne_50m_rivers_lake_centerlines_scale_rank ne_50m_geography_regions_polys; do
  curl -sSfL -o "src/$f.geojson" "$NE/$f.geojson"
done

npm init -y >/dev/null
npm i -s mapshaper@0.7 topojson-server@3 topojson-client@3 d3-geo@3 polylabel@1
MS="npx mapshaper"

echo "== Base map"
$MS src/ne_50m_land.geojson -simplify 35% keep-shapes -filter-slivers -o tmp/land.geojson precision=0.001
$MS src/ne_50m_lakes.geojson -filter 'scalerank<=4' -filter-fields scalerank,name -simplify 40% keep-shapes -o tmp/lakes.geojson precision=0.001
$MS src/ne_50m_rivers_lake_centerlines_scale_rank.geojson -filter 'featurecla=="River" && scalerank<=6' -filter-fields scalerank,name -simplify 40% -o tmp/rivers.geojson precision=0.001
$MS src/ne_50m_geography_regions_polys.geojson -filter 'FEATURECLA=="Range/mtn"' -filter-fields NAME,SCALERANK -simplify 40% keep-shapes -o tmp/mountains.geojson precision=0.001

echo "== Peoples without a state (historical-basemaps)"
SNAPS="bc3000 bc2000 bc1500 bc1000 bc700 bc500 bc400 bc323 bc300 bc200 bc100 bc1 100 200 300 400 500 600 700 800 900 1000 1100 1200 1279 1300 1400 1492 1500 1530 1600 1650 1700 1715 1783 1800 1815 1880 1900 1914 1920 1930 1938 1945 1960 1994 2010"
for s in $SNAPS; do
  $MS "hb/geojson/world_$s.geojson" -filter 'NAME != null && NAME.trim() != ""' -dissolve NAME copy-fields=SUBJECTO,PARTOF \
    -clip tmp/land.geojson -simplify 14% keep-shapes -o "tmp/s_$s.geojson" precision=0.001 2>/dev/null
done
cp "$BUILD/pack.mjs" "$BUILD/pack_win.mjs" "$BUILD/peoples_extract.mjs" .
node pack.mjs                      # writes out/base.json and out/snap_*.json (snapshots used only for peoples)
cp out/snap_*.json out/index.json snaps/
node peoples_extract.mjs snaps ppl

echo "== Realms (Cliopatria, corrected)"
python3 "$BUILD/curate.py" "$CLIO" tmp/land.geojson "$BUILD/corrections.json" tmp/curated0.geojson
python3 "$BUILD/china_fix.py" tmp/curated0.geojson tmp/curated0b.geojson
python3 "$BUILD/despeckle.py" tmp/curated0b.geojson tmp/curated.geojson
python3 "$BUILD/split2.py" tmp/curated.geojson "$CLIO" win
python3 "$BUILD/peoples_erase.py" tmp/curated.geojson ppl

echo "== Pack"
DEST="$REPO/atlas/data"
rm -f "$DEST"/w_*.json "$DEST"/p_*.json "$DEST"/snap_*.json
for f in win/w_*.geojson; do
  n=$(basename "$f" .geojson)
  $MS "$f" -clip tmp/land.geojson -simplify interval=3000 keep-shapes -o "simp/$n.geojson" precision=0.001 >/dev/null 2>&1
  node pack_win.mjs "simp/$n.geojson" "$DEST/$n.json" s >/dev/null
done
for f in ppl/pcut_*.geojson; do
  y=$(basename "$f" .geojson | sed 's/pcut_//')
  $MS "$f" -simplify interval=4000 keep-shapes -o "simp/p_$y.geojson" precision=0.001 >/dev/null 2>&1
  node pack_win.mjs "simp/p_$y.geojson" "$DEST/p_$y.json" p >/dev/null
done
python3 - "$DEST" win ppl <<'PY'
import json, sys, os
dest, win, ppl = sys.argv[1:4]
json.dump([[a, b, f'w_{a}.json'] for a, b, n in json.load(open(f'{win}/windows.json'))], open(f'{dest}/windows.json', 'w'))
json.dump([[y, f'p_{y}.json'] for y, n in json.load(open(f'{ppl}/praw_index.json'))], open(f'{dest}/peoples.json', 'w'))
for k in ('relations.json', 'realms.json'): os.replace(f'{win}/{k}', f'{dest}/{k}')
PY
cp out/base.json "$DEST/base.json"
cp hb/LICENSE "$DEST/LICENSE-historical-basemaps.txt"
cp clio/LICENSE.md "$DEST/LICENSE-cliopatria.md"
echo "atlas/data rebuilt."
