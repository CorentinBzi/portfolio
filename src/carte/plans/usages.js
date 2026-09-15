// P2 · Baie & Usages : la mer (espace écran), le front de mer de bureaux, enseignes fictives,
// le pont et son monorail, bateaux, drones et écrans de code.

import { C, rgba, melange, rect, immeuble, trait, halo, disque, texte, arrondi, POLICE_MONO } from '../dessin.js';
import { hauteurPermise, libre } from '../niveaux-carte.js';
import { bruit } from '../alea.js';

const BASE = 690;
const S = 0.757;
const XA = -1400;
const XB = 3340;
const TAU = Math.PI * 2;
const ENSEIGNES = [
  { texte: 'NODE 7', couleur: '#7CF3FF', vise: 560 },
  { texte: 'SOC 24/7', couleur: '#FF6FD8', vise: 980 },
  { texte: 'VLAN 40', couleur: '#FFB454', vise: 2280 },
];
const PONT = { x0: 2420, x1: 3200, tours: [2560, 3060], tablier: 648, sommet: 486 };

function rangee(alea, { degagements, emprises }, profonde) {
  const liste = [];
  let x = XA + alea.entre(0, 40);
  while (x < XB) {
    const w = alea.entre(profonde ? 50 : 42, profonde ? 110 : 90) * S;
    if (!libre(emprises, x, x + w) || (!profonde && x + w > PONT.x0 - 30 && x < PONT.x1 + 30 && alea.chance(0.5))) { x += 14; continue; }
    const hMax = hauteurPermise(degagements, x, x + w) - 6;
    const h = Math.min(alea.entre(profonde ? 150 : 70, profonde ? 330 : 210) * S, hMax);
    if (h < 24) { x += w * 0.7; continue; }
    liste.push({
      x, w, h, graine: alea.entier(1, 1e9),
      couleur: alea.choix(profonde ? ['#403E86', '#46438C', '#3C3F84'] : ['#3A3C7E', '#35397A', '#3F4586', '#343878']),
      toit: alea.choix(['chateau', 'clim', 'antenne', 'pignon', 'gradins', null, null]),
    });
    x += w + alea.entre(profonde ? 4 : 2, profonde ? 30 : 14);
  }
  return liste;
}

export default {
  id: 'usages', facteur: 0.46, bande: [360, 720], texte: true,
  sol: { y: 708, haut: '#3E3F86', bas: '#34387A' },

  generer(alea, contexte) {
    const fond = rangee(alea, contexte, true);
    const avant = rangee(alea, contexte, false);
    const enseignes = ENSEIGNES.map((en) => {
      const b = avant.filter((x) => x.h > 90 && x.w > 50).sort((a, c) => Math.abs(a.x - en.vise) - Math.abs(c.x - en.vise))[0];
      return b ? { ...en, x: b.x + b.w / 2, y: BASE - b.h + 20, w: b.w } : null;
    }).filter(Boolean);
    const ecrans = avant.filter((b) => b.h > 80).filter((_, i) => i % 4 === 1).slice(0, 12)
      .map((b) => ({ x: b.x + b.w * 0.18, y: BASE - b.h * 0.42, w: b.w * 0.64, h: 16, graine: b.graine % 97 }));
    const bateaux = Array.from({ length: 8 }, () => ({
      X: alea.entre(XA, XB), Y: alea.entre(600, 684), L: alea.entre(16, 36) * S, v: alea.entre(-0.004, 0.004) || 0.002,
      feu: alea.choix([C.ambre, C.cyan, '#FFFFFF']),
    }));
    const drones = Array.from({ length: 6 }, () => ({
      X: alea.entre(-700, 2700), Y: alea.entre(410, 540), amp: alea.entre(60, 180), periode: alea.entre(9000, 17000), phase: alea.entre(0, TAU),
    }));
    return { fond, avant, enseignes, ecrans, bateaux, drones };
  },

  fond(ctx, m, vue) {
    const { xMin, xMax, t, px, reduit, transform, largeur } = vue;
    const g = ctx.createLinearGradient(0, 560, 0, 722);
    g.addColorStop(0, '#7C6BB4');
    g.addColorStop(0.5, '#4E4892');
    g.addColorStop(1, '#262A6A');
    ctx.fillStyle = g;
    ctx.fillRect(xMin, 558, xMax - xMin, 166);
    rect(ctx, xMin, 560, xMax - xMin, 1.2 * px, rgba('#FFE3C8', 0.55));
    const soleil = (largeur * 0.62 - transform.tx) / transform.a;
    for (let i = 0; i < 44; i++) {
      const u = i / 44;
      const yy = 563 + Math.pow(u, 1.35) * 150;
      const demi = (26 + 150 * u) * px;
      for (let k = 0; k < 3; k++) {
        const b = bruit(i * 3 + k, reduit ? 0 : Math.floor(t / 700 + k * 0.3));
        const xx = soleil + (bruit(i, k + 11) - 0.5) * 2 * demi + (reduit ? 0 : Math.sin(t / 900 + i) * 5 * px);
        ctx.fillStyle = rgba(k === 2 ? C.refletViolet : C.reflet, (0.16 + 0.38 * b) * (1 - u * 0.45));
        ctx.fillRect(xx, yy, (8 + 34 * b) * px, 1.5 * px);
      }
    }
    for (let i = 0; i < 26; i++) {
      const xx = xMin + bruit(i, 91) * (xMax - xMin);
      const yy = 575 + bruit(i, 92) * 130;
      ctx.fillStyle = rgba(C.refletViolet, 0.18);
      ctx.fillRect(xx + (reduit ? 0 : Math.sin(t / 1300 + i) * 8 * px), yy, 22 * px, 1.2 * px);
    }
    const phare = 1288;
    if (phare > xMin - 200 && phare < xMax + 200) {
      const faisceau = reduit ? 0.6 : Math.max(0, Math.cos((t / 8000) * TAU));
      for (let i = 0; i < 12; i++) {
        ctx.fillStyle = rgba(C.ambre, 0.35 * faisceau * (1 - i / 12));
        ctx.fillRect(phare - (10 + i * 4) * px + Math.sin(t / 500 + i) * 3 * px, 694 + i * 2.2, (20 + i * 8) * px, 1.3 * px);
      }
    }
    for (const b of m.bateaux) {
      const span = XB - XA;
      const X = XA + ((((b.X - XA) + (reduit ? 0 : b.v * t)) % span) + span) % span;
      if (X < xMin - 40 || X > xMax + 40) continue;
      const dir = b.v >= 0 ? 1 : -1;
      ctx.beginPath();
      ctx.moveTo(X - b.L / 2, b.Y - 4);
      ctx.lineTo(X + b.L / 2, b.Y - 4);
      ctx.lineTo(X + (b.L / 2 - 4) * 1, b.Y);
      ctx.lineTo(X - b.L / 2 + 3, b.Y);
      ctx.closePath();
      ctx.fillStyle = '#2A2D6E';
      ctx.fill();
      rect(ctx, X - b.L * 0.15 * dir - 5, b.Y - 10, 10, 6, '#3A3F86');
      rect(ctx, X - b.L * 0.15 * dir - 3.5, b.Y - 8.5, 7, 1.8, rgba(C.chaude, 0.9));
      halo(ctx, X + (b.L / 2) * dir, b.Y - 6, 6 * px, b.feu, 0.8);
      ctx.fillStyle = rgba(b.feu, 0.25);
      ctx.fillRect(X + (b.L / 2) * dir - 1, b.Y + 1, 2, 10);
    }
  },

  dessinerTuile(ctx, m, x0, x1) {
    for (const b of m.fond) {
      if (b.x + b.w < x0 || b.x > x1) continue;
      immeuble(ctx, alea(b.graine), { x: b.x, base: BASE + 2, w: b.w, h: b.h, couleur: b.couleur, voile: 0.3, alphaFenetres: 0.36, toit: b.toit, lisere: 0.4, taux: 0.5 });
    }
    dessinerPont(ctx, x0, x1);
    for (const b of m.avant) {
      if (b.x + b.w < x0 || b.x > x1) continue;
      immeuble(ctx, alea(b.graine), { x: b.x, base: BASE + 4, w: b.w, h: b.h, couleur: b.couleur, voile: 0.14, alphaFenetres: 0.45, toit: b.toit, lisere: 0.55, taux: 0.6 });
    }
    rect(ctx, x0, BASE + 2, x1 - x0, 20, '#34387A');
    rect(ctx, x0, BASE + 2, x1 - x0, 1.5, rgba(C.lisere, 0.4));
    for (let x = Math.floor(x0 / 18) * 18; x < x1; x += 18) rect(ctx, x, BASE + 9, 3, 2, rgba(x % 36 ? C.chaude : C.froide, 0.7));
    for (const en of m.enseignes) {
      if (en.x + 60 < x0 || en.x - 60 > x1) continue;
      ctx.save();
      ctx.shadowColor = en.couleur;
      ctx.shadowBlur = 8;
      arrondi(ctx, en.x - en.w * 0.42, en.y - 9, en.w * 0.84, 18, 4);
      ctx.fillStyle = 'rgba(26,31,77,.92)';
      ctx.fill();
      ctx.strokeStyle = en.couleur;
      ctx.lineWidth = 1.4;
      ctx.stroke();
      texte(ctx, en.texte, en.x, en.y + 0.5, { taille: 10.5, poids: 600, couleur: en.couleur, police: POLICE_MONO });
      ctx.restore();
    }
  },

  animer(ctx, m, vue) {
    const { t, reduit, px, xMin, xMax } = vue;
    for (const d of m.drones) {
      const X = d.X + (reduit ? 0 : Math.sin(t / d.periode * TAU + d.phase) * d.amp);
      if (X < xMin || X > xMax) continue;
      const Y = d.Y + (reduit ? 0 : Math.sin(t / 700 + d.phase) * 3);
      trait(ctx, X - 7, Y, X + 7, Y, '#2A2E6C', 1.8);
      rect(ctx, X - 3, Y - 1.5, 6, 3.5, '#3A3F86');
      const clignote = reduit || ((t + d.phase * 400) % 1200) < 500;
      if (clignote) { halo(ctx, X - 7, Y, 7 * px, C.ambre, 0.9); halo(ctx, X + 7, Y, 7 * px, C.cyan, 0.9); }
    }
    for (const ec of m.ecrans) {
      if (ec.x + ec.w < xMin || ec.x > xMax) continue;
      rect(ctx, ec.x, ec.y, ec.w, ec.h, '#161B45');
      const decal = reduit ? 0 : Math.floor(t / 260);
      for (let l = 0; l < 4; l++) {
        const r = bruit(ec.graine + l + decal, 3);
        ctx.fillStyle = rgba(l % 3 === 0 ? '#7BE8A8' : l % 2 ? C.cyan : '#C8BEFF', 0.85);
        ctx.fillRect(ec.x + 2 + (l % 2) * 4, ec.y + 2 + l * 3.4, (ec.w - 8) * (0.3 + 0.6 * r), 1.6);
      }
    }
    const tp = t % 20000;
    if (!reduit && tp < 6000) {
      const u = tp / 6000;
      const X = PONT.x0 - 60 + (PONT.x1 - PONT.x0 + 120) * u;
      if (X > xMin - 80 && X < xMax + 80) {
        for (let k = 0; k < 3; k++) {
          const xw = X - k * 17;
          arrondi(ctx, xw - 8, PONT.tablier - 9, 16, 7, 2.5);
          ctx.fillStyle = '#C8D0FF';
          ctx.fill();
          rect(ctx, xw - 6, PONT.tablier - 7.5, 12, 2.2, rgba(C.chaude, 0.95));
        }
        halo(ctx, X + 9, PONT.tablier - 6, 10 * px, '#FFFFFF', 0.7);
      }
    }
    for (const en of m.enseignes) {
      if (en.x < xMin || en.x > xMax) continue;
      const f = reduit ? 0.5 : 0.35 + 0.25 * Math.sin(t / 1700 + en.x);
      halo(ctx, en.x, en.y, en.w * 0.7, en.couleur, 0.18 * f);
    }
  },
};

function alea(graine) {
  let a = graine >>> 0;
  const r = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  return { n: r, entre: (x, y) => x + (y - x) * r(), chance: (p) => r() < p };
}

function dessinerPont(ctx, x0, x1) {
  if (PONT.x1 < x0 || PONT.x0 > x1) return;
  const couleur = melange('#3A3C7E', C.horizon, 0.2);
  for (const tx of PONT.tours) {
    rect(ctx, tx - 7, PONT.sommet, 4, BASE - PONT.sommet, couleur);
    rect(ctx, tx + 3, PONT.sommet, 4, BASE - PONT.sommet, couleur);
    rect(ctx, tx - 7, PONT.sommet + 40, 14, 3, couleur);
    disque(ctx, tx, PONT.sommet - 3, 2, C.ambre);
    ctx.beginPath();
    for (let k = 1; k <= 9; k++) {
      ctx.moveTo(tx, PONT.sommet + 6);
      ctx.lineTo(tx - k * 26, PONT.tablier);
      ctx.moveTo(tx, PONT.sommet + 6);
      ctx.lineTo(tx + k * 26, PONT.tablier);
    }
    ctx.strokeStyle = rgba('#C8BEFF', 0.45);
    ctx.lineWidth = 0.7;
    ctx.stroke();
  }
  rect(ctx, PONT.x0, PONT.tablier, PONT.x1 - PONT.x0, 6, '#2E3274');
  rect(ctx, PONT.x0, PONT.tablier, PONT.x1 - PONT.x0, 1.2, rgba(C.cyan, 0.7));
  for (let x = PONT.x0; x < PONT.x1; x += 14) rect(ctx, x, PONT.tablier + 2.5, 2, 1.6, rgba(C.chaude, 0.8));
}
