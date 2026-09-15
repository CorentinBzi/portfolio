// Le fil du parcours (entre le Socle et le Premier plan) et la sonde, en espace écran.
// Les ancres sont sur des plans différents : le fil se tord pendant le panoramique.

import { rgba, arrondi, POLICE_MONO } from './dessin.js';

const TIRET = [9, 7];

export function dessinerFil(ctx, { points, cles, t, reduit, qualite, alpha = 1 }) {
  if (points.length < 2 || alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.lineCap = 'round';
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i], b = points[i + 1];
    if ((a.x < -400 && b.x < -400) || (a.x > ctx.canvas.clientWidth + 400 && b.x > ctx.canvas.clientWidth + 400)) continue;
    const visibilite = Math.min(a.alpha ?? 1, b.alpha ?? 1);
    if (visibilite <= 0) continue;
    ctx.globalAlpha = alpha * visibilite;
    const gagne = cles.has(a.id);
    const dx = (b.x - a.x) * 0.5;
    const g = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
    g.addColorStop(0, rgba(a.accent, gagne ? 1 : 0.3));
    g.addColorStop(1, rgba(b.accent, gagne ? 1 : 0.3));
    const chemin = () => {
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.bezierCurveTo(a.x + dx, a.y + 26, b.x - dx, b.y + 26, b.x, b.y);
    };
    if (qualite !== 'basse') {
      chemin();
      ctx.strokeStyle = rgba('#7CF3FF', gagne ? 0.22 : 0.08);
      ctx.lineWidth = 12;
      ctx.setLineDash([]);
      ctx.stroke();
    }
    chemin();
    ctx.strokeStyle = g;
    ctx.lineWidth = gagne ? 3 : 2;
    ctx.setLineDash(TIRET);
    ctx.lineDashOffset = reduit ? 0 : -t * 0.03;
    ctx.stroke();
  }
  ctx.setLineDash([]);
  for (const p of points) {
    if ((p.alpha ?? 1) <= 0) continue;
    ctx.globalAlpha = alpha * (p.alpha ?? 1);
    dessinerJonction(ctx, p, cles.has(p.id));
  }
  ctx.restore();
}

function dessinerJonction(ctx, p, gagne) {
  if (p.x < -60 || p.x > ctx.canvas.clientWidth + 60) return;
  const w = 38, h = 17;
  const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 22);
  g.addColorStop(0, rgba(p.accent, gagne ? 0.75 : 0.4));
  g.addColorStop(1, rgba(p.accent, 0));
  ctx.fillStyle = g;
  ctx.fillRect(p.x - 22, p.y - 22, 44, 44);
  ctx.beginPath();
  ctx.arc(p.x, p.y, 3.2, 0, Math.PI * 2);
  ctx.fillStyle = gagne ? p.accent : '#EEF1FF';
  ctx.fill();
  arrondi(ctx, p.x - w / 2, p.y + 7, w, h, 5);
  ctx.fillStyle = 'rgba(22,26,64,.86)';
  ctx.fill();
  ctx.strokeStyle = rgba(p.accent, gagne ? 0.95 : 0.55);
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.font = `500 10px ${POLICE_MONO}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#EEF1FF';
  ctx.fillText(p.annee, p.x, p.y + 7 + h / 2 + 0.5);
}

// La sonde : orbe or de 14 px, traînée, flottement ±4 px sur 2 s.
export function dessinerSonde(ctx, { x, y, t, reduit, trainee = [] }) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return;
  const yy = y + (reduit ? 0 : Math.sin((t / 2000) * Math.PI * 2) * 4);
  ctx.save();
  trainee.forEach((p, i) => {
    const a = ((i + 1) / trainee.length) * 0.35;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2 + (5 * (i + 1)) / trainee.length, 0, Math.PI * 2);
    ctx.fillStyle = rgba('#FFD166', a);
    ctx.fill();
  });
  const g = ctx.createRadialGradient(x, yy, 0, x, yy, 30);
  g.addColorStop(0, 'rgba(255,209,102,.55)');
  g.addColorStop(1, 'rgba(255,209,102,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - 30, yy - 30, 60, 60);
  ctx.beginPath();
  ctx.arc(x, yy, 7, 0, Math.PI * 2);
  ctx.fillStyle = '#FFD166';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x - 2, yy - 2, 2.4, 0, Math.PI * 2);
  ctx.fillStyle = '#FFF6DA';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,209,102,.6)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, yy + 9);
  ctx.lineTo(x, yy + 20);
  ctx.stroke();
  ctx.restore();
}

// Vol en arc de la sonde entre deux quartiers (500 ms).
export function positionVol(de, vers, u) {
  const k = Math.max(0, Math.min(1, u));
  const e = 1 - Math.pow(1 - k, 3);
  const hauteur = Math.min(140, Math.abs(vers.x - de.x) * 0.25 + 40);
  return { x: de.x + (vers.x - de.x) * e, y: de.y + (vers.y - de.y) * e - Math.sin(Math.PI * e) * hauteur };
}
