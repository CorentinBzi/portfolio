// Le campus (ecole) : bâtiment en U dont les ailes montent (une par formation), amphithéâtre à coupole,
// arbres, drapeau QSP{…}, façade de blocs Scratch qui s'allument comme un programme, tableau base64/hex.

import { FORMATION } from '../../cv.js';
import { rgba, rect, disque, halo, arbre, texte, trait, arrondi, POLICE_MONO } from '../dessin.js';
import { creerAlea } from '../alea.js';
import { grilleFenetres } from '../dessin.js';
import { fenetresAnimees, lumiere } from './_commun.js';

const DL = 240;
const H = 330;
const BLOCS = ['#FFAB19', '#4C97FF', '#59C059', '#CF63CF', '#9966FF'];
const LIGNES_TABLEAU = ['UVNQe2Jhc2U2NH0=', '51 53 50 7B 68 65', 'ZGVjb2RlIC0tYjY0', '78 6F 72 20 6B 65', 'Y2hpZmZyZXIgIQ==', '7D 0A 3E 3E 20 4F', 'bGlyZSBsZXMgbG9n', '4B 20 5B 20 4F 4B'];

const NB_AILES = Math.max(1, Math.min(5, FORMATION.length));
const alea = creerAlea(3031);
const AILES = Array.from({ length: NB_AILES }, (_, i) => {
  const largeur = (2 * (DL - 15)) / NB_AILES;
  const x = -(DL - 15) + i * largeur;
  const h = 160 + ((H - 10 - 160) * i) / Math.max(1, NB_AILES - 1);
  const avant = i === 0 || i === NB_AILES - 1;
  return {
    x, w: largeur, h, avant,
    fenetres: grilleFenetres(alea, { x: x + 10, y: -h + 14, w: largeur - 20, h: h - 40, cols: Math.round((largeur - 20) / 15), rows: Math.round((h - 40) / 21), taux: 0.72, pFroide: 0.25 }),
    rangs: Math.round((h - 40) / 21),
  };
});
const CENTRE = AILES[Math.floor(NB_AILES / 2)];

export default {
  id: 'ecole', demiLargeur: DL, hauteur: H,

  silhouette(ctx) {
    ctx.moveTo(-(DL - 15), 0);
    for (const a of AILES) { ctx.lineTo(a.x, -a.h); ctx.lineTo(a.x + a.w, -a.h); }
    ctx.lineTo(DL - 15, 0);
    ctx.closePath();
  },

  dessinerStatique(ctx) {
    rect(ctx, -DL, -10, 2 * DL, 10, '#454C92');
    rect(ctx, -DL, -10, 2 * DL, 1.5, rgba('#FFB38A', 0.6));
    for (const a of AILES) {
      const corps = a.avant ? '#343B7C' : '#2F3570';
      rect(ctx, a.x, -a.h, a.w, a.h - 8, corps);
      rect(ctx, a.x, -a.h, 6, a.h - 8, '#454C92');
      rect(ctx, a.x, -a.h, a.w, 3, rgba('#FFB38A', 0.7));
      rect(ctx, a.x - 4, -a.h - 8, a.w + 8, 8, '#262C66');
      for (const f of a.fenetres) rect(ctx, f.x, f.y, f.w, f.h, 'rgba(22,26,64,.75)');
      for (let k = 1; k < 6; k++) rect(ctx, a.x + (a.w * k) / 6, -a.h + 8, 1, a.h - 16, 'rgba(20,24,62,.35)');
      if (a.avant) {
        const retour = a.x < 0 ? a.x + a.w : a.x - 16;
        rect(ctx, retour, -a.h + 10, 16, a.h - 18, '#252B63');
      }
    }
    const panneau = { x: CENTRE.x + 18, y: -CENTRE.h + 18, w: CENTRE.w - 36, h: 66 };
    rect(ctx, panneau.x - 4, panneau.y - 4, panneau.w + 8, panneau.h + 8, '#1C2152');
    blocsScratch(ctx, panneau, () => 0.35);
    const gauche = AILES[0];
    rect(ctx, gauche.x + 12, -gauche.h + 40, gauche.w - 24, 50, '#141A44');
    rect(ctx, gauche.x + 12, -gauche.h + 40, gauche.w - 24, 2, '#7BE8A8');
    const g = ctx.createLinearGradient(0, -150, 0, -70);
    g.addColorStop(0, '#6D78C8');
    g.addColorStop(1, '#3A4088');
    rect(ctx, -78, -78, 156, 70, '#3A4088');
    for (let k = 0; k < 9; k++) rect(ctx, -70 + k * 17.5, -70, 8, 50, 'rgba(255,217,154,.28)');
    ctx.beginPath();
    ctx.ellipse(0, -78, 84, 64, 0, Math.PI, 0);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.beginPath();
    for (let k = 1; k < 8; k++) {
      const ang = Math.PI + (k * Math.PI) / 8;
      ctx.moveTo(0, -142);
      ctx.quadraticCurveTo(Math.cos(ang) * 70, -78 + Math.sin(ang) * 40, Math.cos(ang) * 84, -78);
    }
    ctx.strokeStyle = 'rgba(200,190,255,.35)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    rect(ctx, -10, -156, 20, 14, '#2F3570');
    rect(ctx, -24, -30, 48, 22, '#1F2458');
    rect(ctx, -24, -30, 48, 2, rgba('#F2D13B', 0.8));
    const droite = AILES[NB_AILES - 1];
    trait(ctx, droite.x + droite.w - 26, -droite.h - 8, droite.x + droite.w - 26, -droite.h - 78, '#1F2458', 2.5);
    const a2 = creerAlea(77);
    arbre(ctx, a2, -DL + 10, -8, 74, '#3E5A9C', '#7BE8A8');
    arbre(ctx, a2, -DL + 52, -8, 58, '#46609E', '#7BE8A8');
    arbre(ctx, a2, DL - 48, -8, 66, '#3E5A9C', '#7BE8A8');
    arbre(ctx, a2, DL - 12, -8, 80, '#46609E', '#7BE8A8');
    for (const lx of [-120, 120]) { trait(ctx, lx, -10, lx, -46, '#1F2458', 1.8); rect(ctx, lx - 5, -50, 10, 4, '#1F2458'); }
  },

  animer(ctx, t, s, etat) {
    for (const a of AILES) fenetresAnimees(ctx, a.fenetres, etat, { rangs: a.rangs, t, graine: Math.round(a.x) });
    const L = lumiere(etat);
    const panneau = { x: CENTRE.x + 18, y: -CENTRE.h + 18, w: CENTRE.w - 36, h: 66 };
    const actif = etat.reduit ? 7 : Math.floor(t / 280) % 24;
    blocsScratch(ctx, panneau, (i) => (i === actif ? 1 : i < actif ? 0.75 * L : 0.4 * L), (i) => i === actif);
    const gauche = AILES[0];
    const x0 = gauche.x + 16, y0 = -gauche.h + 48, largeur = gauche.w - 32;
    ctx.save();
    ctx.beginPath();
    ctx.rect(gauche.x + 12, -gauche.h + 43, gauche.w - 24, 46);
    ctx.clip();
    const decal = etat.reduit ? 0 : (t / 90) % 10;
    const debut = etat.reduit ? 0 : Math.floor(t / 900);
    for (let k = 0; k < 5; k++) {
      const ligne = LIGNES_TABLEAU[(debut + k) % LIGNES_TABLEAU.length];
      texte(ctx, ligne.slice(0, Math.max(6, Math.floor(largeur / 6.4))), x0, y0 + k * 10 - decal + 4, { taille: 8.5, poids: 500, couleur: k % 2 ? '#9FE8FF' : '#7BE8A8', align: 'left', police: POLICE_MONO });
    }
    ctx.restore();
    const droite = AILES[NB_AILES - 1];
    const mx = droite.x + droite.w - 26, my = -droite.h - 78;
    ctx.beginPath();
    ctx.moveTo(mx, my);
    const pts = [];
    for (let i = 0; i <= 8; i++) {
      const u = i / 8;
      const onde = etat.reduit ? Math.sin(u * 3) * 2 : Math.sin(u * 5 - t / 260) * 3.2 * u;
      pts.push([mx - 64 * u, my + onde]);
    }
    pts.forEach(([x, y]) => ctx.lineTo(x, y));
    for (let i = 8; i >= 0; i--) ctx.lineTo(pts[i][0], pts[i][1] + 26);
    ctx.closePath();
    ctx.fillStyle = '#F2D13B';
    ctx.fill();
    ctx.save();
    ctx.translate(mx - 32, my + 13 + (etat.reduit ? 1 : Math.sin(2.5 - t / 260) * 1.6));
    texte(ctx, 'QSP{…}', 0, 0, { taille: 10, poids: 600, couleur: '#1A1633', police: POLICE_MONO });
    ctx.restore();
    halo(ctx, 0, -150, 34, '#F2D13B', 0.55 * L);
    disque(ctx, 0, -150, 4, '#FFF1C9');
    if (!etat.reduit) {
      for (let k = 0; k < 4; k++) {
        const u = ((t / 9000 + k / 4) % 1);
        const x = -DL + 30 + u * (2 * DL - 60);
        rect(ctx, x - 2, -26, 4, 12, '#1F2458');
        disque(ctx, x, -29, 3, '#1F2458');
      }
    }
  },
};

function blocsScratch(ctx, p, alpha, brillant = () => false) {
  const cols = 8, rows = 3;
  const bw = p.w / cols, bh = p.h / rows;
  let i = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++, i++) {
      const couleur = BLOCS[(c + r * 2) % BLOCS.length];
      const x = p.x + c * bw + (r % 2) * 4, y = p.y + r * bh;
      arrondi(ctx, x + 1, y + 2, bw - 5, bh - 5, 3);
      ctx.fillStyle = rgba(couleur, alpha(i));
      ctx.fill();
      rect(ctx, x + bw * 0.3, y + 1, bw * 0.22, 2.5, rgba(couleur, alpha(i)));
      if (brillant(i)) halo(ctx, x + bw / 2, y + bh / 2, bw, couleur, 0.7);
    }
  }
}
