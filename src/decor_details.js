// Les détails du bâti : toits encombrés, balcons, tuyaux, vitrines, auvents,
// lianes, câbles tendus au-dessus des rues, passerelles, faisceaux.
// Chaque famille est une InstancedMesh : un seul appel de dessin.

import * as THREE from 'three';
import { vitrine as texVitrine } from './textures.js';
import { faceDe, versMonde, pointSeg, longueurSeg, yawPourX, surCap, DISTRICTS } from './plan.js';

function textureRayures(a, b) {
  const c = document.createElement('canvas'); c.width = 64; c.height = 8;
  const g = c.getContext('2d');
  for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? a : b; g.fillRect(i * 8, 0, 8, 8); }
  const t = new THREE.CanvasTexture(c); t.wrapS = THREE.RepeatWrapping; t.repeat.set(3, 1);
  t.colorSpace = THREE.SRGBColorSpace; return t;
}
function textureLianes() {
  const c = document.createElement('canvas'); c.width = 64; c.height = 128;
  const g = c.getContext('2d');
  let graine = 5; const r = () => { graine = (graine * 16807) % 2147483647; return graine / 2147483647; };
  for (let i = 0; i < 260; i++) {
    g.fillStyle = r() < 0.5 ? '#274a2a' : '#3b6a34';
    g.globalAlpha = 0.55 + r() * 0.45;
    const x = 8 + r() * 48, y = r() * 128;
    g.beginPath(); g.ellipse(x, y, 2 + r() * 3, 3 + r() * 5, r() * 3, 0, 6.28); g.fill();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function ajouterDetails(groupe, batiments, rnd, { routes, portails }) {
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), pos = new THREE.Vector3(), ech = new THREE.Vector3();
  const place = (inst, i, x, y, z, sx, sy, sz, ry = 0, rz = 0) => {
    q.setFromEuler(new THREE.Euler(0, ry, rz)); pos.set(x, y, z); ech.set(sx, sy, sz);
    m4.compose(pos, q, ech); inst.setMatrixAt(i, m4);
  };
  const instancie = (geo, mat, n) => { const im = new THREE.InstancedMesh(geo, mat, Math.max(1, n)); im.count = 0; groupe.add(im); return im; };
  const boite = new THREE.BoxGeometry(1, 1, 1);
  const acier = new THREE.MeshStandardMaterial({ color: 0x232a33, roughness: 0.85, metalness: 0.25 });
  const rouille = new THREE.MeshStandardMaterial({ color: 0x4a3a30, roughness: 0.95 });
  const sombre = new THREE.MeshStandardMaterial({ color: 0x151a20, roughness: 0.9 });
  const pres = (x, z, d) => portails.some(p => Math.hypot(p.x - x, p.z - z) < d);
  const surRue = batiments.filter(b => !b.etage && b.rue < 7 && b.forme !== 'cylindre');

  // toits : climatiseurs, réservoirs, antennes
  const toits = instancie(boite, acier, batiments.length * 3);
  const antennes = instancie(boite, sombre, batiments.length);
  for (const b of batiments) {
    const k = 1 + Math.floor(rnd() * 3);
    const y = (b.y0 || 0) + b.h;
    for (let i = 0; i < k; i++) {
      const sx = 0.8 + rnd() * 1.6, sy = 0.6 + rnd() * 1.2, sz = 0.8 + rnd() * 1.6;
      const o = versMonde(b, (rnd() - 0.5) * Math.max(0, b.w - sx - 0.4), (rnd() - 0.5) * Math.max(0, b.d - sz - 0.4));
      place(toits, toits.count++, o.x, y + sy / 2, o.z, sx, sy, sz, b.rot);
    }
    if (b.h > 12 && rnd() < 0.6) { const o = versMonde(b, (rnd() - 0.5) * (b.w - 1), (rnd() - 0.5) * (b.d - 1)); place(antennes, antennes.count++, o.x, y + 2.2, o.z, 0.12, 4.4, 0.12); }
  }

  // balcons et garde-corps sur les faces qui donnent sur la rue ; tuyaux le long des façades
  const balcons = instancie(boite, acier, surRue.length * 8);
  const gardes = instancie(boite, sombre, surRue.length * 8);
  const tuyaux = instancie(boite, rouille, batiments.length * 2);
  for (const b of surRue) {
    if (b.h <= 6) continue;
    const f = faceDe(b, b.face.x, b.face.z);
    const ry = yawPourX(f.nx, f.nz);
    for (let y = 3.2; y < b.h - 1.5; y += 3.2) {
      if (rnd() < 0.35) continue;
      const u = (rnd() - 0.5) * Math.max(0, f.len - 2.6);
      place(balcons, balcons.count++, f.x + f.nx * 0.45 + f.tx * u, y, f.z + f.nz * 0.45 + f.tz * u, 0.9, 0.14, 2.2, ry);
      place(gardes, gardes.count++, f.x + f.nx * 0.87 + f.tx * u, y + 0.42, f.z + f.nz * 0.87 + f.tz * u, 0.06, 0.7, 2.2, ry);
    }
  }
  for (const b of batiments) {
    if (b.forme === 'cylindre') continue;
    const nT = rnd() < 0.5 ? 1 : 2;
    for (let i = 0; i < nT; i++) {
      const a = rnd() * 6.28;
      const f = faceDe(b, Math.sin(a), Math.cos(a));
      const u = (rnd() - 0.5) * Math.max(0, f.len - 1);
      place(tuyaux, tuyaux.count++, f.x + f.nx * 0.12 + f.tx * u, (b.y0 || 0) + b.h * 0.48, f.z + f.nz * 0.12 + f.tz * u, 0.18, b.h * 0.96, 0.18);
    }
  }

  // vitrines et auvents au rez-de-chaussée, sur les faces qui donnent sur la rue
  const vitrineCouleurs = [['#2fd6c9', 'RAMEN'], ['#ff9a5c', 'BAR'], ['#e84fd1', 'KARAOKE'], ['#f2d13b', 'MARKET'], ['#5aa9e6', 'PHARMA'], ['#9b7cff', 'CAFE']];
  const auvent = new THREE.MeshStandardMaterial({ map: textureRayures('#d9552f', '#f3e2b3'), roughness: 0.9 });
  const auvent2 = new THREE.MeshStandardMaterial({ map: textureRayures('#1f6f78', '#e8eef2'), roughness: 0.9 });
  const plan = new THREE.PlaneGeometry(1, 1);
  const vitrineInst = vitrineCouleurs.map(([c, mot]) => instancie(plan, new THREE.MeshBasicMaterial({ map: texVitrine(c, mot), toneMapped: false, side: THREE.DoubleSide }), 60));
  const auventGeo = new THREE.BoxGeometry(1.3, 0.08, 1);
  const auventInst = [instancie(auventGeo, auvent, 90), instancie(auventGeo, auvent2, 90)];
  let lampes = 0;
  for (const b of surRue) {
    if (pres(b.x, b.z, 16) || rnd() < 0.25) continue;
    const f = faceDe(b, b.face.x, b.face.z);
    const nV = f.len > 8 ? 1 + Math.floor(rnd() * 2) : 1;
    for (let i = 0; i < nV; i++) {
      const w = Math.min(f.len - 1, 3.2 + rnd() * 1.2), u = (i - (nV - 1) / 2) * 4.4;
      const vi = vitrineInst[Math.floor(rnd() * vitrineInst.length)];
      if (vi.count < 60) place(vi, vi.count++, f.x + f.nx * 0.06 + f.tx * u, 1.35, f.z + f.nz * 0.06 + f.tz * u, w, w / 2, 1, f.yaw);
      const ai = auventInst[rnd() < 0.55 ? 0 : 1];
      if (ai.count < 90) place(ai, ai.count++, f.x + f.nx * 0.7 + f.tx * u, 2.75, f.z + f.nz * 0.7 + f.tz * u, 1, 1, w + 0.4, yawPourX(f.nx, f.nz), -0.32);
      if (lampes < 6 && rnd() < 0.2) {
        lampes++;
        const l = new THREE.PointLight(0xffb070, 5, 10, 2);
        l.position.set(f.x + f.nx * 1.2 + f.tx * u, 2.2, f.z + f.nz * 1.2 + f.tz * u);
        groupe.add(l);
      }
    }
  }

  // lianes : des plaques de végétation accrochées aux façades basses
  const lianeMat = new THREE.MeshBasicMaterial({ map: textureLianes(), transparent: true, alphaTest: 0.2, side: THREE.DoubleSide });
  const lianes = instancie(new THREE.PlaneGeometry(1.6, 3.2), lianeMat, 120);
  for (const b of batiments) {
    if (rnd() > 0.26 || b.etage || b.forme === 'cylindre' || lianes.count >= 120) continue;
    const a = rnd() * 6.28;
    const f = faceDe(b, Math.sin(a), Math.cos(a));
    const u = (rnd() - 0.5) * Math.max(0, f.len - 2);
    place(lianes, lianes.count++, f.x + f.nx * 0.05 + f.tx * u, 2.2 + rnd() * Math.max(1, b.h - 4), f.z + f.nz * 0.05 + f.tz * u, 1, 1 + rnd(), 1, f.yaw);
  }

  // câbles : des caténaires tendues d'une façade à l'autre au-dessus des rues, avec des lanternes
  const cablePts = [], lanternes = [];
  const tendre = (p0, p1, sag, N, lanterne) => {
    for (let k = 0; k < N; k++) {
      const t0 = k / N, t1 = (k + 1) / N;
      const q0 = p0.clone().lerp(p1, t0); q0.y -= sag * Math.sin(t0 * Math.PI);
      const q1 = p0.clone().lerp(p1, t1); q1.y -= sag * Math.sin(t1 * Math.PI);
      cablePts.push(q0.x, q0.y, q0.z, q1.x, q1.y, q1.z);
      if (lanterne && k === Math.floor(N / 2)) lanternes.push(q0);
    }
  };
  for (const s of routes) {
    if (s.type === 'anneau') continue;
    const L = longueurSeg(s);
    for (let d = 10; d < L - 8; d += 14) {
      if (rnd() < 0.3) continue;
      const p = pointSeg(s, d);
      let g = null, dr = null, bg = 1e9, bdr = 1e9;
      for (const b of surRue) {
        const dx = b.x - p.x, dz = b.z - p.z, dist = Math.hypot(dx, dz);
        if (dist > 16) continue;
        const cote = dx * p.nx + dz * p.nz;
        if (cote > 0 && dist < bg) { bg = dist; g = b; } else if (cote < 0 && dist < bdr) { bdr = dist; dr = b; }
      }
      if (!g || !dr) continue;
      const fg = faceDe(g, p.x - g.x, p.z - g.z), fd = faceDe(dr, p.x - dr.x, p.z - dr.z);
      const p0 = new THREE.Vector3(fg.x, Math.min(g.h, 16) * (0.6 + rnd() * 0.35), fg.z), p1 = new THREE.Vector3(fd.x, Math.min(dr.h, 16) * (0.6 + rnd() * 0.35), fd.z);
      tendre(p0, p1, 1.2 + rnd() * 1.6, 10, rnd() < 0.55);
    }
  }
  for (let i = 0; i < 50; i++) {
    const a = batiments[Math.floor(rnd() * batiments.length)];
    const c = batiments.find(b => b !== a && !b.etage && Math.hypot(b.x - a.x, b.z - a.z) > 8 && Math.hypot(b.x - a.x, b.z - a.z) < 20);
    if (!a || !c || a.etage) continue;
    const fa = faceDe(a, c.x - a.x, c.z - a.z), fc = faceDe(c, a.x - c.x, a.z - c.z);
    const y = Math.min(a.h, c.h) * 0.8;
    tendre(new THREE.Vector3(fa.x, y, fa.z), new THREE.Vector3(fc.x, y, fc.z), 0.8 + rnd(), 8, false);
  }
  const cg = new THREE.BufferGeometry();
  cg.setAttribute('position', new THREE.Float32BufferAttribute(cablePts, 3));
  groupe.add(new THREE.LineSegments(cg, new THREE.LineBasicMaterial({ color: 0x4a5160 })));
  const lant = instancie(new THREE.BoxGeometry(0.34, 0.5, 0.34), new THREE.MeshBasicMaterial({ color: 0xffb466, toneMapped: false }), lanternes.length);
  lanternes.forEach((p, i) => place(lant, i, p.x, p.y - 0.4, p.z, 1, 1, 1));
  lant.count = lanternes.length;
  const lantLum = [];
  for (const p of lanternes.slice(0, 5)) { const l = new THREE.PointLight(0xffb466, 3, 10, 2); l.position.set(p.x, p.y - 0.4, p.z); groupe.add(l); lantLum.push(l); }

  // passerelles : des ponts piétons qui traversent les avenues à mi-hauteur
  const tablier = new THREE.MeshStandardMaterial({ color: 0x2a3038, roughness: 0.8, metalness: 0.3 });
  const liseré = new THREE.MeshBasicMaterial({ color: 0x1f8f8a, toneMapped: false });
  DISTRICTS.forEach((d, i) => {
    const r = i % 2 ? 44 : 58, y = 6.5 + (i % 3 ? 0 : 2.5);
    const c = surCap(d.theta, r), L = 17;
    const t = new THREE.Mesh(new THREE.BoxGeometry(L, 0.22, 2.6), tablier); t.position.set(c.x, y, c.z); t.rotation.y = d.theta; groupe.add(t);
    for (const s of [-1, 1]) {
      const o = surCap(d.theta, r + s * 1.27);
      const g = new THREE.Mesh(new THREE.BoxGeometry(L, 0.9, 0.06), acier); g.position.set(o.x, y + 0.55, o.z); g.rotation.y = d.theta; groupe.add(g);
      const l = new THREE.Mesh(new THREE.BoxGeometry(L, 0.05, 0.05), liseré); l.position.set(o.x, y + 1.0, o.z); l.rotation.y = d.theta; groupe.add(l);
    }
    for (const s of [-1, 1]) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.3, y, 0.3), acier);
      m.position.set(c.x + Math.cos(d.theta) * s * 7.9, y / 2, c.z - Math.sin(d.theta) * s * 7.9); groupe.add(m);
    }
  });

  // faisceaux de lumière : quelques cônes additifs, comme des projecteurs dans la brume
  const faisceaux = [];
  const faisceauMat = (col) => new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.09, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false, toneMapped: false });
  for (const [x, z, col] of [[-50, 40, 0xffc080], [62, -30, 0x8fd6ff], [-30, -86, 0xffa8c0], [40, 70, 0x9fe0c0]]) {
    const f = new THREE.Mesh(new THREE.ConeGeometry(9, 42, 18, 1, true), faisceauMat(col));
    f.position.set(x, 24, z); f.rotation.z = (x < 0 ? -1 : 1) * 0.55; f.rotation.x = 0.35;
    groupe.add(f); faisceaux.push(f);
  }

  return {
    animer(t) {
      for (let i = 0; i < lantLum.length; i++) lantLum[i].intensity = 2.6 + Math.sin(t * 3 + i) * 0.5;
      for (let i = 0; i < faisceaux.length; i++) faisceaux[i].rotation.y = Math.sin(t * 0.25 + i) * 0.35;
    },
  };
}
