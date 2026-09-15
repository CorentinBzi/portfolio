// Cache de tuiles d'un plan : 512 px CSS de large, rendues à la demande autour de la vue.
// Un seul canvas visible ; les tuiles hors de [vue − 3 tuiles, vue + 3 tuiles] sont libérées.

import { etendue } from './niveaux-carte.js';

const LARGEUR_CSS = 512;
const RECOUVREMENT_CSS = 2;
const GARDE = 3;
const REDUCTION = 1.5;

export function creerTuiles({ plan, modele, mobile = false, budgetOctets }) {
  const cache = new Map();
  const [xDebut, xFin] = etendue(plan.id);
  const budget = budgetOctets || (mobile ? 48 : 96) * 1024 * 1024 / 6;
  let eCache = 0;
  let dprCache = 0;
  let reduction = 1;

  function dprTuile(dpr) {
    const plafond = mobile ? 1 : 1.5;
    return (Math.min(dpr, plafond) * (plan.resolution || 1)) / reduction;
  }

  function octets() {
    let n = 0;
    for (const t of cache.values()) n += t.canvas.width * t.canvas.height * 4;
    return n;
  }

  function vider() {
    for (const t of cache.values()) { t.canvas.width = 0; t.canvas.height = 0; }
    cache.clear();
  }

  function rendre(i, e, dpr) {
    const [y0, y1] = plan.bande;
    const lt = LARGEUR_CSS / e;
    const x0 = i * lt;
    const pad = RECOUVREMENT_CSS / e;
    const k = e * dprTuile(dpr);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.ceil((lt + pad) * k));
    canvas.height = Math.max(1, Math.ceil((y1 - y0) * k));
    const c = canvas.getContext('2d');
    c.setTransform(k, 0, 0, k, -x0 * k, -y0 * k);
    plan.dessinerTuile(c, modele, x0 - 4, x0 + lt + pad + 4, e);
    const tuile = { canvas, x0, y0, largeur: canvas.width / k, hauteur: canvas.height / k };
    cache.set(i, tuile);
    return tuile;
  }

  return {
    // ctx est déjà dans le repère du plan (unités du monde).
    dessiner(ctx, { e, dpr, xMin, xMax, maxNouvelles = 2, synchrone = false }) {
      if (e !== eCache || dpr !== dprCache) { vider(); eCache = e; dprCache = dpr; }
      const lt = LARGEUR_CSS / e;
      const iMin = Math.floor(Math.max(xMin, xDebut - lt) / lt);
      const iMax = Math.floor(Math.min(xMax, xFin + lt) / lt);
      let nouvelles = 0;
      let manquantes = 0;
      for (let i = iMin - 1; i <= iMax + 1; i++) {
        if ((i + 1) * lt < xDebut || i * lt > xFin) continue;
        let t = cache.get(i);
        const visible = i >= iMin && i <= iMax;
        if (!t && (synchrone || nouvelles < maxNouvelles || (visible && nouvelles < maxNouvelles + 2))) {
          t = rendre(i, e, dpr);
          nouvelles++;
        }
        if (!t) { if (visible) manquantes++; continue; }
        if (visible) ctx.drawImage(t.canvas, t.x0, t.y0, t.largeur, t.hauteur);
      }
      for (const i of cache.keys()) {
        if (i < iMin - GARDE || i > iMax + GARDE) {
          const t = cache.get(i);
          t.canvas.width = 0;
          cache.delete(i);
        }
      }
      if (octets() > budget && reduction < 3) { reduction *= REDUCTION; vider(); }
      return manquantes;
    },
    invalider() { vider(); eCache = 0; },
    vider,
    octets,
  };
}
