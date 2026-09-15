// Le phare-trieur (independant) : phare rayé orange dont le faisceau tourne toutes les 8 s ; à son pied
// une salle de tri (tubes pneumatiques, enveloppes lumineuses qui montent) ; dans la lanterne, un orbe.

import { rgba, rect, disque, halo, trait, arrondi, grilleFenetres } from '../dessin.js';
import { creerAlea } from '../alea.js';
import { fenetresAnimees, lumiere } from './_commun.js';

const DL = 115;
const H = 380;
const ACCENT = '#FF9A5C';
const PIED = -92;
const GALERIE = -300;
const LANTERNE = { bas: -306, haut: -350 };
const ROTATION_MS = 8000;
const alea = creerAlea(2023);
const FENETRES = grilleFenetres(alea, { x: -92, y: -82, w: 184, h: 44, cols: 12, rows: 2, taux: 0.85, pFroide: 0.2 });

const demiLargeurTour = (y) => 34 - ((y - PIED) / (GALERIE - PIED)) * 15;

export default {
  id: 'independant', demiLargeur: DL, hauteur: H,

  silhouette(ctx) {
    const pts = [[-DL, 0], [-100, -30], [-100, PIED], [-34, PIED], [-19, GALERIE], [-34, GALERIE], [-34, LANTERNE.bas], [-22, LANTERNE.bas],
      [-22, LANTERNE.haut], [0, -372], [22, LANTERNE.haut], [22, LANTERNE.bas], [34, LANTERNE.bas], [34, GALERIE], [19, GALERIE], [34, PIED], [100, PIED], [100, -30], [DL, 0]];
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
  },

  dessinerStatique(ctx) {
    ctx.beginPath();
    ctx.moveTo(-DL, 0);
    ctx.quadraticCurveTo(-90, -34, -40, -30);
    ctx.quadraticCurveTo(20, -40, 70, -28);
    ctx.quadraticCurveTo(104, -26, DL, 0);
    ctx.fillStyle = '#3A3C7E';
    ctx.fill();
    rect(ctx, -100, PIED, 200, -PIED - 26, '#2F3570');
    rect(ctx, -100, PIED, 200, 3, rgba('#FFB38A', 0.7));
    rect(ctx, -100, PIED, 5, -PIED - 26, '#454C92');
    for (const f of FENETRES) rect(ctx, f.x, f.y, f.w, f.h, 'rgba(22,26,64,.7)');
    for (let k = 0; k < 20; k++) {
      const y = PIED + ((GALERIE - PIED) * k) / 20;
      const y2 = PIED + ((GALERIE - PIED) * (k + 1)) / 20;
      const l1 = demiLargeurTour(y), l2 = demiLargeurTour(y2);
      ctx.beginPath();
      ctx.moveTo(-l1, y); ctx.lineTo(l1, y); ctx.lineTo(l2, y2); ctx.lineTo(-l2, y2);
      ctx.closePath();
      ctx.fillStyle = Math.floor(k / 4) % 2 ? '#F3EEFF' : ACCENT;
      ctx.fill();
    }
    ctx.beginPath();
    ctx.moveTo(8, PIED); ctx.lineTo(demiLargeurTour(GALERIE) + 0.5, GALERIE); ctx.lineTo(demiLargeurTour(GALERIE), GALERIE); ctx.lineTo(34, PIED);
    ctx.fillStyle = 'rgba(20,24,62,.28)';
    ctx.fill();
    for (let k = 0; k < 4; k++) rect(ctx, -4, PIED - 30 - k * 50, 8, 11, '#2F3570');
    rect(ctx, -36, GALERIE - 6, 72, 7, '#2F3570');
    ctx.beginPath();
    for (let x = -34; x <= 34; x += 7) { ctx.moveTo(x, GALERIE - 6); ctx.lineTo(x, GALERIE - 14); }
    ctx.moveTo(-34, GALERIE - 14);
    ctx.lineTo(34, GALERIE - 14);
    ctx.strokeStyle = '#2F3570';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    rect(ctx, -22, LANTERNE.haut, 44, LANTERNE.bas - LANTERNE.haut, 'rgba(255,227,163,.25)');
    for (let x = -22; x <= 22; x += 11) rect(ctx, x - 1, LANTERNE.haut, 2, LANTERNE.bas - LANTERNE.haut, '#2F3570');
    ctx.beginPath();
    ctx.moveTo(-26, LANTERNE.haut);
    ctx.quadraticCurveTo(0, -382, 26, LANTERNE.haut);
    ctx.fillStyle = '#2F3570';
    ctx.fill();
    trait(ctx, 0, -366, 0, -386, '#2F3570', 2);
    for (const x of [-58, 58]) {
      arrondi(ctx, x - 5, PIED - 4, 10, -PIED - 28, 5);
      ctx.fillStyle = 'rgba(200,190,255,.18)';
      ctx.fill();
    }
    for (const tx of [-58, 58]) {
      ctx.beginPath();
      ctx.moveTo(tx, PIED);
      ctx.bezierCurveTo(tx, PIED - 70, tx * 0.45, -220, tx * 0.34, GALERIE + 4);
      ctx.strokeStyle = 'rgba(200,190,255,.35)';
      ctx.lineWidth = 7;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(40,46,110,.8)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
  },

  animer(ctx, t, s, etat) {
    const lum = lumiere(etat);
    fenetresAnimees(ctx, FENETRES, etat, { rangs: 2, t, graine: 3 });
    const angle = etat.reduit ? 0.4 : (t / ROTATION_MS) * Math.PI * 2;
    const cx = 0, cy = (LANTERNE.bas + LANTERNE.haut) / 2;
    const c = Math.cos(angle), sn = Math.sin(angle);
    const longueur = 520 * Math.abs(c);
    const ouverture = 34 + 24 * (1 - Math.abs(c));
    const dir = c >= 0 ? 1 : -1;
    const g = ctx.createLinearGradient(cx, 0, cx + dir * longueur, 0);
    g.addColorStop(0, rgba('#FFE3A3', (0.55 + 0.2 * Math.max(0, sn)) * lum));
    g.addColorStop(1, rgba('#FFE3A3', 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 4);
    ctx.lineTo(cx + dir * longueur, cy - ouverture);
    ctx.lineTo(cx + dir * longueur, cy + ouverture * 0.8);
    ctx.lineTo(cx, cy + 4);
    ctx.closePath();
    ctx.fill();
    halo(ctx, cx, cy, 40 + 50 * Math.max(0, sn), '#FFE3A3', (0.35 + 0.5 * Math.max(0, sn)) * lum);
    const souffle = etat.reduit ? 1 : 1 + 0.12 * Math.sin(t / 600);
    halo(ctx, cx, cy, 20 * souffle, '#B98BFF', 0.8 * lum);
    disque(ctx, cx, cy, 8 * souffle, '#FFF1C9');
    disque(ctx, cx, cy, 4, '#FF9EE8');
    for (const tx of [-58, 58]) {
      for (let k = 0; k < 3; k++) {
        const u = etat.reduit ? (k + 1) / 4 : ((t / 3200 + k / 3 + (tx > 0 ? 0.17 : 0)) % 1);
        const b = bezier(u, [tx, PIED], [tx, PIED - 70], [tx * 0.45, -220], [tx * 0.34, GALERIE + 4]);
        halo(ctx, b[0], b[1], 9, ACCENT, 0.8 * lum);
        rect(ctx, b[0] - 4, b[1] - 2.5, 8, 5, '#FFF1C9');
        trait(ctx, b[0] - 4, b[1] - 2.5, b[0], b[1] + 0.5, ACCENT, 0.8);
        trait(ctx, b[0] + 4, b[1] - 2.5, b[0], b[1] + 0.5, ACCENT, 0.8);
      }
    }
    if (!etat.reduit) {
      for (let k = 0; k < 5; k++) {
        const u = ((t / 1800 + k / 5) % 1);
        const x = -80 + u * 160;
        rect(ctx, x - 4, -30 - 2, 8, 5, rgba('#FFF1C9', 0.9));
      }
    }
    rect(ctx, -92, -30, 184, 2, 'rgba(255,154,92,.6)');
  },
};

function bezier(u, a, b, c, d) {
  const v = 1 - u;
  return [
    v * v * v * a[0] + 3 * v * v * u * b[0] + 3 * v * u * u * c[0] + u * u * u * d[0],
    v * v * v * a[1] + 3 * v * v * u * b[1] + 3 * v * u * u * c[1] + u * u * u * d[1],
  ];
}
