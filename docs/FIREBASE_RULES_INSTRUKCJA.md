# Firebase — reguły dostępu Kalkulatora HVAC

Instrukcja dla aktualnego kodu aplikacji 0.6.0, sprawdzonego 19.09.2026.

## Co zrobiłem, a co pozostaje po Twojej stronie

Przeanalizowałem logowanie, odczyt listy projektów i zapis w transakcjach. Lokalny plik **firestore.rules jest właściwym plikiem do publikacji**. Zachowałem jego działanie; dodałem komentarze i tę instrukcję. Poprawka rozdzielająca get i list znajdowała się już w roboczej wersji projektu.

Nie logowałem się do Twojej konsoli, nie publikowałem reguł ani nie zmieniałem danych chmurowych. Nie znam reguł aktualnie wdrożonych, identyfikatora bazy używanego przez produkcję ani innych aplikacji korzystających z tej bazy. W tej sesji nie uruchamiałem emulatora reguł; projekt nie zawiera konfiguracji Firebase CLI. Poniższe testy konsolowe pozostają do wykonania.

## 1. Co chronią reguły

Logowanie odpowiada na pytanie „kim jesteś?”. Reguły sprawdzają, czy ten użytkownik może wykonać konkretną operację w bazie Firestore. Są egzekwowane przez Firebase przy żądaniach aplikacji przeglądarkowej. Samo ukrycie przycisku w aplikacji nie zastępuje reguły dostępu. Serwerowy Admin SDK i uprzywilejowane narzędzia administratora mają odrębne uprawnienia; dlatego oglądanie danych w konsoli właściciela projektu nie jest testem izolacji użytkowników. [Dokumentacja Firebase](https://firebase.google.com/docs/firestore/security/get-started)

Reguły nie chronią plików JavaScript, współczynników pobieranych przez przeglądarkę, lokalnych kopii projektu ani danych już przekazanych w linku udostępniania. W tej aplikacji link zawiera kopię projektu, a nie odwołanie do dokumentu zabezpieczonego regułami.

## 2. Jak aplikacja zapisuje dane

Kod logowania jest w firebase.ts. Korzysta z konta Google przez Firebase Authentication. Nie znalazłem listy dozwolonych adresów ani identyfikatorów użytkowników.

Zapis w services/projectSyncService.ts trafia pod ścieżkę:

    users / UID_UŻYTKOWNIKA / projects / ID_PROJEKTU

UID to identyfikator konta nadany przez Firebase, a nie adres e-mail. Każdy projekt jest dokumentem z dokładnie sześcioma polami:

| Pole | Typ | Znaczenie |
| --- | --- | --- |
| name | tekst | Nazwa projektu, 1–100 znaków |
| date | tekst | Data ostatniego zapisu z aplikacji, do 50 znaków |
| data | tekst | Cały projekt zapisany jako JSON, łącznie z numerem rewizji synchronizacji |
| userId | tekst | UID właściciela, zgodny z UID w ścieżce |
| createdAt | Timestamp | Data utworzenia dokumentu |
| updatedAt | Timestamp | Data ostatniej aktualizacji |

Aplikacja nadaje znaczniki czasu przez serverTimestamp; przy aktualizacji zachowuje dotychczasowe createdAt. Reguły obecnie sprawdzają ich typ, ale nie wymuszają konkretnej daty ani niezmienności createdAt. Dla obecnego zapisu prywatnych projektów nie wymaga to zmiany schematu.

Lista projektów jest odczytywana w services/useProjectStorage.ts z własnej podkolekcji oraz z filtrem userId równym UID zalogowanego konta. Reguła list jest zgodna z tym filtrem. Usunięcie filtra bez zmiany reguł może zepsuć odczyt: reguły oceniają dozwolone wyniki zapytania, a nie odsiewają niedozwolone rekordy. [Zasady zapytań Firestore](https://firebase.google.com/docs/firestore/security/rules-query)

Najpierw powstaje kopia lokalna w przeglądarce, później synchronizacja. Komunikat „Zapisano lokalnie” nie dowodzi zapisu w Firebase — oczekiwany końcowy stan to „Zsynchronizowano”.

## 3. Co oznaczają obecne zapisy

- rules_version = '2': wersja języka reguł, niezależna od wersji aplikacji.
- match /databases/{database}/documents: obszar dokumentów bazy, do której opublikujesz reguły.
- allow read, write: if false: brak ogólnego dostępu. Bardziej szczegółowy pasujący warunek może zezwolić na operację; nie jest to bezwzględne „veto”.
- request.auth != null: wymagane zalogowanie przez Firebase Authentication.
- request.auth.uid == userId: konto musi odpowiadać właścicielowi wskazanemu w ścieżce.
- resource.data: obecny dokument; request.resource.data: pełny dokument po proponowanym zapisie.
- hasAll i size == 6: wszystkie sześć wymaganych pól musi istnieć; dodatkowe pola główne są niedozwolone.
- isValidProject: kontrola typów, długości oraz zgodności właściciela.
- get: odczyt konkretnego dokumentu, również próba odczytu dokumentu, który jeszcze nie istnieje.
- list: zapytanie o listę własnych projektów.
- create / update / delete: utworzenie, aktualizacja i usunięcie własnego dokumentu.

Limit data.size() <= 900000 dotyczy długości tekstu. Aplikacja dodatkowo kontroluje rozmiar JSON w bajtach przed zapisem. Firestore Rules nie analizują wnętrza tego JSON: nie sprawdzają fizyki, limitu 10 pomieszczeń ani wszystkich identyfikatorów. Te kontrole obecnie wykonuje aplikacja. Reguły nie zapewniają też serwerowego limitu 100 projektów na konto.

**Dostęp nie jest ograniczony do pracowników firmy.** Przy dostępnym logowaniu Google nowy użytkownik może uzyskać dostęp do własnych projektów; nie powinien mieć dostępu do projektów kolegów. Same reguły akceptują dowolne konto uwierzytelnione w tym projekcie Firebase, nie wyłącznie dostawcę Google. Sprawdź w Authentication → Sign-in method, jakie metody są włączone.

Jeśli chcesz dopuścić wyłącznie konkretne osoby, potrzebna będzie osobna decyzja i ich UID z Authentication → Users. Nie wpisałem fikcyjnych UID ani listy e-maili. Lista uprawnionych to dodatkowe ograniczenie dostępu, nie warunek działania opisanej izolacji właścicieli.

## 4. Który kod zastąpić

W starym DRAFT_firestore.rules znajduje się:

    allow read: if isOwner(userId) && existing().userId == userId;

Zapis nowego projektu najpierw odczytuje nieistniejący dokument w transakcji. Taki dokument nie ma pola userId, więc powyższy warunek może zablokować zapis. Właściwa wersja rozdziela odczyty:

    allow get: if isOwner(userId);
    allow list: if isOwner(userId) && existing().userId == userId;

To nie otwiera dostępu do cudzych projektów: UID w ścieżce nadal musi odpowiadać zalogowanej osobie.

Aby uniknąć pomyłek, **skopiuj cały aktualny plik firestore.rules**, pokazany poniżej, zamiast łączyć fragmenty. Nie używaj DRAFT_firestore.rules. Nie wklejaj reguł jako pola dokumentu w zakładce Data.

```text
rules_version = '2';
// Plik źródłowy reguł. Zmiana lokalna nie publikuje ich w Firebase.
// Instrukcja publikacji i testów: docs/FIREBASE_RULES_INSTRUKCJA.md.
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if false;
    }

    function isSignedIn() {
      return request.auth != null;
    }

    function isOwner(userId) {
      return isSignedIn() && request.auth.uid == userId;
    }

    function incoming() {
      return request.resource.data;
    }

    function existing() {
      return resource.data;
    }

    function isValidProject(data, userId) {
      return data.keys().hasAll(['name', 'date', 'data', 'userId', 'createdAt', 'updatedAt']) 
          && data.keys().size() == 6
          && data.name is string && data.name.size() > 0 && data.name.size() <= 100
          && data.date is string && data.date.size() <= 50
          && data.data is string && data.data.size() <= 900000 
          && data.userId == userId
          && data.createdAt is timestamp
          && data.updatedAt is timestamp;
    }

    match /users/{userId}/projects/{projectId} {
      // Zapis w transakcji najpierw sprawdza także NIEISTNIEJĄCY dokument.
      // UID w ścieżce ogranicza odczyt do właściciela również w tym przypadku.
      allow get: if isOwner(userId);
      // Aplikacja pobiera listę z filtrem where('userId', '==', uid).
      allow list: if isOwner(userId) && existing().userId == userId;
      allow create: if isOwner(userId)
                    && isValidProject(incoming(), userId);
      allow update: if isOwner(userId)
                    && existing().userId == userId
                    && isValidProject(incoming(), userId);
      allow delete: if isOwner(userId) && existing().userId == userId;
    }
  }
}
```

## 5. Publikacja w konsoli — krok po kroku

1. W Vercel otwórz projekt aplikacji → Settings → Environment Variables. Dla środowiska, które chcesz sprawdzić (Production lub Preview), odszukaj VITE_FIREBASE_PROJECT_ID i opcjonalne VITE_FIREBASE_DATABASE_ID. Identyfikator projektu porównaj z Firebase → ustawienia projektu → General → Project ID. Nie wysyłaj kluczy prywatnych ani danych konta serwisowego.
2. Otwórz [konsolę Firebase](https://console.firebase.google.com/) i wybierz **ten sam projekt**. Wejdź do Firestore Database / Firestore (w nowszym menu: Databases & Storage). Nie wybieraj Realtime Database ani Storage.
3. Wybierz właściwą bazę. Jeśli zmienna VITE_FIREBASE_DATABASE_ID nie jest ustawiona, kod korzysta z bazy (default). Jeśli jest ustawiona, wybierz bazę o dokładnie tej nazwie. Konfiguracja zmiennych po ostatnim wdrożeniu może różnić się od wartości użytych do zbudowania aktualnej aplikacji — w razie niezgodności trzeba sprawdzić wdrożenie Vercel.
4. W zakładce **Rules / Reguły** skopiuj obecnie opublikowany tekst do pliku zapasowego. Sprawdź w zakładce Data, czy dokumenty aplikacji rzeczywiście są pod users/{UID}/projects/{ID}. Jeśli baza obsługuje inne aplikacje lub ma inne dozwolone ścieżki, nie zastępuj ich w ciemno — potrzebuję wtedy obecnej treści reguł i nazw tych ścieżek, bez prywatnych danych dokumentów.
5. W edytorze Rules zastąp całą treść aktualnym plikiem z punktu 4. Uruchom testy opisane poniżej. Popraw błędy składni wskazane przez edytor, zanim opublikujesz.
6. Kliknij **Publish / Opublikuj**. Samo zapisanie pliku na dysku, commit, push ani standardowy build Vercel nie publikuje reguł tego projektu. Nie ma tu firebase.json, .firebaserc ani skryptu wdrażającego reguły.
7. Sprawdź, że w konsoli widać opublikowaną wersję. Odśwież aplikację i wykonaj test funkcjonalny. Nowe zapytania mogą odczuć zmianę po około minucie; istniejące nasłuchy mogą potrzebować do 10 minut. [Publikacja i propagacja reguł](https://firebase.google.com/docs/firestore/security/get-started)

Plik w repozytorium i opublikowana wersja powinny pozostać zgodne. Jeśli później zmienisz reguły w konsoli, przenieś tę zmianę również do pliku. Nie trzeba instalować Firebase CLI, aby skorzystać z opisanej ścieżki. W przyszłości CLI wymaga świadomego powiązania pliku z projektem i bazą; jego wdrożenie może nadpisać wersję konsolową. [Zarządzanie regułami](https://firebase.google.com/docs/rules/manage-deploy)

## 6. Sprawdzenie uprawnień bez zmiany danych produkcyjnych

Otwórz **Rules Playground / Symulator reguł** obok edytora. Ustaw typ operacji i ścieżkę dokumentu. Przełącznik Authentication pozwala zasymulować zalogowane konto i podać jego UID. To symulacja żądania, nie utworzenie konta. Symulator testuje tekst w edytorze, dlatego po testach nadal trzeba go opublikować. [Testowanie w konsoli](https://firebase.google.com/docs/rules/manage-deploy)

Z Authentication → Users skopiuj UID jednego testowego użytkownika A; UID konta B musi być inny. W tabeli podstaw rzeczywiste UID, a w przypadkach update/delete/get istniejącego dokumentu użyj właściwej ścieżki i danych tego dokumentu.

| Próba w symulatorze | Wynik oczekiwany |
| --- | --- |
| Niezalogowany: get dokumentu w users/A/projects/... | Odmowa |
| Konto A: get własnego dokumentu | Zgoda |
| Konto A: get nieistniejącego users/A/projects/test-nowy | Zgoda na odczyt, dokument nadal nie istnieje |
| Konto B: get dokumentu users/A/projects/... | Odmowa |
| Konto A: create users/A/projects/test-nowy, prawidłowe 6 pól | Zgoda |
| Konto B: create users/A/projects/test-nowy | Odmowa |
| Konto A: create we własnej ścieżce, ale userId = B | Odmowa |
| Konto A: create z brakującym polem, siódmym polem lub data jako mapą zamiast tekstu | Odmowa |
| Konto A: update własnego dokumentu przy zachowaniu prawidłowej struktury | Zgoda |
| Konto B: update lub delete dokumentu A | Odmowa |
| Konto A: delete własnego dokumentu | Zgoda |
| Dowolne konto: zapis poza users/{UID}/projects/{ID} | Odmowa |

Dla pozytywnego create ustaw: name jako tekst „Test reguł”, date jako tekst daty ISO, data jako tekst „{}”, userId jako tekst z UID A, createdAt i updatedAt jako wartości typu **Timestamp**, nie tekst daty. Taki minimalny dokument służy tylko symulatorowi reguł — nie jest kompletnym projektem do wczytania w aplikacji. Przy symulacji update zadbaj o pełny stan sześciu pól po zmianie.

Lista projektów korzysta z zapytania z filtrem, więc same próby get nie sprawdzają całej ścieżki list. Jej działanie potwierdź w aplikacji lub emulatorze. Testy emulatora są dokładniejszą przyszłą opcją; nie zastępuje ich sprawdzenie składni. [Emulator reguł](https://firebase.google.com/docs/firestore/security/test-rules-emulator)

## 7. Sprawdzenie działania aplikacji po publikacji

Najpierw wykonaj to w oddzielnym projekcie Firebase do testów. Jeśli świadomie sprawdzasz produkcję, użyj wyłącznie własnego, nowego projektu testowego, bez nadpisywania istniejących prac.

1. Zaloguj konto A. Zapisz mały projekt pod unikalną nazwą „TEST REGUŁ …”. Poczekaj na **Zsynchronizowano**.
2. Otwórz aplikację w oddzielnym profilu przeglądarki, zaloguj to samo konto A i wczytaj projekt. Nowy profil pozwala sprawdzić chmurę bez korzystania z lokalnej kopii.
3. Zmień parametr testowego projektu, zapisz, a w drugim profilu potwierdź zmianę po ponownym wczytaniu.
4. W innym profilu zaloguj konto B. Projekt A nie powinien pojawić się na jego liście. Utwórz własny projekt B i sprawdź, że nie pojawia się u A. Brak projektu na liście sam w sobie nie dowodzi blokady bezpośredniego odczytu — od tego są testy uprawnień powyżej.
5. Usuń tylko projekt testowy z konta właściciela i potwierdź zniknięcie w drugim profilu tego samego konta.
6. Jeżeli pojawi się „Błąd synchronizacji — kopia lokalna zachowana” lub „Missing or insufficient permissions”, sprawdź właściwy projekt/bazę, opublikowany tekst, zgodność UID oraz sześć pól. Nie naprawiaj błędu przez allow read, write: if true.

## Kiedy potrzebuję dodatkowych informacji

Do opisanej reguły właściciela nie potrzebuję Twojego UID — parametr userId pobierany jest ze ścieżki. Do potwierdzenia bezpieczeństwa **wdrożenia** potrzebne są: tekst opublikowanych reguł, Project ID, ID bazy i lista włączonych metod logowania. Znajdziesz je w miejscach wskazanych wyżej. Jeżeli rozważasz listę pracowników, potrzebne będą również UID uprawnionych kont i decyzja, kto nią zarządza.

Na późniejszy produkt publiczny pozostają osobne zagadnienia: limit liczby zapisów i dokumentów egzekwowany po stronie serwera, kontrola kosztów, ewentualna lista uprawnionych oraz App Check. Obecne reguły izolacji nie są limitem kosztów ani systemem subskrypcji.


