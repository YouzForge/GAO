// Contenu du guide du MJ (onglet « Guide »). FICHIER GÉNÉRÉ : ne pas le modifier à la main.
// Source : le générateur du guide Word (guide_mj_generer.js), converti par guide_mj_donnees.js. Aucun contenu de jeu.
export const VERSION_GUIDE = "0.23.0";
export const GUIDE = [
 {
  "num": "",
  "titre": "Avant de commencer",
  "blocs": [
   {
    "t": "p",
    "x": "Ce guide répond à une seule question, posée de trente façons : **« je veux faire telle chose, où est-ce que je clique ? »**. Chaque fiche part d'une situation réelle, donne les étapes dans l'ordre, et dit ce que les joueurs verront."
   },
   {
    "t": "p",
    "x": "Il dit aussi, sans détour, ce que l'outil ne sait pas encore faire : ces points sont signalés par un encadré jaune et rassemblés dans la partie VIII, avec la modification à prévoir."
   },
   {
    "t": "boite",
    "genre": "attention",
    "lignes": [
     "Ce guide décrit l'application telle qu'elle a été vérifiée sur un banc d'essai (une copie de tes données sur ton PC).",
     "Au moment où il est écrit, rien n'a encore été essayé avec ton vrai compte Microsoft ni sur le téléphone d'un joueur.",
     "Si une étape ne se passe pas comme décrit lors de ton premier essai réel, note-la : c'est une correction à faire dans l'outil, pas une erreur de ta part."
    ]
   }
  ]
 },
 {
  "num": "I",
  "titre": "L'essentiel en une page",
  "blocs": [
   {
    "t": "h2",
    "x": "Ouvrir l'application"
   },
   {
    "t": "p",
    "x": "Adresse : **https://youzforge.github.io/GAO/app/** — sur ton PC pour mener la partie, sur ton téléphone en secours. Tu te connectes avec ton compte Microsoft (celui du OneDrive où se trouve le dossier du jeu). L'application te reconnaît comme MJ et ouvre l'écran du MJ."
   },
   {
    "t": "h2",
    "x": "Les quatre onglets du MJ"
   },
   {
    "t": "table",
    "entetes": [
     "Onglet",
     "Ce que tu y fais"
    ],
    "lignes": [
     [
      "Parcours",
      "L'accueil. Tous tes documents (sessions et lieux) en quatre colonnes : Prochaine session, À suivre, Lointain, Joué. Tu glisses les cartes pour suivre le chemin des personnages."
     ],
     [
      "Séance",
      "La table de jeu. Le document de la prochaine session au centre, les scènes à gauche, et à droite six outils : Fiche MJ, Secrets, Révéler, Tuiles, Joueurs, Notes."
     ],
     [
      "Révélations",
      "Ce que chaque joueur a reçu. Cinq pastilles : Savoirs, Quêtes, Rencontres, Objets, Journal. C'est ici que tu donnes, corriges et retires."
     ],
     [
      "Joueurs",
      "Le tableau de bord : points de vie, valeurs, bourse, et pour chacun « Notes MJ » et « Voir comme lui »."
     ]
    ]
   },
   {
    "t": "p",
    "x": "Tout à droite de la barre, l'onglet **Guide** : ce document, dans l'application, avec une recherche « que veux-tu faire ? »."
   },
   {
    "t": "p",
    "x": "En haut à droite, le bouton rond **⋯ (Menu)** donne : Actualiser, Tous les lieux, **Listes du coffre** (toutes tes fiches, avec création et modification), Se déconnecter."
   },
   {
    "t": "h2",
    "x": "Les trois règles d'or"
   },
   {
    "t": "etapes",
    "items": [
     "**Tout part du coffre.** Tu écris dans ton coffre (dossier `MJ`), jamais directement chez un joueur. C'est l'application qui dépose chez les joueurs, quand tu cliques sur « Révéler ».",
     "**Une information = une carte.** Chaque savoir, quête, rencontre ou objet est une carte. Elle a un texte pour les joueurs et, si tu veux, une « Vérité du MJ » qui ne quitte jamais le coffre. Pour faire évoluer une information, tu modifies sa carte : tu n'en crées pas une deuxième.",
     "**Rien n'arrive chez un joueur sans ton clic.** Ni Claude ni aucune tâche automatique ne publie à ta place. Et tout se défait : une révélation s'annule, un compte rendu se masque."
    ]
   },
   {
    "t": "h2",
    "x": "Où vivent les fichiers"
   },
   {
    "t": "p",
    "x": "Tout est dans ton OneDrive, dossier **Documents / JDR / GAO - Application**. L'application ne lit que ce dossier-là."
   },
   {
    "t": "table",
    "entetes": [
     "Dossier",
     "Contenu"
    ],
    "lignes": [
     [
      "MJ",
      "Ton coffre. Jamais partagé. Univers, campagne, cartes à révéler, notes."
     ],
     [
      "MJ / 02_Campagne / Sessions",
      "Tes documents de session. Tout fichier déposé ici apparaît dans le Parcours."
     ],
     [
      "MJ / 01_Univers",
      "Lieux, PNJ, Factions, Divinités, Bestiaire, Objets, Lore."
     ],
     [
      "MJ / 04_Revelations",
      "Les cartes à révéler (Savoirs, Quetes, Rencontres, Objets) et les comptes rendus masqués (Resumes)."
     ],
     [
      "Table",
      "Ce que toute la table lit : comptes rendus visibles, cartes du monde."
     ],
     [
      "Joueurs / <Pseudo>",
      "Le dossier d'un joueur : sa fiche, son sac, ses savoirs, quêtes, rencontres, notes."
     ]
    ]
   },
   {
    "t": "boite",
    "genre": "attention",
    "lignes": [
     "Le dossier « Claude CODE / GAO - Application » de ton PC est une copie de travail : l'application ne le lit pas.",
     "Quand tu demandes un travail à Claude (Cowork), vérifie qu'il écrit bien dans « Documents / JDR / GAO - Application »."
    ]
   }
  ]
 },
 {
  "num": "II",
  "titre": "Avant la séance : préparer",
  "blocs": [
   {
    "t": "fiche",
    "n": 1,
    "q": "Je veux créer une nouvelle session pour ce soir, que dois-je faire ?"
   },
   {
    "t": "p",
    "x": "Cas d'urgence : tu n'as pas le temps de passer par Word. Tu écris la session directement dans l'application."
   },
   {
    "t": "ou",
    "x": "Menu ⋯ → **Listes du coffre** → **Sessions** → **+ Nouvelle fiche**"
   },
   {
    "t": "etapes",
    "items": [
     "Remplis **Titre**, **Saison**, **Lieu joué**. Laisse **Visibilité** sur « Secret MJ ».",
     "Dans **Déroulé des scènes**, écris tes scènes. Commence chaque scène par une ligne `### I — Titre de la scène`.",
     "Dans une scène, annonce chaque bloc par sa marque en début de ligne : `📖` texte à lire, `🗣` dialogue, `🎲` note pour toi, `🔴` secret, `⚔️` combat, `🆕` alerte ou quête. Le bloc court jusqu'à la marque suivante.",
     "Remplis si tu veux **Moments pivots** et **Fins possibles** : ils alimenteront la Fiche MJ.",
     "Clique **Enregistrer**. Reviens en arrière jusqu'au menu des listes (« ← Sessions », puis « ← Retour ») et clique **Retour à l'application joueur**.",
     "Onglet **Parcours** : ta session est apparue (colonne « À suivre » ou « Lointain »). Glisse-la dans **Prochaine session**.",
     "Onglet **Séance** : elle s'ouvre, découpée en scènes."
    ]
   },
   {
    "t": "boite",
    "genre": "resultat",
    "lignes": [
     "La session est jouable tout de suite. Aucun joueur ne voit quoi que ce soit : un document de session ne sort jamais du coffre."
    ]
   },
   {
    "t": "boite",
    "genre": "astuce",
    "lignes": [
     "Exemple de contenu pour « Déroulé des scènes » :",
     " ",
     "### I — Arrivée au port",
     "📖 À lire",
     "La brume couvre les quais.",
     "🎲 Note MJ",
     "Jet de Perception pour repérer le guetteur.",
     "🔴 Secret MJ",
     "Le capitaine ment."
    ]
   },
   {
    "t": "boite",
    "genre": "attention",
    "lignes": [
     "Dans ce formulaire, n'écris pas de ligne commençant par « # » ou « ## » : ce sont les séparateurs des grandes sections. Utilise « ### » pour tes scènes et « #### » pour un sous-titre.",
     "Le formulaire a été essayé avec une petite session. Il ne l'a pas été pour modifier un très gros document (plus de 50 pages) : dans ce cas, modifie plutôt le fichier d'origine."
    ]
   },
   {
    "t": "fiche",
    "n": 2,
    "q": "J'ai préparé ma session dans Word (atelier) ou avec Cowork : comment la mettre dans l'application ?"
   },
   {
    "t": "p",
    "x": "C'est le circuit normal pour une session préparée avec soin. Depuis la version 0.23, l'application importe elle-même ton fichier Word : tu n'as plus besoin de Claude pour la conversion."
   },
   {
    "t": "ou",
    "x": "Onglet **Parcours** → bouton **Importer un document Word** (à droite du titre « Parcours de la campagne »)"
   },
   {
    "t": "etapes",
    "items": [
     "Termine ton document Word comme d'habitude (tes compétences gao-doc, cleaner-gao…) et enregistre-le en **.docx**.",
     "Onglet **Parcours** → **Importer un document Word** → choisis le fichier.",
     "La fenêtre montre **ce qui a été reconnu** : nombre de mots, scènes, tableaux, blocs (à lire, dialogues, notes MJ, secrets…), la liste des scènes, et un contrôle de fidélité qui vérifie que tous les mots du Word sont dans la conversion.",
     "Vérifie le **Titre**, laisse « Document de session », remplis si tu veux **Lieu joué** et **Saison**.",
     "Choisis **Ranger dans** : Prochaine session, À suivre ou Lointain.",
     "Clique **Importer dans le coffre**. Tu arrives directement dans l'écran **Séance** du document : vérifie les scènes, les couleurs et la Fiche MJ."
    ]
   },
   {
    "t": "boite",
    "genre": "resultat",
    "lignes": [
     "Le document est dans ton coffre (`MJ / 02_Campagne / Sessions`, numéroté à la suite) et dans ton Parcours. Ton fichier Word n'est ni modifié ni envoyé ailleurs : la conversion se fait dans ton navigateur."
    ]
   },
   {
    "t": "boite",
    "genre": "astuce",
    "lignes": [
     "Tes documents Word utilisent déjà les bons blocs (📖 🗣 🎲 🔒 🆕) : l'import les reconnaît à leur libellé, ou à la couleur de leur bordure.",
     "Une scène = un titre de style « Titre 1 » dans Word (ou, à défaut, une ligne en gras soulignée d'un filet coloré). Un sous-titre = « Titre 2 ».",
     "Pour que la Fiche MJ se remplisse, garde des titres contenant : Synopsis, Compétences clés, Moments pivots, Fins possibles, Tableau de bord.",
     "L'import a été essayé sur les 45 documents de ton atelier : aucun mot perdu."
    ]
   },
   {
    "t": "boite",
    "genre": "attention",
    "lignes": [
     "Les **images** du document Word ne sont pas reprises (la fenêtre d'import te le signale).",
     "Réimporter un document corrigé crée un **second** fichier : supprime l'ancien (Menu ⋯ → Listes du coffre → Sessions → la fiche → Supprimer), ou corrige directement la fiche dans l'application."
    ]
   },
   {
    "t": "h3",
    "x": "Et pour aller plus loin : les fiches et les cartes"
   },
   {
    "t": "p",
    "x": "L'import range le document. Il ne crée ni les fiches des PNJ (pour les tuiles) ni les cartes à révéler : tu peux les faire à la main (fiches 4 et 6) ou les demander à Claude."
   },
   {
    "t": "boite",
    "genre": "cowork",
    "lignes": [
     "Le document de session « … » est importé dans le coffre. Crée les fiches des PNJ, lieux et quêtes nouveaux qu'il cite, et propose-moi les cartes à révéler dans MJ/04_Revelations avec « prevu » sur ce document (R23, R24). Rien chez les joueurs."
    ]
   },
   {
    "t": "fiche",
    "n": 3,
    "q": "J'ai rédigé un nouveau lieu, avec la ville, les PNJ et les quêtes dans le même fichier : que dois-je faire ?"
   },
   {
    "t": "p",
    "x": "Deux niveaux, selon le temps que tu as. Le premier suffit pour jouer ; le second rend l'écran Séance vraiment confortable."
   },
   {
    "t": "h3",
    "x": "Niveau 1 : le lieu seul (rapide)"
   },
   {
    "t": "etapes",
    "items": [
     "Onglet **Parcours** → **Importer un document Word** → choisis ton fichier (voir fiche 2).",
     "Dans la fenêtre, choisis **Document de lieu**, vérifie le titre (c'est le nom du lieu), le type (ville, donjon…) et la région. **Importer dans le coffre**.",
     "Le lieu apparaît dans le **Parcours** avec l'icône d'épingle, dans la colonne choisie.",
     "Clique-le : tu le lis en entier. S'il est dans « Prochaine session », il s'ouvre dans l'écran **Séance** avec ses blocs colorés."
    ]
   },
   {
    "t": "boite",
    "genre": "resultat",
    "lignes": [
     "Tu peux jouer le lieu. Mais ses PNJ et ses quêtes ne sont que du texte dans le document : ils n'ont pas de tuile, pas de fiche à part."
    ]
   },
   {
    "t": "h3",
    "x": "Niveau 2 : le lieu découpé (recommandé)"
   },
   {
    "t": "etapes",
    "items": [
     "Demande à Claude de **découper** le fichier : le lieu dans `Lieux`, **une fiche par PNJ** dans `MJ / 01_Univers / PNJ`, **une fiche par quête** dans `MJ / 02_Campagne / Quetes`, une fiche par faction s'il y en a.",
     "Demande-lui en même temps les **cartes à révéler** de ce lieu (rencontres, quêtes, savoirs), avec « prevu » sur le document du lieu.",
     "Dans l'application : le lieu est dans le Parcours ; dans l'écran Séance, l'outil **Tuiles** montre tous les PNJ et quêtes cités, et l'outil **Révéler** montre les cartes qui attendent."
    ]
   },
   {
    "t": "boite",
    "genre": "cowork",
    "lignes": [
     "Voici le document complet du lieu « … ». Découpe-le pour l'application selon R24 : la fiche du lieu, une fiche par PNJ, une fiche par quête et par faction.",
     "Prépare aussi les cartes à révéler (rencontres, quêtes, savoirs) dans MJ/04_Revelations, avec « prevu » sur le fichier du lieu. Rien chez les joueurs."
    ]
   },
   {
    "t": "boite",
    "genre": "astuce",
    "lignes": [
     "Une tuile apparaît quand le nom de la fiche est écrit tel quel dans le document. Si ton PNJ s'appelle « Sir Bran » dans la fiche, écris « Sir Bran » (ou « Bran ») dans le texte.",
     "Tu peux aussi créer une fiche de PNJ à la main : Menu ⋯ → Listes du coffre → PNJ → + Nouvelle fiche."
    ]
   },
   {
    "t": "boite",
    "genre": "limite",
    "lignes": [
     "L'application ne découpe pas elle-même un document en fiches : c'est un travail de Claude. Voir partie VIII, point 2."
    ]
   },
   {
    "t": "fiche",
    "n": 4,
    "q": "Je veux préparer à l'avance ce que je révélerai pendant la séance"
   },
   {
    "t": "ou",
    "x": "**Révélations** → choisir le type (Savoirs, Quêtes, Rencontres, Objets) → **Nouvelle carte**"
   },
   {
    "t": "etapes",
    "items": [
     "Choisis le **Type**. Écris le **Titre** tel que les joueurs le liront.",
     "Dans **Ce que les joueurs lisent**, écris du point de vue des personnages : « Le gardien nous a dit que… ».",
     "Dans **Vérité du MJ**, note ce que toi seul sais (facultatif). Ce texte ne sortira jamais du coffre.",
     "Dans **Prévu pour**, choisis le document de session ou de lieu où tu comptes la révéler.",
     "Dans **Destinataires prévus**, laisse toute la table cochée, ou ne coche que le joueur concerné.",
     "Clique **Garder pour plus tard**."
    ]
   },
   {
    "t": "boite",
    "genre": "resultat",
    "lignes": [
     "La carte attend dans ton coffre. Elle apparaît en tête de la liste des Révélations avec un trait orange (« À révéler »), et dans l'outil « Révéler » de l'écran Séance du document choisi."
    ]
   },
   {
    "t": "boite",
    "genre": "astuce",
    "lignes": [
     "Tu peux demander à Claude de préparer toutes les cartes d'une session d'un coup (voir partie VI). Tu les relis ensuite une par une dans Révélations."
    ]
   },
   {
    "t": "boite",
    "genre": "attention",
    "lignes": [
     "N'écris aucune marque 🔴 🔒 🎲 ⚔️ 🆕 dans le texte des joueurs : l'application refuse alors de publier la carte, par sécurité. Tout secret va dans « Vérité du MJ »."
    ]
   },
   {
    "t": "fiche",
    "n": 5,
    "q": "Je veux choisir ce que je joue à la prochaine session et ranger mon parcours"
   },
   {
    "t": "ou",
    "x": "Onglet **Parcours**"
   },
   {
    "t": "etapes",
    "items": [
     "Repère tes documents : la lune indique un document de **session**, l'épingle un document de **lieu**.",
     "**Glisse** dans la colonne **Prochaine session** le ou les documents que tu vas jouer, dans l'ordre. Le premier sera celui qui s'ouvre dans l'écran Séance.",
     "Range le reste : **À suivre** (là où les joueurs iront sans doute ensuite), **Lointain** (préparé, pas pour tout de suite), **Joué**.",
     "Le message « Rangement enregistré » confirme. Le rangement te suit sur tous tes appareils."
    ]
   },
   {
    "t": "boite",
    "genre": "astuce",
    "lignes": [
     "Sur téléphone, ou si le glisser ne te convient pas : le bouton à droite de chaque carte ouvre un petit menu « Vers… », « Monter », « Descendre ».",
     "Cliquer une carte l'ouvre : dans l'écran Séance si elle est dans « Prochaine session », en simple lecture sinon.",
     "Si les joueurs partent ailleurs que prévu en pleine séance : glisse le lieu où ils vont dans « Prochaine session », il devient disponible dans l'écran Séance."
    ]
   },
   {
    "t": "fiche",
    "n": 6,
    "q": "Je veux ajouter ou corriger un PNJ, une quête, un lieu, une faction"
   },
   {
    "t": "ou",
    "x": "Menu ⋯ → **Listes du coffre** → la liste voulue"
   },
   {
    "t": "etapes",
    "items": [
     "**+ Nouvelle fiche** pour créer ; ou ouvre une fiche puis **Modifier**.",
     "Remplis les champs. Laisse la visibilité sur « Secret MJ » : ces fiches sont ton matériel, pas ce que lisent les joueurs.",
     "**Enregistrer**. Pour revenir à la régie : reviens au menu des listes, puis **Retour à l'application joueur**."
    ]
   },
   {
    "t": "boite",
    "genre": "resultat",
    "lignes": [
     "La fiche devient une tuile dans l'écran Séance dès que son nom est cité dans le document ouvert."
    ]
   },
   {
    "t": "boite",
    "genre": "astuce",
    "lignes": [
     "Changer l'état d'un lieu (idée, à venir, en cours, joué) se fait ici aussi, dans la fiche du lieu, champ « État »."
    ]
   },
   {
    "t": "fiche",
    "n": 7,
    "q": "Je veux vérifier que tout est prêt avant que les joueurs arrivent"
   },
   {
    "t": "etapes",
    "items": [
     "**Parcours** : le bon document est en tête de « Prochaine session ».",
     "**Séance** → outil **Fiche MJ** : synopsis, compétences clés et tableau de bord s'affichent.",
     "**Séance** → outil **Secrets** : relis ce que tu ne dois pas laisser échapper.",
     "**Séance** → outil **Révéler** : tes cartes préparées sont là, dans « Préparées pour ce document ».",
     "**Séance** → outil **Joueurs** : les points de vie et les jauges cachées sont à jour.",
     "**Joueurs** → « Voir comme lui » sur un joueur : tu vois exactement son application."
    ]
   }
  ]
 },
 {
  "num": "III",
  "titre": "Pendant la séance : mener et révéler",
  "blocs": [
   {
    "t": "fiche",
    "n": 8,
    "q": "Comment je me sers de l'écran Séance pour mener la partie ?"
   },
   {
    "t": "ou",
    "x": "Onglet **Séance** (sur PC : trois colonnes)"
   },
   {
    "t": "table",
    "entetes": [
     "Zone",
     "Usage"
    ],
    "lignes": [
     [
      "À gauche : Scènes",
      "La liste des scènes. Un clic t'y amène. En dessous, la légende des couleurs."
     ],
     [
      "Au centre : le document",
      "Ton texte, bloc par bloc. Crème = à lire aux joueurs. Bleu = dialogue (le nom du PNJ en titre). Gris = note pour toi. Rouge = secret. Orange = combat. Vert = alerte ou quête."
     ],
     [
      "À droite : les outils",
      "Six onglets, détaillés ci-dessous. Le panneau reste à l'écran quand tu fais défiler le document."
     ]
    ]
   },
   {
    "t": "table",
    "entetes": [
     "Outil",
     "Ce qu'il te donne"
    ],
    "lignes": [
     [
      "Fiche MJ",
      "Le résumé de préparation tiré de ton document : synopsis, compétences clés, moments pivots, fins possibles, tableau de bord."
     ],
     [
      "Secrets",
      "Tous les blocs 🔴 du document (à ne pas révéler) et les alertes 🆕, chacun avec un lien vers sa scène."
     ],
     [
      "Révéler",
      "Les cartes préparées pour ce document, un bouton « Révéler » sur chacune, et « Nouvelle révélation » pour improviser."
     ],
     [
      "Tuiles",
      "Les PNJ, lieux, quêtes, factions, divinités, créatures et objets cités. Un clic ouvre la fiche ; dans la fiche, « Liens » mène aux fiches voisines."
     ],
     [
      "Joueurs",
      "Les points de vie de chacun et les jauges cachées des objets magiques."
     ],
     [
      "Notes",
      "Tes notes de séance, le compte rendu public, et « Session jouée »."
     ]
    ]
   },
   {
    "t": "boite",
    "genre": "astuce",
    "lignes": [
     "S'il y a plusieurs documents dans « Prochaine session », des pastilles en haut de l'écran permettent de passer de l'un à l'autre.",
     "Sur un écran étroit ou un téléphone, les outils passent au-dessus du document et la liste des scènes disparaît."
    ]
   },
   {
    "t": "fiche",
    "n": 9,
    "q": "Les joueurs viennent d'apprendre quelque chose que j'avais prévu"
   },
   {
    "t": "ou",
    "x": "**Séance** → outil **Révéler**"
   },
   {
    "t": "etapes",
    "items": [
     "Dans « Préparées pour ce document », trouve la carte.",
     "Clique **Révéler** : elle part chez tous les destinataires prévus.",
     "Un bandeau en bas confirme, avec un bouton **Annuler** pendant quelques secondes."
    ]
   },
   {
    "t": "boite",
    "genre": "resultat",
    "lignes": [
     "Chez chaque joueur concerné, la carte apparaît en moins d'une demi-minute si son application est ouverte, en tête de liste, avec la pastille rouge « Nouveau » et un compteur sur l'onglet."
    ]
   },
   {
    "t": "boite",
    "genre": "astuce",
    "lignes": [
     "Pour choisir à qui la donner cette fois-ci : clique le **titre** de la carte au lieu du bouton. La fiche s'ouvre avec l'aperçu exact de ce que liront les joueurs et des cases à cocher."
    ]
   },
   {
    "t": "fiche",
    "n": 10,
    "q": "Il se passe quelque chose que je n'avais pas prévu : je veux le noter et le donner tout de suite"
   },
   {
    "t": "ou",
    "x": "**Séance** → outil **Révéler** → **Nouvelle révélation**"
   },
   {
    "t": "etapes",
    "items": [
     "Choisis le type, écris un titre et deux lignes de texte du point de vue des personnages.",
     "Vérifie les destinataires.",
     "Clique **Enregistrer et révéler maintenant**."
    ]
   },
   {
    "t": "boite",
    "genre": "resultat",
    "lignes": [
     "La carte est créée dans ton coffre et déposée chez les joueurs dans le même geste. Elle est rattachée au document en cours."
    ]
   },
   {
    "t": "boite",
    "genre": "astuce",
    "lignes": [
     "Pas le temps d'écrire ? Note-le en une ligne dans l'outil **Notes** et fais la carte après la séance (fiche 16)."
    ]
   },
   {
    "t": "fiche",
    "n": 11,
    "q": "Je veux donner une information à un seul joueur, sans que les autres la voient"
   },
   {
    "t": "etapes",
    "items": [
     "Crée la carte (fiche 4 ou 10) en ne cochant **que ce joueur** dans les destinataires.",
     "Révèle-la. Elle n'est déposée que dans son dossier."
    ]
   },
   {
    "t": "boite",
    "genre": "resultat",
    "lignes": [
     "Dans l'écran Révélations, la carte porte l'étiquette « pour <joueur> ». Les cases des autres joueurs sont estompées : elles restent cliquables si tu décides plus tard de la partager."
    ]
   },
   {
    "t": "boite",
    "genre": "attention",
    "lignes": [
     "Les autres joueurs ne voient rien dans leur application. Mais autour de la table, un joueur qui lit son téléphone se remarque : préviens-le d'un regard."
    ]
   },
   {
    "t": "fiche",
    "n": 12,
    "q": "Je veux donner un objet ou du butin"
   },
   {
    "t": "ou",
    "x": "**Révélations** → **Objets** → **Nouvelle carte** (ou outil « Révéler » de la Séance, type Objet)"
   },
   {
    "t": "etapes",
    "items": [
     "Titre = le nom de l'objet. **Quantité** si besoin. Texte = ce que le personnage sait de l'objet.",
     "Vérité du MJ = ses effets cachés, sa jauge, sa malédiction.",
     "Destinataires : **un seul joueur** pour un objet personnel ; **toute la table** pour un objet du groupe.",
     "Révèle."
    ]
   },
   {
    "t": "boite",
    "genre": "resultat",
    "lignes": [
     "L'objet arrive dans le Sac du joueur, rangé dans « Non classé ». Le joueur le déplace lui-même dans le dossier de son choix (par exemple « Sac du groupe »)."
    ]
   },
   {
    "t": "boite",
    "genre": "limite",
    "lignes": [
     "Un objet du groupe est donné à chaque joueur séparément (un exemplaire par sac) et arrive dans « Non classé », pas directement dans leur dossier « Sac du groupe ».",
     "L'or et la bourse ne se distribuent pas depuis la régie : chaque joueur tient sa bourse lui-même, dans sa Fiche. Annonce la somme à voix haute.",
     "Il n'y a pas de pastille « Nouveau » sur les objets du sac. Voir partie VIII, points 4 et 6."
    ]
   },
   {
    "t": "fiche",
    "n": 13,
    "q": "Un objet magique a été utilisé : je veux faire monter sa jauge cachée"
   },
   {
    "t": "ou",
    "x": "**Séance** → outil **Joueurs** → « Jauges cachées des objets »"
   },
   {
    "t": "etapes",
    "items": [
     "Lance tes dés à la table.",
     "Clique **+1**, **+5** ou **+10** (ou **−1**, **−5**) autant de fois qu'il faut pour atteindre la nouvelle valeur."
    ]
   },
   {
    "t": "boite",
    "genre": "resultat",
    "lignes": [
     "La valeur est enregistrée dans la fiche de l'objet, dans ton coffre. Aucun joueur ne la voit, jamais."
    ]
   },
   {
    "t": "boite",
    "genre": "astuce",
    "lignes": [
     "Un objet n'apparaît ici que si sa fiche (Listes du coffre → Objets) a une « Jauge maximale ». Le nom du porteur s'affiche si le champ « Porteur actuel » est rempli."
    ]
   },
   {
    "t": "fiche",
    "n": 14,
    "q": "Je veux prendre des notes pendant la partie"
   },
   {
    "t": "ou",
    "x": "**Séance** → outil **Notes** → « Notes de séance »"
   },
   {
    "t": "etapes",
    "items": [
     "Écris au fil de l'eau : décisions des joueurs, improvisations, noms inventés, règles tranchées.",
     "Clique **Enregistrer les notes** de temps en temps, et toujours avant de fermer."
    ]
   },
   {
    "t": "boite",
    "genre": "resultat",
    "lignes": [
     "Les notes sont dans ton coffre : `MJ / 05_Fin_de_seance / A_traiter / <date>_Notes_de_seance.md`. Un fichier par jour. Aucun joueur ne les voit."
    ]
   },
   {
    "t": "boite",
    "genre": "attention",
    "lignes": [
     "Si tu changes d'outil sans enregistrer, ton texte est gardé tant que la page reste ouverte ; il est perdu si tu fermes ou recharges la page."
    ]
   },
   {
    "t": "fiche",
    "n": 15,
    "q": "Je me suis trompé : j'ai révélé la mauvaise carte, ou au mauvais joueur"
   },
   {
    "t": "table",
    "entetes": [
     "Situation",
     "Geste"
    ],
    "lignes": [
     [
      "À l'instant",
      "Clique **Annuler** dans le bandeau en bas de l'écran."
     ],
     [
      "Plus tard, pour un joueur",
      "**Révélations** → la ligne de la carte → clique la **case cochée** du joueur → confirme « Retirer »."
     ],
     [
      "Le texte était faux",
      "Ouvre la carte → **Modifier** → corrige → rouvre la carte → **Mettre à jour chez eux**."
     ],
     [
      "Un compte rendu en trop",
      "**Révélations** → **Journal** → bascule l'interrupteur sur « Masqué »."
     ]
    ]
   },
   {
    "t": "boite",
    "genre": "attention",
    "lignes": [
     "Retirer efface le fichier chez le joueur ; s'il y avait écrit une note personnelle (sur une rencontre), elle part avec. Le fichier reste 30 jours dans la corbeille de ton OneDrive.",
     "Le joueur a pu lire l'information avant le retrait : à toi de décider comment l'intégrer à l'histoire."
    ]
   }
  ]
 },
 {
  "num": "IV",
  "titre": "Après la séance : tout mettre à jour",
  "blocs": [
   {
    "t": "fiche",
    "n": 16,
    "q": "J'ai fait une session ce soir : que dois-je faire pour que les joueurs voient tout ?"
   },
   {
    "t": "p",
    "x": "Voici la liste complète, dans l'ordre. Compte quinze à trente minutes. Chaque ligne renvoie à la fiche qui détaille le geste."
   },
   {
    "t": "table",
    "entetes": [
     "Étape",
     "Où et quoi"
    ],
    "lignes": [
     [
      "1. Tes notes",
      "Séance → Notes : complète à chaud et **Enregistrer les notes**. C'est ta mémoire pour tout le reste."
     ],
     [
      "2. Les savoirs",
      "Révélations → Savoirs : révèle les cartes prévues qui ont été apprises ; crée celles que tu as improvisées. (Fiche 19)"
     ],
     [
      "3. Les rencontres",
      "Révélations → Rencontres : une carte par personnage rencontré. (Fiche 21)"
     ],
     [
      "4. Les quêtes",
      "Révélations → Quêtes : nouvelles quêtes, quêtes qui ont avancé, quêtes terminées. (Fiche 18)"
     ],
     [
      "5. Le sac",
      "Révélations → Objets : objets gagnés, objets perdus ou consommés. (Fiche 20)"
     ],
     [
      "6. Les jauges",
      "Séance → Joueurs : vérifie les jauges cachées. (Fiche 13)"
     ],
     [
      "7. Le compte rendu",
      "Séance → Notes → « Résumé public », ou Révélations → Journal. (Fiche 17)"
     ],
     [
      "8. Clore",
      "Séance → Notes → **Session jouée** ; puis range le Parcours pour la suite. (Fiche 22)"
     ],
     [
      "9. Vérifier",
      "Joueurs → « Voir comme lui » sur un joueur : tout y est, rien de trop."
     ]
    ]
   },
   {
    "t": "boite",
    "genre": "astuce",
    "lignes": [
     "Tu peux tout faire pendant la partie au lieu d'après : l'ordre est le même.",
     "Tu peux aussi confier la préparation des cartes à Claude à partir de tes notes (partie VI), puis ne faire que relire et cliquer « Révéler »."
    ]
   },
   {
    "t": "boite",
    "genre": "limite",
    "lignes": [
     "L'application ne transforme pas tes notes en cartes toute seule : soit tu crées les cartes à la main, soit tu demandes à Claude de les préparer. Voir partie VIII, point 3."
    ]
   },
   {
    "t": "fiche",
    "n": 17,
    "q": "Je veux que les joueurs lisent le compte rendu de la session dans leur journal"
   },
   {
    "t": "ou",
    "x": "**Séance** → outil **Notes** → « Résumé public de la séance »   ou   **Révélations** → **Journal** → **Nouveau compte rendu**"
   },
   {
    "t": "etapes",
    "items": [
     "Vérifie le **Titre** et le numéro de **Session** (il range le compte rendu dans le journal des joueurs).",
     "Écris ce que tout le groupe sait après cette séance, du point de vue des personnages. Aucun secret.",
     "Depuis la Séance : **Publier le résumé à la table**. Depuis le Journal : **Enregistrer et montrer aux joueurs**, ou **Garder masqué pour l'instant** si tu veux le relire à tête reposée."
    ]
   },
   {
    "t": "boite",
    "genre": "resultat",
    "lignes": [
     "Tous les joueurs le lisent dans leur application : onglet Savoirs → pastille Journal → la session."
    ]
   },
   {
    "t": "h3",
    "x": "Afficher, masquer, corriger un compte rendu"
   },
   {
    "t": "ou",
    "x": "**Révélations** → pastille **Journal**"
   },
   {
    "t": "table",
    "entetes": [
     "Je veux…",
     "Geste"
    ],
    "lignes": [
     [
      "Le masquer aux joueurs",
      "Bascule l'interrupteur à droite de la ligne : il passe sur « Masqué ». Le texte reste dans ton coffre."
     ],
     [
      "Le remontrer",
      "Bascule l'interrupteur dans l'autre sens."
     ],
     [
      "Le corriger",
      "Clique le titre → **Corriger**. S'il est visible, les joueurs voient la correction."
     ],
     [
      "Garder des notes pour moi",
      "Dans le formulaire, champ **Notes du MJ** : elles ne quittent jamais le coffre."
     ],
     [
      "Le supprimer",
      "Masque-le d'abord, puis clique le titre → **Supprimer**."
     ]
    ]
   },
   {
    "t": "boite",
    "genre": "limite",
    "lignes": [
     "Un compte rendu est visible pour toute la table ou pour personne : il n'existe pas de compte rendu réservé à un joueur. Voir partie VIII, point 9.",
     "Pour un récit personnel destiné à un seul joueur, fais plutôt une carte de **savoir** pour lui seul."
    ]
   },
   {
    "t": "fiche",
    "n": 18,
    "q": "Des quêtes ont avancé ou sont maintenant terminées : comment les traiter ?"
   },
   {
    "t": "ou",
    "x": "**Révélations** → pastille **Quêtes**"
   },
   {
    "t": "h3",
    "x": "Une nouvelle quête"
   },
   {
    "t": "etapes",
    "items": [
     "**Nouvelle carte**, type Quête. Texte = ce que les personnages savent de la mission.",
     "Vérité du MJ = le vrai commanditaire, le piège, la récompense réelle.",
     "Révèle à la table, ou au seul joueur concerné pour une quête personnelle."
    ]
   },
   {
    "t": "h3",
    "x": "Une quête qui a avancé"
   },
   {
    "t": "etapes",
    "items": [
     "Clique le **titre** de la quête → **Modifier**.",
     "Complète **Ce que les joueurs lisent** avec la nouvelle étape (garde l'ancien texte au-dessus, ou réécris l'ensemble).",
     "**Enregistrer**.",
     "Rouvre la quête → **Mettre à jour chez eux** → confirme."
    ]
   },
   {
    "t": "h3",
    "x": "Une quête terminée ou abandonnée"
   },
   {
    "t": "etapes",
    "items": [
     "Clique le titre → **Modifier**.",
     "Dans **État de la quête**, choisis **Terminée** (ou **Abandonnée**). Ajoute une phrase de conclusion dans le texte.",
     "**Enregistrer**, puis rouvre la quête → **Mettre à jour chez eux**."
    ]
   },
   {
    "t": "boite",
    "genre": "resultat",
    "lignes": [
     "Chez chaque joueur qui a la quête : le texte est remplacé, la pastille d'état passe à « terminée ». La quête redevient « Nouveau » si la mise à jour a lieu un autre jour que sa dernière révélation.",
     "Ce que le joueur a écrit lui-même dans « Ce que j'ai fait » est conservé."
    ]
   },
   {
    "t": "boite",
    "genre": "astuce",
    "lignes": [
     "Les 14 quêtes déjà en place n'ont pas encore de carte dans ton coffre. Le premier « Modifier » la crée automatiquement à partir de l'exemplaire d'un joueur : tu n'as rien à recopier.",
     "Une quête terminée reste dans la liste du joueur, avec sa pastille. Si tu préfères qu'elle disparaisse, retire-la à chacun en cliquant ses cases cochées."
    ]
   },
   {
    "t": "boite",
    "genre": "limite",
    "lignes": [
     "Le texte « Ma quête personnelle » épinglé en haut des quêtes d'un joueur vient de sa Fiche : il ne se modifie pas depuis la régie. Sa quête personnelle détaillée, elle, est une carte de quête comme les autres, destinée à lui seul. Voir partie VIII, point 5."
    ]
   },
   {
    "t": "fiche",
    "n": 19,
    "q": "Les joueurs ont appris des choses : comment mettre à jour leurs savoirs ?"
   },
   {
    "t": "ou",
    "x": "**Révélations** → pastille **Savoirs**"
   },
   {
    "t": "table",
    "entetes": [
     "Situation",
     "Geste"
    ],
    "lignes": [
     [
      "Savoir prévu, appris par tous",
      "Sur la ligne, bouton rouge **À tous**."
     ],
     [
      "Appris par certains seulement",
      "Clique la **case** de chaque joueur concerné."
     ],
     [
      "Savoir improvisé",
      "**Nouvelle carte** → **Enregistrer et révéler maintenant**."
     ],
     [
      "Un joueur absent rattrape",
      "Clique sa case sur chaque ligne qu'il doit connaître ; pour une carte créée dans la régie, le bouton **+1** en bout de ligne le complète en un clic."
     ],
     [
      "Une rumeur devient une vérité",
      "Titre → **Modifier** → réécris le texte → **Mettre à jour chez eux**."
     ],
     [
      "Un savoir personnel (passé d'un personnage)",
      "Carte destinée à ce seul joueur."
     ]
    ]
   },
   {
    "t": "boite",
    "genre": "astuce",
    "lignes": [
     "Les filtres en haut de la liste : « À révéler » (personne ne l'a), « En partie » (il manque des destinataires prévus), « Révélé ».",
     "Le chiffre sous le nom de chaque joueur est le nombre de savoirs qu'il possède."
    ]
   },
   {
    "t": "boite",
    "genre": "attention",
    "lignes": [
     "Les savoirs publiés avant la régie (ceux dont le nom commence par un numéro ou par P1, P2…) n'ont pas de bouton « À tous » : l'application ne sait pas s'ils étaient personnels. Tu peux toujours les donner case par case."
    ]
   },
   {
    "t": "fiche",
    "n": 20,
    "q": "Le sac des joueurs a changé : objets gagnés, perdus, consommés"
   },
   {
    "t": "ou",
    "x": "**Révélations** → pastille **Objets**"
   },
   {
    "t": "table",
    "entetes": [
     "Situation",
     "Geste"
    ],
    "lignes": [
     [
      "Objet gagné",
      "Fiche 12 : nouvelle carte d'objet, pour le joueur ou la table."
     ],
     [
      "Objet perdu, donné, détruit",
      "Clique la **case cochée** du joueur → « Retirer »."
     ],
     [
      "Objet qui passe d'un joueur à un autre",
      "Retire-le au premier, puis clique la case du second."
     ],
     [
      "La quantité change (potions…)",
      "Titre → **Modifier** → **Quantité** → **Enregistrer** → rouvre → **Mettre à jour chez eux**."
     ],
     [
      "On en apprend plus sur l'objet",
      "Titre → **Modifier** → complète le texte → **Mettre à jour chez eux**."
     ]
    ]
   },
   {
    "t": "boite",
    "genre": "astuce",
    "lignes": [
     "Chaque joueur peut aussi retirer lui-même un objet de son sac et tient sa propre bourse : pour un objet consommé, tu peux simplement le lui dire.",
     "La liste montre aussi les objets que les joueurs ont rangés dans leurs dossiers (par exemple « Sac du groupe »)."
    ]
   },
   {
    "t": "fiche",
    "n": 21,
    "q": "Les joueurs ont rencontré de nouveaux personnages"
   },
   {
    "t": "ou",
    "x": "**Révélations** → pastille **Rencontres** → **Nouvelle carte**"
   },
   {
    "t": "etapes",
    "items": [
     "Titre = le nom du personnage tel que les joueurs le connaissent.",
     "Texte = sa présentation : apparence, rôle, ce qu'il a dit ou fait devant eux.",
     "Remplis **Session** et **Lieu** : ils s'affichent sous le nom, chez le joueur.",
     "Vérité du MJ = ses motivations réelles. Révèle."
    ]
   },
   {
    "t": "boite",
    "genre": "resultat",
    "lignes": [
     "Le personnage apparaît dans Savoirs → Rencontres du joueur, qui peut y écrire sa propre note (« Ma note »). Cette note lui appartient : elle est gardée si tu mets la carte à jour."
    ]
   },
   {
    "t": "boite",
    "genre": "astuce",
    "lignes": [
     "Quand les joueurs en apprennent plus sur lui : **Modifier** la carte, puis **Mettre à jour chez eux**."
    ]
   },
   {
    "t": "boite",
    "genre": "limite",
    "lignes": [
     "Le portrait d'une rencontre ne s'ajoute pas depuis la régie. Sans image, le joueur voit l'initiale du personnage. Voir partie VIII, point 7."
    ]
   },
   {
    "t": "fiche",
    "n": 22,
    "q": "La session est finie : je veux la clore et préparer la suite"
   },
   {
    "t": "etapes",
    "items": [
     "**Séance** → outil **Notes** → **Session jouée : la ranger dans « Joué »**. La session passe à l'état « jouée » et quitte « Prochaine session ».",
     "**Parcours** : glisse dans **Prochaine session** ce que tu joueras la prochaine fois ; ajuste « À suivre » selon la direction prise par les joueurs.",
     "Pour un document de **lieu** (qui se joue sur plusieurs séances) : laisse-le dans « Prochaine session » ou « À suivre » tant qu'il sert, et glisse-le toi-même dans « Joué » le moment venu.",
     "Si tu veux que Claude mette à jour ton coffre (fiches des PNJ, lore, fils ouverts) à partir de tes notes : voir partie VI."
    ]
   }
  ]
 },
 {
  "num": "V",
  "titre": "Les joueurs",
  "blocs": [
   {
    "t": "fiche",
    "n": 23,
    "q": "Je veux donner l'accès à l'application à un joueur"
   },
   {
    "t": "p",
    "x": "À faire une seule fois par joueur. La sécurité repose sur ce partage : un joueur ne peut lire que les deux dossiers que tu lui partages."
   },
   {
    "t": "etapes",
    "items": [
     "Dans OneDrive (site ou explorateur), clic droit sur `Joueurs / <son dossier>` → **Partager** → **Personnes spécifiques** → son adresse de compte Microsoft → droit **Peut modifier**.",
     "Même chose pour le dossier `Table`, avec le droit **Lecture**.",
     "Copie les **deux liens** et envoie-les-lui, avec l'adresse de l'application.",
     "Le joueur ouvre l'application, se connecte avec son compte Microsoft, colle ses deux liens (une seule fois par appareil).",
     "Vérifie avec lui qu'il voit sa fiche et la table, et rien d'autre."
    ]
   },
   {
    "t": "boite",
    "genre": "attention",
    "lignes": [
     "Ne partage jamais le dossier `MJ`, ni le dossier `Joueurs` en entier.",
     "Chaque joueur doit avoir un compte Microsoft (gratuit).",
     "Le détail de la procédure est dans `MJ / 07_Application / Partages_joueurs.md`. Note-y la date de chaque partage."
    ]
   },
   {
    "t": "fiche",
    "n": 24,
    "q": "Je veux voir exactement ce qu'un joueur voit"
   },
   {
    "t": "ou",
    "x": "Onglet **Joueurs** → carte du joueur → **Voir comme lui**"
   },
   {
    "t": "etapes",
    "items": [
     "Tu arrives dans son application : fiche, compétences, sac, savoirs.",
     "Pour revenir : clique son nom en haut → **Accueil du MJ**."
    ]
   },
   {
    "t": "boite",
    "genre": "astuce",
    "lignes": [
     "Dans ce mode tu ne peux rien modifier, et tu ne fais pas disparaître ses pastilles « Nouveau »."
    ]
   },
   {
    "t": "fiche",
    "n": 25,
    "q": "Je veux ajouter une compétence spéciale à un joueur"
   },
   {
    "t": "ou",
    "x": "Onglet **Joueurs** → carte du joueur → **Notes MJ** → « Compétences spéciales » → **Ajouter**"
   },
   {
    "t": "etapes",
    "items": [
     "Nom, liens (par exemple « INT / DEX »), total, note.",
     "**Ajouter**. Pour l'enlever : l'icône de corbeille sur sa ligne."
    ]
   },
   {
    "t": "boite",
    "genre": "resultat",
    "lignes": [
     "La compétence apparaît dans l'onglet Compétences du joueur. La copie « Fiche complète » de ton coffre n'est pas modifiée : tiens-la à jour toi-même si tu t'en sers."
    ]
   },
   {
    "t": "boite",
    "genre": "astuce",
    "lignes": [
     "Sur la même page : « Secrets du MJ » et « Fiche complète » du joueur, tels qu'ils sont dans ton coffre."
    ]
   },
   {
    "t": "fiche",
    "n": 26,
    "q": "Qu'est-ce que les joueurs gèrent eux-mêmes ?"
   },
   {
    "t": "table",
    "entetes": [
     "Le joueur peut…",
     "Où, dans son application"
    ],
    "lignes": [
     [
      "Changer ses points de vie",
      "Fiche : les flèches de la barre de PV"
     ],
     [
      "Tenir sa bourse",
      "Sac : la ligne de la bourse"
     ],
     [
      "Ranger son sac en dossiers, retirer un objet",
      "Sac"
     ],
     [
      "Écrire des notes libres",
      "Savoirs → Notes"
     ],
     [
      "Écrire dans son journal, session par session",
      "Savoirs → Journal"
     ],
     [
      "Écrire « Ma note » sur une rencontre",
      "Savoirs → Rencontres → le personnage"
     ],
     [
      "Poser ses propres étiquettes sur un savoir ou une quête",
      "En ouvrant l'élément"
     ],
     [
      "Lancer un d100 ou un jet de compétence",
      "Le bouton rond d100, ou une compétence"
     ]
    ]
   },
   {
    "t": "p",
    "x": "Ce qu'il **ne peut pas** faire : modifier le texte d'un savoir, d'une quête ou d'une présentation de rencontre (c'est toi qui les écris), ni voir quoi que ce soit du coffre ou du dossier d'un autre joueur."
   }
  ]
 },
 {
  "num": "VI",
  "titre": "Travailler avec Claude (Cowork)",
  "blocs": [
   {
    "t": "p",
    "x": "L'application est faite pour jouer et révéler. Le gros travail d'écriture et de conversion reste celui de tes conversations Claude, avec tes compétences habituelles. Elles connaissent les règles : les règles R23 à R25 et le §9 du contrat de format leur disent quoi faire. Voici les phrases prêtes à l'emploi."
   },
   {
    "t": "h2",
    "x": "Préparer une séance"
   },
   {
    "t": "boite",
    "genre": "cowork",
    "lignes": [
     "Prépare la séance « … » selon R24 : convertis le document Word joint en fichier de session, crée les fiches des PNJ, lieux et quêtes nouveaux, et propose les cartes à révéler avec « prevu » sur ce document. Ne mets rien chez les joueurs."
    ]
   },
   {
    "t": "h2",
    "x": "Importer un nouveau lieu"
   },
   {
    "t": "boite",
    "genre": "cowork",
    "lignes": [
     "Voici le document du lieu « … ». Découpe-le selon R24 : fiche du lieu, une fiche par PNJ, par quête, par faction. Prépare les cartes de rencontre et de quête dans MJ/04_Revelations."
    ]
   },
   {
    "t": "h2",
    "x": "Après la séance, à partir de tes notes"
   },
   {
    "t": "boite",
    "genre": "cowork",
    "lignes": [
     "Lis mes notes de séance du jour dans MJ/05_Fin_de_seance/A_traiter. Prépare selon R23 : les cartes de savoir, de rencontre, de quête et d'objet qui manquent, les modifications des cartes existantes (quêtes avancées ou terminées), et un compte rendu masqué dans MJ/04_Revelations/Resumes. Liste-moi ce que tu as préparé ; je révélerai moi-même."
    ]
   },
   {
    "t": "h2",
    "x": "Mettre à jour le coffre"
   },
   {
    "t": "boite",
    "genre": "cowork",
    "lignes": [
     "À partir de mes notes de séance, mets à jour le coffre selon R4 : fiches des PNJ rencontrés, lieux, fils ouverts, état de la campagne. Signale-moi toute contradiction avec le canon."
    ]
   },
   {
    "t": "boite",
    "genre": "attention",
    "lignes": [
     "Claude prépare, tu révèles : il ne doit jamais écrire dans `Joueurs/` ni dans `Table/`. S'il propose de le faire, refuse et renvoie-le à R23.",
     "Relis toujours une carte préparée par Claude avant de la révéler : ouvre-la dans Révélations, lis « Ce que les joueurs lisent ».",
     "Si une conversation veut « redéployer l'application depuis le moteur », arrête-la : cela effacerait la régie (règle R25)."
    ]
   }
  ]
 },
 {
  "num": "VII",
  "titre": "Dépannage",
  "blocs": [
   {
    "t": "table",
    "entetes": [
     "Ce que tu vois",
     "Ce qu'il faut faire"
    ],
    "lignes": [
     [
      "« Lecture seule : l'écriture est fermée »",
      "Le réglage « ecriture » de l'application est éteint. Il est allumé depuis le 10 novembre 2026 ; si le message revient, demande à Claude Code de vérifier `app/config.js`."
     ],
     [
      "« Reconnexion nécessaire »",
      "Ta session Microsoft a expiré (une fois par jour environ). Clique « Se connecter ». Rien n'est perdu."
     ],
     [
      "« Ce fichier a changé ailleurs… »",
      "Quelqu'un (toi sur un autre appareil, un joueur, Claude) a modifié le fichier entre-temps. Rien n'a été écrasé. Clique « Recharger » et recommence."
     ],
     [
      "« Ce texte contient encore une marque de secret »",
      "Le texte des joueurs contient 🔴 🔒 🎲 ⚔️ ou 🆕. Ouvre la carte → Modifier → déplace ce passage dans « Vérité du MJ »."
     ],
     [
      "« Ce nom est déjà pris »",
      "Une carte ou une fiche porte déjà ce titre. Change un mot du titre."
     ],
     [
      "Un joueur ne voit pas ce que je viens de révéler",
      "Attends une demi-minute, application ouverte. Sinon : son nom en haut → Actualiser. Vérifie dans Révélations que sa case est cochée."
     ],
     [
      "Un joueur voit « Relier tes dossiers »",
      "Il doit recoller ses deux liens (nouvel appareil, ou partage retiré). Renvoie-les-lui."
     ],
     [
      "« Import impossible »",
      "Le fichier n'est pas un .docx (un .doc ancien ou un PDF ne passent pas : dans Word, « Enregistrer sous » → Document Word .docx), ou il est abîmé. Rien n'a été écrit."
     ],
     [
      "L'import ne reconnaît aucune scène",
      "Tes titres de scène n'ont pas le style « Titre 1 ». Applique-le dans Word et réimporte ; le document reste lisible d'un seul tenant en attendant."
     ],
     [
      "Mon nouveau document n'apparaît pas dans le Parcours",
      "Vérifie qu'il est bien dans `Documents/JDR/GAO - Application/MJ/02_Campagne/Sessions` (ou `01_Univers/Lieux`), que c'est un fichier .md, et que son nom ne commence pas par « 00_ ». Puis Menu ⋯ → Actualiser."
     ],
     [
      "L'écran Séance n'affiche pas de scènes ou de couleurs",
      "Les scènes doivent être des titres « ### », les blocs commencer par leur marque en début de ligne. Fais reprendre la conversion par Claude (§9.1 du contrat)."
     ],
     [
      "Un PNJ n'apparaît pas dans les Tuiles",
      "Il lui faut une fiche dans `MJ/01_Univers/PNJ`, et son nom doit être écrit dans le document comme dans le nom de la fiche."
     ],
     [
      "« Copie enregistrée sur cet appareil »",
      "Pas de réseau : tu vois la dernière copie. Tu peux lire, pas écrire. Tout revient avec la connexion."
     ],
     [
      "J'ai révélé par erreur",
      "Fiche 15."
     ],
     [
      "Autre chose, ou un comportement bizarre",
      "Note ce que tu as fait et le message exact, puis ouvre une session Claude Code dans le dossier « Claude CODE » : le projet et le banc d'essai y sont."
     ]
    ]
   }
  ]
 },
 {
  "num": "VIII",
  "titre": "Ce que l'outil ne fait pas encore",
  "blocs": [
   {
    "t": "p",
    "x": "Cette partie est la liste honnête des manques repérés en écrivant ce guide. Pour chacun : comment faire aujourd'hui, et la modification à prévoir dans l'outil. Dis-moi lesquels comptent pour toi : je les classe par gêne probable."
   },
   {
    "t": "h2",
    "x": "Ce qui te gênera sans doute en premier"
   },
   {
    "t": "table",
    "entetes": [
     "Manque",
     "Aujourd'hui  →  Modification à prévoir"
    ],
    "lignes": [
     [
      "1. Importer un document Word",
      "FAIT depuis la version 0.23 (fiche 2).  →  Reste à prévoir : reprendre les images du document, et remplacer un document déjà importé au lieu d'en créer un second."
     ],
     [
      "2. Découper un lieu en fiches",
      "Aujourd'hui : découpage par Claude (fiche 3).  →  À prévoir : dans l'écran Séance, un bouton « Créer la fiche » sur un nom de PNJ ou de quête repéré dans le document."
     ],
     [
      "3. Des notes aux cartes",
      "Aujourd'hui : tu crées les cartes à la main, ou Claude les prépare depuis tes notes.  →  À prévoir : dans l'outil Notes, transformer une ligne de note en carte d'un clic."
     ],
     [
      "4. Or, bourse et points de vie",
      "Aujourd'hui : chaque joueur tient sa bourse et ses PV ; tu annonces à voix haute.  →  À prévoir : dans l'outil Joueurs, boutons PV et « donner de l'or » écrits dans la fiche du joueur."
     ],
     [
      "5. Quête personnelle épinglée",
      "Aujourd'hui : le texte épinglé vient de la Fiche du joueur et ne se change qu'en modifiant ce fichier.  →  À prévoir : le rendre modifiable depuis la page du joueur (Notes MJ)."
     ],
     [
      "6. Objets du groupe et pastille « Nouveau »",
      "Aujourd'hui : un objet arrive dans « Non classé » chez chacun, sans pastille.  →  À prévoir : choisir le dossier d'arrivée (« Sac du groupe ») et afficher « Nouveau » dans le sac."
     ],
     [
      "7. Portraits des rencontres",
      "Aujourd'hui : pas d'image, l'initiale s'affiche.  →  À prévoir : choisir une image dans le formulaire de la carte ; elle est copiée chez les joueurs avec la rencontre."
     ]
    ]
   },
   {
    "t": "h2",
    "x": "Ce qui est plus secondaire"
   },
   {
    "t": "table",
    "entetes": [
     "Manque",
     "Aujourd'hui  →  Modification à prévoir"
    ],
    "lignes": [
     [
      "8. Historique d'une carte",
      "Aujourd'hui : « Modifier » remplace le texte ; l'ancienne version reste seulement dans la corbeille et l'historique de OneDrive.  →  À prévoir : des paliers nommés (rumeur, vérité) révélables l'un après l'autre."
     ],
     [
      "9. Compte rendu par joueur",
      "Aujourd'hui : le journal est commun à toute la table.  →  À prévoir : possible seulement en rangeant les comptes rendus dans le dossier de chaque joueur ; à décider si le besoin est réel."
     ],
     [
      "10. Noms des tuiles",
      "Aujourd'hui : les tuiles reprennent le nom du fichier, sans accents ni apostrophes.  →  À prévoir : lire le vrai nom dans chaque fiche."
     ],
     [
      "11. Corriger une scène depuis l'écran Séance",
      "Aujourd'hui : Menu ⋯ → Listes du coffre → Sessions → Modifier (non essayé sur un gros document), ou modifier le fichier d'origine.  →  À prévoir : un bouton « Corriger » sur chaque bloc."
     ],
     [
      "12. Jauges : pas d'historique",
      "Aujourd'hui : seule la valeur actuelle est gardée.  →  À prévoir : noter chaque variation dans le journal des révélations."
     ],
     [
      "13. Plusieurs tables",
      "Aujourd'hui : une seule table par application.  →  À prévoir : un dossier Joueurs et un Parcours par table, sur le même univers."
     ],
     [
      "14. Ajouter un joueur",
      "Aujourd'hui : son dossier est créé par le générateur de la base (compétence « nouveau-jdr »), puis partagé à la main.  →  À prévoir : un bouton « Nouveau joueur » dans l'onglet Joueurs."
     ],
     [
      "15. Pas de vrai temps réel",
      "Aujourd'hui : jusqu'à une demi-minute avant qu'une révélation apparaisse.  →  Sans changer de stockage, on ne fera pas mieux ; c'est le prix du gratuit sur OneDrive."
     ]
    ]
   },
   {
    "t": "boite",
    "genre": "attention",
    "lignes": [
     "Rappel : tout ce guide décrit un outil vérifié sur un banc d'essai. Le premier essai avec ton compte Microsoft et un téléphone de joueur reste à faire, et peut révéler d'autres points."
    ]
   }
  ]
 },
 {
  "num": "IX",
  "titre": "Aide-mémoire",
  "blocs": [
   {
    "t": "h2",
    "x": "Je veux… → je vais…"
   },
   {
    "t": "table",
    "entetes": [
     "Je veux…",
     "Je vais…"
    ],
    "lignes": [
     [
      "Importer un document Word",
      "Parcours → Importer un document Word"
     ],
     [
      "Choisir ce que je joue",
      "Parcours → glisser dans « Prochaine session »"
     ],
     [
      "Retrouver ce guide",
      "Onglet Guide, tout à droite de la barre"
     ],
     [
      "Mener la partie",
      "Séance"
     ],
     [
      "Relire ce qu'il ne faut pas dire",
      "Séance → Secrets"
     ],
     [
      "Retrouver un PNJ",
      "Séance → Tuiles"
     ],
     [
      "Donner une information prévue",
      "Séance → Révéler → bouton Révéler"
     ],
     [
      "Donner une information improvisée",
      "Séance → Révéler → Nouvelle révélation"
     ],
     [
      "Voir qui sait quoi",
      "Révélations → Savoirs"
     ],
     [
      "Faire avancer ou terminer une quête",
      "Révélations → Quêtes → titre → Modifier → Mettre à jour chez eux"
     ],
     [
      "Donner ou retirer un objet",
      "Révélations → Objets"
     ],
     [
      "Montrer ou masquer un compte rendu",
      "Révélations → Journal"
     ],
     [
      "Faire monter une jauge cachée",
      "Séance → Joueurs"
     ],
     [
      "Prendre des notes",
      "Séance → Notes"
     ],
     [
      "Clore la session",
      "Séance → Notes → Session jouée"
     ],
     [
      "Créer ou corriger une fiche",
      "Menu ⋯ → Listes du coffre"
     ],
     [
      "Voir l'application d'un joueur",
      "Joueurs → Voir comme lui"
     ],
     [
      "Savoir ce que j'ai révélé et quand",
      "Révélations → bouton Journal (à côté de « Nouvelle carte »)"
     ]
    ]
   },
   {
    "t": "h2",
    "x": "Les marques d'un document de session"
   },
   {
    "t": "table",
    "entetes": [
     "Marque",
     "Bloc"
    ],
    "lignes": [
     [
      "📖",
      "Texte à lire ou à paraphraser aux joueurs"
     ],
     [
      "🗣",
      "Dialogue d'un PNJ (une seconde ligne « 🗣 Nom » donne celui qui parle)"
     ],
     [
      "🎲",
      "Note pour le MJ : jets, choix, conseils de jeu"
     ],
     [
      "🔴 ou 🔒",
      "Secret du MJ : listé dans l'outil Secrets"
     ],
     [
      "⚔️",
      "Combat, statistiques"
     ],
     [
      "🆕",
      "Alerte, nouvelle quête"
     ],
     [
      "✅  ·  ✉️",
      "Récompense  ·  lettre ou document remis aux joueurs"
     ],
     [
      "### Titre",
      "Début d'une scène"
     ],
     [
      "#### Titre",
      "Sous-titre dans une scène"
     ]
    ]
   },
   {
    "t": "h2",
    "x": "Les couleurs de l'écran Révélations"
   },
   {
    "t": "table",
    "entetes": [
     "Ce que tu vois",
     "Ce que ça veut dire"
    ],
    "lignes": [
     [
      "Trait orange à gauche d'une ligne",
      "Carte à révéler : personne ne l'a encore"
     ],
     [
      "Trait gris",
      "Révélée en partie : il manque des destinataires prévus"
     ],
     [
      "Trait vert",
      "Révélée à tous ceux qui devaient l'avoir"
     ],
     [
      "Case verte cochée",
      "Ce joueur l'a. Un clic la lui retire (avec confirmation)."
     ],
     [
      "Case en pointillés avec un +",
      "Ce joueur ne l'a pas. Un clic la lui donne."
     ],
     [
      "Case estompée",
      "Ce joueur n'était pas dans les destinataires prévus"
     ],
     [
      "Étiquette rouge « vérité MJ »",
      "La carte contient une vérité gardée au coffre"
     ]
    ]
   },
   {
    "t": "h2",
    "x": "Adresses et fichiers utiles"
   },
   {
    "t": "table",
    "entetes": [
     "Quoi",
     "Où"
    ],
    "lignes": [
     [
      "L'application",
      "https://youzforge.github.io/GAO/app/"
     ],
     [
      "Le dossier du jeu",
      "OneDrive : Documents / JDR / GAO - Application"
     ],
     [
      "Les règles du projet (pour Claude)",
      "00_REGLES_PROJET.md, à la racine du dossier du jeu : R23, R24, R25"
     ],
     [
      "Le format des fichiers (pour Claude)",
      "MJ / 07_Application / Contrat_de_format.md, §9"
     ],
     [
      "Les modèles",
      "MJ / 99_Modeles : Modele_Carte_revelation.md, Modele_Compte_rendu_journal.md, Modele_Session.md"
     ],
     [
      "Le journal de tout ce qui a été révélé",
      "MJ / 04_Revelations / Journal_des_revelations.md"
     ],
     [
      "Le mode d'emploi technique",
      "REGIE_MJ.md, dans le dépôt de l'application"
     ],
     [
      "Le code et le banc d'essai",
      "PC : OneDrive / Claude CODE / GAO-depot"
     ]
    ]
   }
  ]
 }
];
