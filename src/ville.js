// La ville : une grille de blocs de nuit, une avenue centrale, six quartiers.
// Tout est géométrie générée : boîtes, arêtes néon, enseignes sur canvas.
// Le sud est 2018, le nord est aujourd'hui, et la tour ferme l'avenue.

import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { P, QUARTIERS, ENSEIGNES_BRUIT } from './palette.js';
import { enseigne, textureFenetres } from './enseignes.js';

export const PAS = 16;      // pas de la grille
export const BLOC = 10;     // emprise bâtie d'un bloc
export const GRILLE_X = 6;  // blocs de -6 à 6 en x (la colonne 0 est l'avenue)
export const GRILLE_Z = 7;  // blocs de -7 à 7 en z

// Un quartier par employeur, du sud (2018) au nord (aujourd'hui).
// bz : rangée du portail · cote : -1 ouest, 1 est · la tour est sur l'avenue.
export const DISTRICTS = [
  { id: 'medline',       nom: 'MEDLINE',        annees: '2018 - 2020', verbe: 'TRADUIRE',     bz: 6,  cote: -1, hauteur: 22 },
  { id: 'thales',        nom: 'THALES',         annees: '2020 - 2021', verbe: 'INSTRUMENTER', bz: 3,  cote: 1,  hauteur: 26 },
  { id: 'albys',         nom: 'ALBYS',          annees: '2021 - 2023', verbe: 'SEGMENTER',    bz: 0,  cote: -1, hauteur: 28 },
  { id: 'independant',   nom: 'INDEPENDANT',    annees: '2023 - 2025', verbe: 'ATTESTER',     bz: -3, cote: 1,  hauteur: 24 },
  { id: 'digitalrealty', nom: 'DIGITAL REALTY', annees: 'DEPUIS 2025', verbe: 'COORDONNER',   bz: -6, cote: -1, hauteur: 32 },
  { id: 'scenario',      nom: 'LA TOUR',        annees: 'SCENARIO',    verbe: 'DIAGNOSTIQUER',bz: -9, cote: 0,  hauteur: 64 },
];

// Générateur déterministe : la ville est la même à chaque visite.
function rng(graine) {
  let s = graine >>> 0 || 1;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

function accentPourZ(z) {
  // le quartier dont le portail est le plus proche teinte le bloc
  let best = DISTRICTS[0], bd = 1e9;
  for (const d of DISTRICTS) { const dz = Math.abs(z - d.bz * PAS); if (dz < bd) { bd = dz; best = d; } }
  return QUARTIERS[best.id];
}

export function construireVille(scene, options = {}) {
  const rnd = rng(20260911);
  const groupe = new THREE.Group();
  scene.add(groupe);

  // ---- sol : un miroir sombre, comme de l'asphalte mouillé ----
  const solGeo = new THREE.PlaneGeometry(520, 520);
  const miroir = options.miroir === false
    ? new THREE.Mesh(solGeo, new THREE.MeshBasicMaterial({ color: 0x2a323a }))
    : new Reflector(solGeo, { clipBias: 0.003, textureWidth: 1024, textureHeight: 1024, color: 0x2a323a });
  miroir.rotation.x = -Math.PI / 2;
  miroir.position.y = 0;
  groupe.add(miroir);
  // voile sombre au-dessus du miroir : le reflet reste, l'asphalte domine
  const voile = new THREE.Mesh(solGeo, new THREE.MeshBasicMaterial({
    color: P.sol, transparent: true, opacity: 0.66, depthWrite: false,
  }));
  voile.rotation.x = -Math.PI / 2;
  voile.position.y = 0.02;
  groupe.add(voile);

  // marquage de l'avenue : deux lignes fines
  const ligneMat = new THREE.MeshBasicMaterial({ color: 0x223038 });
  for (const x of [-9.5, 9.5]) {
    const l = new THREE.Mesh(new THREE.PlaneGeometry(0.25, (GRILLE_Z * 2 + 4) * PAS), ligneMat);
    l.rotation.x = -Math.PI / 2; l.position.set(x, 0.03, -PAS); groupe.add(l);
  }

  // ---- bâtiments : boîtes instanciées + arêtes néon fusionnées ----
  const occupes = new Set();
  const batiments = [];   // {x,z,w,h,d,accent}
  const grands = [];      // immeubles hauts en bord d'avenue
  const fenetres = textureFenetres('#5a7a90');
  fenetres.repeat.set(2, 6);

  for (let bx = -GRILLE_X; bx <= GRILLE_X; bx++) {
    for (let bz = -GRILLE_Z; bz <= GRILLE_Z; bz++) {
      if (bx === 0) continue;                       // l'avenue
      const cx = bx * PAS, cz = bz * PAS;
      const portail = DISTRICTS.find(d => d.cote === bx && d.bz === bz);
      occupes.add(bx + ',' + bz);
      if (portail) continue;                        // les portails sont construits à part

      const accent = accentPourZ(cz);
      const proche = Math.abs(bx) === 1;            // bord d'avenue : plus haut, plus dense
      const n = rnd() < 0.45 ? 1 : (rnd() < 0.6 ? 2 : 4);
      if (n === 1) {
        const h = 6 + rnd() * (proche ? 22 : 14);
        batiments.push({ x: cx, z: cz, w: BLOC, d: BLOC, h, accent });
        if (proche && h > 16) grands.push({ x: cx, z: cz, h, cote: bx });
      } else if (n === 2) {
        const vert = rnd() < 0.5;
        for (let i = 0; i < 2; i++) {
          const h = 5 + rnd() * (proche ? 20 : 12);
          batiments.push({
            x: cx + (vert ? 0 : (i - 0.5) * 5.2), z: cz + (vert ? (i - 0.5) * 5.2 : 0),
            w: vert ? BLOC : 4.6, d: vert ? 4.6 : BLOC, h, accent,
          });
        }
      } else {
        for (let i = 0; i < 4; i++) {
          const h = 4 + rnd() * (proche ? 18 : 11);
          batiments.push({
            x: cx + ((i % 2) - 0.5) * 5.2, z: cz + (Math.floor(i / 2) - 0.5) * 5.2,
            w: 4.6, d: 4.6, h, accent,
          });
        }
      }
    }
  }

  // corps : une InstancedMesh, un seul appel de dessin
  const boiteGeo = new THREE.BoxGeometry(1, 1, 1);
  const boiteMat = new THREE.MeshStandardMaterial({
    color: P.beton, roughness: 0.85, metalness: 0.1,
    map: fenetres, emissive: 0xffffff, emissiveMap: fenetres, emissiveIntensity: 0.7,
  });
  const inst = new THREE.InstancedMesh(boiteGeo, boiteMat, batiments.length);
  const m4 = new THREE.Matrix4();
  batiments.forEach((b, i) => {
    m4.makeScale(b.w, b.h, b.d);
    m4.setPosition(b.x, b.h / 2, b.z);
    inst.setMatrixAt(i, m4);
  });
  inst.instanceMatrix.needsUpdate = true;
  groupe.add(inst);

  // arêtes néon : un seul LineSegments avec couleur par sommet
  const pos = [], col = [];
  const tmpCol = new THREE.Color();
  const seg = [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];
  for (const b of batiments) {
    const x0 = b.x - b.w / 2, x1 = b.x + b.w / 2, z0 = b.z - b.d / 2, z1 = b.z + b.d / 2, y1 = b.h;
    const v = [[x0,0,z0],[x1,0,z0],[x1,0,z1],[x0,0,z1],[x0,y1,z0],[x1,y1,z0],[x1,y1,z1],[x0,y1,z1]];
    tmpCol.set(b.accent.num);
    const dim = 0.35 + rnd() * 0.5;
    for (const [a, c] of seg) {
      // les arêtes du sol sont éteintes : seul le haut brille, comme des tubes en corniche
      const brille = (a >= 4 && c >= 4) ? 1 : (a >= 4 || c >= 4 ? 0.55 : 0.12);
      pos.push(...v[a], ...v[c]);
      for (let k = 0; k < 2; k++) col.push(tmpCol.r * dim * brille, tmpCol.g * dim * brille, tmpCol.b * dim * brille);
    }
  }
  const aretesGeo = new THREE.BufferGeometry();
  aretesGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  aretesGeo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  const aretes = new THREE.LineSegments(aretesGeo, new THREE.LineBasicMaterial({ vertexColors: true, toneMapped: false }));
  groupe.add(aretes);

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
        const vertical = rnd() < 0.4 && /^[A-Z0-9 .]+$/.test(txt) === false ? 'v' : (rnd() < 0.3 ? 'v' : 'h');
        const e = enseigne(txt, fonds[Math.floor(rnd() * fonds.length)], encres[Math.floor(rnd() * encres.length)],
                           vertical === 'v' ? 1.6 : 3.2 + rnd() * 2, vertical);
        e.position.set(x, 3 + rnd() * 10, bz * PAS + (rnd() - 0.5) * 6);
        e.rotation.y = cote === -1 ? Math.PI / 2 : -Math.PI / 2;
        e.userData.clignote = rnd() < 0.18;
        e.userData.phase = rnd() * 10;
        groupe.add(e); enseignes.push(e);
      }
    }
  }

  // ---- panneaux géants sur les grands immeubles : le ciel de la ville ----
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

  // ---- rails néon : deux lignes de lumière qui courent au-dessus de l'avenue, et des arches ----
  const railMat = c => new THREE.MeshBasicMaterial({ color: c, toneMapped: false });
  const longueur = (GRILLE_Z * 2 + 3) * PAS;
  for (const [x, c] of [[-(PAS - BLOC / 2) + 0.4, 0x46E6C8], [(PAS - BLOC / 2) - 0.4, 0xE84FD1]]) {
    const r = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, longueur), railMat(c));
    r.position.set(x, 13.5, -PAS * 0.5);
    groupe.add(r);
  }
  for (let bz = GRILLE_Z; bz >= -GRILLE_Z; bz -= 3) {
    const arche = new THREE.Mesh(new THREE.BoxGeometry((PAS - BLOC / 2) * 2 - 0.6, 0.14, 0.14), railMat(0x46E6C8));
    arche.position.set(0, 13.5, bz * PAS + PAS / 2);
    groupe.add(arche);
    for (const x of [-(PAS - BLOC / 2) + 0.4, (PAS - BLOC / 2) - 0.4]) {
      const montant = new THREE.Mesh(new THREE.BoxGeometry(0.12, 13.5, 0.12), railMat(0x223038));
      montant.position.set(x, 6.75, bz * PAS + PAS / 2);
      groupe.add(montant);
    }
  }

  // ---- enseignes des rues transversales : les faces nord et sud des blocs proches ----
  for (const b of batiments) {
    if (Math.abs(b.x) > PAS * 2.5 || rnd() > 0.35) continue;
    const txt = ENSEIGNES_BRUIT[Math.floor(rnd() * ENSEIGNES_BRUIT.length)];
    const e = enseigne(txt, fonds[Math.floor(rnd() * fonds.length)], encres[Math.floor(rnd() * encres.length)], 2.4 + rnd() * 1.6, 'h', 0.9);
    const face = rnd() < 0.5 ? 1 : -1;
    e.position.set(b.x + (rnd() - 0.5) * (b.w - 3), 2.5 + rnd() * Math.min(9, b.h - 3), b.z + face * (b.d / 2 + 0.06));
    e.rotation.y = face === 1 ? 0 : Math.PI;
    groupe.add(e); enseignes.push(e);
  }

  // ---- portails : un bâtiment plus haut, une enseigne verticale, un anneau d'entrée ----
  const portails = [];
  for (const d of DISTRICTS) {
    const acc = QUARTIERS[d.id];
    const tour = d.cote === 0;
    const cx = d.cote * PAS, cz = d.bz * PAS;
    const w = tour ? 18 : 12, prof = tour ? 18 : 12, h = d.hauteur;

    const mat = new THREE.MeshStandardMaterial({
      color: tour ? 0x1c222a : P.beton2, roughness: 0.6, metalness: 0.2,
      emissive: acc.num, emissiveIntensity: tour ? 0.06 : 0.04, map: fenetres,
    });
    const corps = new THREE.Mesh(new THREE.BoxGeometry(w, h, prof), mat);
    corps.position.set(cx, h / 2, cz);
    groupe.add(corps);
    const ar = new THREE.LineSegments(new THREE.EdgesGeometry(corps.geometry),
      new THREE.LineBasicMaterial({ color: acc.num, toneMapped: false }));
    ar.position.copy(corps.position);
    groupe.add(ar);

    // l'enseigne verticale porte le nom de l'employeur ; l'horizontale, le verbe
    const face = tour ? 1 : -d.cote;                 // vers l'avenue (la tour regarde le sud)
    const grande = enseigne(d.nom, '#0B0E11', acc.hex, tour ? 5 : 3.4, 'v', 1);
    const petite = enseigne(d.verbe, acc.hex, '#0B0E11', tour ? 10 : 7, 'h', 0.9);
    if (tour) {
      grande.position.set(cx - 5, h * 0.55, cz + prof / 2 + 0.08);
      petite.position.set(cx + 2, 6, cz + prof / 2 + 0.08);
    } else {
      grande.position.set(cx + face * (w / 2 + 0.08), h * 0.55, cz - 1.5);
      grande.rotation.y = face === 1 ? Math.PI / 2 : -Math.PI / 2;
      petite.position.set(cx + face * (w / 2 + 0.08), 5.5, cz + 1);
      petite.rotation.y = grande.rotation.y;
    }
    groupe.add(grande, petite);

    // anneau d'entrée au sol, devant la façade
    const ex = tour ? cx : cx + face * (w / 2 + 5);
    const ez = tour ? cz + prof / 2 + 7 : cz;
    const anneau = new THREE.Mesh(new THREE.RingGeometry(2.6, 3.2, 48),
      new THREE.MeshBasicMaterial({ color: acc.num, transparent: true, opacity: 0.55, side: THREE.DoubleSide, toneMapped: false }));
    anneau.rotation.x = -Math.PI / 2;
    anneau.position.set(ex, 0.05, ez);
    groupe.add(anneau);

    // lumière du quartier
    const lum = new THREE.PointLight(acc.num, tour ? 60 : 30, 46, 1.6);
    lum.position.set(ex, 7, ez);
    groupe.add(lum);

    portails.push({ ...d, accent: acc, x: ex, z: ez, rayon: 3.4, anneau, lumiere: lum });
  }

  // ---- poussière en suspension : quelques centaines de points ----
  const nP = 600, pp = new Float32Array(nP * 3);
  for (let i = 0; i < nP; i++) {
    pp[i * 3] = (rnd() - 0.5) * 240; pp[i * 3 + 1] = 0.5 + rnd() * 18; pp[i * 3 + 2] = (rnd() - 0.5) * 300;
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.Float32BufferAttribute(pp, 3));
  const points = new THREE.Points(pGeo, new THREE.PointsMaterial({ color: 0x6a7a88, size: 0.12, transparent: true, opacity: 0.55 }));
  groupe.add(points);

  // ---- véhicules : des feux qui filent au-dessus de l'avenue, rien de plus ----
  const vehicules = [];
  const feuAv = new THREE.MeshBasicMaterial({ color: 0xfff2d0, toneMapped: false });
  const feuAr = new THREE.MeshBasicMaterial({ color: 0xE8503A, toneMapped: false });
  const carrosserie = new THREE.MeshStandardMaterial({ color: 0x0e1318, roughness: 0.5, metalness: 0.6 });
  for (let i = 0; i < 9; i++) {
    const v = new THREE.Group();
    const corps = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.4, 2.6), carrosserie);
    const av = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.12, 0.08), feuAv); av.position.set(0, 0, -1.32);
    const ar = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.12, 0.08), feuAr); ar.position.set(0, 0, 1.32);
    v.add(corps, av, ar);
    const sens = i % 2 === 0 ? -1 : 1;                 // -1 vers le nord
    v.userData = { sens, vit: 9 + rnd() * 9, x: sens * (2.2 + rnd() * 5.5), y: 9 + rnd() * 6, z: (rnd() - 0.5) * 240 };
    v.rotation.y = sens === -1 ? 0 : Math.PI;
    groupe.add(v); vehicules.push(v);
  }

  // ---- collision : un bloc bâti est plein, l'avenue et les rues sont libres ----
  const marge = 1.1;
  function occupe(x, z) {
    // la tour ferme l'avenue au nord ; le sud est fermé par un mur invisible
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

  function animer(t) {
    for (const e of enseignes) {
      if (!e.userData.clignote) continue;
      const v = Math.sin(t * 7 + e.userData.phase) + Math.sin(t * 13.7 + e.userData.phase * 2);
      e.visible = v > -1.4;
    }
    for (const p of portails) {
      p.anneau.material.opacity = 0.4 + 0.25 * Math.sin(t * 2.2 + p.bz);
      p.anneau.rotation.z = t * 0.2;
    }
    points.rotation.y = t * 0.004;
    for (const v of vehicules) {
      const u = v.userData;
      u.z += u.sens * u.vit * (t - (u.t0 === undefined ? t : u.t0));
      u.t0 = t;
      if (u.z < -140) u.z = 125; else if (u.z > 125) u.z = -140;
      v.position.set(u.x, u.y + Math.sin(t * 1.7 + u.x) * 0.15, u.z);
    }
  }

  return { groupe, portails, occupe, animer, miroir };
}
