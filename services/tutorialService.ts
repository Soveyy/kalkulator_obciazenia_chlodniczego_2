
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
          description: 'To narzędzie pomoże Ci precyzyjnie obliczyć zyski ciepła i obciążenie chłodnicze budynku zgodnie ze standardami ASHRAE.',
          side: "bottom",
          align: 'start'
        }
      },
      {
        element: '#room-basic-info',
        popover: {
          title: 'Dane Podstawowe',
          description: 'To najważniejszy krok! Wprowadź powierzchnię pomieszczenia oraz temperatury projektowe. To fundament Twoich obliczeń.',
          side: "right",
          align: 'start'
        }
      },
      {
        element: '#accumulation-settings',
        popover: {
          title: 'Akumulacja Ciepła',
          description: 'Wybierz masę termiczną budynku, typ podłogi i % przeszklenia w ścianach. Typowe polskie murowane budynki to konstrukcje bardzo ciężkie.',
          side: "right",
          align: 'start'
        }
      },
      {
        element: '#project-management',
        popover: {
          title: 'Zarządzanie Projektem',
          description: 'Tu możesz nadać nazwę swojemu projektowi, zapisać go w pamięci przeglądarki lub wczytać wcześniej zapisany stan.',
          side: "right",
          align: 'start'
        }
      },
      {
        element: '#room-tabs-container',
        popover: {
          title: 'Wiele Pomieszczeń',
          description: 'Aplikacja pozwala na definiowanie wielu pomieszczeń w ramach jednego projektu. Możesz je tu dodawać, kopiować i przełączać się między nimi.',
          side: "bottom",
          align: 'start'
        }
      },
      {
        element: '#main-tabs',
        popover: {
          title: 'Kolejne Kroki',
          description: 'Aplikacja jest podzielona na logiczne etapy. Zacznij od zysków wewnętrznych, potem dodaj okna i wentylację.',
          side: "bottom",
          align: 'start'
        }
      },
      {
        element: '#tab-summary',
        popover: {
          title: 'Obliczenia i Wyniki',
          description: 'W zakładce Podsumowanie znajdziesz przycisk do wykonania pełnych obliczeń oraz szczegółowe zestawienie wyników.',
          side: "bottom",
          align: 'center'
        }
      },
      {
        element: '#tutorial-toggle-container',
        popover: {
          title: 'Tryb Pomocy',
          description: 'Jeśli będziesz potrzebować porady przy konkretnych parametrach, włącz Tryb Pomocy. Wyświetli on dodatkowe wskazówki bezpośrednio w formularzach.',
          side: "right",
          align: 'start'
        }
      }
    ],
    onDestroyed: onComplete
  });

  return d;
};
