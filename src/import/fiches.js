// Repérage des fiches à créer dans un document du MJ (déjà converti en Markdown) : personnages, lieux, quêtes, objets, factions, créatures.
// Sans DOM, sans réseau : tout se teste dans Node. Aucune intelligence ici : seulement la STRUCTURE du document, telle que le MJ l'écrit.
//
// Ce qui est reconnu :
//  - dans une scène dont le titre annonce des personnages (« PNJ », « Personnages », « Alliés », « Antagonistes », « Informateurs »…), des lieux
//    (« Lieux »), des factions ou un bestiaire : chaque sous-titre « Nom — précision » est une fiche, avec tout ce qui le suit jusqu'au sous-titre suivant ;
//  - un sous-titre « Faction — Nom » où qu'il soit ;
//  - un bloc 🆕 dont le libellé ou la première ligne parle de quête : une quête, titrée d'après « Quête débloquée — Titre » ou, à défaut, le sous-titre qui le précède ;
//  - un bloc de fiche dont la première ligne commence par 📦, hors d'une scène de personnages : un objet.
// Ce qui ne l'est PAS : un personnage décrit au fil d'un paragraphe, sans sous-titre. Le MJ relit toujours la proposition avant de créer quoi que ce soit.
import { norm } from "../md/doc.js?v=0.26.3";
import { decouper } from "../mj/seance.js?v=0.26.3";

export const GENRES = [
  { id: "pnj", libelle: "Personnage", pluriel: "Personnages" }, { id: "lieu", libelle: "Lieu", pluriel: "Lieux" }, { id: "quete", libelle: "Quête", pluriel: "Quêtes" },
  { id: "objet", libelle: "Objet", pluriel: "Objets" }, { id: "faction", libelle: "Faction", pluriel: "Factions" }, { id: "creature", libelle: "Créature", pluriel: "Créatures" }
];
const SCENES = [
  ["pnj", /\bpnj\b|personnages?|antagonistes?|alli[ée]s?|informateurs?|contacts|pr[ée]tir[ée]s?|habitants?|protagonistes?/i],
  ["lieu", /\blieux?\b|quartiers?|g[ée]ographie|b[âa]timents?/i],
  ["faction", /\bfactions?\b|guildes?/i],
  ["creature", /bestiaire|cr[ée]atures?|monstres?/i]
];
/** Scènes de personnages qui n'en contiennent pas (relations, accroches par joueur…). */
const SCENE_EXCLUE = /relations? entre|hooks?|accroches?|vos personnages|joueurs?|niveaux? d.information/i;
/** Débuts de sous-titre qui annoncent une sous-partie de scène, pas un nom. */
const PAS_UN_NOM = /^(si|comment|quand|pourquoi|que|ce que|o[uù]|la sc[èe]ne|le d[ée]roul[ée]|d[ée]roul[ée]|sc[èe]ne|option|acte|[ée]tape|r[ée]sum[ée]|cons[ée]quences?|notes?|rappel|ambiance|description|objectifs?|contexte|issues?|variante|conclusion|introduction|apr[èe]s|avant|pendant)(?![A-Za-zÀ-ÿ])/i;   // « \b » ne connaît pas les lettres accentuées
const t = v => (v == null ? "" : String(v).trim());
const nu =s => t(s).replace(/\*+/g, "").replace(/[★☆✦●▸►]+/g, " ").replace(/\s+/g, " ").trim();

/** « Nom — précision » → { nom, role }. Le premier tiret long (ou « : ») sépare le nom de la précision ; « (…) » en fin de nom va dans la précision. */
export function decomposerTitre(titre) {
  let s = nu(titre).replace(/^(?:hook|option|sc[èe]ne|faction|pnj|lieu)\s*[0-9a-z]*\s*[—–:-]\s*/i, "");
  const m = s.match(/^(.+?)\s+[—–]\s+(.+)$/) || s.match(/^(.{2,60}?)\s*:\s+(.+)$/);
  let nom = m ? m[1] : s, role = m ? m[2] : "";
  const p = nom.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
  if (p) { nom = p[1]; role = [p[2], role].filter(Boolean).join(" — "); }
  return { nom: nom.replace(/[.,;:]+$/, "").trim(), role: role.trim() };
}

/** Genre probable d'une fiche 📦 d'après sa précision et son texte. → { genre, sur } ; `sur` faux = rien ne tranche. */
function devinerGenre({ role }, texte) {
  const r = `${role}\n${texte}`;
  if (/\b(item|objet|artefact|relique|potion|arme|armure|plan|cadeau|remis[e]? [àa]|flasque|anneau|amulette|parchemin|grimoire)\b/i.test(role)) return { genre: "objet", sur: true };
  if (/\b(fiche (pnj|mj|de combat|combat|compl[èe]te)|pnj)\b/i.test(role) || /\b\d{1,3}\s*ans\b/i.test(role)) return { genre: "pnj", sur: true };
  if (/\b(PV|CaC|Dist|Esquive|Initiative)\b\s*[:=]?\s*\d|\bpersonnalit[ée]\b|\bapparence\b|\bmotivations?\b/i.test(r)) return { genre: "pnj", sur: true };
  if (/\b(plante|fleur|mousse|champignon|lichen|herbe|min[ée]ral|ingr[ée]dient|comestible|toxique)\b/i.test(r)) return { genre: "objet", sur: true };
  return { genre: "objet", sur: false };
}

const rendre = b => {
  if (b.cle === "titre") return `**${b.texte}**`;
  if (b.cle === "texte") return b.texte;
  const etiquette = { lire: "📖 **À lire**", dialogue: "🗣 **Dialogue**", note: "🎲 **Note MJ**", secret: "🔴 **Secret MJ**", combat: "⚔️ **Fiche**", alerte: "🆕 **Alerte / Quête**", recompense: "✅ **Récompense**", lettre: "✉️ **Lettre**" }[b.cle] || "";
  return [etiquette, b.qui && b.cle !== "combat" ? `**${b.qui}**` : "", b.texte].filter(Boolean).join("\n\n");
};
const texteDe = blocs => blocs.map(rendre).filter(Boolean).join("\n\n").trim();

/**
 * Les fiches repérées dans un document. → [{ genre, nom, role, scene, corps, stats, secrets }]
 *   `corps` : le texte du passage (blocs ordinaires, lectures, dialogues, notes) ; `stats` : ses blocs de fiche ; `secrets` : ses blocs 🔴.
 * Un même nom repéré deux fois dans le document n'est proposé qu'une fois (le premier passage, complété par le suivant).
 */
export function detecterFiches(markdown) {
  const out = [], parCle = new Map();
  const ajouter = (genre, titre, scene, blocs, { nomImpose = null, roleImpose = "" } = {}) => {
    const { nom, role } = nomImpose ? { nom: nu(nomImpose), role: nu(roleImpose) } : decomposerTitre(titre);
    if (!nom || nom.length < 2 || nom.length > 90 || !/[A-Za-zÀ-ÿ]/.test(nom)) return;
    const stats = texteDe(blocs.filter(b => b.cle === "combat")), secrets = blocs.filter(b => b.cle === "secret").map(b => [b.qui && !/^secret/i.test(b.qui) ? `**${b.qui}**` : "", b.texte].filter(Boolean).join("\n\n")).join("\n\n").trim();
    const corps = texteDe(blocs.filter(b => b.cle !== "combat" && b.cle !== "secret"));
    const cle = genre + ":" + norm(nom), deja = parCle.get(cle);
    if (deja) { for (const k of ["corps", "stats", "secrets"]) { const v = { corps, stats, secrets }[k]; if (v && !deja[k].includes(v)) deja[k] = [deja[k], v].filter(Boolean).join("\n\n"); } if (!deja.role && role) deja.role = role; return; }
    const c = { genre, nom, role, scene, corps, stats, secrets };
    parCle.set(cle, c); out.push(c);
  };
  for (const s of decouper(markdown)) {
    const genreScene = SCENE_EXCLUE.test(s.titre) ? null : (SCENES.find(([, re]) => re.test(s.titre)) || [null])[0];
    // découpage de la scène par sous-titre
    const parts = [{ titre: "", blocs: [] }];   // la première partie : ce qui précède le premier sous-titre
    for (const b of s.blocs) { if (b.cle === "titre") parts.push({ titre: b.texte, blocs: [] }); else parts[parts.length - 1].blocs.push(b); }
    for (const p of parts) {
      const faction = p.titre.match(/^\s*faction\s*[0-9]*\s*[—–:-]\s*(.+)$/i);
      // Un sous-titre n'est une fiche que s'il a la forme d'un nom : « Nom — précision », ou un sous-titre suivi d'un bloc de fiche.
      // « La scène », « Déroulé guidé », « Si les joueurs… » sont des sous-parties de la scène, pas des personnages. Un lieu se passe du tiret.
      const prise = !!(genreScene && p.titre && p.blocs.length && !PAS_UN_NOM.test(nu(p.titre))
        && (genreScene === "lieu" || /\s[—–]\s/.test(p.titre) || p.blocs.some(b => b.cle === "combat")));
      if (faction) ajouter("faction", faction[1], s.titre, p.blocs);
      else if (prise) ajouter(genreScene, p.titre, s.titre, p.blocs);
      // quêtes et objets : repérés par leurs blocs, où qu'ils soient
      for (const b of p.blocs) {
        const premiere = nu((b.texte.split("\n").find(l => l.trim()) || ""));
        if (b.cle === "alerte" && /qu[êe]te/i.test(`${b.qui} ${premiere}`)) {
          const m = premiere.match(/qu[êe]te\s+d[ée]bloqu[ée]e\s*[—–:-]\s*(.+)$/i) || nu(b.qui).match(/qu[êe]te\s+d[ée]bloqu[ée]e\s*[—–:-]\s*(.+)$/i);
          const titre = m ? m[1] : p.titre && !/^sc[èe]ne\s|^option\s/i.test(p.titre) ? decomposerTitre(p.titre).nom : "";
          if (titre) ajouter("quete", titre, s.titre, [{ ...b, cle: "texte" }], { nomImpose: titre.replace(/\s*\(([^)]*)\)\s*$/, "").replace(/[\s:;,.—–-]+$/, "") });
        }
        // Un bloc 📦 est une « fiche » au sens large (objet, mais aussi personnage, plante, créature) : le genre est deviné d'après son contenu,
        // et marqué incertain quand rien ne tranche (l'écran le laisse alors décoché : c'est le MJ qui choisit).
        if (b.cle === "combat" && !prise && !faction && /^📦/u.test(premiere)) {
          const titre = premiere.replace(/^📦\s*/u, ""), d = decomposerTitre(titre);
          const reste = b.texte.split("\n").slice(1).join("\n");
          const genre = devinerGenre(d, reste);
          // une scène entière consacrée à cette fiche (son titre porte le même nom) : tout son contenu en fait partie
          const sceneDediee = norm(decomposerTitre(s.titre).nom).startsWith(norm(d.nom)) || norm(d.nom).startsWith(norm(decomposerTitre(s.titre).nom) + "_");
          const role = sceneDediee && decomposerTitre(s.titre).role ? decomposerTitre(s.titre).role : d.role;
          const avant = out.length;
          ajouter(genre.genre, d.nom, s.titre, sceneDediee ? s.blocs.filter(x => x.cle !== "titre").map(x => (x === b ? { ...x, texte: reste } : x)) : [{ ...b, cle: genre.genre === "pnj" || genre.genre === "creature" ? "combat" : "texte", texte: reste }], { nomImpose: d.nom, roleImpose: role });
          if (out.length > avant && !genre.sur) out[out.length - 1].incertain = true;
        }
      }
    }
  }
  return out;
}

/**
 * Rapproche les fiches repérées de celles du coffre. `existants` : { genre: [noms de fichiers] }.
 * → chaque candidat reçoit `existe` (le fichier du coffre qui porte ce nom, ou null) et `proche` (un fichier au nom voisin : l'un contient l'autre).
 */
export function rapprocher(candidats, existants) {
  return candidats.map(c => {
    const k = norm(c.nom), liste = (existants && existants[c.genre]) || [];
    let existe = null, proche = null;
    for (const f of liste) {
      const kf = norm(String(f).replace(/\.md$/i, ""));
      if (kf === k) { existe = f; break; }
      if (!proche && kf.length >= 3 && k.length >= 3 && (k.startsWith(kf + "_") || kf.startsWith(k + "_") || k.endsWith("_" + kf) || kf.endsWith("_" + k))) proche = f;
    }
    return { ...c, existe, proche: existe ? null : proche };
  });
}

const section = (titre, texte) => `## ${titre}\n\n${t(texte) ? t(texte) + "\n\n" : ""}`;
const uneLigne = v => t(v).replace(/\s*\n\s*/g, " ");

/**
 * Le fichier du coffre d'une fiche repérée, au format de sa collection (contrat de format). Toujours `visibilite: secret`.
 * Les sections du contrat sont présentes (vides si le document ne dit rien) ; le passage d'origine est gardé entier dans « Fiche complète (source) ».
 */
export function texteFiche(c, { source = "", lieu = "", date = "" } = {}) {
  const meta = [], champ = (k, v) => { if (uneLigne(v)) meta.push(`${k}: ${uneLigne(v)}`); };
  const origine = () => { champ("source_word", source); champ("importe_le", date); };
  let corps;
  if (c.genre === "pnj") {
    champ("nom", c.nom); champ("role", c.role); champ("lieu", lieu); meta.push("statut: vivant", "visibilite: secret"); origine();
    corps = section("Apparence") + section("Personnalité") + section("Motivations") + section("Dettes ouvertes") + section("Statistiques", c.stats) + section("🔴 Secret MJ", c.secrets) + section("Fiche complète (source)", c.corps);
  } else if (c.genre === "lieu") {
    champ("nom", c.nom); meta.push("type: lieu"); champ("region", lieu); meta.push("etat: à venir", "visibilite: secret"); origine();
    corps = section("Description", c.role) + section("Ambiance") + section("Points d'intérêt") + section("PNJ présents") + section("Quêtes liées") + section("🔴 Secret MJ", c.secrets) + section("Document source complet (MJ)", [c.corps, c.stats].filter(Boolean).join("\n\n"));
  } else if (c.genre === "quete") {
    champ("titre", c.nom); meta.push("type: secondaire", "statut: idée", "visibilite: secret"); origine();
    corps = section("Résumé joueurs") + section("Objectif", c.corps) + section("Étapes") + section("Récompenses") + section("🔴 Vérité (MJ)", c.secrets) + section("🔴 Conséquences");
  } else if (c.genre === "objet") {
    champ("nom", c.nom); meta.push("type: magique", "visibilite: secret"); origine();
    corps = section("Description", c.corps) + section("Fonctionnement") + section("Règles d'utilisation") + section("Suivi MJ");
  } else if (c.genre === "faction") {
    champ("nom", c.nom); meta.push("attitude: inconnue", "visibilite: secret"); origine();
    corps = section("Description", [c.role, c.corps].filter(Boolean).join("\n\n")) + section("Objectifs") + section("Membres connus") + section("Ressources") + section("🔴 Secret MJ", c.secrets);
  } else if (c.genre === "creature") {
    champ("nom", c.nom); meta.push("visibilite: secret"); origine();
    corps = section("Description", [c.role, c.corps].filter(Boolean).join("\n\n")) + section("Comportement") + section("Attaques et compétences", c.stats) + section("Butin") + section("🔴 Secret MJ", c.secrets);
  } else throw new TypeError("Genre de fiche inconnu : " + c.genre);
  return`---\n${meta.join("\n")}\n---\n\n# ${uneLigne(c.nom)}\n\n${corps.trimEnd()}\n`;
}
