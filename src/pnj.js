// Les passants : des silhouettes de boîtes, instanciées par membre, colorées
// par personne. Ils suivent les trottoirs d'une rue à l'autre, tournent sur la
// place, s'arrêtent sous les abribus et devant les portails. Personne n'a de
// visage : ce sont des silhouettes, pas des portraits.

import * as THREE from 'three';
import { pointSeg, longueurSeg, PLACE } from './plan.js';

const PEAUX = [0xc98f6a, 0x8d5a3b, 0xe0b090, 0x5a3a28, 0xb87a5a];
const MANTEAUX = [0x2a3440, 0x6a3a2a, 0x3a4a3a, 0x8a7a5a, 0x2a2a30, 0x9a4a3a, 0x3a5a7a, 0xd0c8b8, 0x4a3a5a, 0x7a2a3a];
const PANTALONS = [0x1c2028, 0x2a2420, 0x30343c, 0x3a2e28];

export function creerPnj(scene, rnd, { routes, portails, arrets }) {
  const N = 96;
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });
  const part = (geo) => { const m = new THREE.InstancedMesh(geo, mat, N); scene.add(m); return m; };
  const tete = part(new THREE.BoxGeometry(0.26, 0.28, 0.26));
  const torse = part(new THREE.BoxGeometry(0.44, 0.58, 0.24));
  const jambeG = part(new THREE.BoxGeometry(0.16, 0.56, 0.18));
  const jambeD = part(new THREE.BoxGeometry(0.16, 0.56, 0.18));
  const brasG = part(new THREE.BoxGeometry(0.12, 0.52, 0.12));
  const brasD = part(new THREE.BoxGeometry(0.12, 0.52, 0.12));
  const sac = part(new THREE.BoxGeometry(0.3, 0.34, 0.14));
  const parties = [tete, torse, jambeG, jambeD, brasG, brasD, sac];

  const marchables = routes.filter(s => s.type !== 'rue' || rnd() < 0.6);
  const col = new THREE.Color();
  const gens = [];
  for (let i = 0; i < N; i++) {
    const g = {
      vit: 0.9 + rnd() * 0.8, phase: rnd() * 6.28, x: 0, z: 0, cap: 0, taille: 0.88 + rnd() * 0.22,
      peau: PEAUX[Math.floor(rnd() * PEAUX.length)], manteau: MANTEAUX[Math.floor(rnd() * MANTEAUX.length)],
      pantalon: PANTALONS[Math.floor(rnd() * PANTALONS.length)], sac: rnd() < 0.35,
    };
    const u = rnd();
    if (u < 0.55) {
      // sur un trottoir, dans un sens, d'une rue à la suivante
      g.mode = 'rue';
      g.seg = marchables[Math.floor(rnd() * marchables.length)];
      g.dist = rnd() * longueurSeg(g.seg); g.sens = rnd() < 0.5 ? -1 : 1;
      g.cote = (rnd() < 0.5 ? -1 : 1) * (g.seg.w / 2 + 1.2 + (rnd() - 0.5) * 1.2);
    } else if (u < 0.72) {
      // sur la place, en cercle autour de la fontaine
      g.mode = 'place';
      g.r = 11.5 + rnd() * (PLACE.rayon - 15); g.a = rnd() * 6.28; g.sens = rnd() < 0.5 ? -1 : 1;
    } else {
      g.mode = 'fixe';
      const v = rnd();
      if (arrets && arrets.length && v < 0.4) {
        const a = arrets[Math.floor(rnd() * arrets.length)];
        g.x = a.x + (rnd() - 0.5) * 2.4; g.z = a.z + (rnd() - 0.5) * 1.2; g.cap = a.cap + (rnd() - 0.5) * 0.6;
      } else if (v < 0.75) {
        const p = portails[Math.floor(rnd() * portails.length)];
        const t = rnd() * 6.28, d = 5.5 + rnd() * 3;
        g.x = p.x + Math.sin(t) * d; g.z = p.z + Math.cos(t) * d; g.cap = Math.atan2(-(p.x - g.x), -(p.z - g.z));
      } else {
        const t = rnd() * 6.28, d = 9.5 + rnd() * 1.2;
        g.x = Math.sin(t) * d; g.z = Math.cos(t) * d; g.cap = Math.atan2(g.x, g.z);
      }
    }
    gens.push(g);
    col.set(g.peau); tete.setColorAt(i, col);
    col.set(g.manteau); torse.setColorAt(i, col); brasG.setColorAt(i, col); brasD.setColorAt(i, col);
    col.set(g.pantalon); jambeG.setColorAt(i, col); jambeD.setColorAt(i, col);
    col.set(0x2a2a2e); sac.setColorAt(i, col);
  }
  for (const p of parties) p.instanceColor.needsUpdate = true;

  // au bout d'un trottoir, on prend une rue qui part de là ; sinon on fait demi-tour
  function suivant(g) {
    const fin = g.sens === 1 ? { x: g.seg.x2, z: g.seg.z2 } : { x: g.seg.x1, z: g.seg.z1 };
    const cands = [];
    for (const s of marchables) {
      if (s === g.seg) continue;
      if (Math.hypot(s.x1 - fin.x, s.z1 - fin.z) < 14) cands.push({ s, sens: 1, dist: 0 });
      else if (Math.hypot(s.x2 - fin.x, s.z2 - fin.z) < 14) cands.push({ s, sens: -1, dist: longueurSeg(s) });
    }
    if (cands.length) {
      const c = cands[Math.floor(rnd() * cands.length)];
      g.seg = c.s; g.sens = c.sens; g.dist = c.dist;
      g.cote = Math.sign(g.cote) * (g.seg.w / 2 + 1.2 + (rnd() - 0.5) * 1.2);
    } else {
      g.sens = -g.sens;
    }
  }

  const dummy = new THREE.Object3D();
  const membre = new THREE.Object3D();
  const avant = new THREE.Vector3(), cote = new THREE.Vector3();
  function pose(inst, i, x, y, z, cap, rx, s) {
    dummy.position.set(x, y, z); dummy.rotation.set(0, cap, 0); dummy.scale.set(s, s, s);
    dummy.updateMatrix();
    membre.rotation.set(rx, 0, 0); membre.updateMatrix();
    inst.setMatrixAt(i, dummy.matrix.multiply(membre.matrix));
  }

  function animer(t, dt) {
    for (let i = 0; i < N; i++) {
      const g = gens[i];
      let bal = 0, bob = 0;
      if (g.mode === 'rue') {
        g.dist += g.sens * g.vit * dt;
        const L = longueurSeg(g.seg);
        if (g.dist > L || g.dist < 0) { g.dist = Math.max(0, Math.min(L, g.dist)); suivant(g); }
        const p = pointSeg(g.seg, g.dist, g.cote);
        g.x = p.x; g.z = p.z;
        g.cap = Math.atan2(-p.dx * g.sens, -p.dz * g.sens);
        bal = Math.sin(t * 7 * g.vit + g.phase) * 0.55;
        bob = Math.abs(Math.sin(t * 7 * g.vit + g.phase)) * 0.04;
      } else if (g.mode === 'place') {
        g.a += g.sens * g.vit * dt / g.r;
        g.x = Math.sin(g.a) * g.r; g.z = Math.cos(g.a) * g.r;
        const vx = Math.cos(g.a) * g.sens, vz = -Math.sin(g.a) * g.sens;
        g.cap = Math.atan2(-vx, -vz);
        bal = Math.sin(t * 7 * g.vit + g.phase) * 0.55;
        bob = Math.abs(Math.sin(t * 7 * g.vit + g.phase)) * 0.04;
      } else {
        bob = Math.sin(t * 1.4 + g.phase) * 0.015;
      }
      const s = g.taille, y0 = 0.16;
      const cx = g.x, cz = g.z, cap = g.cap;
      avant.set(-Math.sin(cap), 0, -Math.cos(cap));
      cote.set(Math.cos(cap), 0, -Math.sin(cap));
      const hanche = y0 + 0.56 * s;
      const balJ = bal, balB = -bal * 0.8;
      pose(jambeG, i, cx + cote.x * 0.1 + avant.x * Math.sin(balJ) * 0.2, hanche - 0.28 * s * Math.cos(balJ) + bob, cz + cote.z * 0.1 + avant.z * Math.sin(balJ) * 0.2, cap, balJ, s);
      pose(jambeD, i, cx - cote.x * 0.1 - avant.x * Math.sin(balJ) * 0.2, hanche - 0.28 * s * Math.cos(balJ) + bob, cz - cote.z * 0.1 - avant.z * Math.sin(balJ) * 0.2, cap, -balJ, s);
      const epaule = y0 + (0.56 + 0.58) * s;
      pose(torse, i, cx, y0 + (0.56 + 0.29) * s + bob, cz, cap, 0, s);
      pose(tete, i, cx, y0 + (0.56 + 0.58 + 0.18) * s + bob, cz, cap, 0, s);
      pose(brasG, i, cx + cote.x * 0.28 * s + avant.x * Math.sin(balB) * 0.18, epaule - 0.26 * s * Math.cos(balB) + bob, cz + cote.z * 0.28 * s + avant.z * Math.sin(balB) * 0.18, cap, balB, s);
      pose(brasD, i, cx - cote.x * 0.28 * s - avant.x * Math.sin(balB) * 0.18, epaule - 0.26 * s * Math.cos(balB) + bob, cz - cote.z * 0.28 * s - avant.z * Math.sin(balB) * 0.18, cap, -balB, s);
      if (g.sac) pose(sac, i, cx - avant.x * 0.2 * s, y0 + (0.56 + 0.32) * s + bob, cz - avant.z * 0.2 * s, cap, 0, s);
      else pose(sac, i, 0, -50, 0, 0, 0, 0.001);
    }
    for (const p of parties) p.instanceMatrix.needsUpdate = true;
  }

  animer(0, 0);
  return { animer, gens };
}
