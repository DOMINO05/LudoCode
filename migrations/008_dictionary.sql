-- 8. BEÉPÍTETT SZAKZSARGON SZÓTÁR

-- Tábla létrehozása
CREATE TABLE public.dictionary (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  word text NOT NULL,
  definition text NOT NULL,
  category text, -- Opcionális: pl. 'general', 'python', 'java'
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index a gyors kereséshez (bár kliens oldalon lesz a fő keresés)
CREATE INDEX idx_dictionary_word ON public.dictionary(word);

-- RLS
ALTER TABLE public.dictionary ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read dictionary" ON public.dictionary FOR SELECT USING (true);

-- Kezdeti adatfeltöltés
INSERT INTO public.dictionary (word, definition, category) VALUES
('rekurzió', 'Egy olyan eljárás vagy függvény, amely önmagát hívja meg a probléma egy kisebb részfeladatának megoldására. Fontos eleme a báziseset, ami megállítja a hívásokat.', 'general'),
('változó', 'Egy névvel ellátott tárolóhely a memóriában, amely adatot (értéket) tartalmaz, és amelynek tartalma a program futása során megváltozhat.', 'general'),
('ciklus', 'Programozási szerkezet, amely lehetővé teszi egy utasításblokk ismételt végrehajtását, amíg egy feltétel igaz.', 'general'),
('függvény', 'Újrafelhasználható kódrészlet, amely egy adott feladatot végez el. Bemeneti paramétereket kaphat és visszatérési értéket adhat.', 'general'),
('objektum', 'Az objektumorientált programozás alapköve. Adatokat (tulajdonságok) és a rajtuk végzett műveleteket (metódusok) foglal egy egységbe.', 'general'),
('osztály', 'Egy sablon vagy tervrajz objektumok létrehozására. Meghatározza az objektumok közös tulajdonságait és viselkedését.', 'general'),
('tömb', 'Azonos típusú adatok tárolására szolgáló adatszerkezet, ahol az elemekre indexük alapján hivatkozhatunk.', 'general'),
('debug', 'A programhibák (bugok) keresésének és javításának folyamata.', 'general'),
('fordító', 'Olyan program, amely a magas szintű programozási nyelven írt kódot a számítógép által érthető gépi kódra fordítja.', 'general'),
('szintaxis', 'Egy programozási nyelv nyelvtani szabályainak összessége, amely meghatározza, hogyan kell helyesen írni a kódot.', 'general'),
('string', 'Karakterek sorozata, amelyet szövegek tárolására és manipulálására használnak.', 'general'),
('boolean', 'Logikai adattípus, amelynek csak két értéke lehet: igaz (true) vagy hamis (false).', 'general'),
('algoritmus', 'Lépések pontos sorozata egy adott probléma megoldására vagy egy feladat elvégzésére.', 'general'),
('API', 'Application Programming Interface - Alkalmazásprogramozási felület. Szabályok és definíciók készlete, amely lehetővé teszi, hogy különböző szoftverek kommunikáljanak egymással.', 'general'),
('kivétel', 'Exception - Futás közben fellépő hiba vagy rendkívüli esemény, amely megszakítja a program normál futását.', 'general');
