// Banc d'essai local : sert l'application et imite la petite partie de Microsoft Graph (OneDrive) dont le moteur se sert,
// au-dessus d'un dossier de données sur le disque. Aucune connexion Microsoft, aucun contenu de jeu dans ce fichier.
//
//   node outils/serveur_local.mjs "<dossier de données>" [port] [profil.json]
//
// Profil servi à l'application : celui donné en troisième argument ; sinon app/profil.json du dépôt (dépôt d'un JDR) ; sinon le profil.json
// du dossier « 07_Application » des données (dépôt du moteur, qui n'a pas de profil à lui).
// Le dossier de données est une COPIE d'un JDR (MJ/, Table/, Joueurs/) : ne jamais pointer sur le vrai dossier OneDrive.
// Ouvrir ensuite http://localhost:<port>/app/ (MJ) ou http://localhost:<port>/app/?comme=<Pseudo> (joueur).
import http from "node:http";
import fs from "node:fs/promises";
import { createReadStream, existsSync, statSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEPOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DONNEES = path.resolve(process.argv[2] || "");
const PORT = Number(process.argv[3] || process.env.PORT || 8765);
const RACINE_MJ = "Documents/JDR/Banc d'essai";   // même valeur que `racineMJ` de la configuration : le serveur la retire des chemins
if (!process.argv[2] || !existsSync(DONNEES) || !statSync(DONNEES).isDirectory()) { console.error("Dossier de données introuvable : " + DONNEES); process.exit(1); }

function trouverProfil() {
  if (process.argv[4]) return path.resolve(process.argv[4]);
  if (existsSync(path.join(DEPOT, "app", "profil.json"))) return null;                       // le dépôt a le sien : servi comme n'importe quel fichier
  const pistes = [path.join(DONNEES, "07_Application", "profil.json"), ...readdirSync(DONNEES).map(n => path.join(DONNEES, n, "07_Application", "profil.json"))];
  return pistes.find(p => existsSync(p)) || null;
}
const PROFIL = trouverProfil();
if (PROFIL && !existsSync(PROFIL)) { console.error("Profil introuvable : " + PROFIL); process.exit(1); }

const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".woff2": "font/woff2", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml", ".md": "text/markdown; charset=utf-8" };

const CONFIG_DEV = `// Configuration du banc d'essai local (générée par outils/serveur_local.mjs) : jamais publiée.
window.JDR_APP = { clientId: "00000000-0000-0000-0000-000000000000", authority: "https://login.microsoftonline.com/common", scopes: ["User.Read", "Files.ReadWrite"],
  allowed: { mj: ["${"0".repeat(63)}1"] }, ecriture: true, racineMJ: ${JSON.stringify(RACINE_MJ)} };
window.JDR_DEV = { graph: "/__graph/v1.0", racine: ${JSON.stringify(RACINE_MJ)} };
`;

const etagDe = st => `"${Math.round(st.mtimeMs)}-${st.size}"`;
const element = (nom, st) => ({ id: "L" + Buffer.from(nom + "|" + st.ino).toString("hex").slice(0, 24), name: nom, size: st.size, eTag: etagDe(st),
  lastModifiedDateTime: new Date(st.mtimeMs).toISOString(), parentReference: { driveId: "local" }, ...(st.isDirectory() ? { folder: {} } : { file: {} }) });

/** Chemin Graph (« Documents/JDR/Banc d'essai/MJ/… ») → chemin sur le disque, sans jamais sortir du dossier de données. */
function surDisque(rel) {
  let r = String(rel || "").replace(/^\/+|\/+$/g, "");
  if (r === RACINE_MJ) r = ""; else if (r.startsWith(RACINE_MJ + "/")) r = r.slice(RACINE_MJ.length + 1);
  else if (r !== "") return null;                                    // hors du JDR : n'existe pas
  const p = path.resolve(DONNEES, r);
  if (p !== DONNEES && !p.startsWith(DONNEES + path.sep)) return null;
  return p;
}
const stat = async p => { try { return await fs.stat(p); } catch { return null; } };
const corps = req => new Promise((ok, ko) => { const m = []; req.on("data", c => m.push(c)); req.on("end", () => ok(Buffer.concat(m))); req.on("error", ko); });
const json = (res, code, obj) => { res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }); res.end(obj == null ? "" : JSON.stringify(obj)); };
const erreur = (res, code, c) => json(res, code, { error: { code: c } });

async function graph(req, res, url) {
  const chemin = decodeURIComponent(url.pathname.replace(/^\/__graph\/v1\.0/, ""));
  // Dossier d'application du compte (mémoire des dossiers du joueur) : un simple sous-dossier caché des données.
  const app = chemin.match(/^\/me\/drive\/special\/approot:\/([^/:]+):\/content$/);
  if (app) {
    const f = path.join(DONNEES, ".approot", app[1]);
    if (req.method === "GET") { const s = await stat(f); if (!s) return erreur(res, 404, "itemNotFound"); res.writeHead(200, { "Content-Type": "application/json" }); return createReadStream(f).pipe(res); }
    if (req.method === "PUT") { await fs.mkdir(path.dirname(f), { recursive: true }); await fs.writeFile(f, await corps(req)); return json(res, 200, { id: "app" }); }
  }
  const m = chemin.match(/^\/me\/drive\/root(?::\/(.*?):)?(\/children|\/content)?$/);
  if (!m) return erreur(res, 404, "itemNotFound");
  const p = surDisque(m[1] || ""), suite = m[2] || "";
  if (!p) return erreur(res, 404, "itemNotFound");
  const st = await stat(p);
  const si = req.headers["if-match"];

  if (suite === "/children" && req.method === "GET") {
    if (!st || !st.isDirectory()) return erreur(res, 404, "itemNotFound");
    const noms = (await fs.readdir(p)).filter(n => !n.startsWith("."));
    const value = []; for (const n of noms) { const s = await stat(path.join(p, n)); if (s) value.push(element(n, s)); }
    return json(res, 200, { value });
  }
  if (suite === "/children" && req.method === "POST") {
    if (!st || !st.isDirectory()) return erreur(res, 404, "itemNotFound");
    const b = JSON.parse((await corps(req)).toString("utf8") || "{}");
    const cible = path.join(p, String(b.name || ""));
    if (!b.name || /[\\/]/.test(b.name)) return erreur(res, 400, "invalidRequest");
    if (await stat(cible)) return erreur(res, 409, "nameAlreadyExists");
    await fs.mkdir(cible); return json(res, 201, element(b.name, await stat(cible)));
  }
  if (suite === "/content" && req.method === "GET") {
    if (!st || st.isDirectory()) return erreur(res, 404, "itemNotFound");
    res.writeHead(200, { "Content-Type": TYPES[path.extname(p).toLowerCase()] || "application/octet-stream", "Cache-Control": "no-store" });
    return createReadStream(p).pipe(res);
  }
  if (suite === "/content" && req.method === "PUT") {
    if (st && st.isDirectory()) return erreur(res, 400, "invalidRequest");
    if (url.searchParams.get("@microsoft.graph.conflictBehavior") === "fail" && st) return erreur(res, 409, "nameAlreadyExists");
    if (si && (!st || etagDe(st) !== si)) return erreur(res, 412, "resourceModified");
    await fs.mkdir(path.dirname(p), { recursive: true });
    await fs.writeFile(p, await corps(req));
    return json(res, st ? 200 : 201, element(path.basename(p), await stat(p)));
  }
  if (!suite && req.method === "GET") { if (!st) return erreur(res, 404, "itemNotFound"); return json(res, 200, element(path.basename(p), st)); }
  if (!suite && req.method === "DELETE") {
    if (!st) return erreur(res, 404, "itemNotFound");
    if (si && etagDe(st) !== si) return erreur(res, 412, "resourceModified");
    await fs.rm(p, { recursive: true }); res.writeHead(204); return res.end();
  }
  if (!suite && req.method === "PATCH") {
    if (!st) return erreur(res, 404, "itemNotFound");
    const b = JSON.parse((await corps(req)).toString("utf8") || "{}");
    const cible = path.join(path.dirname(p), String(b.name || ""));
    if (!b.name || /[\\/]/.test(b.name)) return erreur(res, 400, "invalidRequest");
    if (await stat(cible)) return erreur(res, 409, "nameAlreadyExists");
    await fs.rename(p, cible); return json(res, 200, element(b.name, await stat(cible)));
  }
  return erreur(res, 405, "notSupported");
}

async function statique(req, res, url) {
  let rel = decodeURIComponent(url.pathname);
  if (rel === "/") { res.writeHead(302, { Location: "/app/" }); return res.end(); }
  if (rel.endsWith("/")) rel += "index.html";
  if (rel === "/app/config.js") { res.writeHead(200, { "Content-Type": TYPES[".js"], "Cache-Control": "no-store" }); return res.end(CONFIG_DEV); }
  if (rel === "/app/profil.json" && PROFIL) { res.writeHead(200, { "Content-Type": TYPES[".json"], "Cache-Control": "no-store" }); return createReadStream(PROFIL).pipe(res); }
  const p = path.resolve(DEPOT, "." + rel);
  if (!p.startsWith(DEPOT + path.sep) || rel.includes("/.git")) { res.writeHead(403); return res.end(); }
  const st = await stat(p);
  if (!st || st.isDirectory()) { res.writeHead(404); return res.end("introuvable"); }
  res.writeHead(200, { "Content-Type": TYPES[path.extname(p).toLowerCase()] || "application/octet-stream", "Cache-Control": "no-store" });
  createReadStream(p).pipe(res);
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  try { if (url.pathname.startsWith("/__graph/")) await graph(req, res, url); else await statique(req, res, url); }
  catch (e) { console.error(e); if (!res.headersSent) erreur(res, 500, "erreur"); else res.end(); }
}).listen(PORT, "127.0.0.1", () => console.log(`Banc d'essai : http://localhost:${PORT}/app/  (données : ${DONNEES}${PROFIL ? " ; profil : " + PROFIL : ""})`));
