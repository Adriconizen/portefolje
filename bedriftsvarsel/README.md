# Bedriftsvarsel

Et lite verktøy som varsler om nyregistrerte norske selskaper, filtrert på bransje og/eller kommune — hentet direkte fra Brønnøysundregistrenes åpne [Enhetsregister-API](https://data.brreg.no/enhetsregisteret/api/dokumentasjon).

**Idé:** selgere, forsikringsmeglere, regnskapsførere og andre som lever av å nå nye bedrifter først, vil vite med en gang det dukker opp et nytt firma i sin bransje/region — i stedet for å sjekke Brreg manuelt.

## Bruk

```bash
node main.mjs --naeringskode 41.000,43.220 --kommune 0301 --dager 7
```

- `--naeringskode` — kommaseparerte NACE-bransjekoder (finn koder på [ssb.no/klass/klassifikasjoner/6](https://www.ssb.no/klass/klassifikasjoner/6))
- `--kommune` — kommaseparerte kommunenumre (utelates for å søke i hele landet)
- `--dager` — hvor mange dager tilbake i tid som sjekkes (default 7)

Verktøyet husker hvilke organisasjonsnumre det allerede har vist frem (i `seen.json`), så neste kjøring viser bare *nye* treff siden sist — akkurat slik en varslingstjeneste skal oppføre seg.

## Status

Fungerende CLI-prototype, testet mot skarpe data fra Brreg. Ingen eksterne avhengigheter (bruker Node sin innebygde `fetch`).

## Neste steg mot et faktisk produkt

- [ ] Planlagt kjøring (cron / Windows Task Scheduler / GitHub Actions på schedule)
- [ ] Varsling via e-post eller Slack/Teams-webhook i stedet for kun terminalutskrift
- [ ] Enkelt web-grensesnitt der kunder selv setter opp sine filtre og betaler for abonnement
- [ ] Flere filtre: antall ansatte, org.form (AS vs. ENK), om det er registrert i MVA-registeret
