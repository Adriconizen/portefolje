// Henter alle bomstasjoner i Norge fra NVDB API (Statens vegvesen) og
// beriker med kommunenavn fra SSBs Klass-API. Skriver resultatet til
// data/bomstasjoner.json, som er det statiske kartet leser fra.

import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const NVDB_URL = "https://nvdbapiles.atlas.vegvesen.no/vegobjekter/45";
const KLASS_URL =
  "https://data.ssb.no/api/klass/v1/classifications/131/codes?from=2026-01-01&to=2026-01-02";

async function hentKommunenavn() {
  const resp = await fetch(KLASS_URL);
  if (!resp.ok) throw new Error(`SSB Klass svarte ${resp.status}`);
  const data = await resp.json();
  const kart = new Map();
  for (const c of data.codes) kart.set(c.code, c.name.split(" - ")[0]);
  return kart;
}

function finnEgenskap(egenskaper, navn) {
  return egenskaper.find((e) => e.navn === navn)?.verdi ?? null;
}

async function hentAlleBomstasjoner() {
  const alle = [];
  let url = `${NVDB_URL}?inkluder=geometri,egenskaper,lokasjon&antall=100&srid=4326`;

  let side = 1;
  while (url) {
    console.log(`  side ${side}: ${url}`);
    const resp = await fetch(url, {
      headers: { "X-Client": "bomstasjonkart-prototype" },
      signal: AbortSignal.timeout(15000),
    });
    if (!resp.ok) throw new Error(`NVDB API svarte ${resp.status}: ${await resp.text()}`);
    const data = await resp.json();
    if (data.objekter.length === 0) break; // NVDB kan gi en "neste"-lenke selv på tom siste side
    alle.push(...data.objekter);
    console.log(`  hentet ${data.objekter.length} (totalt så langt: ${alle.length})`);
    url = data.metadata?.neste?.href ?? null;
    side += 1;
  }

  return alle;
}

function parsePunkt(wkt) {
  const match = (wkt ?? "").match(/POINT\s*Z?\s*\(([-\d.]+)\s+([-\d.]+)/);
  return match ? { lat: Number(match[1]), lon: Number(match[2]) } : null;
}

function normaliser(obj, kommunenavn) {
  const e = obj.egenskaper;
  const punkt = parsePunkt(obj.geometri?.wkt) ?? parsePunkt(obj.lokasjon?.geometri?.wkt);
  const lat = punkt?.lat ?? null;
  const lon = punkt?.lon ?? null;
  const kommuneNr = obj.lokasjon?.kommuner?.[0]?.toString() ?? null;

  return {
    id: obj.id,
    navn: finnEgenskap(e, "Navn bomstasjon"),
    anlegg: finnEgenskap(e, "Navn bompengeanlegg"),
    type: finnEgenskap(e, "Bomstasjonstype"),
    taksLitenBil: finnEgenskap(e, "Takst liten bil"),
    rushtidstakstLitenBil: finnEgenskap(e, "Rushtidstakst liten bil"),
    takstStorBil: finnEgenskap(e, "Takst stor bil"),
    rushtidstakstStorBil: finnEgenskap(e, "Rushtidstakst stor bil"),
    tidsdifferensiert: finnEgenskap(e, "Tidsdifferensiert takst") === "Ja",
    lenke: finnEgenskap(e, "Lenke til bomstasjon"),
    kommuneNr,
    kommune: kommuneNr ? kommunenavn.get(kommuneNr) ?? null : null,
    lat,
    lon,
  };
}

async function main() {
  console.log("Henter kommunenavn fra SSB...");
  const kommunenavn = await hentKommunenavn();

  console.log("Henter bomstasjoner fra NVDB...");
  const raa = await hentAlleBomstasjoner();
  console.log(`Fant ${raa.length} bomstasjoner.`);

  const bomstasjoner = raa
    .map((o) => normaliser(o, kommunenavn))
    .filter((b) => b.lat && b.lon);

  const ut = path.join(__dirname, "data", "bomstasjoner.json");
  await writeFile(
    ut,
    JSON.stringify(
      { hentetDato: new Date().toISOString().slice(0, 10), bomstasjoner },
      null,
      2,
    ),
    "utf-8",
  );
  console.log(`Skrev ${bomstasjoner.length} bomstasjoner til ${ut}`);
}

main().catch((err) => {
  console.error("Feil:", err.message);
  process.exit(1);
});
