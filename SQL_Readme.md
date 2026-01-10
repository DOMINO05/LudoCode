# LudoCode Adaptív Motor - Backend Fejlesztői Dokumentáció

> **KRITIKUS FIGYELMEZTETÉS**
>
> Ez az adatbázis és a ráépülő logika a LudoCode rendszer "agya".
> Ha a backend nem megfelelően kezeli a `difficulty_beta`, `mastery_probability` vagy `weight` értékeket, a rendszer nem "okos" lesz, hanem frusztráló.
> A felhasználók túl könnyű vagy lehetetlen feladatokat fognak kapni.
> **Kérlek, olvasd el figyelmesen az alábbi útmutatót.**

---

## 1. Az Adaptivitás Két Pillére

Az adatbázis két tudományos modellt támogat. A backend feladata ezen modellek matematikai frissítése.

### A. BKT (Bayesian Knowledge Tracing) - "Mit tud a felhasználó?"
Ez kezeli a `user_concept_mastery` táblát. Minden egyes válasznál frissítened kell a valószínűséget (Probability of Mastery).

* **Tábla:** `user_concept_mastery`, `concepts`
* **Mikor fut:** Minden `user_submissions` beszúrása UTÁN (azonnal).
* **Logika:**
    1.  Vedd a user előző tudását (`p_prev`).
    2.  **Ha a válasz helyes volt:** Nő a valószínűség, de számolj a `p_guess` (tippelés) esélyével.
    3.  **Ha a válasz rossz volt:** Csökken, de számolj a `p_slip` (figyelmetlenség) esélyével.

### B. IRT (Item Response Theory) - "Milyen nehéz a feladat?"
Ez kezeli a `questions` tábla `difficulty_beta` értékét és a `question_selection` logikát.

* **Tábla:** `questions`
* **Paraméterek:**
    * `difficulty_beta` (b): A feladat nehézsége (-3.0-tól +3.0-ig).
    * `discrimination_alpha` (a): Mennyire választja szét a tudást.
* **Cél:** Olyan feladatot adni a usernek, ahol **User Ability (Theta) ≈ Question Difficulty (Beta)**. Ekkor a megoldás esélye kb. 50-60%, ami a legjobb tanulási zóna (Flow).

---

## 2. A "800 ELO-s Feladat" Életciklusa (Step-by-Step)

Mit kell tennie a Backendnek, amikor egy felhasználó megnyomja a "Következő feladat" gombot, és elé kerül egy "Java Változó" (800 difficulty / -1.0 beta) feladat?

### FÁZIS 1: Feladat Kiválasztása (Selection Logic)

1.  **User Állapot Lekérése:** Lekéred a user `user_concept_mastery` rekordjait.
    * *Példa:* A user basics tudása: 0.35 (Alacsony/Kezdő).
2.  **Next Item Recommendation (A kritikus lekérdezés):** A backend nem random kérdez! Olyan feladatot keres, ami:
    * Releváns (a `concept_prerequisites` szerint tanulható).
    * **Megfelelő nehézségű.** Mivel a user tudása 0.35 (ami kb. -1.0 Theta), a rendszer keres egy -1.0 körüli `difficulty_beta`-val rendelkező feladatot (Zone of Proximal Development).

**SQL Pseudocode:**

> SELECT qc.question_id
> FROM questions q
> JOIN question_concepts qc ON q.id = qc.question_id
> WHERE qc.concept_id = 'basics_uuid'
> AND q.difficulty_beta BETWEEN -1.5 AND -0.5
> ORDER BY RANDOM() LIMIT 1;

3.  **Eredmény:** A rendszer visszaadja a "Java Változó" feladatot (difficulty_rating: 800, beta: -1.0).

### FÁZIS 2: Válasz Feldolgozása (Submission Logic)

A felhasználó beküldi a választ: `int x=5;`. Ez **HELYES**.

1.  **Mentés:** `INSERT INTO user_submissions` (mentsd el az `execution_time_ms`-t is!).
2.  **Slip/Guess Detektálás** (Opcionális de ajánlott):
    * Ha a válasz helyes, de az idő < 2 másodperc -> **Guessed?** (Csökkentett jutalom).
    * Ha a válasz rossz, de az idő nagyon rövid -> **Slip?** (Nem tudáshiány, csak kapkodás).
3.  **BKT Frissítés (Matematika):** A backendnek ki kell számolnia az új `mastery_probability`-t.

**Input adatok:**
* `p_prev = 0.35`
* `correct = true`
* Concept params: `p_guess = 0.2`, `p_slip = 0.05`, `p_transit = 0.15`

**Számítás (Bayes-tétel):**

1. Mekkora az esélye, hogy tényleg tudta (nem tippelt)?

$P(L|Correct) = \frac{p_{prev} \cdot (1 - p_{slip})}{p_{prev} \cdot (1 - p_{slip}) + (1 - p_{prev}) \cdot p_{guess}}$

$P(L|Correct) \approx \frac{0.35 \cdot 0.95}{0.35 \cdot 0.95 + 0.65 \cdot 0.2} \approx \frac{0.3325}{0.3325 + 0.13} \approx 0.71$

2. Add hozzá a tanulást (`p_transit`):

$P(New) = P(L|Correct) + (1 - P(L|Correct)) \cdot p_{transit}$

$P(New) = 0.71 + (0.29 \cdot 0.15) \approx 0.75$

**Output:**
> UPDATE user_concept_mastery SET mastery_probability = 0.75;

**Eredmény:** A felhasználó tudása 35%-ról 75%-ra ugrott ebben a témában.

### FÁZIS 3: Visszajelzés (UI)

A kliensnek küldd vissza:
* XP növekedés.
* Streak update.
* Animáció: "A 'Basics' szinted nőtt!" (A 0.75-ös érték alapján).

---

## 3. Hogyan hozz létre jó tartalmat? (Content Creation)

Ha új feladatot adsz hozzá az adatbázishoz (admin felületen vagy SQL-ben), tartsd be ezeket:

1.  **Súlyozás (weight):** Ha egy feladat több témát érint, ne legyél lusta!
    * *Rossz:* Array (1.0), Loop (1.0) -> Ez torzítja a statisztikát.
    * *Jó:* Array (0.6), Loop (0.4) -> A `question_concepts` táblában a `weight` mező ezt szabályozza.
2.  **Kezdeti Nehézség (difficulty_rating vs beta):** Az adminnak `difficulty_rating`-et (ELO) adj meg (pl. 800, 1200). A backend mindig számolja át ezt `difficulty_beta`-ra mentéskor:
    * $beta = (rating - 1000) / 200$
3.  **Scaffolding:** A coding típusú feladatoknál a `scaffolding_blocks` (Parsons-szerű blokkok) kitöltése kötelező, ha segítséget akarsz nyújtani a gyengébb tanulóknak.

---

## 4. Hibaelhárítás

* **User "beragadt" egy szintre:**
    Ellenőrizd a `p_transit` értéket a `concepts` táblában. Ha túl alacsony (pl. 0.01), a user sosem lép szintet.
* **Túl nehéz kérdések jönnek:**
    Ellenőrizd a `difficulty_beta` eloszlást. Lehet, hogy nincs "közepes" nehézségű feladat a rendszerben, így kénytelen a nehezet adni.

**Jó munkát! Ha kérdésed van, keresd a Lead Developert.**