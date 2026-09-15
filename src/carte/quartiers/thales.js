// Le tableau de bord (thales) : une salle de supervision vitrée dont le mur de six écrans trace des courbes, un
// nuage de points, des barres, une aire, une jauge et un pouls ; trois opérateurs au pupitre ; sur le toit, un grand
// écran monté sur deux mâts suit le remplissage d'un volume face à son seuil. À droite, la tour technique garde son
// mur-écran et son discret collecte.py.

import { rgba, rect, disque, halo, texte, trait, grilleFenetres, POLICE_MONO } from '../dessin.js';
import { creerAlea } from '../alea.js';
import { fenetresAnimees, lumiere } from './_commun.js';

const DL = 175;
const H = 270;
const ACCENT = '#3EE0C0', AMBRE = '#FFB86B', CYAN = '#9FE8FF', ROSE = '#FF6FD8', VERT = '#7BE8A8', ROUGE = '#E8503A', OR = '#FFD166';
const CORPS = '#2F3570', LISERE = '#454C92', SOMBRE = '#1A1F4D', FOND_ECRAN = '#10163C';

const SALLE = { x0: -168, x1: 58, haut: -150 };
const TYPES = ['courbes', 'nuage', 'barres', 'aire', 'jauge', 'pouls'];
const MUR = [0, 1].flatMap((rang) => [0, 1, 2].map((col) => ({ x: -158 + col * 72, y: -138 + rang * 42, w: 62, h: 36, type: TYPES[rang * 3 + col] })));
const PUPITRE = [-140, -86, -18, 36];
const OPERATEURS = [-113, -52, 9];
const PANNEAU = { x: -142, y: -250, w: 156, h: 76 };
const MATS = [-118, -10];
const TOUR = { x0: 66, x1: 170, haut: -262 };
const ECRAN = { x: 76, y: -252, w: 86, h: 70 };
const alea = creerAlea(2020);
const FENETRES = grilleFenetres(alea, { x: TOUR.x0 + 8, y: -170, w: TOUR.x1 - TOUR.x0 - 16, h: 110, cols: 6, rows: 6, taux: 0.7, pFroide: 0.6 });
const NUAGE = Array.from({ length: 22 }, () => ({ x: 0.3 + alea.n() * 0.68, y: alea.n() * 0.7, r: 0.6 + alea.n() * 1.8 }));
const COURBES_TOUR = [ACCENT, AMBRE, CYAN, ROSE];

function ecran(ctx, e, t, lum, reduit) {
  const d = t / 1000;
  const X = (u) => e.x + 3 + (e.w - 6) * u;
  const Y = (v) => e.y + e.h - 3 - (e.h - 6) * v;
  ctx.save();
  ctx.beginPath();
  ctx.rect(e.x, e.y, e.w, e.h);
  ctx.clip();
  ctx.fillStyle = rgba(ACCENT, 0.07 * lum);
  for (let k = 1; k < 3; k++) ctx.fillRect(e.x, e.y + (e.h * k) / 3, e.w, 0.7);
  ctx.lineWidth = 1.2;

  if (e.type === 'courbes') {
    [ACCENT, AMBRE, CYAN].forEach((c, k) => {
      ctx.beginPath();
      for (let i = 0; i <= 20; i++) {
        const u = i / 20;
        const v = 0.2 + k * 0.24 + 0.11 * Math.sin(u * 7 + k * 2 + d * 1.3);
        if (i) ctx.lineTo(X(u), Y(v)); else ctx.moveTo(X(u), Y(v));
      }
      ctx.strokeStyle = rgba(c, 0.95 * lum);
      ctx.stroke();
    });
  } else if (e.type === 'nuage') {
    for (const p of NUAGE) disque(ctx, X(p.x), Y(p.y), p.r, rgba(CYAN, 0.7 * lum));
    // Le gros fichier ancien, en haut à gauche : repéré, puis supprimé, puis la boucle recommence.
    const cycle = reduit ? 0.3 : (d / 5) % 1;
    const taille = cycle < 0.7 ? 4.5 : 4.5 * (1 - (cycle - 0.7) / 0.3);
    if (taille > 0.2) {
      const gx = X(0.12), gy = Y(0.8);
      disque(ctx, gx, gy, taille, rgba(AMBRE, 0.9 * lum));
      ctx.beginPath();
      ctx.arc(gx, gy, taille + 2.5 + (reduit ? 0 : 1.2 * Math.sin(d * 5)), 0, Math.PI * 2);
      ctx.strokeStyle = rgba(OR, 0.9 * lum);
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  } else if (e.type === 'barres') {
    const largeur = (e.w - 6) / 7 - 2;
    for (let i = 0; i < 7; i++) {
      const v = 0.18 + 0.66 * Math.abs(Math.sin(i * 1.3 + d * 0.9));
      ctx.fillStyle = rgba(i === 4 ? AMBRE : ACCENT, 0.85 * lum);
      ctx.fillRect(X(i / 7) + 1, Y(v), largeur, Y(0) - Y(v));
    }
  } else if (e.type === 'aire') {
    ctx.beginPath();
    ctx.moveTo(X(0), Y(0));
    for (let i = 0; i <= 20; i++) {
      const u = i / 20;
      ctx.lineTo(X(u), Y(0.25 + 0.22 * Math.sin(u * 5 + d) + 0.25 * u));
    }
    ctx.lineTo(X(1), Y(0));
    ctx.closePath();
    ctx.fillStyle = rgba(ROSE, 0.3 * lum);
    ctx.fill();
    ctx.strokeStyle = rgba(ROSE, 0.95 * lum);
    ctx.stroke();
  } else if (e.type === 'jauge') {
    const cx = e.x + e.w / 2, cy = e.y + e.h - 7, rayon = 14;
    const pct = reduit ? 0.94 : 0.9 + 0.05 * (0.5 + 0.5 * Math.sin(d * 0.8));
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cx, cy, rayon, Math.PI, 2 * Math.PI);
    ctx.strokeStyle = rgba('#6D7BC8', 0.4 * lum);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, rayon, Math.PI, Math.PI + Math.PI * pct);
    ctx.strokeStyle = rgba(pct > 0.92 ? ROUGE : AMBRE, 0.95 * lum);
    ctx.stroke();
    const a = Math.PI * 1.75;
    trait(ctx, cx + Math.cos(a) * (rayon - 5), cy + Math.sin(a) * (rayon - 5), cx + Math.cos(a) * (rayon + 5), cy + Math.sin(a) * (rayon + 5), rgba(OR, lum), 1.2);
    texte(ctx, `${Math.round(pct * 100)} %`, cx, cy - 4, { taille: 7, poids: 600, couleur: rgba('#EEF1FF', lum), police: POLICE_MONO });
  } else if (e.type === 'pouls') {
    const decalage = reduit ? 0 : (d * 0.6) % 1;
    ctx.beginPath();
    for (let i = 0; i <= 40; i++) {
      const u = i / 40;
      const phase = (u + decalage) % 1;
      const pic = phase > 0.45 && phase < 0.55 ? Math.sin(((phase - 0.45) / 0.1) * Math.PI) * 0.5 : 0;
      const v = 0.32 + pic + 0.03 * Math.sin(u * 30);
      if (i) ctx.lineTo(X(u), Y(v)); else ctx.moveTo(X(u), Y(v));
    }
    ctx.strokeStyle = rgba(VERT, 0.95 * lum);
    ctx.stroke();
  }
  ctx.restore();
}

function panneau(ctx, t, lum, reduit) {
  const e = PANNEAU, d = t / 1000;
  const X = (u) => e.x + 6 + (e.w - 12) * u;
  const Y = (v) => e.y + e.h - 6 - (e.h - 20) * v;
  const mesure = (u) => 0.3 + 0.55 * u + 0.05 * Math.sin(u * 17) + 0.025 * Math.sin(u * 41);
  ctx.save();
  ctx.beginPath();
  ctx.rect(e.x, e.y, e.w, e.h);
  ctx.clip();
  ctx.fillStyle = rgba(ACCENT, 0.07 * lum);
  for (let k = 1; k < 4; k++) ctx.fillRect(e.x, e.y + (e.h * k) / 4, e.w, 0.8);
  for (let k = 1; k < 6; k++) ctx.fillRect(e.x + (e.w * k) / 6, e.y, 0.8, e.h);
  ctx.setLineDash([4, 3]);
  trait(ctx, X(0), Y(0.75), X(1), Y(0.75), rgba(ROUGE, 0.85 * lum), 1);
  ctx.setLineDash([]);
  const n = 36;
  const avance = reduit ? 1 : 0.35 + 0.65 * ((d / 8) % 1);
  const fin = Math.max(2, Math.floor(n * avance));
  ctx.beginPath();
  for (let i = 0; i <= fin; i++) {
    const u = i / n;
    if (i) ctx.lineTo(X(u), Y(mesure(u))); else ctx.moveTo(X(u), Y(mesure(u)));
  }
  ctx.strokeStyle = rgba(ACCENT, lum);
  ctx.lineWidth = 1.8;
  ctx.stroke();
  ctx.lineTo(X(fin / n), Y(0));
  ctx.lineTo(X(0), Y(0));
  ctx.closePath();
  ctx.fillStyle = rgba(ACCENT, 0.12 * lum);
  ctx.fill();
  const u = fin / n, v = mesure(u);
  ctx.setLineDash([3, 3]);
  trait(ctx, X(u), Y(v), X(Math.min(1, u + 0.22)), Y(v + 0.16), rgba(AMBRE, 0.9 * lum), 1.2);
  ctx.setLineDash([]);
  disque(ctx, X(u), Y(v), 2.4, rgba('#FFFFFF', lum));
  ctx.restore();
  texte(ctx, 'vol-projets', e.x + 8, e.y + 9, { taille: 7.5, poids: 600, couleur: rgba(CYAN, lum), align: 'left', police: POLICE_MONO });
  texte(ctx, `${Math.round(100 * Math.min(0.99, v))} %`, e.x + e.w - 8, e.y + 9, { taille: 8, poids: 600, couleur: rgba(v > 0.75 ? AMBRE : ACCENT, lum), align: 'right', police: POLICE_MONO });
  texte(ctx, 'seuil 75 %', e.x + e.w - 8, Y(0.75) + 7, { taille: 6.5, poids: 500, couleur: rgba(ROUGE, 0.9 * lum), align: 'right', police: POLICE_MONO });
}

export default {
  id: 'thales', demiLargeur: DL, hauteur: H,

  silhouette(ctx) {
    ctx.moveTo(-DL, 0);
    ctx.lineTo(-DL, SALLE.haut - 4);
    ctx.lineTo(PANNEAU.x - 6, SALLE.haut - 4);
    ctx.lineTo(PANNEAU.x - 6, PANNEAU.y - 6);
    ctx.lineTo(PANNEAU.x + PANNEAU.w + 6, PANNEAU.y - 6);
    ctx.lineTo(PANNEAU.x + PANNEAU.w + 6, SALLE.haut - 4);
    ctx.lineTo(TOUR.x0, SALLE.haut - 4);
    ctx.lineTo(TOUR.x0, TOUR.haut);
    ctx.lineTo(TOUR.x1, TOUR.haut);
    ctx.lineTo(TOUR.x1, 0);
    ctx.closePath();
  },

  dessinerStatique(ctx) {
    // Socle commun.
    rect(ctx, -DL, -10, 2 * DL, 10, LISERE);
    rect(ctx, -DL, -10, 2 * DL, 1.5, rgba(VERT, 0.5));

    // La salle de supervision : corps, toit, verrière et ses montants.
    rect(ctx, SALLE.x0, SALLE.haut, SALLE.x1 - SALLE.x0, -10 - SALLE.haut, CORPS);
    rect(ctx, SALLE.x0, SALLE.haut, 4, -10 - SALLE.haut, LISERE);
    rect(ctx, SALLE.x0, SALLE.haut, SALLE.x1 - SALLE.x0, 3, rgba('#FFB38A', 0.7));
    rect(ctx, SALLE.x0 + 6, -144, SALLE.x1 - SALLE.x0 - 12, 134, '#232A5E');
    for (let x = SALLE.x0 + 6; x <= SALLE.x1 - 6; x += 37.6) rect(ctx, x, -144, 1.2, 134, rgba('#6D7BC8', 0.35));

    // Le mur d'écrans.
    for (const e of MUR) {
      rect(ctx, e.x - 3, e.y - 3, e.w + 6, e.h + 6, SOMBRE);
      rect(ctx, e.x, e.y, e.w, e.h, FOND_ECRAN);
    }

    // Opérateurs et pupitre.
    for (const x of OPERATEURS) {
      disque(ctx, x, -48, 4.2, '#161A40');
      rect(ctx, x - 7, -44, 14, 12, '#161A40');
    }
    for (const x of PUPITRE) rect(ctx, x - 7, -44, 14, 9, SOMBRE);
    rect(ctx, SALLE.x0 + 12, -34, SALLE.x1 - SALLE.x0 - 24, 5, '#262C66');
    rect(ctx, SALLE.x0 + 12, -29, SALLE.x1 - SALLE.x0 - 24, 19, '#1E2458');

    // Le grand écran de toit, sur deux mâts.
    for (const m of MATS) rect(ctx, m - 2, PANNEAU.y + PANNEAU.h, 4, SALLE.haut - (PANNEAU.y + PANNEAU.h), '#262C66');
    rect(ctx, PANNEAU.x - 5, PANNEAU.y - 5, PANNEAU.w + 10, PANNEAU.h + 10, SOMBRE);
    rect(ctx, PANNEAU.x, PANNEAU.y, PANNEAU.w, PANNEAU.h, FOND_ECRAN);

    // La tour technique.
    rect(ctx, TOUR.x0, TOUR.haut, TOUR.x1 - TOUR.x0, -TOUR.haut, CORPS);
    rect(ctx, TOUR.x0, TOUR.haut, 5, -TOUR.haut, LISERE);
    rect(ctx, TOUR.x0, TOUR.haut, TOUR.x1 - TOUR.x0, 2.5, rgba('#FFB38A', 0.7));
    for (const f of FENETRES) rect(ctx, f.x, f.y, f.w, f.h, 'rgba(22,26,64,.7)');
    rect(ctx, ECRAN.x - 4, ECRAN.y - 4, ECRAN.w + 8, ECRAN.h + 8, SOMBRE);
    rect(ctx, ECRAN.x, ECRAN.y, ECRAN.w, ECRAN.h, FOND_ECRAN);
    rect(ctx, 96, -52, 46, 42, '#232A5E');
    for (let k = 0; k < 5; k++) rect(ctx, 99, -48 + k * 7, 40, 5, SOMBRE);
    texte(ctx, 'collecte.py', 119, -58, { taille: 8, poids: 500, couleur: 'rgba(159,232,255,.75)', police: POLICE_MONO });
  },

  animer(ctx, t, s, etat) {
    const lum = lumiere(etat);
    const reduit = etat.reduit;
    const temps = reduit ? 0 : t;

    halo(ctx, PANNEAU.x + PANNEAU.w / 2, PANNEAU.y + PANNEAU.h / 2, 110, ACCENT, 0.2 * lum);
    halo(ctx, (SALLE.x0 + SALLE.x1) / 2, -90, 120, CYAN, 0.12 * lum);
    for (const e of MUR) ecran(ctx, e, temps, lum, reduit);
    panneau(ctx, temps, lum, reduit);
    PUPITRE.forEach((x, k) => {
      const a = reduit ? 0.55 : 0.45 + 0.15 * Math.sin(t / 700 + k);
      ctx.fillStyle = rgba(k % 2 ? CYAN : ACCENT, a * lum);
      ctx.fillRect(x - 5.5, -42.5, 11, 6);
    });

    // La tour : fenêtres, mur-écran à quatre courbes et tendance, voyants.
    fenetresAnimees(ctx, FENETRES, etat, { rangs: 6, t, froide: CYAN, graine: 5 });
    halo(ctx, ECRAN.x + ECRAN.w / 2, ECRAN.y + ECRAN.h / 2, 80, ACCENT, 0.22 * lum);
    ctx.save();
    ctx.beginPath();
    ctx.rect(ECRAN.x, ECRAN.y, ECRAN.w, ECRAN.h);
    ctx.clip();
    ctx.fillStyle = 'rgba(62,224,192,.08)';
    for (let k = 1; k < 4; k++) ctx.fillRect(ECRAN.x, ECRAN.y + (ECRAN.h * k) / 4, ECRAN.w, 0.8);
    const avance = reduit ? 1 : ((t / 5000) % 1);
    COURBES_TOUR.forEach((c, k) => {
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
    trait(ctx, ECRAN.x + ECRAN.w * 0.5, ECRAN.y + ECRAN.h * 0.42, ECRAN.x + ECRAN.w, ECRAN.y + ECRAN.h * 0.08, rgba(AMBRE, 0.95), 1.2);
    ctx.setLineDash([]);
    ctx.restore();
    texte(ctx, 'J+12', ECRAN.x + ECRAN.w - 14, ECRAN.y + 9, { taille: 7.5, poids: 600, couleur: AMBRE, police: POLICE_MONO });
    for (let k = 0; k < 5; k++) {
      const on = reduit || ((t + k * 190) % 1000) < 650;
      disque(ctx, 136, -46 + k * 7, 1.2, on ? (k === 2 ? AMBRE : ACCENT) : SOMBRE);
    }
  },
};
