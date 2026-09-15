// La tour-noyau (scenario) : 700 u sur le cap, visible de toute la baie. Son dernier tiers est un échafaudage
// avec une grue (« en construction » : c'est une mise en situation) ; au sommet, un noyau en orbite
// dont le faisceau rejoint la constellation ; bandeau vertical « MISE EN SITUATION ».

import { rgba, rect, disque, halo, trait, texte, POLICE_MONO } from '../dessin.js';
import { lumiere } from './_commun.js';

const DL = 75;
const H = 700;
const ACCENT = '#FF6FD8';
const CORPS_HAUT = -460;
const ECHAF_HAUT = -640;
const NOYAU_Y = -668;
const BANDEAU = { x: 14, y0: -90, y1: -440 };

const largeur = (y) => 46 - ((y + 30) / (CORPS_HAUT + 30)) * 16;

export default {
  id: 'scenario', demiLargeur: DL, hauteur: H,

  silhouette(ctx) {
    ctx.moveTo(-DL, 0);
    ctx.lineTo(-DL, -30);
    ctx.lineTo(-46, -30);
    ctx.lineTo(-30, CORPS_HAUT);
    ctx.lineTo(-34, ECHAF_HAUT);
    ctx.lineTo(34, ECHAF_HAUT);
    ctx.lineTo(30, CORPS_HAUT);
    ctx.lineTo(46, -30);
    ctx.lineTo(DL, -30);
    ctx.lineTo(DL, 0);
    ctx.closePath();
  },

  dessinerStatique(ctx) {
    rect(ctx, -DL, -30, 2 * DL, 30, '#3A3C7E');
    rect(ctx, -DL, -30, 2 * DL, 2, rgba('#FFB38A', 0.7));
    ctx.beginPath();
    ctx.moveTo(-46, -30);
    ctx.lineTo(-30, CORPS_HAUT);
    ctx.lineTo(30, CORPS_HAUT);
    ctx.lineTo(46, -30);
    ctx.closePath();
    const g = ctx.createLinearGradient(-46, 0, 46, 0);
    g.addColorStop(0, '#4A4F98');
    g.addColorStop(0.5, '#353B80');
    g.addColorStop(1, '#2A2F6E');
    ctx.fillStyle = g;
    ctx.fill();
    for (let y = -44; y > CORPS_HAUT + 6; y -= 13) {
      const l = largeur(y) - 5;
      rect(ctx, -l, y, 2 * l, 3.2, 'rgba(22,26,64,.65)');
    }
    rect(ctx, BANDEAU.x - 1, BANDEAU.y1, 16, BANDEAU.y0 - BANDEAU.y1, '#1A1440');
    ctx.strokeStyle = '#262C66';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (const x of [-34, -12, 12, 34]) { ctx.moveTo(x, CORPS_HAUT); ctx.lineTo(x * 0.96, ECHAF_HAUT); }
    for (let y = CORPS_HAUT; y >= ECHAF_HAUT; y -= 22) { ctx.moveTo(-34, y); ctx.lineTo(34, y); }
    for (let y = CORPS_HAUT; y > ECHAF_HAUT; y -= 22) {
      ctx.moveTo(-34, y); ctx.lineTo(-12, y - 22);
      ctx.moveTo(12, y); ctx.lineTo(34, y - 22);
    }
    ctx.stroke();
    rect(ctx, -22, CORPS_HAUT - 60, 44, 60, '#30357A');
    trait(ctx, 22, ECHAF_HAUT, 22, -700, '#262C66', 3);
    trait(ctx, -86, -694, 52, -694, '#262C66', 3);
    ctx.beginPath();
    for (let x = -86; x < 52; x += 12) { ctx.moveTo(x, -694); ctx.lineTo(x + 6, -688); ctx.lineTo(x + 12, -694); }
    ctx.strokeStyle = '#262C66';
    ctx.lineWidth = 1;
    ctx.stroke();
    rect(ctx, 38, -700, 16, 12, '#3A3F86');
    trait(ctx, -70, -694, -70, -612, 'rgba(200,190,255,.6)', 1);
    rect(ctx, -76, -612, 12, 8, '#FF9A5C');
  },

  animer(ctx, t, s, etat) {
    const lum = lumiere(etat);
    const souffle = etat.reduit ? 1 : 1 + 0.1 * Math.sin(t / 700);
    const faisceau = ctx.createLinearGradient(0, NOYAU_Y, 0, NOYAU_Y - 1500);
    faisceau.addColorStop(0, rgba(ACCENT, 0.5 * lum));
    faisceau.addColorStop(0.4, rgba('#B98BFF', 0.18 * lum));
    faisceau.addColorStop(1, rgba('#B98BFF', 0));
    ctx.fillStyle = faisceau;
    ctx.beginPath();
    ctx.moveTo(-5, NOYAU_Y);
    ctx.lineTo(-60, NOYAU_Y - 1500);
    ctx.lineTo(60, NOYAU_Y - 1500);
    ctx.lineTo(5, NOYAU_Y);
    ctx.closePath();
    ctx.fill();
    for (let y = -40; y > CORPS_HAUT + 8; y -= 13) {
      const l = largeur(y) - 6;
      const k = Math.round(-y / 13);
      const a = (k % 3 === 0 ? 0.85 : 0.5) * lum * (etat.reduit ? 1 : 0.8 + 0.2 * Math.sin(t / 900 + k));
      rect(ctx, -l, y + 0.5, l - 4, 2, rgba(k % 2 ? '#9FE8FF' : '#C8BEFF', a));
    }
    ctx.save();
    ctx.translate(BANDEAU.x + 7, (BANDEAU.y0 + BANDEAU.y1) / 2);
    ctx.rotate(-Math.PI / 2);
    halo(ctx, 0, 0, 40, ACCENT, 0.25 * lum);
    texte(ctx, 'MISE EN SITUATION', 0, 0.5, { taille: 13, poids: 600, couleur: rgba('#FFC4EE', Math.max(0.75, lum)), police: POLICE_MONO });
    ctx.restore();
    rect(ctx, BANDEAU.x - 1, BANDEAU.y1, 1.2, BANDEAU.y0 - BANDEAU.y1, rgba(ACCENT, 0.8 * lum));
    rect(ctx, BANDEAU.x + 14, BANDEAU.y1, 1.2, BANDEAU.y0 - BANDEAU.y1, rgba(ACCENT, 0.8 * lum));
    const echafaudage = etat.toutGagne ? 1 : 0.35;
    for (let y = CORPS_HAUT; y >= ECHAF_HAUT; y -= 22) {
      for (const x of [-34, 34]) {
        const on = etat.reduit || ((t / 600 + y * 0.1 + x) % 3) < 1.6;
        if (on) disque(ctx, x, y, 2, rgba(etat.toutGagne ? ACCENT : '#FFB86B', echafaudage + 0.3));
      }
    }
    if (etat.toutGagne) halo(ctx, 0, (CORPS_HAUT + ECHAF_HAUT) / 2, 120, ACCENT, 0.3);
    halo(ctx, 0, NOYAU_Y, 70 * souffle, ACCENT, 0.7 * lum);
    for (const [rx, ry, v, inc] of [[40, 11, 0.0012, -0.25], [52, 14, -0.0008, 0.3]]) {
      ctx.save();
      ctx.translate(0, NOYAU_Y);
      ctx.rotate(inc);
      ctx.beginPath();
      ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
      ctx.strokeStyle = rgba('#FFC4EE', 0.7 * lum);
      ctx.lineWidth = 1.4;
      ctx.stroke();
      const a = etat.reduit ? 1 : t * v;
      disque(ctx, Math.cos(a) * rx, Math.sin(a) * ry, 3, '#FFFFFF');
      disque(ctx, Math.cos(a + Math.PI) * rx, Math.sin(a + Math.PI) * ry, 2.2, '#B98BFF');
      ctx.restore();
    }
    disque(ctx, 0, NOYAU_Y, 15 * souffle, ACCENT);
    disque(ctx, -4, NOYAU_Y - 4, 5, '#FFE6F7');
    if (!etat.reduit) {
      const u = (t % 7000) / 7000;
      const cx = -70 + Math.sin(u * Math.PI * 2) * 12;
      trait(ctx, cx, -694, cx, -612 + Math.sin(u * 6) * 6, 'rgba(200,190,255,.7)', 1);
    }
    const on = etat.reduit || ((t / 750) | 0) % 2;
    if (on) { halo(ctx, 22, -704, 12, '#FFB86B', 0.9); disque(ctx, 22, -704, 2.2, '#FFB86B'); }
  },
};
