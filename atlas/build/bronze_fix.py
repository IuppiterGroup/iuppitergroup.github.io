"""Redraw the Bronze Age Near East, Egypt, Nubia, Anatolia, the Aegean, and Arabia (to 1201 B.C.) from dated seats of power.

Cliopatria is thin here: a few realms in 100 to 300 year slices, Egypt's periods off by up to two
centuries, Sumer drawn as one strip, and no Ur III, Isin, Larsa, Yamhad, Kerma, Minoan Crete, or
Mycenaean palace states at all. This script drops the source rows inside the region before 1200 B.C.
and draws every realm from dated lists of the cities and districts it held. Each seat claims land
within its own reach (a few dozen km for a city-state, more for a capital or a highland district),
rival seats split the ground along their midlines, and Egypt and Kush are held to the Nile valley.
Dates follow the middle chronology for Mesopotamia and Shaw's Oxford History for Egypt.

Usage: python3 bronze_fix.py <in.geojson> <land.geojson> <rivers.geojson> <out.geojson>
"""
import json, sys, math
from shapely.geometry import shape, mapping, Point, Polygon, MultiPoint, box
from shapely.ops import unary_union, voronoi_diagram
from shapely.validation import make_valid
from shapely import affinity

SRC, LAND, RIVERS, OUT = sys.argv[1:5]
A, END = -3400, -1201                      # years redrawn (inclusive)
REGION = box(19, 12, 61, 43.5)             # source rows whose label point falls here are replaced
SUM, MYC = '(Sumerian City-States)', '(Mycenaean Greece)'

# ---------------------------------------------------------------- places [lon, lat]
P = {
 # Sumer and Akkad
 'Ur': (46.10, 30.96), 'Eridu': (46.00, 30.82), 'Uruk': (45.64, 31.32), 'Larsa': (45.85, 31.29), 'Girsu': (46.17, 31.55),
 'Lagash': (46.40, 31.41), 'Nigin': (46.53, 31.33), 'Umma': (45.89, 31.66), 'Zabalam': (45.87, 31.74), 'Shuruppak': (45.51, 31.78),
 'Adab': (45.62, 31.95), 'Nippur': (45.23, 32.13), 'Isin': (45.27, 31.88), 'Kish': (44.60, 32.55), 'Kutha': (44.61, 32.76),
 'Sippar': (44.25, 33.06), 'Babylon': (44.42, 32.54), 'Borsippa': (44.34, 32.39), 'Mashkan-shapir': (45.48, 32.40),
 'Eshnunna': (44.73, 33.48), 'Tutub': (44.56, 33.36), 'Shaduppum': (44.45, 33.31), 'Der': (45.98, 33.11),
 'Dur-Kurigalzu': (44.20, 33.35), 'Marsh': (46.85, 30.95),
 # Assyria and the Jezira
 'Ashur': (43.26, 35.46), 'Ekallatum': (43.30, 35.62), 'Nineveh': (43.15, 36.36), 'Arbela': (44.01, 36.19), 'Kalhu': (43.33, 36.10),
 'Arrapha': (44.39, 35.47), 'Nuzi': (44.25, 35.38), 'Mari': (40.89, 34.55), 'Terqa': (40.73, 34.93), 'Tuttul': (39.05, 35.95),
 'Shubat-Enlil': (41.92, 36.96), 'Nagar': (41.06, 36.67), 'Urkesh': (40.99, 37.06), 'Washukanni': (40.07, 36.82),
 'Harran': (39.03, 36.86), 'Dur-Katlimmu': (40.74, 35.64), 'Sabi Abyad': (39.09, 36.50),
 # Syria and the Levant
 'Emar': (38.08, 36.02), 'Carchemish': (38.01, 36.83), 'Aleppo': (37.16, 36.20), 'Alalakh': (36.38, 36.24), 'Ebla': (36.80, 35.80),
 'Qatna': (36.87, 34.84), 'Kadesh': (36.52, 34.56), 'Ugarit': (35.78, 35.60), 'Sumur': (35.99, 34.91), 'Irqata': (36.05, 34.53),
 'Byblos': (35.65, 34.12), 'Sidon': (35.37, 33.56), 'Tyre': (35.20, 33.27), 'Damascus': (36.29, 33.51), 'Hazor': (35.57, 33.02),
 'Megiddo': (35.18, 32.59), 'Beth-Shean': (35.50, 32.50), 'Shechem': (35.28, 32.21), 'Jericho': (35.44, 31.87),
 'Jerusalem': (35.23, 31.78), 'Gezer': (34.92, 31.86), 'Jaffa': (34.75, 32.05), 'Lachish': (34.85, 31.56), 'Ashkelon': (34.55, 31.66),
 'Gaza': (34.47, 31.50), 'Sharuhen': (34.40, 31.44), 'Arad': (35.13, 31.28),
 # Anatolia
 'Hattusa': (34.62, 40.02), 'Alaca': (34.69, 40.23), 'Sapinuwa': (35.25, 40.27), 'Kanesh': (35.63, 38.85), 'Purushanda': (33.85, 38.41),
 'Upper Land': (37.02, 39.75), 'Tarsus': (34.90, 36.92), 'Adana': (35.32, 37.00), 'Tarhuntassa': (33.30, 37.20),
 'Malatya': (38.36, 38.38), 'Isuwa': (39.22, 38.67), 'Troy': (26.24, 39.96), 'Apasa': (27.34, 37.94), 'Sardis': (28.04, 38.49),
 'Manisa': (27.43, 38.61), 'Beycesultan': (29.69, 38.25), 'Aphrodisias': (28.72, 37.71),
 # Aegean
 'Knossos': (25.16, 35.30), 'Phaistos': (24.81, 35.05), 'Malia': (25.49, 35.29), 'Zakros': (26.26, 35.10), 'Chania': (24.02, 35.51),
 'Gournia': (25.79, 35.11), 'Thera': (25.40, 36.36), 'Mycenae': (22.76, 37.73), 'Tiryns': (22.80, 37.60), 'Argos': (22.72, 37.63),
 'Pylos': (21.70, 37.03), 'Ayios Vasileios': (22.43, 37.00), 'Menelaion': (22.45, 37.07), 'Thebes (Greece)': (23.32, 38.32),
 'Orchomenos': (22.97, 38.49), 'Gla': (23.19, 38.48), 'Athens': (23.73, 37.97), 'Dimini': (22.89, 39.36),
 # Egypt and Nubia
 'Buto': (30.74, 31.20), 'Sais': (30.77, 30.97), 'Mendes': (31.52, 30.96), 'Tanis': (31.88, 30.98), 'Avaris': (31.82, 30.79),
 'Bubastis': (31.51, 30.57), 'Heliopolis': (31.31, 30.13), 'Memphis': (31.25, 29.85), 'Itjtawy': (31.23, 29.57),
 'Faiyum': (30.84, 29.31), 'Herakleopolis': (30.93, 29.09), 'Beni Hasan': (30.88, 27.93), 'Hermopolis': (30.80, 27.78),
 'Asyut': (31.18, 27.18), 'Abydos': (31.92, 26.18), 'Coptos': (32.82, 25.99), 'Thebes': (32.64, 25.70), 'Hierakonpolis': (32.78, 25.10),
 'Edfu': (32.87, 24.98), 'Elephantine': (32.89, 24.09), 'Aniba': (32.03, 22.67), 'Buhen': (31.29, 21.92), 'Semna': (30.96, 21.50),
 'Sai': (30.33, 20.70), 'Kerma': (30.41, 19.60), 'Kawa': (30.53, 19.12), 'Old Dongola': (30.75, 18.22), 'Napata': (31.83, 18.53),
 # Iran and Arabia
 'Susa': (48.26, 32.19), 'Anshan': (52.41, 30.01), 'Huhnur': (49.60, 31.28), 'Haft Tepe': (48.33, 32.08), 'Dur-Untash': (48.52, 32.01),
 'Liyan': (50.83, 28.92), 'Izeh': (49.87, 31.84), 'Deh Luran': (47.37, 32.53),
 'Bahrain': (50.52, 26.23), 'Saar': (50.48, 26.18), 'Failaka': (48.33, 29.44), 'Tarut': (50.06, 26.57),
 'Hili': (55.79, 24.28), 'Bat': (56.74, 23.27), 'Umm an-Nar': (54.51, 24.44), 'Ras al-Jinz': (59.83, 22.42), 'Maysar': (57.66, 22.94),
 'Tell Abraq': (55.68, 25.38), 'Kalba': (56.35, 25.07),
}
NILE_PLACES = {k for k in ('Buto Sais Mendes Tanis Avaris Bubastis Heliopolis Memphis Itjtawy Faiyum Herakleopolis Beni Hasan '
               'Hermopolis Asyut Abydos Coptos Thebes Hierakonpolis Edfu Elephantine Aniba Buhen Semna Sai Kerma Kawa Old Dongola Napata').split()}
NILE_PLACES |= {'Beni Hasan', 'Old Dongola'}

DELTA = ['Buto', 'Sais', 'Mendes', 'Tanis', 'Avaris', 'Bubastis', 'Heliopolis']
MIDDLE = ['Memphis', 'Itjtawy', 'Faiyum', 'Herakleopolis', 'Beni Hasan', 'Hermopolis']
UPPER = ['Asyut', 'Abydos', 'Coptos', 'Thebes', 'Hierakonpolis', 'Edfu', 'Elephantine']
SUMER = ['Ur', 'Eridu', 'Uruk', 'Larsa', 'Girsu', 'Lagash', 'Nigin', 'Umma', 'Zabalam', 'Shuruppak', 'Adab', 'Nippur', 'Isin']
AKKAD = ['Kish', 'Kutha', 'Sippar']
DIYALA = ['Eshnunna', 'Tutub', 'Shaduppum']
CANAAN = ['Hazor', 'Megiddo', 'Shechem', 'Jericho', 'Jerusalem', 'Gezer', 'Lachish', 'Ashkelon', 'Sidon', 'Tyre', 'Damascus']

# ---------------------------------------------------------------- realms
# Each realm: list of (places, from, to, reach in km). Optional per realm: comp (composite it belongs to),
# ov (list of (overlord, from, to)).
R = {}
def add(name, places, f, t, r, comp=None):
    R.setdefault(name, {'seeds': [], 'ov': [], 'comp': comp})
    if isinstance(places, str): places = [places]
    for p in places: R[name]['seeds'].append((p, f, t, r))
def ov(name, lord, f, t): R[name]['ov'].append((lord, f, t))

# Sumer: city-states until Sargon's conquest
add('Ur', ['Ur', 'Eridu'], -3400, -2321, 34, SUM)
add('Uruk', ['Uruk', 'Larsa'], -3400, -2321, 34, SUM)
add('Lagash', ['Girsu', 'Lagash', 'Nigin'], -3000, -2321, 32, SUM)
add('Umma', ['Umma', 'Zabalam'], -2900, -2321, 30, SUM)
add('Shuruppak', 'Shuruppak', -3000, -2321, 28, SUM)
add('Adab', 'Adab', -2900, -2321, 28, SUM)
add('Nippur', ['Nippur', 'Isin'], -3400, -2321, 30, SUM)
add('Kish', ['Kish', 'Kutha', 'Sippar'], -3000, -2335, 36, SUM)
add('Mari', ['Mari', 'Terqa'], -2900, -2301, 55)
add('Ebla', 'Ebla', -2600, -2241, 60)
add('Canaanite city-states', ['Megiddo', 'Jericho', 'Arad', 'Hazor'], -3000, -2301, 32)
add('Byblos', 'Byblos', -2800, -1201, 30)

# Akkad
add('Akkadian Empire', AKKAD, -2334, -2154, 45)
add('Akkadian Empire', SUMER, -2320, -2193, 34)
add('Akkadian Empire', DIYALA + ['Der'], -2300, -2193, 42)
add('Akkadian Empire', ['Mari', 'Terqa', 'Tuttul'], -2300, -2193, 55)
add('Akkadian Empire', ['Susa'], -2300, -2201, 65)
add('Akkadian Empire', ['Ashur', 'Nuzi'], -2290, -2193, 48)
add('Akkadian Empire', ['Nineveh'], -2270, -2193, 48)
add('Akkadian Empire', ['Nagar'], -2254, -2193, 60)

# The Gutian years, Lagash II, Uruk IV and V
add('Gutian Dynasty', ['Adab', 'Umma', 'Zabalam', 'Shuruppak', 'Isin', 'Nippur'], -2192, -2117, 34)
add('Gutian Dynasty', AKKAD, -2153, -2117, 45)
add('Lagash', ['Girsu', 'Lagash', 'Nigin'], -2192, -2111, 32)
add('Uruk', ['Uruk', 'Larsa', 'Ur', 'Eridu'], -2192, -2113, 34)
add('Uruk', ['Adab', 'Umma', 'Zabalam', 'Shuruppak', 'Isin', 'Nippur'] + AKKAD, -2116, -2113, 34)
add('Mari', ['Mari', 'Terqa'], -2192, -1793, 55)

# Ur III
U3 = 'Third Dynasty of Ur'
add(U3, ['Ur', 'Eridu', 'Uruk', 'Larsa', 'Umma', 'Zabalam'], -2112, -2005, 34)
add(U3, ['Girsu', 'Lagash', 'Nigin'], -2110, -2005, 32)
add(U3, ['Nippur', 'Isin', 'Shuruppak', 'Adab'], -2112, -2018, 34)
add(U3, AKKAD + ['Babylon'] + DIYALA + ['Der'], -2112, -2027, 45)
add(U3, ['Susa'], -2090, -2029, 65)
add(U3, ['Ashur'], -2090, -2028, 48)
add(U3, ['Arrapha', 'Nuzi'], -2070, -2030, 48)
add(U3, ['Arbela'], -2045, -2030, 48)

# Elam
add('Elam', ['Susa'], -3200, -2301, 70); add('Elam', ['Susa'], -2200, -2091, 70); add('Elam', ['Susa'], -2028, -1201, 70)
add('Elam', ['Anshan'], -3200, -1201, 120)
add('Elam', ['Huhnur'], -2700, -2041, 70); add('Elam', ['Huhnur'], -2028, -1201, 70)
add('Elam', ['Deh Luran'], -2028, -1201, 55)
add('Elam', ['Ur'], -2004, -1998, 34)
add('Elam', ['Haft Tepe'], -1450, -1201, 40); add('Elam', ['Dur-Untash'], -1260, -1201, 40)
add('Elam', ['Izeh', 'Liyan'], -1300, -1201, 70)

# Isin, Larsa, Uruk, Eshnunna
add('Isin', ['Isin', 'Nippur', 'Shuruppak', 'Adab'], -2017, -1795, 34)
add('Isin', ['Ur', 'Eridu', 'Uruk', 'Girsu', 'Lagash', 'Nigin', 'Umma', 'Zabalam', 'Larsa'], -1997, -1933, 34)
add('Isin', ['Ur', 'Eridu', 'Girsu', 'Lagash', 'Nigin', 'Umma', 'Zabalam'], -1932, -1927, 34)
add('Isin', ['Uruk'], -1932, -1866, 34)
add('Larsa', ['Larsa'], -1932, -1764, 34)
add('Larsa', ['Ur', 'Eridu', 'Girsu', 'Lagash', 'Nigin', 'Umma', 'Zabalam'], -1926, -1764, 34)
add('Larsa', ['Mashkan-shapir'], -1850, -1764, 36)
add('Larsa', ['Uruk'], -1802, -1764, 34)
add('Larsa', ['Isin', 'Nippur', 'Shuruppak', 'Adab'], -1794, -1764, 34)
add('Uruk', ['Uruk'], -1865, -1803, 34)
add('Eshnunna', DIYALA, -2026, -1763, 42)

# Babylon: the First Dynasty, then the Kassites
add('Babylonia', ['Babylon', 'Borsippa'], -1894, -1226, 36)
add('Babylonia', ['Kish', 'Sippar', 'Kutha'], -1860, -1226, 40)
add('Babylonia', ['Larsa', 'Ur', 'Eridu', 'Girsu', 'Lagash', 'Nigin', 'Umma', 'Zabalam', 'Uruk'], -1763, -1740, 34)
add('Babylonia', ['Mashkan-shapir', 'Isin', 'Nippur', 'Shuruppak', 'Adab'], -1763, -1721, 34)
add('Babylonia', DIYALA, -1762, -1226, 42)
add('Babylonia', ['Mari', 'Terqa'], -1761, -1731, 55)
add('Babylonia', ['Nippur', 'Isin', 'Ur', 'Eridu', 'Uruk', 'Larsa', 'Girsu', 'Nigin', 'Umma', 'Shuruppak', 'Adab', 'Marsh', 'Der'], -1460, -1226, 34)
add('Babylonia', ['Dur-Kurigalzu'], -1390, -1226, 40)
for f, t in ((-1225, -1217), (-1216, -1201)):
    add('Babylonia', ['Babylon', 'Borsippa', 'Kish', 'Sippar', 'Kutha', 'Dur-Kurigalzu'] + DIYALA + ['Nippur', 'Isin', 'Ur', 'Eridu', 'Uruk', 'Larsa', 'Girsu', 'Nigin', 'Umma', 'Shuruppak', 'Adab', 'Marsh', 'Der'], f, t, 38)
ov('Babylonia', 'Assyria', -1225, -1217)
add('First Sealand Dynasty', ['Ur', 'Eridu', 'Uruk', 'Larsa', 'Girsu', 'Nigin', 'Marsh'], -1732, -1461, 34)
add('Khana', ['Terqa', 'Mari'], -1730, -1501, 50)

# Assyria and Mitanni
add('Assyria', ['Ashur'], -2025, -1809, 48)
add('Assyria', ['Ashur', 'Ekallatum', 'Nineveh', 'Arbela', 'Shubat-Enlil', 'Nagar', 'Urkesh', 'Tuttul'], -1808, -1776, 55)
add('Assyria', ['Mari', 'Terqa'], -1792, -1776, 55)
add('Assyria', ['Ashur', 'Ekallatum'], -1775, -1451, 48)
add('Assyria', ['Ashur'], -1450, -1364, 48)
ov('Assyria', 'Mitanni', -1450, -1364)
add('Assyria', ['Ashur', 'Ekallatum', 'Nineveh', 'Arbela', 'Kalhu'], -1363, -1201, 55)
add('Assyria', ['Arrapha', 'Nuzi'], -1330, -1201, 50)
add('Assyria', ['Washukanni', 'Nagar', 'Urkesh', 'Shubat-Enlil', 'Harran', 'Dur-Katlimmu', 'Sabi Abyad'], -1263, -1201, 60)
add('Mari', ['Mari', 'Terqa', 'Tuttul'], -1775, -1762, 55)
add('Mitanni', ['Washukanni', 'Urkesh', 'Nagar', 'Harran', 'Shubat-Enlil'], -1550, -1264, 65)
add('Mitanni', ['Aleppo', 'Alalakh', 'Carchemish', 'Emar', 'Arrapha', 'Nuzi'], -1500, -1341, 55)
add('Mitanni', ['Nineveh'], -1450, -1364, 48)
add('Mitanni', ['Isuwa'], -1500, -1341, 55)
add('Mitanni', ['Arrapha', 'Nuzi'], -1340, -1331, 50)
ov('Mitanni', 'Hittites', -1340, -1291); ov('Mitanni', 'Assyria', -1290, -1264)

# Syria and the Levant
add('Yamhad', ['Aleppo', 'Alalakh', 'Emar'], -1810, -1595, 55)
add('Ebla', 'Ebla', -1850, -1601, 45); ov('Ebla', 'Yamhad', -1800, -1601)
add('Qatna', 'Qatna', -1900, -1341, 55)
add('Ugarit', 'Ugarit', -1800, -1201, 42); ov('Ugarit', 'Hittites', -1340, -1201)
add('Amurru', ['Sumur', 'Irqata'], -1380, -1201, 36); ov('Amurru', 'New Kingdom of Egypt', -1380, -1341); ov('Amurru', 'Hittites', -1340, -1201)
add('Kadesh', 'Kadesh', -1600, -1201, 40); ov('Kadesh', 'New Kingdom of Egypt', -1457, -1341); ov('Kadesh', 'Hittites', -1340, -1201)
add('Canaanite city-states', CANAAN + ['Sharuhen', 'Gaza', 'Jaffa', 'Beth-Shean'], -2000, -1651, 34)
add('Canaanite city-states', CANAAN + ['Jaffa', 'Beth-Shean'], -1650, -1458, 34)
add('Canaanite city-states', ['Gaza'], -1650, -1458, 34)
add('Canaanite city-states', CANAAN, -1457, -1201, 34)
ov('Canaanite city-states', 'New Kingdom of Egypt', -1457, -1201)
ov('Byblos', 'New Kingdom of Egypt', -1457, -1201)

# Anatolia
add('Kanesh', 'Kanesh', -1950, -1701, 60); add('Kanesh', ['Hattusa', 'Alaca'], -1750, -1701, 60)
add('Hattum', ['Hattusa', 'Alaca'], -1950, -1751, 60)
add('Purushanda', 'Purushanda', -1950, -1751, 60)
add('Hittites', ['Hattusa', 'Alaca', 'Sapinuwa', 'Kanesh', 'Purushanda', 'Upper Land'], -1650, -1201, 85)
add('Hittites', ['Tarsus', 'Adana', 'Tarhuntassa'], -1400, -1201, 60)
add('Hittites', ['Carchemish', 'Aleppo', 'Alalakh', 'Emar', 'Malatya', 'Isuwa'], -1340, -1201, 60)
add('Kizzuwatna', ['Tarsus', 'Adana'], -1525, -1401, 60)
add('Arzawa', ['Apasa', 'Sardis', 'Manisa', 'Beycesultan', 'Aphrodisias'], -1500, -1321, 70)
add('Mira', ['Apasa', 'Beycesultan', 'Aphrodisias'], -1320, -1201, 70); ov('Mira', 'Hittites', -1320, -1201)
add('Seha River Land', ['Sardis', 'Manisa'], -1320, -1201, 60); ov('Seha River Land', 'Hittites', -1320, -1201)
add('Wilusa', 'Troy', -1500, -1201, 55); ov('Wilusa', 'Hittites', -1320, -1201)

# The Aegean
add('Minoan Crete', ['Knossos', 'Phaistos', 'Malia', 'Zakros', 'Chania', 'Gournia'], -1950, -1451, 45)
add('Minoan Crete', ['Thera'], -1950, -1601, 25)
add('Mycenaean Greece', ['Mycenae', 'Tiryns', 'Pylos', 'Ayios Vasileios', 'Thebes (Greece)', 'Orchomenos', 'Athens'], -1600, -1451, 40)
add('Mycenae', ['Mycenae', 'Tiryns', 'Argos'], -1450, -1201, 36, MYC)
add('Pylos', 'Pylos', -1450, -1201, 55, MYC)
add('Laconia', ['Ayios Vasileios', 'Menelaion'], -1450, -1201, 42, MYC)
add('Thebes', 'Thebes (Greece)', -1450, -1201, 40, MYC)
add('Orchomenus', ['Orchomenos', 'Gla'], -1450, -1201, 28, MYC)
add('Athens', 'Athens', -1450, -1201, 40, MYC)
add('Iolcus', 'Dimini', -1450, -1201, 42, MYC)
add('Knossos', ['Knossos', 'Phaistos', 'Malia', 'Zakros', 'Gournia', 'Chania'], -1450, -1351, 45, MYC)
add('Kydonia', 'Chania', -1350, -1201, 50, MYC)

# Egypt
add('Early Dynastic Period of Egypt', DELTA + MIDDLE + UPPER, -3100, -2687, 90)
add('Old Kingdom of Egypt', DELTA + MIDDLE + UPPER, -2686, -2161, 90)
add('Old Kingdom of Egypt', ['Buhen'], -2600, -2401, 60)
add('Herakleopolitan Kingdom', DELTA + MIDDLE + ['Asyut'], -2160, -2041, 90)
add('Herakleopolitan Kingdom', ['Abydos'], -2160, -2101, 90)
add('Herakleopolitan Kingdom', ['Coptos', 'Thebes', 'Hierakonpolis', 'Edfu', 'Elephantine'], -2160, -2126, 90)
add('Eleventh Dynasty of Egypt', ['Coptos', 'Thebes', 'Hierakonpolis', 'Edfu', 'Elephantine'], -2125, -2041, 90)
add('Eleventh Dynasty of Egypt', ['Abydos'], -2100, -2041, 90)
add('Middle Kingdom of Egypt', DELTA + MIDDLE + UPPER, -2040, -1651, 90)
add('Middle Kingdom of Egypt', ['Aniba', 'Buhen'], -1960, -1651, 70)
add('Middle Kingdom of Egypt', ['Semna'], -1870, -1651, 50)
add('Hyksos', DELTA + MIDDLE, -1650, -1541, 90)
add('Hyksos', ['Sharuhen'], -1650, -1538, 36)
add('Sixteenth Dynasty of Egypt', UPPER, -1650, -1581, 90)
add('Seventeenth Dynasty of Egypt', UPPER, -1580, -1551, 90)
add('New Kingdom of Egypt', UPPER, -1550, -1201, 90)
add('New Kingdom of Egypt', DELTA + MIDDLE, -1540, -1201, 90)
add('New Kingdom of Egypt', ['Sharuhen'], -1537, -1201, 36)
add('New Kingdom of Egypt', ['Aniba', 'Buhen', 'Semna'], -1530, -1201, 70)
add('New Kingdom of Egypt', ['Sai', 'Kerma', 'Kawa', 'Old Dongola'], -1500, -1201, 90)
add('New Kingdom of Egypt', ['Napata'], -1450, -1201, 90)
add('New Kingdom of Egypt', ['Gaza', 'Jaffa', 'Beth-Shean'], -1457, -1201, 28)
add('Kerma', ['Kerma', 'Sai', 'Kawa', 'Old Dongola'], -2500, -1501, 90)
add('Kerma', ['Semna', 'Buhen', 'Aniba'], -1650, -1531, 70)

# Arabia
add('Dilmun', ['Tarut'], -2500, -1721, 30)
add('Dilmun', ['Bahrain', 'Saar'], -2050, -1721, 28)
add('Dilmun', ['Failaka'], -1950, -1721, 18)
add('Dilmun', ['Bahrain', 'Saar'], -1450, -1301, 28); ov('Dilmun', 'Babylonia', -1450, -1301)
add('Magan', ['Hili', 'Bat', 'Umm an-Nar', 'Ras al-Jinz', 'Maysar', 'Tell Abraq', 'Kalba'], -2500, -2001, 55)

# ---------------------------------------------------------------- geometry helpers
def clean(g):
    if g is None or g.is_empty: return None
    g = make_valid(g)
    if g.geom_type == 'GeometryCollection':
        g = unary_union([p for p in g.geoms if p.geom_type in ('Polygon', 'MultiPolygon')])
    return None if g.is_empty else g

def wobble(x, y):
    dx = 0.035 * (math.sin(1.9 * x + 0.7 * y + 0.3) + 0.6 * math.sin(4.1 * x - 2.3 * y + 1.7) + 0.3 * math.sin(7.7 * y + 2.9 * x))
    dy = 0.035 * (math.sin(1.3 * x - 1.7 * y + 2.1) + 0.6 * math.sin(3.7 * y + 2.9 * x + 0.4) + 0.3 * math.sin(8.3 * x - 1.1 * y))
    return x + dx, y + dy

def warp(poly):
    if poly.geom_type == 'MultiPolygon': return unary_union([warp(p) for p in poly.geoms])
    poly = poly.segmentize(0.03)
    return Polygon([wobble(*c) for c in poly.exterior.coords], [[wobble(*c) for c in r.coords] for r in poly.interiors])

LINK = {'Elam': 460, 'Hittites': 360, 'Magan': 340, 'Akkadian Empire': 340, 'Third Dynasty of Ur': 340, 'Assyria': 340,
        'Mitanni': 340, 'Arzawa': 300, 'Canaanite city-states': 160, 'Dilmun': 0, 'Mycenaean Greece': 160, 'Minoan Crete': 120}

def km_between(p, q):
    (x1, y1), (x2, y2) = P[p], P[q]
    dx = (x2 - x1) * math.cos(math.radians((y1 + y2) / 2)); dy = y2 - y1
    return 111.0 * math.hypot(dx, dy)

def links(seeds, limit):
    """Minimum spanning tree over a realm's seats, using only links shorter than the limit (km)."""
    edges = sorted((km_between(seeds[i][0], seeds[j][0]), i, j) for i in range(len(seeds)) for j in range(i + 1, len(seeds)))
    parent = list(range(len(seeds)))
    def find(i):
        while parent[i] != i: parent[i] = parent[parent[i]]; i = parent[i]
        return i
    out = []
    for d, i, j in edges:
        if d > limit: break
        a, b = find(i), find(j)
        if a != b: parent[a] = b; out.append((i, j))
    return out

def disk(lon, lat, km):
    d = Point(lon, lat).buffer(km / 111.0, 48)
    return affinity.scale(d, xfact=1 / math.cos(math.radians(lat)), yfact=1, origin=(lon, lat))

land = clean(unary_union([clean(shape(f['geometry'])) for f in json.load(open(LAND))['features'] if f.get('geometry')]))
land = land.intersection(box(15, 5, 65, 48))
nile_lines = [shape(f['geometry']) for f in json.load(open(RIVERS))['features'] if (f['properties'].get('name') or '') == 'Nile']
nile = unary_union(nile_lines).intersection(box(28, 14, 34, 32)).buffer(0.2)
delta = Polygon([(29.85, 31.05), (30.25, 31.6), (31.0, 31.7), (31.9, 31.6), (32.4, 31.25), (32.2, 30.55), (31.55, 30.05),
                 (31.25, 29.9), (30.95, 30.05), (30.4, 30.45), (29.9, 30.8)])
faiyum = disk(30.75, 29.35, 38)
NILE_MASK = clean(unary_union([nile, delta, faiyum]).intersection(land))

# ---------------------------------------------------------------- build
data = json.load(open(SRC))
keep, dropped = [], 0
for f in data['features']:
    p = f['properties']
    if p['FromYear'] <= END and f.get('geometry'):
        g = shape(f['geometry'])
        if REGION.contains(g.representative_point()):
            dropped += 1
            if p['ToYear'] > END:
                q = dict(p); q['FromYear'] = END + 1
                keep.append({'type': 'Feature', 'properties': q, 'geometry': f['geometry']})
            continue
    keep.append(f)

bounds = {A, END + 1}
for name, r in R.items():
    for _, f, t, _ in r['seeds']:
        for y in (f, t + 1): bounds.add(max(A, min(END + 1, y)))
    for _, f, t in r['ov']:
        for y in (f, t + 1): bounds.add(max(A, min(END + 1, y)))
bounds = sorted(bounds)

def lord(name, y):
    for l, f, t in R[name]['ov']:
        if f <= y <= t: return l
    return None

rows = []
for a, b in zip(bounds, bounds[1:]):
    y = a
    pts, own, reach = [], [], []
    seen = {}
    for name, r in R.items():
        for pl, f, t, km in r['seeds']:
            if f <= y <= t:
                if pl in seen and seen[pl] != name: print('  two realms on one seat:', pl, seen[pl], name, y)
                if pl in seen: continue
                seen[pl] = name
                pts.append(Point(*P[pl])); own.append(name); reach.append((pl, km))
    if not pts: continue
    cells = voronoi_diagram(MultiPoint(pts), envelope=box(10, 0, 70, 52))
    by = {}
    for c in cells.geoms:
        k = next(i for i, p in enumerate(pts) if c.contains(p))
        pl, km = reach[k]
        cw = warp(c)
        piece = cw.intersection(warp(disk(*P[pl], km)))
        mask = NILE_MASK if pl in NILE_PLACES else land
        by.setdefault(own[k], {'cells': [], 'pieces': [], 'mask': []})
        by[own[k]]['cells'].append(cw); by[own[k]]['pieces'].append(piece.intersection(mask))
    for name, d in by.items():
        act = [(pl, km) for pl, f, t, km in R[name]['seeds'] if f <= y <= t]
        act = list(dict(act).items())
        caps = [warp(unary_union([disk(*P[act[i][0]], 0.6 * act[i][1]), disk(*P[act[j][0]], 0.6 * act[j][1])]).convex_hull)
                for i, j in links(act, LINK.get(name, 300 if not R[name]['comp'] else 100))]
        if caps: d['pieces'].append(unary_union(caps).intersection(unary_union(d['cells'])).intersection(land))
        g = clean(unary_union(d['pieces']))
        if g is None: continue
        g = clean(g.buffer(0.1, join_style=1).buffer(-0.1, join_style=1).intersection(unary_union(d['cells'])).intersection(land))
        if g is None: continue
        if any(pl in NILE_PLACES for pl, f, t, km in R[name]['seeds'] if f <= y <= t):
            nonnile = [disk(*P[pl], km) for pl, f, t, km in R[name]['seeds'] if f <= y <= t and pl not in NILE_PLACES]
            g = clean(g.intersection(unary_union([NILE_MASK] + nonnile)))
            if g is None: continue
        props = {'Name': name, 'FromYear': a, 'ToYear': b - 1, 'Kind': 'p', 'MemberOf': R[name]['comp'] or ''}
        l = lord(name, y)
        if l: props['Overlord'] = l
        rows.append({'type': 'Feature', 'properties': props, 'geometry': mapping(g)})

# merge identical consecutive rows
rows.sort(key=lambda f: (f['properties']['Name'], f['properties']['FromYear']))
merged = []
for f in rows:
    m = merged[-1] if merged else None
    if m and m['properties']['Name'] == f['properties']['Name'] and m['properties']['ToYear'] + 1 == f['properties']['FromYear'] \
       and m['properties'].get('Overlord') == f['properties'].get('Overlord') and m['properties']['MemberOf'] == f['properties']['MemberOf'] \
       and shape(m['geometry']).symmetric_difference(shape(f['geometry'])).area < 0.004:
        m['properties']['ToYear'] = f['properties']['ToYear']
    else:
        merged.append(f)

# composite outlines over their members
comps = []
for comp in (SUM, MYC):
    mem = [f for f in merged if f['properties']['MemberOf'] == comp]
    cb = sorted({f['properties']['FromYear'] for f in mem} | {f['properties']['ToYear'] + 1 for f in mem})
    for a, b in zip(cb, cb[1:]):
        gs = [shape(f['geometry']) for f in mem if f['properties']['FromYear'] <= a <= f['properties']['ToYear']]
        if not gs: continue
        g = clean(unary_union(gs).buffer(0.06, join_style=2).buffer(-0.06, join_style=2))
        comps.append({'type': 'Feature', 'properties': {'Name': comp, 'FromYear': a, 'ToYear': b - 1, 'Kind': 'c', 'MemberOf': ''}, 'geometry': mapping(g)})

data['features'] = keep + merged + comps
json.dump(data, open(OUT, 'w'))
print(f'Bronze Age redrawn: {dropped} source rows replaced by {len(merged)} realm rows and {len(comps)} composite rows over {len(bounds) - 1} periods')
