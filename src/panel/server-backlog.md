# Czego brakuje po stronie serwera

Rzeczy, które panel chciałby zrobić, a `src/server` ich nie udostępnia. Wpisy
powstają w trakcie budowania panelu, **nie są zweryfikowane** i nie są prośbą o
zmianę serwera — są listą do przejrzenia, gdy zdecydujemy, co z nimi zrobić.

Każdy wpis mówi: czego panel potrzebował, co serwer ma dzisiaj, i jaki jest
skutek dla interfejsu. Bez tego ostatniego wpis jest tylko życzeniem.

---

## Bazowanie pojedynczej osi

**Panel chciał:** osobnych przycisków „bazuj XY" i „bazuj Z" — tak je rysuje
mockup, i tak wygląda praca: Z bazuje się częściej i osobno.

**Serwer ma:** jedną komendę `homing`, bez argumentu osi. Każdy sterownik
zamienia ją na ruch całej maszyny:

| sterownik | komenda |
| --- | --- |
| Grbl | `$H` |
| Smoothie | `$H` |
| Marlin | `G28` |
| TinyG | `G28.2 X0 Y0 Z0` |

**Skutek:** dwa przyciski zastąpione jednym „BAZUJ", który bazuje wszystko.
Panel nie udaje możliwości, której nie ma.

**Do sprawdzenia, gdyby wracać:** Grbl 1.1 zna `$HX`, `$HY`, `$HZ`, ale tylko
gdy firmware skompilowano z `HOMING_SINGLE_AXIS_COMMANDS` — więc nawet po
stronie serwera nie dałoby się tego obiecać bez odpytania maszyny. Marlin ma
`G28 X`, `G28 Z`. Smoothie i TinyG wymagałyby sprawdzenia.

---

## Dziennik zdarzeń

**Panel chciałby:** pokazywać w stopce ostatnią rzecz, która się wydarzyła, ze
znacznikiem czasu — `ok · zero robocze G54 ustawione 13:58`. Tak rysuje to
mockup i to jest realnie przydatne przy maszynie: „czy to zero się zapisało",
„czy ta komenda przeszła".

**Serwer ma:** zdarzenia na bieżąco (`controller:state`, `serialport:read`,
`sender:status`), ale **nic ich nie zapamiętuje**. Klient, który dołączy
później albo przeładuje stronę, nie ma skąd wziąć historii.

**Skutek:** stopka pokazuje zadanie, bo to jedyne, co da się odtworzyć ze
stanu. Dziennik jest niezbudowany.

---

## Pozycja parkowania

**Panel chciał:** przycisku „Park" — dojazd do znanego miejsca, gdzie wymienia
się narzędzie albo ogląda materiał.

**Serwer ma:** nic takiego. Nie ma pojęcia „pozycja parkowania" ani w API, ani
w konfiguracji maszyny.

**Skutek:** przycisk narysowany i wyłączony. Do zdecydowania jest nie tylko
implementacja, ale sama definicja — czy park to stała pozycja maszynowa, czy
coś ustawianego per maszyna, i czy dojazd ma być przez `G53`.

---

## ~~Układy współrzędnych G54–G59 nigdy nie są odpytywane~~ — POŁOWA ZROBIONA 2026-09-23

**`$#` idzie teraz obok `$$` w `GrblController.initController`.** Kanałem
serwera (`write` pisze prosto na `connection`), więc przechodzi w alarmie —
zmierzone na Grblu 1.1h: sześć układów, `G28`, `G30`, `G92`, `TLO` i `PRB`
wróciły w pięć milisekund przy maszynie w alarmie. `addConnection` podaje
zapamiętane `controller:settings` każdemu nowemu klientowi, więc `parameters`
jest prawdziwe u wszystkich — także w starej aplikacji, która nie pytała
wcale. `src/panel/machine/workOffsets.js` został skasowany razem z tą zmianą.

**Co zostaje: odświeżenie po `G10`/`G92`.** Te komendy zmieniają te wartości,
a serwer dalej pyta tylko przy otwarciu portu. Naiwne wysłanie `$#` zaraz po
linii feedera **psuje kolejkę**: `ok` po `$#` jest nieodróżnialne od `ok` po
linii, która przesunięcie zmieniła, więc maska skonsumowałaby potwierdzenie
należące do feedera i feeder by stanął. Poprawnie trzeba zapytać dopiero, gdy
nic innego nie jest w locie — i nigdy w trakcie programu, bo sender liczy
znaki i linia, której nie wysłał, przepełni bufor Grbla. Serwer omija `$G` w
czasie programu dokładnie z tego powodu i to jest wzór do naśladowania.

Poniżej zostaje oryginalny opis, bo tłumaczy, skąd to się wzięło.

## Układy współrzędnych G54–G59 nigdy nie są odpytywane

**Panel chciał:** narysować na ekranie Ścieżka, gdzie w maszynie leżą kolejne
zera robocze — „czy moje G55 jest tam, gdzie je zostawiłem". Mateusz wymienił
to wprost jako jedną z warstw podglądu (2026-09-21).

**Serwer ma:** kompletny parser i żadnego pytania.
`GrblLineParserResultParameters` rozpoznaje linie `[G54:0.000,0.000,0.000]`,
`GrblRunner` składa je w `settings.parameters`, a `GrblController` odsyła to
klientom w `controller:settings`. Tylko że **`$#` nie pada nigdzie w `src/server`**.
Sterownik odpytuje `$G` z dławieniem (`queryParserState`) i czyta `$$` przy
otwarciu portu, ale `$#` nie jest wysyłane ani razu. `parameters` jest więc
pustym obiektem u każdego klienta, dopóki ktoś nie wpisze `$#` ręcznie w
konsolę.

**Skutek:** panel pyta sam, przy dopięciu do portu —
`src/panel/machine/workOffsets.js`. To działa, ale jest w złym miejscu: każdy
klient pyta osobno, a stara aplikacja nie pyta wcale i ma tę samą lukę.

**I nie działa wcale, gdy maszyna jest w alarmie — zmierzone 2026-09-23.**
Pytanie panelu idzie przez feeder, a każdy z czterech sterowników zaczyna
swoje `feeder.on('data')` od `if (this.runner.isAlarm()) { this.feeder.reset();
return; }`. Linia ginie na serwerze, przed kablem, ze wpisem `Stopped sending
G-code commands in Alarm mode` w logu i niczym na łączu. Maszyna z włączonym
bazowaniem siedzi w alarmie od włączenia zasilania aż do zbazowania — czyli
dokładnie wtedy, gdy panel się otwiera, żeby na nią popatrzeć. Komentarz w
`workOffsets.js` twierdził coś odwrotnego i został poprawiony.

**To samo dotyczy każdej komendy `gcode` z panelu, nie tylko `$#`.** Ekran
Zerowania wyłącza swoje przyciski w alarmie i mówi dlaczego
(`readings.canSendGcode`) — bo naciśnięcie kładło `G10 L20 P1 Z0` na gnieździe
i nie zmieniało żadnego przesunięcia, bez słowa na ekranie.

**Do propozycji dochodzi więc:** `$#` musi iść kanałem serwera (obok `$$`),
a nie feederem, bo tylko wtedy przejdzie w alarmie. I warto zapytać ponownie
po wyjściu z alarmu.

**Propozycja:** `$#` obok `$$` przy otwarciu portu, i ponownie po `G10`/`G92`,
bo to są komendy, które te wartości zmieniają. Wtedy `parameters` jest
prawdziwe u wszystkich i panel może skasować swoje pytanie.

---

## ~~Serwer mówi tylko po HTTP~~ — ZROBIONE 2026-09-23 (PR #70)

`src/server/index.js` podnosi `https.createServer`, gdy dostanie
`--tls-key` i `--tls-cert`; `--tls-ca` wystawia urząd do pobrania pod
`/panel/cnc-ca.crt` i opisuje go pod `/panel/cnc-ca.json`. Certyfikaty robi
`yarn certs` — bez argumentów, dla maszyny, na której stoi — a urząd jest
name-constrained, więc poświadcza wyłącznie `.lan`, `localhost` i adresy
prywatne.

Zostaje wpisane, bo to jedyna pozycja z tej listy, która była blokadą dla
całej reszty pendanta, i łatwiej ją tu przeczytać niż odtworzyć z historii.

## ~~Magazyn sesji na Windows nie działa i rośnie bez końca~~ — ZROBIONE 2026-09-24

**Naprawione trzema opcjami w `src/server/app.js`:** `resave: false`,
`saveUninitialized: false` i `retries: 0` w `FileStore`. Zmierzone na przebiegu
smoke: **83 pliki sesji przed, 0 po**, zero `EPERM` i zero `will retry`.

Dlaczego to działa: **nic w tym serwerze nie zapisuje niczego do sesji.**
`req.session` jest czytane w jednym miejscu w całym drzewie — token `:id`
morgana — a morgan nie jest w ogóle montowany, dopóki `verbosity > 0`, a
domyślnie jest 0. Więc z `resave: true` i `saveUninitialized: true` powstawał
plik na **każde żądanie** dla sesji, do której nikt nic nie wkładał, i był
nadpisywany przy każdym następnym.

`retries: 0` dotyczy drugiej połowy hałasu, której poprzedni opis nie nazwał:
katalog jest **czyszczony przy starcie** (`rimraf.sync` w tym samym bloku), a
przeglądarki trzymają swoje ciasteczko dalej — więc pierwsze żądanie z otwartej
karty pyta o sesję, którą serwer właśnie świadomie skasował. Domyślnie store
ponawia to pięć razy z narastającą przerwą: **piętnaście linii `will retry` na
jeden identyfikator sesji**, zmierzone 2026-09-24. Brakujący plik nie jest
usterką przejściową.

**Jedna rzecz z poprzedniego opisu była nieprawdą:** „najstarsze sprzed wielu
dni. Nic ich nie kasuje". Kasuje je `rimraf.sync(path)` przy każdym starcie
serwera. Zmierzone: najstarszy plik nosił znacznik czasu restartu z tej sesji,
a nie wcześniejszy. 424 pliki z popołudnia 2026-09-23 pochodziły więc z
**jednego przebiegu**, nie z wielu dni — co jest gorszą wiadomością, nie lepszą.

**Co zostaje jako decyzja, nie jako usterka.** Ten magazyn nie przechowuje już
nic i nigdy nie przechowywał nic potrzebnego. Pełne usunięcie
`express-session`, `session-file-store` i `rimraf` z `app.js` jest o trzy
importy i jeden blok dalej, i zabiera też token `:id` z formatu morgana (bo bez
sesji nie ma czego w nim pokazać). **Nie zrobione świadomie:** to zmiana w
backendzie poza Grblem i CNCEngine, a zasada mówi, że backendu nie ruszamy bez
powodu — a usterka, która to uzasadniała, jest już naprawiona. Do rozstrzygnięcia
przez Mateusza; jeśli tak, `:id` zamienia się albo w prawdziwy identyfikator
żądania, albo znika z formatu.

**Nie zweryfikowane, dalej:** czy ma to związek z pojedynczym `400` na
`/socket.io/?…&transport=polling&sid=…`, który wypada mniej więcej w co drugim
pełnym przebiegu smoke (opisany w `e2e/fixtures.js`). Sprawdzone wcześniej:
dziesięć kolejnych `POST /api/signin` nie dołożyło ani jednego `EPERM`. Teraz da
się to rozstrzygnąć taniej niż wtedy — jeśli `400` wypadnie przy zerze plików
sesji, te dwie rzeczy nie mają ze sobą nic wspólnego.

Poniżej zostaje oryginalny opis, bo trzyma pomiary z dnia, w którym to wyszło.

## Magazyn sesji na Windows nie działa i rośnie bez końca

**Panel chciał:** tylko się zalogować. `POST /api/signin` bez ciała, raz na
załadowanie strony — `src/panel/machine/session.js` niczego nie cache'uje.

**Serwer ma:** magazyn sesji w plikach, w `~/.cncjs-sessions`, zapisywany
przez `rename` z pliku tymczasowego. Na Windows ten `rename` **pada**:

```
Error: EPERM: operation not permitted, rename
  'C:\Users\mateu\.cncjs-sessions\7qve….json.986713542'
  -> 'C:\Users\mateu\.cncjs-sessions\7qve….json'
```

Zmierzone 2026-09-23: **529 takich błędów** w logu jednego popołudnia i
**424 pliki sesji** (680 KB), najstarsze sprzed wielu dni. Nic ich nie kasuje.

**Skutek:** nic widocznego — i to jest najgorsza część. Logowanie zwraca token,
panel działa, a log serwera zapełnia się błędami, w których ginie wszystko
inne. Przy szukaniu przyczyny czegokolwiek innego to jest pierwsza rzecz,
która wpada w oko i ostatnia, która ma znaczenie.

**Nie zweryfikowane:** czy to ma związek z pojedynczym `400` na
`/socket.io/?…&transport=polling&sid=…`, który wypada mniej więcej w co drugim
pełnym przebiegu smoke (opisany w `e2e/fixtures.js`). Sprawdzone: dziesięć
kolejnych `POST /api/signin` **nie** dołożyło ani jednego `EPERM`, więc te dwie
rzeczy najpewniej nie są tą samą rzeczą. Zostawione jako trop, nie jako
rozpoznanie.

**Do rozważenia:** magazyn w pamięci wystarcza instalacji, która ma jednego
operatora i jedną maszynę, a pliki sesji nie przeżywają restartu serwera w
żaden użyteczny sposób. Jeśli mają zostać — kasowanie wygasłych i zapis bez
`rename`.

---

## Geometria maszyny — serwer nie ma pojęcia „maszyna"

**Panel chciałby:** poglądowy model maszyny w scenie ekranu Ścieżka — stół,
brama, wrzeciono — poruszający się razem z pozycją. Rozpoznanie zlecone przez
Mateusza (2026-09-21, punkt 5).

**Wynik rozpoznania — model schematyczny nie potrzebuje od serwera niczego.**
Trzy prostopadłościany napędzane `mpos` z `controller:state`, które panel już
dostaje i już rysuje z nich znacznik narzędzia. Żadnego nowego zdarzenia,
żadnego nowego API.

**Ale płynność jest ograniczona przez serwer, nie przez scenę.** Zmierzone na
COM3 podczas `$J=G91 X-30 F600`: pozycja zmienia się co **254 ms w medianie**
(min 250, średnia 332, 19 zmian). To jest `queryTimer` w `GrblController.js`,
`setInterval(…, 250)` — czyli około 4 Hz, niezależnie od tego, ile klatek
rysuje przeglądarka. Przy 600 mm/min to skok 2,5 mm na aktualizację, a przy
posuwie szybkim odpowiednio więcej. Model animowany wprost z tych raportów
będzie skakał.

Interpolacja między raportami wygładzi obraz, ale kosztem opóźnienia o pełen
okres — a pozycja narzędzia to odczyt, nie ozdoba. To jest decyzja do podjęcia
świadomie, nie domyślnie.

**Czego naprawdę brakuje:** serwer nie ma pojęcia „maszyna" poza tym, co
powie firmware. `$130`–`$132` dają pudło zakresu ruchu i nic więcej — ani
wymiarów stołu, ani wysokości bramy, ani wysięgu wrzeciona. Prawdziwy model
to **konfiguracja per maszyna**, a nie grafika, i nie ma dziś miejsca, gdzie
ją trzymać.

**Skutek:** model nie jest zbudowany. Zbudowany jest znacznik narzędzia, który
odpowiada na to samo pytanie („gdzie jest narzędzie") bez zgadywania geometrii,
której nikt nam nie podał.

---

## Częstotliwość odpytywania o stan — wpisana na sztywno

**Panel chciał:** stanu maszyny na tyle świeżego, żeby dało się na nim
**działać**, a nie tylko go wyświetlać. Jog zmienia kierunek przez anulowanie
i ponowny wyjazd, a Grbl odrzuca nowy jog, póki hamuje — więc „czy już
stanęła" musi być aktualne. Przy raportach co 250 ms bywało ćwierć sekundy
nieaktualne, co wystarczało, żeby przełączanie klawiszy gubiło ruch.

**Serwer ma:** jedną liczbę w `GrblController.js` — `setInterval(…)` pętli
zapytań. To ta sama stała, którą mierzy wpis „Model maszyny" wyżej (254 ms
mediany). **Zmieniona 2026-09-22 z 250 na 100 ms, w kodzie**, bo nie ma jak
jej podać ani w `.cncrc`, ani przez API, ani przy otwieraniu portu.

**Skutek:** działa — zmierzone 4,3 → 8,9 aktualizacji pozycji na sekundę — ale
każdy, kto chce inaczej, musi edytować źródło i przebudować serwer. Wartość
jest kompromisem: szybsza reakcja kosztem ruchu na łączu (rachunkiem ~4,3%
zamiast ~1,7% przy 115200 8N1). `?` jest komendą czasu rzeczywistego i nie
wchodzi do bufora planera, więc nie opóźnia ruchu — ale przy gęstym programie
na prawdziwej maszynie dzieli kabel ze strumieniem G-code i może wymagać
cofnięcia do 150–200 ms.

**Do zrobienia:** wystawić jako ustawienie. Najbliżej sensu byłoby obok
`baudrate` w opcjach otwarcia portu (bo to właściwość połączenia z konkretną
maszyną) albo w `.cncrc` per sterownik. Warto przy okazji objąć tym pozostałe
okresy, dziś też zahardkodowane: `$G` co 500 ms i kontrolne `?` co 2000 ms.

**Uwaga dla każdego, kto to ruszy:** serwer w trybie dev ładuje
`output/cncjs/server-cli`, nie źródła — zmiana w `src/server` nie działa,
dopóki nie przejdzie przez babel do `output/`.

---

## ~~Jog ciągły — serwer daje tylko prymitywy~~ — ZROBIONE 2026-09-22 (PR z `47cff1aa`)

**Pętla jest na serwerze.** `jogStart(dir, feedrate)` / `jogStop()` w
`GrblController`, arytmetyka odcinka w `src/server/controllers/Grbl/jog.js`,
skręt przez to samo `jogStart` jeszcze raz. Panel wysyła kierunek i posuw, i nie
odmierza już milisekund — `machine/jog-stream.js` i `ui/useJogStream.jsx`, o
których mówi opis niżej, nie istnieją.

**Wpis został napisany w tym samym commicie, który go zamknął**, i przeleżał tak
dwa dni — znaleziony przy przeglądzie z 2026-09-24. Zostaje, przekreślony, bo
tłumaczy, skąd wzięła się dzisiejsza architektura; nie zostaje jako luka, bo nią
nie jest.

Poniżej zostaje oryginalny opis.

## Jog ciągły — serwer daje tylko prymitywy

**Panel chciał:** trzymanego klawisza, który jedzie, daje się skręcić w locie i
zatrzymuje się natychmiast po puszczeniu.

**Serwer ma:** dwie rzeczy i nic poza nimi — `gcode` (dowolna linia, więc i
`$J=`) oraz `jogCancel` (`0x85`). Nie ma pojęcia „jog ciągły", nie prowadzi
strumienia, nie śledzi kolejki planera. Stara aplikacja też tego nie ma —
`$J=` nie pada w `src/app` ani razu.

**Skutek:** cała logika jest w przeglądarce (`machine/jog-stream.js`,
`ui/useJogStream.jsx`). Ciągły ruch to strumień krótkich `$J=` wysyłanych co
200 ms, każdy na 220 ms jazdy. Skręt polega na tym, że **następny** odcinek
idzie gdzie indziej; puszczenie klawisza to `jogCancel`.

**Dlaczego nie jeden długi `$J=`:** bo długiego ruchu nie da się skręcić
inaczej niż anulując go, a anulowanie jest wyścigiem. Zmierzone: dołożenie
drugiego klawisza dawało osiem odrzuconych prób startu pod rząd, a puszczenie
klawisza wysyłało `jogCancel`, który wyprzedzał właśnie zaakceptowany jog —
maszyna jechała dalej bez trzymania czegokolwiek.

**Czego brakuje, żeby zrobić to porządnie:** serwer siedzi przy porcie i widzi
`Bf:` w raporcie stanu, czyli ile miejsca zostało w planerze. Strumień
prowadzony tam mógłby wysyłać odcinek wtedy, gdy jest miejsce, zamiast
zgadywać rytm zegarem w przeglądarce — a zegar w przeglądarce jest czuły na
obciążenie karty i na to, że stosunek długości odcinka do interwału wysyłki
musi być dobrany ręcznie (przy 260 ms jazdy co 120 ms kolejka rosła i skos w
ogóle nie dochodził). Serwer zna też `$120`–`$122`, więc wiedziałby, ile
naprawdę trwa hamowanie.

**Do rozważenia:** `jogStart(dir, feedrate)` / `jogStop()` po stronie serwera,
z odcinkami dobieranymi do wolnego miejsca w planerze. Wtedy panel mówiłby
„jedź tam", a nie odmierzał milisekundy.

---

---

## Przegląd 2026-09-24: co panel wysyła, a co powinien serwer

Zlecone przez Mateusza po znalezisku z `$#` (2026-09-23): przejść wszystko, co
panel wysyła, i przy każdym rozstrzygnąć — polecenie operatora (klient) czy
odczyt, który serwer powinien mieć sam i rozgłaszać (serwer). Test: **czy druga
aplikacja podpięta do tego samego portu dostaje to za darmo?**

Cała lista jest krótka i domknięta. To wszystko, co panel wysyła w ogóle:

| skąd | co idzie | rodzaj | werdykt |
| --- | --- | --- | --- |
| `commands.js` | `feedhold`, po 500 ms `reset` | polecenie | klient — ale **sekwencja należy do serwera**, patrz wpis niżej |
| `jog.js` | `gcode` `$J=G91 …` (jeden krok) | polecenie | klient |
| `jog.js` | `jogStart(dir, feedrate)`, `jogCancel` | polecenie | klient (pętla już na serwerze) |
| `goto.js` | `gcode` `$J=G53 …` ×2 (odjazd Z + dojazd) | polecenie | klient |
| `goto.js` | `jogCancel` | polecenie | klient |
| `homing.js` | `homing` | polecenie | klient |
| `zero.js` | `gcode` `G10 L20 P<n> …` | polecenie | klient |
| `latency.js` | zdarzenie `latency` | pomiar **własnego łącza** | klient — nikt inny go nie zmierzy |
| `ports.js` | `list`, `open`, `close` | pytanie o komputer / polecenie | serwer już to ma |
| `snapshot.js` | `GET /api/controllers` | odczyt | serwer już to ma |
| `session.js` | `POST /api/signin` | odczyt | serwer już to ma |

**Główna odpowiedź: nic więcej tak nie stoi.** `$#` z `workOffsets.js` było
jedynym miejscem, w którym panel wysyłał G-code **tylko po to, żeby przeczytać
odpowiedź** — i zostało skasowane razem z PR #77. Każda pozostała linia `gcode`
zmienia stan maszyny, czyli jest tym, czym wygląda: poleceniem operatora.
Żadna z nich nie jest podejrzana z definicji „w alarmie nie przejdzie", bo
żadna nie ma prawa przejść w alarmie — operator ma wtedy dostać wygaszony
przycisk, co `readings.canSendGcode` robi.

**Wzór, jak to wygląda zrobione dobrze:** `controller:timing`. Serwer mierzy u
siebie (długość kolejki i czas odpowiedzi firmware'u — nikt inny tego nie
widzi), rozgłasza do wszystkich, a panel dokłada to, co należy do niego
(posuw, `$120`–`$122`, odległość do serwera). Podział jest po tym, **kto ma
dane**, nie po tym, komu wygodniej policzyć.

Przy okazji przeglądu wyszły trzy rzeczy, każda w osobnym wpisie niżej:
awaryjny stop, podwójne liczenie zakresu ruchu i sterownik, który nie
odpowiada, a trzyma port.

**Jedna rzecz nie jest luką serwera i została naprawiona w kodzie:** ekran
Połączenia odświeżał listę portów na `serialport:open` / `serialport:close`, a
te zdarzenia idą **tylko do gniazd podpiętych do tego sterownika**
(`GrblController.emit` iteruje `this.sockets`). Do wszystkich idzie
`serialport:change` — dokładnie ta sama pomyłka, którą `useMachine` już raz
naprawił.

Skutek był węższy, niż się z tego wydaje, i warto to zapisać dokładnie. Dla
portu, do którego panel **sam się dopina**, `held` w `ConnectScreen` nadpisuje
`inuse` z listy, więc wiersz i przycisk były prawdziwe nawet przy nieświeżej
liście. Nieprawdziwa zostawała sama lista — czyli różnica **zajęty kontra
wolny** dla każdego portu, którego ten panel nie trzyma. To jest cała treść
rozróżnienia `PORT_BUSY`/`PORT_FREE`, więc zostało naprawione, ale nie jest to
usterka, którą operator zobaczyłby na tym stole: **jeden port, jedna maszyna**.

**I nie ma na to testu.** Żeby przypadek pokazał różnicę, potrzebny jest drugi
port szeregowy: przy jednym `held` maskuje nieświeżą listę, a tier smoke nie ma
portu w ogóle (preflight odmawia przebiegu, jeśli jakiś jest otwarty). Zapisane
jako brak pokrycia, nie zamiecione.

---

## ~~Awaryjny stop: 500 ms żyje w zegarze przeglądarki~~ — ZMIERZONE I W POŁOWIE NAPRAWIONE 2026-09-24

**Pomiar, o który ten wpis prosił, został zrobiony — i zmienił rozpoznanie.**
Zlecony przez Mateusza („zmierz co Grbl robi z `!` w jogu"). Na COM3, Grbl 1.1h,
posuw 600 mm/min, status odpytywany co 20 ms.

### Co Grbl robi z `!` w jogu

**`!` w jogu jest anulowaniem jogu, nie wstrzymaniem.** Maszyna hamuje do zera w
**63 ms i 0,8 mm**, reszta ruchu jest odrzucana, a stan ląduje w **`Idle`** —
nigdy w `Hold`. `~` po tym nie wznawia niczego (sprawdzone: zostaje `Idle`).

Skutek dla `gcode:stop { force: true }`: **żadna z jego dwóch bramek nie ma jak
się otworzyć na maszynie w jogu.** `activeState` to `Jog`, nie `Run`, więc `!`
nie leci; pół sekundy później jest `Idle`, nie `Hold`, więc `\x18` też nie. To
nie jest usterka tamtej komendy — ona jest o **zatrzymywaniu programu**, gdzie
stany naprawdę idą `Run` → `Hold`. Wczorajszy zapis nazwał ją „tą samą sekwencją
po właściwej stronie gniazda"; jest to sekwencja o czymś innym.

### Czego ten wpis nie przewidział, a co było groźne

**Pętla jogu ciągłego to trzecia kolejka tego sterownika, a ścieżki stopu znały
tylko dwie.** `reset` robił `workflow.stop()` i `feeder.reset()` — i nic o
`jogging`. Zmierzony przebieg przy trzymanym klawiszu, dokładnie to, co wysyła
`commands.js`:

| | przed | po |
| --- | --- | --- |
| droga od naciśnięcia do zatrzymania | **4,244 mm** | **0,988 mm** |
| `$J=` wysłane po `reset` | **2** | **0** |
| `$J=` wysłane po `$X` | **163** | **0** |
| ruch po `$X`, z niczym trzymanym | **23,536 mm** | **0,000 mm** |
| stan końcowy | `Alarm`, pozycja unieważniona | `Idle`, pozycja znana |

Mechanizm, bo jest pouczający: `!` zatrzymywało maszynę, ale pętla wysyłała
następny odcinek 150 ms później i maszyna **znowu jechała** — stąd 3,5 mm
przejechane już po tym, jak raz stanęła. Potem `\x18` dawał
`ALARM:3 (Abort during cycle)`, pętla zostawała z dwoma odcinkami w locie i
**żadnym potwierdzeniem**, więc stawała na `MAX_IN_FLIGHT` — uzbrojona.
A następnie operator robił jedyną rzecz, jaką może zrobić z alarmem, `$X`, i
**`ok` z tego odblokowania było potwierdzeniem, na które pętla czekała.**
Ruszała z miejsca: 163 odcinki, 23,5 mm, nic trzymanego, i zatrzymało to tylko
`jogCancel` wysłane z zewnątrz.

**Naprawione (PR #97), trzy rzeczy:**
- `abandonJog()` — porzuca kierunek **i zeruje licznik odcinków w locie**, bez
  wysyłania czegokolwiek, bo nic by nie doszło.
- `reset` woła to przed bajtem. Bramka alarmowa niżej złapałaby to też, ale
  dopiero gdy `ALARM:3` wróci — zmierzone 32 ms po `\x18`, a w tym okienku
  wyszły dwa kolejne odcinki.
- zegar jogu porzuca jog, gdy sterownik jest w alarmie, i **ten warunek stoi
  przed sprawdzeniem kolejki** — bo alarm przychodzi właśnie wtedy, gdy kolejka
  jest pełna i nic jej nie zwalnia. Przestawienie tych dwóch warunków wywala
  osobny przypadek testowy.
- `feedhold` **kończy** trzymany jog zamiast go wstrzymywać, bo Grbl nie umie
  wstrzymać jogu. Idzie przez `stopJog()`, czyli `0x85` po potwierdzeniach —
  ścieżka, która sama zmierzyła się najlepiej: 0,82 mm i `Idle`.

Pomiary porównawcze czterech przepisów na stop, przy 600 mm/min:

| przepis | droga | stan końcowy |
| --- | --- | --- |
| `jogCancel` (`0x85`) przez serwer | 0,82 mm | `Idle`, pozycja znana |
| `!` powtarzane 10× przez sekundę | 1,18 mm | `Hold:0` (po czterech walkach) |
| `\x18` samo | ~0,3 mm | `Alarm`, planer porzucony |
| `!` + 500 ms + `\x18` (panel) | **4,24 mm → 0,99 mm** | `Alarm` → `Idle` |

### Co zostaje jako decyzja

**Dla jogu problem zegara w przeglądarce w dużej mierze zniknął**: po poprawce
`feedhold` zostawia maszynę zatrzymaną w `Idle`, więc karta, która umrze przed
`reset`, zostawia maszynę **stojącą**, a nie „we wstrzymaniu wyglądającym na
zatrzymanie".

**Dla programu zostaje jak było.** W trakcie programu `!` daje prawdziwy `Hold`,
a `~` go wznawia — więc druga połowa sekwencji nadal siedzi w `setTimeout` karty
przeglądarki, a karta na telefonie może ten zegar zdławić do sekund. Tu wciąż
warto rozważyć `estop` po stronie serwera, z odczekaniem policzonym z
`$120`–`$122` zamiast stałej 500 ms. Wpis zostaje otwarty **tylko w tym
zakresie**.

---

## Zakres ruchu liczony dwa razy, po obu stronach gniazda

**Panel chciał:** nie wysyłać kroku jogu, który wyjdzie za koniec osi. Z
`$20=1` firmware **odrzuca** taką linię, a nie przycina jej, więc przycisk przy
krawędzi stołu nie robił nic i nic o tym nie mówił.

**Serwer ma to samo u siebie** — i to jest cała treść wpisu.
`roomFor` w `src/server/controllers/Grbl/jog.js` czyta `$130`–`$132`, dekoduje
maskę `$23`, bierze `mpos` ze statusu i skraca odcinek do tego, co zostało.
Panel ma drugą kopię tej arytmetyki: `machineEnvelope` w `envelope.js` plus
`jogRoom` w `jog.js`.

**Skutek:** trzymany klawisz jest ograniczany przez serwer, a pojedyncze
naciśnięcie przez przeglądarkę. Sprawdzone 2026-09-24 — **obie kopie liczą
dzisiaj to samo**: ten sam bit `$23`, ten sam przedział `[-$13x, 0]`, i panel
podaje do `jogRoom` `machinePosition`, nie `position`, więc nie ma przesunięcia
o zero robocze. To nie jest usterka, to dwa miejsca na jedną zmianę — a zmiana
przyjdzie, bo `$23` to nie jedyny sposób, w jaki maszyna może leżeć inaczej
(`$132` na maszynie bez bazowania Z, `G53` przy `$20=0`).

**Propozycja:** skoro serwer i tak to liczy, niech powie. Obwiednia w
`controller:settings` albo obok niej — jedno pole z `min`/`max` na oś —
zamyka trzy rzeczy naraz: panel przestaje dekodować `$23`, stara aplikacja
dostaje obwiednię, której nie ma wcale, a scena ekranu Ścieżka rysuje to, czym
serwer ogranicza jog, a nie swoją własną interpretację tych samych rejestrów.

---

## Sterownik, który nie odpowiada, trzyma port dla wszystkich

**Zmierzone 2026-09-24, przy restarcie serwera.** W logu, sekunda po sekundzie:

```
22:59:40  socket.open("COM3", {"baudrate":9600,"controllerType":"Marlin"})
22:59:41  socket.open("COM3", {"baudrate":115200,"controllerType":"Grbl"})
22:59:41  warn  serial port "COM3" is already open with controllerType=Marlin,
                refusing controllerType=Grbl
```

Oba zgłoszenia przyszły z tego samego adresu (klient z WSL), w odstępie
sekundy. Wygrało pierwsze. Na COM3 wisi Grbl, więc sterownik Marlina **nigdy
nie stał się gotowy** — `/api/controllers` pokazywał `ready:false` godzinami, z
pustymi `settings` i zerową pozycją — i przez cały ten czas port był
niedostępny dla klienta, który zgłaszał się poprawnie.

**Serwer ma:** obronę z PR #70, która działa dokładnie tak, jak zaprojektowana:
rozbieżne `controllerType`/`baudrate` przy żywym porcie to odmowa, nie ciche
przestawienie. Problem jest w tym, **kogo ta obrona broni** — tego, kto był
pierwszy, także wtedy, gdy widać, że nie rozmawia z maszyną.

**Skutek:** panel pokazuje port jako zajęty i oferuje „Połącz", który dopina do
sterownika bez żadnych odczytów. Dla operatora to maszyna, która nie odpowiada,
bez śladu przyczyny na ekranie. Jedyne wyjście to zamknięcie portu z drugiej
strony albo restart serwera — po którym wyścig rozgrywa się od nowa.

**Do rozważenia, w kolejności kosztu:**
- `ready` w odpowiedzi `serialport:list` i w `/api/controllers`, obok `inuse`.
  Panel ma wtedy co powiedzieć („port zajęty, sterownik nie odpowiada") i to
  jest najtańsze z trzech.
- Zwolnienie portu przez sterownik, który po otwarciu nie dostał **ani jednej**
  linii w rozsądnym czasie. `lastDataReceivedTime` już istnieje i już jest
  używane do „the controller stopped responding" — brakuje tylko wniosku z
  przypadku, w którym nic nie przyszło nigdy.
- Odmowa w drugą stronę: sterownik z `ready:false` przegrywa z klientem,
  który prosi o inne ustawienia. Najbardziej ryzykowne, bo „nie odpowiada"
  bywa chwilowe.

**Uwaga o tym, jak to znaleźć u siebie:** nie po objawie na ekranie, tylko
`/api/controllers` — `ready:false` przy otwartym porcie to cała diagnoza, a
preflight pokazuje to w sekundę.
