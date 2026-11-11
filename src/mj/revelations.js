// Révélations : ce que le MJ donne aux joueurs (savoirs, quêtes, rencontres, objets). Sans DOM, sans réseau : tout se teste dans Node.
//
// Une CARTE est un fichier du coffre (`MJ/04_Revelations/<Type>/<nom>.md`). Elle contient exactement ce que le joueur recevra, plus ce qui ne sort jamais
// du coffre : des champs d'en-tête réservés (`pour`, `prevu`, `publie_sous`) et des sections marquées (🔴, « Vérité MJ », « Notes MJ »…).
// RÉVÉLER une carte à un joueur = écrire sa version joueur (`texteJoueur`) dans le dossier de ce joueur. La protection reste celle de OneDrive :
// un joueur ne lit que son dossier ; ce module garantit seulement que rien de marqué n'y est copié.
//
// Un élément déjà présent chez des joueurs mais sans carte au coffre (tout ce qui a été publié avant la régie) reste révélable aux autres :
// on recopie alors la version d'un joueur qui l'a, sans ses sections personnelles (« Ma note », « Ce que j'ai fait »).
import { parseDoc, serializeDoc, sections, setSection, getSection, norm, humanize, sansGrandsTitres } from "../md/doc.js?v=0.26.2";
import { masquerPourJoueur } from "../md/masque.js?v=0.26.2";

export const DOSSIER_REVELATIONS = "04_Revelations";

/** Les types révélables. `zone` : dossier du joueur (id de `profil.joueur_modele.dossiers`) ; `numerote` : le fichier publié reçoit un numéro d'ordre (« 41_ »). */
export const TYPES = [
  { id: "savoir", libelle: "Savoirs", singulier: "savoir", zone: "savoirs", dossier: "Savoirs", numerote: true, section: "Ce que je sais", perso: [] },
  { id: "quete", libelle: "Quêtes", singulier: "quête", zone: "quetes", dossier: "Quetes", numerote: true, section: "Ce que je sais", perso: ["Ce que j'ai fait"] },
  { id: "rencontre", libelle: "Rencontres", singulier: "rencontre", zone: "rencontres", dossier: "Rencontres", numerote: false, section: "Présentation", perso: ["Ma note"] },
  { id: "objet", libelle: "Objets", singulier: "objet", zone: "inventaire", dossier: "Objets", numerote: false, section: "Ce que je sais de cet objet", perso: [] }
];
export const typeDe = id => TYPES.find(t => t.id === id) || null;

/** Champs d'en-tête qui ne quittent jamais le coffre. */
export const CHAMPS_COFFRE = ["pour", "prevu", "publie_sous", "secret_mj", "notes_mj", "visibilite_interne", "jauge_cachee", "jauge_actuelle", "jauge_max", "collection", "fiche_source"];
/** Une section dont le titre contient l'un de ces mots (ou une marque) ne quitte jamais le coffre. */
const SECTION_COFFRE = /🔴|🔒|🎲|⚔️|🆕|secret mj|notes? mj|suivi mj|v[ée]rit[ée]|r[ée]serv[ée] mj/i;

const t = v => (v == null ? "" : String(v).trim());
const SANS_MD = n => String(n).replace(/\.md$/i, "");
const rendreSections = l => l.map(s => (s.title ? `## ${s.title}\n${s.text}` : s.text)).join("\n");
const estCoffre = s => !!(s.title && SECTION_COFFRE.test(s.title));
/** Titre gardé en gras devant un texte du coffre qui n'est pas « la » vérité (« 🎲 Jets », « Notes MJ »…), pour qu'il ne se perde pas une fois fusionné. */
const avecTitre = (s, motif) => (motif.test(s.title) ? s.text.trim() : `**${s.title}**\n\n${s.text.trim()}`);

/**
 * Sections répétées (même titre) : une section vide ou identique à une autre du même titre est retirée ; une vide est remplie par la suivante.
 * Deux textes DIFFÉRENTS sous le même titre sont gardés tous les deux (rien n'est jamais perdu). Répare les cartes abîmées avant la 0.26.1,
 * où le texte d'une carte se recopiait à chaque modification.
 */
export function sansDoublons(liste) {
  const out = [], parTitre = new Map();
  for (const s of liste) {
    if (!s.title) { out.push(s); continue; }
    const k = norm(s.title), txt = s.text.trim(), deja = parTitre.get(k);
    if (!deja) { const e = { ...s }; parTitre.set(k, [e]); out.push(e); continue; }
    if (!txt || deja.some(e => e.text.trim() === txt)) continue;
    const vide = deja.find(e => !e.text.trim());
    if (vide) { vide.text = s.text; continue; }
    const e = { ...s }; deja.push(e); out.push(e);
  }
  return out;
}
const corpsSansDoublons = body => rendreSections(sansDoublons(sections(body)));

/** Clé d'identité d'un fichier publié : la même chez tous les joueurs (nom de fichier, casse, accents et séparateurs ignorés). */
export const cleFichier = nom => norm(SANS_MD(nom));

/** « Le frère d'Ana est très loin ! » → « Le_frere_d_Ana_est_tres_loin » (nom de fichier sûr pour OneDrive, lisible, 70 caractères au plus). */
export function nomDepuisTitre(titre) {
  const s = t(titre).replace(/œ/g, "oe").replace(/Œ/g, "Oe").replace(/æ/g, "ae").normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 70).replace(/_+$/, "");
  return s || "Sans_titre";
}

/** Plus grand numéro d'ordre (« 41_… ») parmi des noms de fichiers ; 0 s'il n'y en a aucun. */
export function plusGrandNumero(noms) {
  let max = 0;
  for (const n of noms || []) { const m = String(n).match(/^(\d{1,4})_/); if (m) max = Math.max(max, Number(m[1])); }
  return max;
}

/** Nom du fichier publié chez les joueurs : numéroté à la suite pour un savoir ou une quête, jamais un nom déjà pris. */
export function nomPublie(type, titre, existants = []) {
  const ty = typeDe(type);
  const base = nomDepuisTitre(titre);
  const pris = new Set((existants || []).map(cleFichier));
  if (ty && ty.numerote) return `${String(plusGrandNumero(existants) + 1).padStart(2, "0")}_${base}.md`;
  let nom = `${base}.md`;
  for (let i = 2; pris.has(cleFichier(nom)); i++) nom = `${base}_${i}.md`;
  return nom;
}

/** Destinataires prévus d'une carte : "tous" ou une liste de pseudos (champ `pour`, séparé par des virgules). */
export function lirePour(valeur) {
  const v = t(valeur);
  if (!v || /^(tous|toute la table|table|groupe)$/i.test(v)) return "tous";
  return v.split(/[,;]/).map(x => x.trim().replace(/\s+/g, "_")).filter(Boolean);
}

/**
 * Lit une carte du coffre. → { type, fichier, titre, pour, prevu, publieSous, session, lieu, statut, corpsJoueur, verite, texte }
 * `corpsJoueur` : le texte tel qu'un joueur le lira (sans titre « # », sans sections du coffre) ; `verite` : ce qui reste au coffre, pour le MJ.
 */
export function lireCarte(texte, fichier, type) {
  const d = parseDoc(texte);
  const m = d.meta;
  const titre = t(m.titre) || t(m.nom) || d.title || humanize(fichier);
  const corps = corpsSansDoublons(d.body.replace(/^\s*#\s+.+\n?/, ""));
  const publiques = [], coffre = [];
  for (const s of sections(corps)) (estCoffre(s) ? coffre : publiques).push(s);
  const rendre = l => rendreSections(l).trim();
  const ty = typeDe(type);
  // les autres parties que les joueurs liront (hors section principale et sections personnelles) : le formulaire les signale, sans les modifier
  const autres = ty ? publiques.filter(s => s.title && norm(s.title) !== norm(ty.section) && !ty.perso.includes(s.title) && s.text.trim()).map(s => s.title) : [];
  return {
    // ce que le MJ écrit pour les joueurs : la section principale du type SEULEMENT (jamais tout le corps : le réenregistrer dans cette section
    // recopiait les autres sections une fois de plus à chaque modification)
    texteMJ: ty ? getSection(corps, ty.section) : "", autres,
    type, fichier, titre, pour: lirePour(m.pour), prevu: t(m.prevu), publieSous: t(m.publie_sous),
    session: m.session == null ? "" : t(m.session), lieu: t(m.lieu), statut: t(m.statut), ficheSource: t(m.fiche_source), quantite: m.quantite == null ? "" : t(m.quantite), portrait: t(m.portrait),
    corpsJoueur: rendre(publiques), verite: coffre.filter(s => s.text.trim()).map(s => avecTitre(s, /v[ée]rit[ée]/i)).join("\n\n"), texte: String(texte)
  };
}

/**
 * Version JOUEUR d'une carte : en-tête sans les champs du coffre, `visibilite: accessible`, date de révélation ; corps sans les sections du coffre,
 * puis passé au masquage des constructions marquées. → le texte à écrire, ou `null` si une marque subsiste (on refuse alors de publier : échec fermé).
 */
export function texteJoueur(texteCarte, { date = "" } = {}) {
  const d = parseDoc(texteCarte);
  const meta = {};
  for (const [k, v] of Object.entries(d.meta)) if (!CHAMPS_COFFRE.includes(k) && k !== "visibilite" && k !== "revele_le") meta[k] = v;
  meta.visibilite = "accessible";
  if (date) meta.revele_le = date;
  const gardees = sansDoublons(sections(d.body)).filter(s => !estCoffre(s));
  const corps = gardees.map(s => (s.title ? `## ${s.title}\n${s.text}` : s.text)).join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
  const masque = masquerPourJoueur(corps);
  if (masque == null) return null;
  return serializeDoc(meta, "\n" + masque.replace(/\n{3,}/g, "\n\n").trim() + "\n");
}

/** Copie d'un élément d'un joueur pour un autre joueur : même texte, sections personnelles vidées (« Ma note », « Ce que j'ai fait »). */
export function copiePourAutreJoueur(texte, type, { date = "" } = {}) {
  const ty = typeDe(type);
  const d = parseDoc(texte);
  const meta = { ...d.meta };
  if (date) meta.revele_le = date;
  const corps = sections(d.body).map(s => (s.title ? `## ${s.title}\n${ty && ty.perso.includes(s.title) ? "\n" : s.text}` : s.text)).join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
  return texteJoueur(serializeDoc(meta, "\n" + corps), { date });
}

/**
 * Mise à jour d'un élément déjà chez un joueur : le texte du MJ remplace l'ancien, mais les sections que le JOUEUR écrit lui-même sont gardées
 * telles qu'il les a laissées. → nouveau texte, ou `null` si la version joueur ne peut pas être produite.
 */
export function fusionner(ancienJoueur, texteCarte, type, { date = "" } = {}) {
  const ty = typeDe(type);
  const neuf = texteJoueur(texteCarte, { date });
  if (neuf == null) return null;
  if (!ty || !ty.perso.length) return neuf;
  const avant = new Map(sections(parseDoc(ancienJoueur).body).filter(s => s.title).map(s => [s.title, s.text]));
  const d = parseDoc(neuf);
  const titres = new Set();
  let corps = sections(d.body).map(s => { if (s.title) titres.add(s.title); return s.title ? `## ${s.title}\n${ty.perso.includes(s.title) && avant.has(s.title) ? avant.get(s.title) : s.text}` : s.text; }).join("\n");
  for (const p of ty.perso) if (!titres.has(p) && t(avant.get(p))) corps = corps.trimEnd() + `\n\n## ${p}\n${avant.get(p)}`;
  return serializeDoc(d.meta, "\n" + corps.replace(/\n{3,}/g, "\n\n").trim() + "\n");
}

/** Texte d'une carte neuve du coffre. `verite` (facultatif) va dans une section « 🔴 Vérité MJ » qui ne sera jamais publiée. */
export function texteCarte({ type, titre, texte = "", verite = "", pour = "tous", session = "", lieu = "", prevu = "", statut = "", quantite = "", ficheSource = "" }) {
  const ty = typeDe(type);
  if (!ty) throw new TypeError("Type de carte inconnu : " + type);
  const meta = { titre: t(titre) };
  if (t(session)) meta.session = t(session);
  if (t(lieu)) meta.lieu = t(lieu);
  if (type === "quete") meta.statut = t(statut) || "en cours";
  if (type === "objet") meta.quantite = Math.max(1, Math.trunc(Number(quantite)) || 1);
  meta.pour = Array.isArray(pour) ? pour.join(", ") : "tous";
  if (t(prevu)) meta.prevu = t(prevu);
  if (t(ficheSource)) meta.fiche_source = t(ficheSource);
  meta.visibilite = "secret";
  let corps = `\n# ${t(titre)}\n\n## ${ty.section}\n\n${t(sansGrandsTitres(texte))}\n`;
  for (const p of ty.perso) corps += `\n## ${p}\n`;
  if (t(verite)) corps += `\n## 🔴 Vérité MJ\n\n${t(sansGrandsTitres(verite))}\n`;
  return serializeDoc(meta, corps);
}

// ------------------------------------------------------------------ Carte préparée depuis une fiche du coffre
// Une fiche de PNJ, de quête ou d'objet donne une carte de rencontre, de quête ou d'objet. RÈGLE : tout le texte de la fiche va dans la vérité du MJ,
// le texte des joueurs reste VIDE ; seul le nom devient le titre. Une carte créée sans rien toucher ne laisse donc rien sortir : c'est le MJ qui fait
// remonter ce que les joueurs peuvent savoir. Le lien vers la fiche (`fiche_source`) est un champ du coffre : il n'est jamais publié.
export const TYPE_DE_GENRE = { pnj: "rencontre", quete: "quete", objet: "objet" };
const CHAMPS_FICHE_IGNORES = ["nom", "titre", "visibilite", "photo", "carte", "portrait"];

/** Les titres « # » à « ###### » deviennent du gras : dans la vérité, un « ## Apparence » ouvrirait une section que les joueurs liraient. */
export const aplatirTitres = texte => String(texte || "").split("\n")
  .map(l => { const m = l.match(/^\s*#{1,6}\s+(.*?)[\s#]*$/) || l.match(/^\s*#{1,6}\s*$/); return m ? (m[1] ? `**${m[1]}**` : "") : l; }).join("\n");

/** Texte de la fiche pour la vérité du MJ : ses champs utiles, puis ses sections non vides, titres aplatis. */
function veriteDeFiche(d, fichier) {
  const champs = Object.entries(d.meta).filter(([k, v]) => !CHAMPS_FICHE_IGNORES.includes(k) && t(v)).map(([k, v]) => `- ${k.replace(/_/g, " ")} : ${t(v).replace(/\s*\n\s*/g, " ")}`);
  const corps = d.body.replace(/^\s*#\s+.+\n?/, "");
  const parts = sections(corps).filter(s => t(s.text)).map(s => (s.title ? `**${s.title}**\n\n${t(s.text)}` : t(s.text)));
  return aplatirTitres([`*Fiche du coffre : ${humanize(fichier)}*`, champs.join("\n"), ...parts].filter(Boolean).join("\n\n")).replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * Champs d'une carte neuve préparée depuis une fiche du coffre (pour `formulaireCarte` ou `creerCarte`). → null si ce genre ne donne pas de carte.
 * `genre` : pnj, quete ou objet ; `fichier` : nom du fichier de la fiche ; `prevu` : le document où la révéler.
 */
export function carteDepuisFiche(genre, texte, fichier, { prevu = "" } = {}) {
  const type = TYPE_DE_GENRE[genre];
  if (!type || texte == null) return null;
  const d = parseDoc(texte);
  const titre = t(d.meta.nom) || t(d.meta.titre) || t(d.title) || humanize(fichier);
  return { type, titre, texte: "", verite: veriteDeFiche(d, fichier), prevu: t(prevu), pour: "tous", session: "", lieu: "", ficheSource: `${genre}:${fichier}` };
}

/**
 * La ligne du catalogue qui correspond déjà à une fiche (pour ne jamais créer de doublon) : d'abord la carte qui porte son `fiche_source`,
 * puis une carte ou un élément déjà publié du même nom. → la ligne, ou null.
 */
export function ligneDeFiche(lignes, genre, fichier, nom = "") {
  const src = `${genre}:${fichier}`;
  const k = norm(nom || humanize(fichier)), kf = norm(humanize(fichier));
  const memeNom = l => norm(l.titre) === k || norm(humanize(l.carte ? l.carte.fichier : l.fichier || "")) === kf || (l.fichier && norm(humanize(l.fichier)) === kf);
  // dernier recours : un élément publié sous un nom plus court ou plus long (« Une alliance avec Tom et Mira » pour la fiche « Une alliance avec Tom
  // et Mira contre le culte »), si le nom le plus court a au moins trois mots : sinon la carte créée ferait révéler une seconde copie aux joueurs
  const debut = (a, b) => { const [c, l] = a.length <= b.length ? [a, b] : [b, a]; return c.split("_").length >= 3 && l.startsWith(c + "_"); };
  const proche = l => !(l.carte && l.carte.ficheSource && l.carte.ficheSource !== src) && [l.titre, l.fichier ? humanize(l.fichier) : ""].filter(Boolean).map(norm).some(n => debut(n, k) || debut(n, kf));
  return (lignes || []).find(l => l.carte && l.carte.ficheSource === src) || (lignes || []).find(memeNom) || (lignes || []).find(proche) || null;
}

/** Remplace le texte joueur et la vérité d'une carte existante en gardant le reste de l'en-tête. */
export function modifierCarte(texteAncien, { titre, texte, verite, pour, session, lieu, prevu, statut, quantite, type }) {
  const ty = typeDe(type);
  if (!ty) throw new TypeError("Type de carte inconnu : " + type);
  const d = parseDoc(texteAncien);
  const meta = { ...d.meta };
  const poser = (k, v) => { if (v === undefined) return; if (t(v)) meta[k] = t(v); else delete meta[k]; };
  let body = corpsSansDoublons(d.body);   // répare au passage une carte abîmée (sections recopiées avant la 0.26.1)
  if (titre !== undefined && t(titre)) {
    meta[meta.titre == null && meta.nom != null ? "nom" : "titre"] = t(titre);
    body = /^\s*#\s+.+$/m.test(body) ? body.replace(/^(\s*)#\s+.+$/m, `$1# ${t(titre)}`) : `\n# ${t(titre)}\n${body}`;
  }
  poser("session", session); poser("lieu", lieu); poser("prevu", prevu);
  if (type === "quete" && statut !== undefined && t(statut)) meta.statut = t(statut);   // « en cours », « terminée », « abandonnée » : la pastille de la quête chez le joueur
  if (type === "objet" && quantite !== undefined && t(quantite)) meta.quantite = Math.max(1, Math.trunc(Number(quantite)) || 1);
  if (pour !== undefined) meta.pour = Array.isArray(pour) ? (pour.length ? pour.join(", ") : "tous") : "tous";
  // seules la section du MJ et la vérité changent : les autres sections (« Savoirs liés », sections personnelles…) restent telles quelles
  // un « ## » tapé dans le texte deviendrait une section à part : il est mis en gras. Une section principale VIDE est gardée (titre seul),
  // pour que la carte garde sa forme et que la relecture retrouve toujours la même section.
  if (texte !== undefined) {
    const neuf = t(sansGrandsTitres(texte));
    body = neuf ? setSection(body, ty.section, "\n" + neuf) : rendreSections(sections(body).map(s => (s.title === ty.section ? { ...s, text: "\n" } : s)));
  }
  // la vérité affichée réunit TOUTES les sections du coffre (lireCarte) : on les remplace donc toutes, sinon celles qui ne s'appellent pas
  // « Vérité » se recopiaient dans la vérité à chaque modification
  if (verite !== undefined) {
    const autres = sections(body).filter(s => !estCoffre(s));
    body = rendreSections(autres).trimEnd() + "\n";
    const v = t(sansGrandsTitres(verite));
    if (v) body += `\n## 🔴 Vérité MJ\n\n${v}\n`;
  }
  const ordre = {}; for (const k of Object.keys(meta)) if (k !== "visibilite") ordre[k] = meta[k]; ordre.visibilite = "secret";
  return serializeDoc(ordre, "\n" + body.replace(/^\n+/, "").replace(/\n{3,}/g, "\n\n"));
}

/** Écrit (ou remplace) un champ d'en-tête d'un texte Markdown sans toucher au corps. */
export function poserChamp(texte, cle, valeur) {
  const d = parseDoc(texte);
  const meta = { ...d.meta, [cle]: valeur };
  return serializeDoc(meta, "\n" + d.body.replace(/^\n+/, ""));
}

/**
 * Le catalogue d'un type : une ligne par élément, qu'il vienne d'une carte du coffre ou seulement des dossiers des joueurs.
 * @param {string} type
 * @param {object[]} cartes     cartes du coffre (lireCarte)
 * @param {{pseudo:string, nom:string, fichiers:string[]|null}[]} joueurs   noms de fichiers du dossier de chaque joueur ; `null` = dossier illisible
 * @returns {{joueurs:{pseudo,nom,lisible,total}[], lignes:object[]}}
 *   ligne : { cle, type, titre, fichier (nom publié ou ""), carte|null, chez:{pseudo:nomDeFichier}, n, sur, etat:"a_reveler"|"partiel"|"tous", prevus:[pseudos] }
 */
export function construireCatalogue(type, cartes, joueurs) {
  const cols = (joueurs || []).map(j => ({ pseudo: j.pseudo, nom: j.nom || String(j.pseudo).replace(/_/g, " "), lisible: Array.isArray(j.fichiers), total: 0 }));
  const lisibles = cols.filter(c => c.lisible).map(c => c.pseudo);
  const parCle = new Map();
  (joueurs || []).forEach((j, i) => {
    if (!Array.isArray(j.fichiers)) return;
    for (const nom of j.fichiers) {
      const cle = cleFichier(nom);
      if (!cle) continue;
      let l = parCle.get(cle);
      if (!l) parCle.set(cle, l = { cle, type, titre: humanize(nom), fichier: nom, carte: null, chez: {} });
      if (!(j.pseudo in l.chez)) { l.chez[j.pseudo] = nom; cols[i].total++; }
    }
  });
  for (const c of cartes || []) {
    const cle = c.publieSous ? cleFichier(c.publieSous) : "carte:" + cleFichier(c.fichier);
    let l = parCle.get(cle);
    if (!l) parCle.set(cle, l = { cle, type, titre: c.titre, fichier: c.publieSous || "", carte: c, chez: {} });
    else { l.carte = c; l.titre = c.titre || l.titre; }
  }
  const lignes = [...parCle.values()].map(l => {
    const n = lisibles.filter(p => p in l.chez).length;
    // Sans carte au coffre (publié avant la régie), l'intention du MJ est inconnue : on ne propose JAMAIS de compléter d'un clic (un savoir personnel
    // partirait chez toute la table). Les destinataires « prévus » sont alors ceux qui l'ont déjà ; révéler à un autre reste possible, case par case.
    const prevus = !l.carte ? lisibles.filter(p => p in l.chez) : Array.isArray(l.carte.pour) ? l.carte.pour.filter(p => lisibles.includes(p)) : lisibles;
    const reste = prevus.filter(p => !(p in l.chez)).length;
    return { ...l, n, sur: lisibles.length, prevus, etat: n === 0 ? "a_reveler" : reste > 0 ? "partiel" : "tous" };
  });
  // Les cartes pas encore révélées d'abord (c'est ce que le MJ cherche), puis les plus récentes publications, puis le titre.
  const rang = { a_reveler: 0, partiel: 1, tous: 2 };
  lignes.sort((a, b) => (rang[a.etat] - rang[b.etat]) || (plusGrandNumero([b.fichier]) - plusGrandNumero([a.fichier])) || a.titre.localeCompare(b.titre, "fr", { numeric: true }));
  return { joueurs: cols, lignes };
}

export const FILTRES = [
  { cle: "a_reveler", libelle: "À révéler" },
  { cle: "partiel", libelle: "En partie" },
  { cle: "tous", libelle: "Révélé" }
];
export function filtrerCatalogue(lignes, { etat = "", texte = "" } = {}) {
  const q = norm(texte).replace(/_+/g, " ").trim();
  return lignes.filter(l => (!etat || l.etat === etat) && (!q || norm([l.titre, l.carte ? l.carte.lieu : "", l.carte ? l.carte.prevu : ""].join(" ")).replace(/_+/g, " ").includes(q)));
}
export function compterCatalogue(lignes) {
  const c = { total: lignes.length, a_reveler: 0, partiel: 0, tous: 0 };
  for (const l of lignes) c[l.etat]++;
  return c;
}

/** Une ligne du journal des révélations (fichier du coffre). */
export function ligneJournal({ date, action, type, titre, joueurs }) {
  const ty = typeDe(type);
  return `- ${date} · ${action} · ${ty ? ty.singulier : type} · ${t(titre).replace(/\s+/g, " ")} · ${(joueurs || []).map(p => String(p).replace(/_/g, " ")).join(", ")}`;
}
export function ajouterAuJournal(texte, ligne) {
  const base = texte == null || !String(texte).trim()
    ? "---\ncollection: journal_revelations\nvisibilite: secret\n---\n\n# Journal des révélations\n\nUne ligne par action de la régie : date, action, type, titre, joueurs.\n\n" : String(texte).trimEnd() + "\n";
  return base + ligne + "\n";
}

// ------------------------------------------------------------------ Comptes rendus de session (journal des joueurs)
// Un compte rendu visible est un fichier de la table (lu par TOUS les joueurs, dans leur journal). Le masquer = le retirer de la table ; son texte reste
// au coffre (`MJ/04_Revelations/Resumes`), d'où il peut être remontré, corrigé ou supprimé. Il n'y a pas de visibilité par joueur : la table est commune.
export const DOSSIER_RESUMES = "Resumes";
export const SECTION_RESUME = "Ce que tout le monde sait";

/** Texte d'un compte rendu au coffre. `notes` (facultatif) : une section « 🔴 Notes MJ » qui ne sera jamais publiée. */
export function texteResume({ titre, session = "", texte = "", notes = "" }) {
  const meta = { titre: t(titre) };
  if (t(session)) meta.session = t(session);
  meta.visibilite = "secret";
  let corps = `\n# ${t(titre)}\n\n## ${SECTION_RESUME}\n\n${t(sansGrandsTitres(texte))}\n`;
  if (t(notes)) corps += `\n## 🔴 Notes MJ\n\n${t(sansGrandsTitres(notes))}\n`;
  return serializeDoc(meta, corps);
}

/** Lit un compte rendu (du coffre ou de la table). → { fichier, titre, session, texte, notes } ; `texte` : ce que les joueurs lisent. */
export function lireResume(contenu, fichier) {
  const d = parseDoc(contenu);
  const corps = d.body.replace(/^\s*#\s+.+\n?/, "");
  const publiques = [], coffre = [];
  for (const s of sansDoublons(sections(corps))) (estCoffre(s) ? coffre : publiques).push(s);
  // TOUT ce que les joueurs lisent, et pas seulement la section principale : l'enregistrement réécrit le compte rendu entier, donc une partie
  // non montrée dans le formulaire serait perdue. Les autres titres passent en gras, dans le même texte.
  const motif = new RegExp(`^${SECTION_RESUME}$`, "i");
  return {
    fichier, titre: t(d.meta.titre) || d.title || humanize(fichier), session: d.meta.session == null ? "" : t(d.meta.session),
    texte: publiques.filter(s => s.text.trim()).map(s => (s.title ? avecTitre(s, motif) : s.text.trim())).join("\n\n"),
    notes: coffre.filter(s => s.text.trim()).map(s => avecTitre(s, /notes? mj/i)).join("\n\n")
  };
}

/**
 * La liste des comptes rendus : ceux de la table (visibles) et ceux qui ne sont qu'au coffre (masqués).
 * @param {{fichier:string, titre:string, session:string}[]} table   @param {{fichier:string, titre:string, session:string}[]} coffre
 * @returns {{cle, fichier, titre, session, visible:boolean, auCoffre:boolean}[]}  rangés par numéro de session décroissant (comme le journal des joueurs), puis par titre
 */
export function construireJournal(table, coffre) {
  const m = new Map();
  for (const r of coffre || []) m.set(cleFichier(r.fichier), { cle: cleFichier(r.fichier), fichier: r.fichier, titre: r.titre, session: r.session, visible: false, auCoffre: true });
  for (const r of table || []) {
    const k = cleFichier(r.fichier), l = m.get(k);
    if (l) { l.visible = true; l.fichierTable = r.fichier; } else m.set(k, { cle: k, fichier: r.fichier, fichierTable: r.fichier, titre: r.titre, session: r.session, visible: true, auCoffre: false });
  }
  const num = l => { const x = String(l.session || "").match(/\d+/g); return x ? Number(x[x.length - 1]) + (x.length > 1 ? Number(x[0]) * 1000 : 0) : -1; };
  return [...m.values()].sort((a, b) => (num(b) - num(a)) || a.titre.localeCompare(b.titre, "fr", { numeric: true }));
}
