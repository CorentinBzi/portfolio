// P3 · Données : le quai des silos — relief bas, silos de verre, piles de cuves, conduites,
// halles de stockage, ponts convoyeurs. Les niveaux montent en dents de scie (purge toutes les 20 s).

import { C, rgba, melange, rect, crete, remplirCrete, tracerCrete, hauteurCrete, silo, liquide, trait, disque, halo, grilleFenetres, dessinerFenetres } from '../dessin.js';
import { hauteurPermise, libre } from '../niveaux-carte.js';
import { bruit, creerAlea } from '../alea.js';

const BASE = 770;
const S = 0.829;
const XA = -1400;
const XB = 4010;
const PURGE_MS = 20000;
const BLOC_MS = 1500;
const LIQUIDES = ['#3EE0C0', '#7BE8A8', '#43F0E6', '#9FE8FF'];

export default {
  id: 'donnees', facteur: 0.62, bande: [480, 790],
  sol: { y: 784, haut: '#3B3F83', bas: '#353A7C' },

  generer(alea, { degagements, emprises }) {
    const relief = crete(alea, XA, XB, 20, 776, 20, [0.004, 0.013, 0.03]);
    const sol = (x) => hauteurCrete(relief, x);
    const elements = [];
    const silos = [];
    let x = XA + 20;
    while (x < XB - 40) {
      const type = silos.length < 9 && alea.chance(0.3) ? 'silos' : alea.choix(['halle', 'halle', 'cuves', 'reservoir', 'antenne']);
      const w = type === 'silos' ? 3 * 40 * S : type === 'halle' ? alea.entre(70, 150) : type === 'cuves' ? alea.entre(50, 80) : type === 'reservoir' ? alea.entre(60, 90) : 20;
      if (!libre(emprises, x, x + w)) { x += 20; continue; }
      const hMax = hauteurPermise(degagements, x, x + w) - 6;
      if (type === 'silos') {
        const h = Math.min(alea.entre(95, 150) * S, hMax);
        if (h < 60) { x += 30; continue; }
        const n = Math.min(3, 9 - silos.length);
        for (let i = 0; i < n; i++) silos.push({ x: x + 20 * S + i * 40 * S, base: BASE + 2, r: alea.entre(13, 17) * S, h: h * alea.entre(0.85, 1), phase: alea.n(), couleur: alea.choix(LIQUIDES) });
        elements.push({ type: 'convoyeur', x0: x - 50, y0: BASE, x1: x + 20 * S, y1: BASE + 2 - h - 6 });
        x += n * 40 * S + alea.entre(30, 70);
        continue;
      }
      const h = Math.min(type === 'halle' ? alea.entre(30, 78) : type === 'cuves' ? alea.entre(26, 40) : type === 'reservoir' ? alea.entre(26, 44) : alea.entre(60, 110), hMax);
      if (h < 16) { x += 24; continue; }
      elements.push({ type, x, w, h, base: sol(x + w / 2), graine: alea.entier(1, 1e9) });
      x += w + alea.entre(14, 60);
    }
    const conduites = [];
    const ancrages = elements.filter((e) => e.type === 'halle' || e.type === 'reservoir');
    for (let i = 0; i < ancrages.length - 1; i++) {
      const a = ancrages[i], b = ancrages[i + 1];
      if (b.x - (a.x + a.w) < 180) conduites.push({ x0: a.x + a.w, x1: b.x, y: BASE - Math.min(a.h, b.h) * 0.5, couleur: alea.choix(['#6D7BC8', '#5B67B5']) });
    }
    const ecrans = elements.filter((e) => e.type === 'halle' && e.w > 100).map((e) => ({ x: e.x + e.w * 0.3, y: e.base - e.h * 0.75, w: e.w * 0.4, h: e.h * 0.32, graine: e.graine % 53 }));
    return { relief, elements, silos, conduites, ecrans };
  },

  dessinerTuile(ctx, m, x0, x1) {
    const pts = m.relief.filter(([x]) => x >= x0 - 30 && x <= x1 + 30);
    if (pts.length > 1) {
      remplirCrete(ctx, pts, 792, '#3B3F83');
      tracerCrete(ctx, pts, rgba('#9D8CFF', 0.45), 1.3);
    }
    for (const c of m.conduites) {
      if (c.x1 < x0 || c.x0 > x1) continue;
      trait(ctx, c.x0, c.y, c.x1, c.y, c.couleur, 3.2);
      trait(ctx, c.x0, c.y - 1, c.x1, c.y - 1, rgba('#DDE3FF', 0.35), 0.8);
      for (let x = c.x0 + 20; x < c.x1; x += 40) trait(ctx, x, c.y, x, BASE, '#2E3274', 1.2);
    }
    for (const el of m.elements) {
      const gauche = el.type === 'convoyeur' ? Math.min(el.x0, el.x1) : el.x;
      const droite = el.type === 'convoyeur' ? Math.max(el.x0, el.x1) : el.x + el.w;
      if (droite < x0 - 10 || gauche > x1 + 10) continue;
      dessinerElement(ctx, el);
    }
    for (const s of m.silos) if (s.x + s.r > x0 && s.x - s.r < x1) silo(ctx, { x: s.x, base: s.base, r: s.r, h: s.h, verre: '#7280CC', metal: '#2C3170' });
  },

  animer(ctx, m, vue) {
    const { t, reduit, px, xMin, xMax } = vue;
    for (const s of m.silos) {
      if (s.x + s.r < xMin || s.x - s.r > xMax) continue;
      const u = reduit ? 0.55 : ((t / PURGE_MS + s.phase) % 1);
      const niveau = 0.18 + 0.72 * u;
      const couleur = niveau > 0.82 ? C.ambre : s.couleur;
      liquide(ctx, { x: s.x, base: s.base - 2, r: s.r, h: s.h - 4, niveau, couleur, t: reduit ? 0 : t });
      for (let k = 0; k < 3; k++) {
        const bu = reduit ? 0.3 : ((t / 1800 + k / 3 + s.phase) % 1);
        disque(ctx, s.x + (k - 1) * s.r * 0.45, s.base - 4 - (s.h - 6) * niveau * bu, 0.9, rgba('#FFFFFF', 0.6 * (1 - bu)));
      }
      if (u > 0.97 && !reduit) halo(ctx, s.x, s.base - s.h, 16 * px, C.ambre, 0.6);
    }
    for (const el of m.elements) {
      if (el.type !== 'convoyeur' || Math.max(el.x0, el.x1) < xMin || Math.min(el.x0, el.x1) > xMax) continue;
      const u = reduit ? 0.5 : ((t + el.x0 * 7) % BLOC_MS) / BLOC_MS;
      const bx = el.x0 + (el.x1 - el.x0) * u, by = el.y0 + (el.y1 - el.y0) * u;
      rect(ctx, bx - 3.5, by - 6, 7, 5, '#7BE8A8');
      halo(ctx, bx, by - 3, 7 * px, '#7BE8A8', 0.6);
    }
    for (const ec of m.ecrans) {
      if (ec.x + ec.w < xMin || ec.x > xMax) continue;
      rect(ctx, ec.x, ec.y, ec.w, ec.h, '#161B45');
      ctx.beginPath();
      const decal = reduit ? 0 : t / 400;
      for (let i = 0; i <= 16; i++) {
        const xx = ec.x + 2 + ((ec.w - 4) * i) / 16;
        const yy = ec.y + ec.h * (0.55 - 0.35 * Math.sin((i + decal) * 0.7 + ec.graine) * (0.4 + 0.6 * bruit(ec.graine, Math.floor(i + decal))));
        if (i === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
      }
      ctx.strokeStyle = '#3EE0C0';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  },
};

function dessinerElement(ctx, el) {
  if (el.type === 'convoyeur') {
    trait(ctx, el.x0, el.y0, el.x1, el.y1, '#2C3170', 3);
    trait(ctx, el.x0, el.y0 - 5, el.x1, el.y1 - 5, '#2C3170', 1.2);
    const n = 8;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const u0 = i / n, u1 = (i + 1) / n;
      ctx.moveTo(el.x0 + (el.x1 - el.x0) * u0, el.y0 + (el.y1 - el.y0) * u0);
      ctx.lineTo(el.x0 + (el.x1 - el.x0) * u1, el.y0 + (el.y1 - el.y0) * u1 - 5);
    }
    ctx.strokeStyle = '#2C3170';
    ctx.lineWidth = 0.9;
    ctx.stroke();
    return;
  }
  const a = creerAlea(el.graine);
  const corps = melange('#3A3C7E', C.horizon, 0.2);
  if (el.type === 'halle') {
    rect(ctx, el.x, el.base - el.h, el.w, el.h + 10, corps);
    rect(ctx, el.x, el.base - el.h, el.w, 1.5, rgba(C.lisere, 0.5));
    for (let k = 0; k < Math.floor(el.w / 22); k++) rect(ctx, el.x + 6 + k * 22, el.base - el.h - 5, 12, 5, melange(corps, '#141840', 0.3));
    const f = grilleFenetres(a, { x: el.x + 4, y: el.base - el.h + 5, w: el.w - 8, h: el.h * 0.5, cols: Math.round(el.w / 8), rows: 2, taux: 0.55 });
    dessinerFenetres(ctx, f, 0.42, { eteinte: rgba('#1A1F4D', 0.35) });
    rect(ctx, el.x + el.w * 0.1, el.base - 12, el.w * 0.14, 12, '#23285E');
  } else if (el.type === 'cuves') {
    const r = Math.min(8, el.h / 4.5);
    for (let rang = 0; rang < 3; rang++) {
      for (let k = 0; k < Math.floor((el.w - rang * r) / (2 * r + 1)); k++) {
        const cx = el.x + r + rang * r + k * (2 * r + 1), cy = el.base + 2 - r - rang * (2 * r - 2);
        disque(ctx, cx, cy, r, rang % 2 ? '#56609F' : '#4B5596');
        disque(ctx, cx, cy, r * 0.55, rgba('#C8D0FF', 0.25));
      }
    }
  } else if (el.type === 'reservoir') {
    rect(ctx, el.x, el.base - el.h * 0.6, el.w, el.h * 0.6 + 6, '#4A5498');
    ctx.beginPath();
    ctx.ellipse(el.x + el.w / 2, el.base - el.h * 0.6, el.w / 2, el.h * 0.4, 0, Math.PI, 0);
    ctx.fillStyle = '#56609F';
    ctx.fill();
    rect(ctx, el.x, el.base - el.h * 0.3, el.w, 1.5, rgba('#DDE3FF', 0.35));
    trait(ctx, el.x + el.w * 0.2, el.base - el.h * 0.8, el.x + el.w * 0.8, el.base - el.h * 0.8, rgba(C.lisere, 0.5), 1);
  } else if (el.type === 'antenne') {
    trait(ctx, el.x + 10, el.base, el.x + 10, el.base - el.h, '#2C3170', 1.8);
    ctx.beginPath();
    ctx.ellipse(el.x + 14, el.base - el.h * 0.8, 7, 4, -0.6, 0, Math.PI * 2);
    ctx.fillStyle = '#5B67B5';
    ctx.fill();
    disque(ctx, el.x + 10, el.base - el.h, 1.6, C.ambre);
  }
}
