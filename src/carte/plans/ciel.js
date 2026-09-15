// P0 · Ciel (couche Modèle) : dégradé interpolé de l'aube au crépuscule, soleil, étoiles
// et la constellation-modèle, sept colonnes de neurones (une par niveau).

import { rgba, melange, halo, disque } from '../dessin.js';

const ETAPES = [
  ['#26306B', '#6A5AA8', '#E98FA8', '#FFB38A', '#FFE3A3'],
  ['#232C66', '#5E4E9E', '#F08A8A', '#FFA37A', '#FFD27A'],
  ['#141B45', '#3B2E7A', '#B8578F', '#E0679E', '#FF9EE8'],
];
const TAU = Math.PI * 2;
const IMPULSION_MS = 400;
const TRAJET_MS = 1200;
const VAGUE_MS = 9000;
const VAGUE_COLONNE_MS = 600;
const SATELLITE_MS = 11500;

export function paletteCiel(p) {
  const q = Math.max(0, Math.min(1, p)) * 2;
  const i = Math.min(1, Math.floor(q));
  const f = q - i;
  return ETAPES[0].map((_, k) => melange(ETAPES[i][k], ETAPES[i + 1][k], f));
}

export default {
  id: 'ciel', facteur: 0, bande: [0, 600],

  generer(alea) {
    const etoiles = Array.from({ length: 150 }, () => ({
      fx: alea.n(), Y: alea.entre(4, 330), r: alea.entre(0.5, 1.5), phase: alea.entre(0, TAU), vitesse: alea.entre(0.5, 2),
    }));
    const colonnes = [];
    for (let k = 0; k < 7; k++) {
      const n = alea.entier(5, 9);
      const noeuds = [];
      for (let i = 0; i < n; i++) {
        noeuds.push({
          fx: 0.08 + (k * 0.84) / 6 + alea.entre(-0.026, 0.026),
          Y: 46 + ((i + 0.5) * 390) / n + alea.entre(-14, 14),
          periode: alea.entre(3000, 6000), phase: alea.entre(0, TAU),
        });
      }
      colonnes.push(noeuds);
    }
    const aretes = [];
    for (let k = 0; k < 6; k++) {
      const A = colonnes[k], B = colonnes[k + 1];
      A.forEach((_, i) => {
        const j = Math.round((i / Math.max(1, A.length - 1)) * (B.length - 1));
        for (const jj of [j - 1, j, j + 1]) {
          if (jj >= 0 && jj < B.length && (jj === j || alea.chance(0.5))) aretes.push({ k, a: i, b: jj });
        }
      });
    }
    const impulsions = Array.from({ length: 97 }, () => alea.entier(0, aretes.length - 1));
    const nebuleuses = Array.from({ length: 4 }, () => ({ fx: alea.entre(0.05, 0.95), Y: alea.entre(60, 300), r: alea.entre(180, 320), c: alea.choix(['#9D8CFF', '#FF9EE8', '#7CF3FF']) }));
    return { etoiles, colonnes, aretes, impulsions, nebuleuses };
  },

  dessiner(ctx, m, vue) {
    const { largeur: W, hauteur: H, e, ty, t, camera, niveaux, cles } = vue;
    const p = Math.max(0, Math.min(1, camera / 4200));
    const [haut, milieu, bas, horizon, couleurHalo] = paletteCiel(p);
    const y = (Y) => ty + Y * e;
    const yHorizon = y(600);

    const g = ctx.createLinearGradient(0, y(0), 0, yHorizon);
    g.addColorStop(0, haut);
    g.addColorStop(0.45, milieu);
    g.addColorStop(0.8, bas);
    g.addColorStop(1, horizon);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, Math.ceil(yHorizon) + 1);
    ctx.fillStyle = horizon;
    ctx.fillRect(0, yHorizon, W, H - yHorizon);

    for (const n of m.nebuleuses) halo(ctx, n.fx * W, y(n.Y), n.r * e, n.c, 0.1);

    const sx = W * 0.62, sy = y(520 + 80 * p);
    const gh = ctx.createRadialGradient(sx, sy, 0, sx, sy, 460 * e);
    gh.addColorStop(0, rgba(couleurHalo, 0.95));
    gh.addColorStop(0.16, rgba(couleurHalo, 0.55));
    gh.addColorStop(0.5, rgba(horizon, 0.22));
    gh.addColorStop(1, rgba(horizon, 0));
    ctx.fillStyle = gh;
    ctx.fillRect(sx - 460 * e, sy - 460 * e, 920 * e, 920 * e);
    disque(ctx, sx, sy, 30 * e, rgba('#FFF4DC', 1 - p * 0.55));
    const bande = ctx.createLinearGradient(0, y(430), 0, yHorizon);
    bande.addColorStop(0, rgba(couleurHalo, 0));
    bande.addColorStop(1, rgba(couleurHalo, 0.3));
    ctx.fillStyle = bande;
    ctx.fillRect(0, y(430), W, yHorizon - y(430));

    const alphaEtoiles = vue.etoiles * (0.22 + 0.78 * p);
    if (alphaEtoiles > 0.01) {
      for (const s of m.etoiles) {
        const sc = vue.reduit ? 0.8 : 0.55 + 0.45 * Math.sin((t / 1000) * s.vitesse + s.phase);
        ctx.fillStyle = rgba('#EEF1FF', alphaEtoiles * sc);
        ctx.fillRect(s.fx * W, y(s.Y), s.r * 1.4, s.r * 1.4);
      }
    }
    if (vue.revelation > 0) dessinerConstellation(ctx, m, vue, y, W);
  },
};

function dessinerConstellation(ctx, m, vue, y, W) {
  const { t, niveaux, cles, qualite, reduit } = vue;
  const nbCols = Math.ceil(vue.revelation * 7 - 1e-6);
  const pos = (k, i) => { const nd = m.colonnes[k][i]; return { x: nd.fx * W, y: y(nd.Y) }; };
  ctx.lineWidth = 1;
  for (const ar of m.aretes) {
    if (ar.k + 1 >= nbCols) continue;
    const A = pos(ar.k, ar.a), B = pos(ar.k + 1, ar.b);
    const lie = cles.has(niveaux[ar.k].id) && cles.has(niveaux[ar.k + 1].id);
    ctx.strokeStyle = lie ? rgba(niveaux[ar.k].accent, 0.55) : 'rgba(157,140,255,.28)';
    ctx.beginPath();
    ctx.moveTo(A.x, A.y);
    ctx.lineTo(B.x, B.y);
    ctx.stroke();
  }
  const kSel = niveaux.findIndex((n) => n.id === vue.selection);
  if (qualite === 'haute' && !reduit) {
    const idx = Math.floor(t / IMPULSION_MS);
    for (let j = 0; j < 4; j++) {
      const n = idx - j;
      const u = (t - n * IMPULSION_MS) / TRAJET_MS;
      if (u < 0 || u > 1) continue;
      const ar = m.aretes[m.impulsions[((n % 97) + 97) % 97] % m.aretes.length];
      if (ar.k + 1 >= nbCols) continue;
      const A = pos(ar.k, ar.a), B = pos(ar.k + 1, ar.b);
      const px = A.x + (B.x - A.x) * u, py = A.y + (B.y - A.y) * u;
      halo(ctx, px, py, 10, '#FF6FD8', 0.75);
      disque(ctx, px, py, 1.8, '#FFE6F7');
    }
  }
  const phase = t % VAGUE_MS;
  const colVague = reduit ? -1 : phase < 7 * VAGUE_COLONNE_MS ? Math.floor(phase / VAGUE_COLONNE_MS) : -1;
  m.colonnes.forEach((col, k) => {
    if (k >= nbCols) return;
    const n = niveaux[k];
    const gagne = cles.has(n.id);
    col.forEach((nd, i) => {
      const P = pos(k, i);
      const respiration = reduit ? 1 : 1 + 0.15 * Math.sin((t / nd.periode) * TAU + nd.phase);
      let r = 2.1 * respiration * (k === kSel ? 1.25 : 1);
      if (k === colVague) r *= 1.6;
      if (gagne || k === colVague) halo(ctx, P.x, P.y, 13, gagne ? n.accent : '#C8BEFF', gagne ? 0.6 : 0.45);
      disque(ctx, P.x, P.y, r, gagne ? n.accent : '#C8BEFF');
    });
  });
  if (vue.toutGagne) dessinerAttention(ctx, m, vue, y, W);
  if (!reduit) {
    const ps = t % SATELLITE_MS;
    if (ps < 6500) {
      const u = ps / 6500;
      const sxp = -20 + (W + 40) * u, syp = y(24 + 22 * Math.sin(u * 3));
      for (let k = 1; k < 6; k++) disque(ctx, sxp - k * 5, syp + k * 0.6, 0.8, rgba('#EEF1FF', 0.12 * (6 - k)));
      disque(ctx, sxp, syp, 1.4, ((t / 300) | 0) % 2 ? '#FFFFFF' : '#FFB86B');
    }
  }
}

function dessinerAttention(ctx, m, vue, y, W) {
  const centres = m.colonnes.map((col) => ({
    x: (col.reduce((s, nd) => s + nd.fx, 0) / col.length) * W,
    y: y(col.reduce((s, nd) => s + nd.Y, 0) / col.length),
  }));
  ctx.lineWidth = 1.2;
  if (!vue.reduit) { ctx.setLineDash([6, 8]); ctx.lineDashOffset = -vue.t * 0.02; }
  for (let i = 0; i < 7; i++) {
    for (let j = i + 1; j < 7; j++) {
      const A = centres[i], B = centres[j];
      const g = ctx.createLinearGradient(A.x, A.y, B.x, B.y);
      g.addColorStop(0, rgba(vue.niveaux[i].accent, 0.24));
      g.addColorStop(1, rgba(vue.niveaux[j].accent, 0.24));
      ctx.strokeStyle = g;
      ctx.beginPath();
      ctx.moveTo(A.x, A.y);
      ctx.quadraticCurveTo((A.x + B.x) / 2, Math.min(A.y, B.y) - 24 - 14 * (j - i), B.x, B.y);
      ctx.stroke();
    }
  }
  ctx.setLineDash([]);
}
