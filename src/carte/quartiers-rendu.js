// Rendu des quartiers : partie statique en sprite (une fois par échelle), halo, contour
// d'accent, voile « en maintenance », puis la partie vivante de chaque module.

import { rgba } from './dessin.js';
import ecole from './quartiers/ecole.js';
import medline from './quartiers/medline.js';
import thales from './quartiers/thales.js';
import albys from './quartiers/albys.js';
import independant from './quartiers/independant.js';
import digitalrealty from './quartiers/digitalrealty.js';
import scenario from './quartiers/scenario.js';

const MODULES = Object.freeze({ ecole, medline, thales, albys, independant, digitalrealty, scenario });
const MARGE = 60;
const MARGE_BAS = 40;

export function creerQuartiers({ journal = () => {} } = {}) {
  const sprites = new Map();

  function sprite(q, e, dpr) {
    const cle = `${q.id}:${e.toFixed(4)}:${dpr}`;
    const existant = sprites.get(q.id);
    if (existant && existant.cle === cle) return existant;
    const m = MODULES[q.id];
    const k = q.s * e * Math.min(dpr, 2);
    const largeur = (2 * m.demiLargeur + 2 * MARGE) * k;
    const hauteur = (m.hauteur + MARGE + MARGE_BAS) * k;
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.ceil(largeur));
    canvas.height = Math.max(1, Math.ceil(hauteur));
    const c = canvas.getContext('2d');
    c.setTransform(k, 0, 0, k, (m.demiLargeur + MARGE) * k, (m.hauteur + MARGE) * k);
    try {
      m.dessinerStatique(c, q.s);
    } catch (err) {
      journal(`QUARTIER ${q.id} statique : ${err.message}`);
    }
    const s = { cle, canvas, k };
    if (existant) existant.canvas.width = 0;
    sprites.set(q.id, s);
    return s;
  }

  return {
    module: (id) => MODULES[id],

    // ctx est dans le repère du plan (unités du monde).
    dessiner(ctx, q, { e, dpr, t, etat }) {
      const m = MODULES[q.id];
      if (!m) return;
      const sp = sprite(q, e, dpr);
      const lum = etat.mode === 'indispo' ? 0.25 : etat.mode === 'ajouer' ? 0.7 : 1;
      ctx.save();
      ctx.translate(q.X, q.base);
      ctx.scale(q.s, q.s);
      const r = Math.max(m.demiLargeur, m.hauteur * 0.55) * 1.25;
      const halo = (etat.mode === 'gagne' ? 0.34 : etat.mode === 'selection' ? 0.3 : 0.14) + (etat.survol ? 0.12 : 0);
      if (etat.mode !== 'indispo') {
        const g = ctx.createRadialGradient(0, -m.hauteur * 0.45, 0, 0, -m.hauteur * 0.45, r);
        g.addColorStop(0, rgba(q.accent, halo));
        g.addColorStop(0.55, rgba(q.accent, halo * 0.35));
        g.addColorStop(1, rgba(q.accent, 0));
        ctx.fillStyle = g;
        ctx.fillRect(-r, -m.hauteur * 0.45 - r, 2 * r, 2 * r);
      }
      ctx.drawImage(sp.canvas, -(m.demiLargeur + MARGE), -(m.hauteur + MARGE), sp.canvas.width / sp.k, sp.canvas.height / sp.k);
      if (m.silhouette) {
        ctx.beginPath();
        m.silhouette(ctx);
        if (etat.mode === 'indispo') {
          ctx.fillStyle = 'rgba(150,154,190,.45)';
          ctx.fill();
        } else {
          const px = 1 / (e * q.s);
          ctx.strokeStyle = rgba(q.accent, lum);
          ctx.lineWidth = (etat.mode === 'selection' || etat.survol ? 3 : 2.2) * px;
          ctx.lineJoin = 'round';
          ctx.stroke();
          ctx.strokeStyle = rgba(q.accent, lum * 0.25);
          ctx.lineWidth = 9 * px;
          ctx.stroke();
        }
      }
      try {
        m.animer(ctx, t, q.s, { ...etat, px: 1 / (e * q.s) });
      } catch (err) {
        journal(`QUARTIER ${q.id} animer : ${err.message}`);
        m.animer = () => {};
      }
      ctx.restore();
    },

    invalider() {
      for (const s of sprites.values()) s.canvas.width = 0;
      sprites.clear();
    },
  };
}
