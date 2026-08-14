#!/usr/bin/env node
// Bedriftsvarsel: varsle om nyregistrerte selskaper fra Brønnøysundregisteret.
//
// Eksempel:
//   node main.mjs --naeringskode 41.200,43.210 --kommune 0301 --dager 14

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { searchNewEnheter } from "./brreg-client.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_SEEN_FILE = path.join(__dirname, "seen.json");

function parseArgs(argv) {
  const args = { dager: 7, seenFile: DEFAULT_SEEN_FILE };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--naeringskode") args.naeringskode = argv[++i];
    else if (a === "--kommune") args.kommune = argv[++i];
    else if (a === "--dager") args.dager = Number(argv[++i]);
    else if (a === "--seen-file") args.seenFile = argv[++i];
  }
  return args;
}

async function lastSett(sti) {
  try {
    const raw = await readFile(sti, "utf-8");
    return new Set(JSON.parse(raw));
  } catch {
    return new Set();
  }
}

async function lagreSett(sti, orgnumre) {
  await writeFile(sti, JSON.stringify([...orgnumre].sort(), null, 2), "utf-8");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const naeringskoder = args.naeringskode ? args.naeringskode.split(",") : undefined;
  const kommunenummer = args.kommune ? args.kommune.split(",") : undefined;

  const tilDato = new Date();
  const fraDato = new Date(tilDato);
  fraDato.setDate(fraDato.getDate() - args.dager);
  const iso = (d) => d.toISOString().slice(0, 10);

  const treff = await searchNewEnheter({
    naeringskoder,
    kommunenummer,
    fraDato: iso(fraDato),
    tilDato: iso(tilDato),
  });

  const tidligereSett = await lastSett(args.seenFile);
  const nye = treff.filter((t) => !tidligereSett.has(t.orgnr));

  if (nye.length === 0) {
    console.log(`Ingen nye selskaper siden forrige kjøring (${treff.length} totalt i perioden, alle allerede sett).`);
  } else {
    console.log(`${nye.length} nye selskaper funnet (av ${treff.length} totalt i perioden):\n`);
    for (const enhet of nye) {
      console.log(`- ${enhet.navn} (${enhet.orgnr})`);
      console.log(`    Bransje:    ${enhet.naeringsbeskrivelse ?? "uoppgitt"} (${enhet.naeringskode ?? "-"})`);
      console.log(`    Sted:       ${enhet.poststed ?? "?"} (kommune ${enhet.kommunenummer ?? "?"})`);
      console.log(`    Registrert: ${enhet.registreringsdato}`);
      console.log(`    Lenke:      ${enhet.url}\n`);
    }
  }

  for (const t of treff) tidligereSett.add(t.orgnr);
  await lagreSett(args.seenFile, tidligereSett);
}

main().catch((err) => {
  console.error("Feil:", err.message);
  process.exit(1);
});
