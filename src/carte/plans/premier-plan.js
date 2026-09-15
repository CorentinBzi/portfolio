// P6 · Premier plan : silhouettes dans les 12 % bas (roseaux, rochers, bornes, armoire de rue,
// câbles néon, rambarde), denses sur les côtés des stations, clairsemées au centre ; bokeh.

import { C, rgba, crete, remplirCrete, hauteurCrete, halo, disque, trait, rect } from '../dessin.js';

const F = 1.35;
const XA = -1400;
const XB = 4200 * F + 1400;
const SOMBRE = '#14183E';
const ACCENTS = ['#F2D13B', '#8FB4D6', '#3EE0C0', '#A98BFF', '#FF9A5C', '#5AA9E6', '#FF6FD8'];

export default {
  id: 'premier-plan', facteur: F, bande: [880, 1000], resolution: 0.6,

  generer(alea, { niveaux }) {
    const stations = niveaux.map((n) => n.station * F);
    const distance = (x) => Math.min(...stations.map((s) => Math.abs(s - x)));
    const sol = crete(alea, XA, XB, 14, 1000, 34, [0.006, 0.02, 0.05]);
    const elements = [];
    const cables = [];
    const roseaux = [];
    let x = XA;
    let dernierPoteau = null;
    while (x < XB) {
      const dense = distance(x) > 250;
      const sy = hauteurCrete(sol, x) + 3;
      const type = dense ? alea.choix(['roseaux', 'roseaux', 'rocher', 'borne', 'armoire', 'rambarde', 'poteau']) : alea.choix(['roseaux', 'vide', 'vide', 'borne']);
      if (type === 'roseaux') {
        const n = alea.entier(dense ? 6 : 3, dense ? 13 : 6);
        for (let i = 0; i < n; i++) {
          const b = { x: x + alea.entre(-12, 12), y: sy, h: alea.entre(dense ? 40 : 18, dense ? 104 : 42), c: alea.entre(-8, 8), anime: alea.chance(0.3), phase: alea.entre(0, 6) };
          (b.anime ? roseaux : elements).push({ type: 'brin', ...b });
        }
      } else if (type === 'rocher') elements.push({ type, x, y: sy, w: alea.entre(30, 80), h: alea.entre(20, 52) });
      else if (type === 'borne') elements.push({ type, x, y: sy, h: alea.entre(20, 30), couleur: alea.choix([C.cyan, C.ambre, C.magenta]) });
      else if (type === 'armoire') elements.push({ type, x, y: sy, w: 24, h: 50, leds: alea.entier(4, 8), phase: alea.entre(0, 900) });
      else if (type === 'rambarde') elements.push({ type, x, y: sy - 4, w: alea.entre(110, 230), h: 38 });
      else if (type === 'poteau') {
        const p = { type, x, y: sy, h: alea.entre(86, 116) };
        elements.push(p);
        if (dernierPoteau && x - dernierPoteau.x < 520) cables.push({ a: dernierPoteau, b: p, couleur: alea.choix([C.magenta, C.cyan]), fleche: alea.entre(20, 44) });
        dernierPoteau = p;
      }
      x += dense ? alea.entre(26, 70) : alea.entre(60, 140);
    }
    const bokeh = Array.from({ length: 18 }, () => ({ fx: alea.n(), fy: alea.entre(0.86, 0.99), r: alea.entre(8, 24), a: alea.entre(0.15, 0.35), c: alea.choix(ACCENTS), vx: alea.entre(-0.008, 0.008), phase: alea.entre(0, 6) }));
    return { sol, elements, cables, roseaux, bokeh };
  },

  dessinerTuile(ctx, m, x0, x1) {
    const pts = m.sol.filter(([x]) => x >= x0 - 20 && x <= x1 + 20);
    if (pts.length > 1) remplirCrete(ctx, pts, 1002, SOMBRE);
    for (const c of m.cables) {
      if (c.b.x < x0 - 40 || c.a.x > x1 + 40) continue;
      const ya = c.a.y - c.a.h + 8, yb = c.b.y - c.b.h + 8;
      for (const [lw, al] of [[6, 0.18], [1.8, 0.9]]) {
        ctx.beginPath();
        ctx.moveTo(c.a.x, ya);
        ctx.quadraticCurveTo((c.a.x + c.b.x) / 2, (ya + yb) / 2 + c.fleche * 2, c.b.x, yb);
        ctx.strokeStyle = rgba(c.couleur, al);
        ctx.lineWidth = lw;
        ctx.stroke();
      }
    }
    for (const el of m.elements) {
      if (el.x + (el.w || 20) < x0 - 20 || el.x - 20 > x1) continue;
      if (el.type === 'brin') {
        ctx.beginPath();
        ctx.moveTo(el.x - 1.5, el.y);
        ctx.quadraticCurveTo(el.x + el.c * 0.5, el.y - el.h * 0.6, el.x + el.c, el.y - el.h);
        ctx.quadraticCurveTo(el.x + el.c * 0.5 + 1, el.y - el.h * 0.6, el.x + 1.5, el.y);
        ctx.fillStyle = SOMBRE;
        ctx.fill();
      } else if (el.type === 'rocher') {
        ctx.beginPath();
        ctx.moveTo(el.x, el.y);
        ctx.quadraticCurveTo(el.x + el.w * 0.1, el.y - el.h, el.x + el.w * 0.5, el.y - el.h);
        ctx.quadraticCurveTo(el.x + el.w * 0.95, el.y - el.h * 0.8, el.x + el.w, el.y);
        ctx.fillStyle = SOMBRE;
        ctx.fill();
        trait(ctx, el.x + el.w * 0.3, el.y - el.h * 0.95, el.x + el.w * 0.6, el.y - el.h * 0.98, rgba('#9D8CFF', 0.35), 1.2);
      } else if (el.type === 'borne') {
        rect(ctx, el.x - 3, el.y - el.h, 6, el.h, SOMBRE);
        rect(ctx, el.x - 3, el.y - el.h + 3, 6, 3, el.couleur);
        halo(ctx, el.x, el.y - el.h + 4, 14, el.couleur, 0.5);
      } else if (el.type === 'armoire') {
        rect(ctx, el.x, el.y - el.h, el.w, el.h, SOMBRE);
        rect(ctx, el.x, el.y - el.h, el.w, 1.5, rgba('#7CF3FF', 0.4));
      } else if (el.type === 'rambarde') {
        ctx.beginPath();
        for (let x = el.x; x <= el.x + el.w; x += 28) { ctx.moveTo(x, el.y); ctx.lineTo(x, el.y - el.h); }
        ctx.moveTo(el.x, el.y - el.h); ctx.lineTo(el.x + el.w, el.y - el.h);
        ctx.moveTo(el.x, el.y - el.h * 0.5); ctx.lineTo(el.x + el.w, el.y - el.h * 0.5);
        ctx.strokeStyle = SOMBRE;
        ctx.lineWidth = 3;
        ctx.stroke();
        trait(ctx, el.x, el.y - el.h - 1, el.x + el.w, el.y - el.h - 1, rgba('#FF6FD8', 0.35), 1);
      } else if (el.type === 'poteau') {
        rect(ctx, el.x - 3, el.y - el.h, 6, el.h, SOMBRE);
        rect(ctx, el.x - 9, el.y - el.h + 6, 18, 3, SOMBRE);
      }
    }
  },

  animer(ctx, m, vue) {
    const { t, reduit, px, xMin, xMax, qualite, largeur, hauteur, transform } = vue;
    for (const b of m.roseaux) {
      if (b.x < xMin || b.x > xMax) continue;
      const sw = reduit ? 0 : Math.sin(t / 1400 + b.phase) * 2 * px;
      ctx.beginPath();
      ctx.moveTo(b.x - 1.5, b.y);
      ctx.quadraticCurveTo(b.x + b.c * 0.5, b.y - b.h * 0.6, b.x + b.c + sw, b.y - b.h);
      ctx.quadraticCurveTo(b.x + b.c * 0.5 + 1, b.y - b.h * 0.6, b.x + 1.5, b.y);
      ctx.fillStyle = SOMBRE;
      ctx.fill();
    }
    for (const el of m.elements) {
      if (el.type !== 'armoire' || el.x < xMin || el.x > xMax) continue;
      for (let k = 0; k < el.leds; k++) {
        const on = reduit || ((t + el.phase + k * 130) % 1100) < 700;
        disque(ctx, el.x + 6 + (k % 2) * 10, el.y - el.h + 9 + Math.floor(k / 2) * 8, 1.8, on ? (k % 3 ? '#7BE8A8' : C.cyan) : '#262B63');
      }
    }
    if (qualite === 'haute') {
      ctx.save();
      ctx.setTransform(ctx.getTransform().a / transform.a, 0, 0, ctx.getTransform().d / transform.a, 0, 0);
      for (const b of m.bokeh) {
        const x = ((b.fx * (largeur + 100) + (reduit ? 0 : t * b.vx) + transform.tx * 0.1) % (largeur + 100) + largeur + 100) % (largeur + 100) - 50;
        const y = b.fy * hauteur + (reduit ? 0 : Math.sin(t / 2600 + b.phase) * 4);
        halo(ctx, x, y, b.r, b.c, b.a);
        disque(ctx, x, y, b.r * 0.55, rgba(b.c, b.a * 0.6));
      }
      ctx.restore();
    }
  },
};
