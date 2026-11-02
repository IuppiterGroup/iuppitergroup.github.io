# Orbis Terrarum map data

- `base.json`: coastlines, lakes, rivers, and mountain ranges (TopoJSON), simplified from [Natural Earth](https://www.naturalearthdata.com/) 1:50m. Public domain.
- `w_<year>.json`: realms in one time window, starting in the year named (negative years are B.C.), listed with their year ranges in `windows.json`. Every shape carries the first and last year it held (`f`, `t`), so the map can show any single year exactly.
  Derived from [Cliopatria](https://github.com/Seshat-Global-History-Databank/cliopatria) v0.2.1 (Seshat Global History Databank), licensed [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/) (see `LICENSE-cliopatria.md`).
  Changes made: names and dates corrected, misdrawn and leftover shapes removed, postwar overlaps resolved, occupations shown as occupations, coastlines matched to the base map, and shapes clipped and simplified. Every correction is listed with its reason in `atlas/build/corrections.json`.
- `p_<year>.json`: peoples without a state, from the [historical-basemaps](https://github.com/aourednik/historical-basemaps) snapshot of that year, with land claimed by realms removed; listed in `peoples.json`. These derived files are distributed under the GNU General Public License v3 (see `LICENSE-historical-basemaps.txt`).
- `relations.json`: vassalage and personal unions by year, from Cliopatria.
- `realms.json`: first and last year of every realm.

Each realm shape carries `n` (name), `k` (`p` for a realm, `c` for a composite such as the Holy Roman Empire), `m` (the composites it belongs to), `o` (the realm it is subject to, if any), `a` (area in km²), `l` (label point), and `b` (bounds of its largest piece).

Rebuild everything here with `bash atlas/build/build.sh` from the repository root.
