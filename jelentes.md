# Ludocode Fejlesztési Jelentés - Részletes Implementációs Terv

Ez a dokumentum a Ludocode projekt még meg nem valósított funkcióinak kimerítően részletes tervezete, figyelembe véve az üzleti logikát, UI/UX szempontokat, adatmodellt és API specifikációkat.


## 3. Kezdeti szintfelmérő teszt
Az adaptív algoritmus (IRT/BKT) inicializálása a felhasználó meglévő tudása alapján.

### Git Commit (Angolul)
`feat: add initial placement test to initialize adaptive learning parameters`

### Üzleti Logika és Felhasználói Útvonal
- **Happy Path**: Regisztráció után felugrik egy modal: "Szeretnél szintfelmérőt?" -> 10 vegyes nehézségű kérdés megválaszolása -> A rendszer kiszámítja a kezdő `global_proficiency` értéket -> A tanulási útvonal ehhez igazodik.
- **Trigger**: Az első sikeres belépés (ha a `global_proficiency` még default értéken van).
- **Mellékhatások**: A `user_concept_mastery` tábla feltöltése kezdeti adatokkal.

### Frontend és UI/UX Tervezés
- **Elhelyezés**: Dedikált oldal `/placement-test` vagy egy kötelező modal az első indításkor.
- **UI elemek**: Progress bar (1/10), "Kihagyás" gomb (opcionális, ez esetben Beginner szintről indul).
- **Success State**: Konfetti animáció és egy összegző kártya: "Te egy Java Guru vagy! A tananyagot a szintedhez igazítottuk."

### Adatbázis és Adatmodell
- **Módosítás**: Nincs szükség új táblára, de a `profiles` táblában egy `has_completed_placement` (boolean) mező javasolt.
- **Logika**: A teszt eredménye közvetlenül a `global_proficiency` (float) mezőt írja felül.

### API Interfész
- **Végpont**: `POST /questions/placement-results`
- **Request**: `{ "answers": [{ "questionId": "...", "isCorrect": true }, ...] }`
- **Response**: `{ "newProficiency": 1.45, "rank": "Intermediate" }`
- **Státuszkódok**: 201 (Created).

---

## 4. Napi és Heti kihívások
Rendszeres célok a felhasználói aktivitás fenntartásához. Minden nap és minden héten más feladatok (
a napi célok egyszerűen teljesíthetőek legyenek, pl oldj meg helyesen 5 feladatot, vegyél részt egy kvízben, módosítsd a karaktered, javítsd ki 3 hibádat, stb
a heti kihívásokat több időbe teljen megcsinálni, pl érj el 4-os streak-et, gyűjts 20 gemet, stb.

### Git Commit (Angolul)
`feat: implement daily and weekly challenge system with rewards`

### Üzleti Logika és Felhasználói Útvonal
- **Happy Path**: Felhasználó látja a kihívást ("Oldj meg 3 Python feladatot") -> Teljesíti -> Ilyenkor a feladat mellet "Begyüjtés" gombra nyomva megkapja a jutalmat (xp/gem)".
- **Trigger**: Minden megoldott feladat (`submit` API) után a backend ellenőrzi az aktív kihívásokat.
- **Side effects**: Értesítés küldése ("Kihívás teljesítve!"), ugyan úgy mint a badge megszerzésénél.

### Frontend és UI/UX Tervezés
- **Elhelyezés**: Széles kijelzőn a Dashboard jobb oldali sávjában, telefonon külön "Kihívások" kártya.
- **UI elemek**: Horizontális progress bar-ok.
- **State-ek**:
    - *Success*: Csillogó effekt a teljesített kihívás körül és egy "Begyüjtés" gomb.

### Adatbázis és Adatmodell
- **Új tábla**: `challenges` (id, title, type, goal_value, reward_xp, reward_gems).
- **Új tábla**: `user_challenges` (user_id, challenge_id, current_value, is_claimed).
- **Constraints**: Egy felhasználónak naponta max 3 aktív kihívása lehet.

### API Interfész
- **Végpont**: `GET /challenges/my-active`
- **Végpont**: `POST /challenges/claim/:id`
- **Status codes**: 200, 400 (ha már claimelt), 404.

---

## 5. Kódírási környezet fejlesztése (Formatter, Auto-save, Sharing)
A fejlesztői élmény professzionálissá tétele.

### Git Commit (Angolul)
`feat: enhance coding environment with prettier formatter, auto-save and code sharing`

### Üzleti Logika és Felhasználói Útvonal
- **Formatter**: Gombnyomásra a kód olvashatóvá válik.
- **Auto-save**: Minden billentyűleütés után 2 másodperccel a kód mentődik lokálisan.
- **Sharing**: A felhasználó generálhat egy publikus linket a megoldásához.

### Frontend és UI/UX Tervezés
- **Placement**: A Monaco editor feletti eszköztár (Toolbar).
- **Sharing**: Egy "Megosztás" ikon, ami másolható linket generál egy popupban.
- **Auto-save visszajelzés**: Apró "Mentve" felirat az editor sarkában.

### Technikai Részletek
- **Library**: `prettier` a frontend oldalon a formázáshoz.
- **Auto-save**: `lodash.debounce` használata a felesleges API hívások vagy localStorage írások elkerülésére.
- **Sharing**: Egy dedikált `/share/:token` útvonal, ahol a kód csak olvasható (ReadOnly) módban jelenik meg.


---

## 8. Beépített szakzsargon szótár
Azonnali segítség az ismeretlen kifejezésekhez.

### Git Commit (Angolul)
`feat: add programming jargon dictionary with interactive tooltips`

### Frontend és UI/UX Tervezés
- **UI**: A feladatleírásokban a szótárban szereplő szavak (pl. "rekurzió") aláhúzva jelennek meg. Fölé vive az egeret (hover) egy kis buborékban (Tooltip) megjelenik a definíció.
- **Kereső**: Külön oldal `/dictionary` keresőmezővel és ABC szerinti navigációval.

### Adatbázis
- **Tábla**: `dictionary` (id, word, definition, lang_id).
- **Teljesítmény**: A frontend az indításkor letöltheti a teljes szótárat (ha nem túl nagy), hogy a tooltip azonnali legyen.

---

## 9. Virtuális mentor karakter
Érzelmi és szakmai támogatás a tanulás során.

### Git Commit (Angolul)
`feat: implement virtual mentor character with dynamic emotional states`

### Üzleti Logika
- **Trigger**: HP csökkenés esetén bíztatás, sorozatos jó válaszoknál dicséret.
- **Választhatóság**: A beállításokban kiválasztható a mentor stílusa (pl. Szigorú, Kedves, Vicces).

### Frontend
- **UI**: Egy kis animált SVG vagy WebGL karakter a képernyő sarkában.
- **State-ek**: "Thinking", "Happy", "Sad", "Encouraging".






---
---
---
---

## 10. Desktop élmény figyelmeztetés
A kódolási élmény minőségének biztosítása.

### Git Commit (Angolul)
`feat: add desktop experience warning for mobile users on coding pages`

### Frontend
- **Logika**: `useEffect`-ben figyelni a `window.innerWidth` értéket.
- **Küszöb**: 768px alatt.
- **UI**: Egy sárga információs sáv a képernyő tetején: "A kódolási feladatokhoz billentyűzet és nagyobb képernyő javasolt." (X-el bezárható, session-ben elmentve).
