// La sonde : un petit programme de diagnostic qui vole au ras des rues.
// Un octaèdre ambre, un anneau, deux ailerons, une lumière. Aucun modèle importé.

import * as THREE from 'three';
import { P } from './palette.js';

export function creerSonde(scene, camera, entrees, occupe) {
  const g = new THREE.Group();

  const coeurMat = new THREE.MeshStandardMaterial({
    color: 0x2a1a08, emissive: P.sonde, emissiveIntensity: 2.2, roughness: 0.3, metalness: 0.4,
  });
  const coeur = new THREE.Mesh(new THREE.OctahedronGeometry(0.42, 0), coeurMat);
  g.add(coeur);

  const anneau = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.05, 8, 40),
    new THREE.MeshStandardMaterial({ color: 0x3a4652, emissive: 0x46E6C8, emissiveIntensity: 0.9, roughness: 0.4 }));
  anneau.rotation.x = Math.PI / 2;
  g.add(anneau);

  const aileMat = new THREE.MeshStandardMaterial({ color: 0x1b232b, roughness: 0.7 });
  for (const s of [-1, 1]) {
    const aile = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.05, 0.35), aileMat);
    aile.position.set(s * 0.75, -0.05, 0.25);
    aile.rotation.z = s * 0.25;
    g.add(aile);
  }
  // fente lumineuse : le seul « regard » de la sonde, tourné vers l'avant
  const fente = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.06, 0.04),
    new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }));
  fente.position.set(0, 0.02, -0.42);
  g.add(fente);

  const lum = new THREE.PointLight(P.sonde, 8, 16, 1.8);
  lum.position.set(0, 0.6, 0);
  g.add(lum);

  scene.add(g);

  const pos = new THREE.Vector3(0, 1.7, 108);
  let yaw = 0;               // 0 = vers le nord (-z)
  let vitesse = 0, roulis = 0, t = 0;
  const camCible = new THREE.Vector3(), camVise = new THREE.Vector3();
  const avant = new THREE.Vector3();

  const V_MAX = 14, V_BOOST = 24, ACC = 26, FREIN = 18, ROT = 2.4;

  function mettreAJour(dt) {
    t += dt;
    const a = entrees.axes();
    yaw -= a.x * ROT * dt * (0.6 + 0.4 * Math.min(1, Math.abs(vitesse) / V_MAX));
    const vmax = a.boost ? V_BOOST : V_MAX;
    if (a.y !== 0) vitesse += a.y * ACC * dt;
    else vitesse -= Math.sign(vitesse) * Math.min(Math.abs(vitesse), FREIN * dt);
    vitesse = Math.max(-vmax * 0.5, Math.min(vmax, vitesse));

    avant.set(-Math.sin(yaw), 0, -Math.cos(yaw));
    const nx = pos.x + avant.x * vitesse * dt, nz = pos.z + avant.z * vitesse * dt;
    // glissement le long des murs : on essaie l'axe libre avant de s'arrêter
    if (!occupe(nx, nz)) { pos.x = nx; pos.z = nz; }
    else if (!occupe(nx, pos.z)) { pos.x = nx; vitesse *= 0.6; }
    else if (!occupe(pos.x, nz)) { pos.z = nz; vitesse *= 0.6; }
    else vitesse *= -0.25;

    // attitude : roulis dans le virage, tangage avec l'accélération, flottement
    roulis += ((-a.x * 0.45) - roulis) * Math.min(1, dt * 6);
    g.position.set(pos.x, pos.y + Math.sin(t * 2.3) * 0.08, pos.z);
    g.rotation.set(vitesse / vmax * 0.18, yaw, roulis);
    coeur.rotation.y += dt * 1.5;
    anneau.rotation.z += dt * 0.8;
    lum.intensity = 7 + Math.sin(t * 9) * 0.6;

    // caméra derrière, un peu haute, qui traîne légèrement
    camCible.copy(pos).addScaledVector(avant, -7.5);
    camCible.y = pos.y + 3.4;
    camera.position.lerp(camCible, Math.min(1, dt * 4.5));
    camVise.copy(pos).addScaledVector(avant, 4);
    camVise.y = pos.y + 0.4;
    camera.lookAt(camVise);
  }

  function teleporter(x, z, yawNouveau) {
    pos.x = x; pos.z = z; vitesse = 0;
    if (yawNouveau !== undefined) yaw = yawNouveau;
    avant.set(-Math.sin(yaw), 0, -Math.cos(yaw));
    camera.position.copy(pos).addScaledVector(avant, -7.5);
    camera.position.y = pos.y + 3.4;
  }

  return { groupe: g, pos, get yaw() { return yaw; }, get vitesse() { return vitesse; }, mettreAJour, teleporter };
}
