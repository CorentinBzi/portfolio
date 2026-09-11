// Les passants : des silhouettes de boîtes, instanciées par membre, colorées
// par personne. Ils marchent sur les trottoirs de l'avenue, s'arrêtent sous
// les abribus et devant les vitrines. Personne n'a de visage : ce sont des
// silhouettes, pas des portraits.

import * as THREE from 'three';

const PEAUX = [0xc98f6a, 0x8d5a3b, 0xe0b090, 0x5a3a28, 0xb87a5a];
const MANTEAUX = [0x2a3440, 0x6a3a2a, 0x3a4a3a, 0x8a7a5a, 0x2a2a30, 0x9a4a3a, 0x3a5a7a, 0xd0c8b8, 0x4a3a5a, 0x7a2a3a];
const PANTALONS = [0x1c2028, 0x2a2420, 0x30343c, 0x3a2e28];

export function creerPnj(scene, rnd, { PAS, GRILLE_Z, portails, arrets }) {
  const N = 72;
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });
  const part = (geo) => { const m = new THREE.InstancedMesh(geo, mat, N); m.castShadow = false; scene.add(m); return m; };
  const tete = part(new THREE.BoxGeometry(0.26, 0.28, 0.26));
  const torse = part(new THREE.BoxGeometry(0.44, 0.58, 0.24));
  const jambeG = part(new THREE.BoxGeometry(0.16, 0.56, 0.18));
  const jambeD = part(new THREE.BoxGeometry(0.16, 0.56, 0.18));
  const brasG = part(new THREE.BoxGeometry(0.12, 0.52, 0.12));
  const brasD = part(new THREE.BoxGeometry(0.12, 0.52, 0.12));
  const sac = part(new THREE.BoxGeometry(0.3, 0.34, 0.14));
  const parties = [tete, torse, jambeG, jambeD, brasG, brasD, sac];

  const col = new THREE.Color();
  const gens = [];
  const bordZ = (GRILLE_Z + 0.6) * PAS;
  for (let i = 0; i < N; i++) {
    const marche = rnd() < 0.7;
    const cote = rnd() < 0.5 ? -1 : 1;
    const g = {
      marche, vit: 0.9 + rnd() * 0.8, phase: rnd() * 6.28,
      dir: rnd() < 0.5 ? -1 : 1,
      x: cote * (9.0 + rnd() * 1.6), z: (rnd() - 0.5) * 2 * bordZ,
      cap: 0, taille: 0.88 + rnd() * 0.22,
      peau: PEAUX[Math.floor(rnd() * PEAUX.length)],
      manteau: MANTEAUX[Math.floor(rnd() * MANTEAUX.length)],
      pantalon: PANTALONS[Math.floor(rnd() * PANTALONS.length)],
      sac: rnd() < 0.35,
    };
    if (!marche) {
      // les immobiles se groupent : sous un abribus, devant un portail, ou par deux
      if (arrets && arrets.length && rnd() < 0.5) {
        const a = arrets[Math.floor(rnd() * arrets.length)];
        g.x = a.x + (rnd() - 0.5) * 2.4; g.z = a.z + (rnd() - 0.5) * 1.2; g.cap = a.x < 0 ? Math.PI / 2 : -Math.PI / 2;
      } else if (rnd() < 0.5) {
        const p = portails[Math.floor(rnd() * portails.length)];
        g.x = p.x + (rnd() - 0.5) * 8; g.z = p.z + 5 + rnd() * 3; g.cap = Math.atan2(-(p.x - g.x), -(p.z - g.z));
      } else {
        g.cap = rnd() * 6.28;
      }
    } else {
      g.cap = g.dir === -1 ? 0 : Math.PI;
    }
    gens.push(g);
    col.set(g.peau); tete.setColorAt(i, col);
    col.set(g.manteau); torse.setColorAt(i, col); brasG.setColorAt(i, col); brasD.setColorAt(i, col);
    col.set(g.pantalon); jambeG.setColorAt(i, col); jambeD.setColorAt(i, col);
    col.set(0x2a2a2e); sac.setColorAt(i, col);
  }
  for (const p of parties) p.instanceColor.needsUpdate = true;

  const dummy = new THREE.Object3D();
  const membre = new THREE.Object3D();
  function pose(inst, i, x, y, z, cap, rx, sx = 1, sy = 1, sz = 1) {
    dummy.position.set(x, y, z); dummy.rotation.set(0, cap, 0); dummy.scale.set(sx, sy, sz);
    dummy.updateMatrix();
    membre.position.set(0, 0, 0); membre.rotation.set(rx, 0, 0); membre.updateMatrix();
    inst.setMatrixAt(i, dummy.matrix.clone().multiply(membre.matrix));
  }

  function animer(t, dt) {
    for (let i = 0; i < N; i++) {
      const g = gens[i];
      let bal = 0, bob = 0;
      if (g.marche) {
        g.z += g.dir * g.vit * dt;
        if (g.z > bordZ) g.z = -bordZ; else if (g.z < -bordZ) g.z = bordZ;
        // les passants ne traversent pas les anneaux : ils les contournent
        bal = Math.sin(t * 7 * g.vit + g.phase) * 0.55;
        bob = Math.abs(Math.sin(t * 7 * g.vit + g.phase)) * 0.04;
      } else {
        bob = Math.sin(t * 1.4 + g.phase) * 0.015;
      }
      const s = g.taille, y0 = 0.16;
      const cx = g.x, cz = g.z, cap = g.cap;
      // les membres pivotent autour de la hanche / de l'épaule : on décale leur origine
      const avant = new THREE.Vector3(-Math.sin(cap), 0, -Math.cos(cap));
      const cote = new THREE.Vector3(Math.cos(cap), 0, -Math.sin(cap));
      const hanche = y0 + 0.56 * s;
      const balJ = bal, balB = -bal * 0.8;
      pose(jambeG, i, cx + cote.x * 0.1 + avant.x * Math.sin(balJ) * 0.2, hanche - 0.28 * s * Math.cos(balJ) + bob, cz + cote.z * 0.1 + avant.z * Math.sin(balJ) * 0.2, cap, balJ, s, s, s);
      pose(jambeD, i, cx - cote.x * 0.1 - avant.x * Math.sin(balJ) * 0.2, hanche - 0.28 * s * Math.cos(balJ) + bob, cz - cote.z * 0.1 - avant.z * Math.sin(balJ) * 0.2, cap, -balJ, s, s, s);
      const epaule = y0 + (0.56 + 0.58) * s;
      pose(torse, i, cx, y0 + (0.56 + 0.29) * s + bob, cz, cap, 0, s, s, s);
      pose(tete, i, cx, y0 + (0.56 + 0.58 + 0.18) * s + bob, cz, cap, 0, s, s, s);
      pose(brasG, i, cx + cote.x * 0.28 * s + avant.x * Math.sin(balB) * 0.18, epaule - 0.26 * s * Math.cos(balB) + bob, cz + cote.z * 0.28 * s + avant.z * Math.sin(balB) * 0.18, cap, balB, s, s, s);
      pose(brasD, i, cx - cote.x * 0.28 * s - avant.x * Math.sin(balB) * 0.18, epaule - 0.26 * s * Math.cos(balB) + bob, cz - cote.z * 0.28 * s - avant.z * Math.sin(balB) * 0.18, cap, -balB, s, s, s);
      if (g.sac) pose(sac, i, cx - avant.x * 0.2 * s, y0 + (0.56 + 0.32) * s + bob, cz - avant.z * 0.2 * s, cap, 0, s, s, s);
      else pose(sac, i, 0, -50, 0, 0, 0, 0.001, 0.001, 0.001);
    }
    for (const p of parties) p.instanceMatrix.needsUpdate = true;
  }

  animer(0, 0);
  return { animer, gens };
}
