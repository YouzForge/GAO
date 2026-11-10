// Masquage des constructions secrètes d'un texte Markdown (D59, suite de D41 et D57). Sans DOM, sans stockage : navigateur et Node.
// Ne contient AUCUN contenu de jeu ni terme sensible : il ne connaît que des marques (🔴, 🔒, 🎲, ⚔️, 🆕).
//
// Retire : les blocs de citation dont une ligne commence par une marque ; les lignes de tableau marquées `<!-- cellule-secret -->` ou dont la
// première cellule commence par une marque (tableau entier si son en-tête est marqué ou s'il ne reste rien) ; les sections dont le titre commence
// par une marque ; les clôtures « :::secret » ; les lignes collées sous une citation secrète.
//
// Ne retire PAS : la prose qui répète un secret, un secret écrit sans marque, une reformulation. C'est une DEUXIÈME barrière, jamais la première :
// la première reste OneDrive (un joueur ne reçoit jamais le coffre) et la règle « un document secret n'est pas publié ».
// Échec fermé : `masquerPourJoueur` rend `null` (le document n'est pas montré) si, après masquage, une construction marquée subsiste.



let MARQUES_PAR_DEFAUT_INTERNE = ["🔴", "🔒"];
let MARQUEUR_CELLULE = "cellule-secret";

// Caractères invisibles qu'un éditeur peut glisser entre la citation et la marque.
let INVISIBLES = /[​-‍⁠﻿︎️]/g;
// Ce qu'on retire en tête de ligne avant de chercher la marque : citations, listes, titres, gras, italique, espaces.
let DEBUT_DECORATION = /^(?:[\s>#*_\-+|`~]|\d+[.)](?=\s))+/;
let LIGNE_CITATION = /^[ \t]*(?:(?:[-*+]|\d+[.)])[ \t]+)?>/;
let TITRE = /^[ \t]{0,3}(#{1,6})[ \t]+(.*)$/;
let SEPARATEUR_TABLEAU = /^[ \t]*\|?[ \t]*:?-{3,}:?[ \t]*(\|[ \t]*:?-{3,}:?[ \t]*)*\|?[ \t]*$/;
let DEBUT_FENCE = /^[ \t]{0,3}:::[ \t]*secret\b/i;
let FIN_FENCE = /^[ \t]{0,3}:::[ \t]*$/;

function nettoyer(ligne) {
  return String(ligne).replace(INVISIBLES, "");
}

// Vrai si la ligne, une fois décorations retirées, commence par une des marques.
function commenceParMarque(ligne, marques) {
  let s = nettoyer(ligne).replace(DEBUT_DECORATION, "");
  for (let i = 0; i < marques.length; i++) if (s.indexOf(nettoyer(marques[i])) === 0) return true;   // la marque est nettoyée comme le texte (⚔️ = U+2694 + U+FE0F)
  return false;
}

function estCitation(ligne) {
  return LIGNE_CITATION.test(ligne);
}

// Une ligne qui ne peut pas être la suite paresseuse d'un paragraphe de citation.
function estStructurelle(ligne) {
  let t = ligne.replace(/^[ \t]+/, "");
  return /^(#{1,6}[ \t]|```|~~~|:::|\||[-*+][ \t]|\d+[.)][ \t]|>|<!--|---+$|\*\*\*+$|___+$)/.test(t);
}

function premiereCellule(ligne) {
  let t = ligne.replace(/^[ \t]*\|/, "");
  let fin = t.indexOf("|");
  return fin === -1 ? t : t.slice(0, fin);
}

function ligneTableau(ligne) {
  return /^[ \t]*\|/.test(ligne);
}

function ligneTableauSecrete(ligne, marques) {
  if (nettoyer(ligne).indexOf(MARQUEUR_CELLULE) !== -1) return true;
  return commenceParMarque(premiereCellule(ligne), marques);
}

function masquer(texte, opts) {
  opts = opts || {};
  let marques = opts.marques || MARQUES_PAR_DEFAUT_INTERNE;
  let sections = opts.sections !== false;
  let brut = String(texte);
  let crlf = brut.indexOf("\r\n") !== -1;
  let lignes = brut.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  let stats = { blocs: 0, sections: 0, clotures: 0, lignes_suite_paresseuse: 0, lignes_tableau: 0, tableaux_retires: 0 };

  // Passe 1 : citations, clôtures, sections.
  let sortie = [];
  let i = 0, n = lignes.length;
  while (i < n) {
    let l = lignes[i];

    if (DEBUT_FENCE.test(l)) {
      let j = i + 1;
      while (j < n && !FIN_FENCE.test(lignes[j])) j++;
      stats.clotures++;
      i = j < n ? j + 1 : n; // clôture non fermée : on retire jusqu'à la fin (échec fermé)
      continue;
    }

    if (sections) {
      let m = TITRE.exec(l);
      if (m && commenceParMarque(m[2], marques)) {
        let niveau = m[1].length, k = i + 1;
        while (k < n) {
          let mk = TITRE.exec(lignes[k]);
          if (mk && mk[1].length <= niveau) break;
          k++;
        }
        stats.sections++;
        i = k;
        continue;
      }
    }

    if (estCitation(l)) {
      let f = i;
      while (f < n && estCitation(lignes[f])) f++;
      let secret = false;
      for (let a = i; a < f; a++) if (commenceParMarque(lignes[a], marques)) { secret = true; break; }
      if (secret) {
        stats.blocs++;
        i = f;
        // Suite paresseuse : une ligne collée à la citation en fait partie pour un lecteur Markdown.
        while (i < n && lignes[i].trim() !== "" && !estStructurelle(lignes[i])) { stats.lignes_suite_paresseuse++; i++; }
        continue;
      }
      for (let b = i; b < f; b++) sortie.push(lignes[b]);
      i = f;
      continue;
    }

    sortie.push(l);
    i++;
  }

  // Passe 2 : tableaux. Une suite de lignes « | ... » peut contenir plusieurs tableaux collés (sans ligne vide) :
  // on coupe avant chaque ligne suivie d'un séparateur, qui est l'en-tête d'un nouveau tableau.
  function traiterTableau(tab) {
    let aEntete = tab.length >= 2 && SEPARATEUR_TABLEAU.test(tab[1]);
    let entete = aEntete ? tab.slice(0, 2) : [];
    let corps = aEntete ? tab.slice(2) : tab;
    let gardees = corps.filter(function (r) { return !ligneTableauSecrete(r, marques); });
    let retirees = corps.length - gardees.length;
    stats.lignes_tableau += retirees;
    let enteteSecret = aEntete && ligneTableauSecrete(tab[0], marques); // le titre du tableau est marqué : tout le tableau l'est
    if (enteteSecret || (retirees > 0 && gardees.length === 0)) {
      stats.tableaux_retires++; // un tableau sans aucune ligne publiable disparaît avec son en-tête
      return [];
    }
    return entete.concat(gardees);
  }
  let final = [];
  i = 0; n = sortie.length;
  while (i < n) {
    if (!ligneTableau(sortie[i])) { final.push(sortie[i]); i++; continue; }
    let e = i;
    while (e < n && ligneTableau(sortie[e])) e++;
    let suite = sortie.slice(i, e);
    let coupures = [0];
    for (let c = 1; c + 1 < suite.length; c++) {
      if (SEPARATEUR_TABLEAU.test(suite[c + 1]) && !SEPARATEUR_TABLEAU.test(suite[c])) coupures.push(c);
    }
    coupures.push(suite.length);
    for (let s = 0; s + 1 < coupures.length; s++) {
      let morceau = traiterTableau(suite.slice(coupures[s], coupures[s + 1]));
      for (let z = 0; z < morceau.length; z++) final.push(morceau[z]);
    }
    i = e;
  }

  let texteMasque = final.join(crlf ? "\r\n" : "\n");
  let retire = stats.blocs + stats.sections + stats.clotures + stats.lignes_tableau + stats.tableaux_retires;
  if (retire === 0) texteMasque = brut; // rien à retirer : texte rendu à l'identique
  let verdict = verifier(texteMasque, opts);
  return { texte: texteMasque, stats: stats, violations: verdict.violations, avertissements: verdict.avertissements };
}

// Cherche ce qu'un masquage réussi ne doit plus laisser. Ne modifie rien.
function verifier(texte, opts) {
  opts = opts || {};
  let marques = opts.marques || MARQUES_PAR_DEFAUT_INTERNE;
  let lignes = String(texte).replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  let violations = [], avertissements = [];
  for (let i = 0; i < lignes.length; i++) {
    let l = lignes[i], no = i + 1;
    if (DEBUT_FENCE.test(l)) violations.push({ ligne: no, regle: "cloture_secret" });
    else if (estCitation(l) && commenceParMarque(l, marques)) violations.push({ ligne: no, regle: "citation_marquee" });
    else if (nettoyer(l).indexOf(MARQUEUR_CELLULE) !== -1) violations.push({ ligne: no, regle: "cellule_secrete" });
    else if (ligneTableau(l) && commenceParMarque(premiereCellule(l), marques)) violations.push({ ligne: no, regle: "cellule_marquee" });
    else {
      let m = TITRE.exec(l);
      if (m && commenceParMarque(m[2], marques)) violations.push({ ligne: no, regle: "titre_marque" });
      else if (!estCitation(l) && !ligneTableau(l) && commenceParMarque(l, marques)) avertissements.push({ ligne: no, regle: "marque_hors_construction" });
    }
  }
  return { violations: violations, avertissements: avertissements };
}

// Échec fermé : jamais de texte partiellement masqué.
function masquerOuRefuser(texte, opts) {
  let r = masquer(texte, opts);
  if (r.violations.length) {
    let e = new Error("Masquage incomplet : " + r.violations.length + " construction(s) marquée(s) subsiste(nt).");
    e.violations = r.violations;
    throw e;
  }
  return r.texte;
}

/** Marques retirées d'un texte montré à un joueur (décision du MJ, 10 novembre 2026) : 🔴 secret, 🔒 (traité comme 🔴, D41), 🎲 note MJ, ⚔️ fiche de combat, 🆕 alerte / quête. */
export const MARQUES_JOUEUR = Object.freeze(["🔴", "🔒", "🎲", "⚔️", "🆕"]);

/** Texte masqué pour un joueur, ou `null` si le masquage n'est pas sûr (le document ne doit alors pas être montré). Un texte vide reste vide. */
export function masquerPourJoueur(texte) {
  if (texte == null) return texte;
  const r = masquer(texte, { marques: MARQUES_JOUEUR });
  return r.violations.length ? null : r.texte;
}

export { masquer, verifier, masquerOuRefuser };
export const MARQUES_PAR_DEFAUT = MARQUES_PAR_DEFAUT_INTERNE;
