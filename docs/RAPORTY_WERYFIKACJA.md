# Raporty PDF — wykonane zmiany i weryfikacja

Data: 19.09.2026. Aplikacja: 0.6.0. Gałąź: develop. Bez commitów, pushów, wdrożenia ani zmian produkcyjnych danych Firebase.

## Wprowadzone zmiany

Raport pomieszczenia zaczyna się od obciążenia chłodniczego w wybranym miesiącu. Wyjaśnia osobno chłodzenie powietrza i usuwanie wilgoci. Bilans ze znakami pozostaje dostępny w tabeli, a wykres udziałów opisuje wyłącznie dodatnie składniki. Maksimum kwiecień–wrzesień ma osobny opis.

Raport zbiorczy pokazuje wspólny szczyt i obciążenie każdego pomieszczenia dokładnie w tej godzinie. Indywidualne maksima sezonowe są opisane odrębnie. Usunięto sekcję doboru klimatyzatorów, modeli i jednostek. Numery P1–P10 łączą krótką legendę wykresu z tabelą pełnych nazw.

Oba raporty zachowują logo, niebiesko-szarą kolorystykę i wyróżnienie głównego wyniku. Korzystają ze wspólnego układu tabel, polskiego zapisu liczb, wyrównania wartości do prawej i wersji aplikacji z package.json. Nagłówki tabel powtarzają się na kolejnych stronach; zwykłe wiersze nie są dzielone między strony. Nazwy są zawijane, a nagłówki i stopki mają zarezerwowane miejsce.

Na pierwszej stronie obu raportów wyróżniono założenia pogody i zacienienia: silne nasłonecznienie przy całkowicie bezchmurnym niebie (Clear Sky), dane dla Warszawy i brak cienia od sąsiednich budynków, drzew oraz innych obiektów w otoczeniu. Osobne zdanie opisuje osłony okienne i daszki wpisane do projektu; treść zmienia się przy wyłączeniu osłon.

Usunięto z treści dla klienta skróty RTS/CTS, wzory i „wariant przeszklenia RTS”. Konstrukcję opisano przez akumulację ciepła w masie budynku (bezwładność cieplną) i oddawanie zgromadzonego ciepła z opóźnieniem. Przy wyłączonej akumulacji opis dotyczy dodatkowego opóźnienia wewnątrz pomieszczenia, bez sugerowania zmiany obliczeń przewodzenia przez przegrody zewnętrzne.

We wszystkich nagłówkach, opisach i osiach raportu użyto pełnej nazwy „obciążenie chłodnicze”. „Chłodzenie powietrza” ma dopisek „obciążenie chłodnicze jawne”, a „usuwanie wilgoci” — „obciążenie chłodnicze utajone”. Usunięto zdanie porównujące kW z poborem prądu. Nazwy składowych są wspólne dla tabel i wykresów: nasłonecznienie przez okna; przenikanie ciepła przez przegrody; ludzie, oświetlenie i urządzenia; wentylacja; napływ powietrza przez nieszczelności (infiltracja). Klasa osłonięcia przed wiatrem ma opis słowny. Na wykresach słupkowych część utajona jest zebrana osobno ze wszystkich źródeł, co wyjaśnia podpis.

Wykres kołowy nosi nazwę „Udział składowych obciążenia chłodniczego”: korzysta z `loadComponents`, czyli wyników po uwzględnieniu akumulacji, a nie z chwilowych zysków ciepła. Nadal dotyczy wyłącznie dodatnich składowych, co wyjaśnia podpis. To rozróżnienie odpowiada opisowi [ASHRAE, rozdział 18](https://handbook.ashrae.org/Handbooks/F25/SI/F25_Ch18/f25_ch18_si.aspx). Wartości w kW i procentach pozostają w pełnej legendzie; zrezygnowano z etykiet procentowych na samych wycinkach, ponieważ przy różnych liczbach i wielkościach składowych pogarszały spójność wizualną.

Sekcja „Typ konstrukcji budynku i akumulacja ciepła” przedstawia typ budynku lub pomieszczenia oraz wykończenie podłogi w osobnej tabeli. Pod tabelą wyjaśniono wpływ bezwładności cieplnej. Krótki opis przeznaczenia raportu przeniesiono do „Informacji końcowych” w obu dokumentach.

Nie zmieniono silnika obliczeniowego, danych pogodowych ani współczynników. Zachowano opis dobowego zapotrzebowania, zdanie o EER/SEER oraz dotychczasową treść klauzuli końcowej. Kontrola raportu zbiorczego korzysta z miesiąca rzeczywistych wyników, więc nie opisuje ich omyłkowo miesiącem pochodzącym z nieaktualnego argumentu interfejsu.

## Sprawdzenia

- TypeScript: npm run lint — poprawny.
- Testy: npm test — 60/60 poprawnych, w tym 5 testów warstwy prezentacji.
- Build: npm run build — poprawny. Pozostaje ostrzeżenie Vite o dużym pliku JavaScript; nie blokuje kompilacji.
- Przycisk PDF w lokalnej aplikacji sprawdzono podczas poprzedniej iteracji. Po korekcie języka i układu dokumenty wygenerowano przez te same funkcje w tymczasowej stronie kontrolnej, z rzeczywistym silnikiem i bazami obliczeniowymi.
- Wszystkie dane kontrolne były fikcyjne; strona kontrolna nie łączyła się z Firebase. Wpis „Komputer i sprzęt domowy” z poprzedniej próbki był ręczną nazwą w danych kontrolnych, nie nową pozycją katalogu aplikacji. W obecnej próbce zastąpiono go nazwą „Urządzenie testowe - wpis ręczny”, a projekt pojedynczego pomieszczenia oznaczono jako dane fikcyjne.
- Siedem końcowych dokumentów (łącznie 41 stron) wyrenderowano do PNG i obejrzano. Sprawdzono też tekst, granice strony, odstęp od stopki, numerację oraz wersję na każdej stronie. Zweryfikowano obecność założeń pogodowych na pierwszej stronie i brak RTS/CTS w treści. Dopasowano wysokość wykresów, aby długie nazwy nie oddzielały tabel i wykresów pomieszczeń w raporcie zbiorczym, a informacje końcowe w zwykłym raporcie nie trafiały na pustą stronę.
- Instrukcja Firebase zawiera dokładną kopię lokalnego firestore.rules. Reguł nie publikowano ani nie uruchamiano w emulatorze. Weryfikacja wdrożonych uprawnień pozostaje zgodnie z osobną instrukcją.

| Scenariusz PDF | Strony | Zakres |
| --- | ---: | --- |
| Zwykłe pomieszczenie | 4 | Okno z osłoną i daszkiem, ściana, strop pod poddaszem, ludzie, światło, sprzęt, wentylacja i infiltracja |
| Zbiorczy, 2 pomieszczenia | 4 | Jednoczesny szczyt; jedno pomieszczenie z ujemnym bilansem wilgoci |
| Zbiorczy, 10 pomieszczeń | 13 | Długie nazwy projektu i pomieszczeń, podział tabeli, wszystkie szczegóły pomieszczeń |
| Długie tabele pojedynczego pomieszczenia | 8 | 26 okien, 18 przegród, 18 opisowych nazw źródeł ciepła, harmonogramy przez północ |
| Ujemny bilans wilgoci | 4 | Obciążenie do pokrycia 1,44 kW; bilans utajony -0,34 kW przedstawiony osobno |
| Zerowe obciążenie | 4 | Brak wykresu procentowego bez danych, poprawne wartości zerowe, brak NaN i Infinity |
| Wariant bez osłon okiennych | 4 | Komunikat o pominiętych osłonach na pierwszej stronie i w tabeli okien; osobne dane daszka |

W raportach zbiorczych dodatkowo przekazano fikcyjny układ klimatyzacji z rozpoznawalnymi nazwami kontrolnymi. Żadna z tych nazw nie znalazła się w PDF. Testowy argument miesiąca był celowo różny od miesiąca wyników; raport prawidłowo opisywał lipiec.

Główny wynik zwykłego pomieszczenia wyniósł 1711,3685 W przed formatowaniem i 1,71 kW w raporcie. Energia chłodnicza wyniosła 22,8524 kWh przed formatowaniem i 22,9 kWh w raporcie. Nie zaokrąglano składników przed obliczeniem sum.

## Ograniczenia tej weryfikacji

To kontrola prezentacji wyników, a nie ponowna walidacja fizyczna metody ASHRAE. Nie sprawdzano produkcyjnego Firebase ani ustawień Vercel. Font raportów nadal pochodzi z dotychczasowego CDN; eksport wymaga możliwości jego pobrania.

Instrukcja dalszego postępowania znajduje się w FIREBASE_RULES_INSTRUKCJA.md. Tymczasowa strona kontrolna została usunięta z katalogu aplikacji.

