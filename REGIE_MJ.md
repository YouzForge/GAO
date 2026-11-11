# La régie du MJ (version 0.24.1)

Ce document décrit les écrans du MJ ajoutés à l'application : ce qu'ils font, où ils écrivent, et ce qui reste à vérifier.
Il ne contient aucun contenu de jeu.

## Les quatre onglets du MJ

| Onglet | À quoi il sert |
|---|---|
| **Parcours** (accueil) | Tous les documents du MJ (sessions de jeu et lieux) rangés en quatre colonnes : *Prochaine session*, *À suivre*, *Lointain*, *Joué*. On glisse une carte pour la ranger ; le bouton à droite de la carte fait la même chose sans glisser (téléphone, clavier). |
| **Séance** | La table de jeu. Le document de la prochaine session au centre, découpé en scènes, avec les blocs colorés (à lire, dialogue, note MJ, secret, combat, alerte). À droite, six outils : *Fiche MJ*, *Secrets*, *Révéler*, *Tuiles*, *Joueurs*, *Notes*. |
| **Révélations** | Qui a reçu quoi. Une ligne par carte (savoir, quête, rencontre, objet), une colonne par joueur. Un clic sur une case donne la carte à ce joueur ; un clic sur une case cochée la retire (après confirmation). |
| **Joueurs** | Le tableau de bord des joueurs (inchangé). |

## Révéler une information

1. **Préparer** (avant la séance) : *Révélations* → *Nouvelle carte*. On écrit le titre, le texte que les joueurs liront, et si besoin la **vérité du MJ**, qui ne sort jamais du coffre. Le champ *Prévu pour* rattache la carte à un document : elle attendra dans l'outil *Révéler* de l'écran *Séance* de ce document.
2. **Révéler** (pendant ou après la séance) : un clic sur *Révéler* (ou sur une case de la matrice). Le fichier est écrit dans le dossier de chaque joueur choisi ; son application ouverte le montre toute seule en moins d'une demi-minute (elle vérifie toutes les 20 secondes), en tête de liste, avec la pastille **Nouveau**.
3. **Improviser** : *Séance* → *Révéler* → *Nouvelle révélation* → *Enregistrer et révéler maintenant*.
4. **Corriger** : ouvrir la carte → *Modifier*, puis *Mettre à jour chez eux*. Ce que le joueur a écrit lui-même (sa note sur une rencontre, « Ce que j'ai fait » d'une quête) est gardé.
5. **Annuler** : le bandeau qui suit une révélation propose *Annuler* ; plus tard, un clic sur la case cochée retire la carte à ce joueur.

Une carte destinée à un seul joueur (quête personnelle, objet clé, part de butin) se prépare en ne cochant que lui dans *Destinataires prévus*.

Ce qui a été publié avant la régie n'a pas de carte au coffre : ces lignes restent visibles et révélables case par case, mais l'application ne propose jamais de les donner « à tous » d'un clic (un savoir personnel partirait chez toute la table). *Modifier* crée leur carte.

## Les jauges

Onglet **Jauges** : toutes les jauges de la campagne, rangées en sections (au départ Joueurs, Univers, Quêtes ; le MJ en crée, les renomme, les ordonne). Deux sortes de jauges, affichées de la même façon :

- **jauge d'objet** : celle d'un objet de l'univers, écrite dans sa fiche (`jauge_actuelle`, `jauge_max`, `porteur`) ; c'est la même que dans l'outil *Joueurs* de l'écran *Séance* ;
- **jauge libre** : créée par le MJ, un fichier par jauge dans `MJ/02_Campagne/Jauges` (`nom`, `actuelle`, `max`, `unite`, `porteur`).

Les **paliers** sont lus dans la fiche, section « 🔴 Paliers de la jauge » : une ligne `**10–29 : Nom**` (ou `10-29 : Nom`, ou `100 : Nom`) par palier, ses effets sur les lignes suivantes. Chaque changement de valeur est daté dans le suivi de la fiche (section « Suivi MJ » d'un objet, « Suivi » d'une jauge libre). Le rangement (sections et ordre) est dans `MJ/02_Campagne/Jauges/Rangement.md`.

**Déclenchements.** Quand une valeur entre dans un nouveau palier, l'écran ouvre « Palier atteint » avec ses effets. Les effets ne sont pas encore appliqués aux fiches des joueurs. Le principe est posé dans `src/mj/jauges.js` : une ligne d'effet `⚙ Cible | Ce qui change | +10` dans un palier est lue par `effetsDe` ; il reste à écrire l'application de ces effets à la fiche du joueur (et leur retrait quand la jauge redescend).

## Importer un document Word

*Parcours* → **Importer un document Word**. Le fichier `.docx` est converti **dans le navigateur** (il n'est envoyé nulle part), puis rangé dans le coffre : `MJ/02_Campagne/Sessions/NN_Titre.md` pour une session, `MJ/01_Univers/Lieux/Titre.md` pour un lieu, et placé dans la colonne choisie du parcours.

Règles de conversion (`src/import/docx.js`, reprises du convertisseur du premier import) : un bloc est reconnu à son libellé (📖 🗣 🎲 🔒 🔴 ⚔ 📦 🆕 ✅ ✉) puis, à défaut, à la couleur de sa bordure gauche ; tout bloc rouge est un secret ; un titre de style « Titre 1 » (ou une ligne en gras soulignée d'un filet coloré) ouvre une scène, « Titre 2 » un sous-titre ; tableaux, listes, gras et italique sont gardés. La fenêtre d'import montre ce qui a été reconnu et un contrôle de fidélité (mots du Word contre mots de la conversion). Les images ne sont pas reprises.

## Le guide du MJ

Onglet **Guide**, tout à droite : le mode d'emploi en fiches pratiques, avec une recherche. Son contenu (`app/joueur/guide_contenu.js`) est généré depuis la même source que le guide Word ; il ne se modifie pas à la main.

## Le journal des joueurs (comptes rendus de session)

*Révélations* → pastille *Journal*. Chaque compte rendu de session y figure avec un interrupteur :

- **Visible** : le fichier est dans la table (`Table/Resumes_de_session`) ; tous les joueurs le lisent dans leur application (onglet *Savoirs*, puis *Journal*).
- **Masqué** : le fichier est retiré de la table ; son texte reste au coffre (`MJ/04_Revelations/Resumes`), d'où il peut être remontré, corrigé ou supprimé.

*Nouveau compte rendu* en écrit un (gardé masqué, ou montré tout de suite). *Corriger* modifie le texte ; si le compte rendu est visible, les joueurs voient la correction. Les *Notes du MJ* d'un compte rendu ne quittent jamais le coffre.
Il n'y a pas de visibilité par joueur : la table est commune, un compte rendu est visible pour tous ou pour personne.
## Où tout est écrit (OneDrive du MJ)

| Quoi | Où |
|---|---|
| Cartes à révéler | `MJ/04_Revelations/Savoirs`, `Quetes`, `Rencontres`, `Objets` (un fichier Markdown par carte) |
| Journal des révélations | `MJ/04_Revelations/Journal_des_revelations.md` |
| Rangement du parcours | `MJ/02_Campagne/Parcours.md` |
| Jauges des objets | champs `jauge_actuelle`, `jauge_max`, `porteur` de la fiche de l'objet, dans `MJ/01_Univers/Objets` |
| Jauges libres et leur rangement | `MJ/02_Campagne/Jauges` (un fichier par jauge, et `Rangement.md`) |
| Notes de séance | `MJ/05_Fin_de_seance/A_traiter/AAAA-MM-JJ_Notes_de_seance.md` |
| Ce qu'un joueur reçoit | `Joueurs/<Pseudo>/Savoirs`, `Quetes`, `Rencontres`, `Inventaire` |
| Compte rendu visible (journal des joueurs) | `Table/Resumes_de_session` |
| Compte rendu masqué, et notes du MJ de chaque compte rendu | `MJ/04_Revelations/Resumes` |

## Garde-fous

- La protection des secrets reste celle de OneDrive : un joueur ne lit que son dossier et la table. Le coffre `MJ/` n'est jamais partagé.
- Un texte du coffre n'arrive chez un joueur que par un seul chemin (`src/mj/revelations.js`), qui retire les champs du coffre (`pour`, `prevu`, `publie_sous`, jauges…) et les sections marquées (🔴, « Vérité MJ », « Notes MJ »…), puis refuse de publier si une marque de secret subsiste dans le texte.
- Jamais d'écrasement : une révélation ne remplace pas un fichier existant ; une modification relit le fichier juste avant d'écrire et s'arrête s'il a changé ailleurs.
- Rien ne s'écrit tant que `ecriture` vaut `false` dans `app/config.js` : les écrans s'ouvrent alors en lecture seule.

## Mettre en service

1. Passer `"ecriture": true` dans `app/config.js` (ce réglage ouvre aussi les écritures du joueur dans son propre dossier : étiquettes, notes, points de vie).
2. Publier le dépôt (GitHub Pages).
3. Ouvrir l'application avec le compte du MJ, ranger le parcours, créer une première carte et la révéler à un joueur d'essai.

## Essayer sans OneDrive (banc d'essai local)

```
node outils/serveur_local.mjs "<copie d'un dossier de JDR>" 8765
```

Puis ouvrir `http://localhost:8765/app/` (MJ) ou `http://localhost:8765/app/?comme=<Pseudo>` (joueur). Le serveur imite OneDrive au-dessus d'un dossier du disque : toujours une **copie**, jamais le vrai dossier.

Tests : `node --test tests/`.

## Ce qui n'est pas encore vérifié

- **Rien n'a été essayé sur le vrai OneDrive.** Tout a été vérifié sur le banc d'essai local (faux OneDrive) avec une copie des vraies données. À vérifier au premier usage réel : la création automatique des dossiers `MJ/04_Revelations/...` lors de la première carte, et le délai d'apparition chez un joueur.
- Les noms des tuiles viennent des noms de fichiers : ils n'ont ni accents ni apostrophes.
- La pastille « Nouveau » existe pour les savoirs, les quêtes et les rencontres ; pas encore pour les objets du sac.
- Les « paliers » d'une information (rumeur, puis vérité) passent par *Modifier* puis *Mettre à jour chez eux* : il n'y a pas d'historique des versions d'une carte.
