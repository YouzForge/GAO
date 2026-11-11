// Tests des jauges du MJ (lecture, paliers, suivi, rangement en sections). Textes inventés : aucun contenu de jeu.   node --test tests/
import test from "node:test";
import assert from "node:assert/strict";
import { lirePaliers, palierDe, franchissement, effetsDe, lireJauge, texteJauge, modifierJauge, changerValeur, lireRangement, ecrireRangement, rangerJauges, rangementDepuis,
  deplacerJauge, ajouterSection, renommerSection, supprimerSection, decalerSection } from "../src/mj/jauges.js";

const OBJET = ["---", "nom: La Gourde", "type: magique", "porteur: Ana_Brune", "jauge_cachee: oui", "jauge_actuelle: 8", "jauge_max: 100", "visibilite: secret", "---", "", "# La Gourde", "",
  "## Description", "", "Une gourde.", "", "## Suivi MJ", "", "Notes libres du MJ.", "", "## 🔴 Paliers de la jauge", "", "**Déclenchement :** à chaque gorgée, lancer **1d6**.", "", "### Paliers", "",
  "**0–9 : Aucun effet**", "- Rien.", "", "**10–29 : Euphorie**", "- **+10% en combat**.", "- ⚙ Ana_Brune | Combat Rapproché | +10", "- Narration : elle rit.", "", "**30–99 : Dépendance**", "- –5% aux jets sociaux.", "",
  "**100 : Perdue**", "- Fin.", "", "## 🔴 Réductions de la jauge", "", "- Une semaine sobre : –1d6.", ""].join("\n");

test("paliers : lecture de la fiche d'un objet, palier courant, franchissement, effets", () => {
  const j = lireJauge(OBJET, "La_Gourde.md", "objet");
  assert.equal(j.nom, "La Gourde"); assert.equal(j.actuelle, 8); assert.equal(j.max, 100); assert.equal(j.porteur, "Ana Brune"); assert.equal(j.cle, "objet:La_Gourde.md");
  assert.deepEqual(j.paliers.map(p => [p.de, p.a, p.nom]), [[0, 9, "Aucun effet"], [10, 29, "Euphorie"], [30, 99, "Dépendance"], [100, 100, "Perdue"]]);
  assert.equal(j.paliers[1].lignes.length, 3);
  assert.equal(j.palier.nom, "Aucun effet");
  assert.equal(franchissement(j.paliers, 8, 9), null);
  const f = franchissement(j.paliers, 8, 12);
  assert.equal(f.palier.nom, "Euphorie"); assert.equal(f.ancien.nom, "Aucun effet"); assert.equal(f.sens, "monte");
  assert.equal(franchissement(j.paliers, 35, 20).sens, "descend");
  assert.deepEqual(effetsDe(f.palier), [{ cible: "Ana_Brune", quoi: "Combat Rapproché", valeur: 10 }]);
  assert.equal(palierDe(j.paliers, 100).nom, "Perdue");
  assert.deepEqual(lirePaliers("25-49 : Chantier\n- les murs montent\n50 : Toit posé\n100 % : Activé").map(p => [p.de, p.a, p.nom]), [[25, 49, "Chantier"], [50, 50, "Toit posé"], [100, 100, "Activé"]]);
  assert.equal(palierDe(lirePaliers("50 : Toit posé\n100 : Activé"), 70).nom, "Toit posé");   // seuils simples : le dernier atteint
  assert.equal(lireJauge("---\nnom: x\n---\n# x\n", "x.md", "objet"), null);
});

test("valeur : bornée, inscrite au suivi, le reste de la fiche intact", () => {
  const c = changerValeur(OBJET, "objet", 14, { date: "2026-01-02 21:05", note: "trois gorgées" });
  assert.equal(c.avant, 8); assert.equal(c.apres, 14);
  const j = lireJauge(c.texte, "La_Gourde.md", "objet");
  assert.equal(j.actuelle, 14); assert.equal(j.palier.nom, "Euphorie");
  assert.deepEqual(j.suivi, ["2026-01-02 21:05 : 8 → 14 (+6) · trois gorgées"]);
  assert.match(c.texte, /Notes libres du MJ\.\n- 2026-01-02 21:05/);
  assert.match(c.texte, /## 🔴 Réductions de la jauge\n\n- Une semaine sobre/);
  assert.equal(j.paliers.length, 4);
  assert.equal(changerValeur(c.texte, "objet", 500, { date: "d" }).apres, 100);
  assert.equal(changerValeur(c.texte, "objet", -3, { date: "d" }).apres, 0);
  assert.equal(changerValeur(c.texte, "objet", 14).texte, null);
  assert.throws(() => changerValeur(c.texte, "objet", "abc"));
});

test("jauge libre : création, réglages, suivi", () => {
  const t = texteJauge({ nom: "Temple du nord", max: 100, actuelle: 40, unite: "%", description: "Le chantier.", paliers: "50 : Toit posé\n100 : Activé\n- Le rituel commence." });
  let j = lireJauge(t, "Temple_du_nord.md", "jauge");
  assert.equal(j.actuelle, 40); assert.equal(j.unite, "%"); assert.equal(j.description, "Le chantier."); assert.equal(j.paliers.length, 2); assert.equal(j.palier, null);
  const c = changerValeur(t, "jauge", 55, { date: "2026-02-01 20:00" });
  j = lireJauge(modifierJauge(c.texte, { nom: "Temple du Nord", max: 200, paliers: "100 : Mi-chemin" }), "Temple_du_nord.md", "jauge");
  assert.equal(j.nom, "Temple du Nord"); assert.equal(j.max, 200); assert.equal(j.actuelle, 55); assert.deepEqual(j.suivi, ["2026-02-01 20:00 : 40 → 55 (+15)"]);
  assert.deepEqual(j.paliers.map(p => p.nom), ["Mi-chemin"]); assert.equal(j.description, "Le chantier.");
  assert.match(t, /visibilite: secret/);
});

test("rangement : sections par défaut, déplacements, sections", () => {
  const o = lireJauge(OBJET, "La_Gourde.md", "objet"), l = lireJauge(texteJauge({ nom: "Temple" }), "Temple.md", "jauge"), q = { ...lireJauge(texteJauge({ nom: "Menace" }), "Menace.md", "jauge"), section: "Quêtes" };
  let r = rangerJauges(lireRangement(null), [o, l, q]);
  assert.deepEqual(r.map(s => [s.titre, s.jauges.map(j => j.nom)]), [["Joueurs", ["La Gourde"]], ["Univers", ["Temple"]], ["Quêtes", ["Menace"]]]);
  r = ajouterSection(r, "Cultes"); r = ajouterSection(r, "cultes"); r = ajouterSection(r, "  ");
  assert.equal(r.length, 4);
  r = deplacerJauge(r, "jauge:Temple.md", 3); r = deplacerJauge(r, "jauge:Menace.md", 3, "jauge:Temple.md");
  assert.deepEqual(r[3].jauges.map(j => j.nom), ["Menace", "Temple"]);
  r = renommerSection(r, 3, "Culte du nord"); r = decalerSection(r, 3, -1);
  assert.deepEqual(r.map(s => s.titre), ["Joueurs", "Univers", "Culte du nord", "Quêtes"]);
  assert.equal(supprimerSection(r, 2).length, 4);          // non vide : refusé
  assert.equal(supprimerSection(r, 1).length, 3);          // vide : supprimée
  const relu = rangerJauges(lireRangement(ecrireRangement(rangementDepuis(r))), [o, l, q]);
  assert.deepEqual(relu.map(s => [s.titre, s.jauges.map(j => j.cle)]), r.map(s => [s.titre, s.jauges.map(j => j.cle)]));
  // une jauge supprimée du coffre sort du rangement ; une nouvelle y entre par défaut
  assert.deepEqual(rangerJauges(lireRangement(ecrireRangement(rangementDepuis(r))), [o]).map(s => s.jauges.length), [1, 0, 0, 0]);
});
