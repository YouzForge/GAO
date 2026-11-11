// Tests : modifier une carte, un compte rendu ou une jauge ne recopie rien et ne perd rien (0.26.1). Textes inventés : aucun contenu de jeu.   node --test tests/
import test from "node:test";
import assert from "node:assert/strict";
import { texteCarte, lireCarte, modifierCarte, texteJoueur, carteDepuisFiche, ligneDeFiche, texteResume, lireResume, sansDoublons } from "../src/mj/revelations.js";
import { lireJauge, modifierJauge } from "../src/mj/jauges.js";
import { sansGrandsTitres, sections } from "../src/md/doc.js";

const titres = texte => [...String(texte).matchAll(/^## (.+)$/gm)].map(m => m[1].trim());
/** Ce que fait le formulaire : il relit la carte, montre texteMJ et la vérité, puis enregistre ce qu'il a montré (modifié ou non). */
const passerAuFormulaire = (texte, type, change = {}) => {
  const lu = lireCarte(texte, "x.md", type);
  return modifierCarte(texte, { type, titre: lu.titre, texte: lu.texteMJ, verite: lu.verite, ...change });
};

test("une carte préparée depuis une fiche se modifie plusieurs fois sans que le texte des joueurs se recopie", () => {
  const champs = carteDepuisFiche("quete", "---\nnom: La cloche perdue\n---\n\n# La cloche perdue\n\n## Objectif\n\nRetrouver la cloche.\n\n## 🔴 Vérité (MJ)\n\nTom l'a vendue.\n", "La_cloche_perdue.md");
  let c = texteCarte(champs);
  assert.equal(lireCarte(c, "x.md", "quete").texteMJ, "", "le formulaire ne montre que la section principale, vide au départ");
  c = passerAuFormulaire(c, "quete", { texte: "Mira cherche la cloche du port." });
  for (let i = 0; i < 4; i++) c = passerAuFormulaire(c, "quete");
  assert.deepEqual(titres(c), ["Ce que je sais", "Ce que j'ai fait", "🔴 Vérité MJ"]);
  assert.equal((c.match(/Mira cherche la cloche/g) || []).length, 1);
  assert.equal(lireCarte(c, "x.md", "quete").texteMJ, "Mira cherche la cloche du port.");
  assert.equal((c.match(/Tom l'a vendue/g) || []).length, 1, "la vérité ne se recopie pas non plus");
});

test("un titre « ## » tapé dans un texte devient du gras : il n'ouvre pas de section, ni chez les joueurs ni dans la vérité", () => {
  let c = texteCarte({ type: "rencontre", titre: "Tom", texte: "Un pêcheur.\n\n## Son bateau\n\nLa Mouette." });
  c = passerAuFormulaire(c, "rencontre", { verite: "Il ment.\n\n## Objectif\n\nIl veut le phare." });
  assert.deepEqual(titres(c), ["Présentation", "Ma note", "🔴 Vérité MJ"]);
  const j = texteJoueur(c);
  assert.match(j, /\*\*Son bateau\*\*/);
  assert.doesNotMatch(j, /phare|Il ment/, "rien de la vérité ne part chez le joueur");
  assert.equal(sansGrandsTitres("# A\n## B\n### C\n#mot"), "**A**\n**B**\n### C\n#mot");
});

test("les sections du coffre qui ne s'appellent pas « Vérité » ne se recopient pas dans la vérité", () => {
  let c = texteCarte({ type: "savoir", titre: "Le phare", texte: "Il est éteint.", verite: "Tom l'a éteint." }) + "\n## 🎲 Jets\n\nPerception 40.\n";
  for (let i = 0; i < 3; i++) c = passerAuFormulaire(c, "savoir");
  assert.equal((c.match(/Perception 40/g) || []).length, 1);
  assert.match(lireCarte(c, "x.md", "savoir").verite, /\*\*🎲 Jets\*\*\s+Perception 40/);
});

test("une carte déjà abîmée (sections recopiées) est réparée au prochain enregistrement, et sa version joueur n'a pas de doublon", () => {
  const abimee = `---\ntitre: La cloche\nstatut: en cours\npour: tous\nvisibilite: secret\n---\n# La cloche\n\n## Ce que je sais\n\nMira la cherche.\n\n## Ce que j'ai fait\n\nVu le port.\n\n## Ce que je sais\nMira la cherche.\n\n## Ce que j'ai fait\nVu le port.\n\n## Ce que j'ai fait\n\n## 🔴 Vérité MJ\n\nTom ment.\n`;
  const lu = lireCarte(abimee, "La_cloche.md", "quete");
  assert.equal(lu.texteMJ, "Mira la cherche.");
  assert.deepEqual(titres(texteJoueur(abimee)), ["Ce que je sais", "Ce que j'ai fait"]);
  const reparee = passerAuFormulaire(abimee, "quete");
  assert.deepEqual(titres(reparee), ["Ce que je sais", "Ce que j'ai fait", "🔴 Vérité MJ"]);
  assert.equal((reparee.match(/Mira la cherche/g) || []).length, 1);
  // deux textes différents sous le même titre : les deux restent (rien n'est jamais perdu)
  assert.deepEqual(sansDoublons(sections("## A\nun\n## A\ndeux\n## A\nun\n")).map(s => s.text.trim()), ["un", "deux"]);
});

test("modifier un compte rendu qui a plusieurs parties ne perd rien et ne recopie rien", () => {
  const brut = "---\ntitre: Session 2\nvisibilite: secret\n---\n\n# Session 2\n\n## Ce que tout le monde sait\n\nLe phare est rallumé.\n\n## Ce que Mira a promis\n\nUne cloche neuve.\n\n## 🔴 Notes MJ\n\nTom a menti.\n\n## 🎲 Jets\n\nPerception ratée.\n";
  const r1 = lireResume(brut, "Session_2.md");
  assert.match(r1.texte, /Le phare est rallumé[\s\S]*\*\*Ce que Mira a promis\*\*[\s\S]*Une cloche neuve/);
  const t2 = texteResume(r1), r2 = lireResume(t2, "Session_2.md");
  const t3 = texteResume(r2);
  assert.equal(t3, t2, "relire puis réenregistrer ne change plus rien");
  assert.match(t3, /Une cloche neuve/); assert.match(t3, /Perception ratée/); assert.match(t3, /Tom a menti/);
  assert.deepEqual(titres(t3), ["Ce que tout le monde sait", "🔴 Notes MJ"]);
});

test("régler une jauge garde le texte des paliers tel quel et écrit dans la section où il est lu", () => {
  const brut = "---\nnom: Menace\nactuelle: 10\nmax: 100\nvisibilite: secret\n---\n\n# Menace\n\n## Description\n\nLe culte avance.\n\n## Paliers\n\nLe culte se montre peu à peu.\n\n50 : Le port tremble\n- Les marchands partent.\n\n## Suivi\n";
  const j = lireJauge(brut, "Menace.md", "jauge");
  assert.match(j.textePaliers, /Le culte se montre peu à peu/);
  const t2 = modifierJauge(brut, { paliers: j.textePaliers + "\n100 : Le port tombe" });
  assert.deepEqual(titres(t2), ["Description", "Paliers", "Suivi"], "pas de seconde section de paliers");
  const j2 = lireJauge(t2, "Menace.md", "jauge");
  assert.deepEqual(j2.paliers.map(p => p.nom), ["Le port tremble", "Le port tombe"]);
  assert.match(j2.textePaliers, /Le culte se montre peu à peu/, "la ligne qui n'est pas un palier n'est pas perdue");
  const regler = t => { const x = lireJauge(t, "Menace.md", "jauge"); return modifierJauge(t, { nom: x.nom, max: x.max, paliers: x.textePaliers, description: x.description }); };
  const t3 = regler(t2);
  assert.equal(regler(t3), t3, "régler sans rien changer ne change plus rien");
  assert.equal(lireJauge(t3, "Menace.md", "jauge").textePaliers, j2.textePaliers);
});

test("une fiche reconnaît un élément déjà publié sous un nom plus court (trois mots au moins)", () => {
  const lignes = [{ titre: "Une alliance avec Tom", fichier: "13_Une_alliance_avec_Tom.md", carte: null, chez: { Ana: "13_Une_alliance_avec_Tom.md" } }];
  assert.equal(ligneDeFiche(lignes, "quete", "Une_alliance_avec_Tom_contre_le_culte.md", "Une alliance avec Tom contre le culte"), lignes[0]);
  assert.equal(ligneDeFiche([{ titre: "Le port", fichier: "Le_port.md", carte: null, chez: {} }], "quete", "Le_port_de_Mira.md", "Le port de Mira"), null, "deux mots ne suffisent pas");
});
