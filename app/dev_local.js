// Banc d'essai local (outils/serveur_local.mjs) : remplace la connexion Microsoft et OneDrive par un faux, sur la machine de développement seulement.
// Ce module n'est chargé que si la page est servie par « localhost » ET que la configuration locale déclare `window.JDR_DEV` : jamais sur le site publié.
//   …/app/                 → MJ
//   …/app/?comme=<Pseudo>  → le joueur <Pseudo> (dossier Joueurs/<Pseudo> et Table, exactement ce que OneDrive lui partagerait)
import { creerCache, creerDepot, GRAPH } from "../src/index.js?v=0.26.2";

export function estDev(fen) { return ["localhost", "127.0.0.1"].includes(fen.location.hostname) && !!fen.JDR_DEV; }

export function creerDev(fen) {
  const dev = fen.JDR_DEV;
  const pseudo = new URLSearchParams(fen.location.search).get("comme") || "";
  const hex = pseudo ? [...new TextEncoder().encode(pseudo)].map(b => b.toString(16).padStart(2, "0")).join("").padEnd(64, "0").slice(0, 64) : "0".repeat(63) + "1";
  const auth = {
    async init() {}, connecte: () => true, async empreinte() { return hex; }, async getToken() { return "local"; },
    async login() { fen.location.reload(); }, async logout() {}
  };
  const fetchDev = (url, opt) => fen.fetch(String(url).replace(GRAPH, dev.graph), opt);
  /** Session d'un joueur sans passer par les liens de partage : ses deux racines sont désignées directement. */
  function sessionJoueur({ client, profil, stockage, ecriture }) {
    const sec = profil.securite || {};
    const racines = { table: { path: `${dev.racine}/${sec.table || "Table"}` }, joueur: { path: `${dev.racine}/${sec.joueurs || "Joueurs"}/${pseudo}`, pseudo } };
    const cache = creerCache(stockage, hex);
    return { role: "joueur", pseudo, statut: "pret", problemes: [], manque: [], horsLigne: false, cache, depot: creerDepot({ client, profil, role: "joueur", racines, cache, ecriture }) };
  }
  return { auth, fetch: fetchDev, pseudo, sessionJoueur };
}
