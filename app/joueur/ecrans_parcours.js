// Accueil du MJ : le PARCOURS de la campagne. Tous les documents du MJ (sessions de jeu et lieux) rangés en quatre colonnes
// (Prochaine session, À suivre, Lointain, Joué) qu'il réordonne en glissant les cartes, selon là où vont les personnages.
// Le rangement est un fichier du coffre (`Parcours.md`) : il suit le MJ d'un appareil à l'autre. Sur téléphone ou au clavier, le bouton « déplacer » remplace le glisser.
// RÈGLE du moteur : jamais de innerHTML.
import { COLONNES, rangerParcours, parcoursDepuisRangement, deplacer, decaler } from "../../src/mj/parcours.js?v=0.21.0";
import { h, icon, message, feuille } from "./ui.js?v=0.21.0";
import { executer } from "./edition.js?v=0.21.0";
import { cadreMJ } from "./ecrans_mj.js?v=0.21.0";

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
    h("div", { class: "mj-lieux-tete" }, h("h2", null, "Parcours de la campagne"), h("span", { class: "jr-meta mj-compte" }, `${total} document${total > 1 ? "s" : ""}`), etat),
    h("p", { class: "jr-meta" }, icon("moon", 15), "document de session", h("span", { class: "pc-sep" }, "·"), icon("pin", 15), "document de lieu",
      ecrire ? h("span", { class: "pc-sep" }, "· glisse une carte pour la ranger ; clique-la pour l'ouvrir") : null),
    !ecrire ? message("Lecture seule : l'écriture est fermée pour ce JDR, le rangement ne peut pas être modifié.", "alerte") : null,
    zone,
    total ? tableau : message("Aucun document de session ni de lieu dans le coffre pour l'instant.", "info"));
  return { page };
}
