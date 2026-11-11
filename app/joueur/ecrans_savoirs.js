// Onglet « Savoirs » et ses six pastilles : Savoirs, Quêtes, Journal, Rencontres, Notes, Carte (la carte est dans ecrans_carte.js).
// Le MJ écrit les récits et les présentations (lecture seule pour le joueur). Si le joueur peut écrire (tranche 2) : étiquettes, notes libres, notes de journal, « Ma note » des rencontres.
import { h, icon, message, pastille, meta, puces, extrait, rendreMarkdown, boiteImage, surbrillance } from "./ui.js?v=0.24.0";
import { ouvrirElement, etiquettesSeparees } from "./detail.js?v=0.24.0";
import { peut, formulaireNote, modifierNote, blocEtiquettes } from "./edition.js?v=0.24.0";
import { savoirsAppris } from "../../src/joueur/cartes.js?v=0.24.0";

export const PASTILLES = [
  ["savoirs", "Savoirs", "#/savoirs"], ["quetes", "Quêtes", "#/quetes"], ["journal", "Journal", "#/journal"],
  ["rencontres", "Rencontres", "#/rencontres"], ["notes", "Notes", "#/notes"], ["carte", "Carte", "#/carte"]
];
/** Ce que le MJ vient de révéler et que le joueur n'a pas encore ouvert (repère gardé sur l'appareil ; jamais pour le MJ qui « voit comme »). */
const nouveau = (ctx, e) => !!(ctx && ctx.nouveautes && ctx.nouveautes.estNouveau(e));
const badgeNouveau = () => h("span", { class: "jr-nouveau" }, "Nouveau");
const CHARGEURS_NOUVEAUTES = { savoirs: d => d.savoirs(), quetes: d => d.quetes(), rencontres: d => d.rencontres() };

/** Les six pastilles ; avec `ctx`, celles des savoirs, quêtes et rencontres reçoivent le nombre de nouveautés (lu sur les copies déjà chargées, sans bloquer l'écran). */
export function sousNav(actif, ctx = null) {
  const nav = h("nav", { class: "jr-souslignes", "aria-label": "Savoirs" }, PASTILLES.map(([id, libelle, href]) => {
    const p = pastille(libelle, { actif: id === actif, href });
    if (ctx && ctx.nouveautes && CHARGEURS_NOUVEAUTES[id]) {
      CHARGEURS_NOUVEAUTES[id](ctx.donnees).then(r => { const n = ctx.nouveautes.compter(r.items); if (n) p.append(h("span", { class: "jr-pastille-n", "aria-label": `${n} nouveau${n > 1 ? "x" : ""}` }, String(n))); }).catch(() => { /* la liste dira l'erreur */ });
    }
    return p;
  }));
  return nav;
}

const perime = r => (r && r.perime ? message("Copie enregistrée sur ce téléphone : la connexion ne répond pas.", "alerte") : null);
const ecran = (ctx, sous, ...enfants) => ({ onglet: "savoirs", sous, node: h("div", { class: "jr-page" }, sousNav(sous, ctx), ...enfants) });

/** Tri des listes : épinglés d'abord, puis session récente, puis titre. */
const ordre = (a, b) => (b.epingle - a.epingle) || ((b.session ?? -1) - (a.session ?? -1)) || a.titre.localeCompare(b.titre, "fr");

/** Carte d'un élément dans une liste. */
function carte(ctx, e, { tags, requete = "", ouvrir }) {
  const ex = extrait(e.corps, requete, 120);
  const neuf = nouveau(ctx, e);
  return h("li", null, h("button", { class: "jr-carte" + (neuf ? " nouveau" : ""), onclick: () => ouvrir(e) },
    h("div", { class: "jr-carte-tete" }, e.epingle ? h("span", { class: "jr-epingle", "aria-label": "Épinglé" }, icon("star", 14, "currentColor", 1.6, "currentColor")) : null,
      h("span", { class: "jr-carte-titre" }, surbrillance(e.titre, requete)),
      neuf ? badgeNouveau() : null,
      e.meta && e.meta.statut ? h("span", { class: "jr-badge" }, String(e.meta.statut)) : null),
    meta(e), ex ? h("div", { class: "jr-carte-extrait" }, surbrillance(ex, requete)) : null, puces(tags)));
}

/** Liste générique avec filtre par étiquette. */
async function liste(ctx, { id, charger, vide, ouvrirFichier, avant = null }) {
  const [r, et] = await Promise.all([charger(), ctx.chargerEtiquettes().catch(e => { if (e && (e.status === 401 || e.auth)) throw e; return { map: new Map() }; })]);
  // les nouveautés d'abord : c'est ce que le joueur vient chercher après une révélation
  const items = [...r.items].sort((a, b) => (nouveau(ctx, b) - nouveau(ctx, a)) || ordre(a, b));
  const tags = new Map(items.map(e => [e.fichier, [...new Set([...(e.etiquettes || []), ...ctx.donnees.etiquettesDe(et.map, e)])]]));
  const toutes = [...new Set([...tags.values()].flat())].sort((a, b) => a.localeCompare(b, "fr"));
  let choisie = "";
  const zone = h("ul", { class: "jr-cartes" });
  const barre = h("div", { class: "jr-puces filtre", role: "group", "aria-label": "Filtrer par étiquette" });
  const ouvrir = e => { if (ctx.nouveautes && ctx.nouveautes.marquerVu(e)) dessiner(); return ouvrirElement(ctx, e); };
  const dessiner = () => {
    zone.replaceChildren(...items.filter(e => !choisie || tags.get(e.fichier).includes(choisie)).map(e => carte(ctx, e, { tags: tags.get(e.fichier), ouvrir })));
    barre.replaceChildren(...(toutes.length ? [pastille("Toutes", { actif: !choisie, onclick: () => { choisie = ""; dessiner(); } }), ...toutes.map(t => pastille(t, { actif: choisie === t, onclick: () => { choisie = choisie === t ? "" : t; dessiner(); } }))] : []));
  };
  dessiner();
  const noeud = ecran(ctx, id, perime(r), avant, items.length ? [toutes.length ? barre : null, zone] : message(vide, "info"));
  if (ouvrirFichier) { const e = items.find(x => x.fichier === ouvrirFichier); if (e) setTimeout(() => ouvrir(e), 0); }
  return noeud;
}

export const ecranSavoirs = (ctx, f) => liste(ctx, { id: "savoirs", charger: () => ctx.donnees.savoirs(), vide: "Tu n'as encore rien appris. Ce que le MJ te révèle apparaîtra ici.", ouvrirFichier: f });
export async function ecranQuetes(ctx, f) {
  const { fiche } = await ctx.charger().catch(e => { if (e && (e.status === 401 || e.auth)) throw e; return { fiche: null }; });
  const perso = fiche && fiche.quetePerso ? h("section", { class: "jr-carte perso", "aria-label": "Ma quête personnelle" }, h("div", { class: "jr-carte-tete" }, icon("scroll", 18), h("span", { class: "jr-kicker" }, "Ma quête personnelle")), h("p", { class: "jr-texte" }, fiche.quetePerso)) : null;
  return liste(ctx, { id: "quetes", charger: () => ctx.donnees.quetes(), vide: "Aucune autre quête pour l'instant.", ouvrirFichier: f, avant: perso });
}
export const ecranNotes = (ctx, f) => liste(ctx, { id: "notes", charger: () => ctx.donnees.notes(), vide: "Aucune note pour l'instant.", ouvrirFichier: f,
  avant: peut(ctx) ? h("button", { class: "jr-bouton", type: "button", onclick: () => formulaireNote(ctx, { zone: "notes", surFini: () => ctx.reafficher() }) }, icon("plus", 18), "Nouvelle note") : null });

/* ---------------- Journal ---------------- */
export async function ecranJournal(ctx, sessionOuverte = null) {
  const r = await ctx.donnees.journal();
  const derniere = r.sessions.length ? r.sessions[0].session : 1;
  const nouvelle = (session = derniere) => formulaireNote(ctx, { zone: "journal", session, surFini: () => ctx.reafficher() });
  const boutonNote = session => (peut(ctx) ? h("button", { class: "jr-bouton", type: "button", onclick: () => nouvelle(session) }, icon("plus", 18), "Ajouter une note") : null);
  if (!r.sessions.length) return ecran(ctx, "journal", perime(r), message("Le journal est vide : les récits de session et tes notes de journal apparaîtront ici.", "info"), boutonNote(1));
  const premiere = sessionOuverte != null ? sessionOuverte : r.sessions[0].session;
  const blocs = r.sessions.map(s => {
    const titre = s.session ? `Session ${s.session}` : "Hors session";
    const d = h("details", { class: "jr-session", id: `jr-session-${s.session}` },
      h("summary", null, h("span", { class: "jr-session-n" }, titre), h("span", { class: "jr-session-col" }, s.titre ? h("span", { class: "jr-session-t" }, s.titre) : null, s.date ? h("span", { class: "jr-meta" }, s.date) : null), icon("chev_d", 18)),
      h("div", { class: "jr-session-corps" },
        s.recit ? h("div", { class: "jr-md" }, rendreMarkdown(s.recit.corps)) : h("p", { class: "jr-vide" }, "Pas de récit pour cette session."),
        s.notes.length ? h("div", null, h("div", { class: "jr-kicker" }, "Mes notes"), h("ul", { class: "jr-cartes" }, s.notes.map(n => carte(ctx, n, { tags: n.etiquettes, ouvrir: e => ouvrirElement(ctx, e) })))) : null,
        boutonNote(s.session)));
    if (s.session === premiere) d.open = true;
    return d;
  });
  const n = ecran(ctx, "journal", perime(r), blocs);
  if (sessionOuverte != null) setTimeout(() => { const d = document.getElementById(`jr-session-${sessionOuverte}`); if (d && d.scrollIntoView) d.scrollIntoView({ block: "start" }); }, 50);
  return n;
}

/* ---------------- Rencontres ---------------- */
export async function ecranRencontres(ctx) {
  const r = await ctx.donnees.rencontres();
  const items = [...r.items].sort((a, b) => (nouveau(ctx, b) - nouveau(ctx, a)) || ordre(a, b));
  if (!items.length) return ecran(ctx, "rencontres", perime(r), message("Tu n'as encore rencontré personne. Les personnages croisés apparaîtront ici.", "info"));
  const liste = h("ul", { class: "jr-cartes avec-image" }, items.map(e => h("li", null,
    h("a", { class: "jr-carte avec-image", href: `#/rencontres/${encodeURIComponent(e.fichier)}` },
      boiteImage(ctx, e.portrait, "jr-vignette ronde", "user"),
      h("div", { class: "jr-carte-col" }, h("span", { class: "jr-carte-tete" }, h("span", { class: "jr-carte-titre" }, e.titre), nouveau(ctx, e) ? badgeNouveau() : null), meta(e),
        e.presentation ? h("div", { class: "jr-carte-extrait" }, extrait(e.presentation, "", 90)) : null)))));
  return ecran(ctx, "rencontres", perime(r), liste);
}

export async function ecranRencontre(ctx, fichier) {
  const [r, sv] = await Promise.all([ctx.donnees.rencontres(), ctx.donnees.savoirs().catch(e => { if (e && (e.status === 401 || e.auth)) throw e; return { items: [] }; })]);
  const e = r.items.find(x => x.fichier === fichier);
  if (!e) return ecran(ctx, "rencontres", h("a", { class: "jr-retour", href: "#/rencontres" }, icon("back", 18), "Rencontres"), message("Cette rencontre n'existe plus dans ton dossier.", "info"));
  const ecrire = peut(ctx);
  const { fixes, posees } = await etiquettesSeparees(ctx, e);
  const tags = [...new Set([...fixes, ...posees])];
  // Seuls les savoirs que le personnage possède (fichiers de son dossier) sont montrés : un savoir absent n'est ni nommé ni signalé, un titre non appris serait un indice sur le secret du MJ.
  if (ctx.nouveautes) ctx.nouveautes.marquerVu(e);   // la rencontre est ouverte : elle n'est plus « nouvelle »
  const lies = savoirsAppris(e.savoirsLies, sv.items);
  const noeud = ecran(ctx, "rencontres",
    h("a", { class: "jr-retour", href: "#/rencontres" }, icon("back", 18), "Rencontres"),
    h("div", { class: "jr-rencontre-tete" }, boiteImage(ctx, e.portrait, "jr-portrait-rencontre", "user"), h("h2", { class: "jr-nom-grand" }, e.titre), meta(e), ecrire ? blocEtiquettes(ctx, e, { fixes, posees }) : puces(tags)),
    e.presentation ? h("section", { class: "jr-bloc" }, h("h3", null, "Présentation"), h("div", { class: "jr-md" }, rendreMarkdown(e.presentation))) : null,
    e.note || ecrire ? h("section", { class: "jr-bloc" }, h("h3", null, "Ma note"),
      e.note ? h("div", { class: "jr-md" }, rendreMarkdown(e.note)) : h("p", { class: "jr-vide" }, "Rien pour l'instant."),
      ecrire ? h("button", { class: "jr-bouton", type: "button", onclick: () => modifierNote(ctx, "rencontres", e.fichier, () => ctx.reafficher()) }, icon("pen", 18), e.note ? "Modifier ma note" : "Écrire ma note") : null) : null,
    !e.presentation && !e.note && e.corps ? h("div", { class: "jr-md" }, rendreMarkdown(e.corps)) : null,
    lies.length ? h("section", { class: "jr-bloc" }, h("h3", null, "Savoirs liés"), h("ul", { class: "jr-lignes" }, lies.map(sa => h("li", null,
      h("button", { class: "jr-ligne", onclick: () => ouvrirElement(ctx, sa) }, h("span", { class: "jr-ligne-nom" }, sa.titre), icon("next", 18)))))) : null);
  return noeud;
}
