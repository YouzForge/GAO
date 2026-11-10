// Tests de la régie du MJ (révélations, parcours, séance). Textes inventés : aucun contenu de jeu.   node --test tests/
import test from "node:test";
import assert from "node:assert/strict";
import { texteCarte, lireCarte, texteJoueur, fusionner, copiePourAutreJoueur, nomPublie, nomDepuisTitre, construireCatalogue, filtrerCatalogue, compterCatalogue, lirePour, modifierCarte, poserChamp, ajouterAuJournal, ligneJournal } from "../src/mj/revelations.js";
import { lireParcours, ecrireParcours, rangerParcours, deplacer, decaler, parcoursDepuisRangement } from "../src/mj/parcours.js";
import { decouper, ficheMJ, blocsDe, entitesCitees, jaugeDe } from "../src/mj/seance.js";
import { parseDoc, getSection } from "../src/md/doc.js";

test("carte : la vérité du MJ et les champs du coffre ne sortent jamais", () => {
  const c = texteCarte({ type: "savoir", titre: "Le phare est éteint", texte: "Le gardien a disparu.", verite: "Le gardien est le traître.", pour: ["Ana", "Bo"], session: "4", lieu: "Le port", prevu: "07_Le_port.md" });
  const lu = lireCarte(c, "Le_phare.md", "savoir");
  assert.equal(lu.titre, "Le phare est éteint");
  assert.deepEqual(lu.pour, ["Ana", "Bo"]);
  assert.match(lu.verite, /traître/);
  assert.doesNotMatch(lu.corpsJoueur, /traître/);
  const j = texteJoueur(c, { date: "2026-01-02" });
  assert.doesNotMatch(j, /traître|Vérité|pour:|prevu:|secret/);
  const d = parseDoc(j);
  assert.equal(d.meta.visibilite, "accessible");
  assert.equal(d.meta.revele_le, "2026-01-02");
  assert.equal(d.meta.session, 4);
  assert.equal(getSection(d.body, "Ce que je sais"), "Le gardien a disparu.");
});

test("version joueur : une construction marquée dans le texte joueur est retirée, jamais publiée", () => {
  const c = texteCarte({ type: "savoir", titre: "T", texte: "Visible.\n\n> 🔴 caché dans une citation\n\nEncore visible." });
  const j = texteJoueur(c);
  assert.ok(j);
  assert.doesNotMatch(j, /caché/);
  assert.match(j, /Encore visible/);
});

test("mise à jour : les sections écrites par le joueur sont gardées", () => {
  const v1 = texteCarte({ type: "rencontre", titre: "Mira", texte: "Une marchande." });
  let chezJoueur = texteJoueur(v1, { date: "2026-01-01" });
  chezJoueur = chezJoueur.replace("## Ma note\n", "## Ma note\nJe ne lui fais pas confiance.\n");
  const v2 = modifierCarte(v1, { type: "rencontre", texte: "Une marchande, sœur du capitaine.", verite: "Elle ment." });
  const maj = fusionner(chezJoueur, v2, "rencontre", { date: "2026-01-05" });
  assert.match(maj, /sœur du capitaine/);
  assert.match(maj, /Je ne lui fais pas confiance/);
  assert.doesNotMatch(maj, /Elle ment/);
  // une quête : « Ce que j'ai fait » appartient au joueur
  const q = texteCarte({ type: "quete", titre: "Q", texte: "Étape 1." });
  const qj = texteJoueur(q).replace("## Ce que j'ai fait\n", "## Ce que j'ai fait\nJ'ai parlé au maire.\n");
  assert.match(fusionner(qj, modifierCarte(q, { type: "quete", texte: "Étape 2." }), "quete"), /Étape 2[\s\S]*J'ai parlé au maire/);
});

test("copie pour un autre joueur : sa note personnelle ne suit pas", () => {
  const src = "---\ntitre: Mira\nvisibilite: accessible\n---\n\n# Mira\n\n## Présentation\n\nUne marchande.\n\n## Ma note\n\nSecret de joueur.\n";
  const c = copiePourAutreJoueur(src, "rencontre", { date: "2026-02-02" });
  assert.match(c, /Une marchande/);
  assert.doesNotMatch(c, /Secret de joueur/);
  assert.match(c, /## Ma note/);
});

test("noms de fichiers publiés", () => {
  assert.equal(nomDepuisTitre("Le frère d'Ana est très loin !"), "Le_frere_d_Ana_est_tres_loin");
  assert.equal(nomPublie("savoir", "Un œuf", ["01_A.md", "40_B.md", "P1_C.md"]), "41_Un_oeuf.md");
  assert.equal(nomPublie("rencontre", "Mira", ["Mira.md"]), "Mira_2.md");
  assert.equal(nomPublie("quete", "X", []), "01_X.md");
  assert.equal(lirePour(""), "tous");
  assert.deepEqual(lirePour("Ana Brune, Cy"), ["Ana_Brune", "Cy"]);
});

test("catalogue : cartes du coffre et dossiers des joueurs réunis", () => {
  const carteNeuve = lireCarte(texteCarte({ type: "savoir", titre: "Neuf" }), "Neuf.md", "savoir");
  const cartePubliee = lireCarte(poserChamp(texteCarte({ type: "savoir", titre: "Déjà", pour: ["Ana"] }), "publie_sous", "02_Deja.md"), "Deja.md", "savoir");
  const cat = construireCatalogue("savoir", [carteNeuve, cartePubliee], [
    { pseudo: "Ana", fichiers: ["01_Vieux.md", "02_Deja.md"] }, { pseudo: "Bo", fichiers: ["01_Vieux.md"] }, { pseudo: "Cy", fichiers: null }]);
  assert.equal(cat.lignes.length, 3);
  const par = Object.fromEntries(cat.lignes.map(l => [l.titre, l]));
  assert.equal(par.Neuf.etat, "a_reveler");
  assert.equal(par["Déjà"].etat, "tous");            // prévue pour Ana seule, qui l'a
  assert.equal(par.Vieux.etat, "tous");
  assert.equal(par.Vieux.sur, 2);                    // Cy illisible : ne compte pas
  assert.equal(cat.lignes[0].titre, "Neuf");         // à révéler d'abord
  assert.deepEqual(compterCatalogue(cat.lignes), { total: 3, a_reveler: 1, partiel: 0, tous: 2 });
  assert.equal(filtrerCatalogue(cat.lignes, { etat: "a_reveler" }).length, 1);
  assert.equal(filtrerCatalogue(cat.lignes, { texte: "deja" }).length, 1);
});

test("journal", () => {
  const j = ajouterAuJournal(null, ligneJournal({ date: "2026-01-01 21:05", action: "révélé", type: "savoir", titre: "Neuf", joueurs: ["Ana_B", "Bo"] }));
  assert.match(j, /visibilite: secret/);
  assert.match(j, /- 2026-01-01 21:05 · révélé · savoir · Neuf · Ana B, Bo\n$/);
  assert.equal(ajouterAuJournal(j, "- x").split("\n- ").length, 3);
});

test("parcours : lecture, écriture, rangement par défaut, déplacements", () => {
  const sessions = [{ fichier: "01_A.md", titre: "A", statut: "jouee" }, { fichier: "02_B.md", titre: "B", statut: "idee" }, { fichier: "03_C.md", titre: "C", statut: "idee" }];
  const lieux = [{ fichier: "Port.md", titre: "Port", etat: "en_cours" }, { fichier: "Mont.md", titre: "Mont", etat: "a_venir" }];
  let r = rangerParcours(lireParcours(""), sessions, lieux);
  assert.deepEqual(r.joue.map(d => d.titre), ["A"]);
  assert.deepEqual(r.suivre.map(d => d.titre), ["B", "Port"]);
  assert.deepEqual(r.lointain.map(d => d.titre), ["C", "Mont"]);
  r = deplacer(r, "session:02_B.md", "prochaine");
  r = deplacer(r, "lieu:Mont.md", "prochaine", "session:02_B.md");
  assert.deepEqual(r.prochaine.map(d => d.titre), ["Mont", "B"]);
  r = decaler(r, "lieu:Mont.md", 1);
  assert.deepEqual(r.prochaine.map(d => d.titre), ["B", "Mont"]);
  const texte = ecrireParcours(parcoursDepuisRangement(r));
  const relu = rangerParcours(lireParcours(texte), sessions, lieux);
  assert.deepEqual(relu, r);
  // un fichier supprimé du coffre sort du parcours ; un nouveau y entre par défaut
  const relu2 = rangerParcours(lireParcours(texte), sessions.slice(0, 2), [...lieux, { fichier: "Neuf.md", titre: "Neuf", etat: "" }]);
  assert.ok(!Object.values(relu2).flat().some(d => d.titre === "C"));
  assert.ok(relu2.lointain.some(d => d.titre === "Neuf"));
});

test("séance : scènes, blocs marqués, fiche MJ, secrets", () => {
  const corps = ["# Doc", "", "## Déroulé des scènes", "", "### I — PRÉPARATION MJ", "", "#### ▸  Synopsis", "", "Tout commence au port.", "", "### II — LE PORT", "", "Prose libre.", "",
    "🗣 **Dialogue**", "", "**🗣  Mira**", "", "📖 **À lire**", "", "Bonjour, étrangers.", "", "🎲 **Note MJ**", "", "**🎲  Note MJ**", "", "Elle ment.", "",
    "🔴 **Secret MJ**", "", "Le capitaine est mort.", "", "⚔️ **Combat**", "", "| PV | 12 |", "", "## Moments pivots", "", "Le choix du phare."].join("\n");
  const sc = decouper(corps);
  assert.deepEqual(sc.map(s => s.titre), ["Déroulé des scènes", "I — PRÉPARATION MJ", "II — LE PORT", "Moments pivots"].filter((x, i) => i !== 0 || sc[0].titre === x));
  const port = sc.find(s => s.titre === "II — LE PORT");
  assert.deepEqual(port.blocs.map(b => b.cle), ["texte", "dialogue", "note", "secret", "combat"]);
  assert.equal(port.blocs[1].qui, "Mira");
  assert.equal(port.blocs[1].lire, true);
  assert.equal(port.blocs[1].texte, "Bonjour, étrangers.");
  assert.equal(port.blocs[2].texte, "Elle ment.");
  const f = ficheMJ(sc);
  assert.deepEqual(f.map(x => x.titre), ["I — PRÉPARATION MJ", "Moments pivots"]);
  const secrets = blocsDe(sc, "secret");
  assert.equal(secrets.length, 1);
  assert.equal(secrets[0].scene, "II — LE PORT");
  assert.equal(secrets[0].bloc.texte, "Le capitaine est mort.");
});

test("séance : fiches citées et jauges", () => {
  const e = [{ genre: "pnj", fichier: "Sir_Bran.md", nom: "Sir Bran" }, { genre: "pnj", fichier: "Mira.md", nom: "Mira" }, { genre: "lieu", fichier: "Port.md", nom: "Le Port d'Ambre" }, { genre: "pnj", fichier: "Al.md", nom: "Al" }, { genre: "pnj", fichier: "Tom_Garde.md", nom: "Tom Garde" }];
  const r = entitesCitees("Mira parle. Sir Bran arrive ; mira s'en va. Admirable. Le garde Al regarde.", e);
  assert.deepEqual(r.map(x => [x.nom, x.n]), [["Mira", 2], ["Sir Bran", 1], ["Tom Garde", 1]]);
  assert.deepEqual(jaugeDe({ jauge_max: 100, jauge_actuelle: 130 }), { actuelle: 100, max: 100 });
  assert.equal(jaugeDe({ nom: "x" }), null);
});
