// P1 · Horizon (couche Sites) : îles et caps fondus dans l'horizon, éoliennes, mâts à feux ambre,
// campus bas et exactement cinq campus de data centers « DC 1 » à « DC 5 » entre X 470 et 700.

import { C, rgba, melange, rect, crete, remplirCrete, eolienne, etiquette, disque, halo, trait } from '../dessin.js';
import { libre } from '../niveaux-carte.js';
import { bruit } from '../alea.js';
import { NB_CAMPUS_DC } from '../niveaux-carte.js';

const BASE = 560;
const S = 0.631;
const XA = -1400;
const XB = 2160;
const TAU = Math.PI * 2;

function profilCap(cap, x) {
  if (x < cap.x0 || x > cap.x1) return BASE;
  const u = (x - cap.x0) / (cap.x1 - cap.x0);
  const forme = Math.pow(Math.sin(Math.PI * Math.pow(u, cap.bosse)), 0.75);
  return BASE + 4 - cap.h * forme;
}

export default {
  id: 'horizon', facteur: 0.18, bande: [80, 600], resolution: 0.6,

  generer(alea, { emprises }) {
    const lointain = crete(alea, XA, XB, 16, 558, 30, [0.0021, 0.006, 0.017]);
    const caps = [{ x0: 610, x1: 960, h: 64, bosse: 0.9 }];
    let x = XA;
    while (x < XB) {
      const w = alea.entre(180, 420);
      if (x + w < 600 || x > 980) caps.push({ x0: x, x1: x + w, h: alea.entre(24, 80), bosse: alea.entre(0.7, 1.3) });
      x += w + alea.entre(40, 160);
    }
    const hauteurSol = (xx) => Math.min(...caps.map((c) => profilCap(c, xx)));

    const dc = [];
    for (let i = 0; i < NB_CAMPUS_DC; i++) {
      const w = 36;
      dc.push({ x: 474 + i * 42, w, h: 22 + ((i * 7) % 3) * 5, nom: `DC ${i + 1}` });
    }
    const campus = [];
    const fenetres = [];
    for (let i = 0; i < 18; i++) {
      const w = alea.entre(26, 74) * S * 1.4;
      let xc = alea.entre(XA + 40, XB - 80);
      if (!libre([{ x0: 440, x1: 720 }, ...emprises], xc, xc + w)) xc = xc < 600 ? xc - 300 : xc + 320;
      const h = alea.entre(10, 30);
      campus.push({ x: xc, w, h, sol: hauteurSol(xc + w / 2) });
      for (let k = 0; k < Math.floor(w / 5); k++) fenetres.push({ x: xc + 2 + k * 5, y: hauteurSol(xc + w / 2) - h * 0.55 });
    }
    const eoliennes = [];
    while (eoliennes.length < 12) {
      const xe = alea.entre(XA + 30, XB - 30);
      if (!libre([{ x0: 440, x1: 860 }], xe - 20, xe + 20)) continue;
      eoliennes.push({ x: xe, sol: hauteurSol(xe), h: alea.entre(34, 52), phase: alea.entre(0, TAU) });
    }
    const mats = [];
    for (let i = 0; i < 7; i++) {
      const xm = alea.entre(XA + 50, XB - 50);
      if (!libre([{ x0: 660, x1: 850 }], xm - 10, xm + 10)) continue;
      mats.push({ x: xm, sol: hauteurSol(xm), h: alea.entre(46, 74), phase: alea.entre(0, 1500) });
    }
    return { lointain, caps, dc, campus, fenetres, eoliennes, mats };
  },

  dessinerTuile(ctx, m, x0, x1) {
    const pts = m.lointain.filter(([x]) => x >= x0 - 20 && x <= x1 + 20);
    if (pts.length > 1) remplirCrete(ctx, pts, 600, melange(C.horizon, '#FFB38A', 0.3));
    for (const cap of m.caps) {
      if (cap.x1 < x0 || cap.x0 > x1) continue;
      ctx.beginPath();
      ctx.moveTo(cap.x0, 600);
      for (let x = cap.x0; x <= cap.x1; x += 6) ctx.lineTo(x, profilCap(cap, x));
      ctx.lineTo(cap.x1, 600);
      ctx.closePath();
      const g = ctx.createLinearGradient(0, BASE - cap.h, 0, 600);
      g.addColorStop(0, melange(C.horizon, '#6F69B4', 0.25));
      g.addColorStop(1, melange(C.horizon, '#FFB38A', 0.2));
      ctx.fillStyle = g;
      ctx.fill();
      ctx.beginPath();
      for (let x = cap.x0; x <= cap.x1; x += 6) ctx.lineTo(x, profilCap(cap, x));
      ctx.strokeStyle = rgba(C.lisere, 0.75);
      ctx.lineWidth = 1.3;
      ctx.stroke();
    }
    for (const c of m.campus) {
      if (c.x + c.w < x0 || c.x > x1) continue;
      rect(ctx, c.x, c.sol - c.h, c.w, c.h + 6, melange('#5E5AA6', C.horizon, 0.3));
      rect(ctx, c.x, c.sol - c.h, c.w, 1.2, rgba(C.lisere, 0.6));
      for (let k = 2; k < c.w - 3; k += 5) rect(ctx, c.x + k, c.sol - c.h * 0.6, 2.6, 2.2, rgba(k % 3 ? C.chaude : C.froide, 0.45));
    }
    for (const d of m.dc) {
      if (d.x + d.w < x0 || d.x > x1) continue;
      const sol = BASE + 2;
      rect(ctx, d.x - 3, sol - 4, d.w + 6, 6, '#4F4C98');
      rect(ctx, d.x, sol - d.h, d.w, d.h, '#4A4896');
      rect(ctx, d.x, sol - d.h, d.w, 2, rgba('#5AA9E6', 0.9));
      for (let k = 0; k < 3; k++) rect(ctx, d.x + 3, sol - d.h + 6 + k * 5, d.w - 6, 1.6, rgba(k % 2 ? '#9FE8FF' : '#5AA9E6', 0.7));
      for (let k = 0; k < 4; k++) rect(ctx, d.x + 3 + k * 8.5, sol - d.h - 4, 6, 4, '#3C3A84');
    }
    for (const e of m.eoliennes) if (e.x > x0 - 30 && e.x < x1 + 30) trait(ctx, e.x, e.sol, e.x, e.sol - e.h, melange('#EEF1FF', C.horizon, 0.45), 1.3);
    for (const ma of m.mats) if (ma.x > x0 - 10 && ma.x < x1 + 10) trait(ctx, ma.x, ma.sol, ma.x, ma.sol - ma.h, '#57539E', 1.4);
    const brume = ctx.createLinearGradient(0, 548, 0, 600);
    brume.addColorStop(0, rgba('#FFB38A', 0));
    brume.addColorStop(1, rgba('#FFB38A', 0.28));
    ctx.fillStyle = brume;
    ctx.fillRect(x0, 548, x1 - x0, 52);
  },

  animer(ctx, m, vue) {
    const { t, reduit, px, xMin, xMax } = vue;
    const dedans = (x) => x > xMin && x < xMax;
    for (const e of m.eoliennes) {
      if (!dedans(e.x)) continue;
      const angle = reduit ? e.phase : e.phase + (t / 1000) * 0.2 * TAU;
      ctx.beginPath();
      for (let i = 0; i < 3; i++) {
        const a = angle + (i * TAU) / 3;
        ctx.moveTo(e.x, e.sol - e.h);
        ctx.lineTo(e.x + Math.cos(a) * e.h * 0.42, e.sol - e.h + Math.sin(a) * e.h * 0.42);
      }
      ctx.strokeStyle = 'rgba(244,242,255,.85)';
      ctx.lineWidth = 1.1;
      ctx.stroke();
    }
    for (const ma of m.mats) {
      if (!dedans(ma.x)) continue;
      const allume = reduit || (t + ma.phase) % 1500 < 750;
      if (allume) { halo(ctx, ma.x, ma.sol - ma.h, 9 * px, C.ambre, 0.9); disque(ctx, ma.x, ma.sol - ma.h, 1.6 * px, C.ambre); }
    }
    const tick = reduit ? 3 : Math.floor(t / 900);
    m.fenetres.forEach((f, i) => {
      if (dedans(f.x) && bruit(i, tick) < 0.012) { rect(ctx, f.x - 0.5, f.y - 0.5, 3.6, 3.2, '#FFFFFF'); halo(ctx, f.x + 1.3, f.y + 1, 6 * px, C.chaude, 0.5); }
    });
    m.dc.forEach((d, i) => {
      const cx = d.x + d.w / 2;
      if (!dedans(cx)) return;
      const allume = reduit || (t + d.x * 13) % 1500 < 800;
      if (allume) disque(ctx, d.x + d.w - 3, BASE + 2 - d.h - 5, 1.4 * px, C.ambre);
      const decal = (i % 2 ? 21 : 0) * px;
      trait(ctx, cx, BASE + 2 - d.h - 4, cx, BASE + 2 - d.h - 10 * px - decal, rgba('#9FE8FF', 0.6), px);
      etiquette(ctx, d.nom, cx, BASE + 2 - d.h - 17 * px - decal, { taille: 9 * px, couleur: '#9FE8FF' });
    });
  },
};
