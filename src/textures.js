// Textures peintes sur canvas : façades, toits, trottoirs, chaussée, affiches.
// Une tuile de façade couvre TUILE_M mètres de côté (256 px) : deux étages, quatre
// fenêtres, dont certaines allumées dans la carte d'émission.

import * as THREE from 'three';

const PX = 32;                 // pixels par mètre
export const TUILE_M = 6;      // mètres par tuile de façade : deux étages de 3 m

function toile(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function rng(g) { let s = g >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
function tex(c, repeat = true) {
  const t = new THREE.CanvasTexture(c);
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// Une fenêtre : cadre, vitre, parfois un store ; la version émissive n'a que la vitre allumée.
function fenetre(g, ge, x, y, w, h, r, teinte) {
  g.fillStyle = '#20201f'; g.fillRect(x - 3, y - 3, w + 6, h + 6);
  const allume = r() < 0.42;
  const store = r() < 0.25;
  g.fillStyle = allume ? (r() < 0.75 ? '#5a3a1e' : '#1f3a3c') : '#151b22';
  g.fillRect(x, y, w, h);
  if (store) { g.fillStyle = '#3a3630'; g.fillRect(x, y, w, h * (0.35 + r() * 0.4)); }
  g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(x + 2, y + 2, w * 0.4, h * 0.35);
  g.fillStyle = '#2a2a28'; g.fillRect(x + w / 2 - 1, y, 2, h); g.fillRect(x, y + h / 2 - 1, w, 2);
  if (allume) {
    const chaud = r() < 0.75;
    ge.fillStyle = chaud ? (teinte || '#ffb870') : '#6fd8d0';
    ge.globalAlpha = 0.55 + r() * 0.45;
    ge.fillRect(x, y + (store ? h * 0.5 : 0), w, store ? h * 0.5 : h);
    ge.globalAlpha = 1;
  }
}

function base(fond) {
  const c = toile(256, 256), e = toile(256, 256);   // 256 px pour une tuile de TUILE_M metres
  const g = c.getContext('2d'), ge = e.getContext('2d');
  g.fillStyle = fond; g.fillRect(0, 0, c.width, c.height);
  ge.fillStyle = '#000'; ge.fillRect(0, 0, e.width, e.height);
  return { c, e, g, ge };
}

// salissures : coulures sombres et taches, pour que rien ne soit propre
function salir(g, r, force = 1) {
  for (let i = 0; i < 26 * force; i++) {
    g.fillStyle = `rgba(0,0,0,${0.05 + r() * 0.12})`;
    const x = r() * 256, w = 2 + r() * 6, y = r() * 256, h = 20 + r() * 120;
    g.fillRect(x, y, w, h);
  }
  for (let i = 0; i < 8 * force; i++) {
    g.fillStyle = `rgba(120,70,40,${0.06 + r() * 0.12})`;
    g.beginPath(); g.ellipse(r() * 256, r() * 256, 6 + r() * 20, 4 + r() * 12, r() * 3, 0, 6.28); g.fill();
  }
}

export function facade(variante, graine) {
  const r = rng(graine);
  let c, e, g, ge;
  if (variante === 'brique') {
    ({ c, e, g, ge } = base('#5a3a30'));
    for (let y = 0; y < 256; y += 8) {
      for (let x = (y / 8) % 2 ? -12 : 0; x < 256; x += 24) {
        g.fillStyle = r() < 0.5 ? '#7a4a3c' : (r() < 0.5 ? '#6e4034' : '#845244');
        g.fillRect(x + 1, y + 1, 22, 6);
      }
    }
    for (let f = 0; f < 2; f++) for (let k = 0; k < 4; k++) fenetre(g, ge, 14 + k * 64, 22 + f * 128, 36, 60, r, '#ffb060');
    salir(g, r, 1.2);
  } else if (variante === 'beton') {
    ({ c, e, g, ge } = base('#6b6e72'));
    for (let y = 0; y < 256; y += 64) for (let x = 0; x < 256; x += 128) {
      g.fillStyle = r() < 0.5 ? '#6f7377' : '#666a6e'; g.fillRect(x, y, 128, 64);
      g.fillStyle = '#4e5256'; g.fillRect(x, y, 128, 2); g.fillRect(x, y, 2, 64);
    }
    for (let f = 0; f < 2; f++) for (let k = 0; k < 3; k++) fenetre(g, ge, 18 + k * 84, 26 + f * 128, 52, 54, r, '#ffc888');
    salir(g, r, 1);
  } else if (variante === 'metal') {
    ({ c, e, g, ge } = base('#3b464e'));
    for (let x = 0; x < 256; x += 8) { g.fillStyle = x % 16 ? '#42505a' : '#34404a'; g.fillRect(x, 0, 8, 256); }
    for (let y = 0; y < 256; y += 128) { g.fillStyle = '#2c363e'; g.fillRect(0, y + 120, 256, 6); }
    for (let f = 0; f < 2; f++) for (let k = 0; k < 4; k++) { if (r() < 0.3) continue; fenetre(g, ge, 16 + k * 64, 40 + f * 128, 30, 30, r, '#ffd090'); }
    // grilles d'aération
    for (let i = 0; i < 6; i++) { const x = r() * 220, y = r() * 220; g.fillStyle = '#20282e'; g.fillRect(x, y, 26, 18); g.fillStyle = '#4a565e'; for (let l = 2; l < 18; l += 4) g.fillRect(x + 2, y + l, 22, 1.5); }
    salir(g, r, 0.8);
  } else {
    ({ c, e, g, ge } = base('#2a3a48'));
    for (let y = 0; y < 256; y += 64) for (let x = 0; x < 256; x += 64) {
      const allume = r() < 0.35;
      g.fillStyle = allume ? '#3a5060' : (r() < 0.5 ? '#26364a' : '#22303f'); g.fillRect(x + 3, y + 3, 58, 58);
      g.fillStyle = 'rgba(255,255,255,0.06)'; g.fillRect(x + 6, y + 6, 24, 20);
      g.fillStyle = '#4a5a6a'; g.fillRect(x, y, 64, 3); g.fillRect(x, y, 3, 64);
      if (allume) { ge.fillStyle = r() < 0.5 ? '#8fd8e8' : '#ffd8a0'; ge.globalAlpha = 0.35 + r() * 0.4; ge.fillRect(x + 3, y + 3, 58, 58); ge.globalAlpha = 1; }
    }
    salir(g, r, 0.4);
  }
  return { map: tex(c), emissiveMap: tex(e) };
}

export function toit() {
  const r = rng(77); const c = toile(128, 128), g = c.getContext('2d');
  g.fillStyle = '#4a4d50'; g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 900; i++) { g.fillStyle = r() < 0.5 ? '#54575a' : '#404346'; g.fillRect(r() * 128, r() * 128, 2, 2); }
  g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, 0, 128, 6); g.fillRect(0, 0, 6, 128);
  const t = tex(c); return t;
}

export function trottoir() {
  const r = rng(31); const c = toile(64, 64), g = c.getContext('2d');
  g.fillStyle = '#6e7174'; g.fillRect(0, 0, 64, 64);
  g.fillStyle = '#585b5e'; g.fillRect(0, 0, 64, 2); g.fillRect(0, 0, 2, 64); g.fillRect(32, 0, 2, 64); g.fillRect(0, 32, 64, 2);
  for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(0,0,0,${r() * 0.2})`; g.fillRect(r() * 64, r() * 64, 2 + r() * 6, 2 + r() * 6); }
  return tex(c);
}

export function asphalte() {
  const r = rng(53); const c = toile(128, 128), g = c.getContext('2d');
  g.fillStyle = '#2e3236'; g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 1400; i++) { g.fillStyle = r() < 0.5 ? '#34383c' : '#282c30'; g.fillRect(r() * 128, r() * 128, 1.5, 1.5); }
  for (let i = 0; i < 6; i++) { g.fillStyle = 'rgba(0,0,0,0.18)'; g.beginPath(); g.ellipse(r() * 128, r() * 128, 10 + r() * 24, 4 + r() * 10, r() * 3, 0, 6.28); g.fill(); }
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
  // coins déchirés et scotch
  g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, 0, 128, 3); g.fillRect(0, 189, 128, 3);
  return tex(c, false);
}

// Une vitrine de commerce : rideau lumineux, présentoirs, un mot.
export function vitrine(couleur, mot) {
  const c = toile(192, 96), g = c.getContext('2d');
  g.fillStyle = '#0e1316'; g.fillRect(0, 0, 192, 96);
  g.fillStyle = couleur; g.globalAlpha = 0.85; g.fillRect(6, 6, 180, 84); g.globalAlpha = 1;
  g.fillStyle = 'rgba(0,0,0,0.35)'; for (let x = 20; x < 180; x += 40) g.fillRect(x, 40, 22, 40);
  g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(6, 6, 180, 14);
  g.fillStyle = '#0b0e11'; g.font = 'bold 22px "Archivo", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(mot, 96, 26);
  return tex(c, false);
}
