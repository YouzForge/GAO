// Tests : préparer une carte à révéler depuis une fiche du coffre (0.26). Textes inventés : aucun contenu de jeu.   node --test tests/
import test from "node:test";
import assert from "node:assert/strict";
import { carteDepuisFiche, ligneDeFiche, aplatirTitres, texteCarte, lireCarte, texteJoueur, construireCatalogue, modifierCarte } from "../src/mj/revelations.js";
import { creerRegie } from "../src/mj/regie.js";
import { FicheExiste } from "../src/graph/client.js";
import { parseDoc } from "../src/md/doc.js";

const FICHE_PNJ = `---
nom: Mira
role: marchande du port, espionne en secret
lieu: Le Port
statut: vivant
visibilite: secret
---

# Mira

## Apparence

Cheveux roux, manteau vert.

## Personnalité

## Motivations

Rembourser la dette de son frère.

## 🔴 Secret MJ

Elle renseigne la guilde des ombres.

## Fiche complète (source)

### Mira — marchande
🔴 **Secret MJ**

Elle cache une lettre sous son comptoir.
`;

test("carte depuis une fiche : rien n'est écrit pour les joueurs, tout le texte de la fiche va dans la vérité", () => {
  const c = carteDepuisFiche("pnj", FICHE_PNJ, "Mira.md", { prevu: "03_Le_port.md" });
  assert.equal(c.type, "rencontre");
  assert.equal(c.titre, "Mira");
  assert.equal(c.texte, "");
  assert.equal(c.prevu, "03_Le_port.md");
  assert.equal(c.ficheSource, "pnj:Mira.md");
  for (const mot of ["Cheveux roux", "dette de son frère", "guilde des ombres", "lettre sous son comptoir", "espionne"]) assert.match(c.verite, new RegExp(mot));
  // aucun titre « ## » dans la vérité : il ouvrirait une section que les joueurs liraient
  assert.doesNotMatch(c.verite, /^\s*#/m);
  // les rubriques vides ne sont pas recopiées
  assert.doesNotMatch(c.verite, /Personnalité/);
});

test("carte depuis une fiche, enregistrée sans rien toucher : la version joueur ne contient rien de la fiche", () => {
  const champs = carteDepuisFiche("pnj", FICHE_PNJ, "Mira.md", { prevu: "03_Le_port.md" });
  const carte = texteCarte(champs);
  const lu = lireCarte(carte, "Mira.md", "rencontre");
  assert.equal(lu.ficheSource, "pnj:Mira.md");
  assert.equal(lu.corpsJoueur.replace(/##\s*(Présentation|Ma note)\s*/g, "").trim(), "");
  assert.match(lu.verite, /guilde des ombres/);
  const j = texteJoueur(carte, { date: "2026-01-01" });
  assert.ok(j);
  for (const mot of ["Cheveux", "roux", "dette", "guilde", "lettre", "espionne", "marchande", "Le Port", "fiche_source", "prevu", "Vérité", "Apparence"]) assert.doesNotMatch(j, new RegExp(mot), mot);
  const d = parseDoc(j);
  assert.equal(d.meta.titre, "Mira");
  assert.equal(d.meta.visibilite, "accessible");
  // le MJ recopie ensuite une phrase sûre : seule elle sort, la vérité reste au coffre
  const modif = modifierCarte(carte, { type: "rencontre", texte: "Une marchande du port, aimable." });
  const j2 = texteJoueur(modif);
  assert.match(j2, /aimable/);
  assert.doesNotMatch(j2, /guilde|lettre|fiche_source/);
});

test("carte depuis une fiche : quête et objet, et un genre sans carte", () => {
  const q = carteDepuisFiche("quete", "---\ntitre: La cloche perdue\nstatut: idée\nvisibilite: secret\n---\n\n# La cloche perdue\n\n## Objectif\n\nRetrouver la cloche.\n\n## 🔴 Vérité (MJ)\n\nTom l'a fondue.\n", "La_cloche_perdue.md");
  assert.equal(q.type, "quete");
  assert.equal(q.titre, "La cloche perdue");
  assert.match(q.verite, /Tom l'a fondue/);
  const tq = texteJoueur(texteCarte(q));
  assert.doesNotMatch(tq, /cloche\b.*fondue|Retrouver|Tom/);
  const o = carteDepuisFiche("objet", "---\nnom: Clé de cuivre\nvisibilite: secret\n---\n\n# Clé de cuivre\n\n## Description\n\nOuvre la crypte.\n", "Cle_de_cuivre.md");
  assert.equal(o.type, "objet");
  assert.doesNotMatch(texteJoueur(texteCarte(o)), /crypte/);
  assert.equal(carteDepuisFiche("lieu", "---\nnom: Le Port\n---\n", "Le_Port.md"), null);
  assert.equal(carteDepuisFiche("pnj", null, "X.md"), null);
});

test("aplatir les titres", () => {
  assert.equal(aplatirTitres("## Titre\ntexte\n### Sous ##\n#\n  #### Autre"), "**Titre**\ntexte\n**Sous**\n\n**Autre**");
  assert.equal(aplatirTitres("#hashtag reste"), "#hashtag reste");
});

test("une fiche qui a déjà sa carte la retrouve : par son lien, puis par le nom", () => {
  const carteLiee = lireCarte(texteCarte({ type: "rencontre", titre: "La marchande", ficheSource: "pnj:Mira.md" }), "La_marchande.md", "rencontre");
  const carteNom = lireCarte(texteCarte({ type: "rencontre", titre: "Tom" }), "Tom.md", "rencontre");
  const cat = construireCatalogue("rencontre", [carteLiee, carteNom], [{ pseudo: "Ana", fichiers: ["Le_Passeur.md"] }]);
  assert.equal(ligneDeFiche(cat.lignes, "pnj", "Mira.md", "Mira").carte.fichier, "La_marchande.md");
  assert.equal(ligneDeFiche(cat.lignes, "pnj", "Tom.md", "Tom").carte.fichier, "Tom.md");
  // publié avant la régie, sans carte : retrouvé par le nom de fichier chez un joueur
  assert.equal(ligneDeFiche(cat.lignes, "pnj", "Le_Passeur.md", "Le Passeur").fichier, "Le_Passeur.md");
  assert.equal(ligneDeFiche(cat.lignes, "pnj", "Inconnu.md", "Inconnu"), null);
});

/* ---------------------------------------------------------------- régie sur un faux OneDrive en mémoire */
function fauxDepot(fichiers) {
  const m = new Map(Object.entries(fichiers));
  return {
    m,
    async lister(chemin) {
      const p = chemin + "/", noms = new Map();
      for (const k of m.keys()) if (k.startsWith(p)) { const [a, ...b] = k.slice(p.length).split("/"); noms.set(a, b.length > 0); }
      return noms.size ? { donnees: [...noms].map(([name, dir]) => ({ name, dir })) } : { absent: true };
    },
    async lire(chemin) { return { texte: m.has(chemin) ? m.get(chemin) : null }; },
    async lireFiche(chemin) { return m.has(chemin) ? { texte: m.get(chemin), etag: "e1" } : null; },
    async creer(chemin, texte) { if (m.has(chemin)) throw new FicheExiste(chemin); m.set(chemin, texte); return {}; },
    async modifier(chemin, texte) { m.set(chemin, texte); return {}; }
  };
}
const PROFIL = {
  securite: { coffre: "MJ", joueurs: "Joueurs" },
  collections: [{ id: "pnj", dossier: "MJ/01_Univers/PNJ" }, { id: "quete", dossier: "MJ/02_Campagne/Quetes" }, { id: "objet", dossier: "MJ/01_Univers/Objets" }, { id: "lieu", dossier: "MJ/01_Univers/Lieux" }, { id: "session", dossier: "MJ/02_Campagne/Sessions" }],
  joueur_modele: { dossiers: [{ id: "savoirs", dossier: "Savoirs" }, { id: "quetes", dossier: "Quetes" }, { id: "rencontres", dossier: "Rencontres" }, { id: "inventaire", dossier: "Inventaire" }] }
};

test("régie : préparer les cartes de fiches importées, sans doublon et sans rien chez les joueurs", async () => {
  const depot = fauxDepot({
    "MJ/01_Univers/PNJ/Mira.md": FICHE_PNJ,
    "MJ/01_Univers/PNJ/Tom.md": "---\nnom: Tom\nvisibilite: secret\n---\n\n# Tom\n\n## Apparence\n\nGrand.\n",
    "MJ/01_Univers/Lieux/Le_Port.md": "---\nnom: Le Port\nvisibilite: secret\n---\n\n# Le Port\n",
    "MJ/04_Revelations/Rencontres/Tom.md": texteCarte({ type: "rencontre", titre: "Tom", texte: "Un pêcheur." }),
    "Joueurs/Ana/Rencontres/Autre.md": "---\ntitre: Autre\n---\n"
  });
  const regie = creerRegie({ profil: PROFIL, depot, maintenant: () => new Date(2026, 0, 2) });
  const r = await regie.creerCartesDepuisFiches([{ genre: "pnj", fichier: "Mira.md" }, { genre: "pnj", fichier: "Tom.md" }, { genre: "lieu", fichier: "Le_Port.md" }, { genre: "pnj", fichier: "Mira.md" }], { prevu: "03_Le_port.md" });
  assert.deepEqual(r.creees.map(c => c.titre), ["Mira"]);
  assert.deepEqual(r.deja, ["Tom", "Mira"]);
  const ecrite = depot.m.get("MJ/04_Revelations/Rencontres/Mira.md");
  assert.ok(ecrite);
  const d = parseDoc(ecrite);
  assert.equal(d.meta.prevu, "03_Le_port.md");
  assert.equal(d.meta.fiche_source, "pnj:Mira.md");
  assert.equal(d.meta.visibilite, "secret");
  // rien n'a été écrit chez les joueurs
  assert.deepEqual([...depot.m.keys()].filter(k => k.startsWith("Joueurs/")), ["Joueurs/Ana/Rencontres/Autre.md"]);
  // la carte attend, non révélée, et se retrouve par sa fiche
  const cat = await regie.catalogue("rencontre");
  const l = ligneDeFiche(cat.lignes, "pnj", "Mira.md", "Mira");
  assert.equal(l.etat, "a_reveler");
  // une révélation sans rien toucher ne publie rien de la fiche
  await regie.reveler(l, ["Ana"]);
  const chezAna = depot.m.get("Joueurs/Ana/Rencontres/Mira.md");
  assert.ok(chezAna);
  assert.doesNotMatch(chezAna, /roux|guilde|lettre|espionne|fiche_source|prevu/);
});
