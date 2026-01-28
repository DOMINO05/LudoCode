# Ludocode Fejlesztési Jelentés - Részletes Implementációs Terv

## Jelenlegi hibák és részletes megoldási javaslatok

Az alábbiakban a rendszerben azonosított hibák és hiányosságok részletes leírása, valamint a javasolt technikai megoldások találhatók.

### 1. Kódrészletek kommentmentesítése [KÉSZ]
**Hiba:** A megjelenített kódrészletekben (pl. coding, debug, parson, predict_output) a `//` vagy `#` kommentek zavaróak lehetnek, vagy elárulhatják a megoldást.
**Megoldás:**
- [x] az összes kérdés átnézése és a kommentek eltávolítása a kódrészletekből.
- **Fájlok:** `questions/coding`, `debug`, `fill_in_blank`, `parsons`, `predict_output` könyvtárakban lévő összes `.json` fájl.

### 8. Megosztott kód frissítése [KÉSZ]
**Hiba:** Ha egy felhasználó módosítja a megosztott kódját, a kód csak akor szinkronizálódik ha ráfrissítek az oldalra.
**Megoldás:**
- [x] Supabase Realtime feliratkozás javítása a frontenden (`PlaygroundPage.jsx`), a szűrő most már helyesen a `share_code` mezőt figyeli és kis/nagybetű érzéketlen.
- [x] Realtime publikáció engedélyezése az adatbázisban a `shared_snippets` táblára (`039` migráció).
- **Fájlok:** `frontend/src/PlaygroundPage.jsx`, `migrations/039_enable_realtime_snippets.sql`

### 9. Heti küldetések hiánya [KÉSZ]
**Hiba:** A felhasználók nem látnak heti küldetéseket, vagy azok nem generálódnak le (Nincs elérhető heti küldetés.).
**Megoldás:**
- [x] A `get_active_challenges()` RPC függvény kiegészítése a heti küldetések generálásával.
- [x] Heti küldetések automatikus rotációja (2 db hetente) a `challenge_templates` alapján.
- [x] Lejárati idő helyes beállítása a hét végére.
- **Fájlok:** `migrations/040_fix_weekly_challenges.sql`

### 10. Bolt: Többszörös vásárlás [KÉSZ]
**Hiba:** Ugyanazt a tartós tárgyat (pl. kinézetet) többször is meg lehet venni, feleslegesen költve a drágaköveket.
**Megoldás:**
- [x] A `get_shop_items` RPC függvény kiegészítése `is_owned` mezővel, ami jelzi, ha a felhasználó már megvette az adott tárgyat.
- [x] A `ShopPage.jsx` frissítése: a tartós tárgyaknál a gomb helyett "Megvásárolva" felirat jelenik meg, ha már birtokolja a felhasználó.
- [x] Fogyóeszközök (Streak Freeze, XP Boost) továbbra is többször megvásárolhatóak maradnak.
- **Fájlok:** `frontend/src/ShopPage.jsx`, `migrations/041_get_shop_items_with_ownership.sql`


### 12. Szótár bővítése
**Hiba:** Hiányzik az "iteráció" fogalma a szótárból.
**Megoldás:**
- Adatbázis migráció vagy seed script bővítése az új fogalommal.
- **Definíció:** "Egy folyamat ismétlése, például egy lista elemein való végigmenés (ciklus) egy programban."
- **Fájlok:** `migrations/008_dictionary.sql`
