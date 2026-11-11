// Fiches proposées à la création à partir d'un document (à l'import d'un fichier Word, ou depuis l'écran « Séance » pour un document déjà au coffre).
// L'application propose, le MJ décide : chaque fiche a une case à cocher, un type et un nom modifiables. Ce qui existe déjà au coffre n'est jamais recréé.
// RÈGLE du moteur : jamais de innerHTML.
import { GENRES, detecterFiches, rapprocher } from "../../src/import/fiches.js?v=0.26.4";
import { h, icon, message, feuille } from "./ui.js?v=0.26.4";
import { executer } from "./edition.js?v=0.26.4";
import { annoncer } from "./ecrans_regie.js?v=0.26.4";

const ICONES = { pnj: "user", lieu: "pin", quete: "scroll", objet: "gem", faction: "flag", creature: "monster" };
const pluriel = (n, un, plus) => `${n} ${n > 1 ? plus : un}`;
const GENRES_A_CARTE = ["pnj", "quete", "objet"];   // les fiches qui donnent une carte à révéler (rencontre, quête, objet)

/** Ce que fait la fenêtre, dit en clair en tête : rien ne part chez les joueurs. */
export const RIEN_CHEZ_LES_JOUEURS = "Rien ne part chez les joueurs. Les fiches vont dans ton coffre. Les cartes préparées attendent, non révélées, dans l'outil « Révéler » de ce document : c'est toi qui les révèles.";

/**
 * Libellé et état du bouton de la fenêtre. `n` : fiches nouvelles cochées ; `m` : fiches déjà au coffre qui peuvent avoir une carte ; `cartes` : case cochée.
 * → { texte, actif }
 */
export function libelleCreation(n, m, cartes, { importer = false } = {}) {
  const fiches = n ? `créer ${pluriel(n, "fiche", "fiches")}` : "";
  const avecCartes = cartes && (n || m);
  if (importer) return { texte: `Importer le document${fiches ? " et " + fiches : ""}${avecCartes ? ", avec les cartes" : ""}`, actif: true };
  if (n) return { texte: `${fiches.replace(/^c/, "C")} dans le coffre${avecCartes ? ", avec les cartes" : ""}`, actif: true };
  if (avecCartes) return { texte: `Préparer les cartes ${m > 1 ? `des ${m} fiches` : "de la fiche"} déjà au coffre`, actif: true };
  return { texte: m ? "Rien à créer (coche « Préparer aussi les cartes » pour les fiches déjà au coffre)" : "Rien à créer", actif: false };
}

/**
 * La liste des fiches proposées. `existants` : { genre: [noms de fichiers] } (pour dire ce qui est déjà au coffre, y compris après un changement de nom ou de type).
 * → { noeud, choisies():[candidats cochés, avec le nom et le genre tels que le MJ les a laissés], nombre }
 */
export function zoneFiches(candidats, existants, { surChangement = () => {} } = {}) {
  const lignes = candidats.map(c => {
    const etat = { ...c };
    const coche = h("input", { type: "checkbox", "aria-label": `Créer la fiche ${c.nom}` });
    const nom = h("input", { class: "jr-saisie fi-nom", type: "text", maxlength: "90", value: c.nom, "aria-label": "Nom de la fiche", autocomplete: "off" });
    const genre = h("select", { class: "jr-select fi-genre", "aria-label": "Type de fiche" }, GENRES.map(g => h("option", { value: g.id, selected: g.id === c.genre }, g.libelle)));
    const marque = h("span", { class: "fi-marque" });
    const ic = h("span", { class: "fi-ic g-" + c.genre }, icon(ICONES[c.genre] || "book", 16));
    const li = h("li", { class: "fi-ligne" }, coche, ic, h("div", { class: "fi-col" }, h("div", { class: "fi-champs" }, nom, genre), h("div", { class: "fi-sous" }, marque, c.role ? h("span", { class: "fi-role" }, c.role) : null)));
    /** Recalcule ce que le coffre dit de cette fiche, après un changement de nom ou de type. `initial` : fixe la coche par défaut. */
    const maj = (initial = false) => {
      etat.nom = nom.value.trim(); etat.genre = genre.value;
      const r = rapprocher([etat], existants)[0];
      etat.existe = r.existe; etat.proche = r.proche;
      ic.className = "fi-ic g-" + etat.genre; ic.replaceChildren(icon(ICONES[etat.genre] || "book", 16));
      coche.disabled = !!r.existe || !etat.nom;
      if (r.existe) coche.checked = false;
      marque.className = "fi-marque" + (r.existe ? " existe" : r.proche ? " proche" : c.incertain && etat.genre === c.genre ? " incertain" : " nouveau");
      marque.textContent = r.existe ? "déjà au coffre" : r.proche ? `nom voisin au coffre : ${r.proche.replace(/\.md$/i, "").replace(/_/g, " ")}` : c.incertain && etat.genre === c.genre ? "type à vérifier" : "nouvelle";
      // Par défaut : coché si c'est clairement nouveau. Un lieu reste décoché (il s'ajouterait au Parcours), ainsi qu'un nom voisin et un type incertain.
      if (initial) coche.checked = !r.existe && !r.proche && !c.incertain && etat.genre !== "lieu";
      li.classList.toggle("off", !coche.checked);
    };
    nom.addEventListener("input", () => { maj(); surChangement(); });
    genre.addEventListener("change", () => { maj(); surChangement(); });
    coche.addEventListener("change", () => { li.classList.toggle("off", !coche.checked); surChangement(); });
    maj(true);
    return { li, coche, etat };
  });
  const choisies = () => lignes.filter(l => l.coche.checked && !l.coche.disabled).map(l => l.etat);
  /** Fiches de ce document déjà au coffre qui peuvent avoir une carte (personnage, quête, objet) : la case « Préparer aussi les cartes » les prend aussi. */
  const existantes = () => lignes.filter(l => l.etat.existe && GENRES_A_CARTE.includes(l.etat.genre)).map(l => ({ genre: l.etat.genre, fichier: l.etat.existe, nom: l.etat.nom }));
  const tout = h("button", { class: "jr-pastille petite", type: "button", onclick: () => { const libres = lignes.filter(l => !l.coche.disabled); const plein = libres.every(l => l.coche.checked); libres.forEach(l => { l.coche.checked = !plein; l.li.classList.toggle("off", plein); }); surChangement(); } }, "Tout cocher / décocher");
  const deja = lignes.filter(l => l.etat.existe).length;
  const noeud = h("section", { class: "rv-bloc fi-zone" },
    h("h3", null, icon("friends", 16), `Fiches repérées (${candidats.length})`),
    candidats.length ? [
      h("p", { class: "jr-meta" }, `${pluriel(candidats.length - deja, "fiche nouvelle", "fiches nouvelles")}${deja ? `, ${deja} déjà au coffre` : ""}. Coche celles à créer ; corrige un nom ou un type si besoin.`),
      h("div", { class: "fi-outils" }, tout),
      h("ul", { class: "fi-liste" }, lignes.map(l => l.li)),
      h("p", { class: "jr-aide" }, "Un lieu coché devient un document du Parcours : garde les lieux importants, laisse les simples bâtiments dans le document. Tout est créé dans ton coffre, jamais chez les joueurs.")]
      : h("p", { class: "jr-vide" }, "Aucune fiche repérée. L'application reconnaît les sous-titres d'une partie « PNJ », « Lieux », « Factions » ou « Bestiaire », les blocs « Quête débloquée » et les fiches 📦."));
  return { noeud, choisies, existantes, nombre: candidats.length };
}

/** Résumé d'une création : « 3 personnages, 1 quête : 4 fiches créées · 3 cartes à révéler préparées ». `r.cartes` : résultat de `creerCartesDepuisFiches`, s'il y en a. */
export function resumeCreation(r) {
  const par = {};
  for (const f of r.creees) par[f.genre] = (par[f.genre] || 0) + 1;
  const morceaux = GENRES.filter(g => par[g.id]).map(g => `${par[g.id]} ${(par[g.id] > 1 ? g.pluriel : g.libelle).toLowerCase()}`);
  const cartes = r.cartes ? ` · ${pluriel(r.cartes.creees.length, "carte à révéler préparée", "cartes à révéler préparées")}${r.cartes.deja.length ? ` (${pluriel(r.cartes.deja.length, "existait", "existaient")} déjà)` : ""}` : "";
  return (morceaux.length ? `${morceaux.join(", ")} : ${pluriel(r.creees.length, "fiche créée", "fiches créées")}` : "Aucune fiche créée") + (r.deja.length ? ` · ${r.deja.length} déjà au coffre` : "") + cartes + ".";
}

/** Case « Préparer aussi les cartes à révéler » (décochée au départ). → { noeud, coche } */
export function caseCartes({ surChangement = () => {} } = {}) {
  const coche = h("input", { type: "checkbox" });
  coche.addEventListener("change", () => surChangement());
  return { coche, noeud: h("label", { class: "jr-case fi-cartes" }, coche, h("span", null, "Préparer aussi les cartes à révéler"),
    h("small", { class: "jr-aide" }, "Pour chaque personnage, quête ou objet de ce document, créé maintenant ou déjà au coffre : une carte non révélée, prévue pour ce document. Une fiche qui a déjà sa carte est sautée. Tout le texte de la fiche va dans la vérité du MJ ; rien n'est écrit pour les joueurs.")) };
}

/** Fenêtre « Fiches de ce document » pour un document déjà au coffre (écran « Séance »). `prevu` : le document, pour les cartes préparées. */
export async function fenetreFiches(ctx, { markdown, titre, source = "", lieu = "", prevu = "", surFini = () => {} }) {
  const corps = h("div", { class: "rv-fiche" }, message("Lecture du document…", "info"));
  const fermer = feuille(`Fiches de « ${titre} »`, corps, { large: true });
  let existants;
  try { existants = await ctx.regie.fichesExistantes(); } catch (e) { if (e && (e.status === 401 || e.auth)) { fermer(); return ctx.surErreur(e); } existants = {}; }
  const msg = h("div", { class: "jr-retour-action" });
  const ok = h("button", { class: "jr-bouton gros rv-reveler", type: "button" });
  const zone = zoneFiches(detecterFiches(markdown), existants, { surChangement: () => libelle() });
  const cartes = caseCartes({ surChangement: () => libelle() });
  const libelle = () => { const l = libelleCreation(zone.choisies().length, zone.existantes().length, cartes.coche.checked); ok.replaceChildren(icon("check", 20), l.texte); ok.disabled = !l.actif; };
  libelle();
  ok.addEventListener("click", async () => {
    const r = await executer(ctx, async () => {
      const choisies = zone.choisies();
      const res = choisies.length ? await ctx.regie.creerFiches(choisies, { source, lieu }) : { creees: [], deja: [] };
      // les cartes après les fiches : si l'une échoue, les fiches sont déjà au coffre et rien n'est perdu. Les fiches déjà au coffre en ont une aussi.
      const pourCartes = [...res.creees, ...zone.existantes()];
      if (cartes.coche.checked && pourCartes.length) res.cartes = await ctx.regie.creerCartesDepuisFiches(pourCartes, { prevu });
      return res;
    }, { zone: msg, boutons: [ok] });
    if (!r.ok) return;
    fermer(); annoncer(resumeCreation(r.r), { duree: 12000 }); surFini(r.r);
  });
  corps.replaceChildren(...[message(RIEN_CHEZ_LES_JOUEURS, "info"), zone.noeud, ctx.donnees && ctx.donnees.peutEcrireMJ ? [zone.nombre ? cartes.noeud : null, msg, zone.nombre ? ok : null] : message("Lecture seule : l'écriture est fermée pour ce JDR.", "info")].flat(Infinity).filter(Boolean));
}
