# GAO

Application de jeu de rôle (site statique, GitHub Pages). Ce dépôt ne contient que du **code** : aucun contenu de jeu, qui reste dans le OneDrive du meneur.

## Ce dépôt est une copie générée

Le code de `src/`, `lib/`, `app/`, `outils/serveur_local.mjs` et `REGIE_MJ.md` est **produit par le dépôt du moteur** (`jdr-moteur`, privé) avec son outil `outils/deployer.mjs`. **Ne modifie rien ici à la main** : le prochain déploiement l'écraserait. Les changements se font dans le moteur, puis sont déployés ici.

Seuls deux fichiers appartiennent à ce dépôt et ne sont jamais écrasés par le déploiement :

- `app/config.js` : la configuration publique (identifiant de l'application, empreinte du meneur, écriture ouverte ou non) ;
- `app/profil.json` : le profil du jeu (collections, champs, modules), sans aucun nom de personnage, de lieu ou d'intrigue.

Les tests vivent dans le moteur. Mode d'emploi de l'écran du meneur : `REGIE_MJ.md`.
