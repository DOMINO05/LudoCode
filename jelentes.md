# Ludocode Fejlesztési Jelentés - Részletes Implementációs Terv

Ez a dokumentum a Ludocode projekt még meg nem valósított funkcióinak kimerítően részletes tervezete, figyelembe véve az üzleti logikát, UI/UX szempontokat, adatmodellt és API specifikációkat.

---

## 1. Profil beállítás: Rövid leírás (Bio)
A felhasználók személyiségének és céljainak bemutatására szolgáló rövid szöveges mező.

### Üzleti Logika és Felhasználói Útvonal
- **Happy Path**: Felhasználó megnyitja a Profil oldalt -> Beírja a leírást -> Mentés gombra kattint -> A rendszer visszajelzést ad -> A leírás megjelenik a profilján mások számára is.
- **Jogosultság**: Minden bejelentkezett felhasználó szerkesztheti a saját leírását.
- **Trigger**: "Mentés" gomb megnyomása a profil szerkesztése oldalon.
- **Mellékhatások**: Nincsenek kritikus mellékhatások; opcionálisan logolható a változtatás.

### Frontend és UI/UX Tervezés
- **Elhelyezés**: `ProfilePage.jsx`, a felhasználónév alatt, egy többsoros szövegbeviteli mező (Textarea).
- **State-ek**:
    - *Loading*: Mentés közben a gomb inaktív, "Mentés..." felirat.
    - *Error*: Piros keret a mező körül, hibaüzenet a gomb felett.
    - *Success*: Zöld toast üzenet: "Profil sikeresen frissítve!"
- **Inputok**: Textarea, max. 160 karakter, számlálóval a jobb alsó sarokban.
- **Reszponzivitás**: Mobilon teljes szélességű, asztali nézetben a kártya középső részén helyezkedik el.

### Adatbázis és Adatmodell
- **Módosítás**: `profiles` tábla bővítése `bio TEXT` oszloppal.
- **Kényszerek**: Max 160 karakter (alkalmazási szinten és adatbázis szinten is ellenőrizve).
- **Migráció**: `ALTER TABLE profiles ADD COLUMN bio VARCHAR(160);`

### API Interfész
- **Végpont**: `PATCH /users/profile`
- **Request**: `{ "bio": "Szia, a Python a mindenem!" }`
- **Response**: `{ "id": "...", "username": "...", "bio": "...", ... }`
- **Státuszkódok**: 200 (OK), 400 (Bad Request - túl hosszú), 401 (Unauthorized).

---

## 2. Motivációs idézetek
Napi belépéskor megjelenő inspiráló gondolatok a programozás világából.

### Üzleti Logika és Felhasználói Útvonal
- **Happy Path**: Felhasználó belép -> Megkapja a napi bónuszt -> A felugró ablakban (vagy a Dashboardon) megjelenik egy véletlenszerű programozói idézet.
- **Trigger**: `claimDailyBonus` végpont hívása vagy a Dashboard betöltése naponta először.
- **Mellékhatások**: Pozitív pszichológiai hatás, növekvő megtartás (retention).

### Frontend és UI/UX Tervezés
- **Elhelyezés**: A `Dashboard`-on egy "Napi Inspiráció" kártya, dőlt betűkkel, stílusos idézőjelekkel.
- **State-ek**:
    - *Empty*: Ha nincs több idézet (fallback: egy fix alapértelmezett idézet).
    - *Loading*: Csontváz (skeleton) animáció a szöveg helyén.
- **Reszponzivitás**: Rugalmas kártyamagasság a szöveg hosszától függően.

### Adatbázis és Adatmodell
- **Új tábla**: `quotes`
    - `id` (UUID, PK)
    - `text` (TEXT, NOT NULL)
    - `author` (VARCHAR(100), DEFAULT 'Ismeretlen')
- **Kapcsolatok**: Nincsenek közvetlen kapcsolatok más táblákkal.

### API Interfész
- **Végpont**: `GET /quotes/random`
- **Response**: `{ "text": "Talk is cheap. Show me the code.", "author": "Linus Torvalds" }`
- **Státuszkódok**: 200 (OK), 500 (Internal Server Error).

---

## 3. Kezdeti szintfelmérő teszt
Az adaptív algoritmus (IRT/BKT) inicializálása a felhasználó meglévő tudása alapján.

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
Rendszeres célok a felhasználói aktivitás fenntartásához.

### Üzleti Logika és Felhasználói Útvonal
- **Happy Path**: Felhasználó látja a kihívást ("Oldj meg 3 Python feladatot") -> Teljesíti -> Megkapja a jutalmat (XP/Gems).
- **Trigger**: Minden megoldott feladat (`submit` API) után a backend ellenőrzi az aktív kihívásokat.
- **Side effects**: Értesítés küldése ("Kihívás teljesítve!").

### Frontend és UI/UX Tervezés
- **Elhelyezés**: Dashboard jobb oldali sáv vagy külön "Kihívások" kártya.
- **UI elemek**: Kör alakú vagy horizontális progress bar-ok.
- **State-ek**:
    - *Success*: Csillogó effekt a teljesített kihívás körül és egy "Claim" gomb.

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

## 6. AI-alapú személyre szabott ajánlások
Intelligens segítség a tanulási sorrendhez.

### Üzleti Logika és Felhasználói Útvonal
- **Happy Path**: A Dashboardon megjelenik: "Úgy látjuk, a Listák jól mennek, de a Ciklusoknál sokat hibáztál. Próbáld ki ezt a feladatot!"
- **Jogosultság**: Minden tanuló.
- **Biztonság**: Ha LLM-et használunk, a felhasználó kódját anonimizálva küldjük ki.

### API Interfész
- **Végpont**: `GET /recommendations/explanation`
- **Response**: `{ "reason": "A hibáid alapján a logikai operátorok gyakorlása javasolt.", "targetQuestionId": "..." }`

---

## 7. Hibák visszanézése funkció
A hibákból való tanulás elősegítése.

### Üzleti Logika és Felhasználói Útvonal
- **Flow**: Felhasználó megnyitja a "Hibanaplót" -> Kiválaszt egy feladatot -> Látja a saját korábbi hibás kódját és a helyes megoldást egymás mellett.
- **Trigger**: Menüpont: "Elrontott feladataim".

### Frontend és UI/UX Tervezés
- **UI**: Side-by-side diff view (mint a Git commitoknál).
- **Empty state**: "Gratulálunk, nincsenek elrontott feladataid!" stílusos grafikával.

### Adatbázis
- **Lekérdezés**: A `user_submissions` táblából az `is_correct = false` sorok szűrése, de csak az utolsó próbálkozás minden kérdéshez.

---

## 8. Beépített szakzsargon szótár
Azonnali segítség az ismeretlen kifejezésekhez.

### Frontend és UI/UX Tervezés
- **UI**: A feladatleírásokban a szótárban szereplő szavak (pl. "rekurzió") aláhúzva jelennek meg. Fölé vive az egeret (hover) egy kis buborékban (Tooltip) megjelenik a definíció.
- **Kereső**: Külön oldal `/dictionary` keresőmezővel és ABC szerinti navigációval.

### Adatbázis
- **Tábla**: `dictionary` (id, word, definition, lang_id).
- **Teljesítmény**: A frontend az indításkor letöltheti a teljes szótárat (ha nem túl nagy), hogy a tooltip azonnali legyen.

---

## 9. Virtuális mentor karakter
Érzelmi és szakmai támogatás a tanulás során.

### Üzleti Logika
- **Trigger**: HP csökkenés esetén bíztatás, sorozatos jó válaszoknál dicséret.
- **Választhatóság**: A beállításokban kiválasztható a mentor stílusa (pl. Szigorú, Kedves, Vicces).

### Frontend
- **UI**: Egy kis animált SVG vagy WebGL karakter a képernyő sarkában.
- **State-ek**: "Thinking", "Happy", "Sad", "Encouraging".

---

## 10. Desktop élmény figyelmeztetés
A kódolási élmény minőségének biztosítása.

### Frontend
- **Logika**: `useEffect`-ben figyelni a `window.innerWidth` értéket.
- **Küszöb**: 768px alatt.
- **UI**: Egy sárga információs sáv a képernyő tetején: "A kódolási feladatokhoz billentyűzet és nagyobb képernyő javasolt." (X-el bezárható, session-ben elmentve).

---

## 11. Értesítési rendszer
Real-time visszajelzés a fontos eseményekről.

### API Interfész
- **Technológia**: WebSocket (NestJS Gateways / Socket.io).
- **Események**: `NEW_FOLLOWER`, `CHALLENGE_COMPLETED`, `DAILY_STREAK_REMINDER`.

### Frontend
- **UI**: Csengő ikon a headerben piros körrel.
- **Success State**: "Push" értesítés (ha a user engedélyezi).

---

## 12. Badge rendszer (Kitüntetések)
A mérföldkövek vizuális elismerése.

### Üzleti Logika
- **Feltételek**: "Mester" szint egy nyelvből, 30 napos streak, 100 hibátlan feladat, stb.
- **Side effects**: A profilkép körül megjelenő speciális keretek vagy a név melletti ikonok.

### Adatbázis
- **Tábla**: `badges` (id, name, description, icon_path, criteria_json).
- **Tábla**: `user_badges` (user_id, badge_id, awarded_at).

### Validáció
- A backend minden `submit` után ellenőrzi a kritériumokat egy `BadgeService`-ben.
