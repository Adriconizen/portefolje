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
      radius: 6,
      color: "#38bdf8",
      weight: 1,
      fillColor: "#0ea5e9",
      fillOpacity: 0.8,
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

  const lag = L.layerGroup(markorer.map((m) => m.marker)).addTo(kart);
  const antallVisElement = document.getElementById("antall-vist");
  const oppdaterAntallVist = (n) => {
    antallVisElement.textContent = `${n} av ${bomstasjoner.length} vist`;
  };
  oppdaterAntallVist(bomstasjoner.length);

  document.getElementById("sok").addEventListener("input", (e) => {
    const q = e.target.value.trim().toLowerCase();
    lag.clearLayers();
    let vist = 0;
    for (const { data, marker } of markorer) {
      const treff =
        !q ||
        data.navn?.toLowerCase().includes(q) ||
        data.anlegg?.toLowerCase().includes(q) ||
        data.kommune?.toLowerCase().includes(q);
      if (treff) {
        lag.addLayer(marker);
        vist += 1;
      }
    }
    oppdaterAntallVist(vist);
  });
}

main().catch((err) => {
  document.getElementById("kart").textContent = `Klarte ikke å laste kartdata: ${err.message}`;
});
