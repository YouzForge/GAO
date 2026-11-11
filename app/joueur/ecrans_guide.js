// Onglet « Guide » du MJ : le mode d'emploi de la régie, toujours sous la main. Le même contenu que le guide Word (guide_contenu.js, généré).
// Une recherche (« que veux-tu faire ? ») trouve la fiche ; chaque fiche est repliée et s'ouvre d'un clic. Le contenu n'est téléchargé qu'à l'ouverture de l'onglet.
// RÈGLE du moteur : jamais de innerHTML ; tout est construit avec le DOM.
import { norm } from "../../src/md/doc.js?v=0.25.0";
import { h, icon } from "./ui.js?v=0.25.0";
import { cadreMJ } from "./ecrans_mj.js?v=0.25.0";

const TITRES_BOITE = { astuce: "Bon à savoir", attention: "Attention", limite: "Pas encore possible dans l'outil", resultat: "Résultat", cowork: "À dire à Claude (Cowork)" };
const ICONES_BOITE = { astuce: "bulb", attention: "info", limite: "tools", resultat: "check", cowork: "chat" };

/** Texte avec **gras** et `code` → nœuds. */
function riche(texte) {
  return String(texte).split(/(\*\*[^*]+\*\*|`[^`]+`)/).filter(Boolean).map(m =>
    (m.startsWith("**") ? h("strong", null, m.slice(2, -2)) : m.startsWith("`") ? h("code", null, m.slice(1, -1)) : m));
}
function noeud(b) {
  if (b.t === "p") return h("p", null, riche(b.x));
  if (b.t === "li") return h("ul", { class: "gd-liste" }, h("li", null, riche(b.x)));
  if (b.t === "h2") return h("h3", { class: "gd-h2" }, b.x);
  if (b.t === "h3") return h("h4", { class: "gd-h3" }, b.x);
  if (b.t === "ou") return h("p", { class: "gd-ou" }, icon("pin", 15), h("span", null, riche(b.x)));
  if (b.t === "etapes") return h("ol", { class: "gd-etapes" }, b.items.map(x => h("li", null, riche(x))));
  if (b.t === "boite") return h("div", { class: "gd-boite g-" + b.genre }, h("div", { class: "gd-boite-tete" }, icon(ICONES_BOITE[b.genre] || "info", 15), TITRES_BOITE[b.genre] || ""),
    b.lignes.map(l => (l.trim() ? h("p", null, riche(l)) : h("p", { class: "gd-vide" }, " "))));
  if (b.t === "table") return h("div", { class: "md-tableau" }, h("table", null, h("thead", null, h("tr", null, b.entetes.map(e => h("th", null, e)))),
    h("tbody", null, b.lignes.map(l => h("tr", null, l.map((c, i) => h("td", { class: i === 0 ? "gd-col1" : "" }, riche(c))))))));
  return null;
}
const texteDe = b => (b.t === "etapes" ? b.items.join(" ") : b.t === "boite" ? b.lignes.join(" ") : b.t === "table" ? b.lignes.flat().join(" ") : b.x || b.q || "");

/** Découpe les blocs d'une partie : ce qui précède la première fiche, puis les fiches { n, q, blocs }. */
function fichesDe(partie) {
  const avant = [], fiches = [];
  for (const b of partie.blocs) {
    if (b.t === "fiche") fiches.push({ n: b.n, q: b.q, blocs: [] });
    else (fiches.length ? fiches[fiches.length - 1].blocs : avant).push(b);
  }
  return { avant, fiches };
}

export async function ecranGuideMJ(ctx, partieDemandee = null, ficheDemandee = null) {
  const { GUIDE, VERSION_GUIDE } = await import("./guide_contenu.js?v=0.25.0");
  const etat = ctx.etat.guideMJ || (ctx.etat.guideMJ = { partie: 1, q: "" });
  if (partieDemandee != null && GUIDE[partieDemandee]) etat.partie = partieDemandee;
  const toutes = GUIDE.flatMap((p, i) => fichesDe(p).fiches.map(f => ({ ...f, partie: i, cherche: norm([f.q, ...f.blocs.map(texteDe)].join(" ")).replace(/_+/g, " ") })));
  const corps = h("div", { class: "gd-corps" }), nav = h("ul", { class: "gd-nav" }), resultats = h("div", { class: "gd-resultats" });

  const aller = (i, n = null) => { etat.partie = i; etat.q = ""; champ.value = ""; dessiner(n); window.scrollTo({ top: 0 }); };
  function dessinerPartie(ouvrir = null) {
    const p = GUIDE[etat.partie], { avant, fiches } = fichesDe(p);
    const details = fiches.map(f => {
      const d = h("details", { class: "gd-fiche", id: `gd-fiche-${f.n}` },
        h("summary", null, h("span", { class: "gd-fiche-n" }, String(f.n)), h("span", { class: "gd-fiche-q" }, f.q), icon("chev_d", 18)),
        h("div", { class: "gd-fiche-corps" }, f.blocs.map(noeud)));
      if (ouvrir != null && String(f.n) === String(ouvrir)) d.open = true;
      return d;
    });
    corps.replaceChildren(...[h("h2", { class: "gd-titre" }, p.num ? `${p.num} — ${p.titre}` : p.titre), ...avant.map(noeud), ...details].filter(Boolean));
    if (ouvrir != null) setTimeout(() => { const d = document.getElementById(`gd-fiche-${ouvrir}`); if (d) d.scrollIntoView({ block: "start", behavior: "smooth" }); }, 60);
  }
  function dessiner(ouvrir = null) {
    nav.replaceChildren(...GUIDE.map((p, i) => h("li", null, h("button", { class: "gd-nav-b" + (i === etat.partie && !etat.q ? " on" : ""), type: "button", onclick: () => aller(i) },
      p.num ? h("span", { class: "gd-nav-n" }, p.num) : icon("info", 16), h("span", null, p.titre)))));
    const mots = norm(etat.q).replace(/_+/g, " ").split(" ").filter(m => m.length > 1);
    if (!mots.length) { resultats.replaceChildren(); corps.hidden = false; return dessinerPartie(ouvrir); }
    const trouvees = toutes.map(f => ({ f, score: mots.filter(m => f.cherche.includes(m)).length + mots.filter(m => norm(f.q).includes(m)).length })).filter(x => x.score >= mots.length).sort((a, b) => b.score - a.score);
    corps.hidden = true;
    resultats.replaceChildren(h("p", { class: "jr-meta" }, trouvees.length ? `${trouvees.length} fiche${trouvees.length > 1 ? "s" : ""}` : "Aucune fiche ne correspond. Essaie un autre mot : quête, objet, masquer, importer…"),
      h("ul", { class: "gd-trouvees" }, trouvees.map(({ f }) => h("li", null, h("button", { class: "gd-trouvee", type: "button", onclick: () => aller(f.partie, f.n) },
        h("span", { class: "gd-fiche-n" }, String(f.n)), h("span", { class: "gd-fiche-q" }, f.q), icon("next", 18))))));
  }
  const champ = h("input", { class: "mj-recherche-champ", type: "search", placeholder: "Que veux-tu faire ? (quête terminée, donner un objet, masquer un compte rendu…)", value: etat.q, "aria-label": "Chercher dans le guide",
    oninput: () => { etat.q = champ.value; dessiner(); } });
  dessiner(ficheDemandee);
  const page = cadreMJ(ctx, { actif: "guide" },
    h("div", { class: "mj-doc-tete" }, h("h2", { class: "mj-doc-titre" }, "Guide du MJ"),
      h("p", { class: "jr-meta" }, `Quoi faire, où, et quand. ${toutes.length} fiches pratiques${VERSION_GUIDE ? ` · écrit pour la version ${VERSION_GUIDE}` : ""}.`)),
    h("label", { class: "mj-recherche gd-recherche" }, icon("search", 20), champ),
    h("div", { class: "gd" }, h("nav", { class: "gd-sommaire", "aria-label": "Parties du guide" }, nav), h("div", { class: "gd-zone" }, resultats, corps)));
  return { page };
}
