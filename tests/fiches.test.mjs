// Tests du repérage des fiches dans un document importé (personnages, lieux, quêtes, objets, factions, créatures). Texte inventé.   node --test tests/
import test from "node:test";
import assert from "node:assert/strict";
import { detecterFiches, rapprocher, texteFiche, decomposerTitre } from "../src/import/fiches.js";
import { parseDoc, getSection } from "../src/md/doc.js";

const DOC = [
  "### I — PRÉSENTATION", "", "Une ville de pêcheurs.", "",
  "### II — LIEUX CLÉS", "", "#### La Taverne du Flot — Auberge", "", "On y boit.", "", "#### Le Phare", "", "Éteint.", "",
  "### III — PNJ — FICHES COMPLÈTES", "", "#### Mira Ardent — Marchande (suspecte)", "", "Une femme pressée.", "", "🗣 **Dialogue**", "", "**🗣  Mira**", "", "Bonjour.", "",
  "⚔️ **Fiche**", "", "**📦  Mira — Fiche de Combat**", "", "PV : 12", "", "🔴 **Secret MJ**", "", "Elle espionne.", "",
  "#### Tom &amp; Lia — Les jumeaux  ★", "", "Deux gamins.", "",
  "### IV — RELATIONS ENTRE PNJ PRINCIPAUX", "", "#### Mira et Tom", "", "Ils se détestent.", "",
  "### V — HOOKS", "", "#### HOOK 1 — Le Trésor du Phare", "", "🆕 **Alerte / Quête**", "", "**🆕  Quête débloquée**", "", "→ Porteurs : Mira.", "",
  "### VI — LA NUIT", "", "🆕 **Alerte / Quête**", "", "**🆕  Quête débloquée / Alerte**", "", "Quête débloquée — Les Filets Volés (Tom)", "", "Retrouver les filets.", "",
  "⚔️ **Fiche**", "", "**📦  Lanterne d'Ambre — Objet unique (remis par Mira)**", "", "Éclaire les mensonges.", "",
  "⚔️ **Fiche**", "", "**📦  Garde du port — Sentinelle**", "", "PV : 20   CaC : 60", "",
  "⚔️ **Fiche**", "", "**📦  Chose étrange**", "", "On ne sait pas.", "",
  "#### Faction — Les Veilleurs du Quai", "", "Ils surveillent.", "",
  "### VII — BESTIAIRE", "", "#### Crabe de Vase — nuisible", "", "⚔️ **Fiche**", "", "PV : 4", ""
].join("\n").replace(/&amp;/g, "&");

test("repérage : chaque genre par sa structure, sans doublon", () => {
  const c = detecterFiches(DOC);
  const par = g => c.filter(x => x.genre === g).map(x => x.nom);
  assert.deepEqual(par("lieu"), ["La Taverne du Flot", "Le Phare"]);
  assert.deepEqual(par("pnj"), ["Mira Ardent", "Tom & Lia", "Garde du port"]);                 // la scène « Relations » n'en crée pas
  assert.deepEqual(par("quete"), ["Le Trésor du Phare", "Les Filets Volés"]);
  assert.deepEqual(par("objet"), ["Lanterne d'Ambre", "Chose étrange"]);
  assert.deepEqual(par("faction"), ["Les Veilleurs du Quai"]);
  assert.deepEqual(par("creature"), ["Crabe de Vase"]);
  const mira = c.find(x => x.nom === "Mira Ardent");
  assert.equal(mira.role, "Marchande (suspecte)");
  assert.match(mira.corps, /Une femme pressée[\s\S]*Bonjour/);
  assert.match(mira.stats, /PV : 12/);
  assert.equal(mira.secrets, "Elle espionne.");
  assert.doesNotMatch(mira.corps, /espionne|PV : 12/);
  assert.equal(c.find(x => x.nom === "Chose étrange").incertain, true);                         // rien ne dit ce que c'est : au MJ de choisir
  assert.equal(c.find(x => x.nom === "Lanterne d'Ambre").incertain, undefined);
  assert.equal(c.find(x => x.nom === "Garde du port").incertain, undefined);
  assert.deepEqual(decomposerTitre("HOOK 3 — Le Port & La Nuit"), { nom: "Le Port & La Nuit", role: "" });
  assert.deepEqual(decomposerTitre("Sir Bran, dit le Noir — Chevalier"), { nom: "Sir Bran, dit le Noir", role: "Chevalier" });
});

test("rapprochement avec le coffre : déjà là, nom voisin, nouveau", () => {
  const r = rapprocher(detecterFiches(DOC), { pnj: ["Mira_Ardent.md", "Tom.md"], lieu: ["Le_Phare_du_Nord.md"], quete: [] });
  const de = n => r.find(x => x.nom === n);
  assert.equal(de("Mira Ardent").existe, "Mira_Ardent.md");
  assert.equal(de("Tom & Lia").existe, null); assert.equal(de("Tom & Lia").proche, "Tom.md");
  assert.equal(de("Le Phare").proche, "Le_Phare_du_Nord.md");
  assert.equal(de("La Taverne du Flot").existe, null); assert.equal(de("La Taverne du Flot").proche, null);
});

test("fiche créée : format de sa collection, secrets à leur place, toujours au coffre", () => {
  const c = detecterFiches(DOC);
  const p = parseDoc(texteFiche(c.find(x => x.nom === "Mira Ardent"), { source: "07 - Port.docx", lieu: "Le Port", date: "2026-01-02" }));
  assert.equal(p.meta.nom, "Mira Ardent"); assert.equal(p.meta.role, "Marchande (suspecte)"); assert.equal(p.meta.lieu, "Le Port"); assert.equal(p.meta.visibilite, "secret"); assert.equal(p.meta.source_word, "07 - Port.docx");
  assert.match(getSection(p.body, "Statistiques"), /PV : 12/);
  assert.equal(getSection(p.body, "🔴 Secret MJ"), "Elle espionne.");
  assert.match(getSection(p.body, "Fiche complète (source)"), /Une femme pressée/);
  for (const t of ["Apparence", "Personnalité", "Motivations", "Dettes ouvertes"]) assert.ok(p.body.includes(`## ${t}`));
  const q = parseDoc(texteFiche(c.find(x => x.genre === "quete" && x.nom === "Les Filets Volés")));
  assert.equal(q.meta.titre, "Les Filets Volés"); assert.equal(q.meta.statut, "idée"); assert.equal(q.meta.visibilite, "secret");
  assert.match(getSection(q.body, "Objectif"), /Retrouver les filets/);
  for (const g of ["lieu", "objet", "faction", "creature"]) assert.equal(parseDoc(texteFiche(c.find(x => x.genre === g))).meta.visibilite, "secret");
  assert.throws(() => texteFiche({ genre: "session", nom: "x", corps: "", stats: "", secrets: "", role: "" }));
});
