# LudoCode Aktuális Állapot & Technikai Kézikönyv

Ez a dokumentum részletesen bemutatja a projekt szerver nélküli (Serverless) architektúráját, a komponensek közötti összefüggéseket és a fenntartáshoz szükséges információkat.

---

## 1. Architektúra Összefoglaló

A korábbi NestJS alapú backendet teljesen leváltotta egy modern, eseményvezérelt szerver nélküli stack.

### Frontend (Cloudflare Pages)
- **Helyszín:** `https://ludocode.pages.dev` (és az ehhez kapcsolt saját domain).
- **Build:** `npm run build` parancs fut a `frontend` mappában.
- **Környezeti változók (Cloudflare Settings):**
    - `VITE_SUPABASE_URL`: A Supabase projekt címe.
    - `VITE_SUPABASE_ANON_KEY`: A Supabase anonim API kulcsa.
    - `VITE_API_URL`: Üres (vagy elhagyható), mivel már nincs NestJS backend.

### Adatbázis és Szerver Logika (Supabase)
- **Adatbázis:** PostgreSQL a Supabase felhőjében.
- **Hitelesítés:** Supabase Auth (Email alapú, egyedi felhasználónévvel kiegészítve).
- **Üzleti logika:** Az összes "okos" művelet SQL szinten, **RPC (Remote Procedure Call)** függvényekben van megvalósítva (lásd 2. pont).
- **Biztonság:** **RLS (Row Level Security)**. Minden táblához tartozik legalább egy szabály, ami korlátozza a hozzáférést (pl. `auth.uid() = creator_id`).

### AI Asszisztens (Supabase Edge Functions)
- **Függvény:** `ai-explanation`
- **Motor:** Gemini 2.0 Flash (Google Generative AI).
- **Működés:** A frontend meghívja a függvényt, ami SSE (Server-Sent Events) formátumban streameli a mentor válaszát.
- **Konfiguráció:** A `GEMINI_API_KEY` titkos változóként (Secret) van tárolva a Supabase-en.

### Kódfuttatás (Piston API)
- **Cél:** Biztonságos környezet biztosítása a felhasználói Python/Java kódoknak.
- **URL:** `https://emkc.org/api/v2/piston`
- **Korlát:** Nincs interaktív terminál (nem várja meg az `input()`-ot).

---

## 2. Kritikus Adatbázis Funkciók (RPC)

A kód az alábbi tárolt eljárásokat hívja a `supabase.rpc()` metódussal:

| Funkció neve | Célja |
| :--- | :--- |
| `sync_profile` | Létrehozza vagy frissíti a felhasználó profilját regisztráció után. |
| `complete_submission` | Értékeli a feladatmegoldást, frissíti az XP-t, Gemet, BKT tudásszintet és a sorozatot (streak). |
| `claim_daily_bonus` | Kiosztja a napi XP/Gem bónuszt és frissíti a napi idézetet. |
| `get_user_stats` | Összeállítja a grafikonokhoz szükséges aktivitási és fejlődési adatokat. |
| `get_next_adaptive_question` | Az IRT és BKT algoritmusok alapján kiválasztja a legmegfelelőbb következő feladatot. |
| `complete_placement` | Elmenti a szintfelmérő teszt eredményét. |
| `get_mistake_recovery_question` | Kikeresi a felhasználó legrégebbi javítatlan hibáját. |
| `buy_shop_item` | Biztonságos (tranzakcionális) vásárlás: levonja a Gemet és hozzáadja a tárgyat az inventory-hoz. |

---

## 3. Frontend Adat-Mapping

Mivel a PostgreSQL `snake_case` elnevezéseket használ, de a React kód sok helyen `camelCase`-t vár, a kód szintjén manuális mapping történik az alábbiak szerint:

- `questions` tábla: `q_type` -> `qType`, `language_id` -> `languageId`.
- `profiles` tábla: `avatar_config` -> `avatarConfig`, `sanity_points` -> `sanityPoints`, `current_streak` -> `currentStreak`, `global_proficiency` -> `globalProficiency`.
- `quizzes` tábla: `share_code` -> `shareCode`, `is_public` -> `isPublic`.

---

## 4. Ismert Korlátok és Teendők

### Localhost vs Production eltérések
- **CORS:** A Supabase Edge Functions és a Piston API lezárhatja a kéréseket, ha az Origin nem engedélyezett. A jelenlegi kód tartalmazza a szükséges fejléceket.
- **Port:** Localhoston a 3000-es portot használtuk, Cloudflare-en nincs port (standard 443 HTTPS).

### Lehetséges hibák az átállás után
1.  **Duplicate Key Error:** Ha egy felhasználó kétszer regisztrál ugyanazzal a névvel, a `025`-ös migrációban lévő suffix-generáló logika (`_1234`) lép életbe.
2.  **Schema Cache:** Ha módosítasz egy táblát SQL-ben, a Supabase néha nem látja azonnal. Ilyenkor a `NOTIFY pgrst, 'reload schema';` parancs segít.
3.  **Nuclear Wipe hatása:** A `032`-es migráció után minden régi kvíz törlődött. Csak az újonnan létrehozott kvízek fognak megjelenni.
4.  **Edge Function Timeout:** Az ingyenes Supabase szinten a függvények 10 másodperc után leállhatnak. A Gemini általában 2-5 másodperc alatt válaszol, így ez nem okozhat gondot.
5.  **Piston API limit:** Napi 2000 ingyenes futtatás engedélyezett IP címenként. Ez bőven elég egy induló projekthez.

### Karbantartás
- **Új kérdések:** A `QuestionCreatorPage` UUID-kat használ a nyelvekhez. Ha új nyelvet adsz hozzá, azt először a `languages` táblába kell felvenni.
- **Biztonság:** Az adatbázis jelszavad (`*DominO050325*`) korábban bekerült a git előzményekbe egy scriptben. **ERŐSEN JAVASOLT** a jelszó megváltoztatása a Supabase Settingsben!

---

## 5. Legutóbbi UI Javítások
- **Mobil modálok:** Az `inset-0` helyett `h-[100dvh]` és `z-[9999]` használata a tökéletes középre igazításért.
- **AI Streaming:** SSE (Server-Sent Events) parszolás beépítve a valódi szavankénti megjelenítéshez.
- **Fallback Hint:** Ha az AI 3 másodpercen belül nem kezd el válaszolni, automatikusan megjelenik a statikus magyarázat (hint), hogy ne várakoztassuk a felhasználót.