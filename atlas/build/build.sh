#!/usr/bin/env bash
# Rebuild atlas/data from the original sources. Run from the repository root:
#   bash atlas/build/build.sh
# Needs git, curl, and Node 18 or newer. Takes a few minutes.
set -euo pipefail
REPO="$(pwd)"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
cd "$WORK"
mkdir -p src tmp out

git clone --depth 1 https://github.com/aourednik/historical-basemaps hb
NE=https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson
for f in ne_50m_land ne_50m_lakes ne_50m_rivers_lake_centerlines_scale_rank ne_50m_geography_regions_polys; do
  curl -sSfL -o "src/$f.geojson" "$NE/$f.geojson"
done

npm init -y >/dev/null
npm i -s mapshaper@0.7 topojson-server@3 d3-geo@3 polylabel@1
MS="npx mapshaper"

$MS src/ne_50m_land.geojson -simplify 35% keep-shapes -filter-slivers -o tmp/land.geojson precision=0.001
$MS src/ne_50m_lakes.geojson -filter 'scalerank<=4' -filter-fields scalerank,name -simplify 40% keep-shapes -o tmp/lakes.geojson precision=0.001
$MS src/ne_50m_rivers_lake_centerlines_scale_rank.geojson -filter 'featurecla=="River" && scalerank<=6' -filter-fields scalerank,name -simplify 40% -o tmp/rivers.geojson precision=0.001
$MS src/ne_50m_geography_regions_polys.geojson -filter 'FEATURECLA=="Range/mtn"' -filter-fields NAME,SCALERANK -simplify 40% keep-shapes -o tmp/mountains.geojson precision=0.001

# Border snapshots used by the atlas (bcN = N B.C.)
SNAPS="bc3000 bc2000 bc1500 bc1000 bc700 bc500 bc400 bc323 bc300 bc200 bc100 bc1 100 200 300 400 500 600 700 800 900 1000 1100 1200 1279 1300 1400 1492 1500 1530 1600 1650 1700 1715 1783 1800 1815 1880 1900 1914 1920 1930 1938 1945 1960 1994 2010"
for s in $SNAPS; do
  $MS "hb/geojson/world_$s.geojson" -filter 'NAME != null && NAME.trim() != ""' -dissolve NAME copy-fields=SUBJECTO,PARTOF \
    -clip tmp/land.geojson -simplify 14% keep-shapes -o "tmp/s_$s.geojson" precision=0.001 2>/dev/null
done

cp "$REPO/atlas/build/pack.mjs" .
node pack.mjs
cp out/*.json "$REPO/atlas/data/"
cp hb/LICENSE "$REPO/atlas/data/LICENSE-historical-basemaps.txt"
echo "atlas/data rebuilt."
