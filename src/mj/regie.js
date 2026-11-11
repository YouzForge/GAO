// La régie du MJ : tout ce que le MJ lit ET écrit depuis ses écrans (révélations, parcours, séance, jauges, notes de séance, résumés publics).
// Passe par le dépôt du moteur : mêmes garde-fous que le reste (interrupteur d'écriture, périmètre, version lue avant d'écrire, jamais « le dernier gagne »).
// Aucun navigateur ici : tout se teste dans Node avec un faux OneDrive.
//
// RÈGLE DE SÉCURITÉ : le seul chemin par lequel un texte du coffre arrive dans le dossier d'un joueur est `texteJoueur` / `copiePourAutreJoueur` / `fusionner`
// (src/mj/revelations.js), qui retirent les sections et les champs du coffre et refusent de publier si une marque de secret subsiste.
import { parseDoc, humanize, norm } from "../md/doc.js?v=0.26.0";
import { FicheExiste, ConflitEcriture } from "../graph/client.js?v=0.26.0";
import { AccesRefuse } from "../depot/depot.js?v=0.26.0";
import { EcritureInvalide } from "../ecriture/fiche.js?v=0.26.0";
import { pool } from "../graph/pool.js?v=0.26.0";
import { TYPES, typeDe, DOSSIER_REVELATIONS, lireCarte, texteJoueur, copiePourAutreJoueur, fusionner, texteCarte, modifierCarte, poserChamp, nomPublie, nomDepuisTitre,
  construireCatalogue, plusGrandNumero, cleFichier, ligneJournal, ajouterAuJournal, DOSSIER_RESUMES, texteResume, lireResume, construireJournal,
  TYPE_DE_GENRE, carteDepuisFiche, ligneDeFiche } from "./revelations.js?v=0.26.0";
import { texteDocumentImporte } from "../import/docx.js?v=0.26.0";
import { texteFiche } from "../import/fiches.js?v=0.26.0";
import { lireParcours, ecrireParcours } from "./parcours.js?v=0.26.0";
import { lireLieuMJ, lireSessionMJ, trierParNumero, trierSessions } from "./accueil.js?v=0.26.0";
import { DOSSIER_JAUGES, FICHIER_RANGEMENT, lireJauge, texteJauge, modifierJauge, changerValeur, palierDe, franchissement, lireRangement, ecrireRangement, rangerJauges, rangementDepuis } from "./jauges.js?v=0.26.0";

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
  const dossierJauges = `${(dossierCol("session") || `${coffre}/02_Campagne/Sessions`).split("/").slice(0, -1).join("/")}/${DOSSIER_JAUGES}`;
  const dossierResumes = `${racineCartes}/${DOSSIER_RESUMES}`;
  const dossierTable = () => { const c = (profil.collections || []).find(x => x.id === "resume"); if (!c) throw new AccesRefuse("Ce JDR n'a pas de résumés de session", "zone_absente"); return c.dossier; };
  /** Version d'un compte rendu pour la table : sans notes du MJ, visible, datée ; refusée si une marque de secret subsiste. */
  const versionTable = texte => { const p = texteJoueur(texte); if (p == null) throw new EcritureInvalide("Ce compte rendu contient encore une marque de secret (🔴, 🔒, 🎲, ⚔️, 🆕) : il n'est pas montré. Corrige-le.", "marque_secrete"); return poserChamp(p, "publie_le", jourDe(maintenant())); };
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
    // ------------------------------------------------------------ Jauges (onglet « Jauges » et outil « Joueurs » de la séance)
    /** Toutes les jauges, rangées en sections : celles des objets de l'univers et les jauges libres du MJ. → [{ titre, jauges:[lireJauge…] }] */
    async toutesLesJauges() {
      const dO = dossierCol("objet");
      const lireDossier = async (d, genre) => (d ? (await pool(nomsMd(await lister(d)).filter(n => n !== FICHIER_RANGEMENT), async n => { const t = await lire(`${d}/${n}`); return t == null ? null : lireJauge(t, n, genre); }, 6)).filter(Boolean) : []);
      const [objets, libres, rangement] = await Promise.all([lireDossier(dO, "objet"), lireDossier(dossierJauges, "jauge"),
        lire(`${dossierJauges}/${FICHIER_RANGEMENT}`).catch(e => { if (estAuth(e)) throw e; return null; })]);
      return rangerJauges(lireRangement(rangement), [...objets, ...libres]);
    },
    /** Les jauges des objets seulement (outil « Joueurs » de la séance). → [lireJauge…] */
    async jauges() {
      const d = dossierCol("objet");
      if (!d) return [];
      return (await pool(nomsMd(await lister(d)), async n => { const t = await lire(`${d}/${n}`); return t == null ? null : lireJauge(t, n, "objet"); }, 4)).filter(Boolean);
    },
    /**
     * Change la valeur d'une jauge (bornée entre 0 et son maximum) et l'inscrit à son suivi. `j` : { genre, fichier }.
     * → { actuelle, max, palier, franchi } ; `franchi` : null, ou { palier, ancien, sens } quand la valeur change de palier (l'écran l'annonce au MJ).
     */
    async changerValeurJauge(j, valeur, note = "") {
      const d = j.genre === "objet" ? dossierCol("objet") : j.genre === "jauge" ? dossierJauges : null;
      if (!d || !NOM_SIMPLE.test(String(j.fichier)) || j.fichier === FICHIER_RANGEMENT) refus("Jauge inconnue", "nom_invalide");
      let res = null;
      await surFichier(`${d}/${j.fichier}`, t => {
        const avant = lireJauge(t, j.fichier, j.genre);
        if (!avant) throw new EcritureInvalide("Cette fiche n'a pas de jauge", "sans_jauge");
        let c;
        try { c = changerValeur(t, j.genre, valeur, { date: instantDe(maintenant()), note }); } catch (e) { throw new EcritureInvalide(e.message, "jauge_invalide"); }
        res = { actuelle: c.apres, max: c.max, palier: palierDe(avant.paliers, c.apres), franchi: franchissement(avant.paliers, c.avant, c.apres),
          suivi: c.texte == null ? avant.suivi : lireJauge(c.texte, j.fichier, j.genre).suivi };
        return c.texte;
      });
      return res;
    },
    /** Ancienne forme (jauge d'un objet par son fichier), gardée pour l'écran « Séance ». */
    async changerJauge(fichier, valeur) { return api.changerValeurJauge({ genre: "objet", fichier }, valeur); },
    /** Crée une jauge libre et la range à la fin de la section d'indice `section`. → la jauge lue */
    async creerJauge(champs, rangees, section = 0) {
      if (!String(champs.nom || "").trim()) throw new EcritureInvalide("Donne un nom à la jauge", "titre_vide");
      const texte = texteJauge(champs);
      for (let essai = 0; ; essai++) {
        const pris = new Set(nomsMd(await lister(dossierJauges)).map(cleFichier));
        const base = nomDepuisTitre(champs.nom);
        let nom = `${base}.md`;
        for (let i = 2; pris.has(cleFichier(nom)) || nom === FICHIER_RANGEMENT; i++) nom = `${base}_${i}.md`;
        try {
          await depot.creer(`${dossierJauges}/${nom}`, texte);
          const j = lireJauge(texte, nom, "jauge");
          const r = rangees.map((s, i) => (i === section ? { ...s, jauges: [...s.jauges, j] } : s));
          await api.enregistrerRangementJauges(r);
          return j;
        } catch (e) { if (essai === 0 && e instanceof FicheExiste) continue; throw e; }
      }
    },
    /** Modifie les réglages d'une jauge libre (nom, maximum, unité, porteur, description, paliers). Les jauges d'objet se règlent dans la fiche de l'objet. */
    async modifierJauge(j, champs) {
      if (j.genre !== "jauge" || !NOM_SIMPLE.test(String(j.fichier))) refus("Cette jauge se règle dans la fiche de son objet", "zone_refusee");
      let neuf = null;
      await surFichier(`${dossierJauges}/${j.fichier}`, t => (neuf = modifierJauge(t, champs)));
      return lireJauge(neuf, j.fichier, "jauge");
    },
    /** Supprime une jauge libre (corbeille OneDrive). L'écran demande confirmation AVANT. */
    async supprimerJauge(j) {
      if (j.genre !== "jauge" || !NOM_SIMPLE.test(String(j.fichier)) || j.fichier === FICHIER_RANGEMENT) refus("Cette jauge ne se supprime pas ici", "zone_refusee");
      const f = await depot.lireFiche(`${dossierJauges}/${j.fichier}`);
      if (f) await depot.supprimer(`${dossierJauges}/${j.fichier}`, f.etag);
    },
    async enregistrerRangementJauges(rangees) { return surFichier(`${dossierJauges}/${FICHIER_RANGEMENT}`, () => ecrireRangement(rangementDepuis(rangees)), { creerSiAbsent: true }); },

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
    // ------------------------------------------------------------ Journal des joueurs : comptes rendus de session
    // Visible = le fichier est dans la table (lu par TOUS les joueurs, dans leur journal). Masqué = il n'est qu'au coffre (`04_Revelations/Resumes`).
    /** Les comptes rendus, visibles ou masqués. → [{ cle, fichier, fichierTable?, titre, session, visible, auCoffre }] */
    async comptesRendus() {
      const dT = dossierTable();
      const lireTous = async d => (await pool(nomsMd(await lister(d)), async n => { const t = await lire(`${d}/${n}`); return t == null ? null : lireResume(t, n); }, 6)).filter(Boolean);
      const [table, auCoffre] = await Promise.all([lireTous(dT), lireTous(dossierResumes)]);
      return construireJournal(table, auCoffre);
    },
    /** Un compte rendu ouvert : la version du coffre si elle existe (elle porte les notes du MJ), sinon celle de la table. → { titre, session, texte, notes } ou null */
    async compteRendu(l) {
      if (!NOM_SIMPLE.test(String(l.fichier))) refus("Nom de fichier invalide", "nom_invalide");
      const t = l.auCoffre ? await lire(`${dossierResumes}/${l.fichier}`) : await lire(`${dossierTable()}/${l.fichierTable || l.fichier}`);
      return t == null ? null : lireResume(t, l.fichier);
    },
    /** Masque un compte rendu : son texte est d'abord mis au coffre (s'il n'y est pas), puis le fichier est retiré de la table (corbeille OneDrive). */
    async masquerCompteRendu(l) {
      const chemin = `${dossierTable()}/${l.fichierTable || l.fichier}`;
      const f = await depot.lireFiche(chemin);
      if (!f) return false;
      if (!l.auCoffre) {
        const r = lireResume(f.texte, l.fichier);
        try { await depot.creer(`${dossierResumes}/${l.fichier}`, texteResume(r)); } catch (e) { if (!(e instanceof FicheExiste)) throw e; }
      }
      await depot.supprimer(chemin, f.etag);
      await journal("compte rendu masqué", "journal", l.titre, ["toute la table"]);
      return true;
    },
    /** Montre un compte rendu du coffre à toute la table (sans ses notes du MJ). Jamais d'écrasement. */
    async montrerCompteRendu(l) {
      if (!NOM_SIMPLE.test(String(l.fichier))) refus("Nom de fichier invalide", "nom_invalide");
      const t = await lire(`${dossierResumes}/${l.fichier}`);
      if (t == null) throw new ConflitEcriture(l.fichier, "disparue");
      const pub = versionTable(t);
      try { await depot.creer(`${dossierTable()}/${l.fichier}`, pub); } catch (e) { if (!(e instanceof FicheExiste)) throw e; return false; }
      await journal("compte rendu montré", "journal", l.titre, ["toute la table"]);
      return true;
    },
    /**
     * Crée (`l` absent) ou corrige un compte rendu. Le texte du coffre est écrit d'abord ; s'il est visible, la table est mise à jour ensuite.
     * Un texte qui garde une marque de secret est refusé AVANT toute écriture. → { fichier, titre, session, visible, auCoffre:true }
     */
    async enregistrerCompteRendu(l, { titre, session = "", texte = "", notes = "" }) {
      if (!String(titre || "").trim() || !String(texte || "").trim()) throw new EcritureInvalide("Il faut un titre et un texte", "titre_vide");
      const neuf = texteResume({ titre, session, texte, notes });
      const pub = versionTable(neuf);
      if (!l) {
        const pris = new Set([...nomsMd(await lister(dossierResumes)), ...nomsMd(await lister(dossierTable()))].map(cleFichier));
        const base = nomDepuisTitre(titre);
        let nom = `${base}.md`;
        for (let i = 2; pris.has(cleFichier(nom)); i++) nom = `${base}_${i}.md`;
        await depot.creer(`${dossierResumes}/${nom}`, neuf);
        return { cle: cleFichier(nom), fichier: nom, titre: String(titre).trim(), session: String(session).trim(), visible: false, auCoffre: true };
      }
      if (!NOM_SIMPLE.test(String(l.fichier))) refus("Nom de fichier invalide", "nom_invalide");
      await surFichier(`${dossierResumes}/${l.fichier}`, () => neuf, { creerSiAbsent: true });
      if (l.visible) await surFichier(`${dossierTable()}/${l.fichierTable || l.fichier}`, () => pub);
      await journal(l.visible ? "compte rendu corrigé (visible)" : "compte rendu corrigé", "journal", titre, l.visible ? ["toute la table"] : []);
      return { ...l, titre: String(titre).trim(), session: String(session).trim(), auCoffre: true };
    },
    /** Supprime un compte rendu MASQUÉ (corbeille OneDrive). Un compte rendu visible doit d'abord être masqué. */
    async supprimerCompteRendu(l) {
      if (l.visible) throw new EcritureInvalide("Ce compte rendu est visible par les joueurs : masque-le d'abord", "carte_publiee");
      const chemin = `${dossierResumes}/${l.fichier}`;
      const f = await depot.lireFiche(chemin);
      if (f) await depot.supprimer(chemin, f.etag);
    },
    /** Écrit un compte rendu et le montre tout de suite à la table (bouton de l'écran « Séance »). → { fichier } */
    async publierResume({ titre, session = "", texte }) {
      const l = await api.enregistrerCompteRendu(null, { titre, session, texte });
      await api.montrerCompteRendu(l);
      return { fichier: l.fichier };
    },
    /** Noms de fichiers des fiches du coffre, par genre : pour dire ce qui existe déjà quand un document propose des fiches. → { pnj:[…], lieu:[…], … } */
    async fichesExistantes() {
      const out = {};
      await pool(GENRES_TUILES.filter(dossierCol), async id => { try { out[id] = nomsMd(await lister(dossierCol(id))); } catch (e) { if (estAuth(e)) throw e; out[id] = []; } }, 4);
      return out;
    },
    /**
     * Crée dans le coffre les fiches repérées dans un document et cochées par le MJ. Jamais d'écrasement : une fiche dont le nom est pris est sautée.
     * `liste` : candidats de `detecterFiches` (nom et genre éventuellement corrigés). → { creees:[{genre, fichier, nom}], deja:[noms] }
     */
    async creerFiches(liste, { source = "", lieu = "" } = {}) {
      const creees = [], deja = [];
      const date = jourDe(maintenant());
      for (const c of liste || []) {
        const d = dossierCol(c.genre);
        if (!d || !GENRES_TUILES.includes(c.genre) || !String(c.nom || "").trim()) continue;
        const nom = `${nomDepuisTitre(c.nom)}.md`;
        try { await depot.creer(`${d}/${nom}`, texteFiche(c, { source, lieu, date })); creees.push({ genre: c.genre, fichier: nom, nom: c.nom }); }
        catch (e) { if (e instanceof FicheExiste) deja.push(c.nom); else throw e; }
      }
      return { creees, deja };
    },
    /**
     * Prépare les cartes à révéler de fiches du coffre (PNJ → rencontre, quête → quête, objet → carte d'objet), NON révélées.
     * Même règle que le bouton « Créer la carte » : texte des joueurs vide, tout le texte de la fiche dans la vérité du MJ.
     * Une fiche qui a déjà sa carte (ou un élément publié du même nom) est sautée : jamais de doublon.
     * `fiches` : [{ genre, fichier }] ; `prevu` : le document où les révéler. → { creees:[cartes], deja:[titres] }
     */
    async creerCartesDepuisFiches(fiches, { prevu = "" } = {}) {
      const creees = [], deja = [], cats = {};
      for (const f of fiches || []) {
        const type = TYPE_DE_GENRE[f.genre];
        if (!type) continue;
        if (!cats[type]) cats[type] = await api.catalogue(type);
        const texte = await api.fiche(f.genre, f.fichier);
        const champs = carteDepuisFiche(f.genre, texte, f.fichier, { prevu });
        if (!champs) continue;
        if (ligneDeFiche(cats[type].lignes, f.genre, f.fichier, champs.titre)) { deja.push(champs.titre); continue; }
        const c = await api.creerCarte(champs);
        cats[type].lignes.push({ type, titre: c.titre, fichier: "", carte: c, chez: {} });   // deux fiches du même lot ne donnent pas deux cartes
        creees.push(c);
      }
      return { creees, deja };
    },

    /**
     * Range dans le coffre un document converti depuis Word (session ou lieu). Jamais d'écrasement : un nom pris reçoit un suffixe.
     * Une session reçoit le numéro d'ordre suivant (« 19_Titre.md ») ; un lieu porte son nom. → { genre, fichier }
     */
    async importerDocument({ genre, titre, saison = "", lieu = "", type = "", region = "", markdown, source = "" }) {
      const d = dossierCol(genre);
      if (!d || !["session", "lieu"].includes(genre)) refus("Ce type de document ne s'importe pas", "zone_refusee");
      if (!String(titre || "").trim()) throw new EcritureInvalide("Donne un titre au document", "titre_vide");
      if (!String(markdown || "").trim()) throw new EcritureInvalide("Le document est vide", "revelation_vide");
      const texte = texteDocumentImporte({ genre, titre, saison, lieu, type, region, markdown, source, date: jourDe(maintenant()) });
      for (let essai = 0; ; essai++) {
        const existants = nomsMd(await lister(d));
        const pris = new Set(existants.map(cleFichier));
        const base = (genre === "session" ? `${String(plusGrandNumero(existants) + 1).padStart(2, "0")}_` : "") + nomDepuisTitre(titre);
        let nom = `${base}.md`;
        for (let i = 2; pris.has(cleFichier(nom)); i++) nom = `${base}_${i}.md`;
        try { await depot.creer(`${d}/${nom}`, texte); return { genre, fichier: nom }; }
        catch (e) { if (essai === 0 && e instanceof FicheExiste) continue; throw e; }
      }
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
