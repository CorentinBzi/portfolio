// La ville : une grille de blocs, une avenue centrale, six quartiers.
// Façades texturées (brique, béton, tôle, verre) fusionnées par matériau, toits,
// trottoirs, chaussée marquée, enseignes, rails, véhicules, mobilier, passants.
// Le sud est 2018, le nord est aujourd'hui, et la tour ferme l'avenue.

import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { P, QUARTIERS, ENSEIGNES_BRUIT } from './palette.js';
import { enseigne } from './enseignes.js';
import { ajouterDetails } from './decor.js';
import { ajouterMobilier } from './mobilier.js';
import { creerPnj } from './pnj.js';
import { facade, toit, trottoir, asphalte, TUILE_M } from './textures.js';

export const PAS = 16;      // pas de la grille
export const BLOC = 10;     // emprise bâtie d'un bloc
export const GRILLE_X = 6;  // blocs de -6 à 6 en x (la colonne 0 est l'avenue)
export const GRILLE_Z = 7;  // blocs de -7 à 7 en z

// Un quartier par employeur, du sud (2018) au nord (aujourd'hui).
export const DISTRICTS = [
  { id: 'medline',       nom: 'MEDLINE',        annees: '2018 - 2020', verbe: 'TRADUIRE',     bz: 6,  cote: -1, hauteur: 22 },
  { id: 'thales',        nom: 'THALES',         annees: '2020 - 2021', verbe: 'INSTRUMENTER', bz: 3,  cote: 1,  hauteur: 26 },
  { id: 'albys',         nom: 'ALBYS',          annees: '2021 - 2023', verbe: 'SEGMENTER',    bz: 0,  cote: -1, hauteur: 28 },
  { id: 'independant',   nom: 'INDEPENDANT',    annees: '2023 - 2025', verbe: 'ATTESTER',     bz: -3, cote: 1,  hauteur: 24 },
  { id: 'digitalrealty', nom: 'DIGITAL REALTY', annees: 'DEPUIS 2025', verbe: 'COORDONNER',   bz: -6, cote: -1, hauteur: 32 },
  { id: 'scenario',      nom: 'LA TOUR',        annees: 'SCENARIO',    verbe: 'DIAGNOSTIQUER',bz: -9, cote: 0,  hauteur: 64 },
];

function rng(graine) {
  let s = graine >>> 0 || 1;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
function accentPourZ(z) {
  let best = DISTRICTS[0], bd = 1e9;
  for (const d of DISTRICTS) { const dz = Math.abs(z - d.bz * PAS); if (dz < bd) { bd = dz; best = d; } }
  return QUARTIERS[best.id];
}

// Une boîte dont les UV sont mis à l'échelle du monde : une tuile de texture
// couvre toujours `tuile` mètres, quelle que soit la taille de la boîte.
function boiteUV(w, h, d, tuile) {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv;
  const ech = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) {
    const [su, sv] = ech[f];
    for (let v = f * 4; v < f * 4 + 4; v++) uv.setXY(v, uv.getX(v) * su / tuile, uv.getY(v) * sv / tuile);
  }
  return g;
}

export function construireVille(scene, options = {}) {
  const rnd = rng(20260911);
  const groupe = new THREE.Group();
  scene.add(groupe);

  // ---- sol : un miroir sombre sous un voile gris, comme de l'asphalte mouillé ----
  const solGeo = new THREE.PlaneGeometry(900, 900);
  const miroir = options.miroir === false
    ? new THREE.Mesh(solGeo, new THREE.MeshBasicMaterial({ color: 0x2a323a }))
    : new Reflector(solGeo, { clipBias: 0.003, textureWidth: 1024, textureHeight: 1024, color: 0x4a5058 });
  miroir.rotation.x = -Math.PI / 2;
  groupe.add(miroir);
  const voile = new THREE.Mesh(solGeo, new THREE.MeshBasicMaterial({ color: 0x23272c, transparent: true, opacity: 0.58, depthWrite: false }));
  voile.rotation.x = -Math.PI / 2; voile.position.y = 0.02; groupe.add(voile);

  // ---- chaussée : avenue et rues transversales en asphalte, marquages, passages piétons ----
  const texAsph = asphalte();
  const longueur = (GRILLE_Z * 2 + 3) * PAS;
  const largeurAvenue = (PAS - BLOC / 2) * 2;
  const asphMat = new THREE.MeshStandardMaterial({ map: texAsph, roughness: 0.55, metalness: 0.1, transparent: true, opacity: 0.8 });
  const avenue = new THREE.Mesh(new THREE.PlaneGeometry(largeurAvenue, longueur), asphMat);
  avenue.material.map.repeat.set(largeurAvenue / 8, longueur / 8);
  avenue.rotation.x = -Math.PI / 2; avenue.position.set(0, 0.03, -PAS * 0.5); groupe.add(avenue);
  const asphMat2 = asphMat.clone(); asphMat2.map = texAsph.clone(); asphMat2.map.needsUpdate = true;
  asphMat2.map.repeat.set((GRILLE_X * 2 + 1) * PAS / 8, 6 / 8);
  for (let bz = -GRILLE_Z; bz < GRILLE_Z; bz++) {
    const rue = new THREE.Mesh(new THREE.PlaneGeometry((GRILLE_X * 2 + 1) * PAS, PAS - BLOC), asphMat2);
    rue.rotation.x = -Math.PI / 2; rue.position.set(0, 0.025, bz * PAS + PAS / 2); groupe.add(rue);
  }
  const marquage = new THREE.MeshBasicMaterial({ color: 0xb8b4a8, toneMapped: false, transparent: true, opacity: 0.55 });
  const tirets = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.22, 2.2), marquage, 120);
  const dummy = new THREE.Object3D(); let nT = 0;
  for (let z = -longueur / 2 - PAS * 0.5; z < longueur / 2 - PAS * 0.5 && nT < 120; z += 5.5) {
    dummy.position.set(0, 0.05, z); dummy.rotation.set(-Math.PI / 2, 0, 0); dummy.updateMatrix(); tirets.setMatrixAt(nT++, dummy.matrix);
  }
  tirets.count = nT; groupe.add(tirets);
  for (const x of [-(PAS - BLOC / 2 - 2.7), PAS - BLOC / 2 - 2.7]) {
    const l = new THREE.Mesh(new THREE.PlaneGeometry(0.16, longueur), marquage);
    l.rotation.x = -Math.PI / 2; l.position.set(x, 0.05, -PAS * 0.5); groupe.add(l);
  }
  const passages = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.7, largeurAvenue - 5), marquage, 80); let nP = 0;
  for (let bz = -GRILLE_Z; bz < GRILLE_Z; bz++) {
    for (let k = -2; k <= 2 && nP < 80; k++) {
      dummy.position.set(0, 0.055, bz * PAS + PAS / 2 + k * 1.15); dummy.rotation.set(-Math.PI / 2, 0, Math.PI / 2); dummy.updateMatrix(); passages.setMatrixAt(nP++, dummy.matrix);
    }
  }
  passages.count = nP; groupe.add(passages);

  // ---- trottoirs : le long de l'avenue, et un liseré autour de chaque bloc ----
  const texTrottoir = trottoir();
  const trottoirMat = new THREE.MeshStandardMaterial({ map: texTrottoir, roughness: 0.95 });
  const trottoirs = [];
  for (const s of [-1, 1]) {
    const g = boiteUV(2.6, 0.18, longueur, 1); g.translate(s * (PAS - BLOC / 2 - 1.3), 0.09, -PAS * 0.5); trottoirs.push(g);
  }
  for (let bx = -GRILLE_X; bx <= GRILLE_X; bx++) for (let bz = -GRILLE_Z; bz <= GRILLE_Z; bz++) {
    if (bx === 0 || Math.abs(bx) === 1) continue;
    const cx = bx * PAS, cz = bz * PAS, r = BLOC / 2 + 0.9;
    for (const [x, z, w, d] of [[cx, cz - r + 0.45, r * 2, 0.9], [cx, cz + r - 0.45, r * 2, 0.9], [cx - r + 0.45, cz, 0.9, r * 2 - 1.8], [cx + r - 0.45, cz, 0.9, r * 2 - 1.8]]) {
      const g = boiteUV(w, 0.16, d, 1); g.translate(x, 0.08, z); trottoirs.push(g);
    }
  }
  groupe.add(new THREE.Mesh(mergeGeometries(trottoirs), trottoirMat));

  // ---- bâtiments : quatre matériaux de façade, une géométrie fusionnée par matériau ----
  const occupes = new Set();
  const batiments = [];
  const grands = [];
  const VARIANTES = ['brique', 'beton', 'metal', 'verre'];
  for (let bx = -GRILLE_X; bx <= GRILLE_X; bx++) {
    for (let bz = -GRILLE_Z; bz <= GRILLE_Z; bz++) {
      if (bx === 0) continue;
      const cx = bx * PAS, cz = bz * PAS;
      const portail = DISTRICTS.find(d => d.cote === bx && d.bz === bz);
      occupes.add(bx + ',' + bz);
      if (portail) continue;
      const accent = accentPourZ(cz);
      const proche = Math.abs(bx) === 1;
      const variante = VARIANTES[Math.floor(rnd() * 4)];
      const n = rnd() < 0.45 ? 1 : (rnd() < 0.6 ? 2 : 4);
      if (n === 1) {
        const h = 7 + rnd() * (proche ? 22 : 14);
        batiments.push({ x: cx, z: cz, w: BLOC, d: BLOC, h, accent, variante });
        if (proche && h > 16) grands.push({ x: cx, z: cz, h, cote: bx });
        if (h > 12) {
          let y = h, w = BLOC, d = BLOC;
          for (let k = 0; k < 1 + Math.floor(rnd() * 2); k++) {
            w *= 0.55 + rnd() * 0.25; d *= 0.55 + rnd() * 0.25;
            const hh = 3 + rnd() * 7;
            batiments.push({ x: cx + (rnd() - 0.5) * (BLOC - w), z: cz + (rnd() - 0.5) * (BLOC - d), w, d, h: hh, y0: y, accent, etage: true, variante: VARIANTES[Math.floor(rnd() * 4)] });
            y += hh;
          }
        }
      } else if (n === 2) {
        const vert = rnd() < 0.5;
        for (let i = 0; i < 2; i++) {
          const h = 6 + rnd() * (proche ? 20 : 12);
          batiments.push({ x: cx + (vert ? 0 : (i - 0.5) * 5.2), z: cz + (vert ? (i - 0.5) * 5.2 : 0), w: vert ? BLOC : 4.6, d: vert ? 4.6 : BLOC, h, accent, variante: VARIANTES[Math.floor(rnd() * 4)] });
        }
      } else {
        for (let i = 0; i < 4; i++) {
          const h = 5 + rnd() * (proche ? 18 : 11);
          batiments.push({ x: cx + ((i % 2) - 0.5) * 5.2, z: cz + (Math.floor(i / 2) - 0.5) * 5.2, w: 4.6, d: 4.6, h, accent, variante: VARIANTES[Math.floor(rnd() * 4)] });
        }
      }
    }
  }

  const parVariante = {};
  const toitsGeo = [];
  for (const b of batiments) {
    const g = boiteUV(b.w, b.h, b.d, TUILE_M);
    g.translate(b.x, (b.y0 || 0) + b.h / 2, b.z);
    (parVariante[b.variante] = parVariante[b.variante] || []).push(g);
    const t = new THREE.PlaneGeometry(b.w, b.d);
    const uv = t.attributes.uv; for (let v = 0; v < 4; v++) uv.setXY(v, uv.getX(v) * b.w / 4, uv.getY(v) * b.d / 4);
    t.rotateX(-Math.PI / 2); t.translate(b.x, (b.y0 || 0) + b.h + 0.02, b.z); toitsGeo.push(t);
  }
  VARIANTES.forEach((v, i) => {
    if (!parVariante[v]) return;
    const { map, emissiveMap } = facade(v, 100 + i * 17);
    const mat = new THREE.MeshStandardMaterial({ map, emissiveMap, emissive: 0xffffff, emissiveIntensity: 1.15, roughness: 0.92, metalness: 0.05 });
    groupe.add(new THREE.Mesh(mergeGeometries(parVariante[v]), mat));
  });
  groupe.add(new THREE.Mesh(mergeGeometries(toitsGeo), new THREE.MeshStandardMaterial({ map: toit(), roughness: 1 })));

  // ---- arêtes néon : seulement les corniches, un seul LineSegments coloré ----
  const pos = [], col = [];
  const tmpCol = new THREE.Color();
  const seg = [[4, 5], [5, 6], [6, 7], [7, 4]];
  for (const b of batiments) {
    if (rnd() < 0.35) continue;
    const x0 = b.x - b.w / 2, x1 = b.x + b.w / 2, z0 = b.z - b.d / 2, z1 = b.z + b.d / 2;
    const y1 = (b.y0 || 0) + b.h + 0.03;
    const v = [0, 0, 0, 0, [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]];
    tmpCol.set(b.accent.num);
    const dim = 0.35 + rnd() * 0.45;
    for (const [a, c] of seg) { pos.push(...v[a], ...v[c]); for (let k = 0; k < 2; k++) col.push(tmpCol.r * dim, tmpCol.g * dim, tmpCol.b * dim); }
  }
  const aretesGeo = new THREE.BufferGeometry();
  aretesGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  aretesGeo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  groupe.add(new THREE.LineSegments(aretesGeo, new THREE.LineBasicMaterial({ vertexColors: true, toneMapped: false })));

  // ---- enseignes de bruit sur les façades qui donnent sur l'avenue ----
  const enseignes = [];
  const fonds = ['#0f1a2a', '#2a0f22', '#0f2a1e', '#2a1f0f', '#101a10', '#1a0f2a'];
  const encres = ['#46E6C8', '#E84FD1', '#F2D13B', '#FF9A5C', '#5AA9E6', '#9B7CFF', '#FFFFFF'];
  for (let bz = -GRILLE_Z; bz <= GRILLE_Z; bz++) {
    for (const cote of [-1, 1]) {
      if (DISTRICTS.find(d => d.cote === cote && d.bz === bz)) continue;
      const x = cote * (PAS - BLOC / 2) - cote * 0.06;
      const nb = 2 + Math.floor(rnd() * 3);
      for (let i = 0; i < nb; i++) {
        const txt = ENSEIGNES_BRUIT[Math.floor(rnd() * ENSEIGNES_BRUIT.length)];
        const dir = rnd() < 0.3 ? 'v' : 'h';
        const e = enseigne(txt, fonds[Math.floor(rnd() * fonds.length)], encres[Math.floor(rnd() * encres.length)], dir === 'v' ? 1.6 : 3.2 + rnd() * 2, dir);
        e.position.set(x, 3 + rnd() * 10, bz * PAS + (rnd() - 0.5) * 6);
        e.rotation.y = cote === -1 ? Math.PI / 2 : -Math.PI / 2;
        e.userData.clignote = rnd() < 0.18; e.userData.phase = rnd() * 10;
        groupe.add(e); enseignes.push(e);
      }
    }
  }
  const GEANTS = ['BATS', '首電', 'YIN DIAN', '封神', 'NODE 7', 'GPU FARM', 'SOC 24/7', 'ROOT', 'DMARC', 'ISO 27001', 'CTI', 'VLAN 40'];
  const paires = [['#E84FD1', '#46E6C8'], ['#0f1a2a', '#F2D13B'], ['#46E6C8', '#0B0E11'], ['#1a0f2a', '#FF9A5C'], ['#0B0E11', '#E84FD1'], ['#F2D13B', '#0B0E11']];
  grands.forEach((g, i) => {
    const txt = GEANTS[i % GEANTS.length];
    const [fond, encre] = paires[i % paires.length];
    const vertical = txt.length <= 4 || /[^A-Z0-9 /]/.test(txt);
    const e = enseigne(txt, fond, encre, vertical ? 4.2 : 8, vertical ? 'v' : 'h', 1.1);
    const face = -g.cote;
    e.position.set(g.x + face * (BLOC / 2 + 0.1), g.h * 0.6, g.z + (rnd() - 0.5) * 3);
    e.rotation.y = face === 1 ? Math.PI / 2 : -Math.PI / 2;
    groupe.add(e); enseignes.push(e);
  });
  for (const b of batiments) {
    if (Math.abs(b.x) > PAS * 3.5 || rnd() > 0.5 || b.etage) continue;
    const txt = ENSEIGNES_BRUIT[Math.floor(rnd() * ENSEIGNES_BRUIT.length)];
    const e = enseigne(txt, fonds[Math.floor(rnd() * fonds.length)], encres[Math.floor(rnd() * encres.length)], 2.4 + rnd() * 1.6, 'h', 0.9);
    const face = rnd() < 0.5 ? 1 : -1;
    e.position.set(b.x + (rnd() - 0.5) * (b.w - 3), 2.5 + rnd() * Math.min(9, b.h - 3), b.z + face * (b.d / 2 + 0.06));
    e.rotation.y = face === 1 ? 0 : Math.PI;
    groupe.add(e); enseignes.push(e);
  }

  // ---- rails néon et arches au-dessus de l'avenue ----
  const railMat = c => new THREE.MeshBasicMaterial({ color: c, toneMapped: false });
  for (const [x, c] of [[-(PAS - BLOC / 2) + 0.4, 0x46E6C8], [(PAS - BLOC / 2) - 0.4, 0xE84FD1]]) {
    const r = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, longueur), railMat(c));
    r.position.set(x, 13.5, -PAS * 0.5); groupe.add(r);
  }
  for (let bz = GRILLE_Z; bz >= -GRILLE_Z; bz -= 3) {
    const arche = new THREE.Mesh(new THREE.BoxGeometry((PAS - BLOC / 2) * 2 - 0.6, 0.14, 0.14), railMat(0x46E6C8));
    arche.position.set(0, 13.5, bz * PAS + PAS / 2); groupe.add(arche);
    for (const x of [-(PAS - BLOC / 2) + 0.4, (PAS - BLOC / 2) - 0.4]) {
      const montant = new THREE.Mesh(new THREE.BoxGeometry(0.12, 13.5, 0.12), new THREE.MeshStandardMaterial({ color: 0x3a4048, metalness: 0.5 }));
      montant.position.set(x, 6.75, bz * PAS + PAS / 2); groupe.add(montant);
    }
  }

  // ---- portails : bâtiment plus haut, enseignes, anneau, portique, colonne, hologramme ----
  const portails = [];
  const texPortail = facade('verre', 900);
  for (const d of DISTRICTS) {
    const acc = QUARTIERS[d.id];
    const tour = d.cote === 0;
    const cx = d.cote * PAS, cz = d.bz * PAS;
    const w = tour ? 18 : 12, prof = tour ? 18 : 12, h = d.hauteur;
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: texPortail.map, emissiveMap: texPortail.emissiveMap, emissive: 0xffffff, emissiveIntensity: 0.9, roughness: 0.5, metalness: 0.3 });
    const corps = new THREE.Mesh(boiteUV(w, h, prof, TUILE_M), mat);
    corps.position.set(cx, h / 2, cz); groupe.add(corps);
    const ar = new THREE.LineSegments(new THREE.EdgesGeometry(corps.geometry), new THREE.LineBasicMaterial({ color: acc.num, toneMapped: false }));
    ar.position.copy(corps.position); groupe.add(ar);

    const face = tour ? 1 : -d.cote;
    const grande = enseigne(d.nom, '#0B0E11', acc.hex, tour ? 5 : 3.4, 'v', 1);
    const petite = enseigne(d.verbe, acc.hex, '#0B0E11', tour ? 10 : 7, 'h', 0.9);
    if (tour) { grande.position.set(cx - 5, h * 0.55, cz + prof / 2 + 0.08); petite.position.set(cx + 2, 6, cz + prof / 2 + 0.08); }
    else {
      grande.position.set(cx + face * (w / 2 + 0.08), h * 0.55, cz - 1.5); grande.rotation.y = face === 1 ? Math.PI / 2 : -Math.PI / 2;
      petite.position.set(cx + face * (w / 2 + 0.08), 5.5, cz + 1); petite.rotation.y = grande.rotation.y;
    }
    groupe.add(grande, petite);

    const ex = tour ? cx : cx + face * (w / 2 + 5);
    const ez = tour ? cz + prof / 2 + 7 : cz;
    const anneau = new THREE.Mesh(new THREE.RingGeometry(3.0, 3.8, 56), new THREE.MeshBasicMaterial({ color: acc.num, transparent: true, opacity: 0.6, side: THREE.DoubleSide, toneMapped: false }));
    anneau.rotation.x = -Math.PI / 2; anneau.position.set(ex, 0.06, ez); groupe.add(anneau);
    const disque = new THREE.Mesh(new THREE.CircleGeometry(3.0, 40), new THREE.MeshBasicMaterial({ color: acc.num, transparent: true, opacity: 0.1, toneMapped: false, depthWrite: false }));
    disque.rotation.x = -Math.PI / 2; disque.position.set(ex, 0.055, ez); groupe.add(disque);

    const pyloneMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(acc.num).multiplyScalar(0.62), toneMapped: false });
    const pyloneSombre = new THREE.MeshStandardMaterial({ color: 0x1a2028, roughness: 0.7, metalness: 0.3 });
    const axeX = tour ? 1 : 0;
    for (const s of [-1, 1]) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.7, 7.5, 0.7), pyloneSombre);
      p.position.set(ex + (axeX ? s * 4.6 : 0), 3.75, ez + (axeX ? 0 : s * 4.6)); groupe.add(p);
      const ruban = new THREE.Mesh(new THREE.BoxGeometry(0.76, 7.5, 0.16), pyloneMat);
      ruban.position.copy(p.position); ruban.rotation.y = axeX ? 0 : Math.PI / 2; groupe.add(ruban);
    }
    const linteau = new THREE.Mesh(new THREE.BoxGeometry(axeX ? 10 : 0.5, 0.5, axeX ? 0.5 : 10), pyloneMat);
    linteau.position.set(ex, 7.6, ez); groupe.add(linteau);
    const colonne = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 2.6, 70, 22, 1, true),
      new THREE.MeshBasicMaterial({ color: acc.num, transparent: true, opacity: 0.09, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false, toneMapped: false }));
    colonne.position.set(ex, 35, ez); groupe.add(colonne);
    const holo = new THREE.Group();
    const h1 = enseigne(d.nom, '#0B0E11', acc.hex, 6.2, 'h', 1); h1.position.y = 0.9;
    const h2 = enseigne(d.verbe, acc.hex, '#0B0E11', 4.4, 'h', 0.8); h2.position.y = -0.7;
    h1.material.transparent = h2.material.transparent = true; h1.material.opacity = h2.material.opacity = 0.92;
    holo.add(h1, h2); holo.position.set(ex, 10.2, ez); groupe.add(holo);
    const lum = new THREE.PointLight(acc.num, tour ? 80 : 46, 52, 1.5);
    lum.position.set(ex, 7, ez); groupe.add(lum);
    portails.push({ ...d, accent: acc, x: ex, z: ez, rayon: 3.8, anneau, lumiere: lum, holo, colonne });
  }

  // ---- décor, mobilier, passants ----
  const decor = ajouterDetails(groupe, batiments, rnd, { PAS, BLOC, GRILLE_Z, portails });
  const mobilier = ajouterMobilier(groupe, rnd, { PAS, BLOC, GRILLE_Z, portails, batiments });
  const pnj = creerPnj(groupe, rnd, { PAS, GRILLE_Z, portails, arrets: mobilier.arrets });

  // ---- véhicules : des feux qui filent au-dessus de l'avenue ----
  const vehicules = [];
  const feuAv = new THREE.MeshBasicMaterial({ color: 0xfff2d0, toneMapped: false });
  const feuAr = new THREE.MeshBasicMaterial({ color: 0xE8503A, toneMapped: false });
  const carrosserie = new THREE.MeshStandardMaterial({ color: 0x1a2028, roughness: 0.5, metalness: 0.6 });
  for (let i = 0; i < 9; i++) {
    const v = new THREE.Group();
    const corps = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.4, 2.6), carrosserie);
    const av = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.12, 0.08), feuAv); av.position.set(0, 0, -1.32);
    const ar = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.12, 0.08), feuAr); ar.position.set(0, 0, 1.32);
    v.add(corps, av, ar);
    const sens = i % 2 === 0 ? -1 : 1;
    v.userData = { sens, vit: 9 + rnd() * 9, x: sens * (2.2 + rnd() * 5.5), y: 9 + rnd() * 6, z: (rnd() - 0.5) * 240 };
    v.rotation.y = sens === -1 ? 0 : Math.PI;
    groupe.add(v); vehicules.push(v);
  }

  // ---- poussière en suspension ----
  const nPts = 600, pp = new Float32Array(nPts * 3);
  for (let i = 0; i < nPts; i++) { pp[i * 3] = (rnd() - 0.5) * 240; pp[i * 3 + 1] = 0.5 + rnd() * 18; pp[i * 3 + 2] = (rnd() - 0.5) * 300; }
  const pGeo = new THREE.BufferGeometry(); pGeo.setAttribute('position', new THREE.Float32BufferAttribute(pp, 3));
  const points = new THREE.Points(pGeo, new THREE.PointsMaterial({ color: 0xc0b0a0, size: 0.12, transparent: true, opacity: 0.45 }));
  groupe.add(points);

  // ---- collision ----
  const marge = 1.1;
  function occupe(x, z) {
    const tour = DISTRICTS[DISTRICTS.length - 1];
    if (Math.abs(x - tour.cote * PAS) < 9 + marge && Math.abs(z - tour.bz * PAS) < 9 + marge) return true;
    if (Math.abs(x) > (GRILLE_X + 0.5) * PAS || z > (GRILLE_Z + 0.9) * PAS || z < (tour.bz - 0.2) * PAS) return true;
    const bx = Math.round(x / PAS), bz = Math.round(z / PAS);
    if (bx === 0) return false;
    if (!occupes.has(bx + ',' + bz)) return false;
    const dx = Math.abs(x - bx * PAS), dz = Math.abs(z - bz * PAS);
    const demi = (DISTRICTS.find(d => d.cote === bx && d.bz === bz) ? 6 : BLOC / 2) + marge;
    return dx < demi && dz < demi;
  }

  let tPrec = 0;
  function animer(t) {
    const dt = Math.min(0.1, Math.max(0, t - tPrec)); tPrec = t;
    for (const e of enseignes) {
      if (!e.userData.clignote) continue;
      const v = Math.sin(t * 7 + e.userData.phase) + Math.sin(t * 13.7 + e.userData.phase * 2);
      e.visible = v > -1.4;
    }
    for (const p of portails) {
      p.anneau.material.opacity = 0.45 + 0.25 * Math.sin(t * 2.2 + p.bz);
      p.anneau.rotation.z = t * 0.2;
      p.holo.rotation.y = t * 0.6;
      p.holo.position.y = 10.2 + Math.sin(t * 1.3 + p.bz) * 0.25;
      p.colonne.material.opacity = 0.07 + 0.03 * Math.sin(t * 1.1 + p.bz);
    }
    decor.animer(t);
    pnj.animer(t, dt);
    points.rotation.y = t * 0.004;
    for (const v of vehicules) {
      const u = v.userData;
      u.z += u.sens * u.vit * dt;
      if (u.z < -140) u.z = 125; else if (u.z > 125) u.z = -140;
      v.position.set(u.x, u.y + Math.sin(t * 1.7 + u.x) * 0.15, u.z);
    }
  }

  return { groupe, portails, occupe, animer, miroir };
}
