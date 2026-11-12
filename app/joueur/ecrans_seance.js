// Écran « Séance » du MJ : la table de jeu. Le document de la prochaine session au centre (scènes, blocs colorés : à lire, dialogue, note MJ, secret, combat),
// le sommaire des scènes à gauche, et à droite un panneau d'outils : fiche MJ, secrets, cartes à révéler, tuiles (PNJ, lieux, quêtes cités), joueurs et jauges, notes.
// Pensé pour l'ordinateur (trois colonnes) ; sur téléphone tout s'empile. RÈGLE du moteur : jamais de innerHTML.
import { parseDoc } from "../../src/md/doc.js?v=0.27.0";
import { rangerParcours, deplacer, parcoursDepuisRangement } from "../../src/mj/parcours.js?v=0.27.0";
import { decouper, ficheMJ, blocsDe, entitesCitees } from "../../src/mj/seance.js?v=0.27.0";
import { TYPES, typeDe, TYPE_DE_GENRE, carteDepuisFiche, ligneDeFiche } from "../../src/mj/revelations.js?v=0.27.0";
import { h, icon, message, rendreMarkdown, feuille, boiteImage } from "./ui.js?v=0.27.0";
import { executer, confirmer } from "./edition.js?v=0.27.0";
import { cadreMJ } from "./ecrans_mj.js?v=0.27.0";
import { formulaireCarte, ouvrirCarte, annoncer } from "./ecrans_regie.js?v=0.27.0";
import { annoncerPalier } from "./ecrans_jauges.js?v=0.27.0";
import { fenetreFiches } from "./ecrans_fiches.js?v=0.27.0";
import { palierDe } from "../../src/mj/jauges.js?v=0.27.0";

const enc = encodeURIComponent;
const estAuth = e => e && (e.status === 401 || e.auth);
const nomJoueur = p => String(p).replace(/_/g, " ");
const liste = noms => noms.map(nomJoueur).join(", ");
const ICONE_BLOC = { lire: "book", dialogue: "chat", note: "dice", secret: "lock", combat: "sword", alerte: "flag", recompense: "gem", lettre: "scroll" };
const ICONE_GENRE = { pnj: "user", lieu: "pin", quete: "scroll", faction: "flag", divinite: "star", creature: "monster", objet: "gem" };
const NOM_GENRE = { pnj: "Personnages", lieu: "Lieux", quete: "Quêtes", faction: "Factions", divinite: "Divinités", creature: "Créatures", objet: "Objets" };

/** Un bloc du document, coloré selon sa marque. */
function noeudBloc(b) {
  if (b.cle === "titre") return h("h4", { class: "se-soustitre" }, b.texte);
  if (b.cle === "texte") return h("div", { class: "jr-md se-prose" }, rendreMarkdown(b.texte));
  const titre = b.cle === "dialogue" ? (b.qui || "Dialogue") : b.qui || b.libelle;
  return h("div", { class: "se-bloc b-" + b.cle + (b.lire ? " a-lire" : "") },
    h("div", { class: "se-bloc-tete" }, icon(ICONE_BLOC[b.cle] || "note", 15), h("span", null, titre), b.cle === "dialogue" && b.lire ? h("span", { class: "se-bloc-note" }, "à dire") : null),
    h("div", { class: "jr-md" }, rendreMarkdown(b.texte)));
}

const ETAT_CARTE = { a_reveler: "pas encore révélée", partiel: "révélée en partie", tous: "révélée" };

/**
 * Bouton de la carte à révéler d'une fiche de PNJ, de quête ou d'objet : « Ouvrir la carte » si elle existe déjà (jamais de doublon),
 * sinon « Créer la carte », qui ouvre le formulaire prérempli (titre, type, document prévu ; tout le texte de la fiche dans la vérité du MJ).
 */
async function boutonCarte(ctx, e, texte, seance, place) {
  const type = TYPE_DE_GENRE[e.genre];
  if (!type) return;
  const ecrire = !!(ctx.donnees && ctx.donnees.peutEcrireMJ);
  let cat;
  try { cat = await ctx.regie.catalogue(type); } catch (err) { if (estAuth(err)) return ctx.surErreur(err); place.replaceChildren(); return; }
  const champs = carteDepuisFiche(e.genre, texte, e.fichier, { prevu: seance.doc ? seance.doc.fichier : "" });
  const l = ligneDeFiche(cat.lignes, e.genre, e.fichier, champs.titre);
  const redessiner = () => boutonCarte(ctx, e, texte, seance, place);
  if (l) {
    place.replaceChildren(h("button", { class: "jr-bouton", type: "button", onclick: () => ouvrirCarte(ctx, l, { joueurs: cat.joueurs, documents: seance.documents, surChange: redessiner }) }, icon("eye", 18), "Ouvrir la carte"),
      h("span", { class: "jr-meta" }, `Carte de ${typeDe(l.type).singulier} « ${l.titre} » · ${ETAT_CARTE[l.etat]}`));
    return;
  }
  if (!ecrire) { place.replaceChildren(); return; }
  const creer = () => formulaireCarte(ctx, { type, joueurs: cat.joueurs.filter(j => j.lisible), documents: seance.documents, defauts: champs, surFini: async (c, maintenant) => {
    if (maintenant) {
      const cat2 = await ctx.regie.catalogue(c.type);
      const l2 = cat2.lignes.find(x => x.carte && x.carte.fichier === c.fichier);
      if (l2) { const r = await executer(ctx, () => ctx.regie.reveler(l2, l2.prevus)); if (r.ok) annoncer(`« ${c.titre} » révélé à ${liste(r.r.faits)}.`); }
    } else annoncer(`Carte « ${c.titre} » gardée au coffre${c.prevu ? " : elle attend dans l'outil « Révéler »" : ""}.`);
    redessiner();
  } });
  place.replaceChildren(h("button", { class: "jr-bouton", type: "button", onclick: creer }, icon("plus", 18), "Créer la carte"),
    h("span", { class: "jr-meta" }, `Carte de ${typeDe(type).singulier} à révéler plus tard ; rien ne part chez les joueurs.`));
}

/** Fiche du coffre ouverte depuis une tuile : son texte, et les autres fiches qu'elle cite (on rebondit de tuile en tuile). */
async function ouvrirTuile(ctx, e, entites, seance = { doc: null, documents: [] }) {
  const corps = h("div", { class: "se-fiche" }, message("Lecture…", "info"));
  const fermer = feuille(e.nom, corps, { large: true });
  let texte = null;
  try { texte = await ctx.regie.fiche(e.genre, e.fichier); } catch (err) { if (estAuth(err)) { fermer(); return ctx.surErreur(err); } }
  if (texte == null) return corps.replaceChildren(message("Cette fiche n'existe plus dans le coffre.", "erreur"));
  const d = parseDoc(texte);
  const champs = Object.entries(d.meta).filter(([k, v]) => !["visibilite", "nom", "titre", "photo", "carte"].includes(k) && String(v).trim() !== "");
  const liens = entitesCitees(d.body, entites.filter(x => !(x.genre === e.genre && x.fichier === e.fichier))).slice(0, 18);
  const place = TYPE_DE_GENRE[e.genre] ? h("div", { class: "jr-actions se-fiche-carte" }) : null;
  corps.replaceChildren(...[
    h("div", { class: "jr-puces" }, h("span", { class: "jr-puce" }, e.libelle), champs.map(([k, v]) => h("span", { class: "jr-puce" }, `${k.replace(/_/g, " ")} : ${v}`))),
    place,
    liens.length ? h("div", { class: "se-liens" }, h("span", { class: "jr-kicker" }, "Liens"), h("div", { class: "se-tuiles serre" }, liens.map(x => tuile(ctx, x, entites, () => fermer(), seance)))) : null,
    h("div", { class: "jr-md mj-corps" }, rendreMarkdown(d.body.replace(/^\s*#\s+.+\n?/, "")))
  ].filter(Boolean));
  if (place) boutonCarte(ctx, e, texte, seance, place);
}
function tuile(ctx, e, entites, avant = null, seance = undefined) {
  return h("button", { class: "se-tuile g-" + e.genre, type: "button", title: `${e.libelle} · cité ${e.n} fois`, onclick: () => { if (avant) avant(); ouvrirTuile(ctx, e, entites, seance); } },
    h("span", { class: "se-tuile-ic" }, icon(ICONE_GENRE[e.genre] || "book", 18)), h("span", { class: "se-tuile-nom" }, e.nom), e.n > 1 ? h("span", { class: "se-tuile-n" }, String(e.n)) : null);
}

export async function ecranSeanceMJ(ctx, genre = null, fichier = null) {
  const ecrire = !!(ctx.donnees && ctx.donnees.peutEcrireMJ);
  const [docs, parcours] = await Promise.all([ctx.regie.documents(), ctx.regie.parcours()]);
  const range = rangerParcours(parcours, docs.sessions, docs.lieux);
  const tous = Object.values(range).flat();
  const prochains = range.prochaine;
  const doc = genre ? tous.find(d => d.genre === genre && d.fichier === fichier) : prochains[0];
  if (!doc) {
    return { page: cadreMJ(ctx, { actif: "seance" }, h("div", { class: "mj-doc-tete" }, h("h2", { class: "mj-doc-titre" }, "Séance")),
      message(genre ? "Ce document n'existe plus dans le coffre." : "Aucun document n'est rangé dans « Prochaine session ».", "info"),
      h("a", { class: "jr-bouton", href: "#/mj" }, icon("map", 18), "Choisir les documents dans le Parcours")) };
  }
  const [texte, entites] = await Promise.all([ctx.regie.document(doc.genre, doc.fichier), ctx.regie.entites().catch(e => { if (estAuth(e)) throw e; return []; })]);
  if (texte == null) return { page: cadreMJ(ctx, { actif: "seance" }, message("Ce fichier n'existe plus dans le dossier.", "erreur")) };
  const d = parseDoc(texte);
  const scenes = decouper(d.body);
  const cites = entitesCitees(d.body, entites.filter(e => !(e.genre === doc.genre && e.fichier === doc.fichier)));
  const seance = { doc, documents: tous.map(x => x.fichier) };   // ce qu'une fiche ouverte depuis une tuile doit savoir pour préparer sa carte

  /* ---- centre : le document, scène par scène ---- */
  const noeudsScenes = scenes.map((s, i) => h("section", { class: "se-scene", id: `se-scene-${i}` }, s.titre ? h("h3", { class: "se-scene-titre" + (/🔴|secret/i.test(s.titre) ? " mj-secret" : "") }, s.titre) : null, s.blocs.map(noeudBloc)));
  const allerA = i => { const n = noeudsScenes[i]; if (n) n.scrollIntoView({ behavior: "smooth", block: "start" }); };
  const sommaire = h("nav", { class: "se-sommaire", "aria-label": "Scènes" },
    h("div", { class: "jr-kicker" }, "Scènes"),
    h("ul", null, scenes.map((s, i) => (s.titre ? h("li", { class: "n" + s.niveau }, h("button", { type: "button", onclick: () => allerA(i) }, s.titre)) : null))),
    h("div", { class: "se-legende" }, ["lire", "dialogue", "note", "secret", "combat", "alerte"].map(c => h("span", { class: "se-legende-item b-" + c }, icon(ICONE_BLOC[c], 13), { lire: "À lire", dialogue: "Dialogue", note: "Note MJ", secret: "Secret", combat: "Combat", alerte: "Alerte" }[c]))));

  /* ---- droite : les outils ---- */
  const outil = h("div", { class: "se-outil" });
  const ONGLETS = [["fiche", "Fiche MJ", "fiche"], ["secrets", "Secrets", "lock"], ["reveler", "Révéler", "eye"], ["tuiles", "Tuiles", "friends"], ["joueurs", "Joueurs", "heart"], ["notes", "Notes", "pen"]];
  const etat = ctx.etat.seanceMJ || (ctx.etat.seanceMJ = { onglet: "fiche" });
  const barre = h("div", { class: "se-onglets", role: "tablist" });
  const versScene = (titre, index) => h("button", { class: "se-vers", type: "button", onclick: () => allerA(index) }, icon("next", 14), titre || "Début");

  const vues = {
    fiche() {
      const f = ficheMJ(scenes);
      if (!f.length) return [message("Ce document n'a pas de passage de préparation reconnu (synopsis, compétences clés, moments pivots, fins possibles, tableau de bord).", "info")];
      return f.map((x, i) => h("details", { class: "se-pli", open: i === 0 }, h("summary", null, h("span", null, x.titre), icon("chev_d", 16)), h("div", { class: "se-pli-corps" }, x.blocs.map(noeudBloc))));
    },
    secrets() {
      const secrets = blocsDe(scenes, "secret"), alertes = blocsDe(scenes, "alerte");
      const bloc = x => h("li", { class: "se-item b-" + x.bloc.cle }, versScene(x.scene, x.index), x.bloc.qui ? h("strong", null, x.bloc.qui) : null, h("div", { class: "jr-md" }, rendreMarkdown(x.bloc.texte)));
      return [
        h("h4", { class: "se-titre-outil secret" }, icon("lock", 15), `À ne pas révéler (${secrets.length})`),
        secrets.length ? h("ul", { class: "se-items" }, secrets.map(bloc)) : h("p", { class: "jr-vide" }, "Aucun bloc 🔴 dans ce document."),
        h("h4", { class: "se-titre-outil alerte" }, icon("flag", 15), `Alertes et quêtes (${alertes.length})`),
        alertes.length ? h("ul", { class: "se-items" }, alertes.map(bloc)) : h("p", { class: "jr-vide" }, "Aucun bloc 🆕 dans ce document.")];
    },
    async reveler() {
      const cats = await Promise.all(TYPES.map(t => ctx.regie.catalogue(t.id)));
      const joueurs = cats[0].joueurs;
      const documents = tous.map(x => x.fichier);
      const lignes = cats.flatMap(c => c.lignes).filter(l => l.carte && l.carte.prevu === doc.fichier);
      const redessiner = () => montrer("reveler");
      const reveler = async l => {
        const reste = l.prevus.filter(p => !(p in l.chez));
        const r = await executer(ctx, () => ctx.regie.reveler(l, reste), { zone });
        if (r.ok) { annoncer(`« ${l.titre} » révélé à ${liste(r.r.faits)}.`); redessiner(); }
      };
      const zone = h("div", { class: "jr-retour-action" });
      const carte = l => {
        const reste = l.prevus.filter(p => !(p in l.chez));
        return h("li", { class: "se-carte " + l.etat },
          h("button", { class: "se-carte-corps", type: "button", onclick: () => ouvrirCarte(ctx, l, { joueurs, documents, surChange: redessiner }) },
            h("span", { class: "se-carte-type" }, typeDe(l.type).singulier, l.carte.verite ? h("span", { class: "rv-marque secret" }, icon("lock", 12), "vérité MJ") : null),
            h("span", { class: "se-carte-titre" }, l.titre),
            h("span", { class: "jr-meta" }, Array.isArray(l.carte.pour) ? `pour ${liste(l.carte.pour)}` : "pour toute la table", l.n ? ` · déjà ${l.n}/${l.sur}` : "")),
          reste.length && ecrire ? h("button", { class: "jr-bouton se-carte-go", type: "button", title: `Révéler à ${liste(reste)}`, onclick: () => reveler(l) }, icon("eye", 18), "Révéler")
            : h("span", { class: "rv-etat tous" }, icon("check", 14), "Révélé"));
      };
      const nouvelle = () => formulaireCarte(ctx, { joueurs: joueurs.filter(j => j.lisible), documents, defauts: { prevu: doc.fichier, lieu: doc.lieu || "" }, surFini: async (c, maintenant) => {
        if (maintenant) {
          const cat = await ctx.regie.catalogue(c.type);
          const l = cat.lignes.find(x => x.carte && x.carte.fichier === c.fichier);
          if (l) { const r = await executer(ctx, () => ctx.regie.reveler(l, l.prevus), { zone }); if (r.ok) annoncer(`« ${c.titre} » révélé à ${liste(r.r.faits)}.`); }
        } else annoncer(`Carte « ${c.titre} » gardée au coffre.`);
        redessiner();
      } });
      const aFaire = lignes.filter(l => l.etat !== "tous"), faites = lignes.filter(l => l.etat === "tous");
      return [
        ecrire ? h("button", { class: "jr-bouton gros rv-reveler", type: "button", onclick: nouvelle }, icon("plus", 20), "Nouvelle révélation") : message("Lecture seule : l'écriture est fermée pour ce JDR.", "info"),
        zone,
        h("h4", { class: "se-titre-outil" }, icon("eye", 15), `Préparées pour ce document (${aFaire.length})`),
        aFaire.length ? h("ul", { class: "se-cartes" }, aFaire.map(carte)) : h("p", { class: "jr-vide" }, "Aucune carte en attente. Prépare-les à l'avance avec « Prévu pour » : elles t'attendront ici."),
        faites.length ? [h("h4", { class: "se-titre-outil" }, icon("check", 15), `Déjà révélées (${faites.length})`), h("ul", { class: "se-cartes" }, faites.map(carte))] : null,
        h("a", { class: "jr-retour", href: "#/mj/revelations" }, "Toutes les révélations", icon("next", 16))];
    },
    tuiles() {
      // Les fiches que ce document permet de créer (personnages, quêtes, objets… repérés par sa structure) : le MJ choisit lesquelles ajouter au coffre.
      const manquantes = ecrire ? h("button", { class: "jr-bouton", type: "button", onclick: () => fenetreFiches(ctx, { markdown: d.body, titre: doc.titre, prevu: doc.fichier, source: String(d.meta.source_word || doc.fichier), lieu: doc.genre === "lieu" ? doc.titre : doc.lieu || "", surFini: () => { location.reload(); } }) }, icon("plus", 18), "Créer les fiches de ce document") : null;
      if (!cites.length) return [manquantes, message("Aucune fiche du coffre n'est citée par son nom dans ce document.", "info")];
      const groupes = Object.keys(NOM_GENRE).map(g => [g, cites.filter(e => e.genre === g)]).filter(([, l]) => l.length);
      return [manquantes, ...groupes.map(([g, l]) => h("section", { class: "se-groupe" }, h("h4", { class: "se-titre-outil" }, icon(ICONE_GENRE[g], 15), `${NOM_GENRE[g]} (${l.length})`), h("div", { class: "se-tuiles" }, l.map(e => tuile(ctx, e, entites, null, seance)))))];
    },
    async joueurs() {
      const [r, jauges] = await Promise.all([ctx.donnees.joueurs(), ctx.regie.jauges().catch(e => { if (estAuth(e)) throw e; return []; })]);
      const zone = h("div", { class: "jr-retour-action" });
      const ligneJoueur = j => {
        const f = j.fiche, rapport = f && f.pv != null && f.pvMax ? Math.max(0, Math.min(1, f.pv / f.pvMax)) : null;
        const niveau = rapport == null ? "" : rapport <= 0.3 ? "bas" : rapport <= 0.6 ? "moyen" : "haut";
        return h("li", { class: "se-joueur" }, boiteImage({ donnees: ctx.donnees.pour(j.pseudo) }, f && f.portrait, "jr-vignette ronde petite", "user"),
          h("div", { class: "se-joueur-col" }, h("span", { class: "se-joueur-nom" }, (f && f.nom) || nomJoueur(j.pseudo)),
            h("div", { class: "mj-pv " + niveau }, h("div", { class: "jr-pvbarre mj-pv-barre" }, h("div", { style: `width:${Math.round((rapport ?? 0) * 100)}%` })))),
          h("span", { class: "se-joueur-pv" }, f && f.pv != null ? (f.pvMax ? `${f.pv}/${f.pvMax}` : String(f.pv)) : "–", h("small", null, "PV")));
      };
      const ligneJauge = j => {
        const valeur = h("strong", null, `${j.actuelle}`), barre = h("div", { style: `width:${Math.round(j.actuelle / j.max * 100)}%` });
        const palier = h("span", { class: "jg-palier-nom" }, j.palier ? j.palier.nom : "");
        const boutons = [];
        const changer = async delta => {
          const r = await executer(ctx, () => ctx.regie.changerJauge(j.fichier, j.actuelle + delta), { zone, boutons });
          if (!r.ok) return;
          j.actuelle = r.r.actuelle; valeur.textContent = String(j.actuelle); barre.style.width = `${Math.round(j.actuelle / j.max * 100)}%`;
          const p = palierDe(j.paliers || [], j.actuelle); palier.textContent = p ? p.nom : "";
          if (r.r.franchi) annoncerPalier(j, r.r.franchi);   // la valeur entre dans un nouveau palier : ses effets s'affichent
        };
        const b = (delta, txt) => { const x = h("button", { class: "se-pas", type: "button", "aria-label": `${j.nom} ${txt}`, onclick: () => changer(delta) }, txt); boutons.push(x); return x; };
        return h("li", { class: "se-jauge" },
          h("div", { class: "se-jauge-tete" }, h("span", { class: "se-jauge-nom" }, j.nom), j.porteur ? h("span", { class: "jr-puce" }, nomJoueur(j.porteur)) : null, h("span", { class: "se-jauge-val" }, valeur, ` / ${j.max}`)),
          h("div", { class: "se-jauge-barre" }, barre), palier,
          ecrire ? h("div", { class: "se-jauge-pas" }, b(-5, "−5"), b(-1, "−1"), b(1, "+1"), b(5, "+5"), b(10, "+10")) : null);
      };
      return [
        r.joueurs.length ? h("ul", { class: "se-joueurs" }, r.joueurs.map(ligneJoueur)) : message("Aucun dossier de joueur.", "info"),
        h("h4", { class: "se-titre-outil secret" }, icon("lock", 15), "Jauges cachées des objets"),
        jauges.length ? h("ul", { class: "se-jauges" }, jauges.map(ligneJauge)) : h("p", { class: "jr-vide" }, "Aucun objet du coffre n'a de jauge (champs « jauge_max » et « jauge_actuelle »)."),
        zone, h("p", { class: "jr-aide" }, "Les jauges restent au coffre : aucun joueur ne les voit."),
        h("a", { class: "jr-retour", href: "#/mj/jauges" }, "Toutes les jauges (temples, quêtes…)", icon("next", 16))];
    },
    async notes() {
      const n = await ctx.regie.notes();
      const zone = h("div", { class: "jr-retour-action" }), zone2 = h("div", { class: "jr-retour-action" });
      const brouillon = ctx.brouillons.get("seance-notes");
      const champ = h("textarea", { class: "jr-saisie zone se-notes", rows: "10", "aria-label": "Notes de séance", placeholder: "Ce qui se passe à la table, les décisions des joueurs, ce que tu improvises…", oninput: () => ctx.brouillons.set("seance-notes", champ.value) }, brouillon ?? n.texte);
      const bNotes = h("button", { class: "jr-bouton", type: "button" }, icon("check", 18), "Enregistrer les notes");
      bNotes.addEventListener("click", async () => {
        const r = await executer(ctx, () => ctx.regie.enregistrerNotes(champ.value, { seance: doc.titre }), { zone, boutons: [bNotes] });
        if (r.ok) { ctx.brouillons.delete("seance-notes"); zone.replaceChildren(message("Notes enregistrées au coffre.", "info")); }
      });
      const titre = h("input", { class: "jr-saisie", type: "text", maxlength: "120", value: doc.titre, "aria-label": "Titre du résumé" });
      const num = h("input", { class: "jr-saisie", type: "text", maxlength: "40", value: doc.genre === "session" && doc.numero != null ? String(doc.numero) : "", "aria-label": "Session", placeholder: "Numéro de session" });
      const resume = h("textarea", { class: "jr-saisie zone", rows: "6", "aria-label": "Résumé public", placeholder: "Ce que tout le groupe sait après cette séance. Aucun secret : les joueurs le liront dans leur journal." });
      const bResume = h("button", { class: "jr-bouton", type: "button" }, icon("book", 18), "Publier le résumé à la table");
      bResume.addEventListener("click", async () => {
        if (!await confirmer("Publier ce résumé ?", "Tous les joueurs le liront dans leur journal. Vérifie qu'il ne contient aucun secret.", "Publier")) return;
        const r = await executer(ctx, () => ctx.regie.publierResume({ titre: titre.value, session: num.value, texte: resume.value }), { zone: zone2, boutons: [bResume] });
        if (r.ok) { resume.value = ""; zone2.replaceChildren(message("Résumé publié : il est dans le journal des joueurs.", "info")); }
      });
      const bJouee = doc.genre === "session" && ecrire ? h("button", { class: "jr-bouton", type: "button" }, icon("check", 18), "Session jouée : la ranger dans « Joué »") : null;
      if (bJouee) bJouee.addEventListener("click", async () => {
        const r = await executer(ctx, async () => { await ctx.regie.changerStatutSession(doc.fichier, "jouée"); await ctx.regie.enregistrerParcours(parcoursDepuisRangement(deplacer(range, doc.cle, "joue"))); }, { zone: zone2, boutons: [bJouee] });
        if (r.ok) { annoncer(`« ${doc.titre} » est rangée dans « Joué ».`); location.hash = "#/mj"; }
      });
      if (!ecrire) return [message("Lecture seule : l'écriture est fermée pour ce JDR.", "info"), n.texte ? h("div", { class: "jr-md" }, rendreMarkdown(n.texte)) : null];
      return [
        h("h4", { class: "se-titre-outil" }, icon("pen", 15), "Notes de séance (coffre)"), champ, bNotes, zone,
        h("h4", { class: "se-titre-outil" }, icon("book", 15), "Résumé public de la séance"),
        h("div", { class: "rv-grille deux" }, h("label", { class: "jr-champ" }, h("span", null, "Titre"), titre), h("label", { class: "jr-champ" }, h("span", null, "Session"), num)),
        resume, bResume, zone2, bJouee];
    }
  };
  let jeton = 0;
  async function montrer(id) {
    etat.onglet = id;
    const moi = ++jeton;
    barre.replaceChildren(...ONGLETS.map(([k, lib, ic]) => h("button", { class: "se-onglet" + (k === id ? " on" : ""), type: "button", role: "tab", "aria-selected": String(k === id), onclick: () => montrer(k) }, icon(ic, 17), h("span", null, lib))));
    outil.replaceChildren(message("Lecture…", "info"));
    try { const n = await vues[id](); if (moi === jeton) outil.replaceChildren(...[n].flat(Infinity).filter(Boolean)); }
    catch (e) { if (estAuth(e)) return ctx.surErreur(e); if (moi === jeton) outil.replaceChildren(message("Ça ne marche pas : " + String((e && e.message) || e), "erreur")); }
  }
  montrer(vues[etat.onglet] ? etat.onglet : "fiche");

  const choix = prochains.length > 1 || (genre && prochains.length)
    ? h("nav", { class: "jr-souslignes", "aria-label": "Documents de la séance" }, prochains.map(p => h("a", { class: "jr-pastille" + (p.cle === doc.cle ? " on" : ""), href: `#/mj/seance/${p.genre}/${enc(p.fichier)}` }, icon(p.genre === "session" ? "moon" : "pin", 15), p.titre)),
      !prochains.some(p => p.cle === doc.cle) ? h("span", { class: "jr-pastille on" }, doc.titre) : null) : null;
  const reperes = [doc.genre === "session" ? "Document de session" : "Document de lieu", doc.saison != null ? `Saison ${doc.saison}` : "", doc.lieu ? `Lieu : ${doc.lieu}` : "", doc.region || ""].filter(Boolean);
  const haut = h("button", { class: "jr-rond grand mj-remonter", type: "button", "aria-label": "Remonter en haut de la page", onclick: () => window.scrollTo({ top: 0, behavior: "smooth" }) }, icon("chev_u", 24));
  const page = cadreMJ(ctx, { actif: "seance", large: true },
    h("div", { class: "mj-doc-tete" }, h("h2", { class: "mj-doc-titre" }, doc.titre), h("div", { class: "jr-puces" }, reperes.map(x => h("span", { class: "jr-puce" }, x)))),
    choix,
    h("div", { class: "se" }, sommaire, h("article", { class: "se-doc" }, noeudsScenes), h("aside", { class: "se-panneau", "aria-label": "Outils de séance" }, barre, outil)), haut);
  return { page };
}
