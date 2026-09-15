// Le port de brassage (albys) : grue portique qui déplace des conteneurs rangés en quatre zones VLAN,
// portique pare-feu (les paquets autorisés passent, les autres rebondissent), tunnel lumineux vers l'îlot VPN.

import { rgba, melange, rect, disque, halo, trait, texte, POLICE_MONO } from '../dessin.js';
import { fenetresAnimees, lumiere } from './_commun.js';

const DL = 205;
const H = 250;
const ACCENT = '#A98BFF';
const ZONES = [
  { vlan: '10', couleur: '#5BC0FF', x: -196 },
  { vlan: '20', couleur: '#54E0A6', x: -134 },
  { vlan: '30', couleur: '#FF9E5E', x: -72 },
  { vlan: '40', couleur: '#F2D13B', x: -10 },
];
const CW = 26;
const CH = 13;
const PILES = ZONES.flatMap((z, i) => [0, 1].map((k) => ({ x: z.x + k * (CW + 3), n: 2 + ((i * 3 + k * 2) % 3), couleur: z.couleur })));
const GRUE = { g: -200, d: 46, haut: -214 };
const PORTE = { x0: 72, x1: 106, haut: -104 };
const ILOT = { x: 180 };
const CYCLE_GRUE = 9000;

export default {
  id: 'albys', demiLargeur: DL, hauteur: H,

  silhouette(ctx) {
    ctx.moveTo(-DL, 0);
    ctx.lineTo(-DL, GRUE.haut - 8);
    ctx.lineTo(GRUE.d + 12, GRUE.haut - 8);
    ctx.lineTo(GRUE.d + 12, PORTE.haut - 6);
    ctx.lineTo(PORTE.x1 + 6, PORTE.haut - 6);
    ctx.lineTo(PORTE.x1 + 6, 0);
    ctx.closePath();
  },

  dessinerStatique(ctx) {
    rect(ctx, -DL, -12, 110 + DL, 12, '#454C92');
    rect(ctx, -DL, -12, 110 + DL, 1.5, rgba(ACCENT, 0.6));
    const eau = ctx.createLinearGradient(0, -4, 0, 24);
    eau.addColorStop(0, '#6A5FAE');
    eau.addColorStop(1, '#2E2F74');
    ctx.fillStyle = eau;
    ctx.fillRect(110, -4, DL - 110 + 10, 28);
    for (const z of ZONES) {
      rect(ctx, z.x - 2, -13, 2 * CW + 7, 2, z.couleur);
      texte(ctx, `VLAN ${z.vlan}`, z.x + CW + 1, -4.5, { taille: 7, poids: 600, couleur: melange(z.couleur, '#FFFFFF', 0.3), police: POLICE_MONO });
    }
    for (const p of PILES) {
      for (let k = 0; k < p.n; k++) conteneur(ctx, p.x, -13 - (k + 1) * (CH + 1), p.couleur, 0.9);
    }
    const coul = '#2A2F6C';
    for (const x of [GRUE.g, GRUE.d]) {
      rect(ctx, x - 4, GRUE.haut, 8, -GRUE.haut - 12, coul);
      rect(ctx, x - 12, -18, 24, 6, coul);
    }
    rect(ctx, GRUE.g - 12, GRUE.haut - 8, GRUE.d - GRUE.g + 24, 12, coul);
    ctx.beginPath();
    for (let x = GRUE.g; x < GRUE.d; x += 20) { ctx.moveTo(x, GRUE.haut - 8); ctx.lineTo(x + 10, GRUE.haut + 4); ctx.lineTo(x + 20, GRUE.haut - 8); }
    ctx.moveTo(GRUE.g, GRUE.haut + 40); ctx.lineTo(GRUE.g + 34, GRUE.haut + 4);
    ctx.moveTo(GRUE.d, GRUE.haut + 40); ctx.lineTo(GRUE.d - 34, GRUE.haut + 4);
    ctx.strokeStyle = '#3A4088';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    rect(ctx, GRUE.d - 30, GRUE.haut + 4, 26, 18, '#3A4088');
    rect(ctx, GRUE.d - 26, GRUE.haut + 8, 18, 7, 'rgba(255,217,154,.5)');
    rect(ctx, PORTE.x0, PORTE.haut, 7, -PORTE.haut - 12, '#2A2F6C');
    rect(ctx, PORTE.x1 - 7, PORTE.haut, 7, -PORTE.haut - 12, '#2A2F6C');
    rect(ctx, PORTE.x0 - 4, PORTE.haut - 6, PORTE.x1 - PORTE.x0 + 8, 9, '#2A2F6C');
    for (let k = 0; k < 6; k++) rect(ctx, PORTE.x0 - 4 + k * 7, PORTE.haut - 5, 4, 7, k % 2 ? '#FFB86B' : '#2A2F6C');
    rect(ctx, -DL, -44, PORTE.x0 + DL, 2, 'rgba(169,139,255,.35)');
    ctx.beginPath();
    ctx.moveTo(ILOT.x - 30, 0);
    ctx.quadraticCurveTo(ILOT.x, -30, ILOT.x + 30, 0);
    ctx.fillStyle = '#3A3F86';
    ctx.fill();
    rect(ctx, ILOT.x - 10, -30, 20, 14, '#454C92');
    trait(ctx, ILOT.x + 6, -30, ILOT.x + 6, -58, '#2A2F6C', 1.5);
    texte(ctx, 'VPN', ILOT.x, -23, { taille: 7.5, poids: 600, couleur: '#C8BEFF', police: POLICE_MONO });
  },

  animer(ctx, t, s, etat) {
    const lum = lumiere(etat);
    for (const z of ZONES) {
      const g = ctx.createLinearGradient(0, -78, 0, -12);
      g.addColorStop(0, rgba(z.couleur, 0));
      g.addColorStop(1, rgba(z.couleur, 0.32 * lum));
      ctx.fillStyle = g;
      ctx.fillRect(z.x - 4, -78, 2 * CW + 11, 66);
    }
    for (let x = GRUE.g + 22; x < GRUE.d; x += 44) {
      halo(ctx, x, GRUE.haut + 8, 18, '#FFE3A3', 0.6 * lum);
      disque(ctx, x, GRUE.haut + 5, 2, '#FFF1C9');
    }
    const tube = ctx.createLinearGradient(PORTE.x1, 0, ILOT.x, 0);
    tube.addColorStop(0, rgba(ACCENT, 0.7 * lum));
    tube.addColorStop(1, rgba('#7CF3FF', 0.7 * lum));
    ctx.fillStyle = tube;
    ctx.fillRect(PORTE.x1, 9, ILOT.x - PORTE.x1, 5);
    halo(ctx, (PORTE.x1 + ILOT.x) / 2, 11, 50, ACCENT, 0.2 * lum);
    if (!etat.reduit) {
      for (let k = 0; k < 3; k++) {
        const u = ((t / 1400 + k / 3) % 1);
        disque(ctx, PORTE.x1 + (ILOT.x - PORTE.x1) * u, 11.5, 2, '#FFFFFF');
      }
    }
    halo(ctx, ILOT.x + 6, -58, 10, '#FF6FD8', etat.reduit || ((t / 700) | 0) % 2 ? 0.9 : 0.3);
    const u = etat.reduit ? 0.3 : (t % CYCLE_GRUE) / CYCLE_GRUE;
    const de = ZONES[0].x + CW / 2, vers = ZONES[3].x + CW + 18;
    const phase = u < 0.5 ? u * 2 : 2 - u * 2;
    const tx = de + (vers - de) * (0.5 - 0.5 * Math.cos(Math.PI * phase));
    const descente = Math.abs(Math.sin(phase * Math.PI)) < 0.2 ? 0 : 0;
    const cy = GRUE.haut + 60 + descente;
    rect(ctx, tx - 10, GRUE.haut - 4, 20, 8, '#454C92');
    trait(ctx, tx - 6, GRUE.haut + 4, tx - 6, cy, '#C8D0FF', 0.9);
    trait(ctx, tx + 6, GRUE.haut + 4, tx + 6, cy, '#C8D0FF', 0.9);
    conteneur(ctx, tx - CW / 2, cy, ZONES[Math.floor(u * 4) % 4].couleur, 1);
    const rail = -48;
    for (let k = 0; k < 6; k++) {
      const p = etat.reduit ? k / 6 : ((t / 2600 + k / 6) % 1);
      const autorise = k % 2 === 0;
      if (autorise) {
        const x = -DL + (PORTE.x0 + DL) * Math.min(1, p * 1.3);
        const plonge = p * 1.3 > 1 ? (p * 1.3 - 1) / 0.3 : 0;
        const px = plonge > 0 ? PORTE.x0 + (PORTE.x1 - PORTE.x0) * plonge : x;
        const py = plonge > 0 ? rail + (11 - rail) * plonge : rail;
        halo(ctx, px, py, 8, '#FFB86B', 0.9);
        disque(ctx, px, py, 2, '#FFF1C9');
      } else {
        const aller = p < 0.6;
        const x = aller ? -DL + (PORTE.x0 - 4 + DL) * (p / 0.6) : PORTE.x0 - 4 - 70 * ((p - 0.6) / 0.4);
        const y = aller ? rail : rail - Math.sin(((p - 0.6) / 0.4) * Math.PI) * 16;
        disque(ctx, x, y, 2, rgba('#D9CCFF', aller ? 0.95 : 0.95 - (p - 0.6)));
        if (p > 0.58 && p < 0.7) {
          halo(ctx, PORTE.x0, rail, 16, '#FFB86B', 0.95);
          for (let j = 0; j < 5; j++) disque(ctx, PORTE.x0 - 2 - j * 2.2, rail - 5 + j * 2.4, 0.9, '#FFE3A3');
        }
      }
    }
    halo(ctx, (PORTE.x0 + PORTE.x1) / 2, PORTE.haut, 26, '#FFB86B', 0.35 * lum);
    fenetresAnimees(ctx, [{ x: GRUE.d - 26, y: GRUE.haut + 8, w: 18, h: 7, allumee: true, froide: false, rang: 0, col: 0 }], etat, { rangs: 1, t });
  },
};

function conteneur(ctx, x, y, couleur, alpha) {
  rect(ctx, x, y, CW, CH, rgba(melange(couleur, '#2F3570', 0.25), alpha));
  rect(ctx, x, y, CW, 1.5, rgba(melange(couleur, '#FFFFFF', 0.4), alpha));
  for (let s = 4; s < CW - 2; s += 4) rect(ctx, x + s, y + 2.5, 0.9, CH - 4, 'rgba(20,24,62,.3)');
}
