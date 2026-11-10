// Lecture minimale d'une archive ZIP (un fichier .docx en est une), sans dépendance : le répertoire central, puis chaque entrée demandée.
// La décompression « deflate » est celle du navigateur (DecompressionStream, présent dans Chrome, Edge, Firefox, Safari récents et dans Node).
// Lecture seule : rien n'est écrit, rien n'est exécuté ; seuls les noms demandés sont décompressés.

export class ArchiveInvalide extends Error { constructor(m) { super(m); this.name = "ArchiveInvalide"; } }

const TAILLE_MAX = 30_000_000;   // un document Word de plus de 30 Mo décompressés n'est pas un document de session : on refuse plutôt que de saturer la mémoire

async function gonfler(octets) {
  if (typeof DecompressionStream !== "function") throw new ArchiveInvalide("Ce navigateur ne sait pas ouvrir un fichier Word (décompression absente). Essaie avec Chrome, Edge, Firefox ou Safari à jour.");
  const flux = new Blob([octets]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  const morceaux = []; let total = 0;
  const lecteur = flux.getReader();
  for (;;) {
    const { done, value } = await lecteur.read();
    if (done) break;
    total += value.length;
    if (total > TAILLE_MAX) throw new ArchiveInvalide("Fichier trop volumineux");
    morceaux.push(value);
  }
  const out = new Uint8Array(total); let o = 0;
  for (const m of morceaux) { out.set(m, o); o += m.length; }
  return out;
}

/**
 * @param {ArrayBuffer} tampon  le contenu du fichier
 * @returns {Promise<{noms:string[], lire:(nom:string)=>Promise<Uint8Array|null>, texte:(nom:string)=>Promise<string|null>}>}
 */
export async function ouvrirZip(tampon) {
  const u = new Uint8Array(tampon), v = new DataView(tampon);
  // Fin du répertoire central : signature 0x06054b50, cherchée depuis la fin (un commentaire peut la suivre).
  let fin = -1;
  for (let i = u.length - 22; i >= Math.max(0, u.length - 66000); i--) if (v.getUint32(i, true) === 0x06054b50) { fin = i; break; }
  if (fin < 0) throw new ArchiveInvalide("Ce fichier n'est pas un document Word (.docx).");
  const nb = v.getUint16(fin + 10, true), debut = v.getUint32(fin + 16, true);
  const entrees = new Map();
  let p = debut;
  for (let i = 0; i < nb; i++) {
    if (p + 46 > u.length || v.getUint32(p, true) !== 0x02014b50) throw new ArchiveInvalide("Document Word abîmé (répertoire illisible).");
    const methode = v.getUint16(p + 10, true), taille = v.getUint32(p + 20, true), n = v.getUint16(p + 28, true), x = v.getUint16(p + 30, true), c = v.getUint16(p + 32, true), local = v.getUint32(p + 42, true);
    const nom = new TextDecoder().decode(u.subarray(p + 46, p + 46 + n));
    entrees.set(nom, { methode, taille, local });
    p += 46 + n + x + c;
  }
  async function lire(nom) {
    const e = entrees.get(nom);
    if (!e) return null;
    if (v.getUint32(e.local, true) !== 0x04034b50) throw new ArchiveInvalide("Document Word abîmé (entrée illisible).");
    const d = e.local + 30 + v.getUint16(e.local + 26, true) + v.getUint16(e.local + 28, true);
    const brut = u.subarray(d, d + e.taille);
    if (e.methode === 0) return brut;
    if (e.methode === 8) return gonfler(brut);
    throw new ArchiveInvalide("Compression non prise en charge dans ce document.");
  }
  return { noms: [...entrees.keys()], lire, async texte(nom) { const o = await lire(nom); return o == null ? null : new TextDecoder("utf-8").decode(o); } };
}
