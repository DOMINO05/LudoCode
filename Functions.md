# Funkciók Állapota és Fejlesztési Terv

Ez a dokumentum összefoglalja a projekt jelenlegi funkcióit, és részletes promptokat tartalmaz a hiányzó funkciók implementálásához.

---

## 🔴 Megvalósításra Váró (vagy Részleges) Funkciók

Az alábbi funkciók még nincsenek, vagy csak részben vannak implementálva. Mindegyikhez tartozik egy részletes fejlesztési prompt.

### 1. Kezdeti szintfelmérő teszt
**Státusz**: Hiányzik
**Leírás**: Regisztráció után a felhasználó egy tesztet tölt ki, ami beállítja a kezdő `globalProficiency` értékét.
**Prompt**:
> Implementáld a kezdeti szintfelmérő tesztet.
> 1. Hozz létre egy `AssessmentPage.jsx` komponenst a frontend-en.
> 2. Módosítsd a `Dashboard.jsx`-et (vagy `AuthPage`-et), hogy ha a felhasználó `is_assessed` flag-je hamis (hozz létre ehhez mezőt a `Profile` entitásban), akkor ide irányítson át.
> 3. A teszt tartalmazzon 5-10 kérdést különböző nehézségi szinteken.
> 4. A Backend-en (`UsersController`) hozz létre egy végpontot a teszt eredményének fogadására, ami alapján beállítja a felhasználó kezdeti `globalProficiency` (theta) értékét és az `is_assessed` mezőt true-ra állítja.

### 2. Barát bekövetés és Barátrangsor
**Státusz**: Megvalósítva
**Leírás**: Felhasználók követése és szűrt ranglista.
**Prompt**:
> Készítsd el a barát rendszert.
> 1. Backend: Hozz létre egy `Friendship` entitást (follower_id, following_id). Készíts végpontokat követésre (`/users/follow/:id`), követés törlésére és a követettek listázására.
> 2. Frontend: A `ProfilePage`-en vagy egy új `CommunityPage`-en lehessen felhasználókra keresni és bekövetni őket.
> 3. Frontend `Leaderboard.jsx`: Adj hozzá tabokat: "Globális" és "Barátok". A "Barátok" nézet csak azokat a felhasználókat listázza, akiket a bejelentkezett felhasználó követ.

### 3. Saját kvíz létrehozása
**Státusz**: Hiányzik
**Leírás**: A felhasználók saját kérdéssorokat állíthatnak össze.
**Prompt**:
> Implementáld a saját kvíz létrehozásának lehetőségét.
> 1. Backend: Hozz létre `Quiz` és `QuizQuestion` entitásokat. A `Quiz` tartozzon egy `creator_id`-hoz.
> 2. Készíts CRUD végpontokat a kvízek kezelésére (`/quizzes`).
> 3. Frontend: Készíts egy `CreateQuizPage.jsx` oldalt űrlappal, ahol címet, leírást és kérdéseket (típus, tartalom, válaszok) lehet hozzáadni.
> 4. Tedd elérhetővé a kvízeket egy "Közösségi Kvízek" menüpont alatt, ahol mások megoldhatják őket.

### 4. Hibák visszanézése (Mistake Review)
**Státusz**: Hiányzik
**Leírás**: Korábban elrontott feladatok listázása és újbóli megoldása.
**Prompt**:
> Valósítsd meg a hibák visszanézését.
> 1. Backend: A `UserSubmission` entitás már tárolja az eredményeket. Készíts egy végpontot (`/submissions/mistakes`), ami visszaadja a legutóbbi 20 helytelen megoldást (egyedi kérdésenként).
> 2. Frontend: Hozz létre egy `MistakesPage.jsx` oldalt.
> 3. Listázd ki a hibás feladatokat. Kattintáskor navigáljon a `CodingPage`-re (`/solve?questionId=...` módban), ahol újra meg lehet próbálni a feladatot.

### 5. Hibázás mentes sorozat (Streak) bónusz
**Státusz**: Megvalósítva
**Leírás**: Bónusz XP, ha egymás után többször helyesen válaszol, vagy napokon keresztül visszatér.
**Prompt**:
> Implementáld a streak rendszert.
> 1. Backend: A `Profile` entitásban tárolj `current_streak` (napok száma) és `answer_streak` (egymás utáni helyes válaszok) mezőket.
> 2. A `submit` végponton növeld az `answer_streak`-et helyes válasz esetén (és adj bónusz XP-t pl. minden 5. után), illetve nullázd hibásnál.
> 3. A `daily-claim` végponton kezeld a napi belépési streak-et.
> 4. Frontend: Jelenítsd meg a streak-eket a `Dashboard` fejlécében láng ikonnal 🔥.

### 6. Napi és Heti Kihívások
**Státusz**: Hiányzik (Csak napi belépés van)
**Leírás**: Specifikus feladatok (pl. "Oldj meg 3 Python feladatot").
**Prompt**:
> Készítsd el a kihívás rendszert.
> 1. Backend: Hozz létre egy `Challenge` entitást (type, goal_amount, reward_xp, expires_at).
> 2. Hozz létre egy Cron jobot (vagy `TaskService`-t), ami naponta/hetente generál kihívásokat a felhasználóknak (vagy globálisan).
> 3. Backend: A `UserSubmission` mentésekor ellenőrizd, hogy a felhasználó teljesítette-e valamelyik aktív kihívását. Ha igen, add meg a jutalmat.
> 4. Frontend: A `Dashboard`-on jeleníts meg egy "Aktív Kihívások" widgetet progress bar-ral.

### 7. Motivációs idézet
**Státusz**: Hiányzik
**Leírás**: Idézet megjelenítése a napi bónusz átvételekor.
**Prompt**:
> Adj motivációs idézeteket a napi bónuszhoz.
> 1. Backend: Hozz létre egy JSON fájlt vagy adatbázis táblát 50-100 motivációs/programozós idézettel.
> 2. Módosítsd a `/users/daily-claim` végpont válaszát, hogy adjon vissza egy véletlenszerű idézetet is.
> 3. Frontend: A `BonusModal.jsx`-ben jelenítsd meg ezt az idézetet a "Napi Bónusz!" felirat alatt.

### 8. Beépített szakzsargon szótár
**Státusz**: Hiányzik
**Leírás**: Programozási fogalmak magyarázata.
**Prompt**:
> Készíts egy beépített szótárat.
> 1. Hozz létre egy statikus adatállományt (pl. `glossary.json`) a frontend-en, definíciókkal (pl. "Változó", "Ciklus", "Rekurzió").
> 2. Frontend: Hozz létre egy `GlossaryPage.jsx`-et, ahol ABC sorrendben kereshetően listázod ezeket.
> 3. (Opcionális) A feladatok leírásában (`TaskDescription`) lévő kulcsszavakat automatikusan alakítsd tooltip-es linkké, ami megjeleníti a definíciót hover esetén.

### 9. Virtuális mentor karakter
**Státusz**: Részleges (Csak kép van)
**Leírás**: Interaktív segítségnyújtás.
**Prompt**:
> Fejleszd tovább a virtuális mentort.
> 1. Frontend: Hozz létre egy `MentorChat` komponenst, ami a képernyő sarkában nyitható meg.
> 2. Backend: Integrálj egy LLM-et (pl. OpenAI API) vagy készíts egy egyszerű szabály-alapú választ adó rendszert (`MentorService`).
> 3. Küldd el a jelenlegi feladat kontextusát a mentornak, hogy specifikus tippet tudjon adni ("Elakadtam" gomb).

### 10. Számítógépről jobb felhasználói élmény figyelmeztetés
**Státusz**: Hiányzik
**Leírás**: Figyelmeztetés mobil eszközökön.
**Prompt**:
> Adj hozzá mobil nézet figyelmeztetést.
> 1. A `Layout.jsx`-ben vagy `App.jsx`-ben használj egy `useEffect`-et a képernyő szélességének ellenőrzésére.
> 2. Ha a szélesség kisebb mint 768px (vagy 1024px), jeleníts meg egy dismissable (bezárható) bannert vagy modalt: "A LudoCode használata asztali számítógépen javasolt a kódolási feladatok miatt."

### 11. Értesítési rendszer
**Státusz**: Hiányzik
**Leírás**: Értesítések eseményekről (szintlépés, új követő).
**Prompt**:
> Implementáld az értesítési rendszert.
> 1. Backend: Hozz létre `Notification` entitást (user_id, type, message, read, created_at).
> 2. Készíts végpontot az olvasatlan értesítések lekérésére és olvasottnak jelölésére.
> 3. Frontend: A `Layout` fejlécébe tegyél egy csengő ikont, ami jelzi az olvasatlanok számát.
> 4. Kattintásra nyíljon meg egy dropdown az értesítések listájával.

### 12. Teljesített kurzusok badge
**Státusz**: Részleges (Kód kikommentelve)
**Leírás**: Jelvények a profiloldalon.
**Prompt**:
> Élesítsd a Badge rendszert.
> 1. Backend: Hozz létre `Badge` és `UserBadge` entitásokat.
> 2. Definiálj badge-eket (pl. "Python Kezdő" - X db Python feladat után).
> 3. A `submit` logikában vizsgáld a feltételeket, és oszd ki a badge-et ha teljesült.
> 4. Frontend: A `ProfilePage.jsx`-ben vedd ki a kommentből a badges szekciót és jelenítsd meg a felhasználó megszerzett jelvényeit.

### 13. Kódolási extrák (Formatter, Auto-save, Share)
**Státusz**: Hiányzik
**Leírás**: Kényelmi funkciók a szerkesztőben.
**Prompt**:
> Bővítsd a `CodingPage` funkcionalitását.
> 1. **Formatter**: Adj hozzá egy "Formázás" gombot, ami meghívja a Prettier-t (vagy hasonló lib-et) a szerkesztő tartalmára.
> 2. **Auto-save**: Implementálj egy `useDebounce` hook-ot, ami gépelés után 2 másodperccel elmenti a kód állapotát a `localstorage`-ba (vagy backend draft mezőbe), hogy frissítésnél nevesszen el.
> 3. **Share**: Készíts egy "Megosztás" gombot, ami generál egy egyedi linket vagy szöveges vágólapra másolást a kódról.

### 14. Profil rövid leírás (Bio)
**Státusz**: Hiányzik
**Leírás**: Bemutatkozó szöveg a profilon.
**Prompt**:
> Egészítsd ki a profilt Bio mezővel.
> 1. Backend: Adj hozzá `bio` (text) oszlopot a `Profile` táblához. Frissítsd a DTO-kat.
> 2. Frontend `ProfilePage`: Adj hozzá egy `textarea`-t a Username mező alá, ahol szerkeszteni lehet a leírást.
> 3. Frontend `Leaderboard`/`Profile`: Jelenítsd meg a bio-t mások profiljának megtekintésekor (ha implementálsz publikus profilt).

### 15. Easter Egg-ek bővítése
**Státusz**: Megvalósítva (Konami, Ludo), de bővíthető.
**Prompt**:
> (Opcionális) Adj hozzá vizuális Easter Egg-eket, pl. ha a felhasználó a "python" szóra kattint 10-szer, jelenjen meg egy kígyó animáció.

---

## 🟢 Megvalósított Funkciók

Az alábbi funkciók már működnek a rendszerben:

1.  **Bejelentkezés, profil beállítás**: Regisztráció, Bejelentkezés, Profilkép (Avatar) szerkesztő, Felhasználónév módosítás.
2.  **Napi belépési bónusz**: Működő napi XP igénylés (`Daily Bonus`).
3.  **Xp és Hp rendszer**: Implementálva, látható a Dashboard-on és fejlécben.
4.  **Világrangsor**: Globális ranglista működik XP és Proficiency alapján.
5.  **Statisztikák**: Grafikonok (ProgressChart) és statisztikai kártyák a Dashboard-on.
6.  **Kódírási és tesztelési környezet**: Monaco Editor integráció, kódfuttatás backend-en keresztül.
7.  **AI-alapú személyre szabott ajánlások**: A rendszer adaptív (IRT alapú) kérdéseket ajánl a tudásszint alapján (backend logika kész).
8.  **Sötét / Világos mód váltás**: Teljes körű téma támogatás (`ThemeContext`).
9.  **Easter egg-ek**: Billentyűkombinációk figyelése a profil oldalon.
