# luppitergroup.github.io
luppiter Group - Research and Software

## Atlas pages

Every year on the atlas timeline and every realm has its own page (`atlas/year/`, `atlas/realm/`), written from `atlas.html` and the atlas data by:

    node atlas/build/pages.mjs

Run it from the repository root after any change to `atlas.html`, the nav, or the atlas data. It also rewrites the year index inside `atlas.html`, `atlas/realms.html`, `course-world.js`, and `sitemap.xml`.
