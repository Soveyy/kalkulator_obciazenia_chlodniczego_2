
import { driver, Driver } from "driver.js";
import "driver.js/dist/driver.css";

export const createTutorial = (onComplete: () => void): Driver => {
  const d = driver({
    showProgress: true,
    progressText: '{{current}} z {{total}}',
    nextBtnText: 'Dalej',
    prevBtnText: 'Wstecz',
    doneBtnText: 'Zakończ',
    allowClose: true,
    overlayColor: '#000',
    overlayOpacity: 0.4,
    stagePadding: 4,
    popoverClass: 'hvac-tutorial-popover',
    onPopoverRender: (popover) => {
      popover.closeButton.setAttribute('aria-label', 'Zamknij przewodnik');
    },
    steps: [
      {
        element: '#app-header',
        popover: {
          title: 'Witaj w programie Kalkulator HVAC RTS!',
          description: 'Oszacuj projektowe obciążenie chłodnicze pomieszczeń metodą RTS (Radiant Time Series). Zacznij od danych pomieszczenia, dodaj występujące w nim źródła zysków, a następnie przejdź do wyników. Założenia i uproszczenia znajdziesz pod ikoną „i” obok nazwy aplikacji.',
          side: "bottom",
          align: 'start'
        }
      },
      {
        element: '#room-tabs-container',
        popover: {
          title: 'Pomieszczenia w projekcie',
          description: 'Dodawaj pomieszczenia przyciskiem „+” (maksymalnie 10), zmieniaj ich nazwy i powielaj podobne konfiguracje. Nowe, puste pomieszczenie otwiera „Dane wejściowe” z miejscem na powierzchnię. Kliknięcie nazwy przełącza bieżące pomieszczenie.',
          side: "bottom",
          align: 'start'
        }
      },
      {
        element: '#main-tabs',
        popover: {
          title: 'Zakładki i aktualność wyników',
          description: 'Zielone wskaźniki pomagają śledzić uzupełnienie modułów. Dodawaj tylko źródła zysków występujące w pomieszczeniu — nie każda zakładka musi być uzupełniona. Wyniki przeliczają się automatycznie. Gdy dane wymagają poprawy, przycisk statusu w prawym górnym rogu pokaże szczegóły i przejście do odpowiedniej sekcji.',
          side: "bottom",
          align: 'start'
        }
      },
      {
        element: '#tab-input',
        popover: {
          title: '1. Dane wejściowe',
          description: 'Wpisz powierzchnię pomieszczenia i sprawdź temperaturę oraz wilgotność wewnętrzną. Dobierz preset akumulacji do konstrukcji pomieszczenia, a następnie wykończenie podłogi i udział przeszkleń. Parametry te wybierają charakterystykę RTF; poszczególne okna i przegrody wprowadzasz osobno.',
          side: "bottom",
          align: 'start'
        }
      },
      {
        element: '#tab-internal',
        popover: {
          title: '2. Zyski wewnętrzne',
          description: 'Włącz obecność ludzi i oświetlenie, jeśli występują w pomieszczeniu. Dodaj urządzenia z listy lub katalogu i sprawdź ich moce oraz liczbę sztuk. Dla każdego źródła ustaw godziny pracy — harmonogram wpływa na profil obciążenia i godzinę szczytu.',
          side: "bottom",
          align: 'start'
        }
      },
      {
        element: '#tab-windows',
        popover: {
          title: '3. Okna i nasłonecznienie',
          description: 'Dodaj okna, podając wymiary, kierunek i pochylenie. Preset uzupełnia U oraz SHGC; możesz wpisać własne wartości. Dobierz dostępne osłony wewnętrzne lub zewnętrzne i ewentualny daszek. Przy podobnych oknach użyj duplikowania, a osłony możesz zmienić zbiorczo.',
          side: "bottom",
          align: 'start'
        }
      },
      {
        element: '#tab-ventilation',
        popover: {
          title: '4. Wentylacja i infiltracja',
          description: 'Wybierz wentylację grawitacyjną lub mechaniczną z odzyskiem i podaj strumień powietrza. Dla mechanicznej sprawdź odzysk ciepła i wilgoci. Infiltrację włączasz osobno: potrzebne są obwód ścian zewnętrznych, wysokość pomieszczenia oraz parametry szczelności i wiatru. Wykres i podsumowanie po prawej pokazują wpływ ustawień.',
          side: "bottom",
          align: 'start'
        }
      },
      {
        element: '#tab-walls',
        popover: {
          title: '5. Przegrody nieprzezroczyste',
          description: 'Dodaj przegrody zewnętrzne lub przegrody do nieklimatyzowanej przestrzeni. Dla ścian podaj powierzchnię netto, po odjęciu okien i drzwi — program nie odejmuje ich automatycznie. Preset zewnętrzny dobiera CTS i reprezentatywne U. Dla sąsiedniej przestrzeni podajesz także jej stałą temperaturę.',
          side: "bottom",
          align: 'start'
        }
      },
      {
        element: '#tab-summary',
        popover: {
          title: '6. Podsumowanie wyników',
          description: 'Sprawdź maksymalne wymagane chłodzenie, godzinę szczytu oraz część jawną i utajoną obciążenia. Wybierz miesiąc analizy lub porównaj wyniki z osłonami i bez nich. Przełącznik osłon dotyczy wyników całego projektu i zachowuje konfigurację okien. Gotowe wyniki możesz pobrać jako raport PDF.',
          side: "bottom",
          align: 'start'
        }
      },
      {
        element: '#tab-rts',
        popover: {
          title: '7. Analiza pomieszczenia',
          description: 'Sprawdź wpływ bezwładności cieplnej, przepływ ciepła, udziały źródeł oraz zmienność godzinową i sezonową dla bieżącego pomieszczenia.',
          side: "bottom",
          align: 'start'
        }
      },
      {
        element: '#aggregate-analysis-tab',
        popover: {
          title: 'Dobór i analiza zbiorcza',
          description: 'Porównaj obciążenia i przypisz pomieszczenia do układów Split lub Multi-Split. Przełącznik „Prezentacja projektu” otwiera dashboard z wynikami i wykresami całego obiektu, także na pełnym ekranie. Widok działa również dla jednego pomieszczenia. Miesiąc wymiarujący jest wybierany z okresu kwiecień–wrzesień.',
          side: 'bottom',
          align: 'end'
        }
      },
      {
        element: '#project-management',
        popover: {
          title: 'Zapis i udostępnianie projektu',
          description: 'Nadaj projektowi nazwę i użyj „Zapisz”, aby zachować konfigurację. „Wczytaj” otwiera listę zapisanych projektów. Jeśli pojawia się status synchronizacji, sprawdź, czy zapis do chmury został zakończony. „Udostępnij” tworzy link do konfiguracji, a „Resetuj” rozpoczyna nowy projekt.',
          side: "right",
          align: 'start'
        }
      },
      {
        element: '#tutorial-toggle-container',
        popover: {
          title: 'Pomoc podczas pracy',
          description: 'Włącz „Pomoc”, aby zobaczyć dodatkowe wskazówki w formularzach. Krótkie objaśnienia parametrów są też dostępne po najechaniu na ikony „i”. Do tego przewodnika możesz wrócić w dowolnym momencie przyciskiem „Przewodnik”.',
          side: "right",
          align: 'start'
        }
      }
    ],
    onDestroyed: onComplete
  });

  return d;
};
