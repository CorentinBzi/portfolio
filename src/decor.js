// Le ciel : un dôme peint. Les détails du bâti sont dans decor_details.js.

import * as THREE from 'three';

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

export { ajouterDetails } from './decor_details.js';
