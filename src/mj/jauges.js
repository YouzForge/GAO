// Jauges du MJ : toutes les valeurs qui montent et descendent au fil de la campagne (objets magiques des joueurs, avancement d'un temple, menace, quête…).
// Sans DOM, sans réseau : tout se teste dans Node. Les jauges restent au coffre : aucun joueur ne les voit.
//
// Deux sortes de jauges, lues de la même façon :
//  - « objet » : la jauge d'un objet de l'univers (`MJ/01_Univers/Objets`), écrite dans sa fiche (`jauge_actuelle`, `jauge_max`, `porteur`) ;
//  - « jauge » : une jauge libre créée par le MJ (`MJ/02_Campagne/Jauges/<Nom>.md` : `actuelle`, `max`, `unite`).
// Les PALIERS sont écrits dans la fiche, section « 🔴 Paliers de la jauge » : une ligne « **10–29 : Nom** » (ou « 10-29 : Nom »), suivie de ses effets.
// Le RANGEMENT (sections et ordre) est un fichier du coffre, comme le parcours : une section par titre « ## », une ligne par jauge.
//
// Principe des DÉCLENCHEMENTS (posé ici, appliqué plus tard) : quand une valeur entre dans un nouveau palier, `franchissement` le dit ; l'écran l'annonce au MJ.
// Un palier pourra porter des effets lisibles par la machine (lignes « ⚙ … », voir `effetsDe`) que la régie proposera d'appliquer à la fiche d'un joueur.
import { parseDoc, serializeDoc, sections, setSection, getSection, norm, humanize, sansGrandsTitres } from "../md/doc.js?v=0.26.2";

export const DOSSIER_JAUGES = "Jauges";
export const FICHIER_RANGEMENT = "Rangement.md";
export const SECTIONS_PAR_DEFAUT = ["Joueurs", "Univers", "Quêtes"];
export const SECTION_PALIERS = "🔴 Paliers de la jauge";
const t = v => (v == null ? "" : String(v).trim());
const entier = (v, d = 0) => { const n = Math.trunc(Number(v)); return Number.isFinite(n) ? n : d; };
export const cleJauge = (genre, fichier) => `${genre}:${fichier}`;

/**
 * Paliers d'une jauge d'après le texte de sa section. Une ligne « **10–29 : Nom** », « 10-29 : Nom » ou « **100 : Nom** » ouvre un palier ;
 * les lignes suivantes (puces) sont ses effets. Les lignes « ### … » et « **Déclenchement :** … » ne sont pas des paliers.
 * @returns {{de:number, a:number, nom:string, lignes:string[]}[]}  rangés par seuil croissant
 */
export function lirePaliers(texte) {
  const out = []; let courant = null;
  for (const brut of String(texte ?? "").replace(/\r\n/g, "\n").split("\n")) {
    const l = brut.trim();
    const m = l.match(/^(?:[-*]\s+)?\*{0,2}\s*(\d{1,4})\s*(?:[–—-]\s*(\d{1,4}))?\s*%?\s*:\s*(.+?)\s*\*{0,2}\s*$/);
    if (m && !/^\*\*[^*\d]/.test(l)) {
      courant = { de: Number(m[1]), a: m[2] != null ? Number(m[2]) : Number(m[1]), nom: m[3].replace(/\*+/g, "").trim(), lignes: [] };
      if (courant.a < courant.de) [courant.de, courant.a] = [courant.a, courant.de];
      out.push(courant);
    } else if (courant && l && !/^#{1,6}\s/.test(l)) courant.lignes.push(l.replace(/^[-*]\s+/, ""));
    else if (/^#{1,6}\s/.test(l)) courant = null;
  }
  return out.sort((x, y) => x.de - y.de);
}
/** Le palier où se trouve une valeur : celui dont l'intervalle la contient, sinon le dernier dont le seuil est atteint. null si aucun. */
export function palierDe(paliers, valeur) {
  let trouve = null;
  for (const p of paliers || []) { if (valeur >= p.de && valeur <= p.a) return p; if (valeur >= p.de) trouve = p; }
  return trouve;
}
/** Changement de palier entre deux valeurs. → null si le palier ne change pas, sinon { palier (le nouveau, ou null), ancien, sens:"monte"|"descend" }. */
export function franchissement(paliers, avant, apres) {
  const a = palierDe(paliers, avant), b = palierDe(paliers, apres);
  if (a === b || (a && b && a.de === b.de)) return null;
  return { palier: b, ancien: a, sens: apres >= avant ? "monte" : "descend" };
}
/**
 * Effets d'un palier lisibles par la machine : lignes « ⚙ Cible | Ce qui change | Valeur » (par exemple « ⚙ Jeanne_Lenoir | Combat Rapproché | +10 »).
 * PRÉVU, pas encore appliqué : la régie s'en servira pour proposer la mise à jour de la fiche du joueur quand le palier est atteint.
 */
export function effetsDe(palier) {
  return (palier && palier.lignes || []).map(l => l.match(/^⚙\s*(.+?)\s*\|\s*(.+?)\s*\|\s*([+-]?\d+)\s*%?\s*$/)).filter(Boolean).map(m => ({ cible: m[1], quoi: m[2], valeur: Number(m[3]) }));
}

/**
 * Lit une jauge. `genre` : "objet" (fiche d'objet) ou "jauge" (jauge libre). → null si la fiche n'a pas de jauge (pas de maximum).
 * @returns {{genre, fichier, cle, nom, actuelle, max, unite, porteur, section, description, paliers, palier, suivi:string[]}|null}
 */
export function lireJauge(texte, fichier, genre) {
  const d = parseDoc(texte), m = d.meta;
  const max = entier(genre === "objet" ? m.jauge_max : m.max, 0);
  if (max <= 0) return null;
  const actuelle = Math.max(0, Math.min(max, entier(genre === "objet" ? m.jauge_actuelle : m.actuelle, 0)));
  const corps = d.body;
  const titrePaliers = (sections(corps).find(s => /paliers/i.test(s.title)) || {}).title;
  const paliers = titrePaliers ? lirePaliers(getSection(corps, titrePaliers)) : [];
  const titreSuivi = genre === "objet" ? "Suivi MJ" : "Suivi";
  const suivi = getSection(corps, titreSuivi).split("\n").map(l => l.trim()).filter(l => /^[-*]\s+\d{4}-\d{2}-\d{2}/.test(l)).map(l => l.replace(/^[-*]\s+/, ""));
  return {
    genre, fichier, cle: cleJauge(genre, fichier), nom: t(m.nom) || t(m.titre) || d.title || humanize(fichier),
    actuelle, max, unite: t(m.unite), porteur: t(m.porteur).replace(/_/g, " "), section: t(m.section),
    description: genre === "jauge" ? getSection(corps, "Description") : "", paliers, palier: palierDe(paliers, actuelle), suivi,
    // le texte des paliers TEL QU'IL EST ÉCRIT, pour le formulaire : le reconstruire depuis `paliers` perdait toute ligne qui n'est pas un palier
    textePaliers: titrePaliers ? getSection(corps, titrePaliers) : ""
  };
}

/** Texte d'une jauge libre neuve. `paliers` : texte libre, une ligne « 25-49 : Nom » par palier, ses effets en dessous. */
export function texteJauge({ nom, max = 100, actuelle = 0, unite = "", porteur = "", description = "", paliers = "" }) {
  if (!t(nom)) throw new Error("Nom manquant");
  const mx = Math.max(1, entier(max, 100));
  const meta = { nom: t(nom).replace(/\s*\n\s*/g, " "), actuelle: Math.max(0, Math.min(mx, entier(actuelle, 0))), max: mx };
  if (t(unite)) meta.unite = t(unite);
  if (t(porteur)) meta.porteur = t(porteur);
  meta.visibilite = "secret";
  return serializeDoc(meta, `\n# ${meta.nom}\n\n## Description\n\n${t(description)}\n\n## ${SECTION_PALIERS}\n\n${t(paliers)}\n\n## Suivi\n`);
}
/** Modifie les réglages d'une jauge libre (nom, maximum, unité, porteur, description, paliers) sans toucher à sa valeur ni à son suivi. */
export function modifierJauge(texte, { nom, max, unite, porteur, description, paliers }) {
  const d = parseDoc(texte), meta = { ...d.meta };
  let body = d.body;
  if (nom !== undefined && t(nom)) { meta.nom = t(nom).replace(/\s*\n\s*/g, " "); body = /^\s*#\s+.+$/m.test(body) ? body.replace(/^(\s*)#\s+.+$/m, `$1# ${meta.nom}`) : body; }
  if (max !== undefined) { meta.max = Math.max(1, entier(max, meta.max || 100)); meta.actuelle = Math.max(0, Math.min(meta.max, entier(meta.actuelle, 0))); }
  for (const [k, v] of [["unite", unite], ["porteur", porteur]]) if (v !== undefined) { if (t(v)) meta[k] = t(v); else delete meta[k]; }
  if (description !== undefined) body = setSection(body, "Description", t(description) ? "\n" + t(sansGrandsTitres(description)) : "");
  // les paliers s'écrivent dans la section où lireJauge les lit (la première dont le titre contient « paliers ») : écrire toujours dans
  // « 🔴 Paliers de la jauge » laissait l'ancienne section en place, relue à la place de la nouvelle
  const titrePaliers = (sections(body).find(s => /paliers/i.test(s.title)) || {}).title || SECTION_PALIERS;
  if (paliers !== undefined) body = setSection(body, titrePaliers, t(paliers) ? "\n" + t(sansGrandsTitres(paliers)) : "");
  const ordre = {}; for (const k of Object.keys(meta)) if (k !== "visibilite") ordre[k] = meta[k]; ordre.visibilite = "secret";
  return serializeDoc(ordre, "\n" + body.replace(/^\n+/, ""));
}
/**
 * Change la valeur d'une jauge et l'inscrit au suivi. → { texte, avant, apres, max } ; `texte` null si la valeur ne change pas.
 * La valeur est bornée entre 0 et le maximum. `date` : « 2026-11-11 21:05 » ; `note` : facultative (pourquoi).
 */
export function changerValeur(texte, genre, valeur, { date = "", note = "" } = {}) {
  const j = lireJauge(texte, "x.md", genre);
  if (!j) throw new Error("Cette fiche n'a pas de jauge");
  const v = entier(valeur, NaN);
  if (!Number.isFinite(v)) throw new Error("Valeur de jauge invalide");
  const apres = Math.max(0, Math.min(j.max, v));
  if (apres === j.actuelle) return { texte: null, avant: j.actuelle, apres, max: j.max };
  const d = parseDoc(texte);
  const meta = { ...d.meta, [genre === "objet" ? "jauge_actuelle" : "actuelle"]: apres };
  const titre = genre === "objet" ? "Suivi MJ" : "Suivi";
  const delta = apres - j.actuelle;
  const ligne = `- ${date} : ${j.actuelle} → ${apres} (${delta > 0 ? "+" : ""}${delta})${t(note) ? " · " + t(note).replace(/\s*\n\s*/g, " ") : ""}`;
  const ancien = getSection(d.body, titre);
  const body = setSection(d.body, titre, "\n" + (ancien ? ancien + "\n" : "") + ligne);
  return { texte: serializeDoc(meta, "\n" + body.replace(/^\n+/, "")), avant: j.actuelle, apres, max: j.max };
}

// ------------------------------------------------------------------ Rangement (sections et ordre)
/** Lit le rangement. → [{ titre, items:[{genre, fichier}] }] ; un texte absent donne les sections par défaut, vides. */
export function lireRangement(texte) {
  const out = []; let courante = null; const vus = new Set();
  for (const l of String(texte ?? "").replace(/\r\n/g, "\n").split("\n")) {
    const h = l.match(/^##\s+(.+?)\s*$/);
    if (h) { courante = out.find(s => norm(s.titre) === norm(h[1])); if (!courante) out.push(courante = { titre: h[1], items: [] }); continue; }
    const m = l.match(/^\s*[-*]\s+(objet|jauge)\s*:\s*(.+?\.md)\s*$/i);
    if (!m || !courante) continue;
    const k = cleJauge(m[1].toLowerCase(), m[2]);
    if (vus.has(k)) continue;
    vus.add(k); courante.items.push({ genre: m[1].toLowerCase(), fichier: m[2] });
  }
  for (const s of SECTIONS_PAR_DEFAUT) if (texte == null && !out.some(x => norm(x.titre) === norm(s))) out.push({ titre: s, items: [] });
  return out;
}
export function ecrireRangement(sectionsRangees) {
  let s = "---\ncollection: rangement_jauges\nvisibilite: secret\n---\n\n# Rangement des jauges\n\nSections et ordre de l'onglet « Jauges ». Modifié par l'application : une section par titre, une ligne par jauge.\n";
  for (const sec of sectionsRangees) {
    s += `\n## ${t(sec.titre).replace(/\s*\n\s*/g, " ") || "Sans titre"}\n\n`;
    for (const j of sec.items || sec.jauges || []) s += `- ${j.genre}: ${j.fichier}\n`;
  }
  return s;
}
/**
 * Range les jauges dans les sections. Une jauge absente du rangement va dans la section de sa fiche (`section:`) si elle existe, sinon :
 * un objet dans « Joueurs », une jauge libre dans « Univers ». → [{ titre, jauges:[…] }]
 */
export function rangerJauges(rangement, jauges) {
  const par = new Map(jauges.map(j => [j.cle, j]));
  const out = rangement.map(s => ({ titre: s.titre, jauges: [] }));
  const trouver = titre => out.find(s => norm(s.titre) === norm(titre));
  const placees = new Set();
  rangement.forEach((s, i) => { for (const it of s.items) { const j = par.get(cleJauge(it.genre, it.fichier)); if (j && !placees.has(j.cle)) { out[i].jauges.push(j); placees.add(j.cle); } } });
  for (const j of jauges) {
    if (placees.has(j.cle)) continue;
    const titre = j.section || (j.genre === "objet" ? SECTIONS_PAR_DEFAUT[0] : SECTIONS_PAR_DEFAUT[1]);
    let s = trouver(titre);
    if (!s) out.push(s = { titre, jauges: [] });
    s.jauges.push(j);
  }
  return out;
}
export const rangementDepuis = rangees => rangees.map(s => ({ titre: s.titre, items: s.jauges.map(j => ({ genre: j.genre, fichier: j.fichier })) }));
/** Déplace une jauge dans la section d'indice `versIndex`, avant la jauge de clé `avant` (ou à la fin). → nouveau rangement. */
export function deplacerJauge(rangees, cle, versIndex, avant = null) {
  if (!rangees[versIndex]) return rangees;
  let j = null;
  const out = rangees.map(s => ({ titre: s.titre, jauges: s.jauges.filter(x => { if (x.cle === cle) { j = x; return false; } return true; }) }));
  if (!j) return rangees;
  const i = avant && avant !== cle ? out[versIndex].jauges.findIndex(x => x.cle === avant) : -1;
  if (i < 0) out[versIndex].jauges.push(j); else out[versIndex].jauges.splice(i, 0, j);
  return out;
}
/** Sections : ajouter, renommer, supprimer (seulement vide), monter ou descendre. Un titre vide ou déjà pris ne change rien. */
export function ajouterSection(rangees, titre) {
  const n = t(titre).replace(/^#+\s*/, "").replace(/\s*\n\s*/g, " ");
  return !n || rangees.some(s => norm(s.titre) === norm(n)) ? rangees : [...rangees, { titre: n, jauges: [] }];
}
export function renommerSection(rangees, index, titre) {
  const n = t(titre).replace(/^#+\s*/, "").replace(/\s*\n\s*/g, " ");
  if (!n || !rangees[index] || rangees.some((s, i) => i !== index && norm(s.titre) === norm(n))) return rangees;
  return rangees.map((s, i) => (i === index ? { ...s, titre: n } : s));
}
export const supprimerSection = (rangees, index) => (rangees[index] && !rangees[index].jauges.length ? rangees.filter((_, i) => i !== index) : rangees);
export function decalerSection(rangees, index, sens) {
  const j = index + (sens < 0 ? -1 : 1);
  if (!rangees[index] || j < 0 || j >= rangees.length) return rangees;
  const n = [...rangees]; [n[index], n[j]] = [n[j], n[index]];
  return n;
}
