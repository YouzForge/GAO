// Tests du repère « Nouveau » côté joueur.   node --test tests/
import test from "node:test";
import assert from "node:assert/strict";
import { creerNouveautes } from "../src/joueur/nouveautes.js";

const stockage = () => { const m = new Map(); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) }; };

test("nouveau : seulement ce que la régie a daté, jusqu'à l'ouverture", () => {
  const s = stockage();
  const n = creerNouveautes(s, "cle");
  const ancien = { zone: "savoirs", fichier: "01_A.md", meta: {} };
  const neuf = { zone: "savoirs", fichier: "41_B.md", meta: { revele_le: "2026-01-02" } };
  assert.equal(n.estNouveau(ancien), false);
  assert.equal(n.estNouveau(neuf), true);
  assert.equal(n.compter([ancien, neuf]), 1);
  assert.equal(n.marquerVu(neuf), true);
  assert.equal(n.marquerVu(neuf), false);
  assert.equal(n.estNouveau(neuf), false);
  // gardé sur l'appareil : un autre passage le sait encore
  assert.equal(creerNouveautes(s, "cle").estNouveau(neuf), false);
  // un autre joueur (autre clé) n'a rien vu ; une mise à jour (nouvelle date) redevient nouvelle
  assert.equal(creerNouveautes(s, "autre").estNouveau(neuf), true);
  assert.equal(n.estNouveau({ ...neuf, meta: { revele_le: "2026-02-01" } }), true);
});

test("nouveau : un stockage absent ou abîmé ne casse rien", () => {
  assert.equal(creerNouveautes(null, "c").estNouveau({ zone: "quetes", fichier: "x.md", meta: { revele_le: "2026-01-01" } }), true);
  const s = stockage(); s.setItem("c", "pas du json");
  const n = creerNouveautes(s, "c");
  assert.equal(n.marquerVu({ zone: "quetes", fichier: "x.md", meta: { revele_le: "2026-01-01" } }), true);
});
