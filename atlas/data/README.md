# Orbis Terrarum map data

- `base.json`: coastlines, lakes, rivers, and mountain ranges (TopoJSON), simplified from [Natural Earth](https://www.naturalearthdata.com/) 1:50m. Public domain.
- `snap_<year>.json`: historical borders (TopoJSON), one file per dated snapshot, listed in `index.json`. Negative years are B.C.
  Derived from [historical-basemaps](https://github.com/aourednik/historical-basemaps) by André Ourednik: dissolved by name, clipped to the coastline, and simplified.
  These derived files are distributed under the same license, the GNU General Public License v3 (see `LICENSE-historical-basemaps.txt`).

Each realm carries `n` (name), `c` (`s` for a state, `p` for peoples without a state), `a` (area in km²), `l` (label point), `b` (bounds of its largest piece), and `v` (overlord, for client states).

Rebuild everything here with `bash atlas/build/build.sh` from the repository root.
