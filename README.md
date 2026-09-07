# Kalkulator obciążenia chłodniczego HVAC

Aplikacja React/Vite do obliczania obciążenia chłodniczego metodą ASHRAE RTS.

## Podgląd lokalny

Wymagany jest Node.js. Repozytorium ma dodatkowy poziom katalogu, dlatego polecenia aplikacji uruchamiaj w folderze:

```text
C:\Users\Sovey\Desktop\Kalkulator_HVAC_projekt_ChatGPT\github_kod\kalkulator_obciazenia_chlodniczego_2
```

Pierwsze uruchomienie:

```powershell
cd C:\Users\Sovey\Desktop\Kalkulator_HVAC_projekt_ChatGPT\github_kod\kalkulator_obciazenia_chlodniczego_2
npm install
npm run dev
```

Następnie otwórz [http://localhost:3000](http://localhost:3000). Serwer Vite automatycznie odświeża aplikację po zapisaniu zmian w kodzie. Przy kolejnych sesjach wystarczy `npm run dev`. Bez pliku `.env.local` kalkulator działa lokalnie, ale logowanie i synchronizacja projektów z chmurą są wyłączone.

## Kontrola przed wysłaniem zmian

```powershell
npm run lint
npm test
npm run build
```

## Bezpieczny przepływ przez GitHub Desktop

1. Upewnij się, że w lewym górnym rogu jest wybrana gałąź `develop`.
2. Obejrzyj zmiany lokalnie pod adresem `http://localhost:3000`.
3. Uruchom lint, testy i build.
4. W GitHub Desktop wpisz opis i wybierz **Commit to develop**.
5. Wybierz **Push origin**. Vercel może wtedy przygotować podgląd gałęzi `develop`.
6. Nie przełączaj ani nie wysyłaj zmian bezpośrednio na `main`; produkcję aktualizuj dopiero po zaakceptowaniu podglądu.

## Konfiguracja Firebase

Do funkcji logowania i zapisu w chmurze służą zmienne `VITE_FIREBASE_*` opisane w `.env.example`. Lokalny plik `.env.local` nie jest zapisywany w Git.
