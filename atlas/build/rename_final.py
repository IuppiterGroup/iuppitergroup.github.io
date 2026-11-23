#!/usr/bin/env python3
"""Final names for the packed map data. Last step of build.sh.

The source data calls the Roman Empire in the East "Byzantine Empire" from 633 on.
The atlas keeps one name, Eastern Roman Empire, from 395 to 1453: its emperors and
its people called themselves Romans to the end, and "Byzantine" is a label coined
in the West a century after the city fell. corrections.json and the earlier build
steps still use the source's names, since they run before this one.

Usage: python3 rename_final.py atlas/data
"""
import glob
import json
import os
import sys

RENAME = {"Byzantine Empire": "Eastern Roman Empire"}


def rewrite(path, fn):
    raw = open(path, encoding="utf-8").read()
    new = fn(raw)
    if new != raw:
        open(path, "w", encoding="utf-8").write(new)
        return 1
    return 0


def quoted(raw):
    """Shape files: swap the exact quoted name wherever it stands (n, o, m)."""
    for old, new in RENAME.items():
        raw = raw.replace(json.dumps(old), json.dumps(new))
    return raw


def bare(raw):
    """Relations: names also sit inside labels such as "(Allegiance of A to B)"."""
    for old, new in RENAME.items():
        raw = raw.replace(old, new)
    return raw


def spans(raw):
    """First and last year: fold the old name's span into the new one."""
    d = json.loads(raw)
    hit = False
    for old, new in RENAME.items():
        if old not in d:
            continue
        hit = True
        a, b = d.pop(old), d.get(new)
        d[new] = {"f": min(a["f"], b["f"]), "t": max(a["t"], b["t"])} if b else a
    return json.dumps(d, ensure_ascii="\\u" in raw) if hit else raw


def main(dest):
    n = 0
    for path in sorted(glob.glob(os.path.join(dest, "[wp]_*.json"))):
        n += rewrite(path, quoted)
    n += rewrite(os.path.join(dest, "relations.json"), bare)
    n += rewrite(os.path.join(dest, "realms.json"), spans)
    print(f"final names: {n} files changed")


if __name__ == "__main__":
    main(sys.argv[1])
