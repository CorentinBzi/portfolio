// Aides partagées par les sept quartiers : lumière selon l'état, cascade de victoire.

import { rgba } from '../dessin.js';
import { bruit } from '../alea.js';

export const CASCADE_MS = 1200;

export function lumiere(etat) {
  const base = { ajouer: 0.7, selection: 1, gagne: 1, indispo: 0.25 }[etat.mode] ?? 0.7;
  return Math.min(1, base * (etat.survol ? 1.1 : 1));
}

// Fenêtres qui s'allument en cascade après une victoire (du bas vers le haut, 1,2 s).
export function facteurCascade(etat, hauteurRelative) {
  if (etat.mode !== 'gagne' || etat.tGagne === null || etat.tGagne === undefined) return 1;
  const f = etat.tGagne / CASCADE_MS;
  if (f >= 1) return 1;
  return hauteurRelative <= f ? 1 : 0.2;
}

export function fenetresAnimees(ctx, liste, etat, { rangs, t = 0, chaude = '#FFD99A', froide = '#9FE8FF', graine = 1 }) {
  const L = lumiere(etat);
  const tick = etat.reduit ? 0 : Math.floor(t / 1100);
  for (const f of liste) {
    if (!f.allumee) continue;
    const h = rangs > 1 ? 1 - f.rang / (rangs - 1) : 1;
    let a = L * facteurCascade(etat, h);
    if (bruit(f.col * 31 + f.rang * 7 + graine, tick) < 0.04) a *= 0.45;
    ctx.fillStyle = rgba(f.froide ? froide : chaude, a);
    ctx.fillRect(f.x, f.y, f.w, f.h);
  }
}

export function pulsation(t, periode, reduit) {
  return reduit ? 0.5 : 0.5 + 0.5 * Math.sin((t / periode) * Math.PI * 2);
}
