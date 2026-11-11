// Tests : révéler plusieurs fois la même carte (clics répétés, deux onglets) ne crée jamais de copie en plus (0.26.2). Textes inventés.   node --test tests/
import test from "node:test";
import assert from "node:assert/strict";
import { texteCarte } from "../src/mj/revelations.js";
import { creerRegie } from "../src/mj/regie.js";
import { FicheExiste, ConflitEcriture } from "../src/graph/client.js?v=0.26.2";   // même version que la régie : sinon deux classes FicheExiste différentes

const pause = () => new Promise(r => setTimeout(r, Math.random() * 4));
/** Faux OneDrive avec versions (eTag) et délais aléatoires : les appels simultanés s'entremêlent vraiment. */
function fauxDepot(fichiers) {
  const m = new Map(Object.entries(fichiers).map(([k, v]) => [k, { texte: v, v: 1 }]));
  return {
    m,
    async lister(chemin) {
      await pause();
      const p = chemin + "/", noms = new Map();
      for (const k of m.keys()) if (k.startsWith(p)) { const [a, ...b] = k.slice(p.length).split("/"); noms.set(a, b.length > 0); }
      return noms.size ? { donnees: [...noms].map(([name, dir]) => ({ name, dir })) } : { absent: true };
    },
    async lire(chemin) { await pause(); return { texte: m.has(chemin) ? m.get(chemin).texte : null }; },
    async lireFiche(chemin) { await pause(); const f = m.get(chemin); return f ? { texte: f.texte, etag: "v" + f.v } : null; },
    async creer(chemin, texte) { await pause(); if (m.has(chemin)) throw new FicheExiste(chemin); m.set(chemin, { texte, v: 1 }); return {}; },
    async modifier(chemin, texte, etag) {
      await pause();
      const f = m.get(chemin);
      if (!f) throw new ConflitEcriture(chemin, "disparue");
      if (etag !== "v" + f.v) throw new ConflitEcriture(chemin, "modifiee");
      m.set(chemin, { texte, v: f.v + 1 }); return {};
    }
  };
}
const PROFIL = {
  securite: { coffre: "MJ", joueurs: "Joueurs" },
  collections: [{ id: "quete", dossier: "MJ/02_Campagne/Quetes" }],
  joueur_modele: { dossiers: [{ id: "savoirs", dossier: "Savoirs" }, { id: "quetes", dossier: "Quetes" }, { id: "rencontres", dossier: "Rencontres" }, { id: "inventaire", dossier: "Inventaire" }] }
};
const depart = () => fauxDepot({
  "MJ/04_Revelations/Quetes/La_cloche.md": texteCarte({ type: "quete", titre: "La cloche", texte: "Mira cherche la cloche." }),
  "Joueurs/Ana/Quetes/03_Le_phare.md": "---\ntitre: Le phare\n---\n",
  "Joueurs/Tom/Quetes/03_Le_phare.md": "---\ntitre: Le phare\n---\n"
});
const copies = depot => [...depot.m.keys()].filter(k => /^Joueurs\/.+\/Quetes\/\d+_La_cloche/.test(k)).sort();

test("cinq clics pendant l'envoi : une seule copie par joueur", async () => {
  const depot = depart();
  const regie = creerRegie({ profil: PROFIL, depot, maintenant: () => new Date(2026, 0, 2) });
  const ligne = (await regie.catalogue("quete")).lignes.find(l => l.titre === "La cloche");
  const r = await Promise.all(Array.from({ length: 5 }, () => regie.reveler(ligne, ["Ana", "Tom"])));
  assert.deepEqual(copies(depot), ["Joueurs/Ana/Quetes/04_La_cloche.md", "Joueurs/Tom/Quetes/04_La_cloche.md"]);
  assert.equal(r.reduce((n, x) => n + x.faits.length, 0), 2, "deux écritures en tout, pas dix");
});

test("un nouveau clic avec l'écran pas encore relu (ligne périmée) : rien de plus", async () => {
  const depot = depart();
  const regie = creerRegie({ profil: PROFIL, depot, maintenant: () => new Date(2026, 0, 2) });
  const perimee = (await regie.catalogue("quete")).lignes.find(l => l.titre === "La cloche");
  await regie.reveler(perimee, ["Ana", "Tom"]);
  const r = await regie.reveler(perimee, ["Ana", "Tom"]);
  assert.deepEqual(r.faits, []);
  assert.deepEqual(r.deja.sort(), ["Ana", "Tom"]);
  assert.equal(copies(depot).length, 2);
});

test("deux onglets qui révèlent en même temps : le nom réservé dans la carte les met d'accord", async () => {
  const depot = depart();
  const a = creerRegie({ profil: PROFIL, depot, maintenant: () => new Date(2026, 0, 2) });
  const b = creerRegie({ profil: PROFIL, depot, maintenant: () => new Date(2026, 0, 2) });
  const la = (await a.catalogue("quete")).lignes.find(l => l.titre === "La cloche");
  const lb = (await b.catalogue("quete")).lignes.find(l => l.titre === "La cloche");
  await Promise.all([a.reveler(la, ["Ana", "Tom"]), b.reveler(lb, ["Ana", "Tom"]), a.reveler(la, ["Ana"])]);
  assert.equal(copies(depot).length, 2);
  assert.match(depot.m.get("MJ/04_Revelations/Quetes/La_cloche.md").texte, /^publie_sous: 04_La_cloche\.md$/m);
});
