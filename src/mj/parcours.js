// Parcours de la campagne : l'ordre dans lequel le MJ range ses documents (sessions de jeu et lieux), en quatre colonnes.
// Le rangement est un fichier du coffre (`MJ/02_Campagne/Parcours.md`) : une section par colonne,
// une ligne « - session: fichier.md » ou « - lieu: fichier.md » par document. Sans DOM, sans réseau.
//
// Un document absent du fichier (nouveau, ou parcours jamais enregistré) est rangé d'après son état : rien n'est perdu, rien n'est deviné en silence
// au-delà de cette règle simple, et le MJ le déplace ensuite à la main.

export const COLONNES = [
  { cle: "prochaine", libelle: "Prochaine session", aide: "Ce que tu joues à la prochaine séance : l'écran « Séance » s'ouvre sur ces documents." },
  { cle: "suivre", libelle: "À suivre", aide: "Là où les joueurs iront sans doute ensuite." },
  { cle: "lointain", libelle: "Lointain", aide: "Préparé, mais pas pour tout de suite." },
  { cle: "joue", libelle: "Joué", aide: "Derrière eux." }
];
const TITRES = Object.fromEntries(COLONNES.map(c => [c.cle, c.libelle]));
const GENRES = ["session", "lieu"];
const cleDe = (genre, fichier) => `${genre}:${fichier}`;
const normTitre = s => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z]+/g, " ").trim();
const COLONNE_DE_TITRE = Object.fromEntries(COLONNES.map(c => [normTitre(c.libelle), c.cle]));

/** Lit le fichier du parcours. → { prochaine:[{genre,fichier}], suivre:[…], lointain:[…], joue:[…] } ; un texte absent donne quatre listes vides. */
export function lireParcours(texte) {
  const p = { prochaine: [], suivre: [], lointain: [], joue: [] };
  let col = null;
  const vus = new Set();
  for (const l of String(texte ?? "").replace(/\r\n/g, "\n").split("\n")) {
    const h = l.match(/^##\s+(.+?)\s*$/);
    if (h) { col = COLONNE_DE_TITRE[normTitre(h[1])] || null; continue; }
    const m = l.match(/^\s*[-*]\s+(session|lieu)\s*:\s*(.+?\.md)\s*$/i);
    if (!m || !col) continue;
    const e = { genre: m[1].toLowerCase(), fichier: m[2] };
    if (vus.has(cleDe(e.genre, e.fichier))) continue;      // un document n'est que dans une colonne : la première ligne gagne
    vus.add(cleDe(e.genre, e.fichier));
    p[col].push(e);
  }
  return p;
}

/** Texte du fichier du parcours. */
export function ecrireParcours(p) {
  let s = "---\ncollection: parcours\nvisibilite: secret\n---\n\n# Parcours de la campagne\n\nRangement des documents du MJ (écran d'accueil). Modifié par l'application : une ligne par document.\n";
  for (const c of COLONNES) {
    s += `\n## ${TITRES[c.cle]}\n\n`;
    for (const e of p[c.cle] || []) if (GENRES.includes(e.genre) && /\.md$/i.test(e.fichier)) s += `- ${e.genre}: ${e.fichier}\n`;
  }
  return s;
}

/** Colonne d'un document que le parcours ne connaît pas encore, d'après son état écrit dans sa fiche. */
function colonneParDefaut(doc, premiereSessionNonJouee) {
  if (doc.genre === "session") {
    if (doc.statut === "jouee") return "joue";
    if (doc.statut === "prete") return "prochaine";
    return doc.fichier === premiereSessionNonJouee ? "suivre" : "lointain";
  }
  if (doc.etat === "joue") return "joue";
  if (doc.etat === "en_cours") return "suivre";
  return "lointain";
}

/**
 * Range les documents connus (sessions, lieux) dans les colonnes.
 * @param {object} parcours  lireParcours(...)
 * @param {object[]} sessions  lireSessionMJ(...) (déjà triées)   @param {object[]} lieux  lireLieuMJ(...) (déjà triés)
 * @returns {{prochaine:object[], suivre:object[], lointain:object[], joue:object[]}}  chaque document : { genre, fichier, cle, titre, sous, ... }
 */
export function rangerParcours(parcours, sessions = [], lieux = []) {
  const docs = new Map();
  for (const s of sessions) docs.set(cleDe("session", s.fichier), { ...s, genre: "session", cle: cleDe("session", s.fichier), sous: [s.saison != null ? `Saison ${s.saison}` : "", s.lieu].filter(Boolean).join(" · ") });
  for (const l of lieux) docs.set(cleDe("lieu", l.fichier), { ...l, genre: "lieu", cle: cleDe("lieu", l.fichier), sous: [l.type, l.region].filter(Boolean).join(" · ") });
  const out = { prochaine: [], suivre: [], lointain: [], joue: [] };
  const places = new Set();
  for (const c of COLONNES) for (const e of parcours[c.cle] || []) {
    const d = docs.get(cleDe(e.genre, e.fichier));
    if (d && !places.has(d.cle)) { out[c.cle].push(d); places.add(d.cle); }     // un fichier disparu du coffre sort simplement du parcours
  }
  const premiere = (sessions.find(s => s.statut !== "jouee" && s.statut !== "prete") || {}).fichier;
  for (const d of docs.values()) if (!places.has(d.cle)) out[colonneParDefaut(d, premiere)].push(d);
  return out;
}

/** Le parcours (listes de { genre, fichier }) tel qu'il est rangé à l'écran : c'est lui qu'on enregistre. */
export function parcoursDepuisRangement(range) {
  const p = {};
  for (const c of COLONNES) p[c.cle] = (range[c.cle] || []).map(d => ({ genre: d.genre, fichier: d.fichier }));
  return p;
}

/**
 * Déplace un document : vers la colonne `colonne`, avant le document de clé `avant` (ou à la fin si `avant` est absent ou inconnu).
 * → un NOUVEAU rangement ; l'ancien n'est pas modifié. Un document inconnu ou une colonne inconnue ne change rien.
 */
export function deplacer(range, cle, colonne, avant = null) {
  if (!COLONNES.some(c => c.cle === colonne)) return range;
  let doc = null;
  const out = {};
  for (const c of COLONNES) out[c.cle] = (range[c.cle] || []).filter(d => { if (d.cle === cle) { doc = d; return false; } return true; });
  if (!doc) return range;
  const i = avant && avant !== cle ? out[colonne].findIndex(d => d.cle === avant) : -1;
  if (i < 0) out[colonne].push(doc); else out[colonne].splice(i, 0, doc);
  return out;
}

/** Monte (-1) ou descend (+1) un document dans sa colonne (pour le téléphone et le clavier, où l'on ne glisse pas). */
export function decaler(range, cle, sens) {
  for (const c of COLONNES) {
    const l = range[c.cle] || [], i = l.findIndex(d => d.cle === cle);
    if (i < 0) continue;
    const j = i + (sens < 0 ? -1 : 1);
    if (j < 0 || j >= l.length) return range;
    const n = [...l]; [n[i], n[j]] = [n[j], n[i]];
    return { ...range, [c.cle]: n };
  }
  return range;
}
