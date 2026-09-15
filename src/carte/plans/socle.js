// P5 · Socle : sol côtier, route et trottoirs, lampadaires, clôtures, entrepôts bas,
// coupe souterraine (chemins de câbles, fibres, bus lumineux), véhicules de ronde.

import { C, rgba, melange, rect, trait, halo, disque, lampadaire, arbre, immeuble, arrondi } from '../dessin.js';
import { hauteurPermise, libre } from '../niveaux-carte.js';
import { creerAlea } from '../alea.js';

const BASE = 930;
const XA = -1400;
const XB = 5600;
const ROUTE = { haut: 930, bas: 946 };
const BUS_Y = 979;
const RONDE_MS = 40000;
const CONTENEURS = ['#5BC0FF', '#54E0A6', '#FF9E5E', '#F2D13B', '#A98BFF', '#F07AA8'];

export default {
  id: 'socle', facteur: 1, bande: [560, 1000],

  generer(alea, { degagements, emprises }) {
    const elements = [];
    let x = XA + 10;
    while (x < XB) {
      const type = alea.choix(['entrepot', 'entrepot', 'arbres', 'conteneurs', 'kiosque', 'antenne', 'groupe', 'vide']);
      const w = { entrepot: alea.entre(90, 210), arbres: alea.entre(40, 110), conteneurs: alea.entre(40, 90), kiosque: alea.entre(26, 44), antenne: 24, groupe: alea.entre(30, 50), vide: alea.entre(30, 90) }[type];
      if (!libre(emprises, x, x + w)) { x += 24; continue; }
      const hMax = hauteurPermise(degagements, x, x + w) - 6;
      const hVoulue = { entrepot: alea.entre(56, 150), arbres: alea.entre(40, 96), conteneurs: 32, kiosque: alea.entre(28, 44), antenne: alea.entre(90, 170), groupe: 20, vide: 0 }[type];
      const h = Math.min(hVoulue, hMax);
      if (type !== 'vide' && h > 16) elements.push({ type, x, w, h, graine: alea.entier(1, 1e9), couleur: alea.choix(['#383D82', '#343A7C', '#3D4288']) });
      x += w + alea.entre(8, 40);
    }
    const lampes = [];
    for (let xl = XA; xl < XB; xl += alea.entre(130, 170)) if (libre(emprises, xl - 6, xl + 16)) lampes.push({ x: xl, h: 62, phase: alea.entre(0, 6) });
    const clotures = [];
    for (let i = 0; i < 26; i++) {
      const xc = alea.entre(XA, XB), wc = alea.entre(60, 180);
      if (libre(emprises, xc, xc + wc)) clotures.push({ x: xc, w: wc });
    }
    const rondes = [{ x0: 2860, x1: 4260, phase: 0 }, { x0: -760, x1: 760, phase: 0.45 }, { x0: 1000, x1: 2600, phase: 0.2 }];
    return { elements, lampes, clotures, rondes };
  },

  dessinerTuile(ctx, m, x0, x1) {
    const g = ctx.createLinearGradient(0, 900, 0, 960);
    g.addColorStop(0, '#3A4088');
    g.addColorStop(1, '#2F3570');
    ctx.fillStyle = g;
    ctx.fillRect(x0, 918, x1 - x0, 32);
    for (const el of m.elements) {
      if (el.x + el.w < x0 - 20 || el.x > x1 + 20) continue;
      dessinerElement(ctx, el);
    }
    rect(ctx, x0, 922, x1 - x0, 8, '#454C92');
    rect(ctx, x0, 922, x1 - x0, 1.4, rgba(C.lisere, 0.55));
    rect(ctx, x0, ROUTE.haut, x1 - x0, ROUTE.bas - ROUTE.haut, '#262B63');
    for (let x = Math.floor(x0 / 40) * 40; x < x1; x += 40) rect(ctx, x, 937.5, 18, 1.3, rgba('#EEF1FF', 0.35));
    for (const c of m.clotures) {
      if (c.x + c.w < x0 || c.x > x1) continue;
      ctx.beginPath();
      for (let x = c.x; x <= c.x + c.w; x += 12) { ctx.moveTo(x, 922); ctx.lineTo(x, 898); }
      ctx.moveTo(c.x, 900); ctx.lineTo(c.x + c.w, 900);
      ctx.moveTo(c.x, 911); ctx.lineTo(c.x + c.w, 911);
      ctx.strokeStyle = rgba('#232866', 0.9);
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    for (const l of m.lampes) if (l.x > x0 - 20 && l.x < x1 + 20) lampadaire(ctx, l.x, 922, l.h, '#232866');
    rect(ctx, x0, 946, x1 - x0, 54, '#1F2458');
    rect(ctx, x0, 946, x1 - x0, 2, '#2A3070');
    for (const y of [956, 969, 990]) {
      rect(ctx, x0, y, x1 - x0, 1.6, '#39407E');
      for (let x = Math.floor(x0 / 44) * 44; x < x1; x += 44) rect(ctx, x, y, 1.6, 6, '#39407E');
    }
    const fibres = ['#FF6FD8', '#7CF3FF', '#FFB454', '#7BE8A8', '#A98BFF'];
    fibres.forEach((c, i) => {
      ctx.beginPath();
      for (let x = Math.floor(x0 / 30) * 30; x <= x1 + 30; x += 30) {
        const y = 961 + i * 1.5 + Math.sin(x * 0.01 + i) * 0.8;
        if (x === Math.floor(x0 / 30) * 30) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = rgba(c, 0.55);
      ctx.lineWidth = 0.9;
      ctx.stroke();
    });
    rect(ctx, x0, BUS_Y - 1.5, x1 - x0, 3, rgba('#7CF3FF', 0.5));
    rect(ctx, x0, BUS_Y - 4, x1 - x0, 8, rgba('#7CF3FF', 0.08));
  },

  animer(ctx, m, vue) {
    const { t, reduit, px, xMin, xMax, qualite } = vue;
    for (const l of m.lampes) {
      if (l.x < xMin || l.x > xMax) continue;
      const f = reduit ? 1 : 0.9 + 0.1 * Math.sin(t / 700 + l.phase);
      const x = l.x + l.h * 0.18, y = 922 - l.h + 2;
      halo(ctx, x, y, 26 * px * f, C.chaude, 0.55);
      disque(ctx, x, y, 2, '#FFF1C9');
      ctx.fillStyle = rgba(C.chaude, 0.08 * f);
      ctx.beginPath();
      ctx.moveTo(x - 3, y);
      ctx.lineTo(x - 22, 928);
      ctx.lineTo(x + 22, 928);
      ctx.closePath();
      ctx.fill();
    }
    if (qualite !== 'basse') {
      const n = 14;
      for (let i = 0; i < n; i++) {
        const u = reduit ? i / n : ((t / 6000 + i / n) % 1);
        const X = xMin + (xMax - xMin) * u;
        halo(ctx, X, BUS_Y, 12 * px, '#7CF3FF', 0.8);
        rect(ctx, X - 6, BUS_Y - 1, 12, 2, '#E8FFFF');
      }
    }
    for (const r of m.rondes) {
      const u = reduit ? 0.5 : ((t / RONDE_MS + r.phase) % 1);
      const aller = u < 0.5;
      const X = aller ? r.x0 + (r.x1 - r.x0) * (u * 2) : r.x1 - (r.x1 - r.x0) * ((u - 0.5) * 2);
      if (X < xMin - 40 || X > xMax + 40) continue;
      dessinerVehicule(ctx, X, aller ? 1 : -1, t, reduit, px);
    }
  },
};

function dessinerVehicule(ctx, X, dir, t, reduit, px) {
  const y = 941;
  arrondi(ctx, X - 22, y - 12, 44, 10, 3);
  ctx.fillStyle = '#DDE3FF';
  ctx.fill();
  arrondi(ctx, X - 12 + dir * 2, y - 19, 22, 8, 3);
  ctx.fillStyle = '#C8D0FF';
  ctx.fill();
  rect(ctx, X - 10 + dir * 2, y - 17.5, 18, 4, '#3A4088');
  rect(ctx, X - 18, y - 8, 36, 2.2, '#5AA9E6');
  disque(ctx, X - 13, y - 1, 3.4, '#1A1F4D');
  disque(ctx, X + 13, y - 1, 3.4, '#1A1F4D');
  const gyro = reduit || ((t / 250) | 0) % 2;
  halo(ctx, X - 2, y - 20, 12 * px, gyro ? '#5AA9E6' : C.ambre, 0.9);
  halo(ctx, X + dir * 23, y - 8, 22 * px, '#FFF1C9', 0.6);
}

function dessinerElement(ctx, el) {
  const a = creerAlea(el.graine);
  const sol = 924;
  if (el.type === 'entrepot') {
    immeuble(ctx, a, { x: el.x, base: sol, w: el.w, h: el.h, couleur: el.couleur, voile: 0.05, alphaFenetres: 0.5, toit: a.choix(['clim', 'pignon', null]), lisere: 0.6, taux: 0.5 });
    rect(ctx, el.x + el.w * 0.12, sol - 22, el.w * 0.22, 22, '#262B63');
    for (let k = 0; k < 5; k++) rect(ctx, el.x + el.w * 0.12, sol - 22 + k * 4.4, el.w * 0.22, 0.8, '#3A4088');
    rect(ctx, el.x + el.w * 0.12, sol - 25, el.w * 0.22, 2, rgba(C.ambre, 0.8));
  } else if (el.type === 'arbres') {
    for (let k = 0; k < Math.max(1, Math.round(el.w / 30)); k++) arbre(ctx, a, el.x + 14 + k * 28, sol, el.h * a.entre(0.7, 1), a.chance(0.5) ? '#3E5A9C' : '#46609E', '#7BE8A8');
  } else if (el.type === 'conteneurs') {
    for (let r = 0; r < 2; r++) {
      for (let k = 0; k < Math.floor(el.w / 36); k++) {
        if (r === 1 && a.chance(0.4)) continue;
        const c = a.choix(CONTENEURS);
        rect(ctx, el.x + k * 36 + r * 8, sol - 15 - r * 15, 34, 14, melange(c, '#2F3570', 0.35));
        for (let s = 3; s < 34; s += 4) rect(ctx, el.x + k * 36 + r * 8 + s, sol - 14 - r * 15, 1, 12, rgba('#141840', 0.25));
      }
    }
  } else if (el.type === 'kiosque') {
    rect(ctx, el.x, sol - el.h, el.w, el.h, '#3D4288');
    rect(ctx, el.x - 4, sol - el.h - 4, el.w + 8, 5, '#454C92');
    rect(ctx, el.x + 4, sol - el.h + 6, el.w - 8, el.h * 0.4, rgba(C.chaude, 0.6));
  } else if (el.type === 'antenne') {
    trait(ctx, el.x + 12, sol, el.x + 12, sol - el.h, '#2A2F6C', 2.2);
    for (let k = 1; k < 4; k++) rect(ctx, el.x + 7, sol - el.h + k * 16, 10, 5, '#454C92');
    disque(ctx, el.x + 12, sol - el.h, 2.2, C.ambre);
  } else if (el.type === 'groupe') {
    rect(ctx, el.x, sol - el.h, el.w, el.h, '#454C92');
    disque(ctx, el.x + el.w * 0.3, sol - el.h / 2, el.h * 0.32, '#2F3570');
    rect(ctx, el.x + el.w * 0.6, sol - el.h + 4, el.w * 0.3, 2, '#7BE8A8');
  }
}
