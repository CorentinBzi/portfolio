// Primitives de dessin de la cité (unités du monde ou unités locales d'un quartier).

export const C = Object.freeze({
  horizon: '#8C86C8', crete: '#5D5AA0', lisere: '#FFB38A', ciel: '#FFB38A',
  merLoin: '#7C6BB4', merProche: '#262A6A', reflet: '#FFC7A0', refletViolet: '#9D8CFF',
  decor: '#3A3C7E', chaude: '#FFD99A', froide: '#9FE8FF', corps: '#2F3570', face: '#454C92',
  sol: '#2F3570', coupe: '#1F2458', avant: '#14183E', magenta: '#FF6FD8', cyan: '#7CF3FF',
  poussiere: '#FFF1C9', etincelle: '#FF9EE8', ambre: '#FFB86B', anomalie: '#E8503A', or: '#FFD166',
  ok: '#6FCF8E', arete: 'rgba(157,140,255,.28)', noeud: '#C8BEFF', texte: '#EEF1FF', data: '#9FE8FF',
  vlan: Object.freeze(['#43F0E6', '#FFB454', '#A98BFF', '#7BE8A8']),
});

export const POLICE_MONO = '"IBM Plex Mono", ui-monospace, Menlo, monospace';
export const POLICE_TITRE = 'Archivo, system-ui, sans-serif';

const cacheRgb = new Map();
export function rgb(hex) {
  let v = cacheRgb.get(hex);
  if (!v) {
    const h = hex.replace('#', '');
    v = [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
    cacheRgb.set(hex, v);
  }
  return v;
}

export function rgba(hex, a) {
  const [r, g, b] = rgb(hex);
  return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, a)).toFixed(3)})`;
}

export function melange(a, b, t) {
  const x = rgb(a), y = rgb(b);
  const c = (i) => Math.round(x[i] + (y[i] - x[i]) * t).toString(16).padStart(2, '0');
  return `#${c(0)}${c(1)}${c(2)}`;
}

export function rect(ctx, x, y, w, h, couleur) {
  ctx.fillStyle = couleur;
  ctx.fillRect(x, y, w, h);
}

export function polygone(ctx, pts, couleur) {
  ctx.beginPath();
  ctx.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
  ctx.closePath();
  ctx.fillStyle = couleur;
  ctx.fill();
}

export function trait(ctx, x0, y0, x1, y1, couleur, largeur) {
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.strokeStyle = couleur;
  ctx.lineWidth = largeur;
  ctx.stroke();
}

export function arrondi(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

export function halo(ctx, x, y, r, couleur, alpha = 1) {
  if (r <= 0 || alpha <= 0) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(couleur, alpha));
  g.addColorStop(0.35, rgba(couleur, alpha * 0.45));
  g.addColorStop(1, rgba(couleur, 0));
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
}

export function disque(ctx, x, y, r, couleur) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = couleur;
  ctx.fill();
}

// Grille de fenêtres déterministe : renvoie la liste (pour animer l'allumage).
export function grilleFenetres(alea, { x, y, w, h, cols, rows, taux = 0.6, pFroide = 0.3, marge = 0.22 }) {
  const liste = [];
  const cw = w / cols, rh = h / rows;
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const allumee = alea.n() < taux;
      const froide = alea.n() < pFroide;
      liste.push({ x: x + i * cw + cw * marge, y: y + j * rh + rh * marge, w: cw * (1 - 2 * marge), h: rh * (1 - 2 * marge) * 0.9, allumee, froide, rang: j, col: i });
    }
  }
  return liste;
}

export function dessinerFenetres(ctx, liste, alpha, { chaude = C.chaude, froide = C.froide, eteinte = null } = {}) {
  for (const f of liste) {
    if (f.allumee) {
      ctx.fillStyle = rgba(f.froide ? froide : chaude, alpha);
      ctx.fillRect(f.x, f.y, f.w, f.h);
    } else if (eteinte) {
      ctx.fillStyle = eteinte;
      ctx.fillRect(f.x, f.y, f.w, f.h);
    }
  }
}

// Immeuble générique de décor : corps, voile d'horizon, liseré côté soleil, toit, fenêtres.
export function immeuble(ctx, alea, { x, base, w, h, couleur = C.decor, voile = 0.18, alphaFenetres = 0.4, toit = null, lisere = 0.45, taux = 0.55 }) {
  const corps = voile > 0 ? melange(couleur, C.horizon, voile) : couleur;
  const y = base - h;
  rect(ctx, x, y, w, h, corps);
  rect(ctx, x + w * 0.72, y, w * 0.28, h, rgba('#000020', 0.12));
  rect(ctx, x, y, w, Math.max(1.2, h * 0.012), rgba(C.lisere, lisere));
  rect(ctx, x, y, Math.max(1, w * 0.05), h, rgba(C.lisere, lisere * 0.35));
  const cols = Math.max(2, Math.round(w / 9));
  const rows = Math.max(2, Math.round(h / 11));
  const f = grilleFenetres(alea, { x: x + w * 0.06, y: y + h * 0.05, w: w * 0.88, h: h * 0.9, cols, rows, taux });
  dessinerFenetres(ctx, f, alphaFenetres, { eteinte: rgba('#1A1F4D', 0.35) });
  if (toit) dessinerToit(ctx, alea, toit, x, y, w, corps);
  return f.filter((v) => v.allumee).length;
}

export function dessinerToit(ctx, alea, type, x, y, w, couleur) {
  const sombre = melange(couleur, '#141840', 0.35);
  if (type === 'chateau') {
    const cx = x + w * alea.entre(0.25, 0.7);
    rect(ctx, cx - 1, y - 10, 1.5, 10, sombre);
    rect(ctx, cx + 8, y - 10, 1.5, 10, sombre);
    ctx.beginPath();
    ctx.ellipse(cx + 4.5, y - 16, 7, 8, 0, 0, Math.PI * 2);
    ctx.fillStyle = sombre;
    ctx.fill();
    polygone(ctx, [cx - 3, y - 22, cx + 4.5, y - 29, cx + 12, y - 22], sombre);
  } else if (type === 'clim') {
    for (let i = 0; i < 3; i++) rect(ctx, x + w * (0.12 + i * 0.28), y - 6, w * 0.18, 6, sombre);
  } else if (type === 'antenne') {
    const cx = x + w * alea.entre(0.3, 0.7);
    trait(ctx, cx, y, cx, y - 34, sombre, 1.4);
    trait(ctx, cx - 6, y - 22, cx + 6, y - 22, sombre, 1);
    trait(ctx, cx - 4, y - 28, cx + 4, y - 28, sombre, 1);
  } else if (type === 'pignon') {
    polygone(ctx, [x, y, x + w / 2, y - w * 0.3, x + w, y], couleur);
  } else if (type === 'gradins') {
    rect(ctx, x + w * 0.15, y - 12, w * 0.7, 12, couleur);
    rect(ctx, x + w * 0.32, y - 22, w * 0.36, 10, couleur);
  }
}

// Pylône en treillis ; renvoie le point d'attache des câbles.
export function pylone(ctx, x, base, h, larg, couleur, lw = 1.2) {
  const haut = base - h;
  const lb = larg / 2, lh = larg * 0.14;
  ctx.strokeStyle = couleur;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.moveTo(x - lb, base); ctx.lineTo(x - lh, haut);
  ctx.moveTo(x + lb, base); ctx.lineTo(x + lh, haut);
  const n = Math.max(4, Math.round(h / 24));
  for (let i = 0; i < n; i++) {
    const y0 = base - (h * i) / n, y1 = base - (h * (i + 1)) / n;
    const l0 = lb + ((lh - lb) * i) / n, l1 = lb + ((lh - lb) * (i + 1)) / n;
    ctx.moveTo(x - l0, y0); ctx.lineTo(x + l1, y1);
    ctx.moveTo(x + l0, y0); ctx.lineTo(x - l1, y1);
    ctx.moveTo(x - l1, y1); ctx.lineTo(x + l1, y1);
  }
  const bras = [0.18, 0.34];
  for (const b of bras) {
    const yb = haut + h * b;
    ctx.moveTo(x - larg * 0.9, yb); ctx.lineTo(x + larg * 0.9, yb);
    ctx.moveTo(x - larg * 0.9, yb); ctx.lineTo(x - lh * 1.2, yb - 10);
    ctx.moveTo(x + larg * 0.9, yb); ctx.lineTo(x + lh * 1.2, yb - 10);
  }
  ctx.stroke();
  return bras.map((b) => ({ gauche: { x: x - larg * 0.9, y: haut + h * b + 6 }, droite: { x: x + larg * 0.9, y: haut + h * b + 6 } }));
}

// Chaînette approchée par une parabole ; point(t) pour les paquets.
export function chainette(x0, y0, x1, y1, fleche) {
  const point = (t) => ({ x: x0 + (x1 - x0) * t, y: y0 + (y1 - y0) * t + 4 * fleche * t * (1 - t) });
  return {
    x0, x1, point,
    tracer(ctx) {
      ctx.moveTo(x0, y0);
      ctx.quadraticCurveTo((x0 + x1) / 2, (y0 + y1) / 2 + 2 * fleche, x1, y1);
    },
  };
}

// Silo de verre cerclé de métal (le liquide est animé à part).
export function silo(ctx, { x, base, r, h, verre = '#6D7BC8', metal = '#2A2F66', lueur = 0.25 }) {
  const y = base - h;
  const g = ctx.createLinearGradient(x - r, 0, x + r, 0);
  g.addColorStop(0, rgba(verre, 0.55));
  g.addColorStop(0.35, rgba('#C9D3FF', 0.35 + lueur * 0.3));
  g.addColorStop(1, rgba(verre, 0.3));
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y, 2 * r, h);
  ctx.beginPath();
  ctx.ellipse(x, y, r, r * 0.3, 0, Math.PI, 0);
  ctx.fillStyle = metal;
  ctx.fill();
  const anneaux = Math.max(3, Math.round(h / 26));
  for (let i = 0; i <= anneaux; i++) rect(ctx, x - r - 1, y + (h * i) / anneaux - 1, 2 * r + 2, 2.2, metal);
  rect(ctx, x - r - 1, y, 2, h, metal);
  rect(ctx, x + r - 1, y, 2, h, metal);
}

export function liquide(ctx, { x, base, r, h, niveau, couleur, t = 0 }) {
  const hl = h * Math.max(0, Math.min(1, niveau));
  const y = base - hl;
  ctx.fillStyle = rgba(couleur, 0.55);
  ctx.fillRect(x - r + 1, y, 2 * r - 2, hl);
  ctx.beginPath();
  for (let i = 0; i <= 6; i++) {
    const xx = x - r + 1 + ((2 * r - 2) * i) / 6;
    const yy = y + Math.sin(t / 380 + i * 1.3 + x) * 1.2;
    if (i === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
  }
  ctx.strokeStyle = rgba('#FFFFFF', 0.55);
  ctx.lineWidth = 1.2;
  ctx.stroke();
}

// Baie serveur avec rangées de LED (les LED peuvent clignoter à part).
export function baie(ctx, alea, { x, y, w, h, corps = '#232A5E', rangs = 8 }) {
  rect(ctx, x, y, w, h, corps);
  rect(ctx, x, y, w, 2, rgba('#AFC0FF', 0.35));
  const leds = [];
  for (let i = 0; i < rangs; i++) {
    const yy = y + 4 + ((h - 8) * i) / rangs;
    rect(ctx, x + 2, yy, w - 4, (h - 8) / rangs - 1.5, '#1A1F4D');
    leds.push({ x: x + w - 5, y: yy + 1.5, couleur: alea.chance(0.2) ? C.ambre : alea.chance(0.5) ? C.cyan : C.ok });
  }
  return leds;
}

export function eolienne(ctx, x, base, h, angle, couleur, lw = 1.2) {
  trait(ctx, x, base, x, base - h, couleur, lw * 1.6);
  const cx = x, cy = base - h;
  ctx.beginPath();
  for (let i = 0; i < 3; i++) {
    const a = angle + (i * Math.PI * 2) / 3;
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a) * h * 0.45, cy + Math.sin(a) * h * 0.45);
  }
  ctx.strokeStyle = couleur;
  ctx.lineWidth = lw;
  ctx.stroke();
  disque(ctx, cx, cy, lw * 1.5, couleur);
}

export function arbre(ctx, alea, x, base, h, couleur, clair) {
  rect(ctx, x - 1.2, base - h * 0.35, 2.4, h * 0.35, melange(couleur, '#141840', 0.4));
  const n = 4;
  for (let i = 0; i < n; i++) {
    const cx = x + alea.entre(-h * 0.18, h * 0.18);
    const cy = base - h * 0.45 - alea.entre(0, h * 0.4);
    disque(ctx, cx, cy, h * alea.entre(0.16, 0.26), couleur);
  }
  if (clair) disque(ctx, x - h * 0.1, base - h * 0.75, h * 0.12, rgba(clair, 0.5));
}

export function lampadaire(ctx, x, base, h, couleur) {
  trait(ctx, x, base, x, base - h, couleur, 1.4);
  trait(ctx, x, base - h, x + h * 0.18, base - h, couleur, 1.4);
  return { x: x + h * 0.18, y: base - h + 2 };
}

export function texte(ctx, chaine, x, y, { taille = 12, poids = 500, couleur = C.texte, align = 'center', police = POLICE_MONO, base = 'middle' } = {}) {
  ctx.font = `${poids} ${taille}px ${police}`;
  ctx.textAlign = align;
  ctx.textBaseline = base;
  ctx.fillStyle = couleur;
  ctx.fillText(chaine, x, y);
}

// Étiquette lumineuse de verre (enseignes, noms de campus).
export function etiquette(ctx, chaine, x, y, { taille = 10, couleur = C.data, fond = '#232A5E', alpha = 0.85 } = {}) {
  ctx.font = `600 ${taille}px ${POLICE_MONO}`;
  const w = ctx.measureText(chaine).width + taille * 1.1;
  const h = taille * 1.7;
  arrondi(ctx, x - w / 2, y - h / 2, w, h, h * 0.3);
  ctx.fillStyle = rgba(fond, alpha);
  ctx.fill();
  ctx.strokeStyle = rgba(couleur, 0.6);
  ctx.lineWidth = 0.8;
  ctx.stroke();
  texte(ctx, chaine, x, y + 0.5, { taille, poids: 600, couleur });
  return w;
}

// Ligne de crête : tableau de points [x, y] tous les `pas` unités.
export function crete(alea, x0, x1, pas, yBase, amplitude, frequences = [0.004, 0.011, 0.023]) {
  const phases = frequences.map(() => alea.entre(0, Math.PI * 2));
  const poids = frequences.map((_, i) => 1 / (i + 1));
  const pts = [];
  for (let x = x0; x <= x1 + pas; x += pas) {
    let v = 0;
    frequences.forEach((f, i) => { v += Math.sin(x * f + phases[i]) * poids[i]; });
    pts.push([x, yBase - amplitude * (0.5 + 0.5 * v / 1.8)]);
  }
  return pts;
}

export function remplirCrete(ctx, pts, yBas, couleur) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], yBas);
  for (const [x, y] of pts) ctx.lineTo(x, y);
  ctx.lineTo(pts[pts.length - 1][0], yBas);
  ctx.closePath();
  ctx.fillStyle = couleur;
  ctx.fill();
}

export function tracerCrete(ctx, pts, couleur, largeur) {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.strokeStyle = couleur;
  ctx.lineWidth = largeur;
  ctx.stroke();
}

export function hauteurCrete(pts, x) {
  if (!pts.length) return 0;
  const pas = pts[1] ? pts[1][0] - pts[0][0] : 1;
  const i = Math.max(0, Math.min(pts.length - 2, Math.floor((x - pts[0][0]) / pas)));
  const [xa, ya] = pts[i], [xb, yb] = pts[i + 1] || pts[i];
  const t = xb === xa ? 0 : (x - xa) / (xb - xa);
  return ya + (yb - ya) * t;
}
