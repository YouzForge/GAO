// Séance : lecture d'un document de session (ou de lieu) pour la table de jeu. Sans DOM, sans réseau : tout se teste dans Node.
//
// Les documents du coffre viennent des documents Word du MJ : des scènes (« ### »), des sous-titres (« #### ») et des BLOCS annoncés par une marque en
// début de ligne (📖 à lire, 🗣 dialogue, 🎲 note MJ, 🔴 secret, ⚔️ combat, 🆕 alerte, ✅ récompense, ✉️ lettre). Un bloc court jusqu'à la marque ou au titre suivant.
// L'écran s'en sert pour colorer les blocs, tirer la « fiche MJ » (synopsis, compétences clés, tableau de bord…) et lister ce qu'il ne faut pas révéler.
import { norm } from "../md/doc.js?v=0.26.4";

export const MARQUES = [
  { marque: "📖", cle: "lire", libelle: "À lire" },
  { marque: "🗣", cle: "dialogue", libelle: "Dialogue" },
  { marque: "🎲", cle: "note", libelle: "Note MJ" },
  { marque: "🔴", cle: "secret", libelle: "Secret MJ" },
  { marque: "🔒", cle: "secret", libelle: "Conditionnel" },
  { marque: "⚔️", cle: "combat", libelle: "Combat" },
  { marque: "⚔", cle: "combat", libelle: "Combat" },
  { marque: "🆕", cle: "alerte", libelle: "Alerte / Quête" },
  { marque: "✅", cle: "recompense", libelle: "Récompense" },
  { marque: "✉️", cle: "lettre", libelle: "Lettre" },
  { marque: "✉", cle: "lettre", libelle: "Lettre" }
];
const INVISIBLES = /[​-‍︎️⁠]/g;
const nettoyer = s => String(s).replace(INVISIBLES, "");
const RE_MARQUE = new RegExp("^\\s*>?\\s*\\*{0,2}\\s*(" + MARQUES.map(m => nettoyer(m.marque)).filter((v, i, a) => a.indexOf(v) === i).join("|") + ")\\s*\\*{0,2}\\s*(.*?)\\s*\\*{0,2}\\s*$", "u");
const infoMarque = m => MARQUES.find(x => nettoyer(x.marque) === m);
const GENERIQUES = /^(à lire|a lire|dialogue|note mj|secret mj|secret|alerte\s*\/\s*quête|alerte|combat|récompense|lettre|texte à lire ou paraphraser|rappel)?$/i;

/**
 * Découpe le corps d'un document en scènes et en blocs.
 * @returns {{titre:string, niveau:number, blocs:{cle:string, libelle:string, qui:string, lire:boolean, texte:string}[]}[]}
 *   bloc `cle` : "texte" (prose ordinaire), "titre" (sous-titre « #### »), ou la clé d'une marque. `qui` : le personnage qui parle (dialogue) ou le titre du bloc.
 *   La première scène (avant tout titre) a un titre vide ; elle est omise si elle est vide.
 */
export function decouper(corps) {
  const scenes = [];
  let scene = { titre: "", niveau: 0, blocs: [] }, bloc = null;
  const fermer = () => { if (bloc) { bloc.texte = bloc.lignes.join("\n").replace(/\n{3,}/g, "\n\n").trim(); delete bloc.lignes; if (bloc.texte || bloc.cle === "titre") scene.blocs.push(bloc); bloc = null; } };
  const ouvrirScene = (titre, niveau) => { fermer(); if (scene.titre || scene.blocs.length) scenes.push(scene); scene = { titre, niveau, blocs: [] }; };
  for (const brut of String(corps ?? "").replace(/\r\n/g, "\n").split("\n")) {
    const l = nettoyer(brut);
    const t = l.match(/^(#{1,4})\s+(.+?)\s*$/);
    if (t) {
      if (t[1].length <= 3) { if (t[1].length > 1) ouvrirScene(t[2], t[1].length); continue; }   // « # titre du document » : ignoré
      fermer(); scene.blocs.push({ cle: "titre", libelle: "", qui: "", lire: false, texte: t[2].replace(/^▸\s*/, "") }); continue;
    }
    const m = l.match(RE_MARQUE);
    if (m) {
      const info = infoMarque(m[1]), etiquette = m[2].replace(/\*+/g, "").trim();
      const vide = bloc && bloc.cle !== "texte" && !bloc.lignes.some(x => x.trim());
      if (vide && bloc.cle === info.cle) { if (!GENERIQUES.test(etiquette)) bloc.qui = etiquette; continue; }         // la marque est répétée : seconde ligne = titre du bloc
      if (vide && bloc.cle === "dialogue" && info.cle === "lire") { bloc.lire = true; continue; }                          // « 🗣 Mira » puis « 📖 À lire » : une réplique à dire
      fermer();
      bloc = { cle: info.cle, libelle: info.libelle, qui: GENERIQUES.test(etiquette) ? "" : etiquette, lire: info.cle === "lire", lignes: [] };
      continue;
    }
    if (!bloc) bloc = { cle: "texte", libelle: "", qui: "", lire: false, lignes: [] };
    bloc.lignes.push(brut);
  }
  fermer();
  if (scene.titre || scene.blocs.length) scenes.push(scene);
  return scenes;
}

const RE_FICHE = /synopsis|comp[ée]tences? cl[ée]s?|tableau de bord|ne pas oublier|moments? pivots?|fins? possibles?|pr[ée]paration mj|r[ée]sum[ée] mj|ordre des sc[èe]nes/i;

/**
 * La « fiche MJ » d'un document : les passages de préparation (synopsis, compétences clés, moments pivots, fins possibles, tableau de bord).
 * → [{ titre, blocs }] : une entrée par scène entière dont le titre correspond, ou par sous-titre correspondant à l'intérieur d'une autre scène.
 */
export function ficheMJ(scenes) {
  const out = [];
  for (const s of scenes) {
    if (RE_FICHE.test(s.titre)) { if (s.blocs.some(b => b.texte && b.cle !== "titre")) out.push({ titre: s.titre, blocs: s.blocs }); continue; }
    let courant = null;
    for (const b of s.blocs) {
      if (b.cle === "titre") { courant = RE_FICHE.test(b.texte) ? { titre: b.texte, blocs: [] } : null; if (courant) out.push(courant); continue; }
      if (courant) courant.blocs.push(b);
    }
  }
  return out.filter(x => x.blocs.length);
}

/** Les blocs d'une clé donnée (« secret », « alerte »…), avec la scène où ils se trouvent. → [{ scene, index, bloc }] */
export function blocsDe(scenes, cle) {
  const out = [];
  scenes.forEach((s, i) => { for (const b of s.blocs) if (b.cle === cle) out.push({ scene: s.titre, index: i, bloc: b }); });
  return out;
}

const mots = s => " " + norm(s).replace(/_+/g, " ") + " ";

/**
 * Les fiches du coffre citées dans un texte (PNJ, lieux, quêtes, factions…), par nombre de citations.
 * @param {string} texte
 * @param {{genre:string, fichier:string, nom:string}[]} entites   `nom` : le nom affiché (« Sir Bran », « Tom et Lia »)
 * @returns {object[]}  les entités citées, avec `n` (nombre de citations), triées par n décroissant puis nom
 * Un nom de moins de 4 lettres n'est pas cherché (trop de faux positifs) ; un nom composé est aussi reconnu par son dernier mot s'il a 5 lettres ou plus
 * et n'est le dernier mot d'aucune autre fiche (« Sir Bran » → « Bran »).
 */
export function entitesCitees(texte, entites) {
  const T = mots(texte);
  const compter = aiguille => { let n = 0, i = 0; while ((i = T.indexOf(aiguille, i)) >= 0) { n++; i += aiguille.length - 1; } return n; };
  const derniers = new Map();
  for (const e of entites) { const d = norm(e.nom).split("_").pop(); derniers.set(d, (derniers.get(d) || 0) + 1); }
  const out = [];
  for (const e of entites) {
    const complet = norm(e.nom).replace(/_+/g, " ");
    if (complet.replace(/ /g, "").length < 4) continue;
    let n = compter(" " + complet + " ");
    const d = complet.split(" ").pop();
    if (complet.includes(" ") && d.length >= 5 && derniers.get(d) === 1) n = Math.max(n, compter(" " + d + " "));
    if (n) out.push({ ...e, n });
  }
  return out.sort((a, b) => (b.n - a.n) || a.nom.localeCompare(b.nom, "fr"));
}

/** Jauge d'un objet du coffre d'après son en-tête : { actuelle, max } ou null si l'objet n'a pas de jauge. */
export function jaugeDe(meta) {
  const max = Number(meta && meta.jauge_max);
  if (!Number.isFinite(max) || max <= 0) return null;
  const a = Number(meta.jauge_actuelle);
  return { actuelle: Number.isFinite(a) ? Math.max(0, Math.min(max, Math.trunc(a))) : 0, max: Math.trunc(max) };
}
