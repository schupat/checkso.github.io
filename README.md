# schuele.xyz

Blog von Patrick Schüle — Arbeitsnotizen zu Microsoft-Infrastruktur, Entra ID, Azure,
Containern und Heimnetz. Gebaut mit [Astro](https://astro.build), gehostet auf GitHub Pages.

## Lokal starten

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # statisches Ergebnis in dist/
```

Node 22 oder neuer. Kein Ruby, kein Bundler, keine Submodule.

## Einen Artikel schreiben

Neue Datei unter `src/content/posts/`. **Der Dateiname wird zur URL** —
`Mein-Artikel.md` landet unter `/posts/Mein-Artikel/`. Kein Datum im Dateinamen.

```markdown
---
title: "Titel des Artikels"
date: 2026-08-03
categories: ["Microsoft", "Entra ID"]
tags: ["Entra ID", "Conditional Access"]
# Optional:
# description: "Eigener Teaser statt des ersten Absatzes"
# verified: 2026-08-03
# testedAgainst: "Entra Admin Center + Graph PowerShell 2.3"
# effort: "~20 Min"
# draft: true
---

Text …
```

`title` und `date` sind Pflicht. Fehlt eines, **bricht der Build ab** — der Artikel
verschwindet nicht stillschweigend, wie es bei Jekyll passieren konnte.

### Verifiziert-Siegel und Altersvermerk

Ohne `verified` zeigt ein Artikel ab 12 Monaten automatisch einen Altersvermerk.
Setzt du `verified` auf das Datum, an dem du die Anleitung zuletzt gegen die echte
Oberfläche geprüft hast, erscheint stattdessen ein grünes Siegel — und in der
Trefferliste steht „geprüft MM/JJ" statt „3 J. alt". Die Schwelle steht in
`src/lib/site.ts` unter `staleAfterMonths`.

## Aufbau

```
src/content/posts/    Artikel als Markdown
src/content.config.ts Schema — validiert das Frontmatter beim Build
src/lib/posts.ts      Sortierung, Frische, verwandte Artikel
src/lib/site.ts       Titel, Navigation, Umami, Schwellenwerte
src/pages/            Routen (Startseite, Artikel, Themen, Archiv, Feed, Suchindex)
src/styles/global.css Design-System: zwei Themes über CSS-Variablen
src/scripts/app.ts    Theme, Suche, Befehlspalette, Kopieren-Knopf
```

## Suche

`/search.json` wird zur Buildzeit erzeugt und beim ersten Tippen nachgeladen —
kein Server, kein Fremddienst. Die Startseite listet ohne JavaScript alle Artikel;
die Suche ist eine Verbesserung obendrauf, keine Voraussetzung.

Tastatur: `⌘K` / `Strg+K` öffnet die Befehlspalette, `/` springt ins Suchfeld,
`t` schaltet das Design um.

## Deploy

Push auf `main` startet `.github/workflows/pages-deploy.yml`: `npm ci`,
`astro check`, `astro build`, Upload nach GitHub Pages. Die Domain hängt an
`public/CNAME`.
