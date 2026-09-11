// Le plan de la ville : une place centrale avec sa fontaine et son parc, sept
// avenues en étoile qui finissent chacune sur un quartier, deux anneaux, des
// rues secondaires. Le plan produit les routes, les emprises bâties (en
// coordonnées polaires, pour que chaque immeuble regarde sa rue) et la
// collision. Rien de linéaire : on part de la place et on choisit un cap.

import { QUARTIERS } from './palette.js';

export const RAYON_VILLE = 134;
export const PLACE = { x: 0, z: 0, rayon: 28 };
export const ANNEAU = 68, ANNEAU2 = 112;
const TAU = Math.PI * 2;
const rad = d => d * Math.PI / 180;

// Position d'un point à la distance r sur le cap θ (0 = sud, sens horaire vu du ciel).
export const surCap = (theta, r) => ({ x: Math.sin(theta) * r, z: Math.cos(theta) * r });

// Un quartier par étape, disposés en étoile dans l'ordre du parcours. `theta`
// est le cap depuis la place ; chaque portail regarde vers la place, et la tour
// ferme le tour au nord.
export const DISTRICTS = [
  { id: 'ecole',         nom: 'ESIEE-IT',       annees: '2018 - 2023', verbe: 'APPRENDRE',    hauteur: 20, theta: rad(231.4), r: 94,  prof: 12, larg: 12 },
  { id: 'medline',       nom: 'MEDLINE',        annees: '2018 - 2020', verbe: 'TRADUIRE',     hauteur: 22, theta: rad(282.9), r: 94,  prof: 12, larg: 12 },
  { id: 'thales',        nom: 'THALES',         annees: '2020 - 2021', verbe: 'INSTRUMENTER', hauteur: 26, theta: rad(334.3), r: 94,  prof: 12, larg: 12 },
  { id: 'albys',         nom: 'ALBYS',          annees: '2021 - 2023', verbe: 'SEGMENTER',    hauteur: 28, theta: rad(25.7),  r: 94,  prof: 12, larg: 12 },
  { id: 'independant',   nom: 'INDEPENDANT',    annees: '2023 - 2025', verbe: 'ATTESTER',     hauteur: 24, theta: rad(77.1),  r: 94,  prof: 12, larg: 12 },
  { id: 'digitalrealty', nom: 'DIGITAL REALTY', annees: 'DEPUIS 2025', verbe: 'COORDONNER',   hauteur: 32, theta: rad(128.6), r: 94,  prof: 12, larg: 12 },
  { id: 'scenario',      nom: 'LA TOUR',        annees: 'SCENARIO',    verbe: 'DIAGNOSTIQUER',hauteur: 66, theta: rad(180),   r: 124, prof: 18, larg: 18 },
];
for (const d of DISTRICTS) {
  const p = surCap(d.theta, d.r);
  d.x = p.x; d.z = p.z;
  d.tour = d.id === 'scenario';
  d.fin = d.r - d.prof / 2 - 6;                                   // là où l'avenue s'arrête
  d.face = { x: -Math.sin(d.theta), z: -Math.cos(d.theta) };     // vers la place
  d.accent = QUARTIERS[d.id] || QUARTIERS.scenario;
}

// ---- géométrie de segments ----
export function longueurSeg(s) { return Math.hypot(s.x2 - s.x1, s.z2 - s.z1); }
// point à `dist` mètres du début, décalé de `lat` mètres sur le côté ; `ang` oriente un objet
// dont l'axe z local suit la route, (nx, nz) est le côté positif.
export function pointSeg(s, dist, lat = 0) {
  const L = longueurSeg(s) || 1;
  const dx = (s.x2 - s.x1) / L, dz = (s.z2 - s.z1) / L;
  const nx = dz, nz = -dx;
  return { x: s.x1 + dx * dist + nx * lat, z: s.z1 + dz * dist + nz * lat, dx, dz, nx, nz, ang: Math.atan2(dx, dz), L };
}
export function distanceSegment(px, pz, s) {
  const dx = s.x2 - s.x1, dz = s.z2 - s.z1;
  const l2 = dx * dx + dz * dz || 1;
  let t = ((px - s.x1) * dx + (pz - s.z1) * dz) / l2;
  t = Math.max(0, Math.min(1, t));
  const qx = s.x1 + dx * t, qz = s.z1 + dz * t;
  return { d: Math.hypot(px - qx, pz - qz), qx, qz, t };
}
export function routeProche(x, z, routes) {
  let best = null, bd = 1e9;
  for (const s of routes) { const r = distanceSegment(x, z, s); if (r.d < bd) { bd = r.d; best = { ...r, s }; } }
  return best;
}
// rotation.y qui aligne l'axe x local sur (nx, nz), et celle qui aligne l'axe z local
export const yawPourX = (nx, nz) => Math.atan2(-nz, nx);
export const yawPourZ = (nx, nz) => Math.atan2(nx, nz);

// ---- routes : segments {x1, z1, x2, z2, w, type} ----
export function construireRoutes() {
  const routes = [];
  const seg = (a, b, w, type, extra = {}) => routes.push({ x1: a.x, z1: a.z, x2: b.x, z2: b.z, w, type, ...extra });
  for (const d of DISTRICTS) seg(surCap(d.theta, PLACE.rayon - 3), surCap(d.theta, d.fin), 14, 'avenue', { theta: d.theta, id: d.id });
  const thetas = DISTRICTS.map(d => d.theta).sort((a, b) => a - b);
  for (let i = 0; i < thetas.length; i++) {
    const a = thetas[i], b = i + 1 < thetas.length ? thetas[i + 1] : thetas[0] + TAU;
    const m = ((a + b) / 2) % TAU;
    seg(surCap(m, ANNEAU - 3), surCap(m, RAYON_VILLE - 5), 7, 'rue', { theta: m });
  }
  // deux anneaux en polygones de 40 côtés ; l'extérieur s'interrompt devant la tour
  const anneau = (r, w, saut) => {
    const N = 40;
    for (let i = 0; i < N; i++) {
      const t0 = i / N * TAU, t1 = (i + 1) / N * TAU, mid = (t0 + t1) / 2;
      if (saut && Math.abs(Math.atan2(Math.sin(mid - Math.PI), Math.cos(mid - Math.PI))) < saut) continue;
      seg(surCap(t0, r), surCap(t1, r), w, 'anneau', { anneau: r, saut });
    }
  };
  anneau(ANNEAU, 10, 0);
  anneau(ANNEAU2, 8, rad(17));
  return routes;
}

export function surRoute(x, z, routes, marge = 0) {
  for (const s of routes) if (distanceSegment(x, z, s).d < s.w / 2 + marge) return true;
  return false;
}

// ---- repère local d'un bâtiment tourné de `rot` autour de y ----
// x local = tangentiel (cos θ, -sin θ), z local = radial (sin θ, cos θ).
export function versMonde(b, lx, lz) {
  const c = Math.cos(b.rot || 0), s = Math.sin(b.rot || 0);
  return { x: b.x + c * lx + s * lz, z: b.z - s * lx + c * lz };
}
// La face d'un bâtiment dont la normale est la plus proche de (nx, nz) : son
// centre, sa normale, sa tangente, sa longueur, et le yaw d'un plan qui la regarde.
export function faceDe(b, nx, nz) {
  const c = Math.cos(b.rot || 0), s = Math.sin(b.rot || 0);
  const faces = [
    { nx: c, nz: -s, demi: b.w / 2, len: b.d }, { nx: -c, nz: s, demi: b.w / 2, len: b.d },
    { nx: s, nz: c, demi: b.d / 2, len: b.w }, { nx: -s, nz: -c, demi: b.d / 2, len: b.w },
  ];
  let best = faces[0], bd = -2;
  for (const f of faces) { const d = f.nx * nx + f.nz * nz; if (d > bd) { bd = d; best = f; } }
  return { x: b.x + best.nx * best.demi, z: b.z + best.nz * best.demi, nx: best.nx, nz: best.nz, tx: best.nz, tz: -best.nx, len: best.len, demi: best.demi, yaw: Math.atan2(best.nx, best.nz) };
}

// ---- le bâti : des bandes concentriques, découpées en parcelles entre les rues ----
const BANDES = [[36.8, 8.7], [46.5, 8.7], [56.2, 8.7], [80, 9.3], [90.5, 9.3], [101, 9.3], [123, 9.5]];
const VARIANTES = ['brique', 'beton', 'metal', 'verre'];

function arcsLibres(r, prof, routes) {
  const blocs = [];
  for (const s of routes) {
    if (s.type === 'anneau') continue;
    const r0 = Math.hypot(s.x1, s.z1), r1 = Math.hypot(s.x2, s.z2);
    if (r + prof / 2 < r0 - 1 || r - prof / 2 > r1 + 1) continue;
    const demi = (s.w / 2 + 2.6) / r;
    blocs.push([s.theta - demi, s.theta + demi]);
  }
  for (const d of DISTRICTS) {
    const R = d.tour ? 27 : 18, dr = Math.max(0, Math.abs(r - d.r) - prof / 2);
    if (dr >= R) continue;
    const demi = Math.sqrt(R * R - dr * dr) / r + 0.015;
    blocs.push([d.theta - demi, d.theta + demi]);
  }
  const norm = a => ((a % TAU) + TAU) % TAU;
  const arcs = [];
  for (const [a, b] of blocs) { const s0 = norm(a), e = s0 + (b - a); if (e > TAU) { arcs.push([s0, TAU], [0, e - TAU]); } else arcs.push([s0, e]); }
  arcs.sort((p, q) => p[0] - q[0]);
  const fusion = [];
  for (const a of arcs) { const l = fusion[fusion.length - 1]; if (l && a[0] <= l[1]) l[1] = Math.max(l[1], a[1]); else fusion.push([a[0], a[1]]); }
  const libres = [];
  if (!fusion.length) libres.push([0, TAU]);
  for (let i = 0; i < fusion.length; i++) {
    const a = fusion[i][1], b = i + 1 < fusion.length ? fusion[i + 1][0] : fusion[0][0] + TAU;
    if (b - a > 0.02) libres.push([a, b]);
  }
  return libres;
}

export function construireBati(routes, rnd) {
  const batiments = [];
  const accentPour = (x, z) => {
    let best = DISTRICTS[0], bd = 1e9;
    for (const d of DISTRICTS) { const dd = Math.hypot(x - d.x, z - d.z); if (dd < bd) { bd = dd; best = d; } }
    return best.accent;
  };
  const pousse = (b) => { batiments.push(b); return b; };
  for (const [r, prof] of BANDES) {
    const pres = r > 50 && r < 110;                                // près des anneaux : plus haut
    for (const [a, b] of arcsLibres(r, prof, routes)) {
      const L = r * (b - a);
      if (L < 6) continue;
      const n = Math.max(1, Math.round(L / 10.5));
      const larg = Math.min(13, (L - 1.2 * (n - 1)) / n);
      for (let k = 0; k < n; k++) {
        const theta = a + (k * (larg + 1.2) + larg / 2) / r;
        const c = surCap(theta, r);
        const base = { x: c.x, z: c.z, rot: theta, accent: accentPour(c.x, c.z) };
        const nb = rnd() < 0.42 ? 1 : (rnd() < 0.55 ? 2 : 4);
        const phare = pres && rnd() < 0.05;
        if (nb === 1 || phare) {
          const forme = !phare && rnd() < 0.1 ? 'cylindre' : 'boite';
          const h = phare ? 34 + rnd() * 18 : (r < 60 ? 7 + rnd() * 12 : 9 + rnd() * (pres ? 24 : 14));
          pousse({ ...base, w: larg, d: prof, h, variante: phare ? (rnd() < 0.5 ? 'verre' : 'metal') : VARIANTES[Math.floor(rnd() * 4)], forme });
          if (h > 13 && forme === 'boite') {
            let y = h, w = larg, d = prof;
            for (let e = 0; e < 1 + Math.floor(rnd() * 2); e++) {
              w *= 0.55 + rnd() * 0.25; d *= 0.55 + rnd() * 0.25;
              const hh = 3 + rnd() * 7;
              const o = versMonde(base, (rnd() - 0.5) * (larg - w), (rnd() - 0.5) * (prof - d));
              pousse({ ...base, x: o.x, z: o.z, w, d, h: hh, y0: y, etage: true, variante: VARIANTES[Math.floor(rnd() * 4)], forme: 'boite' });
              y += hh;
            }
          }
        } else if (nb === 2) {
          const tang = rnd() < 0.5;
          for (let i = 0; i < 2; i++) {
            const h = (r < 60 ? 6 : 7) + rnd() * (pres ? 20 : 12);
            const o = versMonde(base, tang ? (i - 0.5) * (larg / 2 + 0.3) : 0, tang ? 0 : (i - 0.5) * (prof / 2 + 0.3));
            pousse({ ...base, x: o.x, z: o.z, w: tang ? larg / 2 - 0.6 : larg, d: tang ? prof : prof / 2 - 0.6, h, variante: VARIANTES[Math.floor(rnd() * 4)], forme: 'boite' });
          }
        } else {
          for (let i = 0; i < 4; i++) {
            const h = 5 + rnd() * (pres ? 18 : 10);
            const o = versMonde(base, ((i % 2) - 0.5) * (larg / 2 + 0.3), (Math.floor(i / 2) - 0.5) * (prof / 2 + 0.3));
            pousse({ ...base, x: o.x, z: o.z, w: larg / 2 - 0.6, d: prof / 2 - 0.6, h, variante: VARIANTES[Math.floor(rnd() * 4)], forme: 'boite' });
          }
        }
      }
    }
  }
  // chaque bâtiment connaît sa rue : la face la plus proche d'une route (ou de la place)
  for (const b of batiments) {
    let bestF = null, bd = 1e9;
    for (const [nx, nz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const c = Math.cos(b.rot), s = Math.sin(b.rot);
      const wx = c * nx + s * nz, wz = -s * nx + c * nz;
      const f = faceDe(b, wx, wz);
      const rp = routeProche(f.x, f.z, routes);
      const dPlace = Math.abs(Math.hypot(f.x, f.z) - (PLACE.rayon + 3.4));
      const d = Math.min(rp ? rp.d - rp.s.w / 2 : 1e9, dPlace);
      if (d < bd) { bd = d; bestF = f; }
    }
    b.face = { x: bestF.nx, z: bestF.nz };
    b.rue = bd;
  }
  return batiments;
}

// ---- l'arrière-plan : des tours lointaines hors de la ville, pour la ligne d'horizon ----
export function construireLointain(rnd) {
  const tours = [];
  for (let i = 0; i < 70; i++) {
    const theta = rnd() * TAU, r = 152 + rnd() * 70;
    const c = surCap(theta, r);
    tours.push({ x: c.x, z: c.z, rot: theta, w: 9 + rnd() * 12, d: 9 + rnd() * 12, h: 22 + rnd() * 60 });
  }
  return tours;
}

// ---- collision : un seau par 16 m, les emprises bâties (tournées), la fontaine, la limite ----
export function construireCollision(batiments, obstacles) {
  const SEAU = 16;
  const seaux = new Map();
  const cle = (x, z) => Math.floor(x / SEAU) + ',' + Math.floor(z / SEAU);
  const tout = batiments.filter(b => !b.etage).map(b => ({ x: b.x, z: b.z, w: b.w, d: b.d, rot: b.rot || 0 })).concat((obstacles || []).map(o => ({ rot: 0, ...o })));
  for (const b of tout) {
    const ray = Math.hypot(b.w, b.d) / 2;
    for (let x = b.x - ray - SEAU; x <= b.x + ray + SEAU; x += SEAU)
      for (let z = b.z - ray - SEAU; z <= b.z + ray + SEAU; z += SEAU) {
        const k = cle(x, z);
        if (!seaux.has(k)) seaux.set(k, []);
        seaux.get(k).push(b);
      }
  }
  const marge = 1.0;
  return function occupe(x, z) {
    if (Math.hypot(x, z) > RAYON_VILLE) return true;
    if (Math.hypot(x, z) < 7.4) return true;                        // la fontaine
    const liste = seaux.get(cle(x, z));
    if (!liste) return false;
    for (const b of liste) {
      const dx = x - b.x, dz = z - b.z;
      const c = Math.cos(b.rot), s = Math.sin(b.rot);
      const lx = c * dx - s * dz, lz = s * dx + c * dz;
      if (Math.abs(lx) < b.w / 2 + marge && Math.abs(lz) < b.d / 2 + marge) return true;
    }
    return false;
  };
}
