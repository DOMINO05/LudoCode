-- ====================================================================
-- LUDOCODE ADATBÁZIS SÉMA V4.0 (Enhanced Adaptive Engine)
-- ====================================================================

-- 1. BŐVÍTMÉNYEK
create extension if not exists "uuid-ossp";

-- Takarítás (Clean Slate)
drop table if exists public.friendship cascade;
drop table if exists public.user_logs cascade;
drop table if exists public.user_language_progress cascade;
drop table if exists public.user_inventory cascade;
drop table if exists public.shop_items cascade;
drop table if exists public.user_submissions cascade;
drop table if exists public.question_concepts cascade;
drop table if exists public.concept_prerequisites cascade;
drop table if exists public.user_concept_mastery cascade;
drop table if exists public.questions cascade;
drop table if exists public.concepts cascade;
drop table if exists public.languages cascade;
drop table if exists public.profiles cascade;
drop type if exists question_type;
drop type if exists item_category;
drop type if exists item_rarity;

-- Típusok (Megtartva az eredeti kérés szerint)
create type question_type as enum (
  'theory',          
  'predict_output',  
  'fill_in_blank',   
  'parsons',         
  'debug',           
  'coding'           
);

create type item_category as enum ('streak_freeze', 'theme', 'avatar_frame', 'xp_boost', 'hat', 'accessory', 'pet');
create type item_rarity as enum ('common', 'rare', 'epic', 'legendary');

-- ====================================================================
-- 2. TÁBLÁK LÉTREHOZÁSA
-- ====================================================================

-- PROFIL
create table public.profiles (
  id uuid references auth.users not null primary key,
  username text unique,
  xp int default 0,
  sanity_points int default 100, 
  current_streak int default 0,
  gems int default 0,
  -- Global skill estimate (Theta) az IRT-hez. 
  -- 0.0 az átlag, -3.0 a kezdő, +3.0 a mester.
  global_proficiency float default 0.0, 
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- NYELVEK
create table public.languages (
  id uuid default uuid_generate_v4() primary key,
  name text unique not null,
  display_name text,
  icon text
);

-- FOGALMAK (A Tudástérkép csomópontjai)
create table public.concepts (
  id uuid default uuid_generate_v4() primary key,
  name text unique not null,
  description text,
  
  -- BKT (Bayesian Knowledge Tracing) Paraméterek
  -- Ezek hangolják az algoritmust: mennyire gyorsan tanulható az anyag?
  p_init float default 0.10,      -- P(L0): Kezdeti tudás valószínűsége
  p_transit float default 0.15,   -- P(T): Tanulási ráta (Transition)
  p_guess float default 0.20,     -- P(G): Tippelés esélye (Guess)
  p_slip float default 0.10       -- P(S): Figyelmetlenség esélye (Slip)
);

-- FOGALMI ELŐFELTÉTELEK (Gráf struktúra)
-- Pl. 'loops' tanulásához kell a 'basics' (variable declaration)
create table public.concept_prerequisites (
    concept_id uuid references public.concepts(id) on delete cascade,
    prerequisite_id uuid references public.concepts(id) on delete cascade,
    primary key (concept_id, prerequisite_id)
);

-- FELHASZNÁLÓI TUDÁSSZINT (User Concept State)
create table public.user_concept_mastery (
  user_id uuid references public.profiles(id) on delete cascade,
  concept_id uuid references public.concepts(id) on delete cascade,
  
  -- A rendszer pillanatnyi becslése: Tudja-e a user ezt a fogalmat? (0.0 - 1.0)
  mastery_probability float default 0.10, 
  
  total_attempts int default 0,
  last_practiced_at timestamp with time zone default now(),
  
  primary key (user_id, concept_id)
);

-- KÉRDÉSEK (Item Bank)
create table public.questions (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  description text,
  hint text,
  q_type question_type not null,
  language_id uuid references public.languages(id) on delete cascade not null,
  
  -- Megjelenített nehézség (UX-hez)
  difficulty_display int default 1000, 

  -- IRT Paraméterek (Algoritmushoz - 2PL Model)
  difficulty_beta float default 0.0,      -- (b) Mennyire nehéz? (-3.0 to +3.0)
  discrimination_alpha float default 1.0, -- (a) Mennyire választja szét a tudást? (0.5 to 2.5)
  
  content jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- KAPCSOLÓTÁBLA (Súlyozással)
create table public.question_concepts (
  question_id uuid references public.questions(id) on delete cascade,
  concept_id uuid references public.concepts(id) on delete cascade,
  
  -- Mennyire érinti ez a kérdés az adott fogalmat? (0.0 - 1.0)
  -- Pl. Egy komplex feladat: 0.7 'loops', 0.3 'logic'
  weight float default 1.0 check (weight > 0 and weight <= 1.0),
  
  primary key (question_id, concept_id)
);

-- BEKÜLDÉSEK (Logolás az analitikához)
create table public.user_submissions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  question_id uuid references public.questions(id) on delete set null,
  
  is_correct boolean not null,
  submitted_answer text,
  
  -- Fontos metrikák az adaptivitáshoz
  execution_time_ms int,          -- Slip detektálás: Túl gyors = tippelt? Túl lassú = küzdött?
  mastery_before float,           -- Pillanatkép: Mennyi volt a tudása a válasz előtt?
  mastery_after float,            -- Pillanatkép: Mennyi lett utána?
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- SHOP (Gamification)
create table public.shop_items (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  category item_category not null,
  rarity item_rarity default 'common',
  cost_gems int not null,
  metadata jsonb
);

create table public.user_inventory (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  item_id uuid references public.shop_items(id),
  quantity int default 1,
  metadata jsonb
);

-- INDEXEK (Teljesítmény optimalizálás a lekérdezésekhez)
create index idx_submissions_user on public.user_submissions(user_id);
create index idx_questions_beta on public.questions(difficulty_beta);
create index idx_mastery_user on public.user_concept_mastery(user_id);

-- RLS
alter table public.profiles enable row level security;
alter table public.questions enable row level security;
alter table public.user_submissions enable row level security;

create policy "Public read questions" on public.questions for select using (true);
create policy "Read own profile" on public.profiles for select using (auth.uid() = id);
create policy "Insert own submissions" on public.user_submissions for insert with check (auth.uid() = user_id);

-- ====================================================================
-- 3. ADATFELTÖLTÉS (MIGRÁCIÓ)
-- ====================================================================

DO $do$
DECLARE
  json_data jsonb;
  question_item jsonb;
  
  _title text; _desc text; _hint text; _q_type text; _diff int; _lang text; _content jsonb;
  _irt_beta float;
  
  concept_name text;
  c_id uuid;
  q_id uuid;
  l_id uuid;
BEGIN

  -- 0. NYELVEK (Languages)
  INSERT INTO public.languages (name, display_name, icon) VALUES
  ('python', 'Python', '🐍'),
  ('java', 'Java', '☕')
  ON CONFLICT (name) DO NOTHING;

  -- 1. FOGALMAK (Concepts)
  -- Finomhangolt BKT paraméterekkel
  INSERT INTO public.concepts (name, description, p_init, p_transit, p_guess, p_slip) VALUES 
  ('basics', 'Alapok', 0.4, 0.3, 0.2, 0.05),     -- Könnyen tanulható
  ('loops', 'Ciklusok', 0.1, 0.15, 0.1, 0.1),    -- Nehezebb
  ('logic', 'Logika', 0.2, 0.2, 0.15, 0.05),
  ('arrays', 'Adatszerkezetek', 0.1, 0.1, 0.1, 0.1),
  ('functions', 'Függvények', 0.1, 0.15, 0.1, 0.1),
  ('oop', 'Objektum Orientáltság', 0.05, 0.1, 0.1, 0.1) -- Nagyon nehéz
  ON CONFLICT (name) DO NOTHING;

  -- 2. ELŐFELTÉTELEK (Prerequisites - Egyszerű láncolat)
  -- Logic -> Loops -> Arrays
  INSERT INTO public.concept_prerequisites (concept_id, prerequisite_id)
  SELECT c1.id, c2.id FROM public.concepts c1, public.concepts c2 
  WHERE c1.name = 'loops' AND c2.name = 'basics';
  
  INSERT INTO public.concept_prerequisites (concept_id, prerequisite_id)
  SELECT c1.id, c2.id FROM public.concepts c1, public.concepts c2 
  WHERE c1.name = 'arrays' AND c2.name = 'loops';

  -- 3. FELADATOK (TÖRÖLVE, KÜLSŐ SZKRIPT TÖLTI BE)
  -- A kérdések betöltése most már a seed:questions parancs segítségével történik
  -- a questions/ mappa SQL/JSON fájljaiból.
  
  -- 5. SHOP POOL (Generated variants)
  INSERT INTO public.shop_items (name, category, rarity, cost_gems, metadata) VALUES 
  ('Streak Freeze', 'streak_freeze', 'common', 100, '{"description": "Megvéd egy nap mulasztástól."}'),
  ('Gold Frame', 'avatar_frame', 'legendary', 2000, '{"description": "Arany keret.", "dicebear": {"frame": "Gold"}}'),
  ('Neon Frame', 'avatar_frame', 'rare', 500, '{"description": "Neon keret.", "dicebear": {"frame": "Neon"}}'),
  ('Gradient BG', 'theme', 'rare', 600, '{"description": "Színes háttér.", "dicebear": {"background": "gradient"}}');

  -- Generate Accessories (Variant 01-04)
  FOR i IN 1..4 LOOP
    INSERT INTO public.shop_items (name, category, rarity, cost_gems, metadata)
    VALUES ('Earrings V' || i, 'accessory', 'common', 100, jsonb_build_object('dicebear', jsonb_build_object('accessories', 'variant0' || i)));
  END LOOP;

  -- Generate Clothing (Variant 01-23)
  FOR i IN 1..23 LOOP
    INSERT INTO public.shop_items (name, category, rarity, cost_gems, metadata)
    VALUES ('Outfit V' || i, 'theme', 'common', 200, jsonb_build_object('dicebear', jsonb_build_object('clothing', 'variant' || to_char(i, 'FM00'))));
  END LOOP;

  -- Generate Glasses (Dark 01-07, Light 01-07)
  FOR i IN 1..7 LOOP
    INSERT INTO public.shop_items (name, category, rarity, cost_gems, metadata)
    VALUES ('Dark Glasses V' || i, 'accessory', 'common', 150, jsonb_build_object('dicebear', jsonb_build_object('glasses', 'dark0' || i)));
    INSERT INTO public.shop_items (name, category, rarity, cost_gems, metadata)
    VALUES ('Light Glasses V' || i, 'accessory', 'common', 150, jsonb_build_object('dicebear', jsonb_build_object('glasses', 'light0' || i)));
  END LOOP;

  -- Generate Hats (Variant 01-10)
  FOR i IN 1..10 LOOP
    INSERT INTO public.shop_items (name, category, rarity, cost_gems, metadata)
    VALUES ('Hat V' || i, 'hat', 'common', 200, jsonb_build_object('dicebear', jsonb_build_object('hat', 'variant' || to_char(i, 'FM00'))));
  END LOOP;

END $do$;
