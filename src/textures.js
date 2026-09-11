// Textures peintes sur canvas : façades, toits, trottoirs, chaussée, pavés,
// herbe, affiches, devantures. Une tuile de façade couvre TUILE_M mètres de
// côté en 512 px : deux étages, corniches, appuis de fenêtre, climatiseurs,
// salissures — et une carte d'émission pour les fenêtres allumées.

import * as THREE from 'three';

export const TUILE_M = 6;
const T = 512;                          // px par tuile de façade

function toile(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function rng(g) { let s = g >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
function tex(c, repeat = true) {
  const t = new THREE.CanvasTexture(c);
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

// Une fenêtre complète : appui clair, cadre, vitre avec reflet, croisillon,
// parfois un store ou un climatiseur ; la carte d'émission n'a que la vitre allumée.
function fenetre(g, ge, x, y, w, h, r, teinte, opts = {}) {
  const allume = r() < (opts.tauxAllume || 0.42);
  const store = r() < 0.22;
  const clim = r() < 0.16;
  g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(x - 5, y - 6, w + 10, 5);
  g.fillStyle = 'rgba(255,255,255,0.22)'; g.fillRect(x - 7, y + h + 2, w + 14, 4);
  g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(x - 7, y + h + 6, w + 14, 3);
  g.fillStyle = opts.cadre || '#23221f'; g.fillRect(x - 5, y - 5, w + 10, h + 10);
  g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(x - 5, y - 5, w + 10, 2);
  const vitre = allume ? (r() < 0.75 ? '#6a4520' : '#1e4448') : (r() < 0.5 ? '#141b23' : '#1a222b');
  g.fillStyle = vitre; g.fillRect(x, y, w, h);
  const refl = g.createLinearGradient(x, y, x + w, y + h);
  refl.addColorStop(0, 'rgba(255,255,255,0.14)'); refl.addColorStop(0.45, 'rgba(255,255,255,0.02)'); refl.addColorStop(1, 'rgba(255,255,255,0.09)');
  g.fillStyle = refl; g.fillRect(x, y, w, h);
  if (store) { g.fillStyle = '#4a4238'; g.fillRect(x, y, w, h * (0.3 + r() * 0.45)); g.fillStyle = 'rgba(0,0,0,0.25)'; for (let l = y + 4; l < y + h * 0.5; l += 6) g.fillRect(x, l, w, 2); }
  g.fillStyle = opts.cadre || '#23221f'; g.fillRect(x + w / 2 - 2, y, 4, h); g.fillRect(x, y + h / 2 - 2, w, 4);
  if (clim) {
    g.fillStyle = '#9a9c98'; g.fillRect(x + w - 30, y + h + 10, 30, 20);
    g.fillStyle = '#6a6c68'; for (let l = 3; l < 20; l += 4) g.fillRect(x + w - 27, y + h + 10 + l, 24, 1.5);
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(x + w - 30, y + h + 30, 30, 4);
  }
  if (allume) {
    ge.fillStyle = r() < 0.75 ? (teinte || '#ffb870') : '#6fd8d0';
    ge.globalAlpha = 0.5 + r() * 0.5;
    ge.fillRect(x, y + (store ? h * 0.5 : 0), w, store ? h * 0.5 : h);
    ge.globalAlpha = 1;
  }
}

function base(fond) {
  const c = toile(T, T), e = toile(T, T);
  const g = c.getContext('2d'), ge = e.getContext('2d');
  g.fillStyle = fond; g.fillRect(0, 0, T, T);
  ge.fillStyle = '#000'; ge.fillRect(0, 0, T, T);
  return { c, e, g, ge };
}

// salissures : coulures, taches, noircissement du bas d'étage
function salir(g, r, force = 1) {
  for (let i = 0; i < 40 * force; i++) {
    g.fillStyle = `rgba(0,0,0,${0.04 + r() * 0.1})`;
    g.fillRect(r() * T, r() * T, 2 + r() * 10, 40 + r() * 240);
  }
  for (let i = 0; i < 14 * force; i++) {
    g.fillStyle = `rgba(110,70,40,${0.05 + r() * 0.1})`;
    g.beginPath(); g.ellipse(r() * T, r() * T, 10 + r() * 40, 6 + r() * 20, r() * 3, 0, 6.28); g.fill();
  }
  const bas = g.createLinearGradient(0, T - 60, 0, T); bas.addColorStop(0, 'rgba(0,0,0,0)'); bas.addColorStop(1, 'rgba(0,0,0,0.28)');
  g.fillStyle = bas; g.fillRect(0, T - 60, T, 60);
}

// corniche entre deux étages : un bandeau clair au-dessus, une ombre en dessous
function corniche(g, y, clair, sombre) {
  g.fillStyle = clair; g.fillRect(0, y - 4, T, 6);
  g.fillStyle = sombre; g.fillRect(0, y + 2, T, 7);
}

export function facade(variante, graine) {
  const r = rng(graine);
  let c, e, g, ge;
  const ET = T / 2;
  if (variante === 'brique') {
    ({ c, e, g, ge } = base('#5c3a2e'));
    for (let y = 0; y < T; y += 14) {
      for (let x = (y / 14) % 2 ? -22 : 0; x < T; x += 44) {
        const t = r();
        g.fillStyle = t < 0.4 ? '#7e4c3c' : (t < 0.75 ? '#70433a' : (t < 0.92 ? '#8a5646' : '#5f3a30'));
        g.fillRect(x + 2, y + 2, 40, 10);
        g.fillStyle = 'rgba(255,255,255,0.06)'; g.fillRect(x + 2, y + 2, 40, 2);
        g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(x + 2, y + 10, 40, 2);
      }
    }
    for (let f = 0; f < 2; f++) {
      corniche(g, f * ET + 8, 'rgba(255,255,255,0.14)', 'rgba(0,0,0,0.32)');
      for (let k = 0; k < 4; k++) fenetre(g, ge, 34 + k * 122, 62 + f * ET, 60, 104, r, '#ffb060', { cadre: '#2a2521' });
    }
    salir(g, r, 1.2);
  } else if (variante === 'beton') {
    ({ c, e, g, ge } = base('#6d7175'));
    for (let y = 0; y < T; y += 128) for (let x = 0; x < T; x += 256) {
      g.fillStyle = r() < 0.5 ? '#72767a' : '#676b6f'; g.fillRect(x, y, 256, 128);
      g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(x, y, 256, 3); g.fillRect(x, y, 3, 128);
      g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(x, y + 125, 256, 3); g.fillRect(x + 253, y, 3, 128);
    }
    for (let f = 0; f < 2; f++) {
      corniche(g, f * ET + 6, 'rgba(255,255,255,0.16)', 'rgba(0,0,0,0.3)');
      for (let k = 0; k < 3; k++) fenetre(g, ge, 40 + k * 160, 70 + f * ET, 96, 96, r, '#ffc888', { cadre: '#2e3034' });
    }
    salir(g, r, 1);
  } else if (variante === 'metal') {
    ({ c, e, g, ge } = base('#3c474f'));
    for (let x = 0; x < T; x += 16) {
      g.fillStyle = x % 32 ? '#44525c' : '#35424b'; g.fillRect(x, 0, 16, T);
      g.fillStyle = 'rgba(255,255,255,0.05)'; g.fillRect(x, 0, 3, T);
    }
    for (let y = 0; y < T; y += 64) { g.fillStyle = '#2a343c'; g.fillRect(0, y + 60, T, 4); for (let x = 8; x < T; x += 32) { g.fillStyle = '#5a6870'; g.fillRect(x, y + 58, 3, 3); } }
    for (let f = 0; f < 2; f++) {
      corniche(g, f * ET + 6, 'rgba(255,255,255,0.1)', 'rgba(0,0,0,0.35)');
      for (let k = 0; k < 4; k++) { if (r() < 0.25) continue; fenetre(g, ge, 40 + k * 122, 90 + f * ET, 54, 58, r, '#ffd090', { cadre: '#1c2328' }); }
    }
    for (let i = 0; i < 7; i++) {
      const x = r() * (T - 60), y = r() * (T - 40);
      g.fillStyle = '#20282e'; g.fillRect(x, y, 52, 36);
      g.fillStyle = '#4e5c64'; for (let l = 4; l < 36; l += 6) g.fillRect(x + 4, y + l, 44, 2.5);
    }
    salir(g, r, 0.8);
  } else {
    ({ c, e, g, ge } = base('#2b3b4a'));
    for (let y = 0; y < T; y += 128) for (let x = 0; x < T; x += 128) {
      const allume = r() < 0.32;
      const gr = g.createLinearGradient(x, y, x + 128, y + 128);
      gr.addColorStop(0, allume ? '#4a6a80' : '#2c3e52'); gr.addColorStop(0.5, allume ? '#385466' : '#1f2e3f'); gr.addColorStop(1, allume ? '#4a6a80' : '#28394c');
      g.fillStyle = gr; g.fillRect(x + 5, y + 5, 118, 118);
      g.fillStyle = 'rgba(255,255,255,0.09)'; g.fillRect(x + 10, y + 10, 50, 36);
      g.fillStyle = '#5a6c7c'; g.fillRect(x, y, 128, 5); g.fillRect(x, y, 5, 128);
      g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(x, y + 123, 128, 5); g.fillRect(x + 123, y, 5, 128);
      if (allume) { ge.fillStyle = r() < 0.5 ? '#8fd8e8' : '#ffd8a0'; ge.globalAlpha = 0.3 + r() * 0.4; ge.fillRect(x + 5, y + 5, 118, 118); ge.globalAlpha = 1; }
    }
    salir(g, r, 0.35);
  }
  return { map: tex(c), emissiveMap: tex(e) };
}

export function toit() {
  const r = rng(77); const c = toile(256, 256), g = c.getContext('2d');
  g.fillStyle = '#4c4f52'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 4000; i++) { g.fillStyle = r() < 0.5 ? '#585b5e' : '#3f4245'; g.fillRect(r() * 256, r() * 256, 2, 2); }
  for (let i = 0; i < 5; i++) { g.fillStyle = 'rgba(0,0,0,0.18)'; g.beginPath(); g.ellipse(r() * 256, r() * 256, 20 + r() * 50, 8 + r() * 24, r() * 3, 0, 6.28); g.fill(); }
  g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(0, 0, 256, 8); g.fillRect(0, 0, 8, 256);
  return tex(c);
}

export function trottoir() {
  const r = rng(31); const c = toile(128, 128), g = c.getContext('2d');
  g.fillStyle = '#74777a'; g.fillRect(0, 0, 128, 128);
  for (let y = 0; y < 128; y += 64) for (let x = 0; x < 128; x += 64) {
    g.fillStyle = r() < 0.5 ? '#787b7e' : '#6f7275'; g.fillRect(x + 2, y + 2, 60, 60);
    g.fillStyle = 'rgba(255,255,255,0.1)'; g.fillRect(x + 2, y + 2, 60, 2);
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(x + 2, y + 60, 60, 2); g.fillRect(x + 60, y + 2, 2, 60);
  }
  for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(0,0,0,${r() * 0.18})`; g.fillRect(r() * 128, r() * 128, 2 + r() * 8, 2 + r() * 8); }
  return tex(c);
}

export function asphalte() {
  const r = rng(53); const c = toile(256, 256), g = c.getContext('2d');
  g.fillStyle = '#2e3236'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 5000; i++) { g.fillStyle = r() < 0.5 ? '#35393d' : '#272b2f'; g.fillRect(r() * 256, r() * 256, 1.5, 1.5); }
  for (let i = 0; i < 10; i++) { g.fillStyle = 'rgba(0,0,0,0.2)'; g.beginPath(); g.ellipse(r() * 256, r() * 256, 20 + r() * 50, 8 + r() * 20, r() * 3, 0, 6.28); g.fill(); }
  for (let i = 0; i < 6; i++) { g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(r() * 256, r() * 256); g.lineTo(r() * 256, r() * 256); g.stroke(); }
  return tex(c);
}

export function paves() {
  const r = rng(91); const c = toile(128, 128), g = c.getContext('2d');
  g.fillStyle = '#5a5d62'; g.fillRect(0, 0, 128, 128);
  for (let y = 0; y < 128; y += 32) for (let x = (y / 32) % 2 ? -16 : 0; x < 128; x += 32) {
    g.fillStyle = r() < 0.5 ? '#767a80' : (r() < 0.5 ? '#6e7278' : '#7e8288'); g.fillRect(x + 2, y + 2, 28, 28);
    g.fillStyle = 'rgba(255,255,255,0.1)'; g.fillRect(x + 2, y + 2, 28, 2);
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x + 2, y + 28, 28, 2);
  }
  return tex(c);
}

export function herbe() {
  const r = rng(17); const c = toile(128, 128), g = c.getContext('2d');
  g.fillStyle = '#3d6b34'; g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 6000; i++) { g.fillStyle = r() < 0.5 ? '#47793a' : (r() < 0.5 ? '#35602e' : '#5a8a3c'); g.fillRect(r() * 128, r() * 128, 1.5, 2.5); }
  for (let i = 0; i < 8; i++) { g.fillStyle = 'rgba(80,60,30,0.25)'; g.beginPath(); g.ellipse(r() * 128, r() * 128, 6 + r() * 14, 3 + r() * 8, r() * 3, 0, 6.28); g.fill(); }
  return tex(c);
}

// Affiches de rue : abstraites, colorées, avec un grand glyphe. Six variantes.
const AFFICHES = [
  ['#e8503a', '#f7d774', '生'], ['#2fb8c9', '#0b1e2a', 'NEO'], ['#f2d13b', '#1a1a1a', '7'],
  ['#e84fd1', '#2a0f22', '酒'], ['#5aa9e6', '#f0f4f8', 'AI'], ['#ff9a5c', '#3a1a0a', 'BAR'],
];
export function affiche(i) {
  const [a, b, glyphe] = AFFICHES[i % AFFICHES.length];
  const c = toile(128, 192), g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 128, 192); grad.addColorStop(0, a); grad.addColorStop(1, b);
  g.fillStyle = grad; g.fillRect(0, 0, 128, 192);
  g.fillStyle = 'rgba(255,255,255,0.12)'; g.beginPath(); g.arc(64, 70, 44, 0, 6.28); g.fill();
  g.fillStyle = i % 2 ? b : '#ffffff'; g.font = 'bold 64px "Archivo", "Noto Sans CJK JP", sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(glyphe, 64, 76);
  g.fillStyle = 'rgba(255,255,255,0.85)'; g.fillRect(16, 140, 96, 4); g.fillRect(16, 152, 64, 4); g.fillRect(16, 164, 80, 4);
  g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, 0, 128, 3); g.fillRect(0, 189, 128, 3);
  return tex(c, false);
}

// Une devanture : rideau lumineux, présentoirs, un mot.
export function vitrine(couleur, mot) {
  const c = toile(384, 192), g = c.getContext('2d');
  g.fillStyle = '#0e1316'; g.fillRect(0, 0, 384, 192);
  g.fillStyle = couleur; g.globalAlpha = 0.85; g.fillRect(12, 12, 360, 168); g.globalAlpha = 1;
  g.fillStyle = 'rgba(0,0,0,0.35)'; for (let x = 40; x < 360; x += 80) g.fillRect(x, 80, 44, 80);
  g.fillStyle = 'rgba(255,255,255,0.22)'; for (let x = 40; x < 360; x += 80) g.fillRect(x + 4, 84, 36, 6);
  g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(12, 12, 360, 28);
  g.fillStyle = '#0b0e11'; g.font = 'bold 44px "Archivo", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(mot, 192, 52);
  return tex(c, false);
}
