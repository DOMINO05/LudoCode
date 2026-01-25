# Szerver nélküli (NestJS mentes) átállási terv

Ez a dokumentum leírja a lépéseket, amelyekkel a backendet (NestJS) teljesen ki tudjuk váltani a Supabase natív funkcióival.

## 1. fázis: Adatbázis biztonság és RLS (Row Level Security)

*   **Ezelőtt:** A frontend beküldi az adatokat a NestJS backendnek. A backend a `DATABASE_URL` segítségével "szuperfelhasználóként" (admin) bármit írhat/olvashat az adatbázisban, és a kódban dől el, hogy ki mihez férhet hozzá.
*   **Terv:** A frontend közvetlenül beszél az adatbázissal a Supabase SDK-n keresztül. A védelmet maga az adatbázis látja el.
    *   **RLS engedélyezése:** Minden táblán be kell kapcsolni a Row Level Security-t.
    *   **Policy-k:** SQL szabályokat hozunk létre: pl. `auth.uid() = user_id`, így a felhasználó csak a saját sorait láthatja és módosíthatja.
*   **Megvalósítás:**
    *   Létrehozva a `migrations/010_rls_hardening.sql` migráció.
    *   Minden táblán (profiles, languages, questions, submissions, stb.) bekapcsolva az RLS.
    *   Publikus olvasási szabályok a statikus adatokhoz (kérdések, szótár).
    *   `auth.uid()` alapú védelem a felhasználói adatokhoz (profilok, beküldések, eszköztár).

## 2. fázis: Üzleti logika (PostgreSQL Functions)

*   **Ezelőtt:** Ha veszel valamit a boltban, a NestJS leellenőrzi az egyenlegedet, levonja a pénzt, és hozzáadja a tárgyat a profilodhoz több különálló lépésben.
*   **Terv:** A frontend meghív egy "adatbázis funkciót" (`rpc`).
    *   **Tranzakció kezelés:** Egyetlen SQL függvény fut le az adatbázis szerverén, ami garantálja, hogy vagy az összes lépés sikerül (levonás + hozzáadás), vagy egyik sem. Nincs esély arra, hogy a pénz levonódik, de a tárgyat nem kapod meg egy hálózati hiba miatt.
*   **Megvalósítás:**
    *   Létrehozva több komplex RPC függvény (`migrations/011`, `012`, `014`, `015`, `016`, `018`, `019`, `020`, `021`, `022`, `023`):
        *   `buy_shop_item`: Atomi vásárlási tranzakció.
        *   `complete_submission`: BKT algoritmus alapú szintszámítás, XP/Gem jutalmazás és kihívás frissítés egyetlen hívásban.
        *   `claim_daily_bonus`: Napi bónusz és streak logika.
        *   `check_and_award_badges`: Automatikus jelvény kiosztás.
        *   `sync_profile`: Automatikus profil létrehozás/frissítés.

## 3. fázis: Kódfuttatás (Piston API)

*   **Ezelőtt:** A `CodingPage.jsx` elküldi a kódot a NestJS-nek. A NestJS elindít egy helyi folyamatot (node-pty), lefuttatja a kódot, és visszaküldi az eredményt.
*   **Terv:** A frontend közvetlenül a **Piston API**-nak küldi a kódot.
    *   **Biztonság:** A kódfuttatás egy izolált, külső környezetben történik.
    *   **Ellenőrzés:** A frontend kapja meg a nyers kimenetet, és ő veti össze a várt eredménnyel (tesztesetek).
*   **Megvalósítás:**
    *   Létrehozva a `frontend/src/utils/codeRunner.js` segédfájl.
    *   A kliens oldal végzi a kód wrappelését (Java/Python tesztesetek) és a Piston API hívást.
    *   A tesztesetek validálása közvetlenül a böngészőben történik, az eredményt pedig a `complete_submission` RPC menti el.

## 4. fázis: Frontend Kommunikáció (SDK vs REST)

*   **Ezelőtt:** `fetch(`${API_URL}/quizzes`)` hívásokkal, JSON formátumban kérjük le az adatokat, amiket a NestJS kontrollerek szolgálnak ki.
*   **Terv:** `supabase.from('quizzes').select('*')` hívásokat használunk.
    *   **Típusbiztonság:** A Supabase SDK automatikusan kezeli a kapcsolatot, a hibakezelést és az újrapróbálkozást.
    *   **Realtime:** Lehetőség nyílik arra, hogy pl. a leaderboard azonnal frissüljön mindenkinél, amint valaki pontot szerez (Socket.io nélkül, natív Supabase Realtime-mal).
*   **Megvalósítás:**
    *   Minden fő oldal refaktorálva (`Dashboard.jsx`, `CodingPage.jsx`, `ShopPage.jsx`, `Leaderboard.jsx`, stb.).
    *   Az `API_URL` eltávolítva a `config.js`-ből.
    *   Adatbázis sémák kiegészítve a hiányzó oszlopokkal és táblákkal (`friendship`, `profiles` bővítés).

## 5. fázis: AI és Titkok (Edge Functions)

*   **Ezelőtt:** A NestJS backendben van elrejtve az OpenAI/Anthropic API kulcs, és a backend hívja meg az AI-t.
*   **Terv:** **Supabase Edge Functions**-t használunk.
    *   **Szerver nélküli kód:** Kis TypeScript függvények, amik csak akkor futnak le, amikor meghívják őket. Itt biztonságosan tárolhatók az API kulcsok, amiket a frontend nem lát, de tud használni.
*   **Megvalósítás:**
    *   Létrehozva a `supabase/functions/ai-explanation/index.ts` Edge Function.
    *   A Gemini API kulcs mostantól a Supabase Vault-ban (Secrets) tárolható.
    *   A frontend hiba esetén közvetlenül az Edge Function-t hívja meg a magyarázatért.

## Előnyök
- **0 Ft üzemeltetési költség** (Supabase free tier-en belül).
- **Nincs többé "backend leállás"**.
- **Gyorsabb adatlekérés** (kevesebb hálózati ugrás).