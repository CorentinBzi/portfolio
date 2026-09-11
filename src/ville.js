// La ville : une place avec sa fontaine, sept avenues en étoile, deux anneaux,
// et un quartier au bout de chaque avenue. Façades texturées fusionnées par
// matériau, chaussées, trottoirs, enseignes, rails, véhicules, mobilier,
// passants, et une ligne d'horizon de tours lointaines.

import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { ENSEIGNES_BRUIT } from './palette.js';
import { enseigne } from './enseignes.js';
import { ajouterDetails } from './decor.js';
import { ajouterMobilier } from './mobilier.js';
import { creerPnj } from './pnj.js';
import { construireParc } from './parc.js';
import { facade, toit, trottoir, asphalte, TUILE_M } from './textures.js';
import {
  DISTRICTS, PLACE, ANNEAU, ANNEAU2, RAYON_VILLE, surCap, construireRoutes, construireBati,
  construireLointain, construireCollision, faceDe, versMonde, longueurSeg, pointSeg,
} from './plan.js';

export { DISTRICTS };

function rng(graine) {
  let s = graine >>> 0 || 1;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

// Une boîte dont les UV sont mis à l'échelle du monde : une tuile de texture
// couvre toujours `tuile` mètres, quelle que soit la taille de la boîte.
export function boiteUV(w, h, d, tuile) {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv;
  const ech = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) {
    const [su, sv] = ech[f];
    for (let v = f * 4; v < f * 4 + 4; v++) uv.setXY(v, uv.getX(v) * su / tuile, uv.getY(v) * sv / tuile);
  }
  return g;
}
function cylindreUV(r, h, tuile) {
  const g = new THREE.CylinderGeometry(r, r, h, 20, 1);
  const uv = g.attributes.uv, su = Math.PI * 2 * r / tuile, sv = h / tuile;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
  return g;
}
function planUV(w, d, tuile) {
  const g = new THREE.PlaneGeometry(w, d);
  const uv = g.attributes.uv;
  for (let v = 0; v < uv.count; v++) uv.setXY(v, uv.getX(v) * w / tuile, uv.getY(v) * d / tuile);
  return g;
}

export function construireVille(scene, options = {}) {
  const rnd = rng(20260912);
  const groupe = new THREE.Group();
  scene.add(groupe);
  const routes = construireRoutes();
  const dummy = new THREE.Object3D();

  // ---- sol : un miroir sombre sous un voile gris, comme de l'asphalte mouillé ----
  const solGeo = new THREE.PlaneGeometry(900, 900);
  const miroir = options.miroir === false
    ? new THREE.Mesh(solGeo, new THREE.MeshBasicMaterial({ color: 0x2a323a }))
    : new Reflector(solGeo, { clipBias: 0.003, textureWidth: 1024, textureHeight: 1024, color: 0x4a5058 });
  miroir.rotation.x = -Math.PI / 2;
  groupe.add(miroir);
  const voile = new THREE.Mesh(solGeo, new THREE.MeshBasicMaterial({ color: 0x23272c, transparent: true, opacity: 0.58, depthWrite: false }));
  voile.rotation.x = -Math.PI / 2; voile.position.y = 0.02; groupe.add(voile);

  // ---- chaussées : avenues et rues en plans orientés, anneaux en couronnes ----
  const texAsph = asphalte();
  const asphMat = new THREE.MeshStandardMaterial({ map: texAsph, roughness: 0.55, metalness: 0.1, transparent: true, opacity: 0.82 });
  const chaussees = [];
  for (const s of routes) {
    if (s.type === 'anneau') continue;
    const p = pointSeg(s, 0);
    const g = planUV(s.w, p.L + 2, 8);
    g.rotateX(-Math.PI / 2); g.rotateY(p.ang);
    g.translate((s.x1 + s.x2) / 2, 0.03, (s.z1 + s.z2) / 2);
    chaussees.push(g);
  }
  for (const [r, w, saut] of [[ANNEAU, 10, 0], [ANNEAU2, 8, 17 * Math.PI / 180]]) {
    const g = new THREE.RingGeometry(r - w / 2, r + w / 2, 96, 1, Math.PI / 2 + saut, Math.PI * 2 - 2 * saut);
    const uv = g.attributes.uv; for (let v = 0; v < uv.count; v++) uv.setXY(v, uv.getX(v) * 30, uv.getY(v) * 30);
    g.rotateX(-Math.PI / 2); g.translate(0, 0.028, 0);
    chaussees.push(g);
  }
  groupe.add(new THREE.Mesh(mergeGeometries(chaussees), asphMat));

  // marquages : tirets axiaux, lignes de rive, passages piétons
  const marquage = new THREE.MeshBasicMaterial({ color: 0xb8b4a8, toneMapped: false, transparent: true, opacity: 0.55 });
  const tirets = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.22, 2.2), marquage, 700); let nT = 0;
  const rives = [];
  for (const s of routes) {
    const L = longueurSeg(s);
    for (let d = 2; d < L - 1 && nT < 700; d += 5.5) {
      const p = pointSeg(s, d);
      dummy.position.set(p.x, 0.05, p.z); dummy.rotation.set(-Math.PI / 2, 0, p.ang); dummy.updateMatrix(); tirets.setMatrixAt(nT++, dummy.matrix);
    }
    if (s.type === 'anneau') continue;
    for (const c of [-1, 1]) {
      const p = pointSeg(s, L / 2, c * (s.w / 2 - 0.7));
      const g = new THREE.PlaneGeometry(0.16, L); g.rotateX(-Math.PI / 2); g.rotateY(p.ang); g.translate(p.x, 0.05, p.z); rives.push(g);
    }
  }
  tirets.count = nT; groupe.add(tirets);
  groupe.add(new THREE.Mesh(mergeGeometries(rives), marquage));
  const passages = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.7, 1), marquage, 400); let nP = 0;
  const passage = (s, dist) => {
    for (let k = -3; k <= 3 && nP < 400; k++) {
      const p = pointSeg(s, dist + k * 1.15);
      dummy.position.set(p.x, 0.055, p.z); dummy.rotation.set(-Math.PI / 2, 0, p.ang + Math.PI / 2); dummy.scale.set(1, s.w - 3, 1); dummy.updateMatrix(); passages.setMatrixAt(nP++, dummy.matrix);
    }
  };
  for (const s of routes) {
    if (s.type === 'anneau') continue;
    const r0 = Math.hypot(s.x1, s.z1), L = longueurSeg(s);
    if (s.type === 'avenue') passage(s, 4.5);
    for (const R of [ANNEAU, ANNEAU2]) for (const c of [-1, 1]) {
      const d = R + c * ((R === ANNEAU ? 5 : 4) + 1.6) - r0;
      if (d > 3 && d < L - 3 && !(R === ANNEAU2 && s.type === 'avenue')) passage(s, d);
    }
  }
  dummy.scale.set(1, 1, 1);
  passages.count = nP; groupe.add(passages);

  // ---- trottoirs : deux bandes le long de chaque rue, deux couronnes par anneau ----
  const trottoirMat = new THREE.MeshStandardMaterial({ map: trottoir(), roughness: 0.95 });
  const trottoirs = [];
  for (const s of routes) {
    if (s.type === 'anneau') continue;
    const L = longueurSeg(s);
    for (const c of [-1, 1]) {
      const p = pointSeg(s, L / 2, c * (s.w / 2 + 1.2));
      const g = boiteUV(2.4, 0.18, L + 2.4, 1); g.rotateY(p.ang); g.translate(p.x, 0.09, p.z); trottoirs.push(g);
    }
  }
  for (const [r, w, saut] of [[ANNEAU, 10, 0], [ANNEAU2, 8, 17 * Math.PI / 180]]) {
    for (const c of [-1, 1]) {
      const ri = r + c * (w / 2 + 0.05), ro = r + c * (w / 2 + 2.4);
      const g = new THREE.RingGeometry(Math.min(ri, ro), Math.max(ri, ro), 96, 1, Math.PI / 2 + saut, Math.PI * 2 - 2 * saut);
      const uv = g.attributes.uv; for (let v = 0; v < uv.count; v++) uv.setXY(v, uv.getX(v) * 120, uv.getY(v) * 120);
      g.rotateX(-Math.PI / 2); g.translate(0, 0.18, 0); trottoirs.push(g);
      const bord = new THREE.RingGeometry(Math.min(ri, ro) - 0.05, Math.min(ri, ro) + 0.15, 96, 1, Math.PI / 2 + saut, Math.PI * 2 - 2 * saut);
      bord.rotateX(-Math.PI / 2); bord.translate(0, 0.1, 0); trottoirs.push(bord);
    }
  }
  groupe.add(new THREE.Mesh(mergeGeometries(trottoirs), trottoirMat));

  // ---- la place : pavés, fontaine, parc, kiosques, monorail ----
  const parc = construireParc(groupe, rnd);

  // ---- bâtiments : quatre matériaux de façade, une géométrie fusionnée par matériau ----
  const batiments = construireBati(routes, rnd);
  const VARIANTES = ['brique', 'beton', 'metal', 'verre'];
  const parVariante = {};
  const toitsGeo = [];
  for (const b of batiments) {
    let g;
    if (b.forme === 'cylindre') {
      g = cylindreUV(Math.min(b.w, b.d) / 2, b.h, TUILE_M);
      const t = new THREE.CircleGeometry(Math.min(b.w, b.d) / 2, 20); t.rotateX(-Math.PI / 2); t.translate(b.x, b.h + 0.02, b.z); toitsGeo.push(t);
    } else {
      g = boiteUV(b.w, b.h, b.d, TUILE_M);
      const t = planUV(b.w, b.d, 4); t.rotateX(-Math.PI / 2); t.rotateY(b.rot); t.translate(b.x, (b.y0 || 0) + b.h + 0.02, b.z); toitsGeo.push(t);
    }
    g.rotateY(b.rot);
    g.translate(b.x, (b.y0 || 0) + b.h / 2, b.z);
    (parVariante[b.variante] = parVariante[b.variante] || []).push(g);
  }
  VARIANTES.forEach((v, i) => {
    if (!parVariante[v]) return;
    const { map, emissiveMap } = facade(v, 100 + i * 17);
    const mat = new THREE.MeshStandardMaterial({ map, emissiveMap, emissive: 0xffffff, emissiveIntensity: 1.15, roughness: 0.92, metalness: 0.05 });
    groupe.add(new THREE.Mesh(mergeGeometries(parVariante[v]), mat));
  });
  groupe.add(new THREE.Mesh(mergeGeometries(toitsGeo), new THREE.MeshStandardMaterial({ map: toit(), roughness: 1 })));

  // ---- l'horizon : des tours sombres hors les murs, quelques fenêtres allumées ----
  const lointain = [];
  for (const t of construireLointain(rnd)) {
    const g = boiteUV(t.w, t.h, t.d, TUILE_M); g.rotateY(t.rot); g.translate(t.x, t.h / 2, t.z); lointain.push(g);
  }
  const texLoin = facade('verre', 700);
  groupe.add(new THREE.Mesh(mergeGeometries(lointain), new THREE.MeshStandardMaterial({ color: 0x3a3a4a, map: texLoin.map, emissiveMap: texLoin.emissiveMap, emissive: 0xffffff, emissiveIntensity: 0.7, roughness: 0.9 })));

  // ---- arêtes néon : seulement les corniches, un seul LineSegments coloré ----
  const pos = [], col = [];
  const tmpCol = new THREE.Color();
  for (const b of batiments) {
    if (rnd() < 0.35 || b.forme === 'cylindre') continue;
    const y1 = (b.y0 || 0) + b.h + 0.03;
    const coins = [[-b.w / 2, -b.d / 2], [b.w / 2, -b.d / 2], [b.w / 2, b.d / 2], [-b.w / 2, b.d / 2]].map(([lx, lz]) => versMonde(b, lx, lz));
    tmpCol.set(b.accent.num);
    const dim = 0.35 + rnd() * 0.45;
    for (let k = 0; k < 4; k++) {
      const a = coins[k], c = coins[(k + 1) % 4];
      pos.push(a.x, y1, a.z, c.x, y1, c.z);
      for (let j = 0; j < 2; j++) col.push(tmpCol.r * dim, tmpCol.g * dim, tmpCol.b * dim);
    }
  }
  const aretesGeo = new THREE.BufferGeometry();
  aretesGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  aretesGeo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  groupe.add(new THREE.LineSegments(aretesGeo, new THREE.LineBasicMaterial({ vertexColors: true, toneMapped: false })));

  // ---- enseignes de bruit sur les façades qui donnent sur une rue ----
  const enseignes = [];
  const fonds = ['#0f1a2a', '#2a0f22', '#0f2a1e', '#2a1f0f', '#101a10', '#1a0f2a'];
  const encres = ['#46E6C8', '#E84FD1', '#F2D13B', '#FF9A5C', '#5AA9E6', '#9B7CFF', '#FFFFFF'];
  const GEANTS = ['BATS', '首電', 'YIN DIAN', '封神', 'NODE 7', 'GPU FARM', 'SOC 24/7', 'ROOT', 'DMARC', 'ISO 27001', 'CTI', 'VLAN 40'];
  const paires = [['#E84FD1', '#46E6C8'], ['#0f1a2a', '#F2D13B'], ['#46E6C8', '#0B0E11'], ['#1a0f2a', '#FF9A5C'], ['#0B0E11', '#E84FD1'], ['#F2D13B', '#0B0E11']];
  let nGeant = 0, nBruit = 0;
  for (const b of batiments) {
    if (b.etage || b.rue > 7 || b.forme === 'cylindre') continue;
    if (DISTRICTS.some(d => Math.hypot(d.x - b.x, d.z - b.z) < 22)) continue;
    const f = faceDe(b, b.face.x, b.face.z);
    if (b.h > 20 && nGeant < 14 && rnd() < 0.5) {
      const txt = GEANTS[nGeant % GEANTS.length];
      const [fond, encre] = paires[nGeant % paires.length];
      const vertical = txt.length <= 4 || /[^A-Z0-9 /]/.test(txt);
      const e = enseigne(txt, fond, encre, vertical ? 4 : Math.min(8, f.len - 1), vertical ? 'v' : 'h', 1.1);
      e.position.set(f.x + f.nx * 0.1 + f.tx * (rnd() - 0.5) * 2, b.h * 0.6, f.z + f.nz * 0.1 + f.tz * (rnd() - 0.5) * 2);
      e.rotation.y = f.yaw; groupe.add(e); enseignes.push(e); nGeant++;
      continue;
    }
    if (nBruit >= 190 || rnd() > 0.7) continue;
    const nb = 1 + Math.floor(rnd() * 2);
    for (let i = 0; i < nb && nBruit < 190; i++) {
      const txt = ENSEIGNES_BRUIT[Math.floor(rnd() * ENSEIGNES_BRUIT.length)];
      const dir = rnd() < 0.3 ? 'v' : 'h';
      const e = enseigne(txt, fonds[Math.floor(rnd() * fonds.length)], encres[Math.floor(rnd() * encres.length)], dir === 'v' ? 1.5 : Math.min(f.len - 1, 2.6 + rnd() * 2), dir, 0.9);
      const u = (rnd() - 0.5) * Math.max(0, f.len - 3);
      e.position.set(f.x + f.nx * 0.08 + f.tx * u, 3 + rnd() * Math.min(9, Math.max(1, b.h - 3)), f.z + f.nz * 0.08 + f.tz * u);
      e.rotation.y = f.yaw;
      e.userData.clignote = rnd() < 0.18; e.userData.phase = rnd() * 10;
      groupe.add(e); enseignes.push(e); nBruit++;
    }
  }

  // ---- rails néon et arches au-dessus des avenues ----
  const railGeo = { c: [], m: [] }, montants = [];
  for (const s of routes) {
    if (s.type !== 'avenue') continue;
    const L = longueurSeg(s);
    for (const [c, k] of [[-1, 'c'], [1, 'm']]) {
      const p = pointSeg(s, L / 2, c * (s.w / 2 - 0.4));
      const g = new THREE.BoxGeometry(0.16, 0.16, L); g.rotateY(p.ang); g.translate(p.x, 13.5, p.z); railGeo[k].push(g);
    }
    for (const d of [16, 34]) {
      const p = pointSeg(s, d);
      const arche = new THREE.BoxGeometry(s.w - 0.6, 0.14, 0.14); arche.rotateY(p.ang); arche.translate(p.x, 13.5, p.z); railGeo.c.push(arche);
      for (const c of [-1, 1]) {
        const q = pointSeg(s, d, c * (s.w / 2 - 0.4));
        const m = new THREE.BoxGeometry(0.12, 13.5, 0.12); m.translate(q.x, 6.75, q.z); montants.push(m);
      }
    }
  }
  groupe.add(new THREE.Mesh(mergeGeometries(railGeo.c), new THREE.MeshBasicMaterial({ color: 0x46E6C8, toneMapped: false })));
  groupe.add(new THREE.Mesh(mergeGeometries(railGeo.m), new THREE.MeshBasicMaterial({ color: 0xE84FD1, toneMapped: false })));
  groupe.add(new THREE.Mesh(mergeGeometries(montants), new THREE.MeshStandardMaterial({ color: 0x3a4048, metalness: 0.5 })));

  // ---- portails : un bâtiment au bout de chaque avenue, son anneau, son portique, sa colonne ----
  const portails = [];
  const obstacles = [...parc.obstacles];
  const texPortail = facade('verre', 900);
  DISTRICTS.forEach((d, i) => {
    const acc = d.accent;
    const corpsB = { x: d.x, z: d.z, w: d.larg, d: d.prof, rot: d.theta };
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: texPortail.map, emissiveMap: texPortail.emissiveMap, emissive: 0xffffff, emissiveIntensity: 0.9, roughness: 0.5, metalness: 0.3 });
    const geo = boiteUV(d.larg, d.hauteur, d.prof, TUILE_M); geo.rotateY(d.theta);
    const corps = new THREE.Mesh(geo, mat);
    corps.position.set(d.x, d.hauteur / 2, d.z); groupe.add(corps);
    const ar = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: acc.num, toneMapped: false }));
    ar.position.copy(corps.position); groupe.add(ar);
    obstacles.push({ x: d.x, z: d.z, w: d.larg, d: d.prof, rot: d.theta });
    if (d.tour) {
      const socle = new THREE.Mesh(boiteUV(d.larg + 6, 3, d.prof + 6, TUILE_M), mat); socle.geometry.rotateY(d.theta); socle.position.set(d.x, 1.5, d.z); groupe.add(socle);
      const fleche = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 2.2, 22, 8), new THREE.MeshBasicMaterial({ color: acc.num, toneMapped: false }));
      fleche.position.set(d.x, d.hauteur + 11, d.z); groupe.add(fleche);
    }

    const f = faceDe(corpsB, d.face.x, d.face.z);
    const grande = enseigne(d.nom, '#0B0E11', acc.hex, d.tour ? 5 : 3.4, 'v', 1);
    const petite = enseigne(d.verbe, acc.hex, '#0B0E11', d.tour ? 10 : 7, 'h', 0.9);
    grande.position.set(f.x + f.nx * 0.08 + f.tx * (d.tour ? -5 : -1.5), d.hauteur * 0.55, f.z + f.nz * 0.08 + f.tz * (d.tour ? -5 : -1.5));
    petite.position.set(f.x + f.nx * 0.08 + f.tx * (d.tour ? 2 : 1), d.tour ? 6 : 5.5, f.z + f.nz * 0.08 + f.tz * (d.tour ? 2 : 1));
    grande.rotation.y = petite.rotation.y = f.yaw;
    groupe.add(grande, petite);

    const e = surCap(d.theta, d.fin - 1.5);
    const ex = e.x, ez = e.z, tx = Math.cos(d.theta), tz = -Math.sin(d.theta);
    const anneau = new THREE.Mesh(new THREE.RingGeometry(3.0, 3.8, 56), new THREE.MeshBasicMaterial({ color: acc.num, transparent: true, opacity: 0.6, side: THREE.DoubleSide, toneMapped: false }));
    anneau.rotation.x = -Math.PI / 2; anneau.position.set(ex, 0.06, ez); groupe.add(anneau);
    const disque = new THREE.Mesh(new THREE.CircleGeometry(3.0, 40), new THREE.MeshBasicMaterial({ color: acc.num, transparent: true, opacity: 0.1, toneMapped: false, depthWrite: false }));
    disque.rotation.x = -Math.PI / 2; disque.position.set(ex, 0.055, ez); groupe.add(disque);

    const pyloneMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(acc.num).multiplyScalar(0.62), toneMapped: false });
    const pyloneSombre = new THREE.MeshStandardMaterial({ color: 0x1a2028, roughness: 0.7, metalness: 0.3 });
    for (const s of [-1, 1]) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.7, 7.5, 0.7), pyloneSombre);
      p.position.set(ex + tx * s * 5.2, 3.75, ez + tz * s * 5.2); p.rotation.y = d.theta; groupe.add(p);
      const ruban = new THREE.Mesh(new THREE.BoxGeometry(0.76, 7.5, 0.16), pyloneMat);
      ruban.position.copy(p.position); ruban.rotation.y = d.theta; groupe.add(ruban);
      obstacles.push({ x: p.position.x, z: p.position.z, w: 0.7, d: 0.7 });
    }
    const linteau = new THREE.Mesh(new THREE.BoxGeometry(11, 0.5, 0.5), pyloneMat);
    linteau.position.set(ex, 7.6, ez); linteau.rotation.y = d.theta; groupe.add(linteau);
    const colonne = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 2.6, 70, 22, 1, true),
      new THREE.MeshBasicMaterial({ color: acc.num, transparent: true, opacity: 0.09, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false, toneMapped: false }));
    colonne.position.set(ex, 35, ez); groupe.add(colonne);
    const holo = new THREE.Group();
    const h1 = enseigne(d.nom, '#0B0E11', acc.hex, 6.2, 'h', 1); h1.position.y = 0.9;
    const h2 = enseigne(d.verbe, acc.hex, '#0B0E11', 4.4, 'h', 0.8); h2.position.y = -0.7;
    h1.material.transparent = h2.material.transparent = true; h1.material.opacity = h2.material.opacity = 0.92;
    holo.add(h1, h2); holo.position.set(ex, 10.2, ez); groupe.add(holo);
    const lum = new THREE.PointLight(acc.num, d.tour ? 80 : 46, 52, 1.5);
    lum.position.set(ex, 7, ez); groupe.add(lum);
    portails.push({ ...d, accent: acc, x: ex, z: ez, rayon: 3.8, anneau, lumiere: lum, holo, colonne, phase: i * 1.7 });
  });

  // ---- décor, mobilier, passants ----
  const decor = ajouterDetails(groupe, batiments, rnd, { routes, portails });
  const mobilier = ajouterMobilier(groupe, rnd, { routes, portails, batiments });
  const pnj = creerPnj(groupe, rnd, { routes, portails, arrets: mobilier.arrets });

  // ---- véhicules : des feux qui filent sur les anneaux et le long des avenues ----
  const vehicules = [];
  const feuAv = new THREE.MeshBasicMaterial({ color: 0xfff2d0, toneMapped: false });
  const feuAr = new THREE.MeshBasicMaterial({ color: 0xE8503A, toneMapped: false });
  const carrosserie = new THREE.MeshStandardMaterial({ color: 0x1a2028, roughness: 0.5, metalness: 0.6 });
  for (let i = 0; i < 12; i++) {
    const v = new THREE.Group();
    const corps = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.4, 2.6), carrosserie);
    const av = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.12, 0.08), feuAv); av.position.set(0, 0, -1.32);
    const ar = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.12, 0.08), feuAr); ar.position.set(0, 0, 1.32);
    v.add(corps, av, ar);
    const sens = i % 2 === 0 ? -1 : 1;
    if (i < 8) v.userData = { anneau: true, r: (i < 4 ? ANNEAU : ANNEAU2) + sens * 2.5, sens, a: rnd() * Math.PI * 2, vit: (0.06 + rnd() * 0.05), y: 9 + rnd() * 6 };
    else v.userData = { anneau: false, theta: DISTRICTS[i - 8].theta, sens, r: 30 + rnd() * 50, vit: 9 + rnd() * 8, y: 10 + rnd() * 5, lat: sens * 3 };
    groupe.add(v); vehicules.push(v);
  }

  // ---- poussière en suspension ----
  const nPts = 700, pp = new Float32Array(nPts * 3);
  for (let i = 0; i < nPts; i++) { pp[i * 3] = (rnd() - 0.5) * 280; pp[i * 3 + 1] = 0.5 + rnd() * 18; pp[i * 3 + 2] = (rnd() - 0.5) * 280; }
  const pGeo = new THREE.BufferGeometry(); pGeo.setAttribute('position', new THREE.Float32BufferAttribute(pp, 3));
  const points = new THREE.Points(pGeo, new THREE.PointsMaterial({ color: 0xc0b0a0, size: 0.12, transparent: true, opacity: 0.45 }));
  groupe.add(points);

  const occupe = construireCollision(batiments, obstacles);

  let tPrec = 0;
  function animer(t) {
    const dt = Math.min(0.1, Math.max(0, t - tPrec)); tPrec = t;
    for (const e of enseignes) {
      if (!e.userData.clignote) continue;
      const v = Math.sin(t * 7 + e.userData.phase) + Math.sin(t * 13.7 + e.userData.phase * 2);
      e.visible = v > -1.4;
    }
    for (const p of portails) {
      p.anneau.material.opacity = 0.45 + 0.25 * Math.sin(t * 2.2 + p.phase);
      p.anneau.rotation.z = t * 0.2;
      p.holo.rotation.y = t * 0.6;
      p.holo.position.y = 10.2 + Math.sin(t * 1.3 + p.phase) * 0.25;
      p.colonne.material.opacity = 0.07 + 0.03 * Math.sin(t * 1.1 + p.phase);
    }
    decor.animer(t);
    parc.animer(t);
    pnj.animer(t, dt);
    points.rotation.y = t * 0.004;
    for (const v of vehicules) {
      const u = v.userData;
      if (u.anneau) {
        u.a += u.sens * u.vit * dt;
        const p = surCap(u.a, u.r);
        v.position.set(p.x, u.y + Math.sin(t * 1.7 + u.a) * 0.15, p.z);
        v.rotation.y = u.a + (u.sens === 1 ? 0 : Math.PI);
      } else {
        u.r += u.sens * u.vit * dt;
        if (u.r > 82) { u.r = 82; u.sens = -1; } else if (u.r < 30) { u.r = 30; u.sens = 1; }
        const p = surCap(u.theta, u.r);
        v.position.set(p.x + Math.cos(u.theta) * u.lat, u.y + Math.sin(t * 1.7 + u.r) * 0.15, p.z - Math.sin(u.theta) * u.lat);
        v.rotation.y = u.theta + (u.sens === 1 ? Math.PI : 0);
      }
    }
  }

  return { groupe, portails, occupe, animer, miroir, routes, batiments };
}
