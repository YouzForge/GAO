// Journal du joueur : un bloc par compte rendu de la table, avec les notes de journal du joueur qui s'y rapportent. Sans DOM, sans réseau.
//
// Le champ `session` d'un compte rendu est un TEXTE court (Contrat de format §3) : « 7 », « Saison 1 — Session 10 », « Saison 1 — Sessions 5 et 6 »,
// « Saison 1 — Entre les sessions 8 et 10 », « Saison 1 — Fin de la saison 1 ». Les notes du joueur ont un numéro, qui ne suit pas forcément la même
// numérotation. Règles :
//  - chaque compte rendu a SON bloc : deux comptes rendus ne se remplacent jamais et ne se rangent jamais l'un dans l'autre ;
//  - une note va dans le bloc du compte rendu qui porte le même titre ; sinon dans celui du même numéro de session (le plus récent s'il y en a
//    plusieurs, une saison 2 avant une saison 1) ; sinon dans un bloc de notes à son numéro.
import { norm } from "../md/doc.js?v=0.27.0";

/**
 * Lit le champ `session` d'un compte rendu. → { saison, n, ordre, etiquette }
 * `n` : le numéro de session (null si aucun) ; `ordre` : position dans la saison (« entre 8 et 10 » = 8,5 ; « fin de la saison » = après tout).
 */
export function lireSession(valeur) {
  if (typeof valeur === "number" && Number.isFinite(valeur)) return { saison: null, n: Math.trunc(valeur), ordre: Math.trunc(valeur), etiquette: `Session ${Math.trunc(valeur)}` };
  const s = String(valeur ?? "").trim();
  if (/^\d+$/.test(s)) return lireSession(Number(s));
  const sa = s.match(/saison\s*(\d+)/i);
  const saison = sa ? Number(sa[1]) : null;
  const se = s.match(/sessions?\s*(\d+)/i);
  let n = se ? Number(se[1]) : null;
  if (n == null && !sa) { const x = s.match(/\d+/); n = x ? Number(x[0]) : null; }
  let ordre = n;
  if (n != null && /\bentre\b/i.test(s)) ordre = n + 0.5;
  else if (n == null && /\bfin\b/i.test(s)) ordre = 9999;
  else if (n == null && /(d[ée]but|prologue)/i.test(s)) ordre = 0;
  const etiquette = saison != null ? `Saison ${saison}` : n != null ? `Session ${n}` : "Hors session";
  return { saison, n, ordre, etiquette };
}

const cleTitre = t => norm(String(t || ""));
const ancre = t => norm(String(t || "")).replace(/_/g, "-").slice(0, 60) || "x";

/**
 * Regroupe les comptes rendus (`recits` : éléments lus avec leur `meta`) et les notes de journal du joueur (`notes`).
 * → [{ cle, session (numéro, pour une note ajoutée ici), saison, etiquette, titre, date, recits:[], notes:[], recit (le premier, compatibilité) }],
 *   du plus récent au plus ancien.
 */
export function regrouperJournal(recits, notes) {
  const blocs = [];
  for (const r of recits || []) {
    const brut = r.meta && r.meta.session != null && String(r.meta.session).trim() !== "" ? r.meta.session : r.session;
    const l = lireSession(brut);
    blocs.push({ cle: "r-" + ancre(r.fichier), session: l.n, saison: l.saison, ordre: l.ordre, etiquette: l.etiquette, titre: r.titre, date: r.date || "", recits: [r], notes: [], recit: r });
  }
  const parTitre = new Map(blocs.map(b => [cleTitre(b.titre), b]));
  const saisonDe = b => (b.saison == null ? 0 : b.saison);
  const notesSeules = new Map();
  for (const x of notes || []) {
    let b = parTitre.get(cleTitre(x.titre));
    if (!b && x.session != null) {
      const memes = blocs.filter(y => y.session === x.session && y.recits.length);
      if (memes.length) b = memes.sort((p, q) => saisonDe(q) - saisonDe(p))[0];
    }
    if (!b) {
      const k = x.session ?? "hors";
      b = notesSeules.get(k);
      if (!b) {
        b = { cle: "n-" + k, session: x.session ?? null, saison: null, ordre: x.session ?? -1, etiquette: x.session != null ? `Session ${x.session}` : "Hors session", titre: x.titre, date: "", recits: [], notes: [], recit: null };
        notesSeules.set(k, b); blocs.push(b);
      }
    }
    b.notes.push(x);
  }
  // du plus récent au plus ancien : saison, puis position dans la saison ; un bloc sans saison (numérotation simple) se range par son numéro
  const cle = b => [b.saison == null ? 0 : b.saison, b.ordre == null ? -1 : b.ordre];
  return blocs.sort((a, b) => { const [sa, oa] = cle(a), [sb, ob] = cle(b); return (sb - sa) || (ob - oa) || String(a.titre).localeCompare(String(b.titre), "fr"); });
}
