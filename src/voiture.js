// La voiture volante : une coque basse et large, une bulle vitrée, quatre pods
// de sustentation qui brillent, des feux, un liseré néon. Aucun modèle importé.
// Elle vole au ras des rues ; les collisions se font contre le plan de la ville.

import * as THREE from 'three';
import { P } from './palette.js';

export function creerVoiture(scene, camera, entrees, occupe) {
  const g = new THREE.Group();

  const peinture = new THREE.MeshStandardMaterial({ color: 0x2c4a63, roughness: 0.3, metalness: 0.7 });
  const noir = new THREE.MeshStandardMaterial({ color: 0x0e1216, roughness: 0.6, metalness: 0.4 });
  const vitre = new THREE.MeshStandardMaterial({ color: 0x5fd6e6, roughness: 0.08, metalness: 0.6, transparent: true, opacity: 0.55 });
  const neon = new THREE.MeshBasicMaterial({ color: P.sonde, toneMapped: false });
  const cyan = new THREE.MeshBasicMaterial({ color: 0x46E6C8, toneMapped: false });
  const blanc = new THREE.MeshBasicMaterial({ color: 0xfff4dc, toneMapped: false });
  const rouge = new THREE.MeshBasicMaterial({ color: 0xE8503A, toneMapped: false });

  const piece = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => {
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); g.add(m); return m;
  };
  // coque : une caisse principale, un nez effilé, un arrière plus haut, des flancs
  piece(new THREE.BoxGeometry(2.1, 0.42, 3.4), peinture, 0, 0, 0.15);
  piece(new THREE.BoxGeometry(1.5, 0.3, 1.2), peinture, 0, -0.02, -2.05, 0.18);
  piece(new THREE.BoxGeometry(2.2, 0.55, 0.9), peinture, 0, 0.12, 1.85);
  piece(new THREE.BoxGeometry(0.22, 0.24, 3.0), noir, -1.16, -0.06, 0.1);
  piece(new THREE.BoxGeometry(0.22, 0.24, 3.0), noir, 1.16, -0.06, 0.1);
  // bulle vitrée
  piece(new THREE.BoxGeometry(1.5, 0.5, 1.7), vitre, 0, 0.44, 0.05);
  piece(new THREE.BoxGeometry(1.54, 0.08, 1.74), noir, 0, 0.7, 0.05);
  piece(new THREE.BoxGeometry(1.3, 0.03, 0.06), neon, 0, 0.75, -0.7);
  // aileron arrière
  piece(new THREE.BoxGeometry(2.0, 0.06, 0.4), noir, 0, 0.55, 2.1);
  piece(new THREE.BoxGeometry(0.08, 0.32, 0.3), noir, -0.8, 0.38, 2.1);
  piece(new THREE.BoxGeometry(0.08, 0.32, 0.3), noir, 0.8, 0.38, 2.1);
  // liseré néon ambre sur les flancs, feux avant et arrière
  piece(new THREE.BoxGeometry(0.04, 0.05, 3.2), neon, -1.28, 0.02, 0.1);
  piece(new THREE.BoxGeometry(0.04, 0.05, 3.2), neon, 1.28, 0.02, 0.1);
  piece(new THREE.BoxGeometry(0.5, 0.1, 0.06), blanc, -0.55, 0.02, -2.66);
  piece(new THREE.BoxGeometry(0.5, 0.1, 0.06), blanc, 0.55, 0.02, -2.66);
  piece(new THREE.BoxGeometry(2.0, 0.1, 0.06), rouge, 0, 0.12, 2.32);
  // pods de sustentation : quatre cylindres sous les coins, chacun avec un anneau lumineux
  const pods = [];
  for (const [x, z] of [[-0.85, -1.1], [0.85, -1.1], [-0.85, 1.3], [0.85, 1.3]]) {
    piece(new THREE.CylinderGeometry(0.34, 0.42, 0.3, 16), noir, x, -0.3, z);
    pods.push(piece(new THREE.TorusGeometry(0.36, 0.05, 8, 24), cyan, x, -0.44, z, Math.PI / 2));
  }
  // lumières : phares vers l'avant, lueur cyan sous la caisse
  const phare = new THREE.SpotLight(0xfff0d0, 40, 30, 0.45, 0.5, 1.4);
  phare.position.set(0, 0.2, -2.4);
  const cible = new THREE.Object3D(); cible.position.set(0, -0.6, -12); g.add(cible); phare.target = cible;
  g.add(phare);
  const dessous = new THREE.PointLight(0x46E6C8, 8, 8, 2); dessous.position.set(0, -0.6, 0); g.add(dessous);
  scene.add(g);

  const pos = new THREE.Vector3(0, 1.7, 40);
  let yaw = 0, vitesse = 0, roulis = 0, tangage = 0, t = 0;
  const camCible = new THREE.Vector3(), camVise = new THREE.Vector3(), avant = new THREE.Vector3();
  const V_MAX = 15, V_BOOST = 26, ACC = 24, FREIN = 20, ROT = 2.1;

  function mettreAJour(dt) {
    t += dt;
    const a = entrees.axes();
    const facteurVirage = 0.45 + 0.55 * Math.min(1, Math.abs(vitesse) / V_MAX);
    yaw -= a.x * ROT * dt * facteurVirage * (vitesse < 0 ? -1 : 1);
    const vmax = a.boost ? V_BOOST : V_MAX;
    if (a.y !== 0) vitesse += a.y * ACC * dt;
    else vitesse -= Math.sign(vitesse) * Math.min(Math.abs(vitesse), FREIN * dt);
    vitesse = Math.max(-vmax * 0.45, Math.min(vmax, vitesse));

    avant.set(-Math.sin(yaw), 0, -Math.cos(yaw));
    const nx = pos.x + avant.x * vitesse * dt, nz = pos.z + avant.z * vitesse * dt;
    if (!occupe(nx, nz)) { pos.x = nx; pos.z = nz; }
    else if (!occupe(nx, pos.z)) { pos.x = nx; vitesse *= 0.55; }
    else if (!occupe(pos.x, nz)) { pos.z = nz; vitesse *= 0.55; }
    else vitesse *= -0.2;

    roulis += ((-a.x * 0.32 * Math.min(1, Math.abs(vitesse) / 8)) - roulis) * Math.min(1, dt * 5);
    tangage += (((a.y !== 0 ? -a.y : 0) * 0.08) - tangage) * Math.min(1, dt * 4);
    g.position.set(pos.x, pos.y + Math.sin(t * 2.1) * 0.06, pos.z);
    g.rotation.set(tangage, yaw, roulis);
    for (let i = 0; i < pods.length; i++) pods[i].material.color.setHex(0x46E6C8).multiplyScalar(0.8 + 0.2 * Math.sin(t * 12 + i));
    dessous.intensity = 7 + Math.sin(t * 9) * 0.8 + Math.abs(vitesse) * 0.15;

    camCible.copy(pos).addScaledVector(avant, -9.5);
    camCible.y = pos.y + 3.9;
    camera.position.lerp(camCible, Math.min(1, dt * 4.5));
    camVise.copy(pos).addScaledVector(avant, 5);
    camVise.y = pos.y + 0.6;
    camera.lookAt(camVise);
  }

  function teleporter(x, z, yawNouveau) {
    pos.x = x; pos.z = z; vitesse = 0;
    if (yawNouveau !== undefined) yaw = yawNouveau;
    avant.set(-Math.sin(yaw), 0, -Math.cos(yaw));
    camera.position.copy(pos).addScaledVector(avant, -9.5);
    camera.position.y = pos.y + 3.9;
    g.position.set(pos.x, pos.y, pos.z); g.rotation.set(0, yaw, 0);
  }

  return { groupe: g, pos, get yaw() { return yaw; }, get vitesse() { return vitesse; }, mettreAJour, teleporter };
}
