// Klient for Brønnøysundregistrenes åpne Enhetsregister-API.
// Dokumentasjon: https://data.brreg.no/enhetsregisteret/api/dokumentasjon

const BASE_URL = "https://data.brreg.no/enhetsregisteret/api/enheter";
const PAGE_SIZE = 100;
const MAX_PAGES = 20; // holder oss trygt under Brregs grense på 10 000 treff per søk

/**
 * Søk opp enheter registrert i en periode, filtrert på bransje/kommune.
 * @returns {Promise<object[]>} forenklede objekter, ett per selskap
 */
export async function searchNewEnheter({ naeringskoder, kommunenummer, fraDato, tilDato }) {
  const baseParams = {
    fraRegistreringsdatoEnhetsregisteret: fraDato,
    tilRegistreringsdatoEnhetsregisteret: tilDato,
    size: String(PAGE_SIZE),
  };
  if (naeringskoder?.length) baseParams.naeringskode = naeringskoder.join(",");
  if (kommunenummer?.length) baseParams.kommunenummer = kommunenummer.join(",");

  const resultater = [];
  let page = 0;

  while (page < MAX_PAGES) {
    const url = new URL(BASE_URL);
    for (const [k, v] of Object.entries({ ...baseParams, page: String(page) })) {
      url.searchParams.set(k, v);
    }

    const resp = await fetch(url);
    if (!resp.ok) {
      throw new Error(`Brreg API svarte ${resp.status} ${resp.statusText}`);
    }
    const data = await resp.json();

    const enheter = data._embedded?.enheter ?? [];
    for (const enhet of enheter) {
      resultater.push(normaliser(enhet));
    }

    const totalPages = data.page?.totalPages ?? 0;
    page += 1;
    if (page >= totalPages) break;
  }

  return resultater;
}

function normaliser(enhet) {
  const adresse = enhet.forretningsadresse ?? {};
  const naering = enhet.naeringskode1 ?? {};
  return {
    orgnr: enhet.organisasjonsnummer,
    navn: enhet.navn,
    naeringskode: naering.kode ?? null,
    naeringsbeskrivelse: naering.beskrivelse ?? null,
    kommune: adresse.kommune ?? null,
    kommunenummer: adresse.kommunenummer ?? null,
    poststed: adresse.poststed ?? null,
    registreringsdato: enhet.registreringsdatoEnhetsregisteret ?? null,
    url: `https://virksomhet.brreg.no/nb/oppslag/enheter/${enhet.organisasjonsnummer}`,
  };
}
