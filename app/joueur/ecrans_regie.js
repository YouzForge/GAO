// Écran « Révélations » du MJ : ce que chaque joueur a reçu (savoirs, quêtes, rencontres, objets) et ce qui reste à révéler.
// Une ligne par carte, une colonne par joueur : un clic sur une case révèle (ou retire, après confirmation) ; « À tous » révèle aux joueurs prévus.
// Une carte s'ouvre sur ce que les joueurs liront et, à part, sur ce qui ne sort jamais du coffre.
// RÈGLE du moteur : jamais de innerHTML ; tout est construit avec le DOM. Rien ne s'écrit si l'interrupteur `ecriture` du JDR est fermé.
import { parseDoc } from "../../src/md/doc.js?v=0.25.0";
import { TYPES, typeDe, FILTRES, filtrerCatalogue, compterCatalogue } from "../../src/mj/revelations.js?v=0.25.0";
import { h, icon, message, rendreMarkdown, feuille } from "./ui.js?v=0.25.0";
import { executer, confirmer } from "./edition.js?v=0.25.0";
import { cadreMJ } from "./ecrans_mj.js?v=0.25.0";

const enc = encodeURIComponent;
const nomJoueur = p => String(p).replace(/_/g, " ");
const liste = noms => noms.map(nomJoueur).join(", ");
const peutEcrire = ctx => !!(ctx.donnees && ctx.donnees.peutEcrireMJ);
const LIBELLE_ETAT = { a_reveler: "À révéler", partiel: "En partie", tous: "Révélé" };
const corpsLisible = texte => parseDoc(texte).body.replace(/^\s*#\s+.+\n?/, "").trim();

const champ = (libelle, controle, aide) => h("label", { class: "jr-champ" }, h("span", null, libelle), controle, aide ? h("small", { class: "jr-aide" }, aide) : null);
const saisie = (props = {}) => h("input", { class: "jr-saisie", type: "text", autocomplete: "off", ...props });
const zoneTexte = (valeur, props = {}) => h("textarea", { class: "jr-saisie zone", ...props }, valeur || "");

/** Cases à cocher des destinataires. → { noeud, lire():"tous"|[pseudos], choisis():[pseudos] } */
function choixJoueurs(joueurs, { coches = [], inactifs = [], legende = "Pour qui ?" } = {}) {
  const cases = joueurs.map(j => {
    const c = h("input", { type: "checkbox", value: j.pseudo, checked: coches.includes(j.pseudo), disabled: inactifs.includes(j.pseudo) });
    return { j, c, n: h("label", { class: "jr-case rv-case" + (inactifs.includes(j.pseudo) ? " inactif" : "") }, c, h("span", null, j.nom), inactifs.includes(j.pseudo) ? h("small", { class: "jr-aide" }, "l'a déjà") : null) };
  });
  const libres = () => cases.filter(x => !x.c.disabled);
  const tous = h("button", { class: "jr-pastille petite", type: "button", onclick: () => { const plein = libres().every(x => x.c.checked); libres().forEach(x => { x.c.checked = !plein; }); } }, "Toute la table");
  const choisis = () => libres().filter(x => x.c.checked).map(x => x.j.pseudo);
  return {
    noeud: h("fieldset", { class: "rv-pour" }, h("legend", null, legende), h("div", { class: "rv-pour-cases" }, cases.map(x => x.n)), libres().length > 1 ? tous : null),
    choisis, lire: () => { const c = choisis(); return c.length === libres().length && !inactifs.length ? "tous" : c; }
  };
}

/**
 * Formulaire d'une carte : création (`carte` absent) ou modification. `surFini(carte, reveler:boolean)` est appelé après l'enregistrement.
 * `documents` : noms de fichiers proposés pour « Prévu pour » ; `defauts` : valeurs de départ d'une carte neuve (type, prevu, lieu…).
 */
export function formulaireCarte(ctx, { carte = null, type = "savoir", joueurs = [], documents = [], defauts = {}, surFini = () => {} } = {}) {
  const ty0 = carte ? carte.type : type;
  const selType = h("select", { class: "jr-select", "aria-label": "Type de carte", disabled: !!carte }, TYPES.map(t => h("option", { value: t.id, selected: t.id === ty0 }, t.singulier.replace(/^./, c => c.toUpperCase()))));
  const titre = saisie({ maxlength: "120", value: carte ? carte.titre : defauts.titre || "", "aria-label": "Titre", placeholder: "Titre lu par les joueurs" });
  const texte = zoneTexte(carte ? (carte.texteMJ || carte.corpsJoueur) : defauts.texte || "", { rows: "7", "aria-label": "Texte pour les joueurs", placeholder: "Ce que les personnages apprennent, écrit comme ils le noteraient." });
  const verite = zoneTexte(carte ? carte.verite : defauts.verite || "", { rows: "3", "aria-label": "Vérité du MJ", placeholder: "Facultatif : ce que tu sais et qu'ils ignorent." });
  verite.classList.add("rv-secret-champ");
  const session = saisie({ inputmode: "numeric", maxlength: "4", value: carte ? carte.session : defauts.session || "", "aria-label": "Session" });
  const lieu = saisie({ maxlength: "80", value: carte ? carte.lieu : defauts.lieu || "", "aria-label": "Lieu" });
  // Propres à un type : l'état d'une quête (sa pastille chez le joueur) et la quantité d'un objet. Montrés seulement pour ce type.
  const statut = h("select", { class: "jr-select", "aria-label": "État de la quête" }, ["en cours", "terminée", "abandonnée"].map(s => h("option", { value: s, selected: s === ((carte && carte.statut) || "en cours") }, s.replace(/^./, c => c.toUpperCase()))));
  const quantite = saisie({ inputmode: "numeric", maxlength: "4", value: (carte && carte.quantite) || "1", "aria-label": "Quantité" });
  const champStatut = champ("État de la quête", statut, "« Terminée » ou « Abandonnée » s'affiche sur la quête du joueur."), champQuantite = champ("Quantité", quantite);
  const propres = () => { champStatut.hidden = selType.value !== "quete"; champQuantite.hidden = selType.value !== "objet"; };
  selType.addEventListener("change", propres); propres();
  const idListe = "rv-docs-" + Math.random().toString(36).slice(2, 8);
  const prevu = saisie({ maxlength: "140", value: carte ? carte.prevu : defauts.prevu || "", "aria-label": "Prévu pour", list: idListe, placeholder: "Document de session ou de lieu" });
  const pourInitial = carte ? carte.pour : defauts.pour || "tous";
  const pour = choixJoueurs(joueurs, { coches: pourInitial === "tous" ? joueurs.map(j => j.pseudo) : pourInitial, legende: "Destinataires prévus" });
  const msg = h("div", { class: "jr-retour-action" });
  const garder = h("button", { class: "jr-bouton", type: "button" }, icon("check", 18), carte ? "Enregistrer" : "Garder pour plus tard");
  const maintenant = carte ? null : h("button", { class: "jr-bouton gros rv-reveler", type: "button" }, icon("eye", 20), "Enregistrer et révéler maintenant");
  const fermer = feuille(carte ? "Modifier la carte" : "Nouvelle carte", [
    h("div", { class: "rv-grille" }, champ("Type", selType), champ("Session", session, "Numéro, facultatif."), champ("Lieu", lieu, "Facultatif.")),
    champ("Titre", titre), champStatut, champQuantite,
    champ("Ce que les joueurs lisent", texte),
    champ("Vérité du MJ (ne sort jamais du coffre)", verite),
    champ("Prévu pour", h("div", null, prevu, h("datalist", { id: idListe }, documents.map(d => h("option", { value: d })))), "Le document où tu comptes la révéler : elle apparaîtra dans l'écran « Séance » de ce document."),
    pour.noeud, msg, h("div", { class: "jr-actions" }, garder, maintenant)], { large: true });
  const envoyer = async reveler => {
    const champs = { type: selType.value, titre: titre.value, texte: texte.value, verite: verite.value, session: session.value, lieu: lieu.value, prevu: prevu.value, pour: pour.lire(), statut: statut.value, quantite: quantite.value };
    const r = await executer(ctx, () => (carte ? ctx.regie.modifierCarte(carte, champs) : ctx.regie.creerCarte(champs)), { zone: msg, boutons: [garder, maintenant] });
    if (!r.ok) return;
    fermer(); surFini(r.r, reveler);
  };
  garder.addEventListener("click", () => envoyer(false));
  if (maintenant) maintenant.addEventListener("click", () => envoyer(true));
  setTimeout(() => titre.focus(), 50);
}

/**
 * Fiche d'une ligne du catalogue : ce que les joueurs lisent, ce qui reste au coffre, à qui la révéler.
 * `surChange()` : l'écran appelant relit le catalogue.
 */
export async function ouvrirCarte(ctx, ligne, { joueurs, documents = [], surChange = () => {} }) {
  const ty = typeDe(ligne.type), ecrire = peutEcrire(ctx);
  const zone = h("div", { class: "jr-retour-action" });
  const corps = h("div", { class: "rv-fiche" }, message("Lecture…", "info"));
  const fermer = feuille(ligne.titre, corps, { large: true });
  let apercu = null;
  try { apercu = await ctx.regie.apercu(ligne); } catch (e) { if (e && (e.status === 401 || e.auth)) { fermer(); return ctx.surErreur(e); } }
  const ont = joueurs.filter(j => j.pseudo in ligne.chez), manquent = joueurs.filter(j => j.lisible && !(j.pseudo in ligne.chez));
  const c = ligne.carte;
  const reperes = [ty.singulier, c && c.session ? `Session ${c.session}` : "", c && c.lieu, c && c.prevu ? `Prévu : ${c.prevu.replace(/\.md$/i, "").replace(/_/g, " ")}` : ""].filter(Boolean);
  const pour = choixJoueurs(joueurs.filter(j => j.lisible), { coches: manquent.filter(j => ligne.prevus.includes(j.pseudo)).map(j => j.pseudo), inactifs: ont.map(j => j.pseudo), legende: "Révéler à" });
  const bReveler = h("button", { class: "jr-bouton gros rv-reveler", type: "button" }, icon("eye", 20), "Révéler à la sélection");
  const fini = () => { fermer(); surChange(); };
  bReveler.addEventListener("click", async () => {
    const cibles = pour.choisis();
    if (!cibles.length) { zone.replaceChildren(message("Coche au moins un joueur.", "alerte")); return; }
    const r = await executer(ctx, () => ctx.regie.reveler(ligne, cibles), { zone, boutons: [bReveler] });
    if (r.ok) fini();
  });
  const modifier = async () => {
    const r = await executer(ctx, () => ctx.regie.adopter(ligne), { zone });
    if (!r.ok) return;
    fermer();
    formulaireCarte(ctx, { carte: r.r, joueurs, documents, surFini: () => surChange() });
  };
  const pousser = async () => {
    if (!await confirmer("Mettre à jour chez les joueurs ?", `Le texte actuel de la carte remplacera celui de ${liste(ont.map(j => j.pseudo))}. Ce qu'ils ont écrit eux-mêmes (leur note, ce qu'ils ont fait) est gardé.`, "Mettre à jour")) return;
    const r = await executer(ctx, () => ctx.regie.mettreAJour(ligne), { zone });
    if (r.ok) fini();
  };
  const supprimer = async () => {
    if (!await confirmer("Supprimer cette carte ?", "Personne ne l'a reçue. Elle ira dans la corbeille OneDrive.", "Supprimer")) return;
    const r = await executer(ctx, () => ctx.regie.supprimerCarte(ligne), { zone });
    if (r.ok) fini();
  };
  // `replaceChildren` écrirait « null » pour un argument absent : la liste est aplatie et nettoyée avant
  corps.replaceChildren(...[
    h("div", { class: "jr-puces" }, reperes.map(x => h("span", { class: "jr-puce" }, x)), h("span", { class: "rv-etat " + ligne.etat }, LIBELLE_ETAT[ligne.etat])),
    h("section", { class: "rv-bloc" }, h("h3", null, icon("eye", 16), "Ce que les joueurs lisent"),
      apercu ? h("div", { class: "jr-md" }, rendreMarkdown(corpsLisible(apercu))) : message("Rien de publiable : le texte contient une marque de secret, ou il est vide. Modifie la carte.", "erreur")),
    c && c.verite ? h("section", { class: "rv-bloc secret" }, h("h3", null, icon("lock", 16), "Ne sort jamais du coffre"), h("div", { class: "jr-md" }, rendreMarkdown(c.verite))) : null,
    ont.length ? h("p", { class: "jr-meta" }, icon("check", 16), `Déjà chez : ${liste(ont.map(j => j.pseudo))}`) : null,
    !ecrire ? message("Lecture seule : l'écriture est fermée pour ce JDR.", "info") : null,
    ecrire && manquent.length && apercu ? [pour.noeud, bReveler] : null,
    zone,
    ecrire ? h("div", { class: "jr-actions" },
      h("button", { class: "jr-bouton", type: "button", onclick: modifier }, icon("pen", 18), "Modifier"),
      c && ont.length ? h("button", { class: "jr-bouton", type: "button", onclick: pousser }, icon("clock", 18), "Mettre à jour chez eux") : null,
      c && !ligne.n ? h("button", { class: "jr-bouton danger", type: "button", onclick: supprimer }, icon("trash", 18), "Supprimer") : null) : null
  ].flat(Infinity).filter(Boolean));
}

/** Annonce discrète en bas de l'écran (résultat d'une action, avec « Annuler » quand c'est possible). */
export function annoncer(texte, { action = null, libelle = "Annuler", duree = 9000 } = {}) {
  document.querySelectorAll(".rv-annonce").forEach(n => n.remove());
  const n = h("div", { class: "rv-annonce", role: "status" }, h("span", null, texte),
    action ? h("button", { class: "jr-pastille petite", type: "button", onclick: () => { n.remove(); action(); } }, libelle) : null,
    h("button", { class: "rv-annonce-x", type: "button", "aria-label": "Fermer", onclick: () => n.remove() }, icon("x", 16)));
  document.body.append(n);
  setTimeout(() => n.remove(), duree);
}

/** Noms de fichiers des documents du parcours (pour « Prévu pour »). */
async function nomsDocuments(ctx) {
  try { const d = await ctx.regie.documents(); return [...d.sessions, ...d.lieux].map(x => x.fichier); } catch (e) { if (e && (e.status === 401 || e.auth)) throw e; return []; }
}

export async function ecranRevelationsMJ(ctx, typeId = "savoir") {
  if (typeId === "journal") return ecranJournalMJ(ctx);
  const ty = typeDe(typeId) || TYPES[0];
  const ecrire = peutEcrire(ctx);
  let cat = await ctx.regie.catalogue(ty.id);
  const documents = await nomsDocuments(ctx);
  const filtre = ctx.etat.revelationsMJ || (ctx.etat.revelationsMJ = { texte: "", etat: "" });
  const corps = h("tbody"), tete = h("thead"), compte = h("span", { class: "jr-meta mj-compte" });
  const pastilles = h("div", { class: "jr-puces filtre mj-filtres", role: "group", "aria-label": "Filtrer les cartes" });
  const zone = h("div", { class: "jr-retour-action" });
  let occupe = false;

  const recharger = async () => { cat = await ctx.regie.catalogue(ty.id); dessiner(); };
  /** Une écriture à la fois : les cases sont inertes pendant l'envoi (un double clic ne révèle pas deux fois). */
  const agir = async (action, apres) => {
    if (occupe) return;
    occupe = true; corps.classList.add("occupe");
    const r = await executer(ctx, action, { zone });
    occupe = false; corps.classList.remove("occupe");
    try { await recharger(); } catch (e) { if (e && (e.status === 401 || e.auth)) return ctx.surErreur(e); }
    if (r.ok && apres) apres(r.r);
  };
  const reveler = (l, cibles) => agir(() => ctx.regie.reveler(l, cibles), r => {
    if (!r.faits.length) return annoncer(`« ${l.titre} » : déjà chez ${liste(cibles)}.`);
    annoncer(`« ${l.titre} » révélé à ${liste(r.faits)}.`, { action: async () => {
      const ligne = cat.lignes.find(x => x.fichier && x.fichier === r.fichier);
      if (ligne) await agir(async () => { for (const p of r.faits) await ctx.regie.retirer(ligne, p); }, () => annoncer(`Révélation annulée pour ${liste(r.faits)}.`));
    } });
  });
  const retirer = async (l, j) => {
    if (!await confirmer(`Retirer à ${j.nom} ?`, `« ${l.titre} » sera retiré de son dossier (corbeille OneDrive). S'il y avait écrit une note, elle part avec.`, "Retirer")) return;
    agir(() => ctx.regie.retirer(l, j.pseudo), () => annoncer(`« ${l.titre} » retiré à ${j.nom}.`));
  };

  const cellule = (l, j) => {
    if (!j.lisible) return h("td", { class: "mj-case inconnu", title: `${j.nom} : dossier illisible` }, h("span", { class: "mj-case-tiret", "aria-hidden": "true" }, "?"));
    const a = j.pseudo in l.chez, prevu = l.prevus.includes(j.pseudo);
    const etiquette = a ? `${j.nom} connaît « ${l.titre} » : retirer` : `Révéler « ${l.titre} » à ${j.nom}`;
    return h("td", { class: "mj-case rv-case-td " + (a ? "oui" : "non") + (!a && !prevu ? " hors" : "") },
      h("button", { class: "rv-coche" + (a ? " on" : ""), type: "button", disabled: !ecrire, "aria-pressed": String(a), "aria-label": etiquette, title: ecrire ? etiquette : `${j.nom} : ${a ? "connaît" : "ne connaît pas"}`,
        onclick: () => (a ? retirer(l, j) : reveler(l, [j.pseudo])) }, a ? icon("check", 18) : icon("plus", 16)));
  };
  const ligne = l => {
    const reste = l.prevus.filter(p => !(p in l.chez));
    const c = l.carte;
    return h("tr", { class: l.etat },
      h("th", { scope: "row", class: "mj-savoir rv-titre" },
        h("button", { class: "rv-ouvrir", type: "button", onclick: () => ouvrirCarte(ctx, l, { joueurs: cat.joueurs, documents, surChange: () => recharger().catch(e => ctx.surErreur(e)) }) },
          h("span", { class: "rv-ouvrir-titre" }, l.titre),
          h("span", { class: "rv-ouvrir-meta" }, c && c.verite ? h("span", { class: "rv-marque secret", title: "Cette carte a une vérité gardée au coffre" }, icon("lock", 12), "vérité MJ") : null,
            c && c.prevu ? h("span", { class: "rv-marque" }, c.prevu.replace(/\.md$/i, "").replace(/^\d+_/, "").replace(/_/g, " ")) : null,
            c && Array.isArray(c.pour) ? h("span", { class: "rv-marque" }, `pour ${liste(c.pour)}`) : null))),
      ...cat.joueurs.map(j => cellule(l, j)),
      h("td", { class: "rv-tous" }, reste.length && ecrire
        ? h("button", { class: "jr-pastille petite rv-a-tous", type: "button", title: `Révéler à ${liste(reste)}`, onclick: () => reveler(l, reste) }, icon("eye", 15), reste.length === l.prevus.length ? "À tous" : `+${reste.length}`)
        : h("span", { class: "mj-total" + (l.etat === "tous" ? " tous" : "") }, `${l.n}/${l.sur}`)));
  };
  function dessiner() {
    const c = compterCatalogue(cat.lignes);
    const vus = filtrerCatalogue(cat.lignes, filtre);
    tete.replaceChildren(h("tr", null, h("th", { scope: "col", class: "mj-savoir" }, ty.libelle),
      ...cat.joueurs.map(j => h("th", { scope: "col", class: "mj-joueur-col", title: j.nom }, h("span", { class: "mj-joueur-col-nom" }, j.nom), h("span", { class: "mj-joueur-col-n" }, j.lisible ? String(j.total) : "?"))),
      h("th", { scope: "col", class: "mj-total" }, "Table")));
    corps.replaceChildren(...vus.map(ligne));
    if (!vus.length) corps.append(h("tr", null, h("td", { class: "mj-aucun", colspan: String(cat.joueurs.length + 2) }, h("p", { class: "jr-vide" }, cat.lignes.length ? "Aucune carte ne correspond à ce filtre." : `Aucune carte de ce type. « Nouvelle carte » en crée une.`))));
    compte.textContent = vus.length === cat.lignes.length ? `${cat.lignes.length} carte${cat.lignes.length > 1 ? "s" : ""}` : `${vus.length} sur ${cat.lignes.length}`;
    const puce = (cle, libelle, n) => h("button", { class: "jr-pastille petite" + (filtre.etat === cle ? " on" : "") + (!n && cle ? " zero" : ""), type: "button", "aria-pressed": String(filtre.etat === cle),
      onclick: () => { filtre.etat = filtre.etat === cle ? "" : cle; dessiner(); } }, cle ? h("span", { class: "rv-point " + cle }) : null, libelle, h("span", { class: "mj-n" }, String(n)));
    pastilles.replaceChildren(puce("", "Toutes", c.total), ...FILTRES.map(f => puce(f.cle, f.libelle, c[f.cle])));
  }

  const champRecherche = h("input", { class: "mj-recherche-champ", type: "search", placeholder: "Chercher une carte…", value: filtre.texte, "aria-label": "Chercher une carte", oninput: () => { filtre.texte = champRecherche.value; dessiner(); } });
  const nouvelle = () => formulaireCarte(ctx, { type: ty.id, joueurs: cat.joueurs.filter(j => j.lisible), documents, surFini: async (carte, maintenant) => {
    try {
      await recharger();
      const l = cat.lignes.find(x => x.carte && x.carte.fichier === carte.fichier);
      if (carte.type !== ty.id) { location.hash = `#/mj/revelations/${enc(carte.type)}`; return; }
      if (maintenant && l) reveler(l, l.prevus); else annoncer(`Carte « ${carte.titre} » gardée au coffre.`);
    } catch (e) { ctx.surErreur(e); }
  } });
  const voirJournal = async () => {
    const lignes = await ctx.regie.journal(40).catch(() => []);
    feuille("Journal des révélations", lignes.length ? h("ul", { class: "rv-journal" }, lignes.map(l => h("li", null, l))) : h("p", { class: "jr-vide" }, "Rien pour l'instant : chaque révélation, retrait ou mise à jour s'inscrira ici."), { large: true });
  };

  const contenu = [
    h("div", { class: "mj-doc-tete" }, h("h2", { class: "mj-doc-titre" }, "Révélations"),
      h("p", { class: "jr-meta" }, "Un clic sur une case donne la carte à ce joueur ; elle apparaît dans son application ouverte en moins d'une demi-minute. Le titre ouvre la carte.")),
    navRevelations(ty.id),
    !ecrire ? message("Lecture seule : l'écriture est fermée pour ce JDR (réglage « ecriture » de la configuration). Tu vois qui sait quoi, sans pouvoir révéler.", "alerte") : null,
    h("div", { class: "rv-barre" },
      h("label", { class: "mj-recherche" }, icon("search", 20), champRecherche),
      ecrire ? h("button", { class: "jr-bouton rv-nouvelle", type: "button", onclick: nouvelle }, icon("plus", 18), "Nouvelle carte") : null,
      h("button", { class: "jr-bouton", type: "button", onclick: voirJournal }, icon("scroll", 18), "Journal")),
    h("div", { class: "mj-lieux-tete" }, pastilles, compte),
    zone,
    !cat.joueurs.length ? message("Aucun dossier de joueur pour l'instant.", "info")
      : h("div", { class: "mj-matrice-defile rv-matrice", tabindex: "0", role: "region", "aria-label": "Qui a reçu quoi" }, h("table", { class: "mj-matrice" }, tete, corps))];
  if (cat.joueurs.length) dessiner();
  return { page: cadreMJ(ctx, { actif: "revelations" }, ...contenu.filter(Boolean)) };
}

/* ------------------------------------------------------------------ Journal des joueurs : les comptes rendus de session */
/** Les pastilles de l'écran : les quatre types de cartes, puis le journal. */
const navRevelations = actif => h("nav", { class: "jr-souslignes", "aria-label": "Types de cartes" },
  TYPES.map(t => h("a", { class: "jr-pastille" + (t.id === actif ? " on" : ""), href: `#/mj/revelations/${enc(t.id)}`, "aria-current": t.id === actif ? "page" : null }, t.libelle)),
  h("a", { class: "jr-pastille" + (actif === "journal" ? " on" : ""), href: "#/mj/revelations/journal", "aria-current": actif === "journal" ? "page" : null }, icon("book", 16), "Journal"));

/** Formulaire d'un compte rendu : création (`ligne` absente) ou correction. `surFini(ligne, montrer:boolean)`. */
function formulaireCompteRendu(ctx, { ligne = null, contenu = null, surFini = () => {} } = {}) {
  const titre = saisie({ maxlength: "120", value: contenu ? contenu.titre : "", "aria-label": "Titre", placeholder: "Session 12 : le titre que liront les joueurs" });
  const session = saisie({ maxlength: "40", value: contenu ? contenu.session : "", "aria-label": "Session", placeholder: "12" });
  const texte = zoneTexte(contenu ? contenu.texte : "", { rows: "12", "aria-label": "Texte pour les joueurs", placeholder: "Ce que tout le groupe sait après cette séance. Aucun secret." });
  const notes = zoneTexte(contenu ? contenu.notes : "", { rows: "3", "aria-label": "Notes du MJ", placeholder: "Facultatif : ce que tu gardes pour toi sur cette séance." });
  notes.classList.add("rv-secret-champ");
  const msg = h("div", { class: "jr-retour-action" });
  const garder = h("button", { class: "jr-bouton", type: "button" }, icon("check", 18), ligne ? (ligne.visible ? "Enregistrer (les joueurs verront la correction)" : "Enregistrer") : "Garder masqué pour l'instant");
  const montrer = ligne ? null : h("button", { class: "jr-bouton gros rv-reveler", type: "button" }, icon("eye", 20), "Enregistrer et montrer aux joueurs");
  const fermer = feuille(ligne ? "Corriger le compte rendu" : "Nouveau compte rendu", [
    h("div", { class: "rv-grille deux" }, champ("Titre", titre), champ("Session", session, "Le numéro range le compte rendu dans le journal.")),
    champ("Ce que les joueurs lisent", texte),
    champ("Notes du MJ (ne sortent jamais du coffre)", notes),
    msg, h("div", { class: "jr-actions" }, garder, montrer)], { large: true });
  const envoyer = async voir => {
    const champs = { titre: titre.value, session: session.value, texte: texte.value, notes: notes.value };
    const r = await executer(ctx, async () => { const l = await ctx.regie.enregistrerCompteRendu(ligne, champs); if (voir) await ctx.regie.montrerCompteRendu(l); return l; }, { zone: msg, boutons: [garder, montrer] });
    if (!r.ok) return;
    fermer(); surFini(r.r, voir);
  };
  garder.addEventListener("click", () => envoyer(false));
  if (montrer) montrer.addEventListener("click", () => envoyer(true));
  setTimeout(() => titre.focus(), 50);
}

/** Onglet « Journal » : chaque compte rendu de session, visible par toute la table ou masqué (gardé au coffre). */
export async function ecranJournalMJ(ctx) {
  const ecrire = peutEcrire(ctx);
  let lignes = await ctx.regie.comptesRendus();
  const zone = h("div", { class: "jr-retour-action" }), listeN = h("ul", { class: "rj-liste" }), compte = h("span", { class: "jr-meta mj-compte" });
  let occupe = false;
  const recharger = async () => { lignes = await ctx.regie.comptesRendus(); dessiner(); };
  const agir = async (action, apres) => {
    if (occupe) return;
    occupe = true; listeN.classList.add("occupe");
    const r = await executer(ctx, action, { zone });
    occupe = false; listeN.classList.remove("occupe");
    try { await recharger(); } catch (e) { if (e && (e.status === 401 || e.auth)) return ctx.surErreur(e); }
    if (r.ok && apres) apres(r.r);
  };
  const masquer = l => agir(() => ctx.regie.masquerCompteRendu(l), () => annoncer(`« ${l.titre} » est masqué : les joueurs ne le voient plus.`, { action: () => agir(() => ctx.regie.montrerCompteRendu({ ...l, auCoffre: true }), () => annoncer(`« ${l.titre} » est de nouveau visible.`)) }));
  const montrer = l => agir(() => ctx.regie.montrerCompteRendu(l), () => annoncer(`« ${l.titre} » est visible dans le journal des joueurs.`, { action: () => agir(() => ctx.regie.masquerCompteRendu({ ...l, visible: true, fichierTable: l.fichier }), () => annoncer(`« ${l.titre} » est masqué.`)) }));
  const ouvrir = async l => {
    const corps = h("div", { class: "rv-fiche" }, message("Lecture…", "info"));
    const z = h("div", { class: "jr-retour-action" });
    const fermer = feuille(l.titre, corps, { large: true });
    let c = null;
    try { c = await ctx.regie.compteRendu(l); } catch (e) { if (e && (e.status === 401 || e.auth)) { fermer(); return ctx.surErreur(e); } }
    if (!c) return corps.replaceChildren(message("Ce compte rendu n'existe plus.", "erreur"));
    const supprimer = async () => {
      if (!await confirmer("Supprimer ce compte rendu ?", "Il est masqué : aucun joueur ne le voit. Il ira dans la corbeille OneDrive.", "Supprimer")) return;
      const r = await executer(ctx, () => ctx.regie.supprimerCompteRendu(l), { zone: z });
      if (r.ok) { fermer(); recharger().catch(e => ctx.surErreur(e)); }
    };
    corps.replaceChildren(...[
      h("div", { class: "jr-puces" }, c.session ? h("span", { class: "jr-puce" }, `Session ${c.session}`) : null, h("span", { class: "rv-etat " + (l.visible ? "tous" : "a_reveler") }, icon(l.visible ? "eye" : "lock", 14), l.visible ? "Visible par les joueurs" : "Masqué")),
      h("section", { class: "rv-bloc" }, h("h3", null, icon("eye", 16), "Ce que les joueurs lisent"), h("div", { class: "jr-md" }, rendreMarkdown(c.texte || ""))),
      c.notes ? h("section", { class: "rv-bloc secret" }, h("h3", null, icon("lock", 16), "Ne sort jamais du coffre"), h("div", { class: "jr-md" }, rendreMarkdown(c.notes))) : null,
      z,
      ecrire ? h("div", { class: "jr-actions" },
        h("button", { class: "jr-bouton", type: "button", onclick: () => { fermer(); formulaireCompteRendu(ctx, { ligne: l, contenu: c, surFini: () => { annoncer(`« ${l.titre} » corrigé.`); recharger().catch(e => ctx.surErreur(e)); } }); } }, icon("pen", 18), "Corriger"),
        l.visible ? h("button", { class: "jr-bouton", type: "button", onclick: () => { fermer(); masquer(l); } }, icon("lock", 18), "Masquer aux joueurs")
          : h("button", { class: "jr-bouton rv-reveler", type: "button", onclick: () => { fermer(); montrer(l); } }, icon("eye", 18), "Montrer aux joueurs"),
        !l.visible ? h("button", { class: "jr-bouton danger", type: "button", onclick: supprimer }, icon("trash", 18), "Supprimer") : null) : null
    ].flat(Infinity).filter(Boolean));
  };
  const ligne = l => h("li", { class: "rj-ligne " + (l.visible ? "visible" : "masque") },
    h("button", { class: "rj-corps", type: "button", onclick: () => ouvrir(l) },
      h("span", { class: "rj-num" }, (n => (n ? (n.length > 1 ? `S${n[0]}·${n[n.length - 1]}` : n[0]) : "·"))(String(l.session || "").match(/\d+/g))),
      h("span", { class: "rj-titre" }, l.titre)),
    h("span", { class: "rv-etat " + (l.visible ? "tous" : "a_reveler") }, l.visible ? "Visible" : "Masqué"),
    ecrire ? h("button", { class: "rj-bascule" + (l.visible ? " on" : ""), type: "button", role: "switch", "aria-checked": String(l.visible), "aria-label": l.visible ? `Masquer « ${l.titre} » aux joueurs` : `Montrer « ${l.titre} » aux joueurs`,
      title: l.visible ? "Masquer aux joueurs" : "Montrer aux joueurs", onclick: () => (l.visible ? masquer(l) : montrer(l)) }, h("span", { class: "rj-bascule-rond" }, icon(l.visible ? "eye" : "lock", 14))) : null);
  function dessiner() {
    const v = lignes.filter(l => l.visible).length;
    compte.textContent = `${lignes.length} compte${lignes.length > 1 ? "s" : ""} rendu${lignes.length > 1 ? "s" : ""} · ${v} visible${v > 1 ? "s" : ""} · ${lignes.length - v} masqué${lignes.length - v > 1 ? "s" : ""}`;
    listeN.replaceChildren(...lignes.map(ligne));
    if (!lignes.length) listeN.append(h("li", { class: "jr-vide" }, "Aucun compte rendu pour l'instant."));
  }
  dessiner();
  const nouveau = () => formulaireCompteRendu(ctx, { surFini: (l, voir) => { annoncer(voir ? `« ${l.titre} » est visible dans le journal des joueurs.` : `« ${l.titre} » est gardé au coffre, masqué.`); recharger().catch(e => ctx.surErreur(e)); } });
  const contenu = [
    h("div", { class: "mj-doc-tete" }, h("h2", { class: "mj-doc-titre" }, "Révélations"),
      h("p", { class: "jr-meta" }, "Le journal des joueurs : chaque compte rendu de session est lu par toute la table (onglet Savoirs, puis Journal de leur application). L'interrupteur le montre ou le masque pour tout le monde.")),
    navRevelations("journal"),
    !ecrire ? message("Lecture seule : l'écriture est fermée pour ce JDR.", "alerte") : null,
    h("div", { class: "rv-barre" }, compte, ecrire ? h("button", { class: "jr-bouton rv-nouvelle", type: "button", onclick: nouveau }, icon("plus", 18), "Nouveau compte rendu") : null),
    zone, listeN];
  return { page: cadreMJ(ctx, { actif: "revelations" }, ...contenu.filter(Boolean)) };
}
