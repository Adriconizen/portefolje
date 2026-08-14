import { planlagRuter } from "./rute.js";

const kr = (verdi) => (verdi == null ? "–" : `${verdi.toFixed(0)} kr`);

async function main() {
  const resp = await fetch("data/bomstasjoner.json");
  const { hentetDato, bomstasjoner } = await resp.json();

  document.getElementById("antall-total").textContent = bomstasjoner.length;
  document.getElementById("hentet-dato").textContent = hentetDato;

  const kart = L.map("kart").setView([64.5, 12], 5);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap-bidragsytere",
    maxZoom: 19,
  }).addTo(kart);

  const markorer = bomstasjoner.map((b) => {
    const marker = L.circleMarker([b.lat, b.lon], {
      radius: 9,
      color: "#38bdf8",
      weight: 2,
      fillColor: "#0ea5e9",
      fillOpacity: 0.85,
    });

    marker.bindPopup(`
      <div class="popup">
        <h3>${b.navn ?? "Ukjent bomstasjon"}</h3>
        <div class="anlegg">${b.anlegg ?? ""}${b.kommune ? " · " + b.kommune : ""}</div>
        <table>
          <tr><td>Liten bil</td><td>${kr(b.taksLitenBil)}</td></tr>
          ${b.tidsdifferensiert ? `<tr><td>Rushtid, liten bil</td><td>${kr(b.rushtidstakstLitenBil)}</td></tr>` : ""}
          <tr><td>Stor bil</td><td>${kr(b.takstStorBil)}</td></tr>
          ${b.tidsdifferensiert ? `<tr><td>Rushtid, stor bil</td><td>${kr(b.rushtidstakstStorBil)}</td></tr>` : ""}
        </table>
        ${b.lenke ? `<br/><a href="https://${b.lenke.replace(/^https?:\/\//, "")}" target="_blank" rel="noopener">${b.lenke}</a>` : ""}
      </div>
    `);

    return { data: b, marker };
  });

  const lag = L.markerClusterGroup({
    maxClusterRadius: 50,
    spiderfyOnMaxZoom: true,
    disableClusteringAtZoom: 14,
  });
  lag.addLayers(markorer.map((m) => m.marker));
  kart.addLayer(lag);
  const antallVisElement = document.getElementById("antall-vist");
  const oppdaterAntallVist = (n) => {
    antallVisElement.textContent = `${n} av ${bomstasjoner.length} vist`;
  };
  oppdaterAntallVist(bomstasjoner.length);

  settOppFinnMeg(kart);
  settOppRuteplanlegger(kart, bomstasjoner);

  document.getElementById("sok").addEventListener("input", (e) => {
    const q = e.target.value.trim().toLowerCase();
    const synlige = markorer.filter(
      ({ data }) =>
        !q ||
        data.navn?.toLowerCase().includes(q) ||
        data.anlegg?.toLowerCase().includes(q) ||
        data.kommune?.toLowerCase().includes(q),
    );
    lag.clearLayers();
    lag.addLayers(synlige.map((s) => s.marker));
    oppdaterAntallVist(synlige.length);
  });
}

function settOppFinnMeg(kart) {
  const knapp = document.getElementById("finn-meg");
  const melding = document.getElementById("posisjon-melding");
  let posisjonMarkør = null;

  const visMelding = (tekst, varighetMs = 4000) => {
    melding.textContent = tekst;
    melding.classList.add("vis");
    if (varighetMs) setTimeout(() => melding.classList.remove("vis"), varighetMs);
  };

  if (!("geolocation" in navigator)) {
    knapp.disabled = true;
    knapp.title = "Posisjon støttes ikke i denne nettleseren";
    return;
  }

  knapp.addEventListener("click", () => {
    knapp.classList.add("laster");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        knapp.classList.remove("laster");
        const { latitude, longitude } = pos.coords;
        if (posisjonMarkør) kart.removeLayer(posisjonMarkør);
        posisjonMarkør = L.circleMarker([latitude, longitude], {
          radius: 8,
          color: "#f8fafc",
          weight: 3,
          fillColor: "#22c55e",
          fillOpacity: 1,
        }).addTo(kart);
        kart.setView([latitude, longitude], 12);
      },
      (feil) => {
        knapp.classList.remove("laster");
        const tekst =
          feil.code === feil.PERMISSION_DENIED
            ? "Du må gi tillatelse til posisjon for å bruke denne funksjonen."
            : "Klarte ikke å hente posisjonen din akkurat nå.";
        visMelding(tekst);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  });
}

function settOppRuteplanlegger(kart, bomstasjoner) {
  const knapp = document.getElementById("rute-toggle");
  const instruks = document.getElementById("rute-instruks");
  const panel = document.getElementById("rute-panel");

  const rutelag = L.layerGroup().addTo(kart);
  const punktlag = L.layerGroup().addTo(kart);

  let aktiv = false;
  let fra = null;
  let til = null;
  let ruter = [];

  const visInstruks = (tekst) => {
    instruks.textContent = tekst;
    instruks.classList.add("vis");
  };
  const skjulInstruks = () => instruks.classList.remove("vis");

  const nullstill = () => {
    fra = null;
    til = null;
    ruter = [];
    rutelag.clearLayers();
    punktlag.clearLayers();
    panel.classList.remove("vis");
    panel.innerHTML = "";
  };

  const settPunktMarkør = (latlng, farge, tekst) =>
    L.circleMarker(latlng, { radius: 9, color: "#f8fafc", weight: 2, fillColor: farge, fillOpacity: 1 })
      .bindTooltip(tekst, { permanent: false })
      .addTo(punktlag);

  const tegnRuter = () => {
    rutelag.clearLayers();
    ruter.forEach((r, i) => {
      const valgt = i === 0;
      L.polyline(r.geometri, {
        color: valgt ? "#22c55e" : "#64748b",
        weight: valgt ? 5 : 3,
        opacity: valgt ? 0.9 : 0.6,
      })
        .addTo(rutelag)
        .on("click", () => velgRute(i));
    });
  };

  const velgRute = (indeks) => {
    ruter = [ruter[indeks], ...ruter.filter((_, i) => i !== indeks)];
    tegnRuter();
    tegnPanel();
  };

  const tegnPanel = () => {
    if (!ruter.length) return;
    const kort = ruter
      .map((r, i) => {
        const erRimeligst = r.bompengerSum === Math.min(...ruter.map((x) => x.bompengerSum));
        const merkelapp = i === 0 ? (erRimeligst ? "Valgt · rimeligst" : "Valgt") : erRimeligst ? "Rimeligst" : "Alternativ";
        const stasjonsnavn = r.bomstasjoner.map((b) => b.navn).join(", ");
        return `
          <div class="rute-kort ${i === 0 ? "valgt" : ""}" data-indeks="${i}">
            <div class="tittel">
              <span>${merkelapp}</span>
              <span class="sum">${kr(r.bompengerSum)}</span>
            </div>
            <div class="detaljer">${r.distanseKm.toFixed(1)} km · ${Math.round(r.varighetMin)} min · ${r.bomstasjoner.length} bomstasjon(er)</div>
            ${stasjonsnavn ? `<div class="stasjoner">${stasjonsnavn}</div>` : `<div class="stasjoner">Ingen bomstasjoner funnet langs denne ruten</div>`}
          </div>
        `;
      })
      .join("");
    panel.innerHTML = `<button id="rute-lukk"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M4 4l16 16M20 4L4 20"/></svg> Lukk</button><div style="clear:both"></div>${kort}`;
    panel.classList.add("vis");

    panel.querySelectorAll(".rute-kort").forEach((el) => {
      el.addEventListener("click", () => velgRute(Number(el.dataset.indeks)));
    });
    document.getElementById("rute-lukk").addEventListener("click", () => {
      aktiv = false;
      knapp.classList.remove("aktiv");
      skjulInstruks();
      nullstill();
    });
  };

  const beregnRute = async () => {
    visInstruks("Beregner rute …");
    try {
      ruter = await planlagRuter(fra, til, bomstasjoner);
      tegnRuter();
      tegnPanel();
      const bounds = L.latLngBounds(ruter[0].geometri);
      kart.fitBounds(bounds, { padding: [40, 40] });
      skjulInstruks();
    } catch (err) {
      visInstruks(`Klarte ikke å beregne rute: ${err.message}`);
    }
  };

  knapp.addEventListener("click", () => {
    aktiv = !aktiv;
    knapp.classList.toggle("aktiv", aktiv);
    if (aktiv) {
      nullstill();
      visInstruks("Trykk på kartet for å velge startpunkt");
    } else {
      skjulInstruks();
      nullstill();
    }
  });

  kart.on("click", (e) => {
    if (!aktiv) return;
    if (!fra) {
      fra = { lat: e.latlng.lat, lon: e.latlng.lng };
      settPunktMarkør(e.latlng, "#22c55e", "Start");
      visInstruks("Trykk på kartet for å velge målpunkt");
    } else if (!til) {
      til = { lat: e.latlng.lat, lon: e.latlng.lng };
      settPunktMarkør(e.latlng, "#ef4444", "Mål");
      beregnRute();
    } else {
      // tredje trykk: start på nytt
      nullstill();
      fra = { lat: e.latlng.lat, lon: e.latlng.lng };
      settPunktMarkør(e.latlng, "#22c55e", "Start");
      visInstruks("Trykk på kartet for å velge målpunkt");
    }
  });
}

main().catch((err) => {
  document.getElementById("kart").textContent = `Klarte ikke å laste kartdata: ${err.message}`;
});
