// Le décor : tout ce qui donne à la ville sa densité — toits encombrés, balcons,
// tuyaux, câbles, passerelles, vitrines, auvents, lianes, faisceaux, et le ciel.
// Chaque famille de détails est une InstancedMesh : un seul appel de dessin.

import * as THREE from 'three';
import { vitrine as texVitrine } from './textures.js';

// ---------------------------------------------------------------- ciel
// Un dôme avec une texture peinte : nuit au zénith, lueur chaude de fin de
// journée d'un côté, brume teal de l'autre, silhouettes lointaines à l'horizon.
export function construireCiel(scene) {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 512;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, '#141a36'); grad.addColorStop(0.30, '#2c2856');
  grad.addColorStop(0.46, '#6e3c62'); grad.addColorStop(0.52, '#4e3450'); grad.addColorStop(1, '#2a2232');
  g.fillStyle = grad; g.fillRect(0, 0, 1024, 512);

  const chaud = g.createRadialGradient(760, 262, 6, 760, 262, 460);
  chaud.addColorStop(0, 'rgba(255,190,120,1)'); chaud.addColorStop(0.16, 'rgba(255,130,110,0.75)');
  chaud.addColorStop(0.5, 'rgba(180,80,120,0.30)'); chaud.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = chaud; g.fillRect(0, 0, 1024, 512);

  const froid = g.createRadialGradient(230, 300, 6, 230, 300, 400);
  froid.addColorStop(0, 'rgba(50,140,150,0.45)'); froid.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = froid; g.fillRect(0, 0, 1024, 512);

  // silhouettes : des tours sombres tout le long de l'horizon, quelques fenêtres
  let graine = 11; const r = () => { graine = (graine * 16807) % 2147483647; return graine / 2147483647; };
  for (let x = 0; x < 1024;) {
    const w = 6 + r() * 26, h = 12 + r() * 70;
    g.fillStyle = '#231a30'; g.fillRect(x, 258 - h, w, h + 80);
    for (let y = 262 - h; y < 256; y += 5) if (r() < 0.16) { g.fillStyle = r() < 0.5 ? '#ff9a5c' : '#46e6c8'; g.globalAlpha = 0.5 + r() * 0.5; g.fillRect(x + 2 + r() * (w - 4), y, 1.5, 2); g.globalAlpha = 1; }
    x += w + r() * 14;
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const dome = new THREE.Mesh(new THREE.SphereGeometry(420, 48, 24),
    new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, fog: false, toneMapped: false }));
  dome.rotation.y = Math.PI * 0.35;      // la lueur chaude au nord-ouest, devant le joueur
  scene.add(dome);
  return dome;
}

// ---------------------------------------------------------------- textures
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

// ---------------------------------------------------------------- détails
// batiments : [{x, z, w, d, h, accent, cote}] · portails : [{x, z, cote, bz}] · rnd : générateur
export function ajouterDetails(groupe, batiments, rnd, { PAS, BLOC, GRILLE_Z, portails }) {
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), pos = new THREE.Vector3(), ech = new THREE.Vector3();
  const place = (inst, i, x, y, z, sx, sy, sz, ry = 0) => {
    q.setFromEuler(new THREE.Euler(0, ry, 0)); pos.set(x, y, z); ech.set(sx, sy, sz);
    m4.compose(pos, q, ech); inst.setMatrixAt(i, m4);
  };
  const instancie = (geo, mat, n) => { const im = new THREE.InstancedMesh(geo, mat, Math.max(1, n)); im.count = 0; groupe.add(im); return im; };
  const boite = new THREE.BoxGeometry(1, 1, 1);
  const acier = new THREE.MeshStandardMaterial({ color: 0x232a33, roughness: 0.85, metalness: 0.25 });
  const rouille = new THREE.MeshStandardMaterial({ color: 0x4a3a30, roughness: 0.95 });
  const sombre = new THREE.MeshStandardMaterial({ color: 0x151a20, roughness: 0.9 });

  // toits : climatiseurs, réservoirs, antennes
  const toits = instancie(boite, acier, batiments.length * 3);
  const antennes = instancie(boite, sombre, batiments.length);
  for (const b of batiments) {
    const k = 1 + Math.floor(rnd() * 3);
    for (let i = 0; i < k; i++) {
      const sx = 0.8 + rnd() * 1.6, sy = 0.6 + rnd() * 1.2, sz = 0.8 + rnd() * 1.6;
      place(toits, toits.count++, b.x + (rnd() - 0.5) * (b.w - sx - 0.4), b.h + sy / 2, b.z + (rnd() - 0.5) * (b.d - sz - 0.4), sx, sy, sz);
    }
    if (b.h > 12 && rnd() < 0.6) place(antennes, antennes.count++, b.x + (rnd() - 0.5) * (b.w - 1), b.h + 2.2, b.z + (rnd() - 0.5) * (b.d - 1), 0.12, 4.4, 0.12);
  }

  // balcons et garde-corps sur les faces qui donnent sur l'avenue ; tuyaux le long des façades
  const balcons = instancie(boite, acier, batiments.length * 8);
  const gardes = instancie(boite, sombre, batiments.length * 8);
  const tuyaux = instancie(boite, rouille, batiments.length * 2);
  for (const b of batiments) {
    const surAvenue = Math.abs(b.x) < PAS * 1.5;
    if (surAvenue && b.h > 6) {
      const face = b.x < 0 ? 1 : -1;
      const fx = b.x + face * (b.w / 2 + 0.45);
      for (let y = 3.2; y < b.h - 1.5; y += 3.2) {
        if (rnd() < 0.35) continue;
        const z = b.z + (rnd() - 0.5) * (b.d - 2.6);
        place(balcons, balcons.count++, fx, y, z, 0.9, 0.14, 2.2);
        place(gardes, gardes.count++, fx + face * 0.42, y + 0.42, z, 0.06, 0.7, 2.2);
      }
    }
    const nT = rnd() < 0.5 ? 1 : 2;
    for (let i = 0; i < nT; i++) {
      const face = rnd() < 0.5 ? 1 : -1;
      const enX = rnd() < 0.5;
      if (enX) place(tuyaux, tuyaux.count++, b.x + face * (b.w / 2 + 0.12), b.h * 0.48, b.z + (rnd() - 0.5) * (b.d - 1), 0.18, b.h * 0.96, 0.18);
      else place(tuyaux, tuyaux.count++, b.x + (rnd() - 0.5) * (b.w - 1), b.h * 0.48, b.z + face * (b.d / 2 + 0.12), 0.18, b.h * 0.96, 0.18);
    }
  }

  // étages en retrait sur les grands immeubles : la silhouette monte par paliers
  // (ils sont ajoutés à `batiments` par l'appelant ; ici on ne fait que le mobilier)

  // vitrines et auvents au rez-de-chaussée, côté avenue
  const vitrineCouleurs = [['#2fd6c9', 'RAMEN'], ['#ff9a5c', 'BAR'], ['#e84fd1', 'KARAOKE'], ['#f2d13b', 'MARKET'], ['#5aa9e6', 'PHARMA'], ['#9b7cff', 'CAFE']];
  const auvent = new THREE.MeshStandardMaterial({ map: textureRayures('#d9552f', '#f3e2b3'), roughness: 0.9 });
  const auvent2 = new THREE.MeshStandardMaterial({ map: textureRayures('#1f6f78', '#e8eef2'), roughness: 0.9 });
  // Vitrines et auvents sont instanciés par couleur : sept appels de dessin au lieu de cent.
  const plan = new THREE.PlaneGeometry(1, 1);
  const vitrineInst = vitrineCouleurs.map(([c, mot]) => instancie(plan, new THREE.MeshBasicMaterial({ map: texVitrine(c, mot), toneMapped: false, side: THREE.DoubleSide }), 40));
  const auventGeo = new THREE.BoxGeometry(1.3, 0.08, 1);
  const auventInst = [instancie(auventGeo, auvent, 60), instancie(auventGeo, auvent2, 60)];
  const placeIncline = (inst, i, x, y, z, sx, sy, sz, ry, rz) => {
    q.setFromEuler(new THREE.Euler(0, ry, rz)); pos.set(x, y, z); ech.set(sx, sy, sz);
    m4.compose(pos, q, ech); inst.setMatrixAt(i, m4);
  };
  let lampes = 0;
  for (const b of batiments) {
    if (Math.abs(b.x) > PAS * 1.5 || b.etage) continue;
    if (portails.some(p => Math.abs(p.z - b.z) < 9 && Math.sign(p.cote) === Math.sign(b.x))) continue;
    const face = b.x < 0 ? 1 : -1;
    const nV = 1 + Math.floor(rnd() * 2);
    for (let i = 0; i < nV; i++) {
      const w = 3.2 + rnd() * 1.2, z = b.z + (i - (nV - 1) / 2) * 4.4;
      const vi = vitrineInst[Math.floor(rnd() * vitrineInst.length)];
      if (vi.count < 40) place(vi, vi.count++, b.x + face * (b.w / 2 + 0.06), 1.35, z, w, w / 2, 1, face === 1 ? Math.PI / 2 : -Math.PI / 2);
      const ai = auventInst[rnd() < 0.55 ? 0 : 1];
      if (ai.count < 60) placeIncline(ai, ai.count++, b.x + face * (b.w / 2 + 0.7), 2.75, z, 1, 1, w + 0.4, 0, face * 0.32);
      // quelques lampes chaudes sous les auvents ; pas plus de six, le shader les paie toutes
      if (lampes < 6 && rnd() < 0.25) {
        lampes++;
        const l = new THREE.PointLight(0xffb070, 5, 10, 2);
        l.position.set(b.x + face * (b.w / 2 + 1.2), 2.2, z);
        groupe.add(l);
      }
    }
  }

  // lianes : des plaques de végétation accrochées aux façades basses
  const lianeMat = new THREE.MeshBasicMaterial({ map: textureLianes(), transparent: true, alphaTest: 0.2, side: THREE.DoubleSide });
  const lianeGeo = new THREE.PlaneGeometry(1.6, 3.2);
  const lianes = new THREE.InstancedMesh(lianeGeo, lianeMat, 90); lianes.count = 0; groupe.add(lianes);
  for (const b of batiments) {
    if (rnd() > 0.28 || b.etage || lianes.count >= 90) continue;
    const face = rnd() < 0.5 ? 1 : -1, enX = rnd() < 0.5;
    const y = 2.2 + rnd() * Math.max(1, b.h - 4);
    if (enX) place(lianes, lianes.count++, b.x + face * (b.w / 2 + 0.05), y, b.z + (rnd() - 0.5) * (b.d - 2), 1, 1 + rnd(), 1, face === 1 ? Math.PI / 2 : -Math.PI / 2);
    else place(lianes, lianes.count++, b.x + (rnd() - 0.5) * (b.w - 2), y, b.z + face * (b.d / 2 + 0.05), 1, 1 + rnd(), 1, face === 1 ? 0 : Math.PI);
  }

  // câbles : des caténaires tendues au-dessus de l'avenue et des rues, avec des lanternes
  const cablePts = [], lanternes = [];
  const gauche = batiments.filter(b => Math.round(b.x / PAS) === -1), droite = batiments.filter(b => Math.round(b.x / PAS) === 1);
  for (let i = 0; i < 34; i++) {
    const a = gauche[Math.floor(rnd() * gauche.length)], c = droite[Math.floor(rnd() * droite.length)];
    if (!a || !c || Math.abs(a.z - c.z) > 22) continue;
    const y0 = Math.min(a.h, 16) * (0.6 + rnd() * 0.35), y1 = Math.min(c.h, 16) * (0.6 + rnd() * 0.35);
    const p0 = new THREE.Vector3(a.x + a.w / 2, y0, a.z), p1 = new THREE.Vector3(c.x - c.w / 2, y1, c.z);
    const sag = 1.2 + rnd() * 1.6, N = 10;
    for (let k = 0; k < N; k++) {
      const t0 = k / N, t1 = (k + 1) / N;
      const q0 = p0.clone().lerp(p1, t0); q0.y -= sag * Math.sin(t0 * Math.PI);
      const q1 = p0.clone().lerp(p1, t1); q1.y -= sag * Math.sin(t1 * Math.PI);
      cablePts.push(q0.x, q0.y, q0.z, q1.x, q1.y, q1.z);
      if (k === 5 && rnd() < 0.55) lanternes.push(q0);
    }
  }
  // câbles latéraux dans les rues transversales
  for (let i = 0; i < 40; i++) {
    const a = batiments[Math.floor(rnd() * batiments.length)];
    const c = batiments.find(b => b !== a && Math.abs(b.x - a.x) < 12 && Math.abs(b.z - a.z) > 8 && Math.abs(b.z - a.z) < 20);
    if (!a || !c) continue;
    const p0 = new THREE.Vector3(a.x, Math.min(a.h, c.h) * 0.8, a.z + Math.sign(c.z - a.z) * a.d / 2);
    const p1 = new THREE.Vector3(c.x, Math.min(a.h, c.h) * 0.8, c.z - Math.sign(c.z - a.z) * c.d / 2);
    const sag = 0.8 + rnd(), N = 8;
    for (let k = 0; k < N; k++) {
      const t0 = k / N, t1 = (k + 1) / N;
      const q0 = p0.clone().lerp(p1, t0); q0.y -= sag * Math.sin(t0 * Math.PI);
      const q1 = p0.clone().lerp(p1, t1); q1.y -= sag * Math.sin(t1 * Math.PI);
      cablePts.push(q0.x, q0.y, q0.z, q1.x, q1.y, q1.z);
    }
  }
  const cg = new THREE.BufferGeometry();
  cg.setAttribute('position', new THREE.Float32BufferAttribute(cablePts, 3));
  groupe.add(new THREE.LineSegments(cg, new THREE.LineBasicMaterial({ color: 0x4a5160 })));
  const lantMat = new THREE.MeshBasicMaterial({ color: 0xffb466, toneMapped: false });
  const lant = new THREE.InstancedMesh(new THREE.BoxGeometry(0.34, 0.5, 0.34), lantMat, Math.max(1, lanternes.length));
  lanternes.forEach((p, i) => place(lant, i, p.x, p.y - 0.4, p.z, 1, 1, 1));
  lant.count = lanternes.length; groupe.add(lant);
  const lantLum = [];
  for (const p of lanternes.slice(0, 5)) { const l = new THREE.PointLight(0xffb466, 3, 10, 2); l.position.set(p.x, p.y - 0.4, p.z); groupe.add(l); lantLum.push(l); }

  // passerelles : des ponts piétons qui traversent l'avenue à mi-hauteur
  const tablier = new THREE.MeshStandardMaterial({ color: 0x2a3038, roughness: 0.8, metalness: 0.3 });
  const liseré = new THREE.MeshBasicMaterial({ color: 0x1f8f8a, toneMapped: false });
  const demi = PAS - BLOC / 2;
  for (let bz = GRILLE_Z - 2; bz >= -GRILLE_Z + 1; bz -= 3) {
    if (portails.some(p => Math.abs(p.bz - bz) < 1)) continue;
    const z = bz * PAS + PAS / 2, y = 6.5 + (rnd() < 0.5 ? 0 : 2.5);
    const L = demi * 2 + 1;
    const t = new THREE.Mesh(new THREE.BoxGeometry(L, 0.22, 2.6), tablier); t.position.set(0, y, z); groupe.add(t);
    for (const s of [-1, 1]) {
      const g = new THREE.Mesh(new THREE.BoxGeometry(L, 0.9, 0.06), acier); g.position.set(0, y + 0.55, z + s * 1.27); groupe.add(g);
      const l = new THREE.Mesh(new THREE.BoxGeometry(L, 0.05, 0.05), liseré); l.position.set(0, y + 1.0, z + s * 1.27); groupe.add(l);
    }
    // les montants qui portent le tablier
    for (const x of [-demi + 0.6, demi - 0.6]) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.3, y, 0.3), acier); m.position.set(x, y / 2, z); groupe.add(m);
    }
  }

  // faisceaux de lumière : quelques cônes additifs, comme des projecteurs dans la brume
  const faisceaux = [];
  const faisceauMat = (col) => new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.09, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false, toneMapped: false });
  for (const [x, z, col] of [[-30, 30, 0xffc080], [34, -20, 0x8fd6ff], [-26, -66, 0xffa8c0]]) {
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
