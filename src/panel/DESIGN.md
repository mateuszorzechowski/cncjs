# Panel — założenia projektowe

Panel to pulpit sterowania frezarką CNC (Grbl, docelowo też Marlin, Smoothie,
TinyG). Serwer stoi przy maszynie; panel otwiera się w przeglądarce na
telefonie, tablecie albo PC. Ten dokument opisuje **po co jest każdy ekran, jak
wygląda na każdym urządzeniu i jakie reguły obowiązują**, żeby dało się
przeprowadzić analizę UX, reorganizację ekranów i ujednolicenie komponentów bez
łamania decyzji, które już zapadły.

Zrzuty obecnych ekranów (stan: 2026-09-27, Grbl Idle, wczytany program
`kieszen-kontur.nc`) są w projekcie Claude Design w `guidelines/screens/` pod
nazwami `<ekran>-<urządzenie>.png` (`phone` 390×844, `tablet` 1024×768, `pc`
1920×1080). W repo generuje je `.design-sync/capture-screens.cjs`.

## 1. Urządzenia

Układ zależy od **szerokości powłoki** (elementu `@container/shell`), nie okna.

| Urządzenie | Szerokość powłoki | Czym jest w praktyce |
|---|---|---|
| Telefon | < 768 px | pendant w ręce przy maszynie; jedna ręka, kciuk |
| Tablet | 768–1799 px | główny cel projektu: **1024×768**, ekran przy maszynie, dotyk |
| PC | ≥ 1800 px | laptop/monitor Full HD w garażu; mysz i klawiatura |

- Komponenty zmieniają układ **raz**, przy 48rem (`@3xl/shell`). PC to układ
  tabletu z większą ilością miejsca; różnice PC są w kompozycji ekranów
  (`useIsWide`, ≥ 1800 px), nie w komponentach.
- `@7xl/shell` (80rem = 1280 px) używa tylko pasek filtrów Dziennika.
- Cele dotykowe ≥ 40 px (`h-ctl`, `h-chiph`); na tablecie ręka bywa w
  rękawicy albo brudna.

## 2. Powłoka (wspólna dla wszystkich ekranów)

```
Telefon                     Tablet / PC
┌─────────────────────┐     ┌──────┬──────────────────────────────┐
│[● IDLE ▾]    [STOP] │     │● IDLE│ sterownik · port       [STOP]│
├─────────────────────┤     ├──────┼──────────────────────────────┤
│                     │     │ Rail │                              │
│   ekran             │     │ (11) │   ekran                      │
│                     │     │      │                              │
├──────── ⌃ ──────────┤     ├──────┴──────────────────────────────┤
│ 5 zakładek (NavTabs)│     │ StatusBar: zadanie · Start/Pauza    │
└─────────────────────┘     └─────────────────────────────────────┘
```

- **Górny pasek** (każde urządzenie):
  - StateChip: stan maszyny; otwiera StatusSheet z radą, alarmem, warstwami
    serwer/port/maszyna i przyciskiem Rozłącz.
  - `?`: tylko gdy ekran ma pomoc (dziś Jog i Zerowanie).
  - Sterownik i port: tylko tablet/PC; na telefonie tylko gdy jest problem.
  - Znaczek ↻ nowej wersji.
  - **STOP** przy prawej krawędzi.
- **Nawigacja:**
  - Tablet/PC: `NavRail` po lewej. Wszystkie 11 pozycji, niegotowe wyszarzone
    (nie ukryte, żeby rail się nie przesuwał pod ręką). **Rail nigdy się nie
    przewija.**
  - Telefon: `NavTabs` na dole. 5 pozycji (Pulpit, Jog, Zero, Pliki, Dziennik),
    reszta w siatce wysuwanej w górę (kopczyk ⌃ albo przesunięcie palcem).
- **StatusBar** (tylko tablet/PC): jeden temat naraz. Domyślnie zadanie (plik,
  %, linia, czas, Start/Pauza, Przerwij). Jog i Ścieżka pokazują tam swoje
  fakty, dopóki nie ma wczytanego programu. Na telefonie paska nie ma, a
  przyciski zadania są w karcie Przebieg zadania na Pulpicie.
- **Arkusze:** na telefonie `Sheet` od dołu, od tabletu dialog 520 px na
  środku. Maksymalnie 85% wysokości. Zamyka je Esc, dotknięcie tła albo
  przeciągnięcie w dół (tylko dotyk).
- **RefusalNotice:** pływający komunikat na 6 s, tylko gdy przycisk był aktywny,
  a stan zmienił się w chwili naciśnięcia.

## 3. Ekrany

Kolejność jak w railu. Przy każdym: cel, główna akcja, układ na trzech
urządzeniach, zrzuty.

### Pulpit (`dashboard`) — zrzuty `dashboard-*`
- **Cel:** ekran zostawiony na czas pracy maszyny.
- **Główna akcja:** Start/Pauza zadania.
- **Telefon:** Pozycja robocza (DRO w kolumnie), potem Komendy (2×2:
  Odblokuj, Wstrzymaj, Wznów, Reset), potem Przebieg zadania z Start/Pauza.
  Narzędzie, korekty i wysokość Z są celowo pominięte. Zasada: „żadnych gołych
  przycisków”.
- **Tablet = PC:**
  - Lewa kolumna: Narzędzie i wrzeciono (T, obroty, korekty posuwu i wrzeciona,
    skróty Sonda Z / Jog / Pliki), pod nią Komendy.
  - Prawa kolumna (`w-side`): Pozycja robocza, pod nią Przebieg zadania.
  - Na dole na całą szerokość: Wysokość Z (Zeruj Z, Zeruj XY, Sonduj Z).
  - PC nie ma własnego układu, więc na 1920 px karty są rozciągnięte.
- **Stany:**
  - Komendy są aktywne według stanu firmware: Odblokuj tylko w Alarmie,
    Wstrzymaj w Run/Jog, Wznów w Hold/Door, Reset zawsze po połączeniu.
  - Reset jest czerwony, bo to ten sam bajt co STOP.
  - Sonda Z to miejsce na przyszłą funkcję (nieaktywne).

### Jog (`jog`) — zrzuty `jog-*`
- **Cel:** ręczne przesuwanie maszyny.
- **Główna akcja:** pad jogu.
- **Telefon:**
  - Na górze pasek DRO, niżej wysoki pad 3×4: krzyż XY, pod nim Z+/Bazuj/Z−.
    Kolejność zamieniona tak, żeby klawisze były pod kciukiem.
  - Pod padem dwie linie `SettingSummary` (XY i Z: krok + posuw), każda otwiera
    arkusz. Rozwijanie w miejscu przesunęłoby pad.
- **Tablet = PC:**
  - Lewa karta o stałej szerokości (`w-jcard`): pad 3×3 z osobną kolumną Z,
    pod nim krok (SegmentedChoice) i prędkość (Stepper) dla XY i Z.
  - Prawa strona: pasek DRO, pod nim podgląd ścieżki 3D (ten sam widget co
    Ścieżka, z osobną pamięcią kamery).
  - StatusBar pokazuje stan, układ, posuw i obroty.
- **Interakcja:**
  - Stuknięcie robi jeden krok.
  - Przytrzymanie ponad **250 ms** uruchamia ciągły jog. Puszczenie, wyjście
    palca poza przycisk, utrata fokusu okna albo ukrycie karty zatrzymuje go.
  - Klawiatura: strzałki XY (także po skosie), PgUp/PgDn dla Z, Shift daje
    największy krok, `?` otwiera ściągę.
  - Narożniki padu jadą dwiema osiami. Środek padu to „do zera roboczego”.
  - **Bazuj** (`$H`) zostaje aktywne w alarmie, bo bazowanie go zdejmuje.
  - Jog nie pyta o potwierdzenie.

### Zerowanie (`zero`) — zrzuty `zero-*`
- **Cel:** ustawić zero robocze (`G10 L20`) dla osi lub ich zestawu.
- **Główna akcja:** X / Y / Z (wypełnione), XY / XYZ (obrys).
- **Układ:** jeden na każdej szerokości. Karta z DRO, chipami układu G54–G57,
  notą „ustawia zero układu G54…” i rzędem 5 przycisków.
- **Na PC** cyfry lądują ~1700 px od etykiet osi, a środek ekranu jest pusty
  (patrz §6).
- **Zasady:**
  - Nic tu nie rusza maszyną, więc nie ma potwierdzenia.
  - Wyjaśnienie jest pod `?`, nie w tekście na ekranie („czułbym się jak
    debil”).
  - Chip układu wysyła sam `G55` (intencja `wcs`): nic nie jedzie i nic nie
    trafia do EEPROM, więc bez potwierdzenia; wygaszony jak zerowanie (alarm,
    program). Zapala się odpowiedź maszyny (`$G`), nie naciśnięcie.

### Pliki (`files`) — zrzuty `files-*`, `files-selected-*`
- **Cel:** biblioteka programów na serwerze i wybór następnego zadania.
- **Główna akcja:** Wczytaj. **Wybranie pliku go nie wczytuje.**
- **Telefon:**
  - Na ekranie sama lista.
  - Wybór pliku otwiera arkusz z dwiema stronami przesuwanymi palcem: szczegóły
    i treść pliku.
  - Bez edycji.
- **Tablet:**
  - Lista, a obok (`w-side`) karta Wybrany plik: podgląd 3D, wymiary, 4 kafle
    (linie, czas, narzędzia, Z min), Kontrola (werdykt + Sprawdź na
    sterowniku), Usuń / Edytuj / Wczytaj.
  - Edytor otwiera się w arkuszu.
- **PC:** trzy karty: lista, szczegóły, edytor. Edytor jest zawsze widoczny, a
  bez wybranego pliku pusty.
- **Potwierdzenia:** usunięcie, zastąpienie przy wgrywaniu, `$C` (Grbl się
  resetuje), zapis wczytanego pliku (czy przeładować).
- **Blokady:**
  - Wczytaj jest wyszarzone podczas programu.
  - Wczytanego pliku nie da się usunąć.

### Ścieżka (`path`) — zrzuty `path-*`
- **Cel:** obejrzeć wczytaną ścieżkę przed startem, wskazać punkt i dojechać
  do niego.
- **Główna akcja:** brak jednej.
- **Układ:** jeden. Scena 3D na cały ekran.
  - Pasek ikon: 4 widoki, dopasuj, 5 warstw.
  - Odczyt w lewym dolnym rogu: kursor, wskazany punkt, „klik jedzie”, Jedź.
- **Telefon:** ten sam układ. Fakty ze StatusBaru (nazwa, wymiary, układ) są
  tam niewidoczne.
- **Zasady:**
  - **Kamerę rusza tylko przycisk widoku.** Ani ruch maszyny, ani zmiana
    warstw, ani nowy program.
  - Kamera ortograficzna, domyślnie izometria.
  - Lewy klik wskazuje punkt, prawy cofa punkt i przerywa dojazd.
  - „Klik jedzie” domyślnie wyłączone; włączone daje taśmę ostrzegawczą wokół
    sceny.

### Dziennik (`journal`) — zrzuty `journal-*`
- **Cel:** „co się stało” (zastąpił Alarmy). Bieżący alarm należy do
  StatusSheet.
- **Treść:** filtry, lista od najnowszych z nagłówkiem dnia, wiersz rozwija się
  po stuknięciu, nowe wpisy przychodzą na żywo.
- **Telefon:** pole szukaj + przycisk Filtry, który otwiera arkusz z kafelkami.
- **Tablet:** filtry w dwóch liniach.
- **≥ 1280 px:** filtry w jednej linii.
- Co w ogóle jest zapisywane, ustawia się w Ustawieniach. Filtry tylko zawężają.

### Ustawienia (`settings`) — zrzuty `settings-*`
- **Cel:** wszystko, co ustawia się raz i zostawia.
- **Zakładki:** Połączenie · Sterownik · Preferencje · Instalacja
  (SegmentedChoice na górze). Przesunięcie palcem po treści zmienia zakładkę.
  Wygląd dołączył do Preferencji (handoff 2026-09-28).
- **Połączenie:**
  - Port, sterownik i prędkość jako `SettingSummary` z arkuszem. Przy otwartym
    porcie są ZABLOKOWANE, z jedną notą pod spodem.
  - Tryb łączenia.
  - Serwer.
  - Połączenie: Połącz/Rozłącz (zostaje na swoim miejscu).
- **Sterownik (Grbl `$$`)** — handoff „Ustawienia → Sterownik”, 2026-09-28:
  - Karta **PAMIĘĆ STEROWNIKA**, pod etykietą nazwa i wersja firmware z serwera
    (`Card sublabel`), w nagłówku ↻ Odczytaj ze sterownika (pyta, gdy są
    niezapisane zmiany).
  - **Lista grup** jako `SettingSummary` z **wartościami z serwera**, nie
    licznikami (`3500 · 3500 · 600 mm/min`, `Wł. · 500 mm/min`…). Pod linią dwie
    pozycje, które nie są grupami: Historia zmian (stan: „ostatni zapis 01:12”
    / „zmiana spoza panelu 00:40”) i Widok surowy `$$` („ustawień: 34”).
  - **Grupa:** telefon — arkusz z „Gotowe”; tablet — karta w miejscu listy ze
    stałym nagłówkiem i „Wróć”; PC — kolumna obok listy, zawsze jedna grupa
    wybrana (domyślnie pierwsza), bez „Wróć”. Osie: wiersz na wielkość, pola
    X Y Z obok siebie.
  - **Pasek zmian** tylko przy ≥ 1 niezapisanej zmianie, poza przewijaniem:
    „Niezapisane zmiany: 3 · Osie 2 · Bazowanie 1 · Przejrzyj”. Telefon: pas nad
    dolnym menu; tablet i PC: karta pod listą (i grupą).
  - **Przegląd zmian** to jedyna droga do EEPROM i zarazem jej potwierdzenie:
    lista było → jest, ✕ przy każdej zmianie, „Odrzuć wszystkie” (outline) i
    „Zapisz w sterowniku”. Telefon: arkusz; tablet/PC: dialog 520 px.
  - **Odrzuć wszystkie** bez pytania — pływający komunikat (`UndoNotice`) z
    „Cofnij” przez ~6 s.
  - **Historia:** jeden wpis = jeden zapis (z panelu / spoza panelu), serwer
    grupuje. „Przywróć stan sprzed” dodaje zmiany do paska, nic nie zapisuje.
    Eksport/import `$$` — etap następny.
  - **Geometria** (3D, tabela bazowania, podsumowanie, sprawdzenia) pokazuje
    **stan po niezapisanych zmianach** — serwer liczy go na żądanie
    (`settings:preview`), z tym, co Grbl robi sam (`$22=0` gasi `$20`). Zmieniona
    linia: nowa wartość, pod nią przekreślona obecna. Telefon: pozycja listy i
    arkusz; tablet i PC: stała kolumna `w-setcol` do StatusBaru. Przegląd
    dostaje sekcję „Geometria po zapisie” (linie przed → po, 3D, sprawdzenia),
    gdy zmiana dotyczy geometrii. Czerwone sprawdzenie ostrzega, nie blokuje.
  - Tylko do odczytu, gdy zapis jest niemożliwy (brak połączenia, maszyna nie
    w Idle/Alarm, trwa program).
- **Preferencje:** dwie sekcje według zakresu zamiast etykiety przy każdym
  wierszu:
  - **To urządzenie:** Język, Motyw, Gęstość (Wygodna/Zwarta), Krój cyfr
    (Azeret/JetBrains/Plex/Segment — fonty dołączone do panelu), Ekran bez
    blokady.
  - **Serwer · wszystkie urządzenia:** Jednostki mm/cale, Pilnuj jednostek
    maszyny, Kroki i Posuwy jogu, Próg dziennika.
- **Instalacja:** krok 1 certyfikat, krok 2 instalacja aplikacji, stopka z
  wersją i Przeładuj. Wykonany krok zwija się do jednej linii z ✓ i rozwija po
  stuknięciu. Ostrzeżenie o urzędzie certyfikacji pod `?`.
- **Przewijanie:** stoją górny pasek, zakładki, pasek zmian, dolne menu albo
  rail i StatusBar. Telefon: pod zakładkami przewija się cała karta razem z
  nagłówkiem. Tablet i PC: nagłówek karty stoi, przewija się jej środek.

### MDI (`mdi`)
- **Cel:** wpisać linię G-code albo polecenie `$` i przeczytać odpowiedź maszyny.
- **Układ:** jeden na każdej szerokości. Karta: konsola maszyny (wszystko, co
  klienci i kolejka wysłali, i wszystko, co sterownik odpowiedział; bez `?`,
  bajtów czasu rzeczywistego i odcinków jogu), u dołu pole + Wyślij.
  „Wyczyść” w nagłówku.
- **Zasady:**
  - Linia idzie kolejką serwera (`gcode`): liczona, potwierdzana, w dzienniku
    jako linia z konsoli. Bez potwierdzenia — MDI to decyzja operatora.
  - W trakcie programu pole wygaszone. W alarmie przechodzą tylko polecenia
    `$` (`$X`, `$H`, `$$`); inna linia jest odrzucana głośno i zostaje w
    konsoli przekreślona, z powodem.
  - `error:N` / `ALARM:N` w kolorze czerwonym, z opisem po polsku obok.
  - Enter wysyła, ↑/↓ przewija historię tego urządzenia (do przeładowania).

### Bazowanie (`homing`)
- **Cel:** wiedzieć, czy maszyna zna swoje położenie, i ją zbazować.
- **Układ:** jeden na każdej szerokości (karta przewija się pod nagłówkiem).
  DRO, kafle: Zbazowano (godzina / Nie / Blokada bazowania / Wyłączone
  `$22`), `$25`, `$24`, `$27`; nota; „Bazuj wszystkie osie” na całą szerokość;
  martwe X / Y / Z z notą; „Ustawienia bazowania” → Ustawienia → Sterownik.
- **Zasady:**
  - „Zbazowano” liczy serwer (`controller:homing`): `$H` z `ok` = bazowanie,
    zapomniane przy alarmie gubiącym pozycję (wszystkie poza 2/4/5) i przy
    blokadzie bazowania po twardym resecie. Grbl sam tego nie mówi.
  - Bez potwierdzenia, jak Bazuj na jogu. Aktywne w alarmie.
  - Bazowanie per oś wyszarzone (Grbl nie ma `$HX`, serwer ma jedno `homing`).

### Diagnostyka (`diag`)
- **Cel:** zobaczyć, co widzi sterownik na wejściach, i ile kosztuje ta
  instalacja.
- **Układ:** dwie karty, jedna pod drugą do tabletu, obok siebie na PC.
  „Wejścia sterownika”: 8 kafli wejść z `Pn:` (krańcówki X/Y/Z, sonda, drzwi,
  wstrzymanie, reset, start cyklu), wrzeciono i chłodzenie z `A:`, wolny bufor
  z `Bf:` (tylko gdy `$10` go raportuje). „Sterownik i panel”: firmware, port ·
  prędkość, wersja panelu, a pod nimi `JogTiming` z arkusza jogu.
- **Zasady:**
  - Wyzwolone wejście w bursztynie. Kafle stoją w miejscu — rząd nie rośnie.
  - Nic tu nie rusza maszyną i nic nie zapisuje; panel nie proponuje zmiany
    `$10` (zapis EEPROM).

### Niegotowe: Sonda
- Jest w nawigacji wyszarzona. Ekranu nie ma.

## 4. Reguły interakcji (obowiązują każdą reorganizację)

1. **Dwa STOP-y.**
   - Duży **STOP** w górnym pasku: natychmiastowy reset (kategoria 0), zawsze
     na tym samym miejscu, jedyny pełny czerwony.
   - **Przerwij** przy zadaniu: najpierw wstrzymanie, potem reset, pozycja
     zachowana.
   - Etykiety nie zmieniają się ze stanem.
2. **Start** to jedyny zielony, na przeciwnym końcu niż STOP.
3. **Jedna główna akcja na ekran** (`Button tone="primary"`).
4. **Nic nie przesuwa się pod kciukiem.**
   - Brak banerów i rozwijania w miejscu; szczegóły idą do arkusza.
   - Nawigacja nie zyskuje ani nie traci pozycji.
   - Komunikaty pływają nad treścią.
5. **Bez list rozwijanych.** Wybór spośród kilku wartości to `SegmentedChoice`.
   Wszystkie opcje są widoczne i można w nie trafić bez patrzenia.
6. **Wyszarz z powodem, zamiast odmawiać po naciśnięciu.**
   - Kontrolka jest nieaktywna, zanim ktoś ją naciśnie, a powód jest napisany
     obok (nota, tooltip).
   - Odmowa serwera (`command:refused`) jest tylko na wyścig.
   - W alarmie serwer i tak nie wysyła G-code.
7. **Bramka programu:** co wolno, gdy program działa.
   - Działa: tylko sterowanie (pauza, wznów, stop, korekty).
   - Pauza w stanie Idle/Jog (np. M6): także jog, zero i konsola.
   - Pauza w stanie Hold: jak działający program.
8. **Potwierdza się tylko to, co nieodwracalne albo pisze do maszyny:** EEPROM,
   usunięcie lub zastąpienie pliku, `$C`, przeładowanie wczytanego pliku.
   Zerowanie, jog i dojazd nie pytają.
9. **ConfirmSheet nazywa akcję**, nigdy „OK”.
10. **Pomoc za `?`**, nie akapity na ekranie.
11. **Przewija się tylko jeden, wyraźny obszar.** Powłoka i rail nigdy.
12. **Panel niczego nie liczy.**
    - Liczby (statystyki pliku, obszar, czas, jednostki) przychodzą z serwera,
      już przeliczone.
    - Wyjątek: rysowanie ścieżki.
13. **Jednostki** to jedno ustawienie serwera (mm/cale). Wszystkie ekrany i
    urządzenia pokazują to samo.
14. **Kamerę 3D rusza tylko przycisk widoku.**
15. **Chevron mówi, co zrobi stuknięcie na tym urządzeniu.**
    - **⌄** (`SettingSummary opens="sheet"`): coś otworzy się nad ekranem.
    - **›** (`opens="view"`): następny widok zajmie to samo miejsce.
    - **Bez chevronu, wybrany** (`selected`): wiersz wybiera element w układzie
      master-detail (lista grup na PC).
16. **„Gotowe” zamyka arkusz lub dialog; „Wróć” cofa o poziom w tym samym
    miejscu** (grupa na tablecie). Żadne z nich niczego nie zatwierdza. Nie
    zamieniać jednego na drugie globalnie.
17. **Odpowiedzi potwierdzenia stoją w stopce arkusza, poza przewijaniem**
    (`Sheet footer`) — długa lista nad nimi nie wypycha przycisku.
18. **Wspólne komponenty, zero stylów ręcznych.**
    - Dwa ekrany rozwiązujące ten sam problem na dwa sposoby to defekt.
    - Makieta daje **układ**. Przyciski zostają panelowe.
    - Gdy czegoś brakuje, rozszerza się komponent o props, zamiast robić
      podobny.

## 5. Materiał dla Claude Design

- Komponenty z `window.CncPanel` są prawdziwe (27 sztuk, z przykładami na
  telefon/tablet/PC).
- **Widżety ekranów** (pad jogu, scena 3D, lista plików, JobWidget,
  ControlWidget, ToolWidget, filtry dziennika) są związane z maszyną i nie są
  w bundlu.
  - W wariantach reorganizacji można je rysować jako bloki o proporcjach ze
    zrzutów.
  - Albo złożyć z dostępnych komponentów: `DroStack`/`DroStrip`, `Card`,
    `Button`, `Meter`, `StatTile`, `SegmentedChoice`, `Stepper`.
- Wariant ekranu warto pokazać na wszystkich trzech urządzeniach
  (`DeviceFrame`) i zaznaczyć, co przechodzi do arkusza na telefonie.

## 6. Obserwacje do analizy (stan obecny)

Niezweryfikowane z Mateuszem. To punkty wyjścia, nie decyzje.

**Wykorzystanie miejsca**
- **PC nie ma własnych układów** poza Plikami i Sterownikiem (trzy kolumny).
  - Zerowanie na 1920 px to trzy wiersze i pusty środek.
  - Pulpit rozciąga karty.
- **Pliki na PC:** bez wybranego pliku środkowa karta i edytor są puste
  (~2/3 ekranu).
- **Telefon, Ścieżka:** nazwa programu, wymiary i układ są tylko w StatusBarze,
  którego na telefonie nie ma.

**Powtórzenia i nawigacja**
- **Te same akcje w kilku miejscach:**
  - Zeruj Z / Zeruj XY są na Pulpicie (Wysokość Z) i na Zerowaniu.
  - Wstrzymaj/Wznów są w Komendach i w przyciskach zadania.
  - Skróty Jog/Pliki na Pulpicie dublują nawigację; skrót Pliki jest
    wyszarzony, choć ekran jest gotowy (prawdopodobnie przeoczenie).
- **Telefon: 5 zakładek + siatka.** Ścieżka i Ustawienia (w tym Połączenie) są
  o dwa gesty dalej. Do rozważenia, czy Połączenie powinno być bliżej.

**Niespójności komponentów**
- **Dwa style zakładek:** rail (wielkie litery), SegmentedChoice w
  Ustawieniach (zwykłe litery). `GroupTabs` usunięty (handoff Sterownika).
- **Wielkość liter:** przyciski WIELKIMI (ZERUJ Z, WCZYTAJ), segmenty zwykłymi
  (Norm./Odwr., Opisowy, 15 min).
- **Szary wypełniony przycisk** znaczy raz „neutralna akcja” (Komendy, Pauza),
  raz wygląda jak nieaktywny. Nie widać różnicy między dostępnym a
  zablokowanym Odblokuj/Wznów.
- **Trzy odczyty pozycji:**
  - `DroStack` (Pulpit, Zerowanie).
  - `DroStrip` (Jog).
  - Wiersze osi X Y Z w Sterowniku.
  - Etykieta karty to raz „Pozycja robocza”, raz „Pozycja”, raz „Zerowanie”.
- **Dwa sposoby ustawiania liczby:**
  - `Stepper` « ‹ 1500 › » (Jog).
  - `TextField` (Sterownik).
- **Ustawienia jako arkusze a ustawienia w miejscu:**
  - Połączenie: `SettingSummary` → arkusz.
  - Preferencje: `SegmentedChoice` w wierszu.
  - Jog na telefonie: arkusze.
- **Pomoc `?`:** tylko Jog i Zerowanie. `Card onHelp` istnieje, ale nikt go
  nie używa.
- **Karta z tytułem a bez:** Ustawienia nie mają etykiety karty, reszta ekranów
  ma (DZIENNIK, PLIKI…).
- **Brakujące stany komponentów:**
  - TextField nie ma stylu „disabled”.
  - ~~Tokeny Full HD tylko w ramce recenzji~~ — od 2026-09-28 powłoka sama
    włącza `data-target="fullhd"` od 1800 px (decyzja D).
- **Wcześniejsza lista spójności:** projekt Claude Design 7629d30f…,
  `Ustawienia - spójność.dc.html` (12 punktów, wdrożone w wariancie 2b).

## 7. Otwarte pytania

1. Czy PC ma dostać własne układy (np. Pulpit z podglądem ścieżki, Zerowanie
   obok Jogu), czy zostaje „tablet z miejscem”?
2. Czy Zerowanie i Jog to jeden ekran („ustaw maszynę”)? Na tablecie oba
   mieszczą się obok siebie.
3. Które 5 pozycji na dolnym pasku telefonu? Czy Połączenie/stan ma być o jeden
   gest?
4. Jeden styl zakładek dla całego panelu — który?
5. Wielkie litery na przyciskach: zostają, czy wszędzie zwykłe?
6. Które akcje zostają na Pulpicie, skoro mają własne ekrany (zerowanie,
   komendy)?
7. Stany brzegowe (brak połączenia, alarm, program w toku) nie mają makiet dla
   każdego ekranu. Które pokazać w wariantach?
