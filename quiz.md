# Saját Kvíz Létrehozása - Implementációs Terv

Ez a dokumentum a "Saját Kvíz" funkció megvalósításának részletes tervét tartalmazza a felhasználói követelmények alapján.

## 1. Áttekintés
A funkció lehetővé teszi a felhasználók számára, hogy saját kvízeket hozzanak létre, töltsenek fel kérdésekkel, és osszanak meg másokkal. A kvízek lehetnek publikusak (közösségi oldal) vagy privátok (megosztó kód).

## 2. Adatbázis Változtatások

### Új Táblák

1.  **`custom_quizzes`** (Kvízek tárolása)
    -   `id`: UUID (PK)
    -   `creator_id`: UUID (FK -> profiles.id)
    -   `title`: TEXT (Kvíz neve) - *Bár a kérdéseknek nincs címe, a kvíznek célszerű, hogy legyen, vagy generált.*
    -   `is_public`: BOOLEAN (Publikus vagy Privát)
    -   `share_code`: VARCHAR(6) (Egyedi azonosító: A-Z, 0-9)
    -   `created_at`: TIMESTAMP

2.  **`quiz_questions`** (Kapcsolótábla a Kvíz és Kérdések között)
    -   `quiz_id`: UUID (FK -> custom_quizzes.id)
    -   `question_id`: UUID (FK -> questions.id)
    -   `order_index`: INT (Sorrend)
    -   Primary Key: (`quiz_id`, `question_id`)

3.  **`quiz_attempts`** (Eredmények követése)
    -   `id`: UUID (PK)
    -   `quiz_id`: UUID (FK -> custom_quizzes.id)
    -   `user_id`: UUID (FK -> profiles.id)
    -   `score`: INT (Elért pontszám / helyes válaszok száma)
    -   `max_score`: INT (Összes kérdés száma)
    -   `started_at`: TIMESTAMP
    -   `completed_at`: TIMESTAMP

### Meglévő Táblák Módosítása

-   **`questions`**:
    -   `creator_id`: UUID (FK -> profiles.id, NULLABLE). Ha NULL, akkor rendszerkérdés. Ha ki van töltve, akkor felhasználó által létrehozott.
    -   `title`: A mező jelenleg kötelező (`NOT NULL`). A felhasználói felületen nem kérünk címet, így a backendnek automatikusan kell generálnia egyet (pl. "Saját kérdés #123" vagy dátum alapján), hogy megfeleljünk a sémának.

## 3. Backend Implementáció (NestJS)

### Modulok
-   Létrehozni egy új `QuizzesModule`-t.

### API Végpontok (`QuizzesController`)

1.  **Létrehozás és Szerkesztés**
    -   `POST /quizzes`: Új kvíz létrehozása.
    -   `PATCH /quizzes/:id`: Kvíz adatainak (publikus/privát) módosítása.
    -   `POST /quizzes/:id/questions`: Kérdés hozzáadása a kvízhez (új vagy meglévő).
    -   `DELETE /quizzes/:id/questions/:questionId`: Kérdés eltávolítása.
    -   `PUT /quizzes/:id/questions/order`: Sorrend módosítása.

2.  **Lekérdezés és Megosztás**
    -   `GET /quizzes/my-quizzes`: A bejelentkezett felhasználó kvízeinek listázása.
    -   `GET /quizzes/public`: Publikus kvízek listázása (Közösségi oldal).
    -   `GET /quizzes/code/:code`: Kvíz lekérése megosztó kód alapján.
    -   `GET /quizzes/:id`: Kvíz részletei (szerkesztéshez).

3.  **Eredmények**
    -   `GET /quizzes/:id/results`: A kvíz készítője számára az eredmények listázása (kik töltötték ki, milyen eredménnyel).
    -   `POST /quizzes/:id/attempt`: Kitöltés indítása/befejezése.

4.  **Kérdések Kezelése (`QuestionsService` kiegészítése)**
    -   `createCustomQuestion(dto, user)`: Kérdés létrehozása `creator_id`-val.
        -   Cím generálása automatikusan.
        -   `difficulty_display`, `beta`, `alpha` alapértelmezett értékekkel.
    -   `searchQuestions(filter, user)`: Keresés a rendszerkérdések ÉS a felhasználó saját kérdései között.

## 4. Frontend Implementáció (React)

### Új Oldalak és Komponensek

1.  **Irányítópult / Kvízkezelő (`QuizManagerPage`)**
    -   Listázza a saját kvízeket.
    -   "Új Kvíz Létrehozása" gomb.
    -   Kvízkártyák: Szerkesztés, Eredmények megtekintése, Megosztó kód megjelenítése.

2.  **Kvíz Szerkesztő (`QuizEditorPage`)**
    -   **Fejléc**: Publikus/Privát kapcsoló. Megosztó kód (ha mentve van).
    -   **Kérdéslista**: Hozzáadott kérdések listája sorrendben.
    -   **Műveletek**:
        -   "Új Kérdés Létrehozása": Megnyitja a Kérdéskészítőt.
        -   "Meglévő Kérdések": Megnyitja a Kereső Modalt.

3.  **Kérdéskészítő (`QuestionCreator` komponens)**
    -   **Típusválasztó**: Legördülő menü (6 típus: Coding, Theory, Debug, stb.).
    -   **Dinamikus Űrlap**: A választott típusnak megfelelő mezők.
    -   **Specifikus - Kódolós Feladat**:
        -   Leírás (Markdown).
        -   Bemenet/Kimenet tesztesetek.
        -   **Beviteli Mód**: Radio gombok/Select:
            -   Csak Billentyűzet
            -   Csak Kódblokkok
            -   Mindkettő
        -   **Kódblokk beállítás**: Ha kódblokk engedélyezett, egy szövegmezőbe be kell írni a helyes megoldást. A rendszer ezt soronként/logikai egységenként bontja blokkokra.

4.  **Kereső Modal (`QuestionSearchModal`)**
    -   Szűrők: Cím, Leírás, Nyelv, Típus, Nehézség.
    -   Forrás kapcsoló: "Rendszer kérdések" vs "Saját kérdéseim".

5.  **Közösségi Kvízek (`CommunityPage`)**
    -   Keresősáv: 6 karakteres kód beírása -> Azonnali ugrás a kvízre.
    -   Lista: Publikus kvízek böngészése.

6.  **Kvíz Kitöltő Felület (`QuizPlayer`)**
    -   Hasonló a meglévő gyakorló felülethez.
    -   **Progress Bar**:
        -   Bal oldalt Sanity ikon, jobb oldalt X (vagy cél) ikon.
        -   Csík kitöltése: Diszkrét lépésekben.
        -   Logika: `(Jelenlegi Kérdés Indexe / Összes Kérdés) * 100%`.
        -   Pl. 2 kérdés esetén:
            -   1. kérdésnél (index 0): 0% szélesség.
            -   2. kérdésnél (index 1): 50% szélesség.
            -   Vége: 100%.

## 5. Megvalósítási Lépések

1.  **Adatbázis**: Migrációs scriptek elkészítése (új táblák, `questions` módosítása).
2.  **Backend**: Entitások, DTO-k, Service-ek és Controllerek létrehozása.
3.  **Frontend - Kvízkezelő**: Lista nézet és Kvíz létrehozása (üresen).
4.  **Frontend - Kérdéskészítő**: A 6 típus űrlapjának implementálása, különös tekintettel a Kódolós feladat blokk-logikájára.
5.  **Frontend - Kereső**: Meglévő kérdések hozzáadása.
6.  **Frontend - Kitöltő**: A játékmenet és a speciális progress bar implementálása.
7.  **Frontend - Eredmények**: A készítői nézet statisztikákkal.
8.  **Tesztelés**: Jogosultságok (saját kvíz szerkesztése), megosztó kódok működése.
