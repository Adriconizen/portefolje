# Bomstasjonkart

En installerbar PWA (progressiv webapp) med interaktivt kart over alle bomstasjoner i Norge — navn, takst (inkl. rushtidstakst), bompengeanlegg og kommune — hentet direkte fra Statens vegvesens åpne [NVDB API](https://nvdb-docs.atlas.vegvesen.no/category/nvdb-api-les-v4/) (vegobjekttype 45) og beriket med kommunenavn fra [SSBs Klass-API](https://data.ssb.no/api/klass/). I tillegg: ruteplanlegger som summerer bompenger langs en rute, via gratis OSRM-routing.

**Idé:** eksisterende bompenge-tjenester (bompengekalkulator.no, TollGuru m.fl.) er kalkulator-skjemaer — skriv inn rute, få en sum. Ingen av dem lar deg utforske bomstasjonene visuelt på et kart, eller sammenligne ruteforslag på faktisk bompenge-kostnad.

## Kjøre lokalt

```bash
node fetch-data.mjs   # henter/oppdaterer data/bomstasjoner.json (kjøres på nytt ved behov, prisene endres iblant)
node server.mjs        # starter en enkel statisk server på http://localhost:8123
```

Ingen eksterne npm-avhengigheter — bruker Node sin innebygde `fetch` og `http`-modul. Leaflet, Leaflet.markercluster og kartfliser (OpenStreetMap) lastes fra CDN i nettleseren.

## Installere som app (PWA)

Åpne siden på telefonen (må serves over HTTPS i produksjon) → "Legg til på hjemskjerm" (iOS Safari) eller "Installer app" (Android Chrome). Fungerer offline etter første besøk (app-skallet og sist hentede bomstasjon-data caches via en service worker med stale-while-revalidate-strategi).

## Funksjoner

- **Kart over alle 459 bomstasjoner**, klynget for lesbarhet, med søk/filter på navn, anlegg og kommune
- **"Bommer nær meg"**: bruker telefonens posisjon til å sentrere kartet
- **Ruteplanlegger** (trykk "🧭 Rute", velg start- og sluttpunkt på kartet): viser distanse, tid og summerte bompenger for ruten, med liste over hvilke bomstasjoner som ligger langs veien

### Om "bomfri-modus" / ruter sortert på pris

Ruteplanleggeren ber OSRM om alternative ruter (`alternatives=true`) og sorterer dem etter lavest bompenge-sum, slik at et billigere alternativ vises først dersom OSRM finner et reelt alternativ. **Viktig forbehold:** dette er ikke en ekte "unngå bompenger"-rutemotor som aktivt beregner en vei utenom bommer — det er et best-effort-valg blant ruteforslagene den gratis, nøkkelfrie OSRM-tjenesten allerede tilbyr. I testing ga OSRMs offentlige demo-server oftest kun ett ruteforslag selv der en omvei fantes. En ekte "tving unna bom"-algoritme krever en betalt/nøkkelbasert tjeneste (Mapbox Directions med `exclude=toll`, Google Routes API), som er en naturlig oppgradering hvis dette skal bli et ekte produkt.

## Status

Fungerende PWA-prototype: 459 bomstasjoner hentet og plottet med klynging, søk/filter, geolokasjon, og ruteplanlegger med bompenge-summering. Testet i nettleser (desktop og mobil-viewport 375×812) mot skarpe data.

## Neste steg mot et faktisk produkt

- [ ] PNG-ikonsett i flere oppløsninger (i dag kun SVG — fungerer på Android/desktop, men iOS "Legg til på hjemskjerm" faller tilbake til et automatisk skjermbilde siden `apple-touch-icon` helst vil ha PNG)
- [ ] Ekte "unngå bompenger"-ruting via en betalt API, hvis best-effort-tilnærmingen over ikke er god nok i praksis
- [ ] Filter på kjøretøytype (elbil-rabatt, tunge kjøretøy) og passeringsgruppe
- [ ] Planlagt re-kjøring av `fetch-data.mjs` (prisene endres et par ganger i året)
- [ ] Adressesøk (geokoding) i stedet for kun klikk-på-kart for start/mål i ruteplanleggeren
