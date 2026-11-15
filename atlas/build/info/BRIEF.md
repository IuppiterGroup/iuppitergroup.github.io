# Orbis Terrarum: content brief

Orbis Terrarum is an interactive atlas of world history (3100 B.C. to A.D. 2024) on the luppiter Group site (always write "luppiter" with a lowercase l). Each year shows the realms of that year. You are writing the content that makes it rich: a dense chronicle of events, a card for each realm, and more cities. The reader is a historian with a master's degree who will spot any error. Accuracy comes before volume: if you are not sure of a fact or a date, leave it out.

Your scope (which region and era) is given in your task. You write three JSON files in /home/claude/info/out/, replacing <AGENT> with your agent code:

## 1. events_<AGENT>.json: the chronicle

A JSON array of 160 to 220 events. Each event:

```json
{"y": -490, "d": "490 B.C.", "t": "The Athenians at Marathon", "p": "Marathon, Greece", "ll": [23.97, 38.12], "lvl": 2,
 "x": "Two narrative sentences to four, 35 to 75 words."}
```

- `y`: the year as an integer; B.C. years are negative (490 B.C. is -490). There is no year 0: 1 B.C. is -1, A.D. 1 is 1.
- `d`: the date as shown: "490 B.C.", "c. 1750 B.C.", "A.D. 9", "c. A.D. 600". Use "c." whenever the year is approximate.
- `t`: a title of at most 48 characters, in the style "The Athenians at Marathon", "Charlemagne Crowned in Rome", "The Fall of Constantinople". No trailing period.
- `p`: the place as "Site, Country/Region".
- `ll`: [longitude, latitude] of the place, accurate to about 0.1 degree. Check these; a marker in the sea or in the wrong country is a visible error.
- `lvl`: 1 = turned the course of world history (be sparing: at most 12 of yours); 2 = a major event for the region (the bulk); 3 = notable local event, shown only when the reader zooms in (about a third).
- `x`: 35 to 75 words of vivid, concrete narrative: who, what, and why it mattered. Name the people. Concrete numbers where well established.

Spread events across the whole time span and the whole area of your scope, so that a reader zoomed in on any part of your region in any century finds something. Battles, conquests, foundings of cities and states, coronations, falls of dynasties, treaties, religious events, inventions, great works, plagues, migrations. Do not repeat events already in existing_events.json (in /home/claude/info).

## 2. realms_<AGENT>_info.json: realm cards

A JSON object keyed by the exact realm name from your realms_<AGENT>.json list (copy names exactly, including parentheses, which mark composites such as "(Holy Roman Empire)"). Write a card for every realm in your list if you can do so accurately; tier A realms are required. Skip a realm only if you genuinely cannot identify it (some names are the source's own labels for peoples or regions; you may still write a card if you know what the label refers to).

```json
"Roman Empire": {
  "x": "One or two sentences, at most 60 words: what this realm was and what it is remembered for.",
  "gov": "Monarchy (principate, then dominate)",
  "faith": "Roman religion, then Christianity from 380",
  "cap": [["Rome", -27, 330], ["Constantinople", 330, 395]],
  "rulers": [["Augustus", -27, 14], ["Tiberius", 14, 37]]
}
```

- `cap`: capitals with the years each was the capital, in order.
- `rulers`: [name, first year, last year] for each ruler, in order, with the name as it is usually written in English plus a distinguishing epithet or number ("Louis XIV", "Harun al-Rashid", "Kangxi Emperor", "Ramesses II"). For a republic, list the heads of state or government that matter (consuls are too many: for the Roman Republic list the leading men by period instead, e.g. ["Sulla (dictator)", -82, -79]). For tier A realms give the full list of rulers across the realm's years in the atlas (the from/to in your list), as complete as the historical record allows; mark co-rulers as separate entries. For tier B realms give the founder and the most important rulers, up to 8. Use "c." nowhere in this list; give your best-established years.
- Years in `cap` and `rulers` follow the same integer rule (negative B.C., no 0), and from <= to.
- `gov` and `faith`: a short phrase each.
- For composites (names in parentheses) describe the whole: "(Holy Roman Empire)", "(British Empire)".

## 3. cities_<AGENT>.json: cities

A JSON array of 40 to 80 cities that are not already in existing_cities.json, each `["Name", lon, lat, from, to, rank]`. `from`/`to` are the years the city existed under that name; a renamed city gets one entry per name (["Byzantium", 28.98, 41.01, -667, 329, 2], ["Constantinople", 28.98, 41.01, 330, 1929, 1]...). Rank 2 = great city, 3 = important city, 4 = shown only when zoomed in. Use the name current in that period, in English.

## Voice and rules

- Write in English, as a narrative historian of the old school would, before 1930: confident, vivid, concrete. No modern jargon, no moralizing about the past by present standards, no hedging filler.
- Never use em dashes or en dashes (the characters U+2014 and U+2013). Use commas, colons, semicolons, or "to". Use the Oxford comma.
- "Barbarian" is fine in the Roman sense (peoples beyond the frontier). "Savage" may describe conduct, never a people.
- Give the Islamic conquests, raids, and the enslavement of Christians their full historical weight where they belong to your scope.
- Christianity: state its founding events as events, never as "claims" or with skeptical framing. The Crucifixion: Jesus was handed over to Pontius Pilate by the high priest Caiaphas and the Temple authorities, and Pilate ordered him crucified. Do not write that "the Jews" killed Christ. Nothing blasphemous.
- Treat all peoples and faiths with the same standard of accuracy.
- English names for people and places (Constantinople, not Konstantinoupolis; Charlemagne; Genghis Khan).

## Checking your work

Run `python3 /home/claude/info/validate.py <AGENT>` and fix every ERROR before you finish; review the warnings. Then reread your events for factual accuracy (dates, names, places, numbers) and fix anything doubtful. When done, reply with a short summary: counts, and any realms you skipped and why.
