/* Schola: the course. Each age of Roma (roma-data.js) is a unit; each lesson is a run of chronicle entries read in order,
   with the ancient writers (roma-sources.js) set beside them. The trial at the end of a unit is the same one Roma gives,
   and feeds the same cursus honorum. Lessons name events by id; course.js warns in the console if one is missing. */
const COURSE = [
  { era: 'regnum', lessons: [
    { title: 'The founding of the City', aim: 'How the twins of the she-wolf became the founders of a city, and how Romulus gave Rome its walls, its Senate, and its people.',
      events: ['twins-and-the-she-wolf', 'founding-of-rome', 'asylum-and-first-senate', 'sabine-women', 'first-triumph', 'apotheosis-of-romulus'] },
    { title: 'The kings who built Rome', aim: 'What each king after Romulus added: Numa its rites, Tullus and Ancus its reach, the Tarquins and Servius its works and its order.',
      events: ['reign-of-numa', 'horatii-and-curiatii', 'ancus-marcius-ostia', 'tarquinius-priscus-builds', 'servian-census', 'cloaca-maxima', 'sibylline-books'] },
    { title: 'The fall of the kings', aim: 'Why the Romans drove out the Tarquins and swore never again to bear a king.',
      events: ['crime-of-tullia', 'lucretia-and-the-expulsion'] }
  ] },
  { era: 'early-republic', lessons: [
    { title: 'The Republic defends itself', aim: 'How the first consuls took the place of the kings, how the young Republic held off the Tarquins and their allies, and how its two orders learned to settle their quarrels by law.',
      events: ['first-consuls', 'capitoline-temple', 'horatius-at-the-bridge', 'lake-regillus', 'first-secession', 'cincinnatus-dictator', 'twelve-tables'] },
    { title: 'From Veii to the Gallic sack', aim: 'Rome takes its great Etruscan rival, is burned by the Gauls, and rises again behind new walls.',
      events: ['fall-of-veii', 'gallic-sack', 'servian-wall', 'licinian-sextian-laws'] },
    { title: 'The conquest of Italy', aim: 'How Latins, Samnites, and Pyrrhus of Epirus were each overcome, and how roads and colonies bound Italy to Rome.',
      events: ['latin-war', 'caudine-forks', 'via-appia', 'sentinum', 'lex-hortensia', 'pyrrhus-in-italy', 'beneventum'] }
  ] },
  { era: 'punic', lessons: [
    { title: 'Rome takes to the sea', aim: 'A land power builds a fleet from nothing and wins Sicily from Carthage.',
      events: ['messana', 'mylae', 'aegates-islands'] },
    { title: 'Hannibal in Italy', aim: 'Follow Hannibal over the Alps and through three great victories, and watch Rome refuse to yield.',
      events: ['hannibal-crosses-the-alps', 'trebia', 'trasimene', 'fabius-the-delayer', 'cannae'] },
    { title: 'The road to Zama', aim: 'How Marcellus, the Scipios, and the consuls at the Metaurus turned the war, and how Scipio ended it in Africa.',
      events: ['siege-of-syracuse', 'new-carthage', 'metaurus', 'zama'] },
    { title: 'Masters of the Mediterranean', aim: 'The legion meets the phalanx, Macedon and Carthage fall, and the inland sea becomes Our Sea.',
      events: ['cynoscephalae', 'pydna', 'carthage-destroyed', 'fall-of-corinth', 'aqua-marcia'] }
  ] },
  { era: 'late-republic', lessons: [
    { title: 'The Gracchi and the new legions', aim: 'What empire did to the Roman farmer, what the Gracchi tried to do about it, and how Marius remade the army.',
      events: ['tiberius-gracchus-land-law', 'gaius-gracchus', 'jugurthine-war', 'marian-reforms', 'aquae-sextiae-and-vercellae'] },
    { title: 'Sulla and the civil wars', aim: 'The allies win the citizenship, a Roman army marches on Rome for the first time, and Spartacus shakes Italy.',
      events: ['social-war', 'sulla-marches-on-rome', 'sulla-dictator', 'spartacus'] },
    { title: 'Pompey, Cicero, and Caesar', aim: 'Three men at the height of their powers: Pompey in the East, Cicero against Catiline, Caesar in Gaul.',
      events: ['pompey-in-the-east', 'catiline-conspiracy', 'first-triumvirate', 'caesar-bridges-the-rhine', 'alesia'] },
    { title: 'From the Rubicon to Actium', aim: 'Caesar crosses the Rubicon, falls on the Ides of March, and his heir wins the world at Actium.',
      events: ['crossing-the-rubicon', 'pharsalus', 'ides-of-march', 'philippi', 'actium'] }
  ] },
  { era: 'principate', lessons: [
    { title: 'Augustus and the Roman peace', aim: 'How Octavian became Augustus, what he built, and the one disaster of his reign.',
      events: ['augustus-receives-his-name', 'ara-pacis', 'teutoburg-forest', 'death-of-augustus'] },
    { title: 'The heirs of Augustus', aim: 'The Julio-Claudian emperors: Britain won, Boudica crushed, Rome burned, and a year of four emperors.',
      events: ['fall-of-sejanus', 'conquest-of-britain', 'boudican-revolt', 'great-fire-of-rome', 'year-of-the-four-emperors'] },
    { title: 'The Flavians', aim: 'Vespasian and his sons restore order and leave Rome its greatest amphitheater.',
      events: ['eruption-of-vesuvius', 'colosseum', 'palace-of-domitian'] },
    { title: 'The five good emperors', aim: 'From Nerva to Marcus Aurelius: the empire at its widest and best governed.',
      events: ['nerva-adopts-trajan', 'dacian-wars', 'pantheon', 'empire-at-its-greatest-extent', 'hadrians-wall', 'antonine-wall', 'marcomannic-wars'] }
  ] },
  { era: 'severan-crisis', lessons: [
    { title: 'The house of Severus', aim: 'A soldier from Africa founds a dynasty, and every free man of the empire becomes a Roman.',
      events: ['reign-of-commodus', 'year-of-the-five-emperors', 'arch-of-septimius-severus', 'severus-in-britain', 'constitutio-antoniniana', 'baths-of-caracalla', 'severus-alexander', 'age-of-the-jurists'] },
    { title: 'The age of iron', aim: 'Fifty years of trial: an emperor slain by the Goths, another taken by Persia, and the empire split in three.',
      events: ['rome-thousandth-year', 'battle-of-abritus', 'valerian-captured', 'gallic-empire', 'palmyrene-revolt'] },
    { title: 'The restorers', aim: 'How Aurelian and the soldier emperors made the Roman world one again.',
      events: ['aurelian-walls', 'aurelian-restitutor-orbis', 'carus-takes-ctesiphon'] }
  ] },
  { era: 'dominate', lessons: [
    { title: 'Diocletian remakes the state', aim: 'Four rulers, new provinces, a new army, and an emperor who laid down the purple of his own will.',
      events: ['diocletian-acclaimed', 'the-tetrarchy', 'galerius-humbles-persia', 'diocletian-reforms', 'diocletian-abdicates'] },
    { title: 'Constantine and the Cross', aim: 'From York to the Milvian Bridge to Nicaea: the emperor who gave the Church peace and Rome a second capital.',
      events: ['constantine-acclaimed', 'gold-solidus', 'milvian-bridge', 'edict-of-milan', 'battle-of-chrysopolis', 'council-of-nicaea', 'founding-of-constantinople'] },
    { title: 'Julian, Adrianople, and Theodosius', aim: 'A victory on the Rhine, a disaster in Thrace, and the last emperor to rule the whole Roman world.',
      events: ['battle-of-argentoratum', 'julian-persian-expedition', 'battle-of-adrianople', 'edict-of-thessalonica', 'battle-of-the-frigidus'] }
  ] },
  { era: 'west', lessons: [
    { title: 'Stilicho and Alaric', aim: 'Two courts, one empire, and the general who held Italy until the sack of 410.',
      events: ['death-of-theodosius', 'battle-of-pollentia', 'crossing-of-the-rhine', 'battle-of-faesulae', 'sack-of-rome-410'] },
    { title: 'Holding the line', aim: 'The West steadied, the walls of Constantinople raised, the law gathered into a code, and Africa lost.',
      events: ['constantius-restores-the-west', 'theodosian-walls', 'theodosian-code', 'fall-of-carthage'] },
    { title: 'Aetius, Attila, and Pope Leo', aim: 'The last great Roman victory in the West, and the meeting on the Mincio that turned Attila from Rome.',
      events: ['catalaunian-plains', 'leo-meets-attila'] },
    { title: 'The last emperors of the West', aim: 'Majorian fights to restore what was lost, and in 476 the western line of emperors ends.',
      events: ['vandal-sack-of-rome', 'majorian-restores', 'battle-of-cape-bon', 'end-of-the-western-line'] }
  ] },
  { era: 'renovatio', lessons: [
    { title: 'The empire that endured', aim: 'Rome lives on at Constantinople: a full treasury, a new emperor, and the law of a thousand years set in order.',
      events: ['theodoric-italy-488', 'anastasius-treasury-498', 'justinian-accession-527', 'corpus-juris-civilis-529', 'nika-riots-532'] },
    { title: 'The reconquest', aim: 'Belisarius and Narses win back Africa and Italy, and Justinian raises Hagia Sophia.',
      events: ['ad-decimum-533', 'belisarius-triumph-534', 'hagia-sophia-537', 'ravenna-540', 'plague-541', 'taginae-552'] },
    { title: 'Heraclius and the long war', aim: 'The last and greatest war with Persia, from the edge of ruin to the return of the True Cross.',
      events: ['maurice-khosrow-591', 'heraclius-accession-610', 'siege-626', 'nineveh-627', 'true-cross-630'] },
    { title: 'The storm from Arabia', aim: 'Syria and Egypt are lost, and Greek fire saves the City.',
      events: ['yarmuk-636', 'greek-fire-674'] }
  ] },
  { era: 'middle-empire', lessons: [
    { title: 'The walls hold', aim: 'Leo III breaks the great siege, the quarrel over the holy images is fought and settled, and Rome sends its faith to the Slavs.',
      events: ['siege-717', 'iconoclasm-726', 'triumph-of-orthodoxy-843', 'cyril-methodius-863'] },
    { title: 'The Macedonian revival', aim: 'A new dynasty, a revival of learning, and soldier emperors who win back Crete and Antioch.',
      events: ['basil-i-867', 'macedonian-renaissance-945', 'crete-961', 'antioch-969', 'dorostolon-971', 'rus-baptism-988'] },
    { title: 'Basil II and the zenith', aim: 'The empire at its medieval height, and the defeat at Manzikert that opened Anatolia.',
      events: ['kleidion-1014', 'basil-ii-zenith-1025', 'manzikert-1071'] },
    { title: 'The Komnenian restoration', aim: 'Alexios, John, and Manuel Komnenos rebuild Roman power in a world of crusaders and Turks.',
      events: ['alexios-accession-1081', 'levounion-1091', 'first-crusade-1096', 'beroia-1122', 'manuel-antioch-1159', 'myriokephalon-1176'] }
  ] },
  { era: 'last-stand', lessons: [
    { title: 'Exile and return', aim: 'Constantinople falls to the crusaders of 1204, and the Romans of Nicaea win it back.',
      events: ['sack-1204', 'nicaea-1208', 'thessalonica-1246', 'pelagonia-1259', 'recovery-1261'] },
    { title: 'The Palaiologan age', aim: 'A small empire of great art and learning, held together by diplomacy and worn down by civil war.',
      events: ['sicilian-vespers-1282', 'chora-1316', 'civil-war-1341', 'hesychasm-1351'] },
    { title: 'The City alone', aim: 'Blockade, a journey to the West for help, and the walls that turned back one more siege.',
      events: ['bayezid-blockade-1394', 'manuel-journey-1399', 'siege-1422', 'council-florence-1439', 'constantine-xi-proclaimed-1449'] },
    { title: 'The last stand', aim: 'The spring of 1453, and how Constantine XI and his people met the end of two thousand years.',
      events: ['siege-begins-1453', 'four-ships-1453', 'last-liturgy-1453', 'fall-1453'] }
  ] }
];
