// P7 · Particules (f = 1,6 + dérive) : 70 poussières dorées, 40 grains de données cyan qui montent,
// 10 étincelles IA près de la tour. Mélange additif.

import { rgba } from '../dessin.js';

const F = 1.6;

export default {
  id: 'particules', facteur: F,

  generer(alea) {
    return {
      poussieres: Array.from({ length: 70 }, () => ({ fx: alea.n(), fy: alea.entre(0.15, 0.95), r: alea.entre(0.8, 2.2), phase: alea.entre(0, 6.28), v: alea.entre(0.004, 0.012) })),
      donnees: Array.from({ length: 40 }, () => ({ fx: alea.n(), fy: alea.n(), r: alea.entre(0.9, 1.8), vy: alea.entre(0.012, 0.03), phase: alea.entre(0, 6.28) })),
      etincelles: Array.from({ length: 10 }, () => ({ angle: alea.entre(0, 6.28), rayon: alea.entre(14, 46), vitesse: alea.entre(0.0006, 0.0016), montee: alea.entre(0, 1) })),
    };
  },

  dessiner(ctx, m, vue) {
    const { largeur: W, hauteur: H, t, camera, e, qualite, reduit, ancres, alpha } = vue;
    const pas = qualite === 'moyenne' ? 2 : 1;
    const decal = -camera * F * e;
    const tour = ancres && ancres.get('scenario');
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = alpha;
    const larg = W + 200;
    for (let i = 0; i < m.poussieres.length; i += pas) {
      const p = m.poussieres[i];
      const x = ((((p.fx * larg + decal * 0.35 + (reduit ? 0 : t * p.v)) % larg) + larg) % larg) - 100;
      const y = p.fy * H + (reduit ? 0 : Math.sin(t / 2600 + p.phase) * 12);
      const a = reduit ? 0.5 : 0.35 + 0.35 * Math.sin(t / 1300 + p.phase);
      ctx.fillStyle = rgba('#FFF1C9', a);
      ctx.beginPath();
      ctx.arc(x, y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let i = 0; i < m.donnees.length; i += pas) {
      const d = m.donnees[i];
      const x = ((((d.fx * larg + decal) % larg) + larg) % larg) - 100 + (reduit ? 0 : Math.sin(t / 900 + d.phase) * 3);
      const y = H * 1.05 - ((((d.fy * H * 1.1) + (reduit ? 0 : t * d.vy)) % (H * 1.1)));
      ctx.fillStyle = rgba('#7CF3FF', 0.55);
      ctx.fillRect(x, y, d.r, d.r * 3.2);
    }
    if (tour && tour.visible) {
      for (let i = 0; i < m.etincelles.length; i += pas) {
        const s = m.etincelles[i];
        const a = s.angle + (reduit ? 0 : t * s.vitesse);
        const u = reduit ? s.montee : (s.montee + t * 0.00012) % 1;
        const x = tour.x + Math.cos(a) * s.rayon;
        const y = tour.yHaut + 10 - u * 70 + Math.sin(a) * s.rayon * 0.35;
        const g = ctx.createRadialGradient(x, y, 0, x, y, 6);
        g.addColorStop(0, rgba('#FF9EE8', 0.9 * (1 - u)));
        g.addColorStop(1, rgba('#FF9EE8', 0));
        ctx.fillStyle = g;
        ctx.fillRect(x - 6, y - 6, 12, 12);
      }
    }
    ctx.restore();
  },
};
