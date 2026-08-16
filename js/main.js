/* ============================================================
   Reha Beauty — strona główna
   Bez frameworka i bez builda. Każdy blok działa osobno, więc
   błąd w jednym nie kasuje pozostałych.
   ============================================================ */
(function () {
  'use strict';

  var mniejRuchu = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── Nagłówek: pasek zwija się po 36 px przewinięcia ────────── */
  var naglowek = document.getElementById('top');
  if (naglowek) {
    var czeka = false;
    function stanNaglowka() {
      naglowek.classList.toggle('przewiniety', (window.pageYOffset || 0) > 36);
      czeka = false;
    }
    addEventListener('scroll', function () {
      if (!czeka) { requestAnimationFrame(stanNaglowka); czeka = true; }
    }, { passive: true });
    stanNaglowka();
  }

  /* ── Menu na wąskim ekranie ─────────────────────────────────
     Escape zamyka, przewijanie strony pod panelem jest blokowane,
     a po zamknięciu ostrość wraca na przycisk.                   */
  var burger = document.querySelector('.burger');
  var menu = document.getElementById('menu');
  if (burger && menu) {
    var ustawMenu = function (otwarte) {
      burger.setAttribute('aria-expanded', String(otwarte));
      menu.classList.toggle('otwarte', otwarte);
      document.body.classList.toggle('menu-otwarte', otwarte);
    };
    burger.addEventListener('click', function () {
      ustawMenu(burger.getAttribute('aria-expanded') !== 'true');
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && burger.getAttribute('aria-expanded') === 'true') {
        ustawMenu(false); burger.focus();
      }
    });
    menu.addEventListener('click', function (e) {
      if (e.target.closest('a')) ustawMenu(false);
    });
    /* Po przejściu na szeroki ekran panel przestaje istnieć —
       zdejmujemy blokadę przewijania, żeby strona nie została zamrożona. */
    var szeroki = matchMedia('(min-width: 1400px)');
    var przyZmianie = function (e) { if (e.matches) ustawMenu(false); };
    szeroki.addEventListener ? szeroki.addEventListener('change', przyZmianie)
                             : szeroki.addListener(przyZmianie);
  }

  /* ── Wideo w hero ───────────────────────────────────────────
     Atrybutu autoplay nie ma w HTML celowo: przy „ogranicz ruch"
     albo bez JS zostaje nieruchomy plakat. Odtwarzanie zatrzymuje
     się, gdy hero wyjedzie z kadru — nie ma po co grać w tle. */
  var wideo = document.querySelector('.hero__w');
  if (wideo && !mniejRuchu) {
    var graj = function () { var o = wideo.play(); if (o && o.catch) o.catch(function () {}); };
    if (wideo.readyState >= 2) graj(); else wideo.addEventListener('loadeddata', graj, { once: true });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (wpisy) {
        wpisy.forEach(function (w) { w.isIntersecting ? graj() : wideo.pause(); });
      }, { threshold: 0.05 }).observe(wideo);
    }
  }

  /* ── Ujawnianie treści przy wejściu w kadr ──────────────────── */
  var doUjawnienia = document.querySelectorAll('.rv');
  if (doUjawnienia.length && !mniejRuchu && 'IntersectionObserver' in window) {
    /* Kaskada: elementy z tego samego rodzica wchodzą po kolei co 70 ms.
       Wszystko naraz wygląda jak przeładowanie strony, nie jak wejście. */
    var obs = new IntersectionObserver(function (wpisy) {
      var kolejka = wpisy.filter(function (w) { return w.isIntersecting; });
      var licznik = {};
      kolejka.forEach(function (w) {
        var rodzic = w.target.parentElement;
        var klucz = rodzic ? (rodzic.className || 'x') : 'x';
        licznik[klucz] = (licznik[klucz] || 0);
        var i = licznik[klucz]++;
        if (i) w.target.style.setProperty('--zw', (Math.min(i, 4) * 0.05) + 's');
        w.target.classList.add('on');
        obs.unobserve(w.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    doUjawnienia.forEach(function (el) { obs.observe(el); });

    /* Trzy bezpieczniki, bo ukryta treść to gorsza awaria niż brak animacji:
       1. cokolwiek leży w kadrze albo już zostało minięte — odsłoń przy
          przewijaniu, nie czekając na obserwatora,
       2. to samo raz po wczytaniu obrazów,
       3. po 3 s odsłoń wszystko powyżej dolnej krawędzi ekranu. */
    function dopilnuj() {
      document.querySelectorAll('.rv:not(.on)').forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.top < innerHeight * 0.96) el.classList.add('on');
      });
    }
    var tikU = false;
    addEventListener('scroll', function () {
      if (!tikU) { requestAnimationFrame(function () { dopilnuj(); tikU = false; }); tikU = true; }
    }, { passive: true });
    addEventListener('resize', dopilnuj, { passive: true });
    addEventListener('pageshow', dopilnuj);
    setTimeout(dopilnuj, 1200);
    setTimeout(dopilnuj, 3000);
  } else {
    doUjawnienia.forEach(function (el) { el.classList.add('on'); });
  }

  /* ── Rozwijanie szczegółów zabiegu ──────────────────────────
     Natywne <details> otwiera się skokiem: przy liście dwudziestu
     wskazań strona podskakuje o półtora tysiąca pikseli pod kursorem.
     Pseudoelement ::details-content tego nie rozwiązuje — sprawdzone
     w Chrome 131: blok zostaje na 53 px przy treści na 1434 px.
     Dlatego wysokość animuje skrypt, a znacznik zostaje natywny —
     bez JavaScriptu i przy „ogranicz ruch" rozwijanie działa jak zwykle. */
  var rozwijane = document.querySelectorAll('.szcz');
  if (rozwijane.length && !mniejRuchu && typeof Element.prototype.animate === 'function') {
    [].forEach.call(rozwijane, function (blok) {
      var tresc = blok.querySelector('.szcz__g');
      var uchwyt = blok.querySelector('summary');
      if (!tresc || !uchwyt) return;

      /* Dolne wcięcie zjeżdża razem z wysokością — przy border-box samo
         height:0 zostawiłoby pasek grubości wcięcia. */
      var wciecie = getComputedStyle(tresc).paddingBottom;
      var ruch = null, zegar = 0, pokolenie = 0, zwijanie = false;

      function przerwij() {
        pokolenie++;                       /* wszystko starsze przestaje działać */
        if (zegar) { clearTimeout(zegar); zegar = 0; }
        if (ruch) { ruch.cancel(); ruch = null; }
        tresc.style.overflow = '';
        tresc.style.height = '';
        tresc.style.paddingBottom = '';
        tresc.style.opacity = '';
      }

      function graj(odH, doH, odP, doP, potem) {
        przerwij();
        var moje = pokolenie;
        tresc.style.overflow = 'hidden';
        ruch = tresc.animate(
          [{ height: odH + 'px', paddingBottom: odP, opacity: odH ? 1 : 0 },
           { height: doH + 'px', paddingBottom: doP, opacity: doH ? 1 : 0 }],
          { duration: 300, easing: 'cubic-bezier(.22,.61,.36,1)' });

        /* Sprzątanie wykonuje się dokładnie raz i wykonuje się zawsze.
           Gdyby zależało tylko od onfinish, zatrzymana animacja zostawiłaby
           overflow:hidden na zwiniętej wysokości — czyli treść otwartego
           bloku byłaby niewidoczna. Zegar jest zapasem na wypadek, gdyby
           zdarzenie nigdy nie przyszło; licznik pokoleń pilnuje, żeby
           spóźniony zapas nie zamknął bloku otwartego w międzyczasie. */
        function domknij() {
          if (moje !== pokolenie) return;
          if (zegar) { clearTimeout(zegar); zegar = 0; }
          /* Samo wyczyszczenie stylów nie wystarcza: wstrzymana animacja
             dalej narzuca swoją wysokość, więc treść zostałaby zwinięta
             mimo otwartego bloku. Po zakończeniu cancel nic nie zmienia. */
          if (ruch) { try { ruch.cancel(); } catch (e) {} }
          ruch = null;
          tresc.style.overflow = '';
          tresc.style.height = '';
          tresc.style.paddingBottom = '';
          tresc.style.opacity = '';
          pokolenie++;
          if (potem) potem();
        }
        ruch.onfinish = domknij;
        zegar = setTimeout(domknij, 600);
      }

      uchwyt.addEventListener('click', function (e) {
        e.preventDefault();
        if (blok.open && !zwijanie) {
          zwijanie = true;
          var h = tresc.offsetHeight;
          graj(h, 0, wciecie, '0px', function () { blok.open = false; zwijanie = false; });
        } else {
          zwijanie = false;
          if (!blok.open) blok.open = true;
          graj(0, tresc.offsetHeight, '0px', wciecie, null);
        }
      });
    });
  }

  /* ── Pasek zabiegów: gdzie jestem ───────────────────────────
     Zakładka masaży ma czternaście pozycji i cztery ekrany wysokości.
     Bez tego przyklejony pasek jest spisem, a nie nawigacją.
     Zaznaczamy ten zabieg, którego początek minęliśmy ostatnio —
     nie ten najbliżej środka, bo przy blokach różnej wysokości
     zaznaczenie skakałoby w tę i z powrotem.                        */
  var pasek = document.querySelector('.spis');
  if (pasek) {
    var poz = [].slice.call(pasek.querySelectorAll('a[href^="#"]')).map(function (a) {
      return { a: a, cel: document.getElementById(a.getAttribute('href').slice(1)) };
    }).filter(function (x) { return x.cel; });

    if (poz.length) {
      var teraz = null, tikP = false;

      function zaznacz() {
        /* Próg to dolna krawędź paska — element uznajemy za bieżący,
           gdy jego początek schowa się pod paskiem. */
        var prog = pasek.getBoundingClientRect().bottom + 8;
        var wybor = null;
        poz.forEach(function (x) {
          if (x.cel.getBoundingClientRect().top <= prog) wybor = x;
        });
        /* Na samej górze strony nic nie jest jeszcze bieżące. */
        if (wybor === teraz) return;
        if (teraz) teraz.a.removeAttribute('aria-current');
        teraz = wybor;
        if (!teraz) return;
        teraz.a.setAttribute('aria-current', 'true');

        /* Przy przewijaniu w bok zaznaczona pozycja musi zostać widoczna. */
        var w = pasek.querySelector('.spis__in');
        if (w && w.scrollWidth > w.clientWidth) {
          var r = teraz.a.getBoundingClientRect(), rw = w.getBoundingClientRect();
          if (r.left < rw.left + 24 || r.right > rw.right - 24) {
            w.scrollTo({
              left: w.scrollLeft + (r.left - rw.left) - (rw.width - r.width) / 2,
              behavior: mniejRuchu ? 'auto' : 'smooth'
            });
          }
        }
      }

      addEventListener('scroll', function () {
        if (!tikP) { requestAnimationFrame(function () { zaznacz(); tikP = false; }); tikP = true; }
      }, { passive: true });
      addEventListener('resize', zaznacz, { passive: true });
      zaznacz();
    }
  }

  /* ── Parallaks tła hero: 12 %, tylko warstwa zdjęcia ────────── */
  var tlo = document.getElementById('tlo');
  if (tlo && !mniejRuchu) {
    var tik = false;
    addEventListener('scroll', function () {
      if (tik) return;
      tik = true;
      requestAnimationFrame(function () {
        var y = Math.min(window.scrollY, innerHeight);
        tlo.style.transform = 'translate3d(0,' + (y * 0.12) + 'px,0)';
        tik = false;
      });
    }, { passive: true });
  }

  /* ── Powrót na górę ────────────────────────────────────────
     Przycisk wchodzi po zejściu poniżej pierwszego ekranu, żeby
     nie zasłaniał hero. Bez JS nie ma go wcale — atrybut hidden
     siedzi w HTML. */
  var doGory = document.querySelector('.dogory');
  if (doGory) {
    var stanG = false;
    function sprawdzG() {
      var pokaz = (window.pageYOffset || 0) > innerHeight * 0.8;
      if (pokaz !== stanG) { stanG = pokaz; doGory.hidden = !pokaz; }
    }
    addEventListener('scroll', sprawdzG, { passive: true });
    sprawdzG();
    doGory.addEventListener('click', function () {
      scrollTo({ top: 0, behavior: mniejRuchu ? 'auto' : 'smooth' });
    });
  }

  /* ── Dryf zdjęć w kadrze ───────────────────────────────────
     Obraz jedzie wolniej niż strona — kadr zaczyna od dolnej
     krawędzi i schodzi ku górnej. Zakres 44 px na całe przejście
     przez ekran, czyli tyle, żeby dało się poczuć, a nie zobaczyć.
     Skrypt ustawia tylko zmienną; złożenie z hoverem robi CSS. */
  var dryf = document.querySelectorAll('.fil__f img,.onas__f img,.loc__f img,.dl__f img');
  if (dryf.length && !mniejRuchu) {
    var widoczne = [], tikD = false;
    var obsD = new IntersectionObserver(function (wpisy) {
      wpisy.forEach(function (w) {
        var i = widoczne.indexOf(w.target);
        if (w.isIntersecting && i < 0) widoczne.push(w.target);
        if (!w.isIntersecting && i >= 0) { widoczne.splice(i, 1); w.target.style.setProperty('--pl', '0px'); }
      });
      licz();
    }, { rootMargin: '10% 0px' });
    dryf.forEach(function (el) { obsD.observe(el); });

    function licz() {
      widoczne.forEach(function (el) {
        var r = el.getBoundingClientRect();
        /* -1 gdy kadr wchodzi dołem, +1 gdy wychodzi górą */
        var post = (r.top + r.height / 2 - innerHeight / 2) / (innerHeight / 2 + r.height / 2);
        el.style.setProperty('--pl', (Math.max(-1, Math.min(1, post)) * 14).toFixed(1) + 'px');
      });
      tikD = false;
    }
    addEventListener('scroll', function () {
      if (!tikD) { requestAnimationFrame(licz); tikD = true; }
    }, { passive: true });
    addEventListener('resize', licz, { passive: true });
    licz();
  }

  /* ── Cennik ────────────────────────────────────────────────
     Ceny pochodzą z rezerwacji Booksy (pobranie 11.08.2026) —
     dokumentacji roboczej projektu. Nie wpisywać liczb z pamięci
     ani ze starej strony: tam są zaniżone o 60–70 zł.
     Kolumny: kategoria, urządzenie/technika, zakres, czas, cena.
     Zakres jest tym, co odróżnia pozycje od siebie — cztery warianty
     Endermoliftu mają tę samą nazwę i różnią się dopiero zakresem,
     więc to on stoi w karcie największy.                          */
  var ZABIEGI = [
    ['twarz', 'Endermolift',              'Twarz i szyja',            '30 min',        '180 zł'],
    ['twarz', 'Endermolift',              'Twarz, szyja i dekolt',    '30 min',        '200 zł'],
    ['twarz', 'Endermolift',              'Pakiet 10 zabiegów',       'twarz i szyja', '1 100 zł'],
    ['twarz', 'Masaż twarzy',             'Relaks i ujędrnienie',     '60 min',        '200 zł'],
    ['twarz', 'Accent Prime',             'Odmładzanie',              '30 min',        'od 300 zł'],
    ['twarz', 'Endermolift',              'Pakiet 10 zabiegów',       'z dekoltem',    '1 300 zł'],
    ['cialo', 'Endermologia',             'Pojedynczy zabieg',        '40 min',        '240 zł'],
    ['cialo', 'Endermologia',             'Pakiet 6 zabiegów',        '',              '1 200 zł'],
    ['cialo', 'Accent Prime',             'Ujędrnienie skóry',        '30 min',        'od 300 zł'],
    ['cialo', 'Kriolipoliza',             'Jeden obszar',             '70 min',        '600–900 zł'],
    ['cialo', 'Accent Prime',             'Redukcja tkanki',          '30 min',        '300–600 zł'],
    ['cialo', 'Endermologia',             'Pakiet 9 zabiegów',        '',              '1 750 zł'],
    ['regen', 'Masaż peelingujący',       'Całościowy',               '60 min',        '250 zł'],
    ['regen', 'Endermologia lecznicza',   'Niwelowanie obrzęku',      '40 min',        '240 zł'],
    ['regen', 'Hydromasaż',               'Także detoksykujący',      '30 min',        '90 zł'],
    ['regen', 'Masaż relaksacyjny',       'Relaks dla ciała',         '60 min',        '200 zł'],
    ['regen', 'Masaż olejkiem arganowym', 'Także na ciepło',          '60 min',        '250 zł'],
    ['regen', 'Sauna Infrared',           'Głęboki relaks',           '60 min',        '60 zł'],
    ['regen', 'Kriokomora',               'Na całe ciało',            '5 min',         '50 zł'],
    ['regen', 'Hydromasaż',               'Masaż wodny',              '30 min',        '90 zł']
  ];
  /* Zdjęcie idzie za techniką, nie za kategorią — inaczej cztery warianty
     Endermoliftu dostają ten sam kadr i pierwszy rząd wygląda na pomyłkę. */
  var FOTO = {
    'twarz|Accent Prime': 'z-accent-twarz',
    'Endermolift': 'z-endermolift',
    'Accent Prime': 'z-accent-cialo',
    'Endermologia': 'z-endermologia',
    'Endermologia lecznicza': 'z-endermologia',
    'Kriolipoliza': 'z-kriolipoliza',
    'Hydromasaż': 'zab-kropla',
    'Sauna Infrared': 'zab-zar',
    'Masaż twarzy': 'zab-dlonie',
    'Masaż peelingujący': 'zab-dlonie',
    'Masaż relaksacyjny': 'zab-dlonie',
    'Masaż olejkiem arganowym': 'zab-dlonie'
  };
  var KATEGORIE = [['all', 'Wszystko'], ['twarz', 'Twarz'], ['cialo', 'Ciało'], ['regen', 'Regeneracja']];

  /* Ile kart widać przed rozwinięciem: osiem na dużym ekranie, cztery
     na telefonie — inaczej trzeba przewijać pół strony, żeby minąć cennik. */
  var waskie = matchMedia('(max-width: 768px)');
  function naStart() { return waskie.matches ? 4 : 8; }

  var wrap = document.getElementById('cen-w');
  if (wrap) {
    var ile = document.getElementById('cen-ile');
    var wiecej = document.getElementById('cen-wiecej');
    var filtry = document.getElementById('cen-filtry');
    var tryby = document.querySelectorAll('.cen__tryb button');
    var widok = 'karty', pelne = false, kat = 'all';

    function wybrane() {
      return kat === 'all' ? ZABIEGI : ZABIEGI.filter(function (p) { return p[0] === kat; });
    }
    function odmiana(n) { return n === 1 ? 'pozycja' : (n < 5 ? 'pozycje' : 'pozycji'); }

    /* Pigułki kategorii z licznikiem — od razu widać, ile czego jest. */
    if (filtry) {
      filtry.innerHTML = KATEGORIE.map(function (k) {
        var n = k[0] === 'all' ? ZABIEGI.length
              : ZABIEGI.filter(function (p) { return p[0] === k[0]; }).length;
        return '<button type="button" data-kat="' + k[0] + '" aria-pressed="' + (k[0] === 'all') + '">' +
               k[1] + '<span>' + n + '</span></button>';
      }).join('');
      filtry.addEventListener('click', function (e) {
        var b = e.target.closest('button');
        if (!b || b.dataset.kat === kat) return;
        kat = b.dataset.kat; pelne = false; rysuj();
      });
    }

    function zdjecie(kategoria, nazwa) {
      /* Klucz „kategoria|nazwa" wyprzedza samą nazwę: Accent Prime na twarz
         i na ciało to ten sam aparat przy dwóch różnych zabiegach.
         Brak wpisu znaczy brak kadru — karta zostaje ciemna i czytelna. */
      var plik = FOTO[kategoria + '|' + nazwa] || FOTO[nazwa];
      if (!plik) return '';
      return '<img class="karta__f" src="assets/img/' + plik + '.webp" alt="" ' +
             'width="760" height="950" loading="lazy" decoding="async">';
    }

    function rysuj() {
      var wsz = wybrane();
      var lista = (widok === 'karty' && !pelne) ? wsz.slice(0, naStart()) : wsz;

      if (ile) ile.textContent = wsz.length + ' ' + odmiana(wsz.length);

      wrap.className = 'cen__w rv on cen__w--' + widok;
      wrap.innerHTML = lista.map(function (p) {
        var czas = p[3] ? '<p class="karta__t">' + p[3] + '</p>' : '';
        if (widok === 'karty') {
          return '<article class="karta">' + zdjecie(p[0], p[1]) +
            '<p class="karta__e">' + p[1] + '</p>' +
            '<h3 class="karta__n">' + p[2] + '</h3>' + czas.replace('karta__t', 'karta__t') +
            '<p class="karta__c">' + p[4] + '</p>' +
            '<span class="karta__w">Dowiedz się więcej' +
            '<svg class="ic" aria-hidden="true"><use href="#i-strzalka"/></svg></span></article>';
        }
        return '<div class="poz">' +
          '<div><p class="poz__e">' + p[1] + '</p><p class="poz__n">' + p[2] +
          (p[3] ? ' <em>· ' + p[3] + '</em>' : '') + '</p></div>' +
          '<span class="poz__c">' + p[4] + '</span></div>';
      }).join('');

      if (wiecej) {
        wiecej.hidden = (widok === 'lista' || pelne || wsz.length <= naStart());
        wiecej.querySelector('span').textContent = 'Pokaż pozostałe ' + (wsz.length - naStart());
      }
      tryby.forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.widok === widok)); });
      if (filtry) filtry.querySelectorAll('button').forEach(function (b) {
        b.setAttribute('aria-pressed', String(b.dataset.kat === kat));
      });
    }

    tryby.forEach(function (b) {
      b.addEventListener('click', function () {
        if (widok === b.dataset.widok) return;
        widok = b.dataset.widok;
        rysuj();
      });
    });
    if (wiecej) wiecej.addEventListener('click', function () { pelne = true; rysuj(); });
    var przyProgu = function () { if (!pelne) rysuj(); };
    waskie.addEventListener ? waskie.addEventListener('change', przyProgu)
                            : waskie.addListener(przyProgu);
    rysuj();
  }

  /* ── Pasek wezwania na telefonie ────────────────────────────
     Między hero a placówką nie było żadnej drogi do umówienia się.
     Pasek wchodzi po minięciu hero i chowa się nad stopką, żeby nie
     przykrywał jej treści. */
  var pasekCta = document.querySelector('.cta-pasek');
  if (pasekCta) {
    var stopkaEl = document.querySelector('.stopka');
    var stanP = false;
    function sprawdzP() {
      var y = window.pageYOffset || 0;
      var przedStopka = !stopkaEl || stopkaEl.getBoundingClientRect().top > innerHeight - 40;
      var pokaz = y > innerHeight * 0.9 && przedStopka;
      if (pokaz !== stanP) { stanP = pokaz; pasekCta.hidden = !pokaz; }
    }
    addEventListener('scroll', sprawdzP, { passive: true });
    sprawdzP();
  }
})();
