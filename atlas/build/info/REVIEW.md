# Fact-check brief: Orbis Terrarum content

You are the fact-checker for content another writer produced for a world-history atlas (read /home/claude/info/BRIEF.md for the format and house rules). The reader is a historian with a master's degree; any error he finds costs the whole atlas its credibility. You did not write this content: check it as a skeptical editor.

For your agent code X, the files are /home/claude/info/out/events_X.json, realms_X_info.json, and cities_X.json (the realm list with spans is /home/claude/info/realms_X.json).

Check, item by item:
- Events: the year and the date string; that the event happened as told (names, places, numbers, sequence, causes); the place name; the coordinates (they must sit on the named place, on land, within about 0.15 degree); the level (1 only for true turning points of world history).
- Realm cards: summary facts; government and faith; capitals and their years; every ruler's name and reign years (watch for off-by-one errors, swapped regnal numbers, rulers placed in the wrong dynasty, and missing or invented rulers in tier A lists).
- Cities: coordinates, names for the period, and from/to years.

Fix every error directly in the JSON files, keeping the schema. When a detail is doubtful and you cannot settle it, cut the detail (or the item) rather than guess. Keep the house rules: no em or en dashes, Oxford comma, the brief's rules on Christianity and the Crucifixion, no modern moralizing. Do not rewrite sound text for style.

You may use WebSearch (mode "standard") to settle specific doubts; do not search for everything.

Log every change in /home/claude/info/out/review_X.md as one line each: what was wrong, what it is now, and why. Run `python3 /home/claude/info/validate.py X` at the end and make sure it prints OK. Reply with the number of changes by kind and the most serious errors you found.
