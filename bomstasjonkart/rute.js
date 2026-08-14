// Ruteplanlegger: henter rute(r) fra OSRM (gratis, nøkkelfri routing-tjeneste)
// og regner ut hvilke bomstasjoner som ligger langs hver rute, slik at vi kan
// vise "raskeste rute" vs. "rimeligste/bomfri rute" side om side.
//
// Viktig forbehold: dette er IKKE en ekte "unngå bompenger"-rutemotor (det
// krever en betalt API som Google/Mapbox). Vi ber OSRM om alternative ruter
// (alternatives=true) og velger den med lavest summert bompenge-kostnad blant
// forslagene OSRM allerede gir oss.

const OSRM_URL = "https://router.project-osrm.org/route/v1/driving";
const BOM_TERSKEL_METER = 60; // hvor nær ruten en bomstasjon må ligge for å telles med

function meterPerGrad(breddegrad) {
  const lat = 111320;
  const lon = 111320 * Math.cos((breddegrad * Math.PI) / 180);
  return { lat, lon };
}

// Avstand (meter) fra punkt p til linjesegmentet a-b, med lokal planar-projeksjon.
function punktTilSegmentMeter(p, a, b) {
  const { lat: mLat, lon: mLon } = meterPerGrad(p[1]);
  const toXY = ([lon, lat]) => [(lon - p[0]) * mLon, (lat - p[1]) * mLat];
  const A = toXY(a);
  const B = toXY(b);
  const P = [0, 0];

  const dx = B[0] - A[0];
  const dy = B[1] - A[1];
  const lengdeKvadrat = dx * dx + dy * dy;
  let t = lengdeKvadrat === 0 ? 0 : ((P[0] - A[0]) * dx + (P[1] - A[1]) * dy) / lengdeKvadrat;
  t = Math.max(0, Math.min(1, t));

  const naermest = [A[0] + t * dx, A[1] + t * dy];
  return Math.hypot(P[0] - naermest[0], P[1] - naermest[1]);
}

function korteseAvstandTilRute(bomstasjon, koordinater) {
  const p = [bomstasjon.lon, bomstasjon.lat];
  let min = Infinity;
  for (let i = 0; i < koordinater.length - 1; i++) {
    const d = punktTilSegmentMeter(p, koordinater[i], koordinater[i + 1]);
    if (d < min) min = d;
    if (min < BOM_TERSKEL_METER) break; // godt nok, spar tid på lange ruter
  }
  return min;
}

function finnBomstasjonerLangsRute(koordinater, bomstasjoner) {
  return bomstasjoner.filter((b) => korteseAvstandTilRute(b, koordinater) <= BOM_TERSKEL_METER);
}

/**
 * @returns {Promise<Array<{geometri, distanseKm, varighetMin, bompengerSum, bomstasjoner}>>}
 * sortert med rimeligste (lavest bompengesum) først.
 */
export async function planlagRuter(fra, til, bomstasjoner) {
  const url = `${OSRM_URL}/${fra.lon},${fra.lat};${til.lon},${til.lat}?alternatives=true&overview=full&geometries=geojson`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`OSRM svarte ${resp.status}`);
  const data = await resp.json();
  if (data.code !== "Ok" || !data.routes?.length) {
    throw new Error("Fant ingen rute mellom punktene");
  }

  const ruter = data.routes.map((r) => {
    const koordinater = r.geometry.coordinates; // [lon, lat][]
    const bomLangsRuten = finnBomstasjonerLangsRute(koordinater, bomstasjoner);
    const bompengerSum = bomLangsRuten.reduce((sum, b) => sum + (b.taksLitenBil ?? 0), 0);
    return {
      geometri: koordinater.map(([lon, lat]) => [lat, lon]), // Leaflet vil ha [lat, lon]
      distanseKm: r.distance / 1000,
      varighetMin: r.duration / 60,
      bompengerSum,
      bomstasjoner: bomLangsRuten,
    };
  });

  ruter.sort((a, b) => a.bompengerSum - b.bompengerSum);
  return ruter;
}
