// Caméra de la carte : fonctions pures (spec §3.1).
// xÉcran = (X − c·f)·e + L/2 + inclinaisonX·f
// yÉcran = H − (1000 − Y)·e + inclinaisonY·f + decalageFiche·f

export const MONDE_H = 1000;
export const CAMERA_MAX = 4200;
export const ECHELLE_MIN = 0.55;
export const ECHELLE_MAX = 1.25;
const FRICTION = 0.92;
const IMAGE_MS = 1000 / 60;
const COMPRESSION = 0.35;

const borne = (v, a, b) => Math.min(b, Math.max(a, v));

export function echelle(hauteurFenetre, hauteurBarre) {
  return borne((Number(hauteurFenetre) - Number(hauteurBarre || 0)) / MONDE_H, ECHELLE_MIN, ECHELLE_MAX);
}

export function echelleDessin(facteur) {
  return 0.55 + 0.45 * Math.min(facteur, 1);
}

// Mouvement réduit : les facteurs sont comprimés vers 1, relativement à la station
// ancrée (la sélection), pour que chaque quartier reste centré à sa station.
export function facteurReduit(facteur) {
  return 1 + (facteur - 1) * COMPRESSION;
}

export function decalageMonde({ facteur, camera, ancre = camera, reduit = false }) {
  if (!reduit || facteur === 0) return camera * facteur;
  return ancre * facteur + (camera - ancre) * facteurReduit(facteur);
}

// Transformation affine d'un plan : xÉcran = a·X + tx ; yÉcran = a·Y + ty.
export function transformePlan({ facteur, camera, e, largeur, hauteur, inclinaison, decalageFiche = 0, ancre, reduit = false }) {
  const ix = inclinaison ? inclinaison.x : 0;
  const iy = inclinaison ? inclinaison.y : 0;
  const o = decalageMonde({ facteur, camera, ancre, reduit });
  return {
    a: e,
    tx: largeur / 2 + ix * facteur - o * e,
    ty: hauteur - MONDE_H * e + iy * facteur + decalageFiche * facteur,
  };
}

export function projeter(p) {
  const t = transformePlan(p);
  return { x: t.a * p.X + t.tx, y: t.a * p.Y + t.ty };
}

export function borner(camera) {
  return borne(camera, 0, CAMERA_MAX);
}

export function aimanter(camera, stations) {
  let meilleure = stations[0];
  for (const s of stations) if (Math.abs(s - camera) < Math.abs(meilleure - camera)) meilleure = s;
  return meilleure;
}

// Inertie : vitesse en u/ms, friction 0,92 par image de 16,7 ms.
export function inertie({ camera, vitesse }, dtMs) {
  const v = vitesse * Math.pow(FRICTION, dtMs / IMAGE_MS);
  const c = camera + v * dtMs;
  const cb = borner(c);
  return { camera: cb, vitesse: cb === c ? v : 0 };
}

export function sortieDouce(t) {
  const u = borne(t, 0, 1);
  return 1 - Math.pow(1 - u, 3);
}

export function entreeSortie(t) {
  const u = borne(t, 0, 1);
  return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
}
