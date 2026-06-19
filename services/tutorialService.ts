
import { driver, Driver } from "driver.js";
import "driver.js/dist/driver.css";

export const createTutorial = (onComplete: () => void): Driver => {
  const d = driver({
    showProgress: true,
    nextBtnText: 'Dalej',
    prevBtnText: 'Wstecz',
    doneBtnText: 'Zakończ',
    allowClose: true,
    overlayColor: '#000',
    overlayOpacity: 0.4,
    stagePadding: 4,
    popoverClass: 'hvac-tutorial-popover',
    steps: [
      {
        element: '#app-header',
        popover: {
          title: 'Witaj w Kalkulatorze!',
          description: 'To zaawansowane narzędzie inżynierskie pomoże Ci precyzyjnie obliczyć zyski ciepła i obciążenie chłodnicze budynków zgodnie z uznaną metodologią ASHRAE (RTS - Radiant Time Series).',
          side: "bottom",
          align: 'start'
        }
      },
      {
        element: '#room-tabs-container',
        popover: {
          title: 'Zarządzanie Pomieszczeniami',
          description: 'Na samej górze możesz dodawać nowe pomieszczenia (maksymalnie 10), powielać je i edytować nazwy. Dla konfiguracji z wieloma pokojami automatycznie odblokowany zostanie moduł "Analiza Zbiorcza" do doboru systemów klimatyzacji typu Multi-Split.',
          side: "bottom",
          align: 'start'
        }
      },
      {
        element: '#main-tabs',
        popover: {
          title: 'Ustrukturyzowane Zakładki',
          description: 'Cały formularz oraz parametry obliczeniowe znajdziesz w ponumerowanych zakładkach w głównym panelu. Konfiguruj poszczególne zyski ciepła krok po kroku.',
          side: "bottom",
          align: 'start'
        }
      },
      {
        element: '#tab-input',
        popover: {
          title: '1. Dane wejściowe',
          description: 'Na początek określ powierzchnię pomieszczenia, projektowaną temperaturę wewnętrzną oraz wilgotność powietrza. Tu również skonfigurujesz parametry akumulacji ciepła (bezwładności termicznej) dla konstrukcji lekkich, średnich, ciężkich bądź bardzo ciężkich.',
          side: "bottom",
          align: 'start'
        }
      },
      {
        element: '#tab-internal',
        popover: {
          title: '2. Zyski wewnętrzne',
          description: 'Wprowadź ciepło wydzielane przez ludzi, dobrane oświetlenie (np. nowoczesne LED) oraz urządzenia biurowe/domowe (AGD, komputery, urządzenia kuchenne).',
          side: "bottom",
          align: 'start'
        }
      },
      {
        element: '#tab-windows',
        popover: {
          title: '3. Okna i nasłonecznienie',
          description: 'Skonfiguruj okna w pomieszczeniu. Określ ich wymiary, współczynnik SHGC (przepuszczalność energii słonecznej) oraz ewentualne osłony zewnętrzne (żaluzje, rolety) lub daszki zacieniające nad oknem chroniące przed słońcem w lecie.',
          side: "bottom",
          align: 'start'
        }
      },
      {
        element: '#tab-ventilation',
        popover: {
          title: '4. Wentylacja i infiltracja',
          description: 'Zdefiniuj system wentylacji: naturalną grawitacyjną lub mechaniczną nawiewno-wywiewną (rekuperację). Wprowadź też stopień szczelności i kubaturę, by kalkulator oszacował niekontrolowane zyski ciepła od infiltracji powietrza.',
          side: "bottom",
          align: 'start'
        }
      },
      {
        element: '#tab-walls',
        popover: {
          title: '5. Ściany i dachy',
          description: 'Wprowadź nieprzezroczyste przegrody zewnętrzne: ściany o zadanej orientacji oraz stropy i stropodachy, definiując ich powierzchnię, współczynnik przenikania U i typ/kolor wykończenia od zewnątrz.',
          side: "bottom",
          align: 'start'
        }
      },
      {
        element: '#tab-summary',
        popover: {
          title: '6. Podsumowanie wyników',
          description: 'Główny bilans pomieszczenia! Zobacz godzinę szczytową (peak hour), podział na obciążenia jawne i utajone dla wybranych miesięcy oraz pobierz automatycznie wygenerowany raport PDF.',
          side: "bottom",
          align: 'start'
        }
      },
      {
        element: '#tab-rts',
        popover: {
          title: '7. Dobór i analiza',
          description: 'Najbardziej rozbudowana część analityczna wyposażona w interaktywny wykres Sankeya (wizualizacja strumieni ciepła), całoroczną dobową mapę ciepła (heat-map), podział sezonowy oraz zaimplementowany kalkulator doboru mocy klimatyzacji.',
          side: "bottom",
          align: 'start'
        }
      },
      {
        element: '#project-management',
        popover: {
          title: 'Zarządzanie Projektem',
          description: 'Użyj panelu narzędziowego, aby trwale zapisać swoje obliczenia w bazie danych, wczytywać wcześniejsze wersje, wygenerować unikalny link do udostępnienia projektu innej osobie lub zresetować kalkulator.',
          side: "right",
          align: 'start'
        }
      },
      {
        element: '#tutorial-toggle-container',
        popover: {
          title: 'Dynamiczny Tryb Pomocy',
          description: 'Jeżeli dowolne sformułowanie lub parametr wyda Ci się niejasny, włącz ten przełącznik. W formularzach wyświetlą się od razu wskazówki i wzorce ułatwiające właściwy dobór parametrów.',
          side: "right",
          align: 'start'
        }
      }
    ],
    onDestroyed: onComplete
  });

  return d;
};
