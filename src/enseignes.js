// Enseignes dessinées sur canvas et montées en texture : aucune image téléchargée.
// Une enseigne est un plan émissif ; le bloom fait le reste.

import * as THREE from 'three';

const cache = new Map();

// Texture d'enseigne : texte sur fond coloré, avec un liseré.
// dir : 'h' horizontale, 'v' verticale (une lettre par ligne, comme les rues asiatiques).
export function textureEnseigne(texte, fond, encre, dir = 'h', taille = 1) {
  const cle = [texte, fond, encre, dir, taille].join('|');
  if (cache.has(cle)) return cache.get(cle);

  const vertical = dir === 'v';
  const chars = [...String(texte)];
  const w = vertical ? 128 : Math.max(256, Math.min(1024, chars.length * 64 + 64));
  const h = vertical ? Math.max(256, chars.length * 96 + 64) : 128;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');

  g.fillStyle = fond;
  g.fillRect(0, 0, w, h);
  // liseré intérieur, plus clair, comme un tube néon qui borde le panneau
  g.strokeStyle = encre;
  g.lineWidth = 6;
  g.strokeRect(10, 10, w - 20, h - 20);

  g.fillStyle = encre;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  if (vertical) {
    g.font = `bold ${Math.round(72 * taille)}px "Archivo", "Noto Sans CJK JP", "Yu Gothic", sans-serif`;
    const pas = (h - 64) / chars.length;
    chars.forEach((ch, i) => g.fillText(ch, w / 2, 32 + pas * (i + 0.5)));
  } else {
    let px = Math.round(78 * taille);
    g.font = `bold ${px}px "Archivo", "Noto Sans CJK JP", "Yu Gothic", sans-serif`;
    while (g.measureText(texte).width > w - 48 && px > 20) {
      px -= 4; g.font = `bold ${px}px "Archivo", "Noto Sans CJK JP", "Yu Gothic", sans-serif`;
    }
    g.fillText(texte, w / 2, h / 2 + 4);
  }

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  cache.set(cle, t);
  return t;
}

// Un panneau prêt à poser : plan émissif, non éclairé, double face.
export function enseigne(texte, fond, encre, largeur, dir = 'h', taille = 1) {
  const tex = textureEnseigne(texte, fond, encre, dir, taille);
  const ratio = tex.image.height / tex.image.width;
  const geo = new THREE.PlaneGeometry(largeur, largeur * ratio);
  const mat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide, toneMapped: false });
  const m = new THREE.Mesh(geo, mat);
  m.userData.enseigne = true;
  return m;
}

// Texture de fenêtres : grille de points allumés ou éteints, répétée sur les façades.
export function textureFenetres(accent) {
  const cle = 'fen|' + accent;
  if (cache.has(cle)) return cache.get(cle);
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#0d1218';
  g.fillRect(0, 0, 64, 64);
  let graine = 7;
  const rnd = () => { graine = (graine * 16807) % 2147483647; return graine / 2147483647; };
  for (let y = 4; y < 64; y += 8) {
    for (let x = 4; x < 64; x += 8) {
      const r = rnd();
      if (r < 0.28) { g.fillStyle = accent; g.globalAlpha = 0.55 + rnd() * 0.45; g.fillRect(x, y, 3, 4); }
      else if (r < 0.40) { g.fillStyle = '#3a4650'; g.globalAlpha = 0.6; g.fillRect(x, y, 3, 4); }
      g.globalAlpha = 1;
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.NearestFilter;
  t.colorSpace = THREE.SRGBColorSpace;
  cache.set(cle, t);
  return t;
}
