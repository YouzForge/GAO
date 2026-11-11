// Tests : fenêtre « Créer les fiches de ce document » (0.26.4) — encadrés d'aide de jeu non repérés. Textes inventés.   node --test tests/
import test from "node:test";
import assert from "node:assert/strict";
import { detecterFiches } from "../src/import/fiches.js";

const doc = `# Le port

## Déroulé des scènes

### II — LIBÉRER TOM

⚔️ **Fiche**

**📦  Réponses de Tom selon le sujet**

**Sur le phare :** « Je n'ai rien vu. »

⚔️ **Fiche**

**📦  Tablette de cuivre — objet remis par Mira**

Une tablette gravée.
`;

test("un encadré 📦 d'aide de jeu (« Réponses de… ») n'est pas une fiche ; un vrai objet, si", () => {
  const f = detecterFiches(doc);
  assert.deepEqual(f.map(x => x.nom), ["Tablette de cuivre"]);
  assert.equal(f[0].genre, "objet");
});
