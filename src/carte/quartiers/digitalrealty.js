// Le poste de sécurité (digitalrealty) : hall de data center en coupe (rangées de baies à LED), portiques
// à badge (une silhouette passe toutes les 6 s), mâts de caméras à cône de balayage, clôture, mur d'écrans.

import { rgba, rect, disque, halo, trait, grilleFenetres } from '../dessin.js';
import { creerAlea } from '../alea.js';
import { fenetresAnimees, lumiere } from './_commun.js';

const DL = 250;
const H = 260;
const ACCENT = '#5AA9E6';
const HALL = { x0: -36, x1: 240, haut: -176 };
const POSTE = { x0: -176, x1: -52, haut: -96 };
const alea = creerAlea(2025);
const BAIES = [];
for (let r = 0; r < 3; r++) {
  for (let k = 0; k < 8; k++) {
    const x = HALL.x0 + 18 + k * 27 + r * 6;
    const y = -150 + r * 46;
    BAIES.push({ x, y, w: 20, h: 38, leds: Array.from({ length: 6 }, () => ({ c: alea.chance(0.15) ? '#FFB86B' : alea.chance(0.5) ? '#7CF3FF' : '#6FCF8E', p: alea.entre(0, 1400) })) });
  }
}
const FENETRES = grilleFenetres(alea, { x: POSTE.x0 + 8, y: POSTE.haut + 10, w: 50, h: 40, cols: 3, rows: 2, taux: 1, pFroide: 0.5 });
const PASSAGE_MS = 6000;
const MATS = [{ x: -44, h: 222, phase: 0 }, { x: 236, h: 206, phase: 2.2 }];

export default {
  id: 'digitalrealty', demiLargeur: DL, hauteur: H,

  silhouette(ctx) {
    const pts = [[-DL, 0], [-DL, -48], [POSTE.x0, -48], [POSTE.x0, POSTE.haut], [HALL.x0, POSTE.haut], [HALL.x0, HALL.haut - 12], [HALL.x1, HALL.haut - 12], [HALL.x1, 0]];
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
  },

  dessinerStatique(ctx) {
    rect(ctx, -DL, -8, 2 * DL, 8, '#454C92');
    rect(ctx, HALL.x0, HALL.haut, HALL.x1 - HALL.x0, -HALL.haut - 8, '#2F3570');
    rect(ctx, HALL.x0, HALL.haut, HALL.x1 - HALL.x0, 3, rgba('#FFB38A', 0.7));
    for (let k = 0; k < 7; k++) {
      const x = HALL.x0 + 12 + k * 38;
      rect(ctx, x, HALL.haut - 14, 28, 14, '#3A4088');
      disque(ctx, x + 8, HALL.haut - 7, 4.5, '#262C66');
      disque(ctx, x + 20, HALL.haut - 7, 4.5, '#262C66');
    }
    const g = ctx.createLinearGradient(0, HALL.haut + 12, 0, -10);
    g.addColorStop(0, '#1C2254');
    g.addColorStop(1, '#2A3478');
    ctx.fillStyle = g;
    ctx.fillRect(HALL.x0 + 8, HALL.haut + 12, HALL.x1 - HALL.x0 - 16, -HALL.haut - 22);
    for (let r = 0; r < 3; r++) {
      rect(ctx, HALL.x0 + 8, -106 + r * 46, HALL.x1 - HALL.x0 - 16, 3, 'rgba(124,243,255,.28)');
      rect(ctx, HALL.x0 + 8, -158 + r * 46, HALL.x1 - HALL.x0 - 16, 2, '#39407E');
    }
    for (const b of BAIES) {
      rect(ctx, b.x, b.y, b.w, b.h, '#161B45');
      rect(ctx, b.x, b.y, b.w, 1.5, 'rgba(175,192,255,.5)');
      for (let k = 0; k < 6; k++) rect(ctx, b.x + 2, b.y + 4 + k * 5.6, b.w - 4, 4, '#232A5E');
    }
    rect(ctx, POSTE.x0, POSTE.haut, POSTE.x1 - POSTE.x0, -POSTE.haut - 8, '#343B7C');
    rect(ctx, POSTE.x0, POSTE.haut, POSTE.x1 - POSTE.x0, 3, rgba(ACCENT, 0.9));
    rect(ctx, POSTE.x0 + 64, POSTE.haut + 12, 50, 36, '#10163C');
    trait(ctx, POSTE.x0 + 30, POSTE.haut, POSTE.x0 + 30, POSTE.haut - 34, '#262C66', 1.6);
    rect(ctx, POSTE.x0 + 10, -32, 22, 24, '#1F2458');
    for (const x of [-236, -206]) {
      rect(ctx, x, -50, 4, 42, '#262C66');
      rect(ctx, x + 18, -50, 4, 42, '#262C66');
      rect(ctx, x, -52, 22, 4, '#262C66');
    }
    ctx.beginPath();
    for (let x = -DL; x <= DL; x += 16) { if (x > -242 && x < -180) continue; ctx.moveTo(x, -8); ctx.lineTo(x, -40); }
    ctx.moveTo(-180, -38); ctx.lineTo(DL, -38);
    ctx.moveTo(-180, -24); ctx.lineTo(DL, -24);
    ctx.strokeStyle = 'rgba(38,44,102,.95)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.beginPath();
    for (let x = -180; x < DL; x += 8) { ctx.moveTo(x, -38); ctx.lineTo(x + 8, -10); ctx.moveTo(x + 8, -38); ctx.lineTo(x, -10); }
    ctx.strokeStyle = 'rgba(38,44,102,.35)';
    ctx.lineWidth = 0.6;
    ctx.stroke();
    for (const m of MATS) {
      trait(ctx, m.x, -8, m.x, -m.h, '#262C66', 2.6);
      rect(ctx, m.x - 9, -m.h - 6, 18, 9, '#3A4088');
    }
  },

  animer(ctx, t, s, etat) {
    const lum = lumiere(etat);
    halo(ctx, (HALL.x0 + HALL.x1) / 2, -90, 150, ACCENT, 0.12 * lum);
    for (const b of BAIES) {
      b.leds.forEach((l, k) => {
        const on = etat.reduit || ((t + l.p) % 1400) < 900;
        rect(ctx, b.x + b.w - 5, b.y + 5 + k * 5.6, 2.4, 2, on ? rgba(l.c, lum) : '#232A5E');
        if (k % 2 === 0) rect(ctx, b.x + 3, b.y + 5 + k * 5.6, 6, 1.6, rgba('#7CF3FF', 0.35 * lum));
      });
    }
    fenetresAnimees(ctx, FENETRES, etat, { rangs: 2, t, chaude: '#9FE8FF', froide: '#7BE8A8', graine: 7 });
    const ecran = { x: POSTE.x0 + 64, y: POSTE.haut + 12 };
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 3; c++) {
        const x = ecran.x + 2 + c * 16, y = ecran.y + 2 + r * 17;
        const alerte = !etat.reduit && ((Math.floor(t / 1500) + r * 3 + c) % 11) === 0;
        rect(ctx, x, y, 14, 15, alerte ? rgba('#E8503A', 0.8) : rgba(c % 2 ? '#5AA9E6' : '#7BE8A8', 0.55 * lum));
        rect(ctx, x + 2, y + 3 + ((t / 400 + c) % 8), 10, 1.2, 'rgba(255,255,255,.5)');
      }
    }
    const u = etat.reduit ? 0.45 : (t % PASSAGE_MS) / PASSAGE_MS;
    const px = -262 + u * 90;
    const ouvert = px > -240 && px < -196;
    for (const x of [-236, -206]) disque(ctx, x + 11, -44, 2.4, ouvert ? '#6FCF8E' : '#E8503A');
    if (ouvert) halo(ctx, -214, -44, 20, '#6FCF8E', 0.5);
    rect(ctx, px - 4, -30, 8, 22, '#1A1F4D');
    disque(ctx, px, -35, 4.5, '#1A1F4D');
    rect(ctx, px + 3, -22, 3, 4, '#9FE8FF');
    for (const m of MATS) {
      const a = etat.reduit ? 0.6 : Math.PI / 2 + Math.sin(t / 2200 + m.phase) * 0.55;
      const lx = m.x + Math.cos(a) * 190, ly = -m.h + Math.sin(a) * 190;
      const g = ctx.createLinearGradient(m.x, -m.h, lx, ly);
      g.addColorStop(0, rgba('#9FE8FF', 0.32 * lum));
      g.addColorStop(1, rgba('#9FE8FF', 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(m.x, -m.h);
      ctx.lineTo(lx - Math.sin(a) * 40, ly + Math.cos(a) * 40);
      ctx.lineTo(lx + Math.sin(a) * 40, ly - Math.cos(a) * 40);
      ctx.closePath();
      ctx.fill();
      disque(ctx, m.x + 6, -m.h - 2, 1.8, ((t / 500) | 0) % 2 || etat.reduit ? '#E8503A' : '#5A2A3A');
    }
  },
};
