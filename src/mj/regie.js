// La régie du MJ : tout ce que le MJ lit ET écrit depuis ses écrans (révélations, parcours, séance, jauges, notes de séance, résumés publics).
// Passe par le dépôt du moteur : mêmes garde-fous que le reste (interrupteur d'écriture, périmètre, version lue avant d'écrire, jamais « le dernier gagne »).
// Aucun navigateur ici : tout se teste dans Node avec un faux OneDrive.
//
// RÈGLE DE SÉCURITÉ : le seul chemin par lequel un texte du coffre arrive dans le dossier d'un joueur est `texteJoueur` / `copiePourAutreJoueur` / `fusionner`
// (src/mj/revelations.js), qui retirent les sections et les champs du coffre et refusent de publier si une marque de secret subsiste.
import { parseDoc, humanize, norm } from "../md/doc.js?v=0.20.1";
import { FicheExiste, ConflitEcriture } from "../graph/client.js?v=0.20.1";
import { AccesRefuse } from "../depot/depot.js?v=0.20.1";
import { EcritureInvalide } from "../ecriture/fiche.js?v=0.20.1";
import { pool } from "../graph/pool.js?v=0.20.1";
import { TYPES, typeDe, DOSSIER_REVELATIONS, lireCarte, texteJoueur, copiePourAutreJoueur, fusionner, texteCarte, modifierCarte, poserChamp, nomPublie, nomDepuisTitre,
  construireCatalogue, cleFichier, ligneJournal, ajouterAuJournal } from "./revelations.js?v=0.20.1";
import { lireParcours, ecrireParcours } from "./parcours.js?v=0.20.1";
import { lireLieuMJ, lireSessionMJ, trierParNumero, trierSessions } from "./accueil.js?v=0.20.1";
import { jaugeDe } from "./seance.js?v=0.20.1";

const MARKDOWN = /^(?!00_|LISEZMOI).+\.md$/i;
const NOM_DOSSIER = /^(?![._])[^/\\:?*"<>|\u0000-\u001f]{1,80}$/;
const NOM_SIMPLE = /^(?!00_)[^/\\:?*"<>|\u0000-\u001f]{1,120}\.md$/i;
const estAuth = e => e && (e.status === 401 || e.auth);
const deux = n => String(n).padStart(2, "0");
/** « 2026-11-10 » et « 2026-11-10 21:05 » à l'heure de l'appareil. */
export const jourDe = (d = new Date()) => `${d.getFullYear()}-${deux(d.getMonth() + 1)}-${deux(d.getDate())}`;
export const instantDe = (d = new Date()) => `${jourDe(d)} ${deux(d.getHours())}:${deux(d.getMinutes())}`;

/** Collections du coffre montrées en tuiles pendant la séance (les documents de session, les événements et le lore n'en sont pas). */
const GENRES_TUILES = ["pnj", "lieu", "quete", "faction", "divinite", "creature", "objet"];

export function creerRegie({ profil, depot, maintenant = () => new Date() }) {
  const sec = profil.securite || {};
  const coffre = sec.coffre || "MJ", dosJoueurs = sec.joueurs || "Joueurs";
  const col = id => (profil.collections || []).find(c => c.id === id) || null;
  const dossierCol = id => { const c = col(id); return c ? c.dossier : null; };
  const zones = Object.fromEntries(((profil.joueur_modele || {}).dossiers || []).map(d => [d.id, d.dossier]));
  const racineCartes = `${coffre}/${DOSSIER_REVELATIONS}`;
  const cheminJournal = `${racineCartes}/Journal_des_revelations.md`;
  const cheminParcours = `${(dossierCol("session") || `${coffre}/02_Campagne/Sessions`).split("/").slice(0, -1).join("/")}/Parcours.md`;
  const refus = (m, r) => { throw new AccesRefuse(m, r); };
  const exigerType = type => typeDe(type) || refus("Type inconnu", "zone_refusee");
  const exigerPseudo = p => { if (!NOM_DOSSIER.test(String(p))) refus("Nom de joueur invalide", "nom_invalide"); return p; };
  const dossierJoueur = (p, type) => { const z = zones[exigerType(type).zone]; if (!z) refus("Dossier non prévu par ce JDR", "zone_absente"); return `${dosJoueurs}/${exigerPseudo(p)}/${z}`; };
  const dossierCartes = type => `${racineCartes}/${exigerType(type).dossier}`;

  const lister = async chemin => { const r = await depot.lister(chemin); return r.absent ? [] : r.donnees; };
  const nomsMd = ls => ls.filter(f => !f.dir && MARKDOWN.test(f.name)).map(f => f.name);
  const lire = async chemin => (await depot.lire(chemin)).texte;

  /** Relit `chemin`, calcule le nouveau texte, écrit avec la version lue ; un seul nouvel essai si le fichier a changé entre-temps. `creerSiAbsent` : part de `null`. */
  async function surFichier(chemin, transformer, { creerSiAbsent = false } = {}) {
    for (let essai = 0; ; essai++) {
      const f = await depot.lireFiche(chemin);
      if (!f && !creerSiAbsent) throw new ConflitEcriture(chemin, "disparue");
      const nouveau = transformer(f ? f.texte : null);
      if (nouveau == null || (f && nouveau === f.texte)) return { inchange: true };
      try { return f ? await depot.modifier(chemin, nouveau, f.etag) : await depot.creer(chemin, nouveau); }
      catch (e) { if (essai === 0 && (e instanceof FicheExiste || (e instanceof ConflitEcriture && e.raison !== "disparue"))) continue; throw e; }
    }
  }
  /** Le journal est un confort : son échec ne doit jamais faire croire qu'une révélation a échoué (elle est déjà écrite). */
  async function journal(action, type, titre, joueurs) {
    try { await surFichier(cheminJournal, t => ajouterAuJournal(t, ligneJournal({ date: instantDe(maintenant()), action, type, titre, joueurs })), { creerSiAbsent: true }); }
    catch (e) { if (estAuth(e)) throw e; }
  }

  /** Pseudos des joueurs (dossiers de `Joueurs/`, sauf le modèle « _… »). */
  async function pseudos() {
    return (await lister(dosJoueurs)).filter(f => f.dir && NOM_DOSSIER.test(f.name)).map(f => f.name).sort((a, b) => a.localeCompare(b, "fr"));
  }
  /** Fichiers d'un type chez un joueur : la racine du dossier et, pour le sac, un niveau de sous-dossiers. → [chemins relatifs au dossier] ou `null` si illisible. */
  async function fichiersDe(p, type) {
    try {
      const base = dossierJoueur(p, type);
      const ls = await lister(base);
      const out = nomsMd(ls);
      if (type === "objet") for (const d of ls.filter(f => f.dir && !/^[._]/.test(f.name))) for (const n of nomsMd(await lister(`${base}/${d.name}`))) out.push(`${d.name}/${n}`);
      return out;
    } catch (e) { if (estAuth(e)) throw e; return null; }
  }
  const nomSeul = rel => String(rel).split("/").pop();

  const api = {
    types: TYPES, cheminParcours, racineCartes,

    /** Le catalogue d'un type : cartes du coffre + ce que chaque joueur a déjà. → { joueurs, lignes } (voir construireCatalogue) ; `chez[pseudo]` est un chemin relatif au dossier du joueur. */
    async catalogue(type) {
      exigerType(type);
      const [ps, nomsCartes] = await Promise.all([pseudos(), lister(dossierCartes(type)).then(nomsMd)]);
      const [cartes, parJoueur] = await Promise.all([
        pool(nomsCartes, async n => { const t = await lire(`${dossierCartes(type)}/${n}`); return t == null ? null : lireCarte(t, n, type); }, 6),
        pool(ps, async p => ({ pseudo: p, rels: await fichiersDe(p, type) }), 4)]);
      const cat = construireCatalogue(type, cartes.filter(Boolean), parJoueur.map(j => ({ pseudo: j.pseudo, fichiers: j.rels ? j.rels.map(nomSeul) : null })));
      const rels = new Map(parJoueur.map(j => [j.pseudo, new Map((j.rels || []).map(r => [cleFichier(nomSeul(r)), r]))]));
      for (const l of cat.lignes) for (const p of Object.keys(l.chez)) l.chez[p] = rels.get(p).get(cleFichier(l.chez[p])) || l.chez[p];
      return cat;
    },

    /** Texte qu'un joueur recevrait pour cette ligne (aperçu avant de révéler). → texte Markdown, ou `null` si rien de publiable. */
    async apercu(ligne) {
      if (ligne.carte) return texteJoueur(ligne.carte.texte);
      const p = Object.keys(ligne.chez)[0];
      if (!p) return null;
      const t = await lire(`${dossierJoueur(p, ligne.type)}/${ligne.chez[p]}`);
      return t == null ? null : copiePourAutreJoueur(t, ligne.type);
    },

    /**
     * Révèle une ligne du catalogue à des joueurs : écrit sa version joueur dans le dossier de chacun. Jamais d'écrasement (un joueur qui l'a déjà est sauté).
     * → { fichier, faits:[pseudos], deja:[pseudos] }
     */
    async reveler(ligne, liste) {
      const ty = exigerType(ligne.type);
      const cibles = [...new Set(liste || [])].map(exigerPseudo);
      if (!cibles.length) return { fichier: ligne.fichier, faits: [], deja: [] };
      const date = jourDe(maintenant());
      let texte, fichier = ligne.fichier;
      if (ligne.carte) {
        texte = texteJoueur(ligne.carte.texte, { date });
        if (!fichier) {
          const tous = (await pool(await pseudos(), p => fichiersDe(p, ligne.type), 4)).flatMap(x => x || []).map(nomSeul);
          fichier = nomPublie(ligne.type, ligne.carte.titre, tous);
        }
      } else {
        const source = Object.keys(ligne.chez)[0];
        if (!source) throw new EcritureInvalide("Cette ligne n'a ni carte ni exemplaire chez un joueur", "revelation_vide");
        const t = await lire(`${dossierJoueur(source, ligne.type)}/${ligne.chez[source]}`);
        texte = t == null ? null : copiePourAutreJoueur(t, ligne.type, { date });
      }
      if (texte == null) throw new EcritureInvalide("Ce texte contient encore une marque de secret (🔴, 🔒, 🎲, ⚔️, 🆕) : il n'est pas publié. Corrige la carte.", "marque_secrete");
      if (!NOM_SIMPLE.test(fichier)) throw new EcritureInvalide("Nom de fichier impossible pour cette carte", "nom_invalide");
      const faits = [], deja = [];
      for (const p of cibles) {
        if (p in ligne.chez) { deja.push(p); continue; }
        try { await depot.creer(`${dossierJoueur(p, ligne.type)}/${fichier}`, texte); faits.push(p); }
        catch (e) { if (e instanceof FicheExiste) deja.push(p); else throw e; }
      }
      if (ligne.carte && !ligne.carte.publieSous && (faits.length || deja.length)) await surFichier(`${dossierCartes(ligne.type)}/${ligne.carte.fichier}`, t => poserChamp(t, "publie_sous", fichier));
      if (faits.length) await journal("révélé", ligne.type, ligne.titre, faits);
      return { fichier, faits, deja, type: ty.id };
    },

    /** Retire à un joueur un élément révélé (corbeille OneDrive). L'écran demande confirmation AVANT. → true si retiré, false s'il n'y était déjà plus. */
    async retirer(ligne, p) {
      exigerType(ligne.type); exigerPseudo(p);
      const rel = ligne.chez[p];
      if (!rel) return false;
      const chemin = `${dossierJoueur(p, ligne.type)}/${rel}`;
      const f = await depot.lireFiche(chemin);
      if (!f) return false;
      await depot.supprimer(chemin, f.etag);
      await journal("retiré", ligne.type, ligne.titre, [p]);
      return true;
    },

    /** Pousse le texte actuel de la carte chez tous les joueurs qui l'ont déjà, en gardant ce qu'ils ont écrit eux-mêmes. → { faits:[pseudos], inchanges:[pseudos] } */
    async mettreAJour(ligne) {
      exigerType(ligne.type);
      if (!ligne.carte) throw new EcritureInvalide("Cette ligne n'a pas de carte au coffre : crée-en une pour pouvoir la mettre à jour", "sans_carte");
      const date = jourDe(maintenant());
      const faits = [], inchanges = [];
      for (const p of Object.keys(ligne.chez)) {
        let refuse = false;
        const r = await surFichier(`${dossierJoueur(p, ligne.type)}/${ligne.chez[p]}`, ancien => {
          const neuf = fusionner(ancien, ligne.carte.texte, ligne.type, { date });
          if (neuf == null) { refuse = true; return null; }
          // seule la date ne change pas le fond : on ne réécrit pas pour elle
          const sansDate = x => x.replace(/^revele_le:.*\n/m, "");
          return sansDate(neuf) === sansDate(ancien) ? null : neuf;
        });
        if (refuse) throw new EcritureInvalide("Ce texte contient encore une marque de secret : il n'est pas publié. Corrige la carte.", "marque_secrete");
        (r.inchange ? inchanges : faits).push(p);
      }
      if (faits.length) await journal("mis à jour", ligne.type, ligne.titre, faits);
      return { faits, inchanges };
    },

    /** Crée une carte au coffre (rien n'est révélé). → la carte lue. Le nom de fichier vient du titre ; un nom pris reçoit un suffixe. */
    async creerCarte(champs) {
      const ty = exigerType(champs.type);
      if (!String(champs.titre || "").trim()) throw new EcritureInvalide("Donne un titre à la carte", "titre_vide");
      const texte = texteCarte(champs);
      const dos = dossierCartes(ty.id);
      for (let essai = 0; ; essai++) {
        const pris = new Set(nomsMd(await lister(dos)).map(cleFichier));
        const base = nomDepuisTitre(champs.titre);
        let nom = `${base}.md`;
        for (let i = 2; pris.has(cleFichier(nom)); i++) nom = `${base}_${i}.md`;
        try { await depot.creer(`${dos}/${nom}`, texte); return lireCarte(texte, nom, ty.id); }
        catch (e) { if (essai === 0 && e instanceof FicheExiste) continue; throw e; }
      }
    },
    /** Modifie le texte d'une carte du coffre (les joueurs ne reçoivent rien tant que « mettre à jour » n'est pas demandé). → la carte relue. */
    async modifierCarte(carte, champs) {
      exigerType(carte.type);
      if (!NOM_SIMPLE.test(carte.fichier)) refus("Nom de fichier invalide", "nom_invalide");
      let neuf = null;
      await surFichier(`${dossierCartes(carte.type)}/${carte.fichier}`, t => (neuf = modifierCarte(t, { ...champs, type: carte.type })));
      return lireCarte(neuf, carte.fichier, carte.type);
    },
    /** Crée la carte du coffre d'un élément qui n'en a pas (publié avant la régie), à partir de l'exemplaire d'un joueur : il devient modifiable et « mettable à jour ». */
    async adopter(ligne) {
      exigerType(ligne.type);
      if (ligne.carte) return ligne.carte;
      const p = Object.keys(ligne.chez)[0];
      if (!p) throw new EcritureInvalide("Aucun exemplaire à reprendre", "revelation_vide");
      const t = await lire(`${dossierJoueur(p, ligne.type)}/${ligne.chez[p]}`);
      const copie = t == null ? null : copiePourAutreJoueur(t, ligne.type);
      if (copie == null) throw new EcritureInvalide("Exemplaire illisible", "revelation_vide");
      const d = parseDoc(copie);
      const meta = { ...d.meta, pour: "tous", publie_sous: nomSeul(ligne.chez[p]), visibilite: "secret" };
      delete meta.revele_le;
      const texte = `---\n${Object.entries(meta).map(([k, v]) => `${k}: ${v}`).join("\n")}\n---\n${d.body}`;
      const nom = nomSeul(ligne.chez[p]).replace(/^\d+_/, "");
      try { await depot.creer(`${dossierCartes(ligne.type)}/${nom}`, texte); }
      catch (e) { if (!(e instanceof FicheExiste)) throw e; }
      return lireCarte(texte, nom, ligne.type);
    },
    /** Supprime une carte du coffre que personne n'a reçue (corbeille OneDrive). */
    async supprimerCarte(ligne) {
      if (!ligne.carte || ligne.n > 0) throw new EcritureInvalide("Cette carte est chez des joueurs : retire-la d'abord à chacun", "carte_publiee");
      const chemin = `${dossierCartes(ligne.type)}/${ligne.carte.fichier}`;
      const f = await depot.lireFiche(chemin);
      if (f) await depot.supprimer(chemin, f.etag);
    },
    /** Les dernières lignes du journal des révélations (les plus récentes d'abord). */
    async journal(n = 30) {
      const t = await lire(cheminJournal).catch(e => { if (estAuth(e)) throw e; return null; });
      return String(t || "").split("\n").filter(l => /^- \d{4}-/.test(l)).map(l => l.slice(2)).reverse().slice(0, n);
    },

    // ------------------------------------------------------------ Parcours (accueil)
    async documents() {
      const charger = async (id, lecteur) => {
        const d = dossierCol(id);
        if (!d) return [];
        const ls = await lister(d);
        return (await pool(nomsMd(ls).filter(n => !/^(Recap_|Parcours\.md$)/i.test(n)), async n => { const t = await lire(`${d}/${n}`); return t == null ? null : lecteur(t, n); }, 6)).filter(Boolean);
      };
      const [sessions, lieux] = await Promise.all([charger("session", lireSessionMJ), charger("lieu", lireLieuMJ)]);
      return { sessions: trierSessions(sessions), lieux: trierParNumero(lieux) };
    },
    async parcours() { return lireParcours(await lire(cheminParcours).catch(e => { if (estAuth(e)) throw e; return null; })); },
    async enregistrerParcours(p) { return surFichier(cheminParcours, () => ecrireParcours(p), { creerSiAbsent: true }); },

    // ------------------------------------------------------------ Séance
    /** Texte brut d'un document (session ou lieu). */
    async document(genre, fichier) {
      const d = dossierCol(genre);
      if (!d || !NOM_SIMPLE.test(String(fichier))) refus("Document inconnu", "nom_invalide");
      return lire(`${d}/${fichier}`);
    },
    /** Les fiches du coffre qui peuvent être citées dans un document : nom tiré du nom de fichier, rien n'est téléchargé. → [{ genre, libelle, fichier, nom }] */
    async entites() {
      const lots = await pool(GENRES_TUILES.filter(dossierCol), async id => {
        const c = col(id);
        try { return nomsMd(await lister(c.dossier)).map(n => ({ genre: id, libelle: c.singular || c.label, icone: c.icone || "book", fichier: n, nom: humanize(n) })); }
        catch (e) { if (estAuth(e)) throw e; return []; }
      }, 4);
      return lots.flat();
    },
    /** Texte d'une fiche du coffre (tuile ouverte). */
    async fiche(genre, fichier) {
      if (!GENRES_TUILES.includes(genre) || !NOM_SIMPLE.test(String(fichier))) refus("Fiche inconnue", "nom_invalide");
      return lire(`${dossierCol(genre)}/${fichier}`);
    },
    /** Les objets du coffre qui ont une jauge. → [{ fichier, nom, porteur, actuelle, max }] */
    async jauges() {
      const d = dossierCol("objet");
      if (!d) return [];
      const out = await pool(nomsMd(await lister(d)), async n => {
        const t = await lire(`${d}/${n}`);
        if (t == null) return null;
        const doc = parseDoc(t), j = jaugeDe(doc.meta);
        return j ? { fichier: n, nom: String(doc.meta.nom || doc.meta.titre || doc.title || humanize(n)), porteur: String(doc.meta.porteur || ""), ...j } : null;
      }, 4);
      return out.filter(Boolean);
    },
    /** Écrit la valeur d'une jauge dans la fiche de l'objet (coffre seulement : une jauge cachée n'est jamais chez un joueur). → { actuelle, max } */
    async changerJauge(fichier, valeur) {
      const d = dossierCol("objet");
      if (!d || !NOM_SIMPLE.test(String(fichier))) refus("Objet inconnu", "nom_invalide");
      let res = null;
      await surFichier(`${d}/${fichier}`, t => {
        const j = jaugeDe(parseDoc(t).meta);
        if (!j) throw new EcritureInvalide("Cet objet n'a pas de jauge", "sans_jauge");
        const v = Math.max(0, Math.min(j.max, Math.trunc(Number(valeur))));
        if (!Number.isFinite(v)) throw new EcritureInvalide("Valeur de jauge invalide", "jauge_invalide");
        res = { actuelle: v, max: j.max };
        return v === j.actuelle ? null : poserChamp(t, "jauge_actuelle", v);
      });
      return res;
    },

    // ------------------------------------------------------------ Fin de séance
    /** Notes de séance du jour (coffre : `05_Fin_de_seance/A_traiter`). → { chemin, texte } ; texte « » si rien n'est encore écrit. */
    cheminNotes(jour = jourDe(maintenant())) { return `${coffre}/05_Fin_de_seance/A_traiter/${jour}_Notes_de_seance.md`; },
    async notes(jour) {
      const chemin = api.cheminNotes(jour);
      const t = await lire(chemin).catch(e => { if (estAuth(e)) throw e; return null; });
      return { chemin, texte: t == null ? "" : parseDoc(t).body.replace(/^\s*#\s+.+\n?/, "").trim() };
    },
    async enregistrerNotes(texte, { jour = jourDe(maintenant()), seance = "" } = {}) {
      const corps = `---\ndate: ${jour}\n${seance ? `seance: ${String(seance).replace(/\s*\n\s*/g, " ")}\n` : ""}visibilite: secret\n---\n\n# Notes de séance du ${jour}\n\n${String(texte).trim()}\n`;
      return surFichier(api.cheminNotes(jour), () => corps, { creerSiAbsent: true });
    },
    /** Publie le résumé public d'une session dans la table (lisible par tous les joueurs : leur journal). Jamais d'écrasement. → { fichier } */
    async publierResume({ titre, session = "", texte }) {
      const d = dossierCol("resume");
      if (!d) refus("Ce JDR n'a pas de résumés de session", "zone_absente");
      if (!String(titre || "").trim() || !String(texte || "").trim()) throw new EcritureInvalide("Il faut un titre et un texte", "titre_vide");
      const brut = `---\ntitre: ${String(titre).replace(/\s*\n\s*/g, " ").trim()}\n${String(session).trim() ? `session: ${String(session).trim()}\n` : ""}visibilite: accessible\npublie_le: ${jourDe(maintenant())}\n---\n\n# ${String(titre).trim()}\n\n## Ce que tout le monde sait\n\n${String(texte).trim()}\n`;
      const publiable = texteJoueur(brut);
      if (publiable == null) throw new EcritureInvalide("Ce résumé contient une marque de secret : il n'est pas publié.", "marque_secrete");
      const d2 = parseDoc(publiable);
      const final = `---\n${Object.entries({ ...d2.meta, publie_le: jourDe(maintenant()) }).map(([k, v]) => `${k}: ${v}`).join("\n")}\n---\n${d2.body}`;
      const pris = new Set(nomsMd(await lister(d)).map(cleFichier));
      const base = nomDepuisTitre(titre);
      let nom = `${base}.md`;
      for (let i = 2; pris.has(cleFichier(nom)); i++) nom = `${base}_${i}.md`;
      await depot.creer(`${d}/${nom}`, final);
      await journal("résumé publié", "résumé", titre, ["toute la table"]);
      return { fichier: nom };
    },
    /** Écrit le statut d'une session de jeu (« jouée », « prête », « idée ») dans sa fiche. */
    async changerStatutSession(fichier, statut) {
      const d = dossierCol("session");
      if (!d || !NOM_SIMPLE.test(String(fichier)) || !["idée", "prête", "jouée"].includes(statut)) refus("Statut ou session invalide", "nom_invalide");
      return surFichier(`${d}/${fichier}`, t => (norm(parseDoc(t).meta.statut || "") === norm(statut) ? null : poserChamp(t, "statut", statut)));
    },
    pseudos
  };
  return api;
}
