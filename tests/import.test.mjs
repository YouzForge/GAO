// Tests de l'import Word (conversion .docx → Markdown, lecture de l'archive). XML inventé : aucun contenu de jeu.   node --test tests/
import test from "node:test";
import assert from "node:assert/strict";
import zlib from "node:zlib";
import { convertirDocx, titreDepuisNom, texteDocumentImporte, ENTETE } from "../src/import/docx.js";
import { ouvrirZip, ArchiveInvalide } from "../src/import/zip.js";
import { decouper, ficheMJ } from "../src/mj/seance.js";
import { parseDoc, getSection } from "../src/md/doc.js";

const r = (texte, { gras = false, italique = false } = {}) => `<w:r><w:rPr>${gras ? "<w:b/><w:bCs/>" : ""}${italique ? "<w:i/>" : ""}</w:rPr><w:t xml:space="preserve">${texte}</w:t></w:r>`;
const p = (runs, { style = "", gauche = "", bas = "", liste = false } = {}) => `<w:p><w:pPr>${style ? `<w:pStyle w:val="${style}"/>` : ""}${liste ? '<w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr>' : ""}${gauche || bas ? `<w:pBdr>${gauche ? `<w:left w:val="thick" w:color="${gauche}"/>` : ""}${bas ? `<w:bottom w:val="single" w:color="${bas}"/>` : ""}</w:pBdr>` : ""}</w:pPr>${runs}</w:p>`;
const cellule = (texte, fond = "") => `<w:tc><w:tcPr>${fond ? `<w:shd w:fill="${fond}"/>` : ""}</w:tcPr>${p(r(texte))}</w:tc>`;
const doc = corps => `<?xml version="1.0"?><w:document xmlns:w="x"><w:body>${corps}<w:sectPr/></w:body></w:document>`;

test("conversion : titres, blocs par libellé et par couleur, listes, tableaux, gras", () => {
  const xml = doc([
    p(r("LE TITRE DU DOCUMENT", { gras: true })),
    p(r("I — Le port"), { style: "Titre1", bas: "B8860B" }),
    p(r("▸  Synopsis"), { style: "Heading2" }),
    p(r("Tout commence ") + r("au port", { gras: true }) + r(" &amp; finit mal.")),
    p(r("📖  Texte à lire", { gras: true }), { gauche: "B8860B" }),
    p(r("La brume couvre les quais.", { italique: true }), { gauche: "B8860B" }),
    p(r("🗣  Mira", { gras: true }), { gauche: "B8860B" }),
    p(r("Bonjour."), { gauche: "B8860B" }),
    p(r("🔒  Secret MJ — Ne pas révéler", { gras: true }), { gauche: "922B21" }),
    p(r("Le capitaine ment."), { gauche: "922B21" }),
    p(r("Sans libellé mais bordé de bleu."), { gauche: "1A5276" }),
    p(r("premier"), { liste: true }), p(r("second"), { liste: true }),
    `<w:tbl><w:tblPr/><w:tr>${cellule("Nom")}${cellule("PV")}</w:tr><w:tr>${cellule("Garde")}${cellule("12 | 14", "FDEDEC")}</w:tr></w:tbl>`,
    p(r("II — La taverne", { gras: true }), { bas: "B8860B" }),      // titre sans style Word : tout en gras, filet coloré
    p(""), p(r("Fin."))
  ].join(""));
  const c = convertirDocx(xml, '<w:numbering><w:abstractNum w:abstractNumId="0"><w:lvl w:ilvl="0"><w:numFmt w:val="decimal"/></w:lvl></w:abstractNum><w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num></w:numbering>');
  const md = c.markdown;
  assert.deepEqual(c.titres, ["I — Le port", "II — La taverne"]);
  assert.match(md, /^\*\*LE TITRE DU DOCUMENT\*\*\n\n### I — Le port\n\n#### ▸ {2}Synopsis\n\nTout commence \*\*au port\*\* & finit mal\./);
  assert.ok(md.includes(`${ENTETE.lire}\n\n**📖  Texte à lire**\n\n*La brume couvre les quais.*`));
  assert.match(md, /🔴 \*\*Secret MJ\*\*\n\n\*\*🔴 {2}Secret MJ — Ne pas révéler\*\*\n\nLe capitaine ment\./);
  assert.doesNotMatch(md, /🔒/);
  assert.match(md, /🎲 \*\*Note MJ\*\*\n\nSans libellé mais bordé de bleu\./);
  assert.match(md, /1\. premier\n1\. second/);
  assert.match(md, /\| Nom \| PV \|\n\| --- \| --- \|\n\| Garde \| 12 \\\| 14 <!-- cellule-secret --> \|/);
  // la réplique d'un dialogue porte la bordure ambre des textes à lire : le convertisseur ouvre un bloc « à lire », que l'écran rattache au dialogue (« à dire »)
  assert.deepEqual(c.rapport.blocs, { lire: 2, dialogue: 1, secret: 1, note: 1 });
  assert.equal(c.rapport.scenes, 2);
  assert.equal(c.rapport.tableaux, 1);
  assert.equal(c.rapport.cellulesSecretes, 1);
  assert.equal(c.rapport.fidelite.perdus, 0);
  // ce que l'écran « Séance » en fait
  const sc = decouper(md);
  assert.deepEqual(sc.map(s => s.titre), ["", "I — Le port", "II — La taverne"]);
  const port = sc[1].blocs;
  assert.deepEqual(port.filter(b => b.cle !== "texte" && b.cle !== "titre").map(b => [b.cle, b.qui]), [["lire", "Texte à lire"], ["dialogue", "Mira"], ["secret", "Secret MJ — Ne pas révéler"], ["note", ""]]);
  assert.equal(ficheMJ(sc).length, 1);
});

test("conversion : ce qui n'est pas repris est signalé ; un document vide est refusé proprement", () => {
  const c = convertirDocx(doc(p(r("Texte.")) + '<w:p><w:r><w:drawing/></w:r></w:p>' + p(r("Bloc inconnu"), { gauche: "123456" })));
  assert.ok(c.rapport.avertissements.some(a => a.startsWith("image")));
  assert.ok(c.rapport.avertissements.some(a => a.includes("123456")));
  assert.match(c.markdown, /❓ \*\*À examiner\*\*/);
  assert.throws(() => convertirDocx("<x/>"), /corps introuvable/);
});

test("fichier importé : format de la collection, toujours secret", () => {
  const s = texteDocumentImporte({ genre: "session", titre: "Le port", saison: "2", lieu: "Port", markdown: "### I — Arrivée\n\nTexte.", source: "07 - Port.docx", date: "2026-01-02" });
  const d = parseDoc(s);
  assert.equal(d.meta.titre, "Le port"); assert.equal(d.meta.statut, "idée"); assert.equal(d.meta.visibilite, "secret"); assert.equal(d.meta.saison, 2);
  assert.match(getSection(d.body, "Déroulé des scènes"), /^### I — Arrivée/);
  for (const t of ["Résumé joueurs", "Moments pivots", "Fins possibles", "Ce qui s'est passé", "🔴 Notes MJ"]) assert.ok(d.body.includes(`## ${t}`));
  const l = parseDoc(texteDocumentImporte({ genre: "lieu", titre: "Le port", type: "ville", markdown: "### I — Quais" }));
  assert.equal(l.meta.nom, "Le port"); assert.equal(l.meta.etat, "à venir"); assert.equal(l.meta.visibilite, "secret");
  assert.match(getSection(l.body, "Document source complet (MJ)"), /### I — Quais/);
  assert.throws(() => texteDocumentImporte({ genre: "pnj", titre: "x", markdown: "y" }));
  assert.equal(titreDepuisNom("06 - GAO_Session_Le_port_v3.docx"), "Session Le port");
});

/** Fabrique une archive ZIP minimale (une entrée compressée, une entrée stockée). */
function zipDe(entrees) {
  const morceaux = [], central = []; let o = 0;
  for (const [nom, texte, compresse] of entrees) {
    const n = Buffer.from(nom), brut = Buffer.from(texte), data = compresse ? zlib.deflateRawSync(brut) : brut;
    const tete = Buffer.alloc(30); tete.writeUInt32LE(0x04034b50, 0); tete.writeUInt16LE(compresse ? 8 : 0, 8); tete.writeUInt32LE(data.length, 18); tete.writeUInt32LE(brut.length, 22); tete.writeUInt16LE(n.length, 26);
    const c = Buffer.alloc(46); c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(compresse ? 8 : 0, 10); c.writeUInt32LE(data.length, 20); c.writeUInt32LE(brut.length, 24); c.writeUInt16LE(n.length, 28); c.writeUInt32LE(o, 42);
    morceaux.push(tete, n, data); central.push(c, n); o += 30 + n.length + data.length;
  }
  const cd = Buffer.concat(central), fin = Buffer.alloc(22);
  fin.writeUInt32LE(0x06054b50, 0); fin.writeUInt16LE(entrees.length, 8); fin.writeUInt16LE(entrees.length, 10); fin.writeUInt32LE(cd.length, 12); fin.writeUInt32LE(o, 16);
  const b = Buffer.concat([...morceaux, cd, fin]);
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
}

test("archive : entrées compressées et stockées, fichier qui n'est pas un .docx", async () => {
  const z = await ouvrirZip(zipDe([["word/document.xml", "<w:document>é</w:document>".repeat(50), true], ["autre.txt", "stocké", false]]));
  assert.deepEqual(z.noms, ["word/document.xml", "autre.txt"]);
  assert.equal((await z.texte("word/document.xml")).length, 26 * 50);
  assert.equal(await z.texte("autre.txt"), "stocké");
  assert.equal(await z.texte("absent.xml"), null);
  await assert.rejects(() => ouvrirZip(new TextEncoder().encode("ceci n'est pas une archive, juste du texte assez long").buffer), ArchiveInvalide);
});
