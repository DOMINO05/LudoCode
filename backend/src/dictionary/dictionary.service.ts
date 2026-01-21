import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DictionaryEntry } from '../entities/dictionary.entity';

@Injectable()
export class DictionaryService implements OnModuleInit {
  constructor(
    @InjectRepository(DictionaryEntry)
    private dictionaryRepository: Repository<DictionaryEntry>,
  ) {}

  async onModuleInit() {
    await this.seed();
  }

  async seed() {
    const initialData = [
      { word: 'rekurzió', definition: 'Egy olyan eljárás vagy függvény, amely önmagát hívja meg a probléma egy kisebb részfeladatának megoldására. Fontos eleme a báziseset, ami megállítja a hívásokat.', category: 'general' },
      { word: 'változó', definition: 'Egy névvel ellátott tárolóhely a memóriában, amely adatot (értéket) tartalmaz, és amelynek tartalma a program futása során megváltozhat.', category: 'general' },
      { word: 'ciklus', definition: 'Programozási szerkezet, amely lehetővé teszi egy utasításblokk ismételt végrehajtását, amíg egy feltétel igaz.', category: 'general' },
      { word: 'függvény', definition: 'Újrafelhasználható kódrészlet, amely egy adott feladatot végez el. Bemeneti paramétereket kaphat és visszatérési értéket adhat.', category: 'general' },
      { word: 'objektum', definition: 'Az objektumorientált programozás alapköve. Adatokat (tulajdonságok) és a rajtuk végzett műveleteket (metódusok) foglal egy egységbe.', category: 'general' },
      { word: 'osztály', definition: 'Egy sablon vagy tervrajz objektumok létrehozására. Meghatározza az objektumok közös tulajdonságait és viselkedését.', category: 'general' },
      { word: 'tömb', definition: 'Azonos típusú adatok tárolására szolgáló adatszerkezet, ahol az elemekre indexük alapján hivatkozhatunk.', category: 'general' },
      { word: 'debug', definition: 'A programhibák (bugok) keresésének és javításának folyamata.', category: 'general' },
      { word: 'fordító', definition: 'Olyan program, amely a magas szintű programozási nyelven írt kódot a számítógép által érthető gépi kódra fordítja.', category: 'general' },
      { word: 'szintaxis', definition: 'Egy programozási nyelv nyelvtani szabályainak összessége, amely meghatározza, hogyan kell helyesen írni a kódot.', category: 'general' },
      { word: 'string', definition: 'Karakterek sorozata, amelyet szövegek tárolására és manipulálására használnak.', category: 'general' },
      { word: 'boolean', definition: 'Logikai adattípus, amelynek csak két értéke lehet: igaz (true) vagy hamis (false).', category: 'general' },
      { word: 'algoritmus', definition: 'Lépések pontos sorozata egy adott probléma megoldására vagy egy feladat elvégzésére.', category: 'general' },
      { word: 'API', definition: 'Application Programming Interface - Alkalmazásprogramozási felület. Szabályok és definíciók készlete, amely lehetővé teszi, hogy különböző szoftverek kommunikáljanak egymással.', category: 'general' },
      { word: 'kivétel', definition: 'Exception - Futás közben fellépő hiba vagy rendkívüli esemény, amely megszakítja a program normál futását.', category: 'general' },
      { word: 'int', definition: 'Integer - Egész szám típusú adat tárolására szolgál (pl. -5, 0, 42).', category: 'general' },
      { word: 'integer', definition: 'Egész szám típusú adat tárolására szolgál (pl. -5, 0, 42).', category: 'general' },
      { word: 'float', definition: 'Lebegőpontos szám - Tizedesjegyeket tartalmazó számok tárolására (pl. 3.14, -0.01).', category: 'general' },
      { word: 'double', definition: 'Dupla pontosságú lebegőpontos szám - Nagyobb pontosságú tizedes számokhoz (Java).', category: 'java' },
      { word: 'if', definition: 'Feltételes elágazás - Csak akkor fut le a benne lévő kódblokk, ha a feltétel igaz.', category: 'general' },
      { word: 'else', definition: 'Különben ág - Az if feltétel hamis kiértékelése esetén lefutó kódblokk.', category: 'general' },
      { word: 'while', definition: 'Elöltesztelő ciklus - Addig ismétli a kódblokkot, amíg a feltétel igaz.', category: 'general' },
      { word: 'for', definition: 'Ciklus - Előre meghatározott hányszor fut le, vagy végigiterál egy gyűjtemény elemein.', category: 'general' },
      { word: 'return', definition: 'Visszatérés - Befejezi a függvény futását és opcionálisan visszaad egy értéket.', category: 'general' },
      { word: 'void', definition: 'Jelzi, hogy a függvénynek nincs visszatérési értéke.', category: 'java' },
      { word: 'import', definition: 'Külső könyvtár, modul vagy osztály betöltése a jelenlegi fájlba.', category: 'general' },
      { word: 'public', definition: 'Nyilvános láthatóság - Az elem bárhonnan elérhető.', category: 'java' },
      { word: 'private', definition: 'Privát láthatóság - Az elem csak az adott osztályon belül érhető el.', category: 'java' },
      { word: 'static', definition: 'Statikus tag - Az osztályhoz tartozik, nem pedig annak egy példányához.', category: 'java' },
      { word: 'main', definition: 'A főprogram belépési pontja, innen indul a futás.', category: 'general' },
      { word: 'print', definition: 'Kiíratás a képernyőre vagy konzolra.', category: 'python' },
      { word: 'println', definition: 'Print Line - Kiíratás a konzolra, majd új sor kezdése.', category: 'java' },
      { word: 'console.log', definition: 'Kiíratás a böngésző vagy Node.js konzoljára.', category: 'javascript' },
      { word: 'null', definition: 'Az érték hiányát vagy a semmit jelölő speciális érték.', category: 'general' },
      { word: 'None', definition: 'A semmi vagy érték hiányának jelölése Pythonban.', category: 'python' },
      { word: 'komment', definition: 'Megjegyzés a kódban, amelyet a fordító/értelmező figyelmen kívül hagy. A programozóknak szól.', category: 'general' },
      { word: 'indentálás', definition: 'A kód sorainak beljebb kezdése (behúzás). Pythonban a kódblokkok jelölésére kötelező.', category: 'python' },
      { word: 'fordítás', definition: 'A folyamat, amikor a forráskódot a számítógép által futtatható formátumra alakítják.', category: 'general' },
      { word: 'futásidejű hiba', definition: 'Runtime Error - Hiba, amely a program működése közben lép fel (pl. nullával való osztás).', category: 'general' },
      { word: 'paraméter', definition: 'Változó a függvény definíciójában, amelyen keresztül adatot kaphat.', category: 'general' },
      { word: 'argumentum', definition: 'A konkrét érték, amelyet a függvényhíváskor átadunk a paraméternek.', category: 'general' },
      { word: 'példányosítás', definition: 'Instantiation - Egy konkrét objektum létrehozása egy osztály (tervrajz) alapján.', category: 'general' },
      { word: 'metódus', definition: 'Olyan függvény, amely egy osztályhoz vagy objektumhoz tartozik.', category: 'general' },
      { word: 'operátor', definition: 'Műveleti jel (pl. +, -, *, / vagy logikai &&, ||).', category: 'general' },
      { word: 'deklaráció', definition: 'Egy változó vagy függvény létének és típusának bejelentése.', category: 'general' },
      { word: 'deklarál', definition: 'Létrehoz/bejelent. Egy változó vagy függvény létének és típusának megadása.', category: 'general' },
      { word: 'inicializálás', definition: 'A változó első értékadása.', category: 'general' },
      { word: 'konstans', definition: 'Olyan változó, amelynek értéke a megadása után nem változtatható meg.', category: 'general' },
      { word: 'scope', definition: 'Hatókör - A kód azon része, ahol egy adott változó látható és elérhető.', category: 'general' },
      { word: 'index', definition: 'Sorszám, amely megadja egy elem helyét a tömbben vagy listában (általában 0-tól indul).', category: 'general' },
      { word: 'input', definition: 'Bemenet - Adat, amely a programba érkezik (pl. billentyűzetről, fájlból).', category: 'general' },
      { word: 'output', definition: 'Kimenet - Adat, amelyet a program állít elő (pl. képernyőre írás, fájlba mentés).', category: 'general' },
      { word: 'modul', definition: 'Önálló kódegység, amely más programokban is felhasználható.', category: 'general' },
      { word: 'könyvtár', definition: 'Library - Előre megírt kódok gyűjteménye, amely segíti a fejlesztést.', category: 'general' },
      { word: 'framework', definition: 'Keretrendszer - Egy szoftver alapstruktúrája, amelyre építkezve fejleszthetünk alkalmazásokat.', category: 'general' },
      { word: 'verem', definition: 'Stack - LIFO (Last In, First Out) adatszerkezet.', category: 'general' },
      { word: 'sor', definition: 'Queue - FIFO (First In, First Out) adatszerkezet.', category: 'general' },
      { word: 'lista', definition: 'Elemek sorrendezett gyűjteménye.', category: 'general' },
      { word: 'szótár', definition: 'Dictionary/Map - Kulcs-érték párokat tároló adatszerkezet.', category: 'general' },
      { word: 'bug', definition: 'Programhiba, ami hibás működést eredményez.', category: 'general' },
      { word: 'refaktorálás', definition: 'A kód szerkezetének javítása a viselkedés megváltoztatása nélkül.', category: 'general' },
      { word: 'verziókezelés', definition: 'A forráskód változásainak nyomon követése (pl. Git).', category: 'general' },
      { word: 'IDE', definition: 'Integrated Development Environment - Integrált fejlesztői környezet (pl. VS Code, IntelliJ).', category: 'general' },
      { word: 'frontend', definition: 'A szoftver felhasználó által látható része (kliens oldal).', category: 'general' },
      { word: 'backend', definition: 'A szoftver háttérben futó része (szerver oldal).', category: 'general' },
      { word: 'adatbázis', definition: 'Szervezett adattároló rendszer.', category: 'general' },
      { word: 'SQL', definition: 'Structured Query Language - Adatbázis-lekérdező nyelv.', category: 'general' },
      { word: 'ekvivalens', definition: 'Egyenértékű. Két dolog akkor ekvivalens, ha az értékük vagy a viselkedésük megegyezik, még ha a formájuk különbözik is. (pl. logikai kifejezésekben).', category: 'general' },
      { word: 'konstruktor', definition: 'Speciális metódus, amely egy objektum létrehozásakor (példányosításkor) fut le. Általában az objektum kezdőértékeinek beállítására használjuk.', category: 'general' },
      { word: 'interfész', definition: 'Egy szerződés (contract), amely meghatározza, hogy egy osztálynak milyen metódusokat kell megvalósítania, de a megvalósítást nem tartalmazza.', category: 'general' },
      { word: 'literálok', definition: 'A forráskódban közvetlenül leírt fix értékek (pl. 42, "hello", true).', category: 'general' },
      { word: 'echo', definition: 'Parancs (pl. PHP, Bash), amely kiírja a kapott szöveget a kimenetre.', category: 'general' },
      { word: 'konvenció', definition: 'Megállapodás, közös szabályrendszer, amelyet a programozók követnek a kód olvashatósága érdekében (pl. elnevezési szokások).', category: 'general' },
      { word: 'do-while', definition: 'Hátultesztelő ciklus - A ciklusmag egyszer mindenképpen lefut, és utána ellenőrzi a feltételt.', category: 'general' },
      { word: 'explicit', definition: 'Kifejezett, egyértelmű. Programozásban pl. típuskonverziónál (casting), amikor a programozó utasítja a fordítót a típusváltásra.', category: 'general' },
    ];

    // Upsert items (requires constraint name or unique columns)
    // TypeORM upsert support might depend on driver version, but usually works with ['word'] conflict path
    await this.dictionaryRepository.upsert(initialData, ['word']);
    
    console.log('Dictionary seeded/updated!');
  }

  async findAll(): Promise<DictionaryEntry[]> {
    return this.dictionaryRepository.find({ order: { word: 'ASC' } });
  }
}
