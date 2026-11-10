// « Nouveau » : ce que le MJ vient de révéler et que le joueur n'a pas encore ouvert. Sans DOM (le stockage est injecté) : testé dans Node.
//
// Un élément est nouveau s'il porte la date `revele_le` (écrite par la régie du MJ quand elle le dépose dans le dossier du joueur) et que CET APPAREIL
// ne l'a pas encore ouvert. Ce qui a été publié avant la régie n'a pas de date : rien n'est marqué nouveau rétroactivement.
// La liste de ce qui a été vu reste sur l'appareil (un petit tableau par joueur) : ce n'est qu'un repère d'affichage, jamais une donnée du jeu.
const MAX = 3000;
export const cleVu = e => `${e.zone || ""}/${String(e.fichier || "").replace(/\.md$/i, "")}|${e.meta && e.meta.revele_le != null ? String(e.meta.revele_le) : ""}`;

/** @param {{getItem:Function,setItem:Function}|null} stockage  @param {string} cle  nom de l'entrée (par JDR et par joueur) */
export function creerNouveautes(stockage, cle) {
  let vus = null;
  const lire = () => {
    if (vus) return vus;
    try { const v = JSON.parse((stockage && stockage.getItem(cle)) || "[]"); vus = new Set(Array.isArray(v) ? v.map(String) : []); } catch { vus = new Set(); }
    return vus;
  };
  return {
    /** Vrai si l'élément vient d'être révélé et n'a pas encore été ouvert sur cet appareil. Une mise à jour (nouvelle date) le rend nouveau à nouveau. */
    estNouveau(e) { return !!(e && e.meta && e.meta.revele_le != null && String(e.meta.revele_le).trim() !== "" && !lire().has(cleVu(e))); },
    /** Marque l'élément comme vu. → vrai si quelque chose a changé. */
    marquerVu(e) {
      if (!this.estNouveau(e)) return false;
      const s = lire(); s.add(cleVu(e));
      const tab = [...s].slice(-MAX); vus = new Set(tab);
      try { if (stockage) stockage.setItem(cle, JSON.stringify(tab)); } catch { /* stockage plein ou refusé : le repère sera perdu, rien de grave */ }
      return true;
    },
    compter(items) { return (items || []).filter(e => this.estNouveau(e)).length; }
  };
}
