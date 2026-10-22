/* Orbis Terrarum: content for atlas.html.
   EVENTS: the chronicle. y = year (negative for B.C.), d = date as shown, t = title, p = place, ll = [lon, lat], x = text.
   CITIES: [name, lon, lat, from, to, rank 1-3]. SEAS: [name, lon, lat, rank, Latin name, Latin from, Latin to].
   CAM: [year, wide-screen box, phone box], each box [west, south, east, north]; the view eases between keyframes.
   NAME_FIX: corrections to realm names in the border data. */
const EVENTS = [
  { y: -3100, d: 'c. 3100 B.C.', t: 'Narmer Unites the Two Lands', p: 'Memphis, Egypt', ll: [31.25, 29.85],
    x: 'A king of the south, remembered as Narmer, brings Upper and Lower Egypt under a single crown. On his great palette he strikes down a kneeling foe with his mace while the bodies of his beheaded enemies lie in rows. For three thousand years after him, every pharaoh will rule as Lord of the Two Lands.' },
  { y: -2560, d: 'c. 2560 B.C.', t: 'The Great Pyramid Rises', p: 'Giza, Egypt', ll: [31.13, 29.98],
    x: 'For Pharaoh Khufu, a nation of laborers raises more than two million blocks of stone into a single mountain at Giza. It will stand as the tallest structure made by human hands for nearly four thousand years.' },
  { y: -2500, d: 'c. 2500 B.C.', t: 'The Cities of the Indus', p: 'Mohenjo-daro', ll: [68.14, 27.33],
    x: 'On the Indus, Mohenjo-daro and Harappa are laid out on grids of baked brick, with covered drains, granaries, and a great public bath. Their merchants trade as far as Mesopotamia, and their writing has never been deciphered.' },
  { y: -2334, d: 'c. 2334 B.C.', t: 'Sargon Forges the First Empire', p: 'Akkad, Mesopotamia', ll: [44.5, 32.6],
    x: 'A cupbearer at the court of Kish seizes power, takes the name Sargon, "the true king," and conquers every city of Sumer. He boasts that he washed his weapons in the sea. His realm runs from the Persian Gulf toward the Mediterranean, the first great empire in history.' },
  { y: -1754, d: 'c. 1754 B.C.', t: 'The Laws of Hammurabi', p: 'Babylon', ll: [44.42, 32.54],
    x: 'Hammurabi of Babylon, now master of Mesopotamia, has nearly three hundred laws cut into a stele of black stone for all to see: an eye for an eye, a tooth for a tooth. At its top the king stands before Shamash, the sun god who gave him the right to judge.' },
  { y: -1274, d: '1274 B.C.', t: 'Chariots at Kadesh', p: 'Kadesh, Syria', ll: [36.51, 34.56],
    x: 'Ramesses II and the Hittite king Muwatalli II meet at Kadesh in the greatest chariot battle of antiquity, perhaps five thousand chariots in all. Caught in an ambush, Ramesses cuts his way out and carves a great victory on the temple walls of Egypt; in truth the field was a draw. Fifteen years later the two powers sign one of the oldest peace treaties on record.' },
  { y: -1046, d: '1046 B.C.', t: 'The Mandate Passes to Zhou', p: 'Muye, China', ll: [114.1, 35.4],
    x: 'King Wu of Zhou routs the last Shang king at Muye. The defeated king flees to his palace and burns himself alive. The Zhou declare that Heaven had withdrawn its mandate from a wicked house, a doctrine every Chinese dynasty after them will claim.' },
  { y: -753, d: '753 B.C.', t: 'Romulus Founds Rome', p: 'The Palatine, Rome', ll: [12.485, 41.889],
    x: 'By tradition, on the twenty-first of April, Romulus plows the sacred furrow around the Palatine and kills his brother Remus for leaping the new wall: "So perish whoever else shall leap over my walls" (Livy 1.7). The Romans will count their years from this day, ab urbe condita.' },
  { y: -480, d: '480 B.C.', t: 'Thermopylae and Salamis', p: 'Thermopylae, Greece', ll: [22.54, 38.8],
    x: 'Leonidas and three hundred Spartans, with their Greek allies, hold the pass at Thermopylae against the host of Xerxes for three days. Betrayed by a mountain path, the Spartans fight to the death. Weeks later the Athenian fleet destroys the Persian navy in the strait of Salamis, and Greece is saved.' },
  { y: -331, d: '331 B.C.', t: 'Alexander at Gaugamela', p: 'Gaugamela, Assyria', ll: [43.4, 36.6],
    x: 'Alexander of Macedon, outnumbered several times over, drives his Companion cavalry straight at Darius III. The Great King flees the field for the second time, and the Persian Empire, master of the East for two centuries, falls to a man of twenty-five.' },
  { y: -221, d: '221 B.C.', t: 'The First Emperor', p: 'Xianyang, China', ll: [108.7, 34.33],
    x: 'King Zheng of Qin swallows the last of the Warring States and takes a new title, Qin Shi Huang, the First Emperor. He standardizes script, coinage, weights, and axle widths, joins the northern walls, and goes to his tomb guarded by an army of terracotta soldiers.' },
  { y: -216, d: '216 B.C.', t: 'Cannae', p: 'Apulia, Italy', ll: [16.13, 41.31],
    x: 'Hannibal draws a Roman army of some eighty thousand into his center at Cannae, closes the wings, and annihilates it in a single day, one of the bloodiest in the history of war. Rome refuses to ask for terms. It raises new legions and fights on.' },
  { y: -146, d: '146 B.C.', t: 'Carthage Destroyed', p: 'Carthage, Africa', ll: [10.32, 36.85],
    x: 'After a siege of three years, Scipio Aemilianus storms Carthage, burns it street by street, and sells its survivors into slavery. For years Cato had closed his speeches in the Senate with one demand: Carthage must be destroyed. Corinth falls the same year, and Rome stands without a rival in the Mediterranean.' },
  { y: -31, d: '31 B.C.', t: 'Actium', p: 'Gulf of Ambracia, Greece', ll: [20.74, 38.95],
    x: 'Off Actium, Agrippa’s fleet breaks the ships of Antony and Cleopatra. Within a year both lovers are dead by their own hands, Egypt belongs to Rome, and a century of civil war is over. In 27 B.C. the Senate hails Octavian as Augustus.' },
  { y: 9, d: 'A.D. 9', t: 'The Teutoburg Forest', p: 'Germania', ll: [8.13, 52.41],
    x: 'Arminius, a German chief who had served as a Roman officer, leads three legions under Varus into the forests of Germania and destroys them. Augustus, Suetonius says, beat his head against a door and cried: "Quintilius Varus, give me back my legions!" The Rhine becomes the frontier of the Empire.' },
  { y: 117, d: 'A.D. 117', t: 'The Empire at Its Height', p: 'Selinus, Cilicia', ll: [32.25, 36.27],
    x: 'Trajan, having added Dacia and pressed his legions to the Persian Gulf, dies on the road home at Selinus in Cilicia. The Empire now reaches from Britain to Mesopotamia, the widest the Roman eagles will ever fly.' },
  { y: 312, d: 'A.D. 312', t: 'In This Sign, Conquer', p: 'The Milvian Bridge, Rome', ll: [12.467, 41.935],
    x: 'Marching on Rome, Constantine sees a sign in the heavens and orders the Chi-Rho painted on his soldiers’ shields. At the Milvian Bridge his rival Maxentius is driven into the Tiber and drowned. The first Christian emperor now holds the West, and within a dozen years he will hold it all.' },
  { y: 476, d: 'A.D. 476', t: 'The Last Emperor of the West', p: 'Ravenna, Italy', ll: [12.2, 44.42],
    x: 'The German general Odoacer deposes the boy emperor Romulus Augustulus at Ravenna and sends the imperial regalia to Constantinople. The Western Empire is ended. In the East, Rome endures for nearly a thousand years more.' },
  { y: 533, d: 'A.D. 533', t: 'Belisarius in Africa', p: 'Carthage, Africa', ll: [10.2, 36.75],
    x: 'Belisarius lands in Africa with some fifteen thousand men and destroys the Vandal kingdom in a single campaign. Under Justinian, Roman armies go on to win back Italy and the coast of Spain. For a moment the Mediterranean is a Roman sea again.' },
  { y: 732, d: 'A.D. 732', t: 'Tours', p: 'Between Tours and Poitiers', ll: [0.6, 46.9],
    x: 'Between Tours and Poitiers, the Frankish infantry of Charles Martel stands like a wall of ice against the cavalry of the Umayyad governor Abd al-Rahman. Abd al-Rahman is killed and his army slips away in the night. The tide of the Arab advance into Gaul has turned, and Charles is remembered as Martel, the Hammer.' },
  { y: 800, d: 'A.D. 800', t: 'Charlemagne Crowned', p: 'St. Peter’s, Rome', ll: [12.453, 41.902],
    x: 'On Christmas Day in St. Peter’s, Pope Leo III sets a crown on the head of Charlemagne, King of the Franks, and the people hail him Emperor of the Romans. For the first time in more than three hundred years, the West has an emperor.' },
  { y: 1066, d: 'A.D. 1066', t: 'Hastings', p: 'Sussex, England', ll: [0.49, 50.91],
    x: 'William, Duke of Normandy, breaks the Saxon shield wall at Hastings after a long day of slaughter. King Harold falls, by legend with an arrow in his eye. On Christmas Day William is crowned at Westminster, and the lords of England will speak French for three centuries.' },
  { y: 1099, d: 'A.D. 1099', t: 'Jerusalem Taken', p: 'Jerusalem', ll: [35.23, 31.78],
    x: 'After three years of marching, famine, and siege, the armies of the First Crusade storm Jerusalem on the fifteenth of July and put much of the city to the sword. Godfrey of Bouillon refuses to wear a crown of gold where Christ wore a crown of thorns, and rules as Defender of the Holy Sepulchre.' },
  { y: 1206, d: 'A.D. 1206', t: 'Genghis Khan', p: 'The Onon River', ll: [109.5, 48.6],
    x: 'At a great assembly by the Onon River, the tribes of the steppe raise up Temujin as Genghis Khan. He has united the Mongols by sword and by oath. Within a lifetime his sons and grandsons will build the largest contiguous land empire the world has ever seen, from Korea to the plains of Russia.' },
  { y: 1453, d: 'A.D. 1453', t: 'The Fall of Constantinople', p: 'Constantinople', ll: [28.975, 41.01],
    x: 'After fifty-three days of bombardment by the largest cannon the world had yet seen, Sultan Mehmed II storms the Theodosian Walls. Constantine XI, last emperor of the Romans, throws off his imperial insignia and dies fighting in the breach. By the old Roman reckoning it is the year 2206 from the founding of the City.' },
  { y: 1492, d: 'A.D. 1492', t: 'A New World', p: 'San Salvador, Bahamas', ll: [-74.5, 24.05],
    x: 'In January, Ferdinand and Isabella take Granada, ending nearly eight centuries of Moorish rule in Spain. In October, sailing under their flag, Christopher Columbus crosses the Atlantic and makes landfall in the Bahamas. The known world is about to double in size.' },
  { y: 1521, d: 'A.D. 1521', t: 'Tenochtitlan Falls', p: 'Valley of Mexico', ll: [-99.133, 19.433],
    x: 'Hernán Cortés, with a few hundred Spaniards and tens of thousands of native allies, takes the Aztec capital of Tenochtitlan after a siege of nearly three months. The Aztec Empire falls, and on its ruins the Spaniards build Mexico City, capital of New Spain.' },
  { y: 1571, d: 'A.D. 1571', t: 'Lepanto', p: 'Gulf of Patras, Greece', ll: [21.0, 38.25],
    x: 'The galleys of the Holy League under Don John of Austria shatter the Ottoman fleet at Lepanto, the last great battle of oared ships. A young soldier named Cervantes, who lost the use of his left hand there, called it the noblest occasion the centuries had ever seen.' },
  { y: 1683, d: 'A.D. 1683', t: 'The Relief of Vienna', p: 'The Kahlenberg, Vienna', ll: [16.33, 48.27],
    x: 'With the Ottoman army of Kara Mustafa at the walls of Vienna, King Jan III Sobieski of Poland leads his winged hussars down the Kahlenberg in one of the greatest cavalry charges in history. The siege is broken, and the Turk will never come so far into Europe again.' },
  { y: 1815, d: 'A.D. 1815', t: 'Waterloo', p: 'Brabant, Belgium', ll: [4.41, 50.68],
    x: 'Wellington’s squares hold through a long June afternoon, Blücher’s Prussians fall on the French flank, and Napoleon’s Imperial Guard breaks. The Emperor abdicates and is sent to St. Helena. Europe settles into a century without a general war.' },
  { y: 1914, d: 'A.D. 1914', t: 'Sarajevo', p: 'Sarajevo, Bosnia', ll: [18.413, 43.858],
    x: 'On the twenty-eighth of June, Gavrilo Princip shoots Archduke Franz Ferdinand, heir to the Austro-Hungarian throne, in the streets of Sarajevo. Within six weeks the great powers of Europe are at war, and four empires will not survive it.' }
];

// [name, lon, lat, from, to, rank]
const CITIES = [
  ['Uruk', 45.64, 31.32, -3100, -300, 2], ['Ur', 46.10, 30.96, -3100, -500, 2], ['Memphis', 31.25, 29.85, -3100, 640, 1],
  ['Susa', 48.26, 32.19, -3100, -100, 3], ['Thebes', 32.64, 25.70, -2100, -30, 2], ['Mohenjo-daro', 68.14, 27.33, -2600, -1800, 2],
  ['Harappa', 72.87, 30.63, -2600, -1800, 3], ['Assur', 43.26, 35.46, -2000, -614, 3], ['Babylon', 44.42, 32.54, -1900, -100, 1],
  ['Nineveh', 43.15, 36.36, -1800, -612, 2], ['Hattusa', 34.62, 40.02, -1650, -1180, 2], ['Knossos', 25.16, 35.30, -2000, -1100, 3],
  ['Mycenae', 22.76, 37.73, -1600, -1100, 3], ['Troy', 26.24, 39.96, -1700, -1180, 3], ['Tyre', 35.20, 33.27, -2000, -332, 3],
  ['Anyang', 114.33, 36.10, -1300, -1046, 2], ['Luoyang', 112.45, 34.62, -1036, 2010, 2], ['Jerusalem', 35.23, 31.78, -1000, 2010, 2],
  ['Damascus', 36.29, 33.51, -1000, 2010, 3], ['Athens', 23.73, 37.98, -1400, 2010, 1], ['Sparta', 22.43, 37.07, -900, -146, 3],
  ['Rome', 12.48, 41.89, -753, 2010, 1], ['Carthage', 10.32, 36.85, -814, -146, 1], ['Carthage', 10.32, 36.85, -44, 698, 2],
  ['Persepolis', 52.89, 29.93, -518, -330, 2], ['Pataliputra', 85.14, 25.61, -490, 550, 2], ['Alexandria', 29.92, 31.20, -331, 2010, 1],
  ['Antioch', 36.16, 36.20, -300, 1268, 2], ['Samarkand', 66.97, 39.65, -500, 2010, 3], ['Xianyang', 108.70, 34.33, -350, -206, 2],
  ["Chang'an", 108.94, 34.34, -202, 904, 1], ['Ctesiphon', 44.58, 33.09, -120, 637, 2], ['Byzantium', 28.98, 41.01, -657, 329, 3],
  ['Londinium', -0.12, 51.51, 50, 410, 3], ['Constantinople', 28.98, 41.01, 330, 1930, 1], ['Ravenna', 12.20, 44.42, 402, 751, 3],
  ['Mecca', 39.83, 21.42, 570, 2010, 2], ['Baghdad', 44.37, 33.31, 762, 2010, 1], ['Cordoba', -4.78, 37.88, 716, 1236, 2],
  ['Aachen', 6.08, 50.78, 794, 900, 3], ['Paris', 2.35, 48.86, 508, 2010, 1], ['Kyoto', 135.77, 35.01, 794, 1868, 2],
  ['Angkor', 103.87, 13.41, 802, 1431, 2], ['Venice', 12.33, 45.44, 810, 2010, 2], ['Kiev', 30.52, 50.45, 880, 2010, 2],
  ['London', -0.12, 51.51, 886, 2010, 1], ['Kaifeng', 114.31, 34.80, 960, 1127, 2], ['Cairo', 31.24, 30.04, 969, 2010, 1],
  ['Timbuktu', -3.00, 16.77, 1100, 2010, 3], ['Vienna', 16.37, 48.21, 1100, 2010, 2], ['Hangzhou', 120.16, 30.27, 1132, 1276, 2],
  ['Cuzco', -71.97, -13.53, 1200, 2010, 2], ['Delhi', 77.21, 28.61, 1206, 2010, 1], ['Karakorum', 102.83, 47.20, 1220, 1388, 2],
  ['Khanbaliq', 116.40, 39.90, 1267, 1368, 1], ['Moscow', 37.62, 55.75, 1300, 2010, 1], ['Tenochtitlan', -99.13, 19.43, 1325, 1521, 1],
  ['Vijayanagara', 76.47, 15.33, 1336, 1565, 3], ['Peking', 116.40, 39.90, 1403, 2010, 1], ['Mexico', -99.13, 19.43, 1521, 2010, 2],
  ['Agra', 78.01, 27.18, 1526, 1648, 2], ['Madrid', -3.70, 40.42, 1561, 2010, 1], ['Isfahan', 51.67, 32.65, 1598, 1722, 2],
  ['Edo', 139.69, 35.69, 1603, 1868, 2], ['New Amsterdam', -74.0, 40.71, 1625, 1664, 3], ['New York', -74.0, 40.71, 1664, 2010, 2],
  ['St. Petersburg', 30.31, 59.94, 1703, 1914, 1], ['Petrograd', 30.31, 59.94, 1914, 1924, 2], ['Berlin', 13.40, 52.52, 1701, 2010, 1],
  ['Washington', -77.04, 38.91, 1800, 2010, 1], ['Tokyo', 139.69, 35.69, 1868, 2010, 1], ['Istanbul', 28.98, 41.01, 1930, 2010, 1],
  ['Lisbon', -9.14, 38.72, 1255, 2010, 2]
];
// [name, lon, lat, rank, latin, from, to]
const SEAS = [
  ['Mediterranean Sea', 18.5, 34.6, 1, 'Mare Nostrum', -30, 476], ['Black Sea', 34.5, 43.4, 1, 'Pontus Euxinus', -700, 476],
  ['Red Sea', 38.3, 20.6, 2], ['Persian Gulf', 51.0, 27.0, 2], ['Arabian Sea', 64.0, 15.0, 1], ['Indian Ocean', 78.0, -14.0, 1],
  ['Atlantic Ocean', -38.0, 28.0, 1], ['Pacific Ocean', -145.0, 12.0, 1], ['Pacific Ocean', 160.0, 22.0, 1], ['North Sea', 3.5, 56.2, 2],
  ['Baltic Sea', 19.4, 57.6, 2], ['Bay of Bengal', 89.0, 15.0, 2], ['South China Sea', 114.0, 14.0, 2], ['Caspian Sea', 50.8, 42.3, 2],
  ['Gulf of Mexico', -90.0, 25.0, 2], ['Caribbean Sea', -75.0, 15.0, 2], ['Sea of Japan', 134.5, 40.5, 3], ['Yellow Sea', 123.5, 35.5, 3]
];
const ERAS = [[-3100, -1200, 'Bronze Age'], [-1200, -500, 'Iron Age'], [-500, 476, 'Classical Antiquity'], [476, 1453, 'Middle Ages'], [1453, 1789, 'Early Modern'], [1789, 2010, 'Modern Age']];
// Camera keyframes: year -> [west, south, east, north]
// Camera keyframes: year -> [west, south, east, north] for wide screens, then a tighter core for tall phone screens
const CAM = [
  [-3100, [24, 17, 72, 40], [27, 21, 60, 38]], [-2200, [10, 14, 78, 46], [20, 19, 66, 42]], [-1650, [10, 13, 92, 47], [18, 19, 72, 44]],
  [-1450, [6, 12, 122, 49], [12, 18, 78, 46]], [-1000, [-12, 6, 124, 54], [4, 20, 72, 48]], [-500, [-14, 4, 128, 56], [-6, 22, 66, 50]],
  [1, [-14, 0, 132, 58], [-10, 22, 60, 55]], [600, [-16, -4, 138, 60], [-10, 16, 68, 58]], [1000, [-22, -18, 148, 64], [-12, 10, 80, 60]],
  [1300, [-24, -30, 150, 66], [-14, 0, 118, 62]], [1460, [-30, -36, 152, 68], [-20, -6, 124, 62]], [1525, [-128, -50, 162, 72], [-110, -40, 40, 62]],
  [2010, [-168, -56, 180, 78], [-130, -45, 150, 70]]
];


const NAME_FIX = { 'Zhoa': 'Zhou', 'Cimerians': 'Cimmerians', 'Bosporian Kingdom': 'Bosporan Kingdom', 'Burgandy': 'Burgundy', 'Britany': 'Brittany', 'Quazaq Khanate': 'Kazakh Khanate', 'Etrurians': 'Etruscans', 'Satavahanihara': 'Satavahanas' };
