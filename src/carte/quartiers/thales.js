// Le tableau de bord (thales) : six silos de verre dont le liquide passe du teal à l'ambre, passerelle de
// supervision, grand mur-écran qui trace des courbes et une tendance en pointillés, discret collecte.py.

import { rgba, melange, rect, disque, halo, texte, silo, liquide, trait, grilleFenetres, POLICE_MONO } from '../dessin.js';
import { creerAlea } from '../alea.js';
import { fenetresAnimees, lumiere } from './_commun.js';

const DL = 175;
const H = 270;
const ACCENT = '#3EE0C0';
const SILOS = [0, 1, 2, 3, 4, 5].map((i) => ({ x: -152 + i * 38, r: 15, h: [150, 138, 162, 146, 156, 140][i] }));
const PASSERELLE = -178;
const TOUR = { x0: 66, x1: 170, haut: -262 };
const ECRAN = { x: 76, y: -252, w: 86, h: 70 };
const alea = creerAlea(2020);
const FENETRES = grilleFenetres(alea, { x: TOUR.x0 + 8, y: -170, w: TOUR.x1 - TOUR.x0 - 16, h: 110, cols: 6, rows: 6, taux: 0.7, pFroide: 0.6 });
const COURBES = ['#3EE0C0', '#FFB86B', '#9FE8FF', '#FF6FD8'];

function niveauSilo(i, t, reduit) {
  const base = [0.5, 0.72, 0.38, 0.86, 0.62, 0.45][i];
  return reduit ? base : Math.min(0.96, base + 0.12 * Math.sin(t / 6500 + i * 1.7));
}

export default {
  id: 'thales', demiLargeur: DL, hauteur: H,

  silhouette(ctx) {
    ctx.moveTo(-DL, 0);
    ctx.lineTo(-DL, PASSERELLE - 6);
    ctx.lineTo(TOUR.x0, PASSERELLE - 6);
    ctx.lineTo(TOUR.x0, TOUR.haut);
    ctx.lineTo(TOUR.x1, TOUR.haut);
    ctx.lineTo(TOUR.x1, 0);
    ctx.closePath();
  },

  dessinerStatique(ctx) {
    rect(ctx, -DL, -10, 2 * DL, 10, '#454C92');
    rect(ctx, -DL, -10, 2 * DL, 1.5, rgba('#7BE8A8', 0.5));
    for (const s of SILOS) silo(ctx, { x: s.x, base: -10, r: s.r, h: s.h, verre: '#7887D4', metal: '#262C66', lueur: 0.4 });
    rect(ctx, -DL, PASSERELLE, TOUR.x0 + DL, 5, '#262C66');
    ctx.beginPath();
    for (let x = -DL; x <= TOUR.x0; x += 12) { ctx.moveTo(x, PASSERELLE); ctx.lineTo(x, PASSERELLE - 12); }
    ctx.moveTo(-DL, PASSERELLE - 12);
    ctx.lineTo(TOUR.x0, PASSERELLE - 12);
    ctx.strokeStyle = '#262C66';
    ctx.lineWidth = 1.3;
    ctx.stroke();
    for (const s of SILOS) trait(ctx, s.x, -10 - s.h, s.x, PASSERELLE + 5, '#262C66', 1.6);
    rect(ctx, TOUR.x0, TOUR.haut, TOUR.x1 - TOUR.x0, -TOUR.haut, '#2F3570');
    rect(ctx, TOUR.x0, TOUR.haut, 5, -TOUR.haut, '#454C92');
    rect(ctx, TOUR.x0, TOUR.haut, TOUR.x1 - TOUR.x0, 2.5, rgba('#FFB38A', 0.7));
    for (const f of FENETRES) rect(ctx, f.x, f.y, f.w, f.h, 'rgba(22,26,64,.7)');
    rect(ctx, ECRAN.x - 4, ECRAN.y - 4, ECRAN.w + 8, ECRAN.h + 8, '#1A1F4D');
    rect(ctx, ECRAN.x, ECRAN.y, ECRAN.w, ECRAN.h, '#10163C');
    rect(ctx, 96, -52, 46, 42, '#232A5E');
    for (let k = 0; k < 5; k++) rect(ctx, 99, -48 + k * 7, 40, 5, '#1A1F4D');
    texte(ctx, 'collecte.py', 119, -58, { taille: 8, poids: 500, couleur: 'rgba(159,232,255,.75)', police: POLICE_MONO });
  },

  animer(ctx, t, s, etat) {
    const lum = lumiere(etat);
    SILOS.forEach((si, i) => {
      const niveau = niveauSilo(i, t, etat.reduit);
      const couleur = niveau >= 0.95 ? '#E8503A' : melange('#3EE0C0', '#FFB86B', Math.max(0, Math.min(1, (niveau - 0.5) / 0.4)));
      liquide(ctx, { x: si.x, base: -12, r: si.r, h: si.h - 4, niveau, couleur, t: etat.reduit ? 0 : t });
      if (!etat.reduit) {
        for (let k = 0; k < 3; k++) {
          const u = ((t / 1600 + k / 3 + i * 0.13) % 1);
          disque(ctx, si.x + (k - 1) * 5, -12 - (si.h - 8) * niveau * u, 1.1, rgba('#FFFFFF', 0.7 * (1 - u)));
        }
        const d = ((t / 1100 + i * 0.21) % 1);
        disque(ctx, si.x + (TOUR.x0 - si.x) * d, PASSERELLE + 2, 1.6, rgba(ACCENT, 0.95));
      }
    });
    fenetresAnimees(ctx, FENETRES, etat, { rangs: 6, t, froide: '#9FE8FF', graine: 5 });
    halo(ctx, ECRAN.x + ECRAN.w / 2, ECRAN.y + ECRAN.h / 2, 80, ACCENT, 0.22 * lum);
    ctx.save();
    ctx.beginPath();
    ctx.rect(ECRAN.x, ECRAN.y, ECRAN.w, ECRAN.h);
    ctx.clip();
    ctx.fillStyle = 'rgba(62,224,192,.08)';
    for (let k = 1; k < 4; k++) ctx.fillRect(ECRAN.x, ECRAN.y + (ECRAN.h * k) / 4, ECRAN.w, 0.8);
    const avance = etat.reduit ? 1 : ((t / 5000) % 1);
    COURBES.forEach((c, k) => {
      ctx.beginPath();
      const n = 24;
      const fin = Math.max(2, Math.floor(n * (0.25 + 0.75 * avance)));
      for (let i = 0; i <= fin; i++) {
        const x = ECRAN.x + 3 + ((ECRAN.w - 6) * i) / n;
        const base = 0.25 + k * 0.17;
        const y = ECRAN.y + ECRAN.h * (0.92 - base - 0.12 * Math.sin(i * 0.6 + k * 2) - (k === 1 ? i * 0.012 : 0));
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = rgba(c, 0.95 * lum);
      ctx.lineWidth = 1.4;
      ctx.stroke();
    });
    ctx.setLineDash([3, 3]);
    trait(ctx, ECRAN.x + ECRAN.w * 0.5, ECRAN.y + ECRAN.h * 0.42, ECRAN.x + ECRAN.w, ECRAN.y + ECRAN.h * 0.08, rgba('#FFB86B', 0.95), 1.2);
    ctx.setLineDash([]);
    ctx.restore();
    texte(ctx, 'J+12', ECRAN.x + ECRAN.w - 14, ECRAN.y + 9, { taille: 7.5, poids: 600, couleur: '#FFB86B', police: POLICE_MONO });
    for (let k = 0; k < 5; k++) {
      const on = etat.reduit || ((t + k * 190) % 1000) < 650;
      disque(ctx, 136, -46 + k * 7, 1.2, on ? (k === 2 ? '#FFB86B' : ACCENT) : '#1A1F4D');
    }
  },
};
