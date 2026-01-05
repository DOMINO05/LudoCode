-- ====================================================================
-- 1. RÉSZ: ADATBÁZIS TAKARÍTÁS ÉS ÚJRAÉPÍTÉS
-- ====================================================================

-- Bővítmények
create extension if not exists "uuid-ossp";

-- Meglévő táblák törlése (Tiszta lappal indulunk)
drop table if exists public.user_submissions cascade;
drop table if exists public.question_concepts cascade;
drop table if exists public.user_concept_mastery cascade;
drop table if exists public.questions cascade;
drop table if exists public.concepts cascade;
drop table if exists public.profiles cascade;
drop type if exists question_type;

-- Típus létrehozása
create type question_type as enum (
  'theory', 'predict_output', 'fill_in_blank', 'parsons', 'debug', 'coding'
);

-- Táblák létrehozása
create table public.profiles (
  id uuid references auth.users not null primary key,
  username text,
  avatar_url text,
  xp int default 0,
  hp int default 5,
  streak int default 0,
  global_elo_rating float default 1000.0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.concepts (
  id uuid default uuid_generate_v4() primary key,
  name text unique not null,
  description text
);

create table public.questions (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  description text,
  hint text,
  q_type question_type not null,
  difficulty_rating float default 1000.0,
  language text not null,
  content jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.question_concepts (
  question_id uuid references public.questions(id) on delete cascade,
  concept_id uuid references public.concepts(id) on delete cascade,
  primary key (question_id, concept_id)
);

create table public.user_submissions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  question_id uuid references public.questions(id) on delete set null,
  is_correct boolean not null,
  submitted_answer text,
  execution_time_ms int,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS (Biztonság) bekapcsolása
alter table public.profiles enable row level security;
alter table public.questions enable row level security;
alter table public.user_submissions enable row level security;

-- Házirendek
create policy "Public read profiles" on public.profiles for select using (true);
create policy "Update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Public read questions" on public.questions for select using (true);
create policy "Insert own submissions" on public.user_submissions for insert with check (auth.uid() = user_id);
create policy "Read own submissions" on public.user_submissions for select using (auth.uid() = user_id);

-- Napi belépések naplózása a bónuszhoz és a streak-hez
create table public.daily_logins (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  login_date date default current_date not null, -- Csak a napot tároljuk, az időt nem
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Egy felhasználó egy nap csak egyszer szerepelhet ebben a táblában!
-- Ez megkönnyíti a bónusz ellenőrzést: ha a mai napra van insert, dob egy hibát vagy nem csinál semmit.
create unique index idx_daily_logins_user_date on public.daily_logins (user_id, login_date);

-- RLS
alter table public.daily_logins enable row level security;
create policy "Read own logins" on public.daily_logins for select using (auth.uid() = user_id);
-- Insertet a backend fogja csinálni "admin" joggal (vagy service role-lal), de ha kliensről akarod:
create policy "Insert own login" on public.daily_logins for insert with check (auth.uid() = user_id);


-- ====================================================================
-- 2. RÉSZ: ADATFELTÖLTÉS (60 DB FELADAT)
-- ====================================================================

DO $$
DECLARE
  c_basics uuid;
  c_loops uuid;
  c_logic uuid;
  c_arrays uuid;
  c_functions uuid;
  c_oop uuid;
  q_id uuid;
BEGIN

  -- 1. Fogalmak létrehozása
  INSERT INTO public.concepts (name, description) VALUES 
  ('basics', 'Alapok'), ('loops', 'Ciklusok'), ('logic', 'Logika'), 
  ('arrays', 'Adatszerkezetek'), ('functions', 'Függvények'), ('oop', 'Objektum Orientáltság')
  ON CONFLICT (name) DO NOTHING;

  SELECT id INTO c_basics FROM public.concepts WHERE name = 'basics';
  SELECT id INTO c_loops FROM public.concepts WHERE name = 'loops';
  SELECT id INTO c_logic FROM public.concepts WHERE name = 'logic';
  SELECT id INTO c_arrays FROM public.concepts WHERE name = 'arrays';
  SELECT id INTO c_functions FROM public.concepts WHERE name = 'functions';
  SELECT id INTO c_oop FROM public.concepts WHERE name = 'oop';

  ------------------------------------------------------------------------------------
  -- 1. TÍPUS: ELMÉLET (Theory) - 10 db (5 Python, 5 Java)
  ------------------------------------------------------------------------------------

  -- PYTHON (Theory)
  INSERT INTO public.questions (title, description, hint, q_type, difficulty_rating, language, content) VALUES 
  ('Python Komment', 'Melyik jel vezeti be a kommentet Pythonban?', 'Ez a jel a hashtag.', 'theory', 800, 'python', 
  '{"options": ["//", "/*", "#", "--"], "correct_answer": "#", "explanation": "Pythonban a # jel utáni rész kommentnek számít."}') RETURNING id INTO q_id; INSERT INTO public.question_concepts VALUES (q_id, c_basics);

  INSERT INTO public.questions (title, description, hint, q_type, difficulty_rating, language, content) VALUES 
  ('Python Típusosság', 'Milyen típusosságú nyelv a Python?', 'Nem kell előre megadni a típust.', 'theory', 900, 'python', 
  '{"options": ["Statikus", "Dinamikus", "Gyenge", "Fordított"], "correct_answer": "Dinamikus", "explanation": "Pythonban a változók típusa futásidőben dől el."}') RETURNING id INTO q_id; INSERT INTO public.question_concepts VALUES (q_id, c_basics);

  INSERT INTO public.questions (title, description, hint, q_type, difficulty_rating, language, content) VALUES 
  ('Python List vs Tuple', 'Mi a fő különbség a Lista és a Tuple között?', 'A változtathatóság a kulcs.', 'theory', 1100, 'python', 
  '{"options": ["A lista gyorsabb", "A tuple immutábilis (nem módosítható)", "A lista csak számokat tárol", "Nincs különbség"], "correct_answer": "A tuple immutábilis (nem módosítható)", "explanation": "A tuple elemeit létrehozás után nem lehet megváltoztatni."}') RETURNING id INTO q_id; INSERT INTO public.question_concepts VALUES (q_id, c_arrays);

  INSERT INTO public.questions (title, description, hint, q_type, difficulty_rating, language, content) VALUES 
  ('Python Indentálás', 'Mit jelöl a behúzás (indentation) Pythonban?', 'Más nyelvek kapcsos zárójelet használnak erre.', 'theory', 850, 'python', 
  '{"options": ["Csak stílus", "Kódblokkokat", "Kommenteket", "Változó deklarációt"], "correct_answer": "Kódblokkokat", "explanation": "Pythonban a behúzás határozza meg, mettől meddig tart egy if, ciklus vagy függvény."}') RETURNING id INTO q_id; INSERT INTO public.question_concepts VALUES (q_id, c_basics);

  INSERT INTO public.questions (title, description, hint, q_type, difficulty_rating, language, content) VALUES 
  ('Python Init', 'Mire való a __init__ metódus?', 'Hasonlít a Java konstruktorhoz.', 'theory', 1200, 'python', 
  '{"options": ["Fájl törlése", "Objektum inicializálása (konstruktor)", "Program leállítása", "Modul importálása"], "correct_answer": "Objektum inicializálása (konstruktor)", "explanation": "Ez a metódus fut le automatikusan egy osztály példányosításakor."}') RETURNING id INTO q_id; INSERT INTO public.question_concepts VALUES (q_id, c_oop);

  -- JAVA (Theory)
  INSERT INTO public.questions (title, description, hint, q_type, difficulty_rating, language, content) VALUES 
  ('Java Változó', 'Hogyan deklarálsz helyesen egy egész számot Java-ban?', 'A típusnak elöl kell lennie.', 'theory', 800, 'java', 
  '{"options": ["num x = 5;", "int x = 5;", "x = 5;", "float x = 5;"], "correct_answer": "int x = 5;", "explanation": "Java erősen típusos, az int kulcsszó jelöli az egészeket."}') RETURNING id INTO q_id; INSERT INTO public.question_concepts VALUES (q_id, c_basics);

  INSERT INTO public.questions (title, description, hint, q_type, difficulty_rating, language, content) VALUES 
  ('Java Bytecode', 'Mi a Java fordítás eredménye?', 'Ez fut a JVM-en.', 'theory', 1000, 'java', 
  '{"options": ["Gépi kód (.exe)", "Bytecode (.class)", "Forráskód", "Assembly"], "correct_answer": "Bytecode (.class)", "explanation": "A Java compiler bytekódot állít elő, amit a Java Virtual Machine futtat."}') RETURNING id INTO q_id; INSERT INTO public.question_concepts VALUES (q_id, c_basics);

  INSERT INTO public.questions (title, description, hint, q_type, difficulty_rating, language, content) VALUES 
  ('Java Final', 'Mit jelent a final kulcsszó változónál?', 'Nem lehet megváltoztatni.', 'theory', 1100, 'java', 
  '{"options": ["A változó konstans lesz", "A változó publikus lesz", "A változó törlődik", "Utolsó elem a tömbben"], "correct_answer": "A változó konstans lesz", "explanation": "A final változók értéke inicializálás után nem módosítható."}') RETURNING id INTO q_id; INSERT INTO public.question_concepts VALUES (q_id, c_basics);

  INSERT INTO public.questions (title, description, hint, q_type, difficulty_rating, language, content) VALUES 
  ('Java Belépési Pont', 'Melyik a helyes main metódus szignatúra?', 'public static void...', 'theory', 900, 'java', 
  '{"options": ["void main()", "public static void main(String[] args)", "static int main()", "public void main(String args)"], "correct_answer": "public static void main(String[] args)", "explanation": "Ez a szabványos belépési pont minden Java alkalmazásban."}') RETURNING id INTO q_id; INSERT INTO public.question_concepts VALUES (q_id, c_functions);

  INSERT INTO public.questions (title, description, hint, q_type, difficulty_rating, language, content) VALUES 
  ('Java Primitívek', 'Melyik NEM primitív típus?', 'Nagybetűvel kezdődik.', 'theory', 950, 'java', 
  '{"options": ["int", "double", "boolean", "String"], "correct_answer": "String", "explanation": "A String egy osztály (objektum), míg a többi primitív típus."}') RETURNING id INTO q_id; INSERT INTO public.question_concepts VALUES (q_id, c_basics);

  ------------------------------------------------------------------------------------
  -- 2. TÍPUS: KIMENET JÓSLÁSA (Predict Output) - 10 db
  ------------------------------------------------------------------------------------

  -- PYTHON (Predict)
  INSERT INTO public.questions (title, description, hint, q_type, difficulty_rating, language, content) VALUES 
  ('Python Szeletelés', 'Mit ír ki: print("Python"[-1])?', 'Negatív index hátulról számol.', 'predict_output', 900, 'python', 
  '{"code_snippet": "x = ''Python''\nprint(x[-1])", "options": ["P", "n", "o", "Hiba"], "correct_answer": "n", "explanation": "A -1 index az utolsó karaktert adja vissza."}') RETURNING id INTO q_id; INSERT INTO public.question_concepts VALUES (q_id, c_arrays);

  INSERT INTO public.questions (title, description, hint, q_type, difficulty_rating, language, content) VALUES 
  ('Python Szorzás', 'Mit ír ki: print("Ha" * 3)?', 'Stringet is lehet szorozni.', 'predict_output', 850, 'python', 
  '{"code_snippet": "print(''Ha'' * 3)", "options": ["HaHaHa", "Ha3", "Hiba", "Ha Ha Ha"], "correct_answer": "HaHaHa", "explanation": "Pythonban a string szorzása ismétlést jelent."}') RETURNING id INTO q_id; INSERT INTO public.question_concepts VALUES (q_id, c_basics);

  INSERT INTO public.questions (title, description, hint, q_type, difficulty_rating, language, content) VALUES 
  ('Python Boolean', 'Mit ír ki: print(10 > 5 and 5 > 10)?', 'Az "and" mindkét oldalának igaznak kell lennie.', 'predict_output', 1000, 'python', 
  '{"code_snippet": "print(10 > 5 and 5 > 10)", "options": ["True", "False", "None", "Error"], "correct_answer": "False", "explanation": "Az első fele igaz, de a második hamis, így az ÉS kapcsolat hamis."}') RETURNING id INTO q_id; INSERT INTO public.question_concepts VALUES (q_id, c_logic);

  INSERT INTO public.questions (title, description, hint, q_type, difficulty_rating, language, content) VALUES 
  ('Python Lista módosítás', 'Mi lesz a lista tartalma?', 'A listák mutable típusok.', 'predict_output', 1100, 'python', 
  '{"code_snippet": "a = [1, 2, 3]\nb = a\nb[0] = 9\nprint(a)", "options": ["[1, 2, 3]", "[9, 2, 3]", "[1, 2, 9]", "Hiba"], "correct_answer": "[9, 2, 3]", "explanation": "Mivel ''b'' csak referenciát tárol ''a''-ra, a módosítás mindkét változónál látszik."}') RETURNING id INTO q_id; INSERT INTO public.question_concepts VALUES (q_id, c_arrays);

  INSERT INTO public.questions (title, description, hint, q_type, difficulty_rating, language, content) VALUES 
  ('Python Range', 'Hány számot ír ki?', 'A felső határ exkluzív.', 'predict_output', 1050, 'python', 
  '{"code_snippet": "for i in range(1, 4):\n  print(i)", "options": ["1, 2, 3, 4", "1, 2, 3", "0, 1, 2, 3", "1, 2"], "correct_answer": "1, 2, 3", "explanation": "A range(1, 4) az 1, 2, 3 értékeket generálja (4 már nincs benne)."}') RETURNING id INTO q_id; INSERT INTO public.question_concepts VALUES (q_id, c_loops);

  -- JAVA (Predict)
  INSERT INTO public.questions (title, description, hint, q_type, difficulty_rating, language, content) VALUES 
  ('Java Loop', 'Mit ír ki a kód?', 'Figyeld az i < 3 feltételt.', 'predict_output', 900, 'java', 
  '{"code_snippet": "for(int i=0; i<3; i++) { System.out.print(i); }", "options": ["012", "123", "0123", "0 1 2"], "correct_answer": "012", "explanation": "A ciklus 0, 1, 2 értékekkel fut le."}') RETURNING id INTO q_id; INSERT INTO public.question_concepts VALUES (q_id, c_loops);

  INSERT INTO public.questions (title, description, hint, q_type, difficulty_rating, language, content) VALUES 
  ('Java Osztás', 'Mennyi 5 / 2 eredménye Java-ban?', 'Két egész szám osztása egész eredményt ad.', 'predict_output', 1000, 'java', 
  '{"code_snippet": "int x = 5 / 2;\nSystem.out.println(x);", "options": ["2.5", "2", "3", "Hiba"], "correct_answer": "2", "explanation": "Mivel mindkét operandus int, az eredmény csonkolt egész osztás."}') RETURNING id INTO q_id; INSERT INTO public.question_concepts VALUES (q_id, c_basics);

  INSERT INTO public.questions (title, description, hint, q_type, difficulty_rating, language, content) VALUES 
  ('Java String + Int', 'Mi az eredmény?', 'Balról jobbra értékelődik ki.', 'predict_output', 1200, 'java', 
  '{"code_snippet": "System.out.println(1 + 2 + ''3'');", "options": ["123", "33", "6", "Error"], "correct_answer": "33", "explanation": "Először 1+2=3, aztán 3 + ''3'' összefűzés = ''33''."}') RETURNING id INTO q_id; INSERT INTO public.question_concepts VALUES (q_id, c_basics);

  INSERT INTO public.questions (title, description, hint, q_type, difficulty_rating, language, content) VALUES 
  ('Java Pre/Post Increment', 'Mit ír ki az x?', 'A ++ hátul van.', 'predict_output', 1300, 'java', 
  '{"code_snippet": "int a = 5;\nint x = a++;\nSystem.out.println(x);", "options": ["5", "6", "4", "Hiba"], "correct_answer": "5", "explanation": "Post-increment esetén először történik meg az értékadás (x=5), utána növekszik ''a''."}') RETURNING id INTO q_id; INSERT INTO public.question_concepts VALUES (q_id, c_logic);

  INSERT INTO public.questions (title, description, hint, q_type, difficulty_rating, language, content) VALUES 
  ('Java Tömb', 'Mi a 2. elem?', '0-tól indexelünk.', 'predict_output', 950, 'java', 
  '{"code_snippet": "int[] arr = {10, 20, 30};\nSystem.out.println(arr[1]);", "options": ["10", "20", "30", "null"], "correct_answer": "20", "explanation": "Az arr[1] a második elemet jelenti."}') RETURNING id INTO q_id; INSERT INTO public.question_concepts VALUES (q_id, c_arrays);

  ------------------------------------------------------------------------------------
  -- 3. TÍPUS: KÓDKIEGÉSZÍTÉS (Fill-in-the-blank) - 10 db
  ------------------------------------------------------------------------------------

  -- PYTHON (Fill-in)
  INSERT INTO public.questions (title, description, hint, q_type, difficulty_rating, language, content) VALUES 
  ('Python Def', 'Hogyan definiálsz függvényt?', 'A define rövidítése.', 'fill_in_blank', 900, 'python', 
  '{"code_snippet": "{{BLANK}} my_function():", "correct_answer": "def", "options": ["func", "function", "def", "lambda"], "explanation": "Pythonban a ''def'' kulcsszót használjuk."}') RETURNING id INTO q_id; INSERT INTO public.question_concepts VALUES (q_id, c_functions);

  INSERT INTO public.questions (title, description, hint, q_type, difficulty_rating, language, content) VALUES 
  ('Python Length', 'Hogyan kéred le a lista hosszát?', 'Nem .length, hanem függvény.', 'fill_in_blank', 850, 'python', 
  '{"code_snippet": "my_list = [1, 2, 3]\nsize = {{BLANK}}(my_list)", "correct_answer": "len", "options": ["length", "count", "size", "len"], "explanation": "A len() beépített függvény adja vissza a hosszt."}') RETURNING id INTO q_id; INSERT INTO public.question_concepts VALUES (q_id, c_arrays);

  INSERT INTO public.questions (title, description, hint, q_type, difficulty_rating, language, content) VALUES 
  ('Python Import', 'Hogyan töltesz be modult?', 'Angolul: importálás.', 'fill_in_blank', 950, 'python', 
  '{"code_snippet": "{{BLANK}} math\nprint(math.pi)", "correct_answer": "import", "options": ["include", "using", "import", "from"], "explanation": "Az import kulcsszóval tölthetők be könyvtárak."}') RETURNING id INTO q_id; INSERT INTO public.question_concepts VALUES (q_id, c_basics);

  INSERT INTO public.questions (title, description, hint, q_type, difficulty_rating, language, content) VALUES 
  ('Python Ciklus', 'Iterálj végig a listán!', 'Angolul: benne.', 'fill_in_blank', 1000, 'python', 
  '{"code_snippet": "for item {{BLANK}} my_list:\n  print(item)", "correct_answer": "in", "options": ["on", "at", "in", "of"], "explanation": "A ''for ... in ...'' szerkezet a standard iteráció."}') RETURNING id INTO q_id; INSERT INTO public.question_concepts VALUES (q_id, c_loops);

  INSERT INTO public.questions (title, description, hint, q_type, difficulty_rating, language, content) VALUES 
  ('Python Try', 'Kezeld a kivételt!', 'Próbáld meg...', 'fill_in_blank', 1100, 'python', 
  '{"code_snippet": "{{BLANK}}:\n  x = 1/0\nexcept ZeroDivisionError:\n  print(''Error'')", "correct_answer": "try", "options": ["catch", "try", "attempt", "do"], "explanation": "A try blokkba kerül a veszélyes kód."}') RETURNING id INTO q_id; INSERT INTO public.question_concepts VALUES (q_id, c_logic);

  -- JAVA (Fill-in)
  INSERT INTO public.questions (title, description, hint, q_type, difficulty_rating, language, content) VALUES 
  ('Java Main Return', 'Mi a main metódus visszatérési típusa?', 'Nem ad vissza semmit.', 'fill_in_blank', 900, 'java', 
  '{"code_snippet": "public static {{BLANK}} main(String[] args)", "correct_answer": "void", "options": ["int", "void", "String", "null"], "explanation": "A void azt jelenti, nincs visszatérési érték."}') RETURNING id INTO q_id; INSERT INTO public.question_concepts VALUES (q_id, c_functions);

  INSERT INTO public.questions (title, description, hint, q_type, difficulty_rating, language, content) VALUES 
  ('Java Print', 'Nyomtatás a konzolra.', 'System csomag.', 'fill_in_blank', 800, 'java', 
  '{"code_snippet": "System.{{BLANK}}.println(''Hello'');", "correct_answer": "out", "options": ["in", "out", "err", "log"], "explanation": "A System.out a standard kimenet."}') RETURNING id INTO q_id; INSERT INTO public.question_concepts VALUES (q_id, c_basics);

  INSERT INTO public.questions (title, description, hint, q_type, difficulty_rating, language, content) VALUES 
  ('Java New', 'Objektum példányosítás.', 'Új objektum.', 'fill_in_blank', 1000, 'java', 
  '{"code_snippet": "Scanner sc = {{BLANK}} Scanner(System.in);", "correct_answer": "new", "options": ["create", "make", "new", "alloc"], "explanation": "A new kulcsszó foglal memóriát az új objektumnak."}') RETURNING id INTO q_id; INSERT INTO public.question_concepts VALUES (q_id, c_oop);

  INSERT INTO public.questions (title, description, hint, q_type, difficulty_rating, language, content) VALUES 
  ('Java Tömb Hossz', 'Tömb méretének lekérdezése.', 'Ez egy mező (field), nem metódus.', 'fill_in_blank', 1100, 'java', 
  '{"code_snippet": "int[] arr = {1,2};\nint len = arr.{{BLANK}};", "correct_answer": "length", "options": ["size", "length", "length()", "count"], "explanation": "Java tömböknél .length (zárójel nélkül), Stringnél .length() használatos."}') RETURNING id INTO q_id; INSERT INTO public.question_concepts VALUES (q_id, c_arrays);

  INSERT INTO public.questions (title, description, hint, q_type, difficulty_rating, language, content) VALUES 
  ('Java If', 'Feltétel vizsgálat.', 'Ha...', 'fill_in_blank', 850, 'java', 
  '{"code_snippet": "{{BLANK}} (x > 10) { System.out.println(''Nagy''); }", "correct_answer": "if", "options": ["when", "check", "if", "loop"], "explanation": "Az if kulcsszó vezeti be az elágazást."}') RETURNING id INTO q_id; INSERT INTO public.question_concepts VALUES (q_id, c_logic);

  ------------------------------------------------------------------------------------
  -- 4. TÍPUS: PARSONS PROBLÉMA (Logikai sorrend) - 10 db
  ------------------------------------------------------------------------------------

  -- PYTHON (Parsons)
  INSERT INTO public.questions (title, description, hint, q_type, difficulty_rating, language, content) VALUES 
  ('Python Páros szám', 'Ellenőrizd, hogy páros-e a szám!', 'Figyelj a behúzásra.', 'parsons', 1000, 'python', 
  '{"blocks": [{"id": 1, "text": "else:"}, {"id": 2, "text": "if x % 2 == 0:"}, {"id": 3, "text": "    print(''Páros'')"}, {"id": 4, "text": "    print(''Páratlan'')"}], "correct_order": [2, 3, 1, 4], "explanation": "If feltétel, indentált print, else ág, indentált print."}') RETURNING id INTO q_id; INSERT INTO public.question_concepts VALUES (q_id, c_logic);

  INSERT INTO public.questions (title, description, hint, q_type, difficulty_rating, language, content) VALUES 
  ('Python Fájl olvasás', 'Olvasd be a fájlt biztonságosan!', 'Használd a with kulcsszót.', 'parsons', 1200, 'python', 
  '{"blocks": [{"id": 1, "text": "    print(f.read())"}, {"id": 2, "text": "with open(''data.txt'') as f:"}], "correct_order": [2, 1], "explanation": "A with blokk automatikusan bezárja a fájlt, a tartalom (indentálva) fut le."}') RETURNING id INTO q_id; INSERT INTO public.question_concepts VALUES (q_id, c_basics);

  INSERT INTO public.questions (title, description, hint, q_type, difficulty_rating, language, content) VALUES 
  ('Python Függvény', 'Definiálj egy köszönő függvényt!', 'Definíció és hívás.', 'parsons', 900, 'python', 
  '{"blocks": [{"id": 1, "text": "greet(''Anna'')"}, {"id": 2, "text": "    print(f''Hello {name}'')"}, {"id": 3, "text": "def greet(name):"}], "correct_order": [3, 2, 1], "explanation": "Előbb a definíció (def), aztán a törzs, végül a hívás."}') RETURNING id INTO q_id; INSERT INTO public.question_concepts VALUES (q_id, c_functions);

  INSERT INTO public.questions (title, description, hint, q_type, difficulty_rating, language, content) VALUES 
  ('Python While', 'Számolj el 3-ig!', 'Inicializálás, feltétel, növelés.', 'parsons', 1100, 'python', 
  '{"blocks": [{"id": 1, "text": "i += 1"}, {"id": 2, "text": "i = 0"}, {"id": 3, "text": "    print(i)"}, {"id": 4, "text": "while i < 3:"}], "correct_order": [2, 4, 3, 1], "explanation": "i=0 -> while -> print -> növelés."}') RETURNING id INTO q_id; INSERT INTO public.question_concepts VALUES (q_id, c_loops);

  INSERT INTO public.questions (title, description, hint, q_type, difficulty_rating, language, content) VALUES 
  ('Python Csere', 'Cserélj fel két változót (Pythonos módszer)!', 'Egy sorban lehetséges.', 'parsons', 1300, 'python', 
  '{"blocks": [{"id": 1, "text": "print(a, b)"}, {"id": 2, "text": "a, b = b, a"}, {"id": 3, "text": "a = 5\nb = 10"}], "correct_order": [3, 2, 1], "explanation": "Deklarálás -> tuple unpacking csere -> kiírás."}') RETURNING id INTO q_id; INSERT INTO public.question_concepts VALUES (q_id, c_logic);

  -- JAVA (Parsons) - JAVÍTOTT (escaped quotes)
  INSERT INTO public.questions (title, description, hint, q_type, difficulty_rating, language, content) VALUES 
  ('Java Változócsere', 'Rendezd sorba a sorokat a cseréhez!', 'Kell egy temp változó.', 'parsons', 1000, 'java', 
  '{"blocks": [{"id": 1, "text": "b = temp;"}, {"id": 2, "text": "a = b;"}, {"id": 3, "text": "int temp = a;"}], "correct_order": [3, 2, 1], "explanation": "Mentés temp-be -> ''a'' felülírása ''b''-vel -> ''b'' felülírása temp-pel."}') RETURNING id INTO q_id; INSERT INTO public.question_concepts VALUES (q_id, c_logic);

  INSERT INTO public.questions (title, description, hint, q_type, difficulty_rating, language, content) VALUES 
  ('Java Main Class', 'Építsd fel a Hello World osztályt!', 'Csomag, osztály, main.', 'parsons', 900, 'java', 
  '{"blocks": [{"id": 1, "text": "public static void main(String[] args) {"}, {"id": 2, "text": "}"}, {"id": 3, "text": "public class Main {"}, {"id": 4, "text": "  System.out.println(''Hi'');"}, {"id": 5, "text": "}}"}], "correct_order": [3, 1, 4, 2, 5], "explanation": "Class -> Main -> Print -> Zárójelek."}') RETURNING id INTO q_id; INSERT INTO public.question_concepts VALUES (q_id, c_basics);

  INSERT INTO public.questions (title, description, hint, q_type, difficulty_rating, language, content) VALUES 
  ('Java Összegzés', 'Számold ki az összeget!', 'Nullázd a sum-ot az elején.', 'parsons', 1100, 'java', 
  '{"blocks": [{"id": 1, "text": "sum = sum + i;"}, {"id": 2, "text": "int sum = 0;"}, {"id": 3, "text": "}"}, {"id": 4, "text": "for(int i=1; i<=3; i++) {"}], "correct_order": [2, 4, 1, 3], "explanation": "Init sum -> Loop -> Add -> Close."}') RETURNING id INTO q_id; INSERT INTO public.question_concepts VALUES (q_id, c_loops);

  INSERT INTO public.questions (title, description, hint, q_type, difficulty_rating, language, content) VALUES 
  ('Java If-Else', 'Döntsd el, pozitív-e!', 'If, else if, else.', 'parsons', 1200, 'java', 
  '{"blocks": [{"id": 1, "text": "else { print(''Neg''); }"}, {"id": 2, "text": "if (x > 0) { print(''Poz''); }"}, {"id": 3, "text": "else if (x == 0) { print(''Zero''); }"}], "correct_order": [2, 3, 1], "explanation": "Pozitív -> Nulla -> Negatív (else)."}') RETURNING id INTO q_id; INSERT INTO public.question_concepts VALUES (q_id, c_logic);

  INSERT INTO public.questions (title, description, hint, q_type, difficulty_rating, language, content) VALUES 
  ('Java Do-While', 'Hátultesztelő ciklus.', 'Egyszer mindenképp lefut.', 'parsons', 1300, 'java', 
  '{"blocks": [{"id": 1, "text": "} while (i < 5);"}, {"id": 2, "text": "do {"}, {"id": 3, "text": "  i++;"}, {"id": 4, "text": "int i = 0;"}], "correct_order": [4, 2, 3, 1], "explanation": "Init -> do -> body -> while feltétel."}') RETURNING id INTO q_id; INSERT INTO public.question_concepts VALUES (q_id, c_loops);

  ------------------------------------------------------------------------------------
  -- 5. TÍPUS: HIBAKERESÉS (Debugging) - 10 db
  ------------------------------------------------------------------------------------

  -- PYTHON (Debug)
  INSERT INTO public.questions (title, description, hint, q_type, difficulty_rating, language, content) VALUES 
  ('Python Behúzás', 'Miért nem fut a kód?', 'A print a cikluson kívül van logikailag.', 'debug', 850, 'python', 
  '{"buggy_code": "for i in range(5):\nprint(i)", "error_location": "print(i)", "correct_code": "    print(i)", "options": ["    print(i)", "print(i)", "print i"], "explanation": "Pythonban kötelező a behúzás (indentation) a ciklus törzséhez."}') RETURNING id INTO q_id; INSERT INTO public.question_concepts VALUES (q_id, c_basics);

  INSERT INTO public.questions (title, description, hint, q_type, difficulty_rating, language, content) VALUES 
  ('Python Típus hiba', 'Nem lehet összeadni őket.', 'Szám és szöveg.', 'debug', 1000, 'python', 
  '{"buggy_code": "age = 20\nmsg = ''Kor: '' + age", "error_location": "''Kor: '' + age", "correct_code": "''Kor: '' + str(age)", "options": ["''Kor: '' + str(age)", "''Kor: '' + int(age)", "''Kor: '' + age"], "explanation": "Az int-et stringgé kell konvertálni (castolni) konkatenálás előtt."}') RETURNING id INTO q_id; INSERT INTO public.question_concepts VALUES (q_id, c_basics);

  INSERT INTO public.questions (title, description, hint, q_type, difficulty_rating, language, content) VALUES 
  ('Python Kettőspont', 'Mi hiányzik a sor végéről?', 'Szintaktikai hiba.', 'debug', 900, 'python', 
  '{"buggy_code": "if x > 10\n  print(''Big'')", "error_location": "if x > 10", "correct_code": "if x > 10:", "options": ["if x > 10:", "if (x > 10)", "if x > 10 then"], "explanation": "Az if, for, while, def sorok végére kötelező a kettőspont."}') RETURNING id INTO q_id; INSERT INTO public.question_concepts VALUES (q_id, c_logic);

  INSERT INTO public.questions (title, description, hint, q_type, difficulty_rating, language, content) VALUES 
  ('Python Index', 'Túlindexelés hiba.', 'A lista rövidebb.', 'debug', 1100, 'python', 
  '{"buggy_code": "lst = [1, 2, 3]\nprint(lst[3])", "error_location": "lst[3]", "correct_code": "lst[2]", "options": ["lst[2]", "lst[3]", "lst[0]"], "explanation": "A 3 elemű lista indexei: 0, 1, 2. A 3-as index már a 4. elem lenne."}') RETURNING id INTO q_id; INSERT INTO public.question_concepts VALUES (q_id, c_arrays);

  INSERT INTO public.questions (title, description, hint, q_type, difficulty_rating, language, content) VALUES 
  ('Python Egyenlőség', 'Értékadás vs Összehasonlítás.', 'Az if feltételbe logikai vizsgálat kell.', 'debug', 1200, 'python', 
  '{"buggy_code": "if x = 5:\n  print(''Five'')", "error_location": "x = 5", "correct_code": "x == 5", "options": ["x == 5", "x = 5", "x.equals(5)"], "explanation": "Az egyenlőség vizsgálat jele a ==, az egy darab = jel értékadást jelent."}') RETURNING id INTO q_id; INSERT INTO public.question_concepts VALUES (q_id, c_logic);

  -- JAVA (Debug)
  INSERT INTO public.questions (title, description, hint, q_type, difficulty_rating, language, content) VALUES 
  ('Java Pontosvessző', 'Hol a hiba?', 'Minden utasítás lezárása.', 'debug', 800, 'java', 
  '{"buggy_code": "int x = 10\nSystem.out.println(x);", "error_location": "int x = 10", "correct_code": "int x = 10;", "options": ["int x = 10;", "int x = 10", "var x = 10"], "explanation": "Java-ban kötelező a pontosvessző a sor végén."}') RETURNING id INTO q_id; INSERT INTO public.question_concepts VALUES (q_id, c_basics);

  INSERT INTO public.questions (title, description, hint, q_type, difficulty_rating, language, content) VALUES 
  ('Java Kis/Nagybetű', 'Nem találja a szimbólumot.', 'A rendszer osztály nagybetűs.', 'debug', 900, 'java', 
  '{"buggy_code": "system.out.println(''Hi'');", "error_location": "system", "correct_code": "System", "options": ["System", "system", "sys"], "explanation": "Java case-sensitive. Az osztály neve System (nagy S)."}') RETURNING id INTO q_id; INSERT INTO public.question_concepts VALUES (q_id, c_basics);

  INSERT INTO public.questions (title, description, hint, q_type, difficulty_rating, language, content) VALUES 
  ('Java Végtelen Loop', 'Mi a hiba a while-ban?', 'Értékadás feltétel helyett.', 'debug', 1100, 'java', 
  '{"buggy_code": "while (x = 0) {\n  break;\n}", "error_location": "x = 0", "correct_code": "x == 0", "options": ["x == 0", "x = 0", "x.equals(0)"], "explanation": "A feltételben összehasonlítás (==) kell, nem értékadás (=)."}') RETURNING id INTO q_id; INSERT INTO public.question_concepts VALUES (q_id, c_loops);

  INSERT INTO public.questions (title, description, hint, q_type, difficulty_rating, language, content) VALUES 
  ('Java Tömb Init', 'Hogyan adsz meg értékeket?', 'Kapcsos zárójel kell.', 'debug', 1000, 'java', 
  '{"buggy_code": "int[] arr = [1, 2, 3];", "error_location": "[1, 2, 3]", "correct_code": "{1, 2, 3}", "options": ["{1, 2, 3}", "[1, 2, 3]", "(1, 2, 3)"], "explanation": "Java-ban tömb literálhoz kapcsos zárójelet {} használunk, nem szögleteset."}') RETURNING id INTO q_id; INSERT INTO public.question_concepts VALUES (q_id, c_arrays);

  INSERT INTO public.questions (title, description, hint, q_type, difficulty_rating, language, content) VALUES 
  ('Java Main Args', 'Hiányzik a paraméter.', 'A main metódusnak kell argumentum.', 'debug', 950, 'java', 
  '{"buggy_code": "public static void main() {\n}", "error_location": "main()", "correct_code": "main(String[] args)", "options": ["main(String[] args)", "main()", "Main(String args)"], "explanation": "A szabványos main metódus vár egy String tömböt paraméterként."}') RETURNING id INTO q_id; INSERT INTO public.question_concepts VALUES (q_id, c_functions);

  ------------------------------------------------------------------------------------
  -- 6. TÍPUS: KÓDÍRÁS (Coding Challenge) - 10 db
  ------------------------------------------------------------------------------------

  -- PYTHON (Coding)
  INSERT INTO public.questions (title, description, hint, q_type, difficulty_rating, language, content) VALUES 
  ('Python Négyzetre emelés', 'Írj függvényt: square(x)', 'Használd a ** operátort.', 'coding', 1200, 'python', 
  '{"initial_code": "# def square(x):\n", "test_cases": [{"input": "5", "expected_output": "25"}], "scaffolding_blocks": ["def", "square(x):", "return", "x * x", "x ** 2"], "explanation": "def square(x): return x * x"}') RETURNING id INTO q_id; INSERT INTO public.question_concepts VALUES (q_id, c_functions);

  INSERT INTO public.questions (title, description, hint, q_type, difficulty_rating, language, content) VALUES 
  ('Python Pozitív szám', 'Függvény check(num): True ha > 0', 'return num > 0', 'coding', 1100, 'python', 
  '{"initial_code": "def check(num):\n  ", "test_cases": [{"input": "5", "expected_output": "True"}, {"input": "-2", "expected_output": "False"}], "scaffolding_blocks": ["def", "check(num):", "return", "num", ">", "0"], "explanation": "return num > 0"}') RETURNING id INTO q_id; INSERT INTO public.question_concepts VALUES (q_id, c_logic);

  INSERT INTO public.questions (title, description, hint, q_type, difficulty_rating, language, content) VALUES 
  ('Python Lista Max', 'Keresd meg a legnagyobbat!', 'Használd a max() függvényt vagy ciklust.', 'coding', 1300, 'python', 
  '{"initial_code": "def find_max(lst):\n  ", "test_cases": [{"input": "[1, 5, 2]", "expected_output": "5"}], "scaffolding_blocks": ["return", "max(lst)", "for", "if"], "explanation": "return max(lst)"}') RETURNING id INTO q_id; INSERT INTO public.question_concepts VALUES (q_id, c_arrays);

  INSERT INTO public.questions (title, description, hint, q_type, difficulty_rating, language, content) VALUES 
  ('Python Köszönés', 'Függvény: hello(name)', 'f-string használata javasolt.', 'coding', 1000, 'python', 
  '{"initial_code": "def hello(name):\n  ", "test_cases": [{"input": "''Bob''", "expected_output": "''Hello Bob''"}], "scaffolding_blocks": ["return", "f''Hello {name}''", "print"], "explanation": "return f''Hello {name}''"}') RETURNING id INTO q_id; INSERT INTO public.question_concepts VALUES (q_id, c_functions);

  INSERT INTO public.questions (title, description, hint, q_type, difficulty_rating, language, content) VALUES 
  ('Python String fordítás', 'Fordítsd meg a szöveget!', 'Slicing technikával.', 'coding', 1400, 'python', 
  '{"initial_code": "def reverse(s):\n  ", "test_cases": [{"input": "''abc''", "expected_output": "''cba''"}], "scaffolding_blocks": ["return", "s[::-1]", "reversed(s)"], "explanation": "return s[::-1]"}') RETURNING id INTO q_id; INSERT INTO public.question_concepts VALUES (q_id, c_arrays);

  -- JAVA (Coding)
  INSERT INTO public.questions (title, description, hint, q_type, difficulty_rating, language, content) VALUES 
  ('Java Hello World', 'Írasd ki: "Hello World"!', 'System.out.println', 'coding', 1000, 'java', 
  '{"initial_code": "public class Main {\n  public static void main(String[] args) {\n    \n  }\n}", "test_cases": [], "scaffolding_blocks": ["System.out.println", "''Hello World''", ";"], "explanation": "System.out.println(''Hello World'');"}') RETURNING id INTO q_id; INSERT INTO public.question_concepts VALUES (q_id, c_basics);

  INSERT INTO public.questions (title, description, hint, q_type, difficulty_rating, language, content) VALUES 
  ('Java Összegző ciklus', 'Írj ciklust 1-től 10-ig!', 'i=1; i<=10;', 'coding', 1300, 'java', 
  '{"initial_code": "int sum = 0;\n", "test_cases": [{"input": "", "expected_output": "55"}], "scaffolding_blocks": ["for", "int i=1", "i<=10", "i++", "sum += i", ";", "{", "}"], "explanation": "for(int i=1; i<=10; i++) { sum += i; }"}') RETURNING id INTO q_id; INSERT INTO public.question_concepts VALUES (q_id, c_loops);

  INSERT INTO public.questions (title, description, hint, q_type, difficulty_rating, language, content) VALUES 
  ('Java Páros Ellenőr', 'Metódus: isEven(int n)', 'Modulo operátor %.', 'coding', 1200, 'java', 
  '{"initial_code": "public boolean isEven(int n) {\n  \n}", "test_cases": [{"input": "4", "expected_output": "true"}], "scaffolding_blocks": ["return", "n % 2 == 0", "if", "else"], "explanation": "return n % 2 == 0;"}') RETURNING id INTO q_id; INSERT INTO public.question_concepts VALUES (q_id, c_logic);

  INSERT INTO public.questions (title, description, hint, q_type, difficulty_rating, language, content) VALUES 
  ('Java Max Keresés', 'Keress nagyobbat a és b közül!', 'Math.max vagy if-else.', 'coding', 1100, 'java', 
  '{"initial_code": "public int max(int a, int b) {\n  \n}", "test_cases": [{"input": "5, 10", "expected_output": "10"}], "scaffolding_blocks": ["return", "a > b ? a : b", "Math.max(a, b)"], "explanation": "return Math.max(a, b);"}' ) RETURNING id INTO q_id; INSERT INTO public.question_concepts VALUES (q_id, c_logic);

  INSERT INTO public.questions (title, description, hint, q_type, difficulty_rating, language, content) VALUES 
  ('Java String Hossz', 'Add vissza a név hosszát!', 'Használd a length() metódust.', 'coding', 1050, 'java', 
  '{"initial_code": "public int nameLength(String name) {\n  \n}", "test_cases": [{"input": "''Tom''", "expected_output": "3"}], "scaffolding_blocks": ["return", "name.length()", "name.size"], "explanation": "return name.length();"}' ) RETURNING id INTO q_id; INSERT INTO public.question_concepts VALUES (q_id, c_basics);

END $$;
