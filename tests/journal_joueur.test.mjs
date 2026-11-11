// Tests : le journal du joueur montre chaque compte rendu une fois, dans son bloc, avec les notes qui s'y rapportent (0.26.3). Textes inventés.   node --test tests/
import test from "node:test";
import assert from "node:assert/strict";
import { lireSession, regrouperJournal } from "../src/joueur/journal.js";
import { lireRecit, lireElement } from "../src/joueur/cartes.js";

const recit = (fichier, titre, session) => lireRecit(`---\ntitre: ${titre}\nsession: ${session}\nvisibilite: accessible\n---\n\n# ${titre}\n\n## Ce que tout le monde sait\n\nRécit de « ${titre} ».\n`, fichier);
const note = (fichier, titre, session) => lireElement(`---\ntitre: ${titre}\nsession: ${session}\n---\n\n# ${titre}\n\nNote de Mira.\n`, fichier);

test("lire le champ session : nombre, saison, « sessions 5 et 6 », « entre », « fin de la saison »", () => {
  assert.deepEqual(lireSession("7"), { saison: null, n: 7, ordre: 7, etiquette: "Session 7" });
  assert.deepEqual(lireSession("Saison 1 — Session 10"), { saison: 1, n: 10, ordre: 10, etiquette: "Saison 1" });
  assert.equal(lireSession("Saison 1 — Sessions 5 et 6").n, 5);
  assert.equal(lireSession("Saison 1 — Entre les sessions 8 et 10").ordre, 8.5);
  assert.equal(lireSession("Saison 1 — Fin de la saison 1").ordre, 9999);
  assert.deepEqual([lireSession("Saison 2 — session 1").saison, lireSession("Saison 2 — session 1").n], [2, 1]);
  assert.equal(lireSession("").etiquette, "Hors session");
});

// la même forme que le dossier réel : comptes rendus de la table en « Saison X — … », notes du joueur numérotées 1 à 9 avec les mêmes titres
const RECITS = [
  recit("S1.md", "Session 1 — Le port", "Saison 1 — Session 1"),
  recit("S2.md", "Session 2 — La cloche", "Saison 1 — Session 2"),
  recit("S5.md", "Sessions 5 et 6 — Le voyage", "Saison 1 — Sessions 5 et 6"),
  recit("S7.md", "Session 7 — Le marché", "Saison 1 — Session 7"),
  recit("S8.md", "Session 8 — La tour", "Saison 1 — Session 8"),
  recit("E.md", "Entre les sessions 8 et 10 — La place", "Saison 1 — Entre les sessions 8 et 10"),
  recit("S10.md", "Session 10 — Le départ", "Saison 1 — Session 10"),
  recit("F.md", "Fin de la saison 1 — Le temple", "Saison 1 — Fin de la saison 1"),
  recit("T1.md", "Saison 2, session 1 — L'arrivée", "Saison 2 — session 1")
];
const NOTES = [
  note("01.md", "Session 1 — Le port", 1), note("02.md", "Session 2 — La cloche", 2), note("05.md", "Sessions 5 et 6 — Le voyage", 5),
  note("06.md", "Session 7 — Le marché", 7), note("07.md", "Session 8 — La tour", 8), note("08.md", "Entre les sessions 8 et 10 — La place", 9),
  note("09.md", "Session 10 — Le départ", 10), note("10.md", "Fin de la saison 1 — Le temple", 10), note("11.md", "Saison 2, session 1 — L'arrivée", 11),
  note("12.md", "Ce que Tom m'a dit", 11), note("13.md", "Souvenir de la cloche", 2)
];

test("chaque compte rendu a son bloc, aucun n'en remplace un autre, et l'ordre suit saisons et sessions", () => {
  const blocs = regrouperJournal(RECITS, NOTES);
  const avecRecit = blocs.filter(b => b.recits.length);
  assert.equal(avecRecit.length, 9, "les 9 comptes rendus sont là");
  assert.ok(blocs.every(b => b.recits.length <= 1), "jamais deux comptes rendus dans un bloc");
  assert.deepEqual(avecRecit.map(b => b.titre), ["Saison 2, session 1 — L'arrivée", "Fin de la saison 1 — Le temple", "Session 10 — Le départ", "Entre les sessions 8 et 10 — La place",
    "Session 8 — La tour", "Session 7 — Le marché", "Sessions 5 et 6 — Le voyage", "Session 2 — La cloche", "Session 1 — Le port"]);
  assert.equal(avecRecit[0].etiquette, "Saison 2");
});

test("une note rejoint le compte rendu du même titre, sinon celui du même numéro (la saison la plus récente), sinon un bloc à elle", () => {
  const blocs = regrouperJournal(RECITS, NOTES);
  const de = t => blocs.find(b => b.titre === t);
  assert.deepEqual(de("Fin de la saison 1 — Le temple").notes.map(n => n.fichier), ["10.md"], "même titre, même si son numéro (10) est celui d'une autre session");
  assert.deepEqual(de("Session 10 — Le départ").notes.map(n => n.fichier), ["09.md"]);
  assert.deepEqual(de("Session 2 — La cloche").notes.map(n => n.fichier).sort(), ["02.md", "13.md"], "note libre de la session 2");
  const seule = blocs.find(b => !b.recits.length);
  assert.deepEqual(seule.notes.map(n => n.fichier), ["12.md"], "numéro 11 : aucun compte rendu de ce numéro, bloc de notes");
  assert.equal(blocs.reduce((n, b) => n + b.notes.length, 0), NOTES.length, "aucune note perdue");
});

test("une campagne numérotée simplement garde son ancien regroupement", () => {
  const blocs = regrouperJournal([recit("03.md", "Le phare", "3"), recit("04.md", "La tempête", "4")], [note("a.md", "Mon idée", 3), note("b.md", "Plus tard", 6)]);
  assert.deepEqual(blocs.map(b => [b.etiquette, b.recits.length, b.notes.length]), [["Session 6", 0, 1], ["Session 4", 1, 0], ["Session 3", 1, 1]]);
});
