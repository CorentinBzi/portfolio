// Le guichet (medline) : immeuble vitré de cinq étages, comptoir SUPPORT éclairé, file qui avance,
// bulles de tickets qui éclatent en ✓, enseigne-bulle « ? » qui devient « ✓ » toutes les 4 s.

import { rgba, rect, disque, halo, texte, arrondi, grilleFenetres, POLICE_MONO } from '../dessin.js';
import { creerAlea } from '../alea.js';
import { fenetresAnimees, lumiere } from './_commun.js';

const DL = 125;
const H = 300;
const L = 108;
const ETAGE = 48;
const NB_ETAGES = 5;
const ACCENT = '#8FB4D6';
const alea = creerAlea(1807);
const FENETRES = grilleFenetres(alea, { x: -L + 8, y: -ETAGE * NB_ETAGES + 8, w: 2 * L - 16, h: ETAGE * (NB_ETAGES - 1) - 8, cols: 10, rows: 8, taux: 0.78, pFroide: 0.45, marge: 0.12 });
const PERIODE_FILE = 5200;
const PERIODE_ENSEIGNE = 4000;

export default {
  id: 'medline', demiLargeur: DL, hauteur: H,

  silhouette(ctx) {
    ctx.rect(-L, -ETAGE * NB_ETAGES - 10, 2 * L, ETAGE * NB_ETAGES + 10);
  },

  dessinerStatique(ctx) {
    const haut = -ETAGE * NB_ETAGES;
    rect(ctx, -L, haut - 10, 2 * L, ETAGE * NB_ETAGES + 10, '#2F3570');
    const g = ctx.createLinearGradient(-L, 0, L, 0);
    g.addColorStop(0, '#5664B4');
    g.addColorStop(0.45, '#3E478E');
    g.addColorStop(1, '#333A7C');
    ctx.fillStyle = g;
    ctx.fillRect(-L + 6, haut, 2 * L - 12, ETAGE * (NB_ETAGES - 1));
    for (const f of FENETRES) rect(ctx, f.x, f.y, f.w, f.h, 'rgba(26,31,77,.55)');
    for (let k = 0; k <= NB_ETAGES; k++) rect(ctx, -L, haut + k * ETAGE - 2, 2 * L, 3, '#262C66');
    for (let k = 0; k <= 10; k++) rect(ctx, -L + 6 + (k * (2 * L - 12)) / 10, haut, 1.5, ETAGE * (NB_ETAGES - 1), 'rgba(22,26,64,.6)');
    rect(ctx, -L, haut - 10, 2 * L, 2.5, rgba('#FFB38A', 0.75));
    rect(ctx, -L + 14, haut - 22, 40, 12, '#262C66');
    rect(ctx, L - 60, haut - 18, 30, 8, '#262C66');
    const rdc = -ETAGE;
    rect(ctx, -L + 4, rdc, 2 * L - 8, ETAGE, '#1A1F4D');
    const gi = ctx.createLinearGradient(0, rdc, 0, 0);
    gi.addColorStop(0, 'rgba(255,217,154,.55)');
    gi.addColorStop(1, 'rgba(255,217,154,.18)');
    ctx.fillStyle = gi;
    ctx.fillRect(-L + 10, rdc + 14, 2 * L - 20, ETAGE - 14);
    rect(ctx, -L - 12, rdc - 3, 2 * L + 24, 5, '#454C92');
    rect(ctx, -L - 12, rdc - 3, 2 * L + 24, 1.5, rgba(ACCENT, 0.9));
    arrondi(ctx, -44, rdc + 2, 88, 14, 3);
    ctx.fillStyle = '#141A44';
    ctx.fill();
    ctx.strokeStyle = ACCENT;
    ctx.lineWidth = 1.2;
    ctx.stroke();
    texte(ctx, 'SUPPORT', 0, rdc + 9.5, { taille: 10, poids: 600, couleur: ACCENT, police: POLICE_MONO });
    rect(ctx, -60, -16, 120, 10, ACCENT);
    rect(ctx, -60, -16, 120, 2, '#DDE8F5');
    rect(ctx, L - 44, rdc + 16, 30, ETAGE - 16, '#2A3070');
  },

  animer(ctx, t, s, etat) {
    fenetresAnimees(ctx, FENETRES, etat, { rangs: 8, t, graine: 11 });
    const lum = lumiere(etat);
    const haut = -ETAGE * NB_ETAGES;
    halo(ctx, 0, -10, 90, '#FFD99A', 0.25 * lum);
    for (let k = 0; k < 3; k++) {
      const x = -34 + k * 34;
      rect(ctx, x - 3, -30, 6, 14, '#1F2458');
      disque(ctx, x, -33, 3.2, '#1F2458');
      rect(ctx, x - 6, -24, 3, 2, '#9FE8FF');
    }
    const u = etat.reduit ? 0.4 : (t % PERIODE_FILE) / PERIODE_FILE;
    for (let k = 0; k < 4; k++) {
      const pos = k + u;
      const x = -L - 10 - (4 - pos) * 18 + 18;
      if (x > -L + 6) continue;
      const y = 0;
      rect(ctx, x - 3.5, y - 18, 7, 18, '#1A1F4D');
      disque(ctx, x, y - 22, 4, '#1A1F4D');
    }
    for (let k = 0; k < 3; k++) {
      const p = etat.reduit ? 0.3 + k * 0.2 : ((t / 3600 + k / 3) % 1);
      const bx = -20 + k * 26 + Math.sin(p * 6 + k) * 6;
      const by = -40 - p * 150;
      if (p < 0.78) {
        arrondi(ctx, bx - 11, by - 7, 22, 14, 5);
        ctx.fillStyle = rgba('#EEF1FF', 0.9 * (1 - p * 0.4) * lum);
        ctx.fill();
        for (let l = 0; l < 2; l++) rect(ctx, bx - 7, by - 3 + l * 4, 14 - l * 5, 1.5, rgba('#232A5E', 0.8));
      } else {
        const e = (p - 0.78) / 0.22;
        halo(ctx, bx, by, 14 + e * 10, '#6FCF8E', 0.7 * (1 - e));
        texte(ctx, '✓', bx, by, { taille: 13, poids: 700, couleur: rgba('#6FCF8E', 1 - e * 0.6), police: POLICE_MONO });
      }
    }
    const resolu = etat.reduit ? true : (t % (PERIODE_ENSEIGNE * 2)) >= PERIODE_ENSEIGNE;
    const ex = L - 34, ey = haut - 44;
    halo(ctx, ex, ey, 46, resolu ? '#6FCF8E' : ACCENT, 0.45 * lum);
    ctx.beginPath();
    ctx.arc(ex, ey, 22, 0, Math.PI * 2);
    ctx.moveTo(ex - 10, ey + 18);
    ctx.lineTo(ex - 18, ey + 30);
    ctx.lineTo(ex - 2, ey + 21);
    ctx.fillStyle = '#EEF1FF';
    ctx.fill();
    ctx.strokeStyle = resolu ? '#6FCF8E' : ACCENT;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    texte(ctx, resolu ? '✓' : '?', ex, ey + 1, { taille: 24, poids: 700, couleur: resolu ? '#2E8A52' : '#34507A', police: POLICE_MONO });
    rect(ctx, ex - 1, haut - 20, 2, 10, '#262C66');
  },
};
