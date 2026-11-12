// Onglet « Jauges » du MJ : toutes les jauges de la campagne, rangées en sections (Joueurs, Univers, Quêtes, et celles que le MJ crée).
// Les jauges des objets des joueurs y sont à côté des jauges libres (avancement d'un temple, menace…). On change une valeur d'un clic, on glisse une
// jauge d'une section à l'autre, et l'écran annonce quand une valeur entre dans un nouveau palier. Tout reste au coffre : aucun joueur ne voit une jauge.
// RÈGLE du moteur : jamais de innerHTML.
import { deplacerJauge, ajouterSection, renommerSection, supprimerSection, decalerSection, palierDe, effetsDe } from "../../src/mj/jauges.js?v=0.27.0";
import { h, icon, message, feuille, rendreMarkdown } from "./ui.js?v=0.27.0";
import { executer, confirmer } from "./edition.js?v=0.27.0";
import { cadreMJ } from "./ecrans_mj.js?v=0.27.0";
import { annoncer } from "./ecrans_regie.js?v=0.27.0";

const estAuth = e => e && (e.status === 401 || e.auth);
const champ = (libelle, controle, aide) => h("label", { class: "jr-champ" }, h("span", null, libelle), controle, aide ? h("small", { class: "jr-aide" }, aide) : null);
const saisie = (props = {}) => h("input", { class: "jr-saisie", type: "text", autocomplete: "off", ...props });
const pct = j => Math.round(100 * j.actuelle / j.max);

/** Fenêtre « palier atteint » : ce que le MJ doit appliquer à la table. */
export function annoncerPalier(j, franchi) {
  if (!franchi) return;
  const p = franchi.palier;
  const effets = effetsDe(p);
  feuille(p ? `Palier ${franchi.sens === "monte" ? "atteint" : "retrouvé"} : ${p.nom}` : "Plus aucun palier", [
    h("p", { class: "jr-meta" }, `${j.nom} · ${j.actuelle} / ${j.max}${j.unite ? " " + j.unite : ""}`, franchi.ancien ? ` · avant : ${franchi.ancien.nom}` : ""),
    p && p.lignes.length ? h("div", { class: "jr-md jg-palier-effets" }, rendreMarkdown(p.lignes.map(l => "- " + l).join("\n"))) : h("p", { class: "jr-vide" }, p ? "Ce palier n'a pas d'effet écrit." : "La valeur est repassée sous le premier palier."),
    effets.length ? message(`Ce palier modifie ${effets.map(e => `${e.quoi} de ${e.cible.replace(/_/g, " ")} (${e.valeur > 0 ? "+" : ""}${e.valeur})`).join(", ")}. L'application ne l'applique pas encore toute seule : préviens le joueur ou corrige sa fiche.`, "alerte") : null
  ].filter(Boolean));
}

/** Barre d'une jauge, avec un repère par palier. */
function barre(j) {
  return h("div", { class: "jg-barre", role: "img", "aria-label": `${j.actuelle} sur ${j.max}` }, h("div", { class: "jg-barre-plein", style: `width:${pct(j)}%` }),
    j.paliers.filter(p => p.de > 0 && p.de < j.max).map(p => h("span", { class: "jg-repere" + (j.actuelle >= p.de ? " passe" : ""), style: `left:${100 * p.de / j.max}%`, title: `${p.de} : ${p.nom}` })));
}

/** Formulaire d'une jauge libre : création (`jauge` absente) ou réglages. */
function formulaireJauge(ctx, { jauge = null, sections = [], sectionIndex = 0, surFini }) {
  const nom = saisie({ maxlength: "80", value: jauge ? jauge.nom : "", "aria-label": "Nom", placeholder: "Temple de…, Menace du culte, Confiance du baron…" });
  const max = saisie({ inputmode: "numeric", maxlength: "5", value: String(jauge ? jauge.max : 100), "aria-label": "Maximum" });
  const depart = saisie({ inputmode: "numeric", maxlength: "5", value: "0", "aria-label": "Valeur de départ" });
  const unite = saisie({ maxlength: "12", value: jauge ? jauge.unite : "", "aria-label": "Unité", placeholder: "%, jours, points…" });
  const porteur = saisie({ maxlength: "60", value: jauge ? jauge.porteur : "", "aria-label": "Concerne", placeholder: "Un joueur, un lieu, une faction…" });
  const description = h("textarea", { class: "jr-saisie zone jg-zone", rows: "3", "aria-label": "Description", placeholder: "Ce que mesure cette jauge, ce qui la fait monter ou descendre." }, jauge ? jauge.description : "");
  const paliers = h("textarea", { class: "jr-saisie zone jg-zone", rows: "6", "aria-label": "Paliers", placeholder: "25-49 : Les murs montent\n- Les ouvriers arrivent par dizaines.\n50-99 : Le toit est posé\n100 : Temple activé\n- Le rituel peut commencer." },
    jauge ? jauge.textePaliers || "" : "");
  const sec = h("select", { class: "jr-select", "aria-label": "Section" }, sections.map((s, i) => h("option", { value: String(i), selected: i === sectionIndex }, s.titre)));
  const msg = h("div", { class: "jr-retour-action" });
  const ok = h("button", { class: "jr-bouton gros rv-reveler", type: "button" }, icon("check", 20), jauge ? "Enregistrer" : "Créer la jauge");
  const fermer = feuille(jauge ? "Régler la jauge" : "Nouvelle jauge", [
    champ("Nom", nom),
    h("div", { class: "rv-grille" }, champ("Maximum", max), jauge ? champ("Unité", unite, "Facultatif.") : champ("Valeur de départ", depart), jauge ? champ("Concerne", porteur, "Facultatif.") : champ("Unité", unite, "Facultatif.")),
    jauge ? null : h("div", { class: "rv-grille deux" }, champ("Concerne", porteur, "Facultatif : un joueur, un lieu, une faction."), champ("Section", sec)),
    champ("Description", description),
    champ("Paliers", paliers, "Un palier par ligne : « 25-49 : Nom » ou « 100 : Nom ». Ses effets sur les lignes suivantes, en puces. Facultatif."),
    msg, ok].filter(Boolean), { large: true });
  ok.addEventListener("click", async () => {
    const champs = { nom: nom.value, max: max.value, unite: unite.value, porteur: porteur.value, description: description.value, paliers: paliers.value, actuelle: depart.value };
    // en réglage, un texte non touché n'est pas réécrit
    if (jauge && description.value.trim() === (jauge.description || "").trim()) delete champs.description;
    if (jauge && paliers.value.trim() === (jauge.textePaliers || "").trim()) delete champs.paliers;
    const r = await executer(ctx, () => (jauge ? ctx.regie.modifierJauge(jauge, champs) : ctx.regie.creerJauge(champs, sections, Number(sec.value))), { zone: msg, boutons: [ok] });
    if (!r.ok) return;
    fermer(); surFini(r.r);
  });
  setTimeout(() => nom.focus(), 50);
}

export async function ecranJaugesMJ(ctx) {
  const ecrire = !!(ctx.donnees && ctx.donnees.peutEcrireMJ);
  let sections = await ctx.regie.toutesLesJauges();
  const zone = h("div", { class: "jr-retour-action" }), etat = h("span", { class: "jr-meta pc-etat", role: "status" }), racine = h("div", { class: "jg" }), compte = h("span", { class: "jr-meta mj-compte" });
  let enCours = Promise.resolve(), glisse = null;

  const recharger = async () => { try { sections = await ctx.regie.toutesLesJauges(); dessiner(); } catch (e) { if (estAuth(e)) ctx.surErreur(e); } };
  /** Enregistre le rangement affiché ; les enregistrements se suivent, jamais deux à la fois. */
  const ranger = nouveau => {
    if (nouveau === sections) return;
    sections = nouveau; dessiner();
    if (!ecrire) return;
    etat.textContent = "Enregistrement…";
    const r = sections;
    enCours = enCours.then(async () => { const res = await executer(ctx, () => ctx.regie.enregistrerRangementJauges(r), { zone, auto: false }); etat.textContent = res.ok ? "Rangement enregistré" : ""; });
  };

  /** Change la valeur d'une jauge : la carte se met à jour sur place, le palier franchi est annoncé. */
  const changer = async (j, valeur, boutons, note = "") => {
    const r = await executer(ctx, () => ctx.regie.changerValeurJauge(j, valeur, note), { zone, boutons });
    if (!r.ok) return;
    j.actuelle = r.r.actuelle; j.palier = palierDe(j.paliers, j.actuelle); j.suivi = r.r.suivi || j.suivi;
    dessiner();
    if (r.r.franchi) annoncerPalier(j, r.r.franchi);
  };

  const detail = (j, si) => {
    const z = h("div", { class: "jr-retour-action" });
    const exacte = saisie({ inputmode: "numeric", maxlength: "5", value: String(j.actuelle), "aria-label": "Valeur exacte" });
    const note = saisie({ maxlength: "120", "aria-label": "Note", placeholder: "Pourquoi (facultatif) : trois gorgées, rituel interrompu…" });
    const poser = h("button", { class: "jr-bouton", type: "button" }, icon("check", 18), "Fixer cette valeur");
    const fermer = feuille(j.nom, [
      h("div", { class: "jr-puces" }, h("span", { class: "jr-puce" }, j.genre === "objet" ? "Objet de l'univers" : "Jauge libre"), j.porteur ? h("span", { class: "jr-puce" }, j.porteur) : null,
        h("span", { class: "jr-puce" }, `${j.actuelle} / ${j.max}${j.unite ? " " + j.unite : ""}`), j.palier ? h("span", { class: "rv-etat a_reveler" }, j.palier.nom) : null),
      j.description ? h("div", { class: "jr-md" }, rendreMarkdown(j.description)) : null,
      ecrire ? h("section", { class: "rv-bloc" }, h("h3", null, icon("sliders", 16), "Fixer une valeur"), h("div", { class: "rv-grille deux" }, champ("Note", note), champ("Valeur", exacte)), poser, z) : null,
      h("section", { class: "rv-bloc" }, h("h3", null, icon("flag", 16), `Paliers (${j.paliers.length})`),
        j.paliers.length ? h("ul", { class: "jg-paliers" }, j.paliers.map(p => h("li", { class: "jg-palier" + (j.palier && j.palier.de === p.de ? " actif" : j.actuelle >= p.de ? " passe" : "") },
          h("div", { class: "jg-palier-tete" }, h("span", { class: "jg-palier-seuil" }, p.de === p.a ? String(p.de) : `${p.de}–${p.a}`), h("strong", null, p.nom)),
          p.lignes.length ? h("div", { class: "jr-md jg-palier-effets" }, rendreMarkdown(p.lignes.map(l => "- " + l).join("\n"))) : null)))
          : h("p", { class: "jr-vide" }, j.genre === "objet" ? "Aucun palier lisible dans la fiche de l'objet (section « 🔴 Paliers de la jauge », une ligne « 10–29 : Nom » par palier)." : "Aucun palier. « Régler » en ajoute.")),
      h("section", { class: "rv-bloc" }, h("h3", null, icon("clock", 16), "Suivi"),
        j.suivi.length ? h("ul", { class: "rv-journal" }, [...j.suivi].reverse().slice(0, 12).map(l => h("li", null, l))) : h("p", { class: "jr-vide" }, "Aucun changement noté pour l'instant.")),
      j.genre === "objet" ? h("p", { class: "jr-aide" }, "Le nom, le maximum, le porteur et les paliers de cette jauge se règlent dans la fiche de l'objet (Menu ⋯ → Listes du coffre → Objets).") : null,
      ecrire ? h("div", { class: "jr-actions" },
        j.genre === "jauge" ? h("button", { class: "jr-bouton", type: "button", onclick: () => { fermer(); formulaireJauge(ctx, { jauge: j, surFini: () => { annoncer(`Jauge « ${j.nom} » réglée.`); recharger(); } }); } }, icon("pen", 18), "Régler") : null,
        sections.length > 1 ? h("button", { class: "jr-bouton", type: "button", onclick: () => { fermer(); menuDeplacer(j, si); } }, icon("move", 18), "Déplacer") : null,
        j.genre === "jauge" ? h("button", { class: "jr-bouton danger", type: "button", onclick: async () => {
          if (!await confirmer("Supprimer cette jauge ?", `« ${j.nom} » et son suivi iront dans la corbeille OneDrive.`, "Supprimer")) return;
          const r = await executer(ctx, () => ctx.regie.supprimerJauge(j), { zone: z });
          if (r.ok) { fermer(); annoncer(`Jauge « ${j.nom} » supprimée.`); recharger(); }
        } }, icon("trash", 18), "Supprimer") : null) : null
    ].filter(Boolean), { large: true });
    poser.addEventListener("click", async () => { const v = exacte.value.trim(); if (!/^\d{1,5}$/.test(v)) { z.replaceChildren(message(`Nombre entier de 0 à ${j.max}.`, "alerte")); return; } fermer(); await changer(j, Number(v), [], note.value); });
  };
  const menuDeplacer = (j, si) => {
    const fermer = feuille(j.nom, h("div", { class: "jr-menu" }, h("p", { class: "jr-meta" }, `Actuellement dans « ${sections[si].titre} ».`),
      sections.map((s, i) => (i === si ? null : h("button", { class: "jr-bouton", type: "button", onclick: () => { fermer(); ranger(deplacerJauge(sections, j.cle, i)); } }, icon("next", 18), `Vers « ${s.titre} »`)))));
  };

  const carte = (j, si) => {
    const boutons = [];
    const pas = (delta, txt) => { const b = h("button", { class: "se-pas", type: "button", "aria-label": `${j.nom} ${txt}`, onclick: () => changer(j, j.actuelle + delta, boutons) }, txt); boutons.push(b); return b; };
    const li = h("li", { class: "jg-carte" + (j.genre === "objet" ? " objet" : ""), draggable: ecrire ? "true" : null },
      h("button", { class: "jg-carte-tete", type: "button", onclick: () => detail(j, si), title: "Paliers, suivi, réglages" },
        h("span", { class: "jg-carte-nom" }, j.genre === "objet" ? icon("gem", 16) : icon("sliders", 16), h("span", null, j.nom)),
        h("span", { class: "jg-carte-val" }, h("strong", null, String(j.actuelle)), ` / ${j.max}${j.unite ? " " + j.unite : ""}`)),
      barre(j),
      h("div", { class: "jg-carte-bas" }, j.porteur ? h("span", { class: "jr-puce" }, j.porteur) : null,
        j.palier ? h("span", { class: "jg-palier-nom" }, icon("flag", 13), j.palier.nom) : j.paliers.length ? h("span", { class: "jr-meta" }, "avant le premier palier") : null),
      ecrire ? h("div", { class: "se-jauge-pas" }, pas(-10, "−10"), pas(-5, "−5"), pas(-1, "−1"), pas(1, "+1"), pas(5, "+5"), pas(10, "+10")) : null);
    if (ecrire) {
      li.addEventListener("dragstart", e => { glisse = j.cle; li.classList.add("glisse"); e.dataTransfer.effectAllowed = "move"; try { e.dataTransfer.setData("text/plain", j.cle); } catch { /* la variable suffit */ } });
      li.addEventListener("dragend", () => { glisse = null; li.classList.remove("glisse"); racine.querySelectorAll(".dessus,.cible").forEach(n => n.classList.remove("dessus", "cible")); });
      li.addEventListener("dragover", e => { if (!glisse || glisse === j.cle) return; e.preventDefault(); e.stopPropagation(); racine.querySelectorAll(".dessus").forEach(n => n.classList.remove("dessus")); li.classList.add("dessus"); });
      li.addEventListener("drop", e => { if (!glisse) return; e.preventDefault(); e.stopPropagation(); const cle = glisse; glisse = null; ranger(deplacerJauge(sections, cle, si, j.cle)); });
    }
    return li;
  };
  const section = (s, si) => {
    const renommer = () => {
      const nom = saisie({ maxlength: "40", value: s.titre, "aria-label": "Nom de la section" });
      const ok = h("button", { class: "jr-bouton", type: "button" }, icon("check", 18), "Renommer");
      const fermer = feuille("Section", h("div", { class: "jr-menu" }, champ("Nom", nom), ok,
        h("div", { class: "jr-actions" }, h("button", { class: "jr-bouton", type: "button", onclick: () => { fermer(); ranger(decalerSection(sections, si, -1)); } }, icon("chev_u", 18), "Monter"),
          h("button", { class: "jr-bouton", type: "button", onclick: () => { fermer(); ranger(decalerSection(sections, si, 1)); } }, icon("chev_d", 18), "Descendre")),
        s.jauges.length ? h("p", { class: "jr-aide" }, "Une section se supprime quand elle est vide.") : h("button", { class: "jr-bouton danger", type: "button", onclick: () => { fermer(); ranger(supprimerSection(sections, si)); } }, icon("trash", 18), "Supprimer la section")));
      ok.addEventListener("click", () => { fermer(); ranger(renommerSection(sections, si, nom.value)); });
    };
    const sec = h("section", { class: "jg-section", "aria-label": s.titre },
      h("header", { class: "jg-section-tete" }, h("h3", null, s.titre), h("span", { class: "mj-n" }, String(s.jauges.length)),
        ecrire ? h("button", { class: "jr-rond jg-rond", type: "button", "aria-label": `Régler la section ${s.titre}`, title: "Renommer, déplacer, supprimer", onclick: renommer }, icon("dots", 18)) : null,
        ecrire ? h("button", { class: "jr-pastille petite jg-ajout", type: "button", onclick: () => formulaireJauge(ctx, { sections, sectionIndex: si, surFini: j => { annoncer(`Jauge « ${j.nom} » créée.`); recharger(); } }) }, icon("plus", 15), "Jauge") : null),
      h("ul", { class: "jg-cartes" }, s.jauges.map(j => carte(j, si)), !s.jauges.length ? h("li", { class: "pc-vide" }, ecrire ? "Glisse une jauge ici, ou crée-en une." : "Aucune jauge.") : null));
    if (ecrire) {
      sec.addEventListener("dragover", e => { if (!glisse) return; e.preventDefault(); sec.classList.add("cible"); });
      sec.addEventListener("dragleave", e => { if (!sec.contains(e.relatedTarget)) sec.classList.remove("cible"); });
      sec.addEventListener("drop", e => { if (!glisse) return; e.preventDefault(); const cle = glisse; glisse = null; ranger(deplacerJauge(sections, cle, si)); });
    }
    return sec;
  };
  function dessiner() {
    const n = sections.reduce((a, s) => a + s.jauges.length, 0);
    compte.textContent = `${n} jauge${n > 1 ? "s" : ""} · ${sections.length} section${sections.length > 1 ? "s" : ""}`;
    racine.replaceChildren(...sections.map(section));
  }
  dessiner();
  const nouvelleSection = () => {
    const nom = saisie({ maxlength: "40", "aria-label": "Nom de la section", placeholder: "Culte, Factions, Compte à rebours…" });
    const ok = h("button", { class: "jr-bouton", type: "button" }, icon("plus", 18), "Créer la section");
    const fermer = feuille("Nouvelle section", h("div", { class: "jr-menu" }, champ("Nom", nom), ok));
    ok.addEventListener("click", () => { fermer(); ranger(ajouterSection(sections, nom.value)); });
    setTimeout(() => nom.focus(), 50);
  };
  const page = cadreMJ(ctx, { actif: "jauges" },
    h("div", { class: "mj-doc-tete" }, h("h2", { class: "mj-doc-titre" }, "Jauges"),
      h("p", { class: "jr-meta" }, "Tout ce qui monte et descend au fil de la campagne. Les jauges restent dans ton coffre : aucun joueur ne les voit. Le nom d'une jauge ouvre ses paliers et son suivi.")),
    !ecrire ? message("Lecture seule : l'écriture est fermée pour ce JDR.", "alerte") : null,
    h("div", { class: "rv-barre" }, compte, etat,
      ecrire ? h("button", { class: "jr-bouton", type: "button", onclick: nouvelleSection }, icon("folder", 18), "Nouvelle section") : null,
      ecrire ? h("button", { class: "jr-bouton rv-nouvelle", type: "button", onclick: () => formulaireJauge(ctx, { sections, sectionIndex: Math.min(1, sections.length - 1), surFini: j => { annoncer(`Jauge « ${j.nom} » créée.`); recharger(); } }) }, icon("plus", 18), "Nouvelle jauge") : null),
    zone, racine);
  return { page };
}
