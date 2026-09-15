// P4 · Réseau : huit pylônes en treillis, câbles en chaînette dans les quatre teintes de VLAN,
// arches pare-feu, station d'atterrissement du câble sous-marin, armoires à LED.

import { C, rgba, rect, crete, remplirCrete, tracerCrete, hauteurCrete, pylone, chainette, halo, disque, trait, arrondi } from '../dessin.js';
import { hauteurPermise, libre } from '../niveaux-carte.js';

const BASE = 850;
const S = 0.91;
const XA = -1400;
const XB = 4770;
const POSITIONS = [-1180, -560, 60, 800, 1960, 2640, 3180, 3900];
const LARGEUR_PYLONE = 44;
const RAFALE_MS = 12000;
const DUREE_RAFALE = 1800;

function attache(p, k) {
  const bras = k < 2 ? 0.18 : 0.34;
  const cote = k % 2 ? 1 : -1;
  return { x: p.x + cote * LARGEUR_PYLONE * 0.9, y: BASE - p.h + p.h * bras + 6 };
}

export default {
  id: 'reseau', facteur: 0.8, bande: [500, 870],
  sol: { y: 864, haut: '#353A7E', bas: '#30357A' },

  generer(alea, { degagements, emprises }) {
    const sol = crete(alea, XA, XB, 20, 856, 14, [0.005, 0.02]);
    const pylones = POSITIONS.map((x) => ({
      x, h: Math.min(alea.entre(240, 290) * S, hauteurPermise(degagements, x - LARGEUR_PYLONE / 2, x + LARGEUR_PYLONE / 2) - 6),
    })).filter((p) => p.h > 120);
    const cables = [];
    const arches = [];
    for (let i = 0; i < pylones.length - 1; i++) {
      const a = pylones[i], b = pylones[i + 1];
      const span = b.x - a.x;
      const avecArche = i % 2 === 1;
      if (avecArche) arches.push({ x: (a.x + b.x) / 2, i });
      for (let k = 0; k < 4; k++) {
        const pa = attache(a, k), pb = attache(b, k);
        const fleche = 22 + span * 0.05 + k * 5;
        const ch = chainette(pa.x, pa.y, pb.x, pb.y, fleche);
        cables.push({
          ch, couleur: C.vlan[k], arche: avecArche,
          paquets: Array.from({ length: 1 + (k % 2) }, (_, j) => ({ u0: alea.n(), v: alea.entre(0.00005, 0.00011) * (1000 / span), bloque: avecArche && j === 0 && k % 2 === 1 })),
        });
      }
    }
    const armoires = [];
    let x = XA + 30;
    while (x < XB) {
      const w = alea.entre(10, 18);
      if (libre(emprises, x, x + w)) armoires.push({ x, w, h: alea.entre(18, 30), sol: hauteurCrete(sol, x) + 3, leds: alea.entier(3, 6), phase: alea.entre(0, 1000) });
      x += alea.entre(90, 260);
    }
    const clotures = [];
    for (let i = 0; i < 10; i++) {
      const xc = alea.entre(XA, XB - 200), wc = alea.entre(80, 200);
      if (libre(emprises, xc, xc + wc)) clotures.push({ x: xc, w: wc });
    }
    return { sol, pylones, cables, arches, armoires, clotures, station: { x: -420, w: 96, h: Math.min(62, hauteurPermise(degagements, -420, -324) - 6) } };
  },

  dessinerTuile(ctx, m, x0, x1) {
    const pts = m.sol.filter(([x]) => x >= x0 - 30 && x <= x1 + 30);
    if (pts.length > 1) {
      remplirCrete(ctx, pts, 872, '#353A7E');
      tracerCrete(ctx, pts, rgba('#43F0E6', 0.35), 1.2);
    }
    const st = m.station;
    if (st.x + st.w > x0 && st.x < x1) {
      rect(ctx, st.x, BASE + 2 - st.h, st.w, st.h + 4, '#3E4488');
      ctx.beginPath();
      ctx.ellipse(st.x + st.w * 0.7, BASE + 2 - st.h, 22, 16, 0, Math.PI, 0);
      ctx.fillStyle = '#4A5298';
      ctx.fill();
      rect(ctx, st.x, BASE + 2 - st.h, st.w, 1.5, rgba(C.lisere, 0.5));
      for (let k = 0; k < 6; k++) rect(ctx, st.x + 6 + k * 9, BASE - st.h * 0.5, 5, 3, rgba(k % 2 ? C.froide : C.chaude, 0.55));
      trait(ctx, st.x - 60, BASE + 10, st.x + 8, BASE - 4, '#43F0E6', 3);
      trait(ctx, st.x - 60, BASE + 10, st.x + 8, BASE - 4, rgba('#43F0E6', 0.25), 8);
    }
    for (const c of m.clotures) {
      if (c.x + c.w < x0 || c.x > x1) continue;
      const y = hauteurCrete(m.sol, c.x + c.w / 2) + 2;
      ctx.beginPath();
      for (let x = c.x; x <= c.x + c.w; x += 10) { ctx.moveTo(x, y); ctx.lineTo(x, y - 16); }
      ctx.moveTo(c.x, y - 15); ctx.lineTo(c.x + c.w, y - 15);
      ctx.moveTo(c.x, y - 8); ctx.lineTo(c.x + c.w, y - 8);
      ctx.strokeStyle = rgba('#2B2F6E', 0.9);
      ctx.lineWidth = 0.9;
      ctx.stroke();
    }
    for (const p of m.pylones) if (p.x + 60 > x0 && p.x - 60 < x1) pylone(ctx, p.x, BASE + 4, p.h, LARGEUR_PYLONE, '#2A2E6E', 1.4);
    for (const c of m.cables) {
      if (c.ch.x1 < x0 || c.ch.x0 > x1) continue;
      ctx.beginPath();
      c.ch.tracer(ctx);
      ctx.strokeStyle = rgba(c.couleur, 0.16);
      ctx.lineWidth = 5;
      ctx.stroke();
      ctx.beginPath();
      c.ch.tracer(ctx);
      ctx.strokeStyle = rgba(c.couleur, 0.8);
      ctx.lineWidth = 1.3;
      ctx.stroke();
    }
    for (const a of m.arches) {
      if (a.x + 40 < x0 || a.x - 40 > x1) continue;
      const cs = m.cables.filter((c) => c.arche && Math.abs((c.ch.x0 + c.ch.x1) / 2 - a.x) < 1);
      if (!cs.length) continue;
      const ys = cs.map((c) => c.ch.point(0.5).y);
      const y0 = Math.min(...ys) - 12, y1 = Math.max(...ys) + 12;
      arrondi(ctx, a.x - 9, y0, 18, y1 - y0, 7);
      ctx.strokeStyle = '#FFB86B';
      ctx.lineWidth = 2.6;
      ctx.stroke();
      ctx.strokeStyle = rgba('#FFB86B', 0.25);
      ctx.lineWidth = 8;
      ctx.stroke();
      trait(ctx, a.x, y1, a.x, BASE + 2, '#2A2E6E', 2);
    }
    for (const ar of m.armoires) {
      if (ar.x + ar.w < x0 || ar.x > x1) continue;
      rect(ctx, ar.x, ar.sol - ar.h, ar.w, ar.h, '#2A2E6A');
      rect(ctx, ar.x, ar.sol - ar.h, ar.w, 1.2, rgba('#AFC0FF', 0.4));
    }
  },

  animer(ctx, m, vue) {
    const { t, reduit, px, xMin, xMax, qualite } = vue;
    const rafale = !reduit && t % RAFALE_MS < DUREE_RAFALE;
    for (const c of m.cables) {
      if (c.ch.x1 < xMin || c.ch.x0 > xMax) continue;
      const liste = rafale ? [...c.paquets, { u0: 0.5, v: c.paquets[0].v * 2.2, bloque: false }] : c.paquets;
      for (const p of liste) {
        let u = reduit ? p.u0 : (p.u0 + t * p.v) % 1;
        if (p.bloque && u > 0.5) {
          if (u > 0.64) continue;
          u = 0.5;
          const pt = c.ch.point(0.5);
          const force = 1 - ((reduit ? 0.52 : (p.u0 + t * p.v) % 1) - 0.5) / 0.14;
          halo(ctx, pt.x - 10, pt.y, 14 * px * force, '#FFB86B', 0.95);
          for (let k = 0; k < 4; k++) disque(ctx, pt.x - 10 - k * 3 * force, pt.y - 4 + k * 2.5, 0.9, rgba('#FFE3A3', force));
          continue;
        }
        const pt = c.ch.point(u);
        if (qualite !== 'basse') halo(ctx, pt.x, pt.y, 8 * px, c.couleur, 0.85);
        disque(ctx, pt.x, pt.y, 1.7 * px, '#FFFFFF');
      }
    }
    for (const ar of m.armoires) {
      if (ar.x + ar.w < xMin || ar.x > xMax) continue;
      for (let k = 0; k < ar.leds; k++) {
        const on = reduit || ((t + ar.phase + k * 170) % 900) < 600;
        rect(ctx, ar.x + 2.5, ar.sol - ar.h + 4 + k * 4, 2.2, 1.8, on ? (k % 3 === 2 ? C.ambre : '#7BE8A8') : '#1A1F4D');
      }
    }
  },
};
