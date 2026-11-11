// Accueil du MJ : le PARCOURS de la campagne. Tous les documents du MJ (sessions de jeu et lieux) rangés en quatre colonnes
// (Prochaine session, À suivre, Lointain, Joué) qu'il réordonne en glissant les cartes, selon là où vont les personnages.
// Le rangement est un fichier du coffre (`Parcours.md`) : il suit le MJ d'un appareil à l'autre. Sur téléphone ou au clavier, le bouton « déplacer » remplace le glisser.
// RÈGLE du moteur : jamais de innerHTML.
import { COLONNES, rangerParcours, parcoursDepuisRangement, deplacer, decaler } from "../../src/mj/parcours.js?v=0.24.1";
import { h, icon, message, feuille } from "./ui.js?v=0.24.1";
import { executer } from "./edition.js?v=0.24.1";
import { cadreMJ } from "./ecrans_mj.js?v=0.24.1";

const enc = encodeURIComponent;
const lienDoc = d => `#/mj/${d.genre}/${enc(d.fichier)}`;
const lienSeance = d => `#/mj/seance/${d.genre}/${enc(d.fichier)}`;

export async function ecranParcoursMJ(ctx) {
  const ecrire = !!(ctx.donnees && ctx.donnees.peutEcrireMJ);
  const [docs, parcours] = await Promise.all([ctx.regie.documents(), ctx.regie.parcours()]);
  let range = rangerParcours(parcours, docs.sessions, docs.lieux);
  const etat = h("span", { class: "jr-meta pc-etat", role: "status" });
  const zone = h("div", { class: "jr-retour-action" });
  const tableau = h("div", { class: "pc-tableau" });
  const hero = h("div");
  let enCours = Promise.resolve(), glisse = null;

  /** Enregistre le rangement affiché ; les enregistrements se suivent (jamais deux écritures en même temps sur le même fichier). */
  const enregistrer = () => {
    if (!ecrire) return;
    const p = parcoursDepuisRangement(range);
    etat.textContent = "Enregistrement…";
    enCours = enCours.then(async () => {
      const r = await executer(ctx, () => ctx.regie.enregistrerParcours(p), { zone });
      etat.textContent = r.ok ? "Rangement enregistré" : "";
    });
  };
  const appliquer = nouveau => { if (nouveau === range) return; range = nouveau; dessiner(); enregistrer(); };

  const menuDeplacer = d => {
    const col = COLONNES.find(c => range[c.cle].some(x => x.cle === d.cle));
    const fermer = feuille(d.titre, h("div", { class: "jr-menu" },
      h("p", { class: "jr-meta" }, `Actuellement dans « ${col.libelle} ».`),
      COLONNES.filter(c => c.cle !== col.cle).map(c => h("button", { class: "jr-bouton", type: "button", onclick: () => { fermer(); appliquer(deplacer(range, d.cle, c.cle)); } }, icon("next", 18), `Vers « ${c.libelle} »`)),
      h("div", { class: "jr-actions" },
        h("button", { class: "jr-bouton", type: "button", onclick: () => { appliquer(decaler(range, d.cle, -1)); } }, icon("chev_u", 18), "Monter"),
        h("button", { class: "jr-bouton", type: "button", onclick: () => { appliquer(decaler(range, d.cle, 1)); } }, icon("chev_d", 18), "Descendre"))));
  };

  const carte = (d, colonne) => {
    const li = h("li", { class: "pc-carte g-" + d.genre, draggable: ecrire ? "true" : null, "data-cle": d.cle },
      h("span", { class: "pc-genre", title: d.genre === "session" ? "Document de session" : "Document de lieu" }, icon(d.genre === "session" ? "moon" : "pin", 16)),
      h("a", { class: "pc-carte-corps", href: colonne === "prochaine" ? lienSeance(d) : lienDoc(d), draggable: "false" },
        h("span", { class: "pc-carte-titre" }, d.titre), d.sous ? h("span", { class: "pc-carte-sous" }, d.sous) : null),
      ecrire ? h("button", { class: "pc-poignee", type: "button", "aria-label": `Déplacer ${d.titre}`, title: "Déplacer", onclick: () => menuDeplacer(d) }, icon("move", 18)) : null);
    if (ecrire) {
      li.addEventListener("dragstart", e => { glisse = d.cle; li.classList.add("glisse"); e.dataTransfer.effectAllowed = "move"; try { e.dataTransfer.setData("text/plain", d.cle); } catch { /* certains navigateurs refusent : la variable suffit */ } });
      li.addEventListener("dragend", () => { glisse = null; li.classList.remove("glisse"); tableau.querySelectorAll(".dessus,.cible").forEach(n => n.classList.remove("dessus", "cible")); });
      li.addEventListener("dragover", e => { if (!glisse || glisse === d.cle) return; e.preventDefault(); e.stopPropagation(); tableau.querySelectorAll(".dessus").forEach(n => n.classList.remove("dessus")); li.classList.add("dessus"); });
      li.addEventListener("drop", e => { if (!glisse) return; e.preventDefault(); e.stopPropagation(); const cle = glisse; glisse = null; appliquer(deplacer(range, cle, colonne, d.cle)); });
    }
    return li;
  };
  const colonne = c => {
    const docsCol = range[c.cle];
    const ul = h("ul", { class: "pc-liste" }, docsCol.map(d => carte(d, c.cle)), !docsCol.length ? h("li", { class: "pc-vide" }, ecrire ? "Glisse un document ici." : "Rien ici.") : null);
    const sec = h("section", { class: "pc-colonne c-" + c.cle, "aria-label": c.libelle },
      h("header", { class: "pc-colonne-tete" }, h("h3", null, c.libelle), h("span", { class: "mj-n" }, String(docsCol.length))),
      h("p", { class: "pc-aide" }, c.aide), ul);
    if (ecrire) {
      sec.addEventListener("dragover", e => { if (!glisse) return; e.preventDefault(); sec.classList.add("cible"); });
      sec.addEventListener("dragleave", e => { if (!sec.contains(e.relatedTarget)) sec.classList.remove("cible"); });
      sec.addEventListener("drop", e => { if (!glisse) return; e.preventDefault(); const cle = glisse; glisse = null; appliquer(deplacer(range, cle, c.cle)); });
    }
    return sec;
  };
  function dessiner() {
    const p = range.prochaine;
    hero.replaceChildren(p.length
      ? h("section", { class: "mj-hero" },
        h("div", { class: "jr-kicker mj-hero-kicker" }, icon("calendar", 16), "Prochaine session"),
        h("h2", { class: "mj-hero-titre" }, p[0].titre),
        p.length > 1 ? h("div", { class: "jr-puces" }, p.slice(1).map(d => h("span", { class: "jr-puce" }, "puis " + d.titre))) : null,
        h("a", { class: "jr-bouton gros mj-hero-bouton", href: "#/mj/seance" }, icon("dice", 22), "Ouvrir la séance"))
      : h("section", { class: "mj-hero vide" },
        h("div", { class: "jr-kicker mj-hero-kicker" }, icon("calendar", 16), "Prochaine session"),
        h("p", { class: "mj-hero-vide" }, "Aucun document choisi pour la prochaine session."),
        h("p", { class: "jr-meta" }, ecrire ? "Glisse dans la colonne « Prochaine session » le ou les documents que tu vas jouer." : "Le rangement se fait quand l'écriture est ouverte pour ce JDR.")));
    tableau.replaceChildren(...COLONNES.map(colonne));
  }
  dessiner();
  const total = docs.sessions.length + docs.lieux.length;
  const page = cadreMJ(ctx, { actif: "accueil" },
    hero,
    h("div", { class: "mj-lieux-tete" }, h("h2", null, "Parcours de la campagne"), h("span", { class: "jr-meta mj-compte" }, `${total} document${total > 1 ? "s" : ""}`), etat,
      ecrire ? boutonImporter(ctx, () => parcoursDepuisRangement(range)) : null),
    h("p", { class: "jr-meta" }, icon("moon", 15), "document de session", h("span", { class: "pc-sep" }, "·"), icon("pin", 15), "document de lieu",
      ecrire ? h("span", { class: "pc-sep" }, "· glisse une carte pour la ranger ; clique-la pour l'ouvrir") : null),
    !ecrire ? message("Lecture seule : l'écriture est fermée pour ce JDR, le rangement ne peut pas être modifié.", "alerte") : null,
    zone,
    total ? tableau : message("Aucun document de session ni de lieu dans le coffre pour l'instant.", "info"));
  return { page };
}

/* ------------------------------------------------------------------ Importer un document Word (.docx) */
const NOMS_BLOCS = { lire: "à lire", dialogue: "dialogues", note: "notes MJ", secret: "secrets", fiche: "fiches / combats", alerte: "alertes / quêtes", recompense: "récompenses", lettre: "lettres", inconnu: "à examiner" };

/** Bouton « Importer un document Word » : choisit un .docx, le convertit dans le navigateur, montre ce qui a été reconnu, puis le range dans le coffre. */
function boutonImporter(ctx, parcoursActuel) {
  const champFichier = h("input", { type: "file", accept: ".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document", hidden: true });
  const bouton = h("button", { class: "jr-bouton pc-importer", type: "button", onclick: () => champFichier.click() }, icon("plus", 18), "Importer un document Word");
  champFichier.addEventListener("change", async () => {
    const f = champFichier.files && champFichier.files[0];
    champFichier.value = "";
    if (!f) return;
    bouton.disabled = true;
    try {
      // Les modules de conversion ne sont téléchargés qu'ici : ni les joueurs ni l'ouverture de l'application ne les chargent.
      const [{ ouvrirZip }, { convertirDocx, titreDepuisNom }] = await Promise.all([import("../../src/import/zip.js?v=0.24.1"), import("../../src/import/docx.js?v=0.24.1")]);
      if (!/\.docx$/i.test(f.name)) throw new Error("Choisis un fichier Word au format .docx (pas .doc ni .pdf).");
      const zip = await ouvrirZip(await f.arrayBuffer());
      const xml = await zip.texte("word/document.xml");
      if (xml == null) throw new Error("Ce fichier n'est pas un document Word (.docx).");
      const conv = convertirDocx(xml, await zip.texte("word/numbering.xml"));
      fenetreImport(ctx, { nom: f.name, titre: titreDepuisNom(f.name), conv, parcoursActuel });
    } catch (e) {
      feuille("Import impossible", [message(String((e && e.message) || e), "erreur"), h("p", { class: "jr-meta" }, "Rien n'a été écrit.")]);
    } finally { bouton.disabled = false; }
  });
  return h("span", { class: "pc-importer-zone" }, bouton, champFichier);
}

function fenetreImport(ctx, { nom, titre, conv, parcoursActuel }) {
  const r = conv.rapport;
  const lieuProbable = /wiki|lieu|ville|temple|for[eê]t|lac|grotte/i.test(nom) && !/session|module|sc[eè]ne/i.test(nom);
  const champ = (libelle, controle, aide) => h("label", { class: "jr-champ" }, h("span", null, libelle), controle, aide ? h("small", { class: "jr-aide" }, aide) : null);
  const saisie = (props = {}) => h("input", { class: "jr-saisie", type: "text", autocomplete: "off", ...props });
  const choix = (etiquette, options, valeur) => h("select", { class: "jr-select", "aria-label": etiquette }, options.map(([v, l]) => h("option", { value: v, selected: v === valeur }, l)));
  const genre = choix("Type de document", [["session", "Document de session"], ["lieu", "Document de lieu"]], lieuProbable ? "lieu" : "session");
  const champTitre = saisie({ maxlength: "120", value: titre, "aria-label": "Titre" });
  const saison = saisie({ inputmode: "numeric", maxlength: "3", "aria-label": "Saison" });
  const lieu = saisie({ maxlength: "80", "aria-label": "Lieu joué" });
  const type = choix("Type de lieu", [["ville", "Ville"], ["lieu", "Lieu"], ["donjon", "Donjon"], ["région", "Région"], ["route", "Route"], ["autre", "Autre"]], "lieu");
  const region = saisie({ maxlength: "80", "aria-label": "Région" });
  const colonne = choix("Ranger dans", COLONNES.filter(c => c.cle !== "joue").map(c => [c.cle, c.libelle]), "suivre");
  const pourSession = h("div", { class: "rv-grille deux" }, champ("Lieu joué", lieu, "Facultatif."), champ("Saison", saison, "Facultatif."));
  const pourLieu = h("div", { class: "rv-grille deux" }, champ("Région", region, "Facultatif."), champ("Type de lieu", type));
  const basculer = () => { pourSession.hidden = genre.value !== "session"; pourLieu.hidden = genre.value !== "lieu"; };
  genre.addEventListener("change", basculer); basculer();

  const blocs = Object.entries(r.blocs).map(([k, n]) => `${n} ${NOMS_BLOCS[k] || k}`);
  const perte = r.fidelite.pertePct;
  const msg = h("div", { class: "jr-retour-action" });
  const ok = h("button", { class: "jr-bouton gros rv-reveler", type: "button" }, icon("check", 20), "Importer dans le coffre");
  const fermer = feuille("Importer un document Word", [
    h("p", { class: "jr-meta" }, icon("scroll", 15), nom),
    h("section", { class: "rv-bloc" }, h("h3", null, icon("search", 16), "Ce qui a été reconnu"),
      h("div", { class: "jr-puces" }, [`${r.fidelite.motsSource} mots`, `${r.scenes} scène${r.scenes > 1 ? "s" : ""}`, `${r.tableaux} tableau${r.tableaux > 1 ? "x" : ""}`, ...blocs].map(x => h("span", { class: "jr-puce" }, x))),
      conv.titres.length ? h("ol", { class: "pc-import-scenes" }, conv.titres.slice(0, 14).map(x => h("li", null, x)), conv.titres.length > 14 ? h("li", { class: "jr-meta" }, `… et ${conv.titres.length - 14} autres`) : null)
        : message("Aucun titre de scène reconnu : le document sera lu d'un seul tenant. Dans Word, donne à tes titres de scène le style « Titre 1 ».", "alerte"),
      perte > 0.5 ? message(`Contrôle de fidélité : ${r.fidelite.perdus} mots du Word (${perte} %) ne se retrouvent pas dans la conversion. Relis le document après l'import.`, "alerte")
        : h("p", { class: "jr-meta" }, icon("check", 15), perte === 0 ? "Contrôle de fidélité : tous les mots du Word sont dans la conversion." : `Contrôle de fidélité : ${perte} % d'écart.`),
      r.avertissements.map(a => message(`Non repris : ${a}.`, "alerte")),
      r.cellulesSecretes ? h("p", { class: "jr-meta" }, icon("lock", 15), `${r.cellulesSecretes} cellule${r.cellulesSecretes > 1 ? "s" : ""} de tableau marquée${r.cellulesSecretes > 1 ? "s" : ""} secrète${r.cellulesSecretes > 1 ? "s" : ""}.`) : null),
    champ("Titre", champTitre),
    h("div", { class: "rv-grille deux" }, champ("Type de document", genre), champ("Ranger dans", colonne)),
    pourSession, pourLieu,
    h("p", { class: "jr-aide" }, "Le document va dans ton coffre (jamais chez les joueurs). Le fichier Word n'est ni modifié ni envoyé ailleurs : la conversion se fait dans ce navigateur."),
    msg, ok].flat(Infinity).filter(Boolean), { large: true });
  ok.addEventListener("click", async () => {
    const res = await executer(ctx, async () => {
      const doc = await ctx.regie.importerDocument({ genre: genre.value, titre: champTitre.value, saison: saison.value, lieu: lieu.value, type: type.value, region: region.value, markdown: conv.markdown, source: nom });
      const p = parcoursActuel();
      for (const c of COLONNES) p[c.cle] = p[c.cle].filter(d => !(d.genre === doc.genre && d.fichier === doc.fichier));
      p[colonne.value].push({ genre: doc.genre, fichier: doc.fichier });
      await ctx.regie.enregistrerParcours(p);
      return doc;
    }, { zone: msg, boutons: [ok] });
    if (!res.ok) return;
    fermer();
    location.hash = `#/mj/seance/${res.r.genre}/${enc(res.r.fichier)}`;   // on arrive dans le document : c'est là qu'on voit si les scènes et les blocs sont bons
  });
}
