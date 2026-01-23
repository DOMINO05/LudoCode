# Ludocode Fejlesztési Jelentés - Részletes Implementációs Terv

Ez a dokumentum a Ludocode projekt még meg nem valósított funkcióinak kimerítően részletes tervezete, figyelembe véve az üzleti logikát, UI/UX szempontokat, adatmodellt és API specifikációkat.


## 5. Kódírási környezet fejlesztése (Formatter, Auto-save, Sharing)
A fejlesztői élmény professzionálissá tétele.

### Git Commit (Angolul)
`feat: enhance coding environment with prettier formatter, auto-save and code sharing`

### Üzleti Logika és Felhasználói Útvonal
- **Formatter**: Gombnyomásra a kód olvashatóvá válik.
- **Auto-save**: Minden billentyűleütés után 2 másodperccel a kód mentődik lokálisan.
- **Sharing**: A felhasználó generálhat egy publikus kódot ugyan úgy mint a kvízeknél. A community oldalon ugyan abba az input mezőbe lehessen beírni a kódírási környezet megosztási kódját (placeholder="6 karakteres kód..." ).

### Frontend és UI/UX Tervezés
- **Placement**: A Monaco editor feletti eszköztár (Toolbar).
- **Sharing**: Egy "Megosztás" ikon, ami másolható linket generál és állítható hogy csak read only vagy szerkeszthető is legyen.
- **Auto-save visszajelzés**: Apró "Mentve" felirat az editor sarkában.

### Technikai Részletek
- **Library**: `prettier` a frontend oldalon a formázáshoz.
- **Auto-save**: `lodash.debounce` használata a felesleges API hívások vagy localStorage írások elkerülésére.
- **Sharing**: Egy dedikált `/share/:token` útvonal, ahol a kód csak olvasható (ReadOnly) módban jelenik meg vagy Szerkesző módban.

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




Ne legyen a kódrészletekben // comment.
A dashboardon a háttérben csíkok jelennek meg.
Felhasználók által hozzáadott kódok ne jelenjenek meg a tananyagban.
A válaszok kiértékelése nem elég gyors.

szótárba:
iterácio
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
