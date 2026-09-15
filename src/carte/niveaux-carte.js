// Géographie de la carte : plans, lignes de base, placement des quartiers et
// règle de dégagement (spec §3.2) qui garde chaque quartier lointain lisible.

import { echelleDessin } from './camera.js';

export const PLANS = Object.freeze({
  ciel: { id: 'ciel', facteur: 0, base: null, bande: [0, 600] },
  horizon: { id: 'horizon', facteur: 0.18, base: 560, bande: [80, 600] },
  usages: { id: 'usages', facteur: 0.46, base: 690, bande: [360, 720] },
  donnees: { id: 'donnees', facteur: 0.62, base: 770, bande: [480, 790] },
  reseau: { id: 'reseau', facteur: 0.8, base: 850, bande: [500, 870] },
  socle: { id: 'socle', facteur: 1, base: 930, bande: [560, 1000] },
  'premier-plan': { id: 'premier-plan', facteur: 1.35, base: 1000, bande: [880, 1000] },
  particules: { id: 'particules', facteur: 1.6, base: null, bande: [0, 1000] },
});

export const COUCHE_VERS_PLAN = Object.freeze({
  modele: 'ciel', sites: 'horizon', usages: 'usages', donnees: 'donnees', reseau: 'reseau', socle: 'socle',
});

export const PLAN_VERS_COUCHE = Object.freeze({
  ciel: 'modele', horizon: 'sites', usages: 'usages', donnees: 'donnees', reseau: 'reseau', socle: 'socle',
  'premier-plan': 'socle', particules: 'modele',
});

// Encombrement des quartiers en unités locales (avant l'échelle s du plan).
export const GABARITS = Object.freeze({
  ecole: { demiLargeur: 240, hauteur: 330 },
  medline: { demiLargeur: 125, hauteur: 300 },
  thales: { demiLargeur: 175, hauteur: 270 },
  albys: { demiLargeur: 205, hauteur: 250 },
  independant: { demiLargeur: 115, hauteur: 380 },
  digitalrealty: { demiLargeur: 250, hauteur: 260 },
  scenario: { demiLargeur: 75, hauteur: 700 },
});

export const NB_CAMPUS_DC = 5;
export const MARGE_DEGAGEMENT = 80;
export const TOLERANCE_DEGAGEMENT = 40;

// Un quartier du plan f à la station c est dessiné en X = c·f.
export function placements(niveaux) {
  return niveaux.map((n) => {
    const planId = COUCHE_VERS_PLAN[n.couche];
    const plan = PLANS[planId];
    const g = GABARITS[n.id] || { demiLargeur: 150, hauteur: 250 };
    return Object.freeze({
      id: n.id, plan: planId, facteur: plan.facteur, base: plan.base, station: n.station,
      X: n.station * plan.facteur, s: echelleDessin(plan.facteur),
      demiLargeur: g.demiLargeur, hauteur: g.hauteur, accent: n.accent,
    });
  });
}

// Zones où le décor du plan `planId` doit rester bas pour laisser voir un quartier plus lointain.
export function degagements(planId, liste) {
  const plan = PLANS[planId];
  if (!plan || plan.base === null) return [];
  return liste
    .filter((q) => q.facteur < plan.facteur)
    .map((q) => {
      const demi = q.demiLargeur * q.s + MARGE_DEGAGEMENT;
      const centre = q.station * plan.facteur;
      return Object.freeze({ id: q.id, x0: centre - demi, x1: centre + demi, hMax: plan.base - q.base + TOLERANCE_DEGAGEMENT });
    });
}

// Vues dégagées : les cinq campus DC de l'horizon restent visibles depuis la station du poste de sécurité.
export const VUES_DEGAGEES = Object.freeze([{ id: 'campus-dc', station: 3500, base: 560, demi: 300 }]);

export function degagementsVues(planId) {
  const plan = PLANS[planId];
  if (!plan || plan.base === null || plan.facteur <= PLANS.horizon.facteur || plan.facteur > 1) return [];
  return VUES_DEGAGEES.map((v) => Object.freeze({
    id: v.id, x0: v.station * plan.facteur - v.demi, x1: v.station * plan.facteur + v.demi, hMax: plan.base - v.base - 6,
  }));
}

// Hauteur maximale autorisée pour un élément de décor couvrant [x0, x1] (Infinity si libre).
export function hauteurPermise(zones, x0, x1) {
  let h = Infinity;
  for (const z of zones) if (x1 > z.x0 && x0 < z.x1) h = Math.min(h, z.hMax);
  return h;
}

// Emprises des quartiers posés sur ce plan (pour que le décor ne les chevauche pas).
export function emprises(planId, liste, marge = 30) {
  return liste
    .filter((q) => q.plan === planId)
    .map((q) => ({ id: q.id, x0: q.X - q.demiLargeur * q.s - marge, x1: q.X + q.demiLargeur * q.s + marge }));
}

export function libre(zones, x0, x1) {
  return !zones.some((z) => x1 > z.x0 && x0 < z.x1);
}

export function etendue(planId) {
  const f = PLANS[planId].facteur;
  return [-1400, 4200 * f + 1400];
}
