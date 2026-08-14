# Bomstasjonkart

Et interaktivt kart over alle bomstasjoner i Norge — navn, takst (inkl. rushtidstakst), bompengeanlegg og kommune — hentet direkte fra Statens vegvesens åpne [NVDB API](https://nvdb-docs.atlas.vegvesen.no/category/nvdb-api-les-v4/) (vegobjekttype 45) og beriket med kommunenavn fra [SSBs Klass-API](https://data.ssb.no/api/klass/).

**Idé:** eksisterende bompenge-tjenester (bompengekalkulator.no, TollGuru m.fl.) er kalkulator-skjemaer — skriv inn rute, få en sum. Ingen av dem lar deg utforske bomstasjonene visuelt på et kart. Det gjør denne.

## Kjøre lokalt

```bash
node fetch-data.mjs   # henter/oppdaterer data/bomstasjoner.json (kjøres på nytt ved behov, prisene endres iblant)
node server.mjs        # starter en enkel statisk server på http://localhost:8123
```

Ingen eksterne npm-avhengigheter — bruker Node sin innebygde `fetch` og `http`-modul. Leaflet og kartfliser (OpenStreetMap) lastes fra CDN i nettleseren.

## Status

Fungerende prototype: 459 bomstasjoner hentet og plottet, med søk/filter på navn, bompengeanlegg og kommune. Testet i nettleser mot skarpe data.

## Neste steg mot et faktisk produkt

- [ ] Ruteplanlegging: la bruker velge start/slutt og summere bommer langs vanlig rute (uten å måtte kopiere den betalte rute-API-en til bompengekalkulator.no)
- [ ] Filter på kjøretøytype (elbil-rabatt, tunge kjøretøy) og passeringsgruppe
- [ ] Planlagt re-kjøring av `fetch-data.mjs` (prisene endres et par ganger i året)
- [ ] Klynging av markører ved lav zoom (mange bomstasjoner ligger tett i byene)
