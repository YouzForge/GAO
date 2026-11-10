// Conversion d'un document Word du MJ en Markdown pour l'application. Sans DOM : fonctionne dans le navigateur et dans Node (tests).
//
// Mêmes règles que le convertisseur utilisé pour le premier import (docx2md_marques 1.0, base « 0 - BASE APPLICATION POUR JDR ») :
//  - un BLOC coloré est reconnu à son libellé (l'emoji qui commence le paragraphe) d'abord, à la couleur de sa bordure gauche en secours ;
//    tout bloc rouge est un secret, quel que soit son libellé (prudence) ; 🔒 est écrit 🔴 ;
//  - les titres Word (Titre 1, 2, 3…) deviennent des scènes (« ### »), des sous-titres (« #### ») puis du gras ;
//  - tableaux, listes, gras et italique sont gardés ; une cellule rouge est marquée « cellule-secret ».
// La sortie est celle que lit l'écran « Séance » : une ligne de marque (« 📖 **À lire** »), puis les paragraphes du bloc.
// Un contrôle de fidélité, qui ne partage pas le code de conversion, compare les mots du Word et ceux du Markdown.

const COULEUR_CLASSE = { "922B21": "secret", "1A5276": "note", "B8860B": "lire", "C8A000": "dialogue", "4A4A8A": "fiche", "AAAAAA": "fiche", "666666": "fiche", "888888": "fiche", "784212": "alerte", "145A32": "recompense", "6A4A2A": "lettre", "6A1B6A": "inconnu" };
const NEUTRES = new Set(["CCCCCC", "DDDDDD", "E0E0E0"]);
const ROUGES_CELLULE = new Set(["FDEDEC", "F9EBEA"]);
export const ENTETE = { secret: "🔴 **Secret MJ**", note: "🎲 **Note MJ**", lire: "📖 **À lire**", dialogue: "🗣 **Dialogue**", lettre: "✉️ **Lettre**", fiche: "⚔️ **Fiche**", alerte: "🆕 **Alerte / Quête**", recompense: "✅ **Récompense**", inconnu: "❓ **À examiner**" };
const LIBELLE = [["🔒", "secret"], ["🔴", "secret"], ["🎲", "note"], ["📖", "lire"], ["🗣", "dialogue"], ["💬", "dialogue"], ["✉", "lettre"], ["📦", "fiche"], ["⚔", "fiche"], ["🆕", "alerte"], ["⚠", "alerte"], ["✅", "recompense"], ["🔀", "recompense"], ["❓", "inconnu"]];
export const NOMS_CLASSE = { lire: "à lire", dialogue: "dialogue", note: "note MJ", secret: "secret", fiche: "fiche / combat", alerte: "alerte / quête", recompense: "récompense", lettre: "lettre", inconnu: "à examiner" };

const ENTITES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
const decoder = s => s.replace(/&(#x[0-9a-fA-F]+|#\d+|\w+);/g, (m, e) => (e[0] === "#" ? String.fromCodePoint(e[1] === "x" ? parseInt(e.slice(2), 16) : Number(e.slice(1))) : ENTITES[e] ?? m));
const attr = (xml, nom) => { const m = xml.match(new RegExp(`\\b${nom}="([^"]*)"`)); return m ? m[1] : null; };
const eteint = balise => { const v = attr(balise, "w:val"); return v != null && /^(0|false|off|none)$/i.test(v); };
/** Première balise `<w:nom …>` (ouvrante ou auto-fermante) d'un morceau de XML, ou null. Le nom est exact : « w:b » ne trouve pas « w:bCs ». */
const balise = (xml, nom) => { const m = xml.match(new RegExp(`<w:${nom}(?=[\\s/>])[^>]*>`)); return m ? m[0] : null; };
const interieur = (xml, nom) => { const m = xml.match(new RegExp(`<w:${nom}(?=[\\s>])[^>]*>([\\s\\S]*?)</w:${nom}>`)); return m ? m[1] : null; };

/** Éléments de premier niveau d'un conteneur : paragraphes et tableaux, dans l'ordre. Un tableau imbriqué reste dans son parent. */
function elements(xml) {
  const out = [];
  const re = /<(\/?)w:(tbl|p)(?=[\s>/])[^>]*?(\/?)>/g;
  let m, prof = 0, debutT = -1, debutP = -1;
  while ((m = re.exec(xml))) {
    const [tout, ferme, nom, auto] = m;
    if (nom === "tbl") {
      if (!ferme) { if (prof === 0 && debutP < 0) debutT = m.index; prof++; }
      else { prof--; if (prof === 0 && debutT >= 0) { out.push({ t: "tbl", xml: xml.slice(debutT, m.index + tout.length) }); debutT = -1; } }
    } else if (prof === 0) {
      if (auto) continue;
      if (!ferme) debutP = m.index;
      else if (debutP >= 0) { out.push({ t: "p", xml: xml.slice(debutP, m.index + tout.length) }); debutP = -1; }
    }
  }
  return out;
}

/** Les morceaux de texte d'un paragraphe : [{ texte, gras, italique }], dans l'ordre du document. */
function runs(p) {
  const out = [];
  for (const m of p.matchAll(/<w:r(?=[\s>])[^>]*>([\s\S]*?)<\/w:r>/g)) {
    const r = m[1];
    let texte = "";
    for (const x of r.matchAll(/<w:t(?=[\s>])[^>]*>([^<]*)<\/w:t>|<w:tab\/>|<w:br(?=[\s/])[^>]*\/>|<w:cr\/>|<w:noBreakHyphen\/>/g)) {
      if (x[1] != null) texte += decoder(x[1]);
      else if (x[0].startsWith("<w:tab")) texte += " ";
      else if (x[0].startsWith("<w:noBreak")) texte += "-";
      else texte += "<br>";
    }
    if (!texte) continue;
    const rpr = interieur(r, "rPr") || "";
    const b = balise(rpr, "b"), i = balise(rpr, "i");
    out.push({ texte, gras: !!b && !eteint(b), italique: !!i && !eteint(i) });
  }
  return out;
}
function enLigne(rs) {
  const fus = [];
  for (const r of rs) { const d = fus[fus.length - 1]; if (d && d.gras === r.gras && d.italique === r.italique) d.texte += r.texte; else fus.push({ ...r }); }
  return fus.map(({ texte, gras, italique }) => {
    if (!(gras || italique) || !texte.trim()) return texte;
    const tete = texte.slice(0, texte.length - texte.trimStart().length), queue = texte.slice(texte.trimEnd().length);
    const m = gras && italique ? "***" : gras ? "**" : "*";
    return `${tete}${m}${texte.trim()}${m}${queue}`;
  }).join("");
}
const brutDe = rs => rs.map(r => r.texte).join("");
function infoPara(p) {
  const ppr = interieur(p, "pPr") || "";
  const style = (s => (s ? attr(s, "w:val") || "" : ""))(balise(ppr, "pStyle"));
  const bord = interieur(ppr, "pBdr");
  const gauche = bord ? balise(bord, "left") : null;
  const couleur = gauche ? (attr(gauche, "w:color") || "").toUpperCase() || null : null;
  const num = interieur(ppr, "numPr");
  const bas = bord ? balise(bord, "bottom") : null;
  return { style, couleur, filet: !!bas && !gauche && !NEUTRES.has((attr(bas, "w:color") || "").toUpperCase()), num: num ? { id: (x => (x ? attr(x, "w:val") : null))(balise(num, "numId")), niveau: Number((x => (x ? attr(x, "w:val") : 0))(balise(num, "ilvl"))) || 0 } : null };
}
function niveauTitre(style) {
  const m = String(style || "").match(/^(?:heading|titre)\s*([1-6])$/i);
  if (m) return Number(m[1]);
  return /^(title|titre)$/i.test(style || "") ? 1 : 0;
}
function classeDe(texte, couleur) {
  const t = String(texte || "").trimStart();
  const lib = (LIBELLE.find(([emo]) => t.startsWith(emo)) || [])[1] || null;
  const col = couleur && !NEUTRES.has(couleur) ? COULEUR_CLASSE[couleur] || "inconnu" : null;
  return { lib, col };
}
const echapper = s => (/^(#|>|[-+*]\s|\d+[.)]\s|---)/.test(s) ? "\\" + s : s);

/** Formats de numérotation : Map("numId|niveau" → "bullet" | "decimal"…). */
function lireNumerotation(xml) {
  const res = new Map();
  if (!xml) return res;
  const abs = new Map();
  for (const a of xml.matchAll(/<w:abstractNum(?=[\s>])[^>]*>[\s\S]*?<\/w:abstractNum>/g)) {
    const id = attr(a[0].match(/^<[^>]*>/)[0], "w:abstractNumId");
    for (const l of a[0].matchAll(/<w:lvl(?=[\s>])[^>]*>[\s\S]*?<\/w:lvl>/g)) {
      const f = balise(l[0], "numFmt");
      abs.set(`${id}|${attr(l[0].match(/^<[^>]*>/)[0], "w:ilvl")}`, f ? attr(f, "w:val") : "bullet");
    }
  }
  for (const n of xml.matchAll(/<w:num(?=[\s>])[^>]*>[\s\S]*?<\/w:num>/g)) {
    const id = attr(n[0].match(/^<[^>]*>/)[0], "w:numId"), a = balise(n[0], "abstractNumId");
    if (!a) continue;
    for (const [k, f] of abs) { const [aid, lv] = k.split("|"); if (aid === attr(a, "w:val")) res.set(`${id}|${lv}`, f); }
  }
  return res;
}

function tableau(xml, rapport) {
  const lignes = [];
  const dedans = xml.replace(/^<w:tbl(?=[\s>])[^>]*>/, "");
  for (const tr of dedans.matchAll(/<w:tr(?=[\s>])[^>]*>([\s\S]*?)<\/w:tr>/g)) {
    const cellules = [];
    for (const tc of tr[1].matchAll(/<w:tc(?=[\s>])[^>]*>([\s\S]*?)<\/w:tc>/g)) {
      const c = tc[1];
      if (/<w:tbl(?=[\s>])/.test(c)) rapport.avertissements.add("tableau imbriqué (son contenu est mis à plat)");
      let secret = false; const paras = [];
      for (const p of c.matchAll(/<w:p(?=[\s>])[^>]*>[\s\S]*?<\/w:p>/g)) {
        const rs = runs(p[0]), t = enLigne(rs).trim();
        if (t) paras.push(t);
        const { lib, col } = classeDe(brutDe(rs), infoPara(p[0]).couleur);
        if (lib === "secret" || col === "secret") secret = true;
      }
      const tcpr = interieur(c, "tcPr") || "", shd = balise(tcpr, "shd");
      if (shd && ROUGES_CELLULE.has((attr(shd, "w:fill") || "").toUpperCase())) secret = true;
      let texte = paras.join(" ").replace(/\|/g, "\\|").replace(/\n/g, " ").replace(/🔒/g, "🔴");
      if (secret) { rapport.cellulesSecretes++; texte = `${texte} <!-- cellule-secret -->`.trim(); }
      const gs = balise(tcpr, "gridSpan");
      cellules.push(texte);
      for (let i = 1; i < (gs ? Number(attr(gs, "w:val")) || 1 : 1); i++) cellules.push("");
    }
    lignes.push(cellules);
  }
  if (!lignes.length) return [];
  const n = Math.max(...lignes.map(l => l.length));
  for (const l of lignes) while (l.length < n) l.push("");
  rapport.tableaux++;
  return [`| ${lignes[0].join(" | ")} |`, `|${Array(n).fill(" --- ").join("|")}|`, ...lignes.slice(1).map(l => `| ${l.join(" | ")} |`)];
}

const CONSTRUITS = [["suivi des modifications", /<w:(ins|del) /], ["zone de texte", /txbxContent/], ["image", /<w:drawing|<w:pict/], ["note de bas de page", /<w:footnoteReference/], ["commentaire", /<w:commentReference/], ["contrôle de contenu", /<w:sdt>/]];

/** Mots d'un texte, pour le contrôle de fidélité (ni mise en forme, ni ponctuation de structure). */
function mots(texte) {
  return texte.normalize("NFC").replace(/🔒/g, "🔴").replace(/ /g, " ").replace(/[*`]+/g, "").replace(/[|>#\\_]+/g, " ").split(/\s+/).filter(t => t && t !== "-" && t !== "–");
}
function fidelite(xmlDocument, md) {
  const source = [];
  for (const m of xmlDocument.matchAll(/<w:p(?=[\s>])[^>]*>[\s\S]*?<\/w:p>/g)) {
    let s = "";
    for (const x of m[0].matchAll(/<w:t(?=[\s>])[^>]*>([^<]*)<\/w:t>|<w:tab\/>|<w:br(?=[\s/])[^>]*\/>|<w:cr\/>/g)) s += x[1] != null ? decoder(x[1]) : " ";
    source.push(...mots(s));
  }
  const entetes = new Set(Object.values(ENTETE));
  const lignes = md.split("\n").filter(l => !entetes.has(l.trim()) && !/^\|(\s*:?-{3}:?\s*\|)+$/.test(l.trim()))
    .map(l => l.replace(/^\s*(?:[-+*]|\d+\.)\s+/, "").replace(/^#{1,6}\s+/, ""));
  const sortie = mots(lignes.join("\n").replace(/<!--[\s\S]*?-->/g, " ").replace(/<br>/g, " "));
  const compte = new Map();
  for (const t of source) compte.set(t, (compte.get(t) || 0) + 1);
  for (const t of sortie) compte.set(t, (compte.get(t) || 0) - 1);
  let perdus = 0; for (const v of compte.values()) if (v > 0) perdus += v;
  return { motsSource: source.length, motsSortie: sortie.length, perdus, pertePct: source.length ? Math.round(10000 * perdus / source.length) / 100 : 0 };
}

/**
 * Convertit le XML d'un document Word en Markdown.
 * @param {string} xmlDocument   contenu de `word/document.xml`
 * @param {string|null} xmlNumerotation   contenu de `word/numbering.xml` (listes), ou null
 * @returns {{markdown:string, titres:string[], rapport:{blocs:object, scenes:number, tableaux:number, cellulesSecretes:number, avertissements:string[], fidelite:object}}}
 *   Le Markdown commence au premier contenu ; les titres Word de niveau 1 sont des « ### » (scènes), ceux de niveau 2 des « #### ».
 */
export function convertirDocx(xmlDocument, xmlNumerotation = null) {
  const corps = interieur(xmlDocument, "body");
  if (corps == null) throw new Error("Document Word illisible : corps introuvable.");
  const numerotation = lireNumerotation(xmlNumerotation);
  const rapport = { blocs: {}, scenes: 0, tableaux: 0, cellulesSecretes: 0, avertissements: new Set() };
  for (const [nom, re] of CONSTRUITS) if (re.test(xmlDocument)) rapport.avertissements.add(`${nom} : non repris`);
  const sortie = [], titres = [];
  let bloc = null;
  const fermer = () => { if (bloc != null) { sortie.push(""); bloc = null; } };
  const vide = () => { if (sortie.length && sortie[sortie.length - 1] !== "") sortie.push(""); };
  for (const el of elements(corps)) {
    if (el.t === "tbl") { fermer(); vide(); sortie.push(...tableau(el.xml, rapport), ""); continue; }
    const rs = runs(el.xml), brut = brutDe(rs);
    if (!brut.replace(/<br>/g, "").trim()) continue;
    const texte = enLigne(rs).trim().replace(/🔒/g, "🔴");
    const info = infoPara(el.xml);
    // Titre : le style Word (Titre 1, 2, 3…) ; à défaut, la mise en forme de la charte (documents écrits sans styles) :
    // un paragraphe court, tout en gras, souligné d'un filet coloré = une scène ; tout en gras et commençant par « ▸ » = un sous-titre.
    const toutGras = rs.every(r => r.gras || !r.texte.trim()) && brut.trim().length <= 140;
    const niveau = niveauTitre(info.style) || (toutGras && !info.couleur ? (info.filet ? 1 : /^\s*[▸►]/.test(brut) ? 2 : 0) : 0);
    if (niveau) {
      fermer(); vide();
      const nu = texte.replace(/\*+/g, "").trim();
      if (niveau === 1) { titres.push(nu); rapport.scenes++; sortie.push(`### ${nu}`, ""); }
      else if (niveau === 2) sortie.push(`#### ${nu}`, "");
      else sortie.push(`**${nu}**`, "");
      continue;
    }
    const { lib, col } = classeDe(brut, info.couleur);
    let classe = lib || col;
    if (lib === "secret" || col === "secret") classe = "secret";      // le rouge l'emporte sur tout autre libellé
    if (col === "inconnu" && info.couleur) rapport.avertissements.add(`couleur de bloc inconnue (${info.couleur}) : bloc marqué « à examiner »`);
    if (classe) {
      if (lib != null || bloc !== classe) {
        vide();
        sortie.push(ENTETE[classe], "");
        bloc = classe;
        rapport.blocs[classe] = (rapport.blocs[classe] || 0) + 1;
      }
      sortie.push(echapper(texte), "");
      continue;
    }
    fermer();
    if (info.num || /liste|list/i.test(info.style)) {
      const niv = info.num ? info.num.niveau : 0, fmt = info.num ? numerotation.get(`${info.num.id}|${niv}`) || "bullet" : "bullet";
      sortie.push(`${"  ".repeat(niv)}${/^(decimal|lowerLetter|upperLetter|lowerRoman|upperRoman)$/.test(fmt) ? "1." : "-"} ${texte}`);
      continue;
    }
    if (sortie.length && /^(\s*)(- |1\. )/.test(sortie[sortie.length - 1])) sortie.push("");
    sortie.push(echapper(texte), "");
  }
  fermer();
  const markdown = sortie.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
  return { markdown, titres, rapport: { ...rapport, avertissements: [...rapport.avertissements], fidelite: fidelite(xmlDocument, markdown) } };
}

/** Titre proposé d'après le nom du fichier : « 06 - GAO_Session_Retour_v2.docx » → « Session Retour ». */
export function titreDepuisNom(nom) {
  return String(nom).replace(/\.docx$/i, "").replace(/^\s*\d+[a-z]?\s*[-_ ]*\s*/i, "").replace(/_/g, " ").replace(/\b(GAO|cleaned|final)\b/gi, " ").replace(/\bv\d+(\.\d+)?\b/gi, " ").replace(/\s+/g, " ").trim() || "Document importé";
}
