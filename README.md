# Reha Beauty — podgląd

Statyczna strona bez frameworka i bez builda. Wystarczy serwer plików.

    python3 -m http.server 8944

## Struktura

- `index.html` — strona główna
- `css/tokeny.css` — skala: kolory, pismo, odstępy, światła, interlinie
- `css/style.css` — reguły; wszystkie wartości pochodzą z tokenów
- `js/main.js` — nagłówek, menu, cennik, odsłony i dryf zdjęć
- `assets/` — kroje Onest, zdjęcia w webp, wideo, znak

## Uwaga o wideo w hero

`assets/wideo/hero.*` to **plik podglądowy z iStocka ze znakiem wodnym**,
przeznaczony do akceptacji przez klienta. Przed publikacją produkcyjną trzeba
podmienić go na wersję licencjonowaną — pod te same nazwy, bez zmian w kodzie.
