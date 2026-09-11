// Le mobilier urbain : lampadaires, poubelles, bancs, bornes, abribus,
// distributeurs, caisses et barils, voitures garées, bennes, cônes, échafaudages,
// affiches, bannières. Tout est instancié par famille et posé le long des rues.

import * as THREE from 'three';
import { affiche as texAffiche } from './textures.js';
import { enseigne } from './enseignes.js';
import { pointSeg, longueurSeg, faceDe, yawPourX, yawPourZ, ANNEAU } from './plan.js';

export function ajouterMobilier(groupe, rnd, { routes, portails, batiments }) {
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
  const pres = (x, z, d = 6) => portails.some(p => Math.hypot(p.x - x, p.z - z) < d);
  const avenues = routes.filter(s => s.type === 'avenue'), rues = routes.filter(s => s.type === 'rue'), anneaux = routes.filter(s => s.type === 'anneau');
  // un point au hasard sur un trottoir : segment tiré au poids de sa longueur, côté au hasard
  const tirage = (liste, marge = 1.3) => {
    const total = liste.reduce((a, s) => a + longueurSeg(s), 0);
    let u = rnd() * total;
    for (const s of liste) { const L = longueurSeg(s); if (u < L) { const c = rnd() < 0.5 ? -1 : 1; return { ...pointSeg(s, u, c * (s.w / 2 + marge)), s, c }; } u -= L; }
    return null;
  };

  // ---- lampadaires : mât, potence, tête lumineuse, tournés vers la chaussée
  const mats = instancie(cyl, std(0x3a3f46, { metalness: 0.5 }), 160);
  const potences = instancie(boite, std(0x3a3f46, { metalness: 0.5 }), 160);
  const tetes = instancie(boite, lum(0xffd9a0), 160);
  const lampes = [];
  for (const s of routes) {
    const L = longueurSeg(s), pas = s.type === 'rue' ? 22 : 16;
    for (let d = 8; d < L - 2; d += pas) {
      for (const c of (s.type === 'rue' ? [1] : [-1, 1])) {
        const p = pointSeg(s, d, c * (s.w / 2 + 2.2));
        const ix = -c * p.nx, iz = -c * p.nz;              // vers la chaussée
        poser(mats, p.x, 2.6, p.z, 0, 0.16, 5.2, 0.16);
        poser(potences, p.x + ix * 0.7, 5.15, p.z + iz * 0.7, yawPourX(ix, iz), 1.5, 0.12, 0.12);
        poser(tetes, p.x + ix * 1.35, 5.05, p.z + iz * 1.35, yawPourX(ix, iz), 0.7, 0.16, 0.34);
        lampes.push({ x: p.x + ix * 1.35, z: p.z + iz * 1.35 });
      }
    }
  }
  for (const l of lampes.filter(l => Math.hypot(l.x, l.z) < 44 || pres(l.x, l.z, 14)).slice(0, 8)) {
    const p = new THREE.PointLight(0xffc890, 6, 14, 1.8); p.position.set(l.x, 4.8, l.z); groupe.add(p);
  }

  // ---- bornes le long des avenues, poubelles et bancs sur les trottoirs
  const bornes = instancie(cyl, std(0x4a4f57, { metalness: 0.4 }), 300);
  for (const s of avenues) {
    const L = longueurSeg(s);
    for (let d = 3; d < L - 2; d += 4.2) for (const c of [-1, 1]) {
      const p = pointSeg(s, d, c * (s.w / 2 + 0.55));
      if (!pres(p.x, p.z, 6)) poser(bornes, p.x, 0.45, p.z, 0, 0.22, 0.75, 0.22);
    }
  }
  const poubelles = instancie(cyl, std(0x2e4a3a), 60);
  const couvercles = instancie(cyl, std(0x1e2a24), 60);
  const bancs = instancie(boite, std(0x5a4636), 60);
  const piedsBanc = instancie(boite, std(0x2a2e34, { metalness: 0.5 }), 60);
  for (let i = 0; i < 56; i++) {
    const p = tirage(routes, 1.2 + rnd() * 1.2); if (!p || pres(p.x, p.z, 7)) continue;
    poser(poubelles, p.x, 0.5, p.z, 0, 0.6, 0.95, 0.6);
    poser(couvercles, p.x, 1.0, p.z, 0, 0.66, 0.08, 0.66);
  }
  for (let i = 0; i < 28; i++) {
    const p = tirage(avenues.concat(anneaux), 1.8); if (!p || pres(p.x, p.z, 8)) continue;
    const ox = p.c * p.nx, oz = p.c * p.nz;                    // vers l'extérieur du trottoir
    poser(bancs, p.x, 0.55, p.z, p.ang, 0.5, 0.08, 1.8);
    poser(bancs, p.x + ox * 0.28, 0.85, p.z + oz * 0.28, p.ang, 0.08, 0.5, 1.8, p.c * 0.2);
    poser(piedsBanc, p.x + p.dx * 0.7, 0.27, p.z + p.dz * 0.7, p.ang, 0.5, 0.5, 0.08);
    poser(piedsBanc, p.x - p.dx * 0.7, 0.27, p.z - p.dz * 0.7, p.ang, 0.5, 0.5, 0.08);
  }

  // ---- abribus : sur l'anneau intérieur, entre les avenues
  const arrets = [];
  const poteaux = instancie(boite, std(0x2b3138, { metalness: 0.5 }), 16);
  const toitsAbri = instancie(boite, std(0x1f2429, { metalness: 0.3 }), 8);
  const vitres = instancie(boite, new THREE.MeshStandardMaterial({ color: 0x7fb8c8, transparent: true, opacity: 0.32, roughness: 0.1, metalness: 0.4 }), 8);
  const bancsAbri = instancie(boite, std(0x4a3a2c), 8);
  const interieur = anneaux.filter(s => s.anneau === ANNEAU);
  for (let k = 0; k < 7; k++) {
    const s = interieur[Math.floor((k + 0.5) / 7 * interieur.length)];
    const L = longueurSeg(s);
    const cand = [1, -1].map(c => pointSeg(s, L / 2, c * (s.w / 2 + 1.4)));
    const p = Math.hypot(cand[0].x, cand[0].z) > Math.hypot(cand[1].x, cand[1].z) ? cand[0] : cand[1];
    if (pres(p.x, p.z, 12)) continue;
    const ox = p.x / Math.hypot(p.x, p.z), oz = p.z / Math.hypot(p.x, p.z);   // vers l'extérieur
    const tx = p.dx, tz = p.dz;
    const ry = yawPourX(ox, oz);
    poser(poteaux, p.x + tx * 1.6, 1.35, p.z + tz * 1.6, ry, 0.12, 2.7, 0.12);
    poser(poteaux, p.x - tx * 1.6, 1.35, p.z - tz * 1.6, ry, 0.12, 2.7, 0.12);
    poser(toitsAbri, p.x, 2.75, p.z, ry, 2.2, 0.12, 3.8);
    poser(vitres, p.x + ox * 0.95, 1.4, p.z + oz * 0.95, ry, 0.06, 2.5, 3.6);
    poser(bancsAbri, p.x + ox * 0.55, 0.5, p.z + oz * 0.55, ry, 0.5, 0.08, 2.8);
    const panneau = enseigne(`ARRET ${3 + k * 4}`, '#0f1a2a', '#8fd6ff', 1.3, 'h', 0.9);
    panneau.position.set(p.x - ox * 0.6 - tx * 1.75, 2.2, p.z - oz * 0.6 - tz * 1.75); panneau.rotation.y = yawPourZ(tx, tz); groupe.add(panneau);
    arrets.push({ x: p.x - ox * 0.3, z: p.z - oz * 0.3, cap: Math.atan2(ox, oz) });
  }

  // ---- distributeurs automatiques : boîtes lumineuses contre les façades
  const distributeurs = instancie(boite, std(0x1a2028), 12);
  const candidats = batiments.filter(b => !b.etage && b.rue < 7 && b.forme !== 'cylindre');
  for (let i = 0; i < 12; i++) {
    const b = candidats[Math.floor(rnd() * candidats.length)]; if (!b) continue;
    const f = faceDe(b, b.face.x, b.face.z);
    const u = (rnd() - 0.5) * Math.max(0, f.len - 3);
    const x = f.x + f.nx * 0.55 + f.tx * u, z = f.z + f.nz * 0.55 + f.tz * u;
    if (pres(x, z, 8)) continue;
    poser(distributeurs, x, 1.0, z, yawPourX(f.nx, f.nz), 0.9, 2.0, 1.1);
    const face = enseigne(rnd() < 0.5 ? 'DRINK' : 'HOT', rnd() < 0.5 ? '#e8503a' : '#2fb8c9', '#ffffff', 0.95, 'h', 0.9);
    face.position.set(x + f.nx * 0.47, 1.25, z + f.nz * 0.47); face.rotation.y = f.yaw; groupe.add(face);
  }

  // ---- caisses, barils, bennes : aux pieds des façades, près des coins
  const caisses = instancie(boite, std(0x6a5238), 90);
  const barils = instancie(cyl, std(0x3a4a5a, { metalness: 0.5 }), 50);
  const bennes = instancie(boite, std(0x2f5a40), 14);
  for (const b of candidats) {
    if (rnd() > 0.22) continue;
    const f = faceDe(b, b.face.x, b.face.z);
    const u = (rnd() < 0.5 ? -1 : 1) * (f.len / 2 - 1.2);
    const cx = f.x + f.nx * 1.3 + f.tx * u, cz = f.z + f.nz * 1.3 + f.tz * u;
    if (pres(cx, cz, 9)) continue;
    const n = 2 + Math.floor(rnd() * 4);
    for (let i = 0; i < n; i++) {
      if (rnd() < 0.6) poser(caisses, cx + (rnd() - 0.5) * 1.6, 0.4 + (i > 2 ? 0.8 : 0), cz + (rnd() - 0.5) * 1.6, rnd() * 0.6, 0.8, 0.8, 0.8);
      else poser(barils, cx + (rnd() - 0.5) * 1.6, 0.45, cz + (rnd() - 0.5) * 1.6, 0, 0.6, 0.9, 0.6);
    }
    if (rnd() < 0.3) poser(bennes, cx + f.tx * 2.2, 0.65, cz + f.tz * 2.2, f.yaw, 1.1, 1.3, 1.7);
  }

  // ---- voitures garées le long des rues et sur les files latérales des avenues
  const carrosseries = [0x3a4a5a, 0x6a2a2a, 0xd8d0c0, 0x2a2a30, 0x8a6a2a, 0x2a5a4a];
  const voitureCorps = carrosseries.map(c => instancie(boite, std(c, { metalness: 0.5, roughness: 0.4 }), 14));
  const cabines = instancie(boite, new THREE.MeshStandardMaterial({ color: 0x1a2a34, roughness: 0.2, metalness: 0.6 }), 80);
  const feux = instancie(boite, lum(0xff4030), 160);
  const roueGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.24, 12); roueGeo.rotateX(Math.PI / 2);
  const roues = instancie(roueGeo, std(0x101214), 320);
  const garer = (p, sens) => {
    const dx = p.dx * sens, dz = p.dz * sens, ry = yawPourX(dx, dz);
    const corps = voitureCorps[Math.floor(rnd() * voitureCorps.length)];
    poser(corps, p.x, 0.62, p.z, ry, 4.1, 0.62, 1.8);
    poser(cabines, p.x - dx * 0.2, 1.12, p.z - dz * 0.2, ry, 2.1, 0.5, 1.6);
    for (const c of [-0.55, 0.55]) poser(feux, p.x - dx * 2.06 + p.nx * c, 0.7, p.z - dz * 2.06 + p.nz * c, ry, 0.06, 0.16, 0.36);
    for (const [a, c] of [[-1.3, -0.95], [1.3, -0.95], [-1.3, 0.95], [1.3, 0.95]]) poser(roues, p.x + dx * a + p.nx * c, 0.34, p.z + dz * a + p.nz * c, ry);
  };
  for (const s of rues) {
    const L = longueurSeg(s);
    for (let d = 6; d < L - 4; d += 9) for (const c of [-1, 1]) {
      if (rnd() > 0.4) continue;
      const p = pointSeg(s, d, c * 2.3); if (pres(p.x, p.z, 10)) continue;
      garer(p, c);
    }
  }
  for (const s of avenues) {
    const L = longueurSeg(s);
    for (let d = 10; d < L - 8; d += 11) for (const c of [-1, 1]) {
      if (rnd() > 0.35) continue;
      const p = pointSeg(s, d, c * 5.6); if (pres(p.x, p.z, 12)) continue;
      garer(p, c);
    }
  }

  // ---- cônes et barrières : deux chantiers
  const cones = instancie(new THREE.ConeGeometry(0.22, 0.62, 10), lum(0xff7a30), 20);
  const barrieres = instancie(boite, std(0xe8e0d0), 8);
  for (let k = 0; k < 2; k++) {
    const p = tirage(rues, -1.5); if (!p || pres(p.x, p.z, 10)) continue;
    for (let i = 0; i < 6; i++) poser(cones, p.x + p.dx * (i % 3) * 1.1 + p.nx * Math.floor(i / 3) * 2.2, 0.31, p.z + p.dz * (i % 3) * 1.1 + p.nz * Math.floor(i / 3) * 2.2);
    poser(barrieres, p.x + p.dx * 1.1 + p.nx * 1.1, 0.7, p.z + p.dz * 1.1 + p.nz * 1.1, p.ang, 0.06, 0.18, 2.6);
    poser(barrieres, p.x + p.dx * 1.1 + p.nx * 1.1, 0.4, p.z + p.dz * 1.1 + p.nz * 1.1, p.ang, 0.06, 0.18, 2.6);
  }

  // ---- échafaudages : sur trois façades, une grille de tubes et de planches
  const tubes = instancie(cyl, std(0x8a8a80, { metalness: 0.6 }), 400);
  const planches = instancie(boite, std(0x7a6040), 80);
  let nbEch = 0;
  for (const b of candidats) {
    if (nbEch >= 3 || rnd() > 0.05 || b.h < 8) continue;
    const f = faceDe(b, b.face.x, b.face.z);
    if (pres(f.x, f.z, 14)) continue;
    nbEch++;
    const H = Math.min(b.h, 14);
    for (let y = 2; y < H; y += 2.4) for (let u = -f.len / 2 + 0.5; u < f.len / 2; u += 2.4) {
      const x = f.x + f.tx * u, z = f.z + f.tz * u;
      poser(tubes, x + f.nx * 0.9, y, z + f.nz * 0.9, 0, 0.06, 2.4, 0.06);
      poser(tubes, x + f.nx * 0.2, y, z + f.nz * 0.2, 0, 0.06, 2.4, 0.06);
      poser(tubes, x + f.nx * 0.55, y + 1.2, z + f.nz * 0.55, yawPourX(f.nx, f.nz), 0.06, 1.3, 0.06, Math.PI / 2);
      if (rnd() < 0.7) poser(planches, x + f.nx * 0.55 + f.tx * 1.2, y + 1.2, z + f.nz * 0.55 + f.tz * 1.2, yawPourX(f.nx, f.nz), 1.3, 0.06, 2.4);
    }
  }

  // ---- affiches sur les murs
  const afficheGeo = new THREE.PlaneGeometry(1.2, 1.8);
  const afficheInst = [];
  for (let i = 0; i < 6; i++) afficheInst.push(instancie(afficheGeo, new THREE.MeshBasicMaterial({ map: texAffiche(i), toneMapped: false }), 30));
  for (const b of batiments) {
    if (b.etage || b.rue > 10 || b.forme === 'cylindre' || rnd() > 0.4) continue;
    const f = faceDe(b, b.face.x, b.face.z);
    const n = 1 + Math.floor(rnd() * 3);
    for (let i = 0; i < n; i++) {
      const inst = afficheInst[Math.floor(rnd() * 6)];
      const u = (rnd() - 0.5) * Math.max(0, f.len - 2) + (i - (n - 1) / 2) * 1.3;
      poser(inst, f.x + f.nx * 0.03 + f.tx * u, 1.4 + rnd() * 1.6, f.z + f.nz * 0.03 + f.tz * u, f.yaw, 1, 1, 1, (rnd() - 0.5) * 0.08);
    }
  }

  // ---- bannières tendues en travers des rues secondaires
  const banniereCouleurs = [0xe8503a, 0xf2d13b, 0x2fb8c9, 0xe84fd1, 0xff9a5c];
  const bannieres = banniereCouleurs.map(c => instancie(new THREE.PlaneGeometry(0.7, 1.1), new THREE.MeshStandardMaterial({ color: c, side: THREE.DoubleSide, roughness: 1 }), 40));
  for (const s of rues) {
    const L = longueurSeg(s);
    for (let d = 12; d < L - 6; d += 22) {
      if (rnd() < 0.4) continue;
      const y = 6.5 + rnd() * 3;
      for (let t = -0.44; t <= 0.45; t += 0.16) {
        const p = pointSeg(s, d, t * (s.w + 1.4));
        const inst = bannieres[Math.floor(rnd() * bannieres.length)];
        poser(inst, p.x, y - Math.cos(t * Math.PI) * 0.6 - 0.55, p.z, p.ang + Math.PI / 2);
      }
    }
  }

  return { arrets, lampes };
}
