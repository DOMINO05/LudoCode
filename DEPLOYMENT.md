# LudoCode Telepítési Útmutató (Cloudflare & Backend)

Ez a dokumentum segít a projekt élesítésében.

## 1. Frontend (Cloudflare Pages)

A frontendet a Cloudflare Pages segítségével tudod publikálni a GitHub repódból.

### Beállítások a Cloudflare felületén:
1. Menj a **Workers & Pages** menüpontba.
2. Kattints a **Create application** -> **Pages** -> **Connect to Git** gombra.
3. Válaszd ki a `LudoCode` repót.
4. **Build settings:**
   - **Framework preset:** `Vite` (vagy None)
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Root directory:** `frontend`
5. **Environment variables (Környezeti változók):**
   A "Settings" -> "Environment variables" alatt add meg a következőket:
   - `VITE_API_URL`: A backend (API) elérhetősége (pl. `https://ludocode-api.railway.app`)
   - `VITE_SUPABASE_URL`: A Supabase projekted URL-je.
   - `VITE_SUPABASE_ANON_KEY`: A Supabase anon key-ed.

## 2. Backend (API)

A Cloudflare Pages csak statikus fájlokat szolgál ki. A NestJS backendet egy külön szolgáltatónál kell futtatnod.

### Javasolt szolgáltatók:
- **Railway.app** (Nagyon egyszerű NestJS-hez)
- **Render.com**
- **VPS** (pl. DigitalOcean, Hetzner)

### Backend környezeti változók:
A backendnek szüksége lesz egy PostgreSQL adatbázisra (a Supabase adatbázisa is használható).
Szükséges változók:
- `DATABASE_URL`: A PostgreSQL kapcsolati string.
- `JWT_SECRET`: Egy titkos kulcs a bejelentkezéshez.
- `PORT`: 3000 (vagy amit a szolgáltató ad).
- `FRONTEND_URL`: A Cloudflare Pages-en futó frontend URL-je (pl. `https://ludocode.pages.dev` vagy a saját domained).

## 3. Domain beállítása

1. A Cloudflare Pages-ben menj a **Custom domains** fülre.
2. Add hozzá a saját domainedet.
3. A Cloudflare automatikusan beállítja a DNS rekordokat és a SSL tanúsítványt.

## 4. Megjegyzés a CORS-hoz
A backendben (pl. `backend/src/main.ts`) győződj meg róla, hogy a CORS engedélyezve van a frontend domained számára!