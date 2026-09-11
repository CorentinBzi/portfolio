// Le mobilier urbain : lampadaires, poubelles, bancs, bornes, abribus,
// distributeurs, caisses et barils, voitures garées, bennes, cônes, échafaudages,
// affiches, bannières. Tout est instancié par famille.

import * as THREE from 'three';
import { affiche as texAffiche } from './textures.js';
import { enseigne } from './enseignes.js';

export function ajouterMobilier(groupe, rnd, { PAS, BLOC, GRILLE_Z, portails, batiments }) {
  const dummy = new THREE.Object3D();
  const instancie = (geo, mat, n) => { const im = new THREE.InstancedMesh(geo, mat, Math.max(1, n)); im.count = 0; groupe.add(im); return im; };
  const poser = (inst, x, y, z, ry = 0, sx = 1, sy = 1, sz = 1, rz = 0) => {
    if (inst.count >= inst.instanceMatrix.count) return;
    dummy.position.set(x, y, z); dummy.rotation.set(0, ry, rz); dummy.scale.set(sx, sy, sz); dummy.updateMatrix();
    inst.setMatrixAt(inst.count++, dummy.matrix);
  };
  const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.15, ...extra });
  const lum = (color) => new THREE.MeshBasicMaterial({ color, toneMapped: false });
  const boite = new THREE.BoxGeometry(1, 1, 1);
  const cyl = new THREE.CylinderGeometry(0.5, 0.5, 1, 12);
  const bordZ = (GRILLE_Z + 0.5) * PAS;
  const trottoirX = PAS - BLOC / 2 - 1.3;                 // milieu du trottoir (±9.7)
  const pres = (x, z, d = 6) => portails.some(p => Math.hypot(p.x - x, p.z - z) < d);

  // ---- lampadaires : mât, potence, tête lumineuse ; tous les 16 m des deux côtés
  const mats = instancie(cyl, std(0x3a3f46, { metalness: 0.5 }), 60);
  const potences = instancie(boite, std(0x3a3f46, { metalness: 0.5 }), 60);
  const tetes = instancie(boite, lum(0xffd9a0), 60);
  const lampes = [];
  for (let z = -bordZ + 8; z < bordZ; z += 16) {
    for (const s of [-1, 1]) {
      const x = s * (trottoirX + 0.9);
      poser(mats, x, 2.6, z, 0, 0.16, 5.2, 0.16);
      poser(potences, x - s * 0.7, 5.15, z, 0, 1.5, 0.12, 0.12);
      poser(tetes, x - s * 1.35, 5.05, z, 0, 0.7, 0.16, 0.34);
      lampes.push({ x: x - s * 1.35, z });
    }
  }
  // quelques vraies lumières au sol, près du départ et des portails ; le reste est émissif
  for (const l of lampes.filter(l => Math.abs(l.z - 100) < 20 || pres(l.x, l.z, 14)).slice(0, 8)) {
    const p = new THREE.PointLight(0xffc890, 6, 14, 1.8); p.position.set(l.x, 4.8, l.z); groupe.add(p);
  }

  // ---- poubelles, bancs, bornes
  const poubelles = instancie(cyl, std(0x2e4a3a), 60);
  const couvercles = instancie(cyl, std(0x1e2a24), 60);
  const bancs = instancie(boite, std(0x5a4636), 30);
  const piedsBanc = instancie(boite, std(0x2a2e34, { metalness: 0.5 }), 60);
  const bornes = instancie(cyl, std(0x4a4f57, { metalness: 0.4 }), 260);
  for (let z = -bordZ + 3; z < bordZ; z += 4.2) {
    for (const s of [-1, 1]) {
      const x = s * (trottoirX - 1.05);
      if (!pres(x, z, 5)) poser(bornes, x, 0.45, z, 0, 0.22, 0.75, 0.22);
    }
  }
  for (let i = 0; i < 46; i++) {
    const s = rnd() < 0.5 ? -1 : 1, z = (rnd() - 0.5) * 2 * bordZ, x = s * (trottoirX + (rnd() - 0.5) * 1.4);
    if (pres(x, z, 7)) continue;
    poser(poubelles, x, 0.5, z, 0, 0.6, 0.95, 0.6);
    poser(couvercles, x, 1.0, z, 0, 0.66, 0.08, 0.66);
  }
  for (let i = 0; i < 22; i++) {
    const s = rnd() < 0.5 ? -1 : 1, z = (rnd() - 0.5) * 2 * bordZ, x = s * (trottoirX + 0.5);
    if (pres(x, z, 8)) continue;
    poser(bancs, x, 0.55, z, 0, 0.5, 0.08, 1.8);
    poser(bancs, x + s * 0.28, 0.85, z, 0, 0.08, 0.5, 1.8, s * 0.2);
    poser(piedsBanc, x, 0.27, z - 0.7, 0, 0.5, 0.5, 0.08);
    poser(piedsBanc, x, 0.27, z + 0.7, 0, 0.5, 0.5, 0.08);
  }

  // ---- abribus : deux poteaux, un toit, une paroi vitrée, un banc, un panneau lumineux
  const arrets = [];
  const poteaux = instancie(boite, std(0x2b3138, { metalness: 0.5 }), 16);
  const toitsAbri = instancie(boite, std(0x1f2429, { metalness: 0.3 }), 8);
  const vitres = instancie(boite, new THREE.MeshStandardMaterial({ color: 0x7fb8c8, transparent: true, opacity: 0.32, roughness: 0.1, metalness: 0.4 }), 8);
  const bancsAbri = instancie(boite, std(0x4a3a2c), 8);
  let k = 0;
  for (let bz = GRILLE_Z - 1; bz >= -GRILLE_Z + 1 && k < 6; bz -= 2) {
    const z = bz * PAS + PAS / 2;
    const s = k % 2 ? 1 : -1;
    const x = s * (trottoirX + 0.2);
    if (portails.some(p => Math.abs(p.z - z) < 12)) continue;
    k++;
    poser(poteaux, x, 1.35, z - 1.6, 0, 0.12, 2.7, 0.12); poser(poteaux, x, 1.35, z + 1.6, 0, 0.12, 2.7, 0.12);
    poser(toitsAbri, x, 2.75, z, 0, 2.2, 0.12, 3.8);
    poser(vitres, x + s * 0.95, 1.4, z, 0, 0.06, 2.5, 3.6);
    poser(bancsAbri, x + s * 0.55, 0.5, z, 0, 0.5, 0.08, 2.8);
    const panneau = enseigne(`ARRET ${3 + k * 4}`, '#0f1a2a', '#8fd6ff', 1.3, 'h', 0.9);
    panneau.position.set(x - s * 0.6, 2.2, z - 1.75); panneau.rotation.y = 0; groupe.add(panneau);
    arrets.push({ x: x - s * 0.3, z });
  }

  // ---- distributeurs automatiques : boîtes lumineuses contre les façades
  const distributeurs = instancie(boite, std(0x1a2028), 12);
  for (let i = 0; i < 10; i++) {
    const s = rnd() < 0.5 ? -1 : 1, z = (rnd() - 0.5) * 2 * bordZ, x = s * (PAS - BLOC / 2 - 0.55);
    if (pres(x, z, 8)) continue;
    poser(distributeurs, x, 1.0, z, 0, 0.9, 2.0, 1.1);
    const face = enseigne(rnd() < 0.5 ? 'DRINK' : 'HOT', rnd() < 0.5 ? '#e8503a' : '#2fb8c9', '#ffffff', 0.95, 'h', 0.9);
    face.position.set(x - s * 0.47, 1.25, z); face.rotation.y = s === -1 ? Math.PI / 2 : -Math.PI / 2; groupe.add(face);
  }

  // ---- caisses, barils, bennes : aux angles des rues
  const caisses = instancie(boite, std(0x6a5238), 70);
  const barils = instancie(cyl, std(0x3a4a5a, { metalness: 0.5 }), 40);
  const bennes = instancie(boite, std(0x2f5a40), 10);
  for (let bz = -GRILLE_Z; bz <= GRILLE_Z; bz++) {
    for (const s of [-1, 1]) {
      if (rnd() < 0.45) continue;
      const cx = s * (PAS - BLOC / 2 + 1.2), cz = bz * PAS + PAS / 2 + (rnd() - 0.5) * 3;
      if (pres(cx, cz, 9)) continue;
      const n = 2 + Math.floor(rnd() * 4);
      for (let i = 0; i < n; i++) {
        if (rnd() < 0.6) poser(caisses, cx + (rnd() - 0.5) * 1.6, 0.4 + (i > 2 ? 0.8 : 0), cz + (rnd() - 0.5) * 1.6, rnd() * 0.6, 0.8, 0.8, 0.8);
        else poser(barils, cx + (rnd() - 0.5) * 1.6, 0.45, cz + (rnd() - 0.5) * 1.6, 0, 0.6, 0.9, 0.6);
      }
      if (rnd() < 0.3) poser(bennes, cx + s * 1.2, 0.65, cz + 2.2, 0, 1.7, 1.3, 1.1);
    }
  }

  // ---- voitures garées le long des rues transversales
  const carrosseries = [0x3a4a5a, 0x6a2a2a, 0xd8d0c0, 0x2a2a30, 0x8a6a2a, 0x2a5a4a];
  const voitureCorps = carrosseries.map(c => instancie(boite, std(c, { metalness: 0.5, roughness: 0.4 }), 6));
  const cabines = instancie(boite, new THREE.MeshStandardMaterial({ color: 0x1a2a34, roughness: 0.2, metalness: 0.6 }), 24);
  const feux = instancie(boite, lum(0xff4030), 48);
  const roues = instancie(cyl, std(0x101214), 96);
  for (let bz = -GRILLE_Z; bz < GRILLE_Z; bz++) {
    for (const s of [-1, 1]) {
      if (rnd() < 0.5) continue;
      const x = s * (PAS + BLOC / 2 + 1.4), z = bz * PAS + PAS / 2 + (rnd() < 0.5 ? -1.6 : 1.6);
      if (pres(x, z, 10)) continue;
      const corps = voitureCorps[Math.floor(rnd() * voitureCorps.length)];
      const ry = Math.PI / 2;
      poser(corps, x, 0.62, z, ry, 4.1, 0.62, 1.8);
      poser(cabines, x - 0.2, 1.12, z, ry, 2.1, 0.5, 1.6);
      poser(feux, x - 2.06, 0.7, z - 0.55, 0, 0.06, 0.16, 0.36); poser(feux, x - 2.06, 0.7, z + 0.55, 0, 0.06, 0.16, 0.36);
      for (const [dx, dz] of [[-1.3, -0.95], [1.3, -0.95], [-1.3, 0.95], [1.3, 0.95]]) poser(roues, x + dx, 0.34, z + dz, 0, 0.68, 0.24, 0.68, Math.PI / 2);
    }
  }

  // ---- cônes et barrières : deux chantiers
  const cones = instancie(new THREE.ConeGeometry(0.22, 0.62, 10), lum(0xff7a30), 20);
  const barrieres = instancie(boite, std(0xe8e0d0), 8);
  for (const [x, z] of [[-6, 20], [7, -58]]) {
    if (pres(x, z, 10)) continue;
    for (let i = 0; i < 6; i++) poser(cones, x + (i % 3) * 1.1, 0.31, z + Math.floor(i / 3) * 3.2);
    poser(barrieres, x + 1.1, 0.7, z + 1.6, 0, 2.6, 0.18, 0.06);
    poser(barrieres, x + 1.1, 0.4, z + 1.6, 0, 2.6, 0.18, 0.06);
  }

  // ---- échafaudages : sur trois façades, une grille de tubes et de planches
  const tubes = instancie(cyl, std(0x8a8a80, { metalness: 0.6 }), 400);
  const planches = instancie(boite, std(0x7a6040), 80);
  let nbEch = 0;
  for (const b of batiments) {
    if (nbEch >= 3 || b.etage || Math.abs(b.x) > PAS * 1.5 || rnd() > 0.06) continue;
    if (portails.some(p => Math.abs(p.z - b.z) < 12)) continue;
    nbEch++;
    const face = b.x < 0 ? 1 : -1, fx = b.x + face * (b.w / 2 + 0.9);
    const H = Math.min(b.h, 14);
    for (let y = 2; y < H; y += 2.4) for (let z = b.z - b.d / 2 + 0.5; z < b.z + b.d / 2; z += 2.4) {
      poser(tubes, fx, y, z, 0, 0.06, 2.4, 0.06);
      poser(tubes, fx - face * 1.2, y, z, 0, 0.06, 2.4, 0.06);
      poser(tubes, fx - face * 0.6, y + 1.2, z, 0, 0.06, 1.3, 0.06, Math.PI / 2);
      if (rnd() < 0.7) poser(planches, fx - face * 0.6, y + 1.2, z + 1.2, 0, 1.3, 0.06, 2.4);
    }
  }

  // ---- affiches sur les murs des rues transversales
  const afficheGeo = new THREE.PlaneGeometry(1.2, 1.8);
  const afficheInst = [];
  for (let i = 0; i < 6; i++) afficheInst.push(instancie(afficheGeo, new THREE.MeshBasicMaterial({ map: texAffiche(i), toneMapped: false }), 20));
  for (const b of batiments) {
    if (b.etage || Math.abs(b.x) > PAS * 2.5 || rnd() > 0.45) continue;
    const face = rnd() < 0.5 ? 1 : -1;
    const n = 1 + Math.floor(rnd() * 3);
    for (let i = 0; i < n; i++) {
      const inst = afficheInst[Math.floor(rnd() * 6)];
      poser(inst, b.x + (rnd() - 0.5) * (b.w - 2) + i * 1.3 - n * 0.6, 1.4 + rnd() * 1.6, b.z + face * (b.d / 2 + 0.03), face === 1 ? 0 : Math.PI, 1, 1, 1, (rnd() - 0.5) * 0.08);
    }
  }

  // ---- bannières tendues au-dessus des rues transversales
  const banniereCouleurs = [0xe8503a, 0xf2d13b, 0x2fb8c9, 0xe84fd1, 0xff9a5c];
  const bannieres = banniereCouleurs.map(c => instancie(new THREE.PlaneGeometry(0.7, 1.1), new THREE.MeshStandardMaterial({ color: c, side: THREE.DoubleSide, roughness: 1 }), 24));
  for (let bz = -GRILLE_Z; bz < GRILLE_Z; bz++) {
    for (const s of [-1, 1]) {
      if (rnd() < 0.5) continue;
      const z = bz * PAS + PAS / 2, x0 = s * (PAS - BLOC / 2 + 0.3), x1 = s * (PAS + BLOC / 2 - 0.3);
      const y = 6.5 + rnd() * 3;
      for (let t = 0.12; t < 0.95; t += 0.16) {
        const inst = bannieres[Math.floor(rnd() * bannieres.length)];
        poser(inst, x0 + (x1 - x0) * t, y - Math.sin(t * Math.PI) * 0.6 - 0.55, z, 0, 1, 1, 1);
      }
    }
  }

  return { arrets, lampes };
}
