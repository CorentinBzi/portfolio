// QUARTIER 2 — THALES — verbe INSTRUMENTER — « La salle de stockage »
//
// Une salle de serveurs en légère plongée : six baies de stockage, chacune une
// tour de verre dont le liquide monte en temps réel. Chaque baie a son
// comportement (dents de scie d'une sauvegarde, sinusoïde d'un cache, paliers
// d'une fuite, plat d'une baie morte, droite lente, à-coups). Au repos on ne
// voit que la hauteur du liquide, et ça trompe. Trois sondes : on clique une
// baie pour y poser une sonde, une jauge flottante dessine la courbe et sa
// projection. Deux manches pour désigner la baie qui saturera en premier, puis
// une manche pour régler un seuil d'alerte et voir les voyants se déclencher.
// Simulation déterministe (graine fixe) ; un facteur de temps interne permet à
// resoudre() de jouer en accéléré par les mêmes gestes que le joueur.

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { creerCadre, creerLateral, attendre } from './_contrat.js';

const FENETRE = 30;            // secondes visibles de chaque côté de « maintenant »
const RELEVE = 4;              // période du relevé manuel, sans sonde
const NB_SONDES = 3;
const MIN_MESURE = 5;          // secondes de sonde avant d'oser une projection
const MAX_REGRESSION = 40;     // profondeur maximale de la projection
const DELAI_INTERVENTION = 15; // secondes qu'il faut à l'équipe pour agir
const HORIZON = 300;           // secondes simulées au maximum
const VITESSE_RAPIDE = 8;      // avance rapide après la désignation
const VITESSE_ALERTE = 12;     // avance rapide de la manche du seuil
const TICK_MS = 33;
const SOUS_PAS = 0.5;          // pas maximal de simulation entre deux vérifications d'alerte
const SEUIL_MIN = 50, SEUIL_MAX = 99, SEUIL_DEPART = 75;
const MANCHES_POUR_GAGNER = 2;

// géométrie de la salle
const ECART = 2.4, RAYON = 0.55, HAUT_VERRE = 2.8, SOCLE_H = 0.3, HAUT_MAX = HAUT_VERRE - 0.1;
// deux rangées de jauges : une baie sondée prend la rangée haute si sa voisine de gauche occupe la basse
const Y_JAUGE = [4.25, 6.0], ECH_JAUGE = [3.6, 1.8], ECH_PLAQUE = [1.9, 0.5];
const JAUGE_W = 560, JAUGE_H = 280, PLAQUE_W = 304, PLAQUE_H = 80;
const Y_CAPOT = SOCLE_H + 0.1 + HAUT_VERRE + 0.14;
const DEMI_RANGEE = 7.8;       // demi-largeur à garder dans le cadre (six baies et leurs jauges)
const ROUGE = '#E8503A', VERT = '#6FCF8E', TEXTE = '#C8D3DA', SECONDAIRE = '#7A8A96', FOND = '#07090C';
const NB_VOYANTS = 48;

// ---------------------------------------------------------------------------
// Comportements. Chaque fabrique reçoit ses paramètres et rend t -> % rempli.
// ---------------------------------------------------------------------------

function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function tableAleatoire(p, graine) {
  const alea = mulberry32(graine);
  const table = [p.base];
  for (let k = 1; k <= HORIZON + 1; k++) {
    const saut = alea() < 0.3 ? (alea() - 0.45) * 18 : (alea() - 0.5) * 1.2;
    table.push(Math.min(p.max, Math.max(p.min, table[k - 1] + saut)));
  }
  return table;
}

const COMPORTEMENTS = {
  sauvegarde: { nom: 'sauvegarde nocturne', forme: 'dents de scie', pourquoi: 'monte pendant l’écriture, se vide à chaque rotation : jamais pleine',
    f: p => t => p.base + p.amp * ((t % p.periode) / p.periode) },
  cache: { nom: 'cache', forme: 'sinusoïde', pourquoi: 'respire, monte et redescend : jamais pleine',
    f: p => t => p.base + p.amp * Math.sin(2 * Math.PI * t / p.periode) },
  fuite: { nom: 'fuite applicative', forme: 'paliers', pourquoi: 'chaque palier reste acquis, rien ne redescend',
    f: p => t => p.base + p.pas * Math.floor(t / p.periode) },
  mort: { nom: 'baie morte', forme: 'plat', pourquoi: 'plus aucune écriture : haute, mais immobile',
    f: p => () => p.base },
  croissance: { nom: 'croissance régulière', forme: 'droite', pourquoi: 'lente mais sans retour',
    f: p => t => p.base + p.pente * t },
  aleatoire: { nom: 'à-coups', forme: 'bruit', pourquoi: 'bruyante, sans tendance : jamais pleine',
    f: (p, graine) => { const table = tableAleatoire(p, graine); return t => table[Math.min(Math.floor(t), HORIZON)]; } },
};

// Trois manches. Le nom des baies ne trahit rien : seule la courbe parle.
const MANCHES = [
  { graine: 11, mode: 'designer', baies: [
    { nom: 'baie-01', taille: '4 To', type: 'mort', p: { base: 93 } },
    { nom: 'baie-02', taille: '2 To', type: 'sauvegarde', p: { base: 50, amp: 36, periode: 9 } },
    { nom: 'baie-03', taille: '8 To', type: 'fuite', p: { base: 44, pas: 7, periode: 5 } },        // pleine à 40 s
    { nom: 'baie-04', taille: '1 To', type: 'cache', p: { base: 62, amp: 14, periode: 10 } },
    { nom: 'baie-05', taille: '6 To', type: 'croissance', p: { base: 68, pente: 0.45 } },        // pleine à 71 s
    { nom: 'baie-06', taille: '2 To', type: 'aleatoire', p: { base: 45, min: 30, max: 88 } },
  ] },
  { graine: 23, mode: 'designer', baies: [
    { nom: 'baie-01', taille: '2 To', type: 'sauvegarde', p: { base: 58, amp: 38, periode: 10 } },
    { nom: 'baie-02', taille: '4 To', type: 'mort', p: { base: 88 } },
    { nom: 'baie-03', taille: '1 To', type: 'aleatoire', p: { base: 55, min: 35, max: 90 } },
    { nom: 'baie-04', taille: '8 To', type: 'fuite', p: { base: 40, pas: 5, periode: 6 } },        // pleine à 72 s
    { nom: 'baie-05', taille: '6 To', type: 'croissance', p: { base: 60, pente: 1.0 } },         // pleine à 40 s
    { nom: 'baie-06', taille: '2 To', type: 'cache', p: { base: 50, amp: 20, periode: 8 } },
  ] },
  { graine: 37, mode: 'seuil', baies: [
    { nom: 'baie-01', taille: '2 To', type: 'sauvegarde', p: { base: 46, amp: 38, periode: 9 } },
    { nom: 'baie-02', taille: '6 To', type: 'croissance', p: { base: 62, pente: 0.35 } },        // pleine à 109 s
    { nom: 'baie-03', taille: '4 To', type: 'mort', p: { base: 82 } },
    { nom: 'baie-04', taille: '1 To', type: 'cache', p: { base: 60, amp: 16, periode: 10 } },
    { nom: 'baie-05', taille: '2 To', type: 'aleatoire', p: { base: 50, min: 30, max: 80 } },
    { nom: 'baie-06', taille: '8 To', type: 'fuite', p: { base: 30, pas: 4, periode: 8 } },
  ] },
];

function borner(x) { return Math.max(0, Math.min(100, x)); }

function premierInstant(f, seuil) {
  for (let k = 0; k <= HORIZON * 10; k++) { const t = k / 10; if (f(t) >= seuil - 1e-9) return t; }
  return Infinity;
}

function construireBaies(manche) {
  return manche.baies.map((d, i) => {
    const comportement = COMPORTEMENTS[d.type];
    const brut = comportement.f(d.p, manche.graine * 7 + i);
    const f = t => borner(brut(Math.max(0, t)));
    return { ...d, i, f, comportement, tSat: premierInstant(f, 100), sonde: null };
  });
}

function baiePremiere(baies) { return baies.reduce((a, b) => (b.tSat < a.tSat ? b : a)); }

// Régression linéaire sur l'historique de la sonde : pente en %/s.
function projeter(v, ts) {
  const debut = Math.max(v.sonde, ts - MAX_REGRESSION);
  if (ts - debut < MIN_MESURE) return null;
  let n = 0, sx = 0, sy = 0, sxx = 0, sxy = 0;
  for (let t = debut; t <= ts; t += 0.25) { const y = v.f(t); n++; sx += t; sy += y; sxx += t * t; sxy += t * y; }
  const pente = (n * sxy - sx * sy) / (n * sxx - sx * sx || 1);
  const valeur = v.f(ts);
  return { pente, eta: pente > 0.02 ? (100 - valeur) / pente : Infinity, valeur };
}

function evaluerSeuil(baies, seuil) {
  const premier = baiePremiere(baies);
  const alertes = baies.map(v => ({ v, t: premierInstant(v.f, seuil) })).filter(a => a.t < premier.tSat);
  const fausses = alertes.filter(a => a.v.tSat === Infinity);
  const vraie = alertes.find(a => a.v === premier);
  const marge = vraie ? premier.tSat - vraie.t : 0;
  return { premier, alertes, fausses, marge, ok: fausses.length === 0 && marge >= DELAI_INTERVENTION };
}

function seuilsAcceptables(baies) {
  const ok = [];
  for (let s = SEUIL_MIN; s <= SEUIL_MAX; s++) if (evaluerSeuil(baies, s).ok) ok.push(s);
  return ok;
}

function secondes(t) { return `t+${Math.round(t)} s`; }
const POLICE = '"IBM Plex Mono",ui-monospace,Menlo,monospace';
const POLICE_TITRE = '"Archivo",system-ui,sans-serif';

// ---------------------------------------------------------------------------
// Textures dessinées : halo, sol, jauges.
// ---------------------------------------------------------------------------

function textureHalo() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 2, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

function textureSol() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#0B1117'; ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = '#1E2E38'; ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, 254, 254);
  ctx.strokeStyle = '#151F27'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(128, 0); ctx.lineTo(128, 256); ctx.moveTo(0, 128); ctx.lineTo(256, 128); ctx.stroke();
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(14, 9); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function textureRack() {
  const c = document.createElement('canvas'); c.width = 128; c.height = 256;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#0d151b'; ctx.fillRect(0, 0, 128, 256);
  for (let y = 6; y < 256; y += 16) {
    ctx.fillStyle = '#060b0f'; ctx.fillRect(6, y, 116, 9);
    ctx.fillStyle = '#1d2f39'; ctx.fillRect(6, y + 9, 116, 2);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

const CSS = `
.th-scene{flex:1;min-width:0;min-height:0;position:relative;background:${FOND};overflow:hidden}
.th-scene canvas{position:absolute;inset:0;display:block;touch-action:manipulation}
.th-scene canvas.sur{cursor:pointer}
.th-sur{position:absolute;inset:0;pointer-events:none;overflow:hidden}
.th-designer{position:absolute;transform:translate(-50%,0);pointer-events:auto;font:600 10.5px/1 ${POLICE};
  letter-spacing:.08em;text-transform:uppercase;color:#07090C;background:var(--acc);border:0;border-radius:2px;
  padding:7px 11px;cursor:pointer;box-shadow:0 0 16px rgba(79,198,212,.45);white-space:nowrap}
.th-designer[hidden]{display:none}
.th-designer:hover{filter:brightness(1.12)}
.th-designer:focus-visible{outline:2px solid #7FA3FF;outline-offset:2px}
.th-legende{position:absolute;left:14px;bottom:10px;font-size:11px;color:#5E6C78;pointer-events:none;line-height:1.5}
.th-diag{display:none}
.jx-lat.th-lat{width:min(34%,340px)}
.th-sondes{display:flex;gap:6px;align-items:center;font-size:12px}
.th-sondes i{width:10px;height:10px;border-radius:50%;border:1px solid var(--acc);display:inline-block}
.th-sondes i.on{background:var(--acc);box-shadow:0 0 8px var(--acc)}
.th-liste{margin:0;padding:0;list-style:none;font-size:12px}
.th-liste li{padding:3px 0;border-top:1px solid #1B232B}
.th-liste li.acc{color:var(--acc)}.th-liste li.ko{color:${ROUGE}}.th-liste li.ok{color:${VERT}}.th-liste li.dim{color:${SECONDAIRE}}
.th-range{width:100%;accent-color:var(--acc);margin:6px 0;display:block}
.th-sv{color:var(--acc);font-size:15px}
.th-p-ok{color:${VERT}}.th-p-ko{color:${ROUGE}}
@media (max-width:760px){
  .jx-lat.th-lat{width:auto}
  .th-legende{display:none}
}`;

export default {
  id: 'thales',
  ordre: 2,
  titre: 'La salle de stockage',
  employeur: 'THALES',
  annees: '2020 - 2021',
  factKey: 'thales',
  verbe: 'INSTRUMENTER',
  accent: '#4FC6D4',
  description: "Six baies de stockage se remplissent, chacune à sa façon. Trois sondes pour lire les courbes et désigner celle qui saturera en premier, puis un seuil d'alerte à régler : assez tôt, sans crier au loup.",

  monter(conteneur, api) {
    const accent = api.accent;
    const cadre = creerCadre(conteneur, {
      titre: 'La salle de stockage', employeur: 'THALES', annees: '2020 - 2021', verbe: 'INSTRUMENTER', accent,
      consigne: "Clique une baie pour y poser une sonde, lis la courbe, puis « Désigner » celle qui saturera en premier, avant qu'elle sature.",
    });
    const style = document.createElement('style');
    style.textContent = CSS;
    cadre.racine.prepend(style);
    const scene2d = document.createElement('div');
    scene2d.className = 'th-scene';
    const sur = document.createElement('div');
    sur.className = 'th-sur';
    const legende = document.createElement('div');
    legende.className = 'th-legende';
    legende.textContent = 'clic sur une baie : sonde · jauge : courbe mesurée et projection en pointillés';
    const diag = document.createElement('pre');
    diag.className = 'th-diag';
    scene2d.append(sur, legende, diag);
    cadre.corps.appendChild(scene2d);
    const lat = creerLateral(cadre.corps);
    lat.el.classList.add('th-lat');
    cadre.bouton('Abandonner', () => api.abandonner());

    let vivant = true, manche = 0, score = 0, ts = 0, vitesse = 1, phase = 'jeu', horlogeScene = 0;
    let baies = [], premier = null, choix = null, seuil = SEUIL_DEPART, alertes = [], margeFinale = 0;
    let carteSondes = null, carteResultat = null, carteJournal = null, derniereSeconde = -1, survol = null;
    let precedent = performance.now(), dernierRendu = 0, compteur = 0;

    // ----- la salle ----------------------------------------------------------

    // en headless (recette, captures), le rendu logiciel est lent : on rend à l'horloge, pas à chaque image
    const HEADLESS = /HeadlessChrome/.test(navigator.userAgent);
    const INTERVALLE_RENDU = HEADLESS ? 400 : 250;
    let renderer = null, composer = null;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' }); }
    catch (e) { diag.textContent = 'WebGL indisponible : ' + e.message; }
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(FOND);
    scene.fog = new THREE.FogExp2(FOND, 0.032);
    const camera = new THREE.PerspectiveCamera(44, 1, 0.1, 80);
    const VISEE = new THREE.Vector3(0, 3.0, 0);
    const halo = textureHalo();
    const couleurAccent = new THREE.Color(accent);
    const COULEUR_PLEIN = new THREE.Color(0xd8fbff);
    const materiaux = {
      socle: new THREE.MeshStandardMaterial({ color: 0x151d24, metalness: 0.75, roughness: 0.4 }),
      capot: new THREE.MeshStandardMaterial({ color: 0x1d2831, metalness: 0.8, roughness: 0.35 }),
      verre: new THREE.MeshPhysicalMaterial({ color: 0x9fdde6, transparent: true, opacity: 0.14, roughness: 0.12, metalness: 0.05,
        clearcoat: 1, clearcoatRoughness: 0.1, side: THREE.DoubleSide, depthWrite: false }),
      cable: new THREE.MeshStandardMaterial({ color: 0x1b2730, metalness: 0.4, roughness: 0.7 }),
      rail: new THREE.MeshStandardMaterial({ color: 0x0f161c, metalness: 0.7, roughness: 0.5 }),
      neon: new THREE.MeshBasicMaterial({ color: couleurAccent }),
      mur: new THREE.MeshStandardMaterial({ color: 0x0a1015, metalness: 0.3, roughness: 0.9 }),
      rack: new THREE.MeshStandardMaterial({ map: textureRack(), metalness: 0.6, roughness: 0.5, emissive: 0x0b1b22, emissiveIntensity: 1 }),
    };
    const geometries = {
      socle: new THREE.BoxGeometry(1.5, SOCLE_H, 1.5),
      verre: new THREE.CylinderGeometry(RAYON, RAYON, HAUT_VERRE, 40, 1, true).translate(0, HAUT_VERRE / 2, 0),
      liquide: new THREE.CylinderGeometry(RAYON - 0.07, RAYON - 0.07, 1, 32).translate(0, 0.5, 0),
      capot: new THREE.CylinderGeometry(RAYON + 0.08, RAYON + 0.04, 0.14, 40),
      pied: new THREE.CylinderGeometry(RAYON + 0.1, RAYON + 0.14, 0.1, 40),
      led: new THREE.SphereGeometry(0.05, 12, 12),
      bague: new THREE.TorusGeometry(RAYON + 0.06, 0.035, 10, 48),
      anneau: new THREE.TorusGeometry(RAYON + 0.36, 0.05, 8, 64),
      voyant: new THREE.PlaneGeometry(0.12, 0.12),
      tige: new THREE.CylinderGeometry(0.022, 0.022, 1, 8).translate(0, 0.5, 0),
    };

    const racks = [];
    const groupeBaies = new THREE.Group();
    scene.add(groupeBaies);
    construireSalle();

    function construireSalle() {
      scene.add(new THREE.AmbientLight(0x243740, 1.5));
      scene.add(new THREE.HemisphereLight(0x2b5c66, 0x05070a, 1.1));
      const cle = new THREE.DirectionalLight(0x9ef0f6, 1.7); cle.position.set(5, 9, 7); scene.add(cle);
      // un remplissage chaud de fin de journée par la porte, et un contre-jour violet : le métal prend de la couleur
      const chaud = new THREE.PointLight(0xffb454, 60, 30, 2); chaud.position.set(9, 3.5, 6); scene.add(chaud);
      const contre = new THREE.DirectionalLight(0x6a4aa8, 1.4); contre.position.set(-6, 6, -8); scene.add(contre);
      // sol : métal sombre, légèrement translucide pour laisser passer le reflet dessiné dessous
      const sol = new THREE.Mesh(new THREE.PlaneGeometry(44, 28),
        new THREE.MeshStandardMaterial({ map: textureSol(), color: 0xd0dde6, metalness: 0.65, roughness: 0.28, transparent: true, opacity: 0.7 }));
      sol.rotation.x = -Math.PI / 2; sol.position.z = -4; scene.add(sol);
      // mur du fond et racks à voyants
      const mur = new THREE.Mesh(new THREE.PlaneGeometry(44, 12), materiaux.mur); mur.position.set(0, 6, -6.5); scene.add(mur);
      const alea = mulberry32(2020);
      for (const x of [-6.5, -2.2, 2.2, 6.5]) construireRack(x, alea);
      // rail de plafond avec un néon
      const rail = new THREE.Mesh(new THREE.BoxGeometry(18, 0.14, 0.6), materiaux.rail); rail.position.set(0, 6.05, -2.2); scene.add(rail);
      const neon = new THREE.Mesh(new THREE.BoxGeometry(17.4, 0.03, 0.12), materiaux.neon); neon.position.set(0, 5.97, -2.2); scene.add(neon);
      const plafonnier = new THREE.PointLight(couleurAccent, 40, 22, 2); plafonnier.position.set(0, 5.8, -2); scene.add(plafonnier);
      // une lisse lumineuse au pied du mur, comme dans les allées d'une salle machine
      const lisse = new THREE.Mesh(new THREE.BoxGeometry(20, 0.04, 0.08), materiaux.neon); lisse.position.set(0, 0.03, -5.55); scene.add(lisse);
      const luLisse = new THREE.PointLight(couleurAccent, 25, 14, 2); luLisse.position.set(0, 0.6, -5); scene.add(luLisse);
      // trois câbles de tronc le long du mur
      for (const k of [0, 1, 2]) {
        const y = 4.2 + k * 0.22;
        const t = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
          new THREE.Vector3(-9, y, -5.9), new THREE.Vector3(-3, y - 0.25, -5.85), new THREE.Vector3(3, y - 0.18, -5.85), new THREE.Vector3(9, y, -5.9)]), 40, 0.04, 8), materiaux.cable);
        scene.add(t);
      }
    }

    function construireRack(x, alea) {
      const rack = new THREE.Mesh(new THREE.BoxGeometry(3.2, 5.2, 0.7), materiaux.rack);
      rack.position.set(x, 2.6, -6); scene.add(rack);
      const voyants = new THREE.InstancedMesh(geometries.voyant, new THREE.MeshBasicMaterial({ vertexColors: false }), NB_VOYANTS);
      const m = new THREE.Matrix4();
      const couleurs = [new THREE.Color(0x1f6b73), new THREE.Color(0x1f6b73), new THREE.Color(accent), new THREE.Color(VERT), new THREE.Color(0x0e2a30)];
      for (let k = 0; k < NB_VOYANTS; k++) {
        const col = k % 8, ligne = Math.floor(k / 8);
        m.makeTranslation(x - 1.25 + col * 0.36, 0.7 + ligne * 0.62, -5.64);
        voyants.setMatrixAt(k, m);
        voyants.setColorAt(k, couleurs[Math.floor(alea() * couleurs.length)]);
      }
      voyants.userData.alea = alea;
      voyants.userData.couleurs = couleurs;
      scene.add(voyants);
      racks.push(voyants);
    }
    function clignoter() {
      for (const r of racks) {
        const { alea, couleurs } = r.userData;
        for (let n = 0; n < 3; n++) r.setColorAt(Math.floor(alea() * NB_VOYANTS), couleurs[Math.floor(alea() * couleurs.length)]);
        r.instanceColor.needsUpdate = true;
      }
    }

    // Une baie : socle, verre, liquide, halo, voyant, bague de sonde, anneau d'alerte, jauge, plaque, lumière.
    function construireBaie(v) {
      const x = (v.i - (MANCHES[manche].baies.length - 1) / 2) * ECART;
      const g = new THREE.Group(); g.position.x = x;
      const corps = new THREE.Group(); corps.name = 'corps';
      const socle = new THREE.Mesh(geometries.socle, materiaux.socle); socle.position.y = SOCLE_H / 2; socle.userData.baie = v;
      const pied = new THREE.Mesh(geometries.pied, materiaux.capot); pied.position.y = SOCLE_H + 0.05;
      const matLiquide = new THREE.MeshStandardMaterial({ color: couleurAccent, emissive: couleurAccent, emissiveIntensity: 1.1, roughness: 0.25, metalness: 0.1, transparent: true, opacity: 0.94 });
      const liquide = new THREE.Mesh(geometries.liquide, matLiquide); liquide.name = 'liquide'; liquide.position.y = SOCLE_H + 0.1;
      const verre = new THREE.Mesh(geometries.verre, materiaux.verre.clone()); verre.name = 'verre'; verre.position.y = SOCLE_H + 0.1; verre.userData.baie = v; verre.renderOrder = 2;
      const capot = new THREE.Mesh(geometries.capot, materiaux.capot); capot.position.y = SOCLE_H + 0.1 + HAUT_VERRE + 0.07; capot.userData.baie = v;
      const led = new THREE.Mesh(geometries.led, new THREE.MeshBasicMaterial({ color: VERT })); led.name = 'led'; led.position.set(0.55, SOCLE_H + 0.02, 0.62);
      const haloS = new THREE.Sprite(new THREE.SpriteMaterial({ map: halo, color: couleurAccent, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.55 }));
      haloS.name = 'halo'; haloS.scale.set(2.2, 2.2, 1);
      const bague = new THREE.Mesh(geometries.bague, new THREE.MeshBasicMaterial({ color: couleurAccent })); bague.name = 'bague'; bague.rotation.x = Math.PI / 2; bague.visible = false;
      const anneau = new THREE.Mesh(geometries.anneau, new THREE.MeshBasicMaterial({ color: ROUGE, transparent: true, opacity: 0.9 })); anneau.name = 'anneau'; anneau.rotation.x = Math.PI / 2; anneau.position.y = SOCLE_H + 0.12; anneau.visible = false;
      corps.add(socle, pied, liquide, verre, capot, led, haloS, bague, anneau);
      const reflet = corps.clone(); reflet.scale.y = -1; reflet.name = 'reflet';
      reflet.traverse(o => { if (o.material && o.material.transparent && o.name !== 'halo') o.material = o.material.clone(); });
      const lumiere = new THREE.PointLight(couleurAccent, 2, 5.5, 2); lumiere.name = 'lumiere';
      const cable = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, SOCLE_H + HAUT_VERRE + 0.2, -0.3), new THREE.Vector3(0.35, SOCLE_H + HAUT_VERRE + 0.75, -1.6),
        new THREE.Vector3(0.1, 4.25 + (v.i % 3) * 0.22, -3.6), new THREE.Vector3(0, 4.2 + (v.i % 3) * 0.22, -5.8)]), 36, 0.035, 8), materiaux.cable);
      // les jauges des baies du bord sont ramenées vers le centre pour rester dans le cadre
      const decalage = v.i === 0 ? 0.7 : v.i === MANCHES[manche].baies.length - 1 ? -0.7 : 0;
      const jauge = creerSprite(JAUGE_W, JAUGE_H, ECH_JAUGE); jauge.sprite.position.set(decalage, Y_JAUGE[0], 0.9); jauge.sprite.visible = false;
      const tige = new THREE.Mesh(geometries.tige, new THREE.MeshBasicMaterial({ color: couleurAccent, transparent: true, opacity: 0.75 }));
      tige.position.set(0, Y_CAPOT, 0.9); tige.visible = false;
      const plaque = creerSprite(PLAQUE_W, PLAQUE_H, ECH_PLAQUE); plaque.sprite.position.set(0, SOCLE_H + HAUT_VERRE + 0.55, 0.4);
      g.add(corps, reflet, lumiere, cable, tige, jauge.sprite, plaque.sprite);
      const bouton = document.createElement('button');
      bouton.className = 'th-designer'; bouton.textContent = 'Désigner'; bouton.hidden = true; bouton.dataset.baie = v.i;
      bouton.addEventListener('click', () => designer(v));
      sur.appendChild(bouton);
      reflet.getObjectByName('bague').visible = false;
      v.m = { g, x, decalage, liquide, verre, led, halo: haloS, bague, anneau, lumiere, jauge, plaque, bouton, tige, rangee: 0,
        refletLiquide: reflet.getObjectByName('liquide'), refletHalo: reflet.getObjectByName('halo'), refletLed: reflet.getObjectByName('led'),
        refletAnneau: reflet.getObjectByName('anneau'), derniereValeur: -1 };
      groupeBaies.add(g);
    }

    function creerSprite(w, h, ech) {
      const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
      const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 4;
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false, fog: false }));
      sprite.scale.set(ech[0], ech[1], 1); sprite.renderOrder = 10;
      return { canvas, ctx: canvas.getContext('2d'), texture, sprite };
    }

    // Libère ce qui est propre à chaque baie ; les géométries et matériaux partagés restent.
    const partages = new Set([...Object.values(materiaux), ...Object.values(geometries)]);
    function viderBaies() {
      for (const v of baies) {
        if (!v.m) continue;
        v.m.bouton.remove();
        v.m.g.traverse(o => {
          if (o.geometry && !partages.has(o.geometry)) o.geometry.dispose();
          if (o.material && !partages.has(o.material)) { if (o.material.map && o.material.map !== halo) o.material.map.dispose(); o.material.dispose(); }
        });
      }
      groupeBaies.clear();
    }

    // ----- rendu -------------------------------------------------------------

    if (renderer) {
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.3;
      scene2d.prepend(renderer.domElement);
      // le rendu logiciel headless ne sort rien du composer : rendu direct dans ce cas
      if (!HEADLESS) {
        composer = new EffectComposer(renderer);
        composer.addPass(new RenderPass(scene, camera));
        composer.addPass(new UnrealBloomPass(new THREE.Vector2(1, 1), 0.5, 0.55, 0.72));
        composer.addPass(new OutputPass());
      }
    }

    function redimensionner() {
      const w = Math.max(1, scene2d.clientWidth), h = Math.max(1, scene2d.clientHeight);
      const aspect = w / h;
      // champ horizontal constant tant que le format le permet ; en portrait, la caméra recule plutôt que d'ouvrir l'angle
      const fov = THREE.MathUtils.clamp(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(22)) * 2.09 / aspect) * 180 / Math.PI, 28, 66);
      const distance = Math.max(10, DEMI_RANGEE / (Math.tan(THREE.MathUtils.degToRad(fov / 2)) * aspect));
      camera.fov = fov;
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
      const dir = new THREE.Vector3(0, 0.34, 1).normalize();
      camera.position.copy(VISEE).addScaledVector(dir, distance);
      camera.lookAt(VISEE);
      if (renderer) { renderer.setSize(w, h, false); renderer.domElement.style.width = w + 'px'; renderer.domElement.style.height = h + 'px'; }
      if (composer) composer.setSize(w, h);
      rendre();
    }
    const observateur = new ResizeObserver(redimensionner);
    observateur.observe(scene2d);

    function rendre() {
      if (!renderer || !vivant) return;
      if (composer) composer.render(); else renderer.render(scene, camera);
      dernierRendu = performance.now();
      if ((compteur++ & 31) === 0) diag.textContent = `appels de dessin : ${renderer.info.render.calls} · triangles : ${renderer.info.render.triangles}`;
    }

    // ----- construction d'une manche -----------------------------------------

    function ouvrirManche(k) {
      manche = k;
      const m = MANCHES[k];
      viderBaies();
      baies = construireBaies(m);
      premier = baiePremiere(baies);
      ts = 0; choix = null; alertes = []; seuil = SEUIL_DEPART; derniereSeconde = -1; survol = null;
      phase = m.mode === 'seuil' ? 'seuil' : 'jeu';
      if (m.mode === 'seuil') baies.forEach(v => { v.sonde = 0; });
      for (const v of baies) construireBaie(v);
      majSonde3d(baies[0]);
      lat.vider();
      if (m.mode === 'seuil') cartesSeuil(); else cartesDesignation();
      majStatut(true);
      mettreAJourScene(0);
      rendre();
    }

    function cartesDesignation() {
      lat.carte(`Manche ${manche + 1} sur ${MANCHES.length} · qui sature en premier ?`,
        `<p>Six baies, trois sondes. Sans sonde, le niveau n'est relevé que toutes les ${RELEVE} s : un chiffre, pas une tendance.</p>
         <p>Une sonde dessine la courbe en direct et projette la tendance. Désigne la baie qui saturera <b>en premier</b>, avant qu'elle sature.</p>`);
      carteSondes = lat.carte('Sondes', '<div class="th-sondes"></div>');
      lat.carte('Lecture', `<p><span style="color:${accent}">trait plein</span> : mesure · <span style="color:${SECONDAIRE}">pointillé</span> : projection linéaire sur l'historique de la sonde · cliquer à nouveau la baie retire la sonde.</p>`);
      majSondes();
    }

    function cartesSeuil() {
      lat.carte(`Manche 3 sur ${MANCHES.length} · le seuil d'alerte`,
        `<p>Toutes les sondes sont posées : c'est le tableau de bord complet. Règle le seuil qui allume le voyant rouge.</p>
         <p>Une intervention prend <b>${DELAI_INTERVENTION} s</b>. Trop bas : fausses alertes sur les baies qui respirent. Trop haut : l'alerte arrive trop tard.</p>`);
      const c = lat.carte('Seuil',
        `<p>Alerte à partir de <b class="th-sv">${seuil} %</b></p>
         <input class="th-range" type="range" min="${SEUIL_MIN}" max="${SEUIL_MAX}" step="1" value="${seuil}" aria-label="seuil d'alerte en pourcentage">
         <button class="jx-btn fort th-armer">Armer l'alerte</button>`);
      const range = c.querySelector('.th-range');
      range.addEventListener('input', () => { seuil = Number(range.value); c.querySelector('.th-sv').textContent = seuil + ' %'; majStatut(true); });
      c.querySelector('.th-armer').addEventListener('click', armer);
      carteJournal = lat.carte('Journal des alertes', '<ul class="th-liste"><li class="dim">— en attente d’armement —</li></ul>');
    }

    // ----- interactions ------------------------------------------------------

    function sondesPosees() { return baies.filter(v => v.sonde !== null).length; }

    function basculerSonde(v) {
      if (!vivant || phase !== 'jeu') return;
      if (v.sonde !== null) v.sonde = null;
      else if (sondesPosees() < NB_SONDES) v.sonde = ts;
      else { cadre.statut(`Trois sondes seulement : retire-en une (clique à nouveau sa baie) avant d'en poser une autre.`, 'ko'); return; }
      majSonde3d(v);
      majSondes();
      majStatut(true);
    }

    // Place la jauge de chaque baie sondée : rangée basse, ou haute si la voisine de gauche occupe déjà la basse.
    function majSonde3d(v) {
      v.m.derniereValeur = -1;
      let precedente = null;
      for (const b of baies) {
        const m = b.m, posee = b.sonde !== null;
        m.rangee = posee && precedente && precedente.i === b.i - 1 && precedente.m.rangee === 0 ? 1 : 0;
        if (posee) precedente = b;
        m.bague.visible = posee;
        m.bague.position.y = SOCLE_H + 0.1 + HAUT_VERRE * 0.78;
        m.jauge.sprite.visible = posee;
        m.jauge.sprite.position.y = Y_JAUGE[m.rangee];
        m.tige.visible = posee;
        m.tige.scale.y = Math.max(0.05, Y_JAUGE[m.rangee] - ECH_JAUGE[1] / 2 - Y_CAPOT);
        m.plaque.sprite.visible = !posee;
      }
    }

    function majSondes() {
      if (!carteSondes) return;
      const n = sondesPosees();
      const points = Array.from({ length: NB_SONDES }, (_, k) => `<i class="${k < n ? 'on' : ''}"></i>`).join('');
      const reste = NB_SONDES - n;
      carteSondes.querySelector('.th-sondes').innerHTML = `${points}<span>${reste ? reste + ' disponible' + (reste > 1 ? 's' : '') : 'toutes posées'}</span>`;
    }

    function designer(v) {
      if (!vivant || phase !== 'jeu') return;
      choix = v;
      phase = 'rapide';
      for (const b of baies) b.m.bouton.hidden = true;
      cadre.statut(`Manche ${manche + 1}/${MANCHES.length} · ${v.nom} désignée · avance rapide jusqu'à la saturation`);
    }

    function armer() {
      if (!vivant || phase !== 'seuil') return;
      phase = 'alerte';
      ts = 0; alertes = []; derniereSeconde = -1;
      lat.el.querySelector('.th-range').disabled = true;
      lat.el.querySelector('.th-armer').disabled = true;
      majJournal();
      cadre.statut(`Manche 3/${MANCHES.length} · seuil ${seuil} % armé · la nuit défile en accéléré`);
    }

    // ----- souris : raycaster sur les baies ----------------------------------

    const raycaster = new THREE.Raycaster();
    const pointeur = new THREE.Vector2();
    function baieSous(e) {
      if (!renderer) return null;
      const r = renderer.domElement.getBoundingClientRect();
      pointeur.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      raycaster.setFromCamera(pointeur, camera);
      const cibles = [];
      for (const v of baies) { const c = v.m.g.getObjectByName('corps'); for (const o of c.children) if (o.userData.baie) cibles.push(o); }
      const hit = raycaster.intersectObjects(cibles, false)[0];
      return hit ? hit.object.userData.baie : null;
    }
    function surDeplacement(e) {
      survol = phase === 'jeu' ? baieSous(e) : null;
      renderer && renderer.domElement.classList.toggle('sur', !!survol);
    }
    function surClic(e) { const v = baieSous(e); if (v) basculerSonde(v); }
    if (renderer) {
      renderer.domElement.addEventListener('pointermove', surDeplacement);
      renderer.domElement.addEventListener('pointerleave', () => { survol = null; renderer.domElement.classList.remove('sur'); });
      renderer.domElement.addEventListener('click', surClic);
    }

    // ----- boucle de simulation ------------------------------------------------

    const horloge = setInterval(tick, TICK_MS);
    let animation = HEADLESS ? 0 : requestAnimationFrame(boucleRendu);
    function boucleRendu() { if (!vivant) return; rendre(); animation = requestAnimationFrame(boucleRendu); }

    function tick() {
      if (!vivant) return;
      const maintenant = performance.now();
      const dt = Math.min(0.1, (maintenant - precedent) / 1000);
      precedent = maintenant;
      horlogeScene += dt;
      const facteur = phase === 'rapide' ? VITESSE_RAPIDE : phase === 'alerte' ? VITESSE_ALERTE : 1;
      if (phase !== 'resultat') avancer(dt * vitesse * facteur);
      if (phase === 'jeu' && ts >= premier.tSat) afficherResultat();
      else if (phase === 'rapide' && ts >= premier.tSat + 1.5) afficherResultat();
      else if (phase === 'seuil' && ts >= premier.tSat) ts = 0;
      else if (phase === 'alerte' && ts >= premier.tSat + 1.5) afficherResultatSeuil();
      if ((compteur & 7) === 0) clignoter();
      mettreAJourScene(dt);
      majStatut(false);
      // sans requestAnimationFrame (onglet caché, capture), le rendu suit l'horloge
      if (maintenant - dernierRendu > INTERVALLE_RENDU) rendre();
    }

    // Avance le temps simulé par petits pas pour ne rater aucun franchissement de seuil.
    function avancer(pas) {
      if (phase !== 'alerte') { ts += pas; return; }
      let reste = pas;
      while (reste > 0) { const d = Math.min(SOUS_PAS, reste); ts += d; reste -= d; verifierAlertes(); }
    }

    function verifierAlertes() {
      for (const v of baies) {
        if (alertes.some(a => a.v === v)) continue;
        if (v.f(ts) >= seuil) { alertes.push({ v, t: premierInstant(v.f, seuil) }); majJournal(); }
      }
    }

    function majStatut(force) {
      const s = Math.floor(ts);
      if (!force && s === derniereSeconde) return;
      derniereSeconde = s;
      if (phase === 'resultat') return;
      const base = `Manche ${manche + 1}/${MANCHES.length} · ${secondes(ts)} · ${score} réussie${score > 1 ? 's' : ''}`;
      if (phase === 'jeu') cadre.statut(`${base} · sondes ${sondesPosees()}/${NB_SONDES}`);
      else if (phase === 'seuil') cadre.statut(`${base} · seuil ${seuil} %`);
      else if (phase === 'alerte') cadre.statut(`${base} · seuil ${seuil} % armé · accéléré ×${VITESSE_ALERTE}`);
      else cadre.statut(`${base} · avance rapide ×${VITESSE_RAPIDE}`);
    }

    // ----- mise à jour de la scène 3D ------------------------------------------

    const projection = new THREE.Vector3();
    function mettreAJourScene() {
      const w = scene2d.clientWidth, h = scene2d.clientHeight;
      for (const v of baies) {
        const m = v.m;
        const valeur = v.sonde !== null ? v.f(ts) : v.f(Math.floor(ts / RELEVE) * RELEVE);
        const niveau = valeur / 100, sature = valeur >= 100;
        const hauteur = 0.05 + niveau * HAUT_MAX;
        m.liquide.scale.y = m.refletLiquide.scale.y = hauteur;
        const pulse = 0.5 + 0.5 * Math.sin(horlogeScene * 4 + v.i);
        m.liquide.material.emissive.copy(couleurAccent).lerp(COULEUR_PLEIN, sature ? 1 : niveau * niveau * 0.7);
        m.refletLiquide.material.emissive.copy(m.liquide.material.emissive);
        m.liquide.material.emissiveIntensity = sature ? 1.1 + 0.4 * pulse : 0.7 + 0.6 * niveau;
        m.refletLiquide.material.emissiveIntensity = m.liquide.material.emissiveIntensity * 0.8;
        m.halo.position.y = m.refletHalo.position.y = SOCLE_H + 0.1 + hauteur;
        const echHalo = 1.4 + niveau * 1.2 + (sature ? 0.5 * pulse : 0);
        m.halo.scale.set(echHalo, echHalo, 1); m.refletHalo.scale.set(echHalo, echHalo, 1);
        m.halo.material.opacity = 0.35 + 0.35 * niveau;
        m.lumiere.position.y = SOCLE_H + 0.1 + hauteur;
        m.lumiere.intensity = 1.2 + 4.5 * niveau + (sature ? 3 * pulse : 0);
        m.verre.material.opacity = survol === v ? 0.3 : 0.14;
        m.verre.material.color.set(survol === v ? accent : 0x9fdde6);
        // alertes : voyant et anneau rouges, réservés à la manche du seuil
        const alerte = alertes.some(a => a.v === v);
        const couleurLed = alerte ? ROUGE : VERT;
        m.led.material.color.set(couleurLed); m.refletLed.material.color.set(couleurLed);
        m.anneau.visible = m.refletAnneau.visible = alerte;
        if (alerte) { const s = 1 + 0.1 * pulse; m.anneau.scale.set(s, s, 1); m.refletAnneau.scale.set(s, s, 1); m.anneau.material.opacity = 0.55 + 0.45 * pulse; m.lumiere.color.set(ROUGE); m.lumiere.intensity += 4 * pulse; }
        else m.lumiere.color.copy(couleurAccent);
        // la baie désignée ou révélée : la bague tourne
        m.bague.rotation.z += 0.02;
        if (phase === 'resultat' && MANCHES[manche].mode === 'designer') m.bague.material.color.set(v === premier ? VERT : (v === choix ? ROUGE : accent));
        else m.bague.material.color.set(accent);
        if (v.sonde !== null) { if ((compteur & 1) === 0) dessinerJauge(v); }
        else if (Math.round(valeur) !== m.derniereValeur) { m.derniereValeur = Math.round(valeur); dessinerPlaque(v, valeur); }
        // bouton « Désigner » ancré sous la jauge
        const b = m.bouton;
        const montrer = phase === 'jeu' && (v.sonde !== null || survol === v);
        b.hidden = !montrer;
        if (montrer && w && h) {
          projection.set(m.x + m.decalage, Y_JAUGE[m.rangee] - ECH_JAUGE[1] / 2 - 0.05, 0.9).project(camera);
          b.style.left = `${((projection.x + 1) / 2) * w}px`;
          b.style.top = `${((1 - projection.y) / 2) * h}px`;
        }
      }
    }

    // ----- jauges dessinées sur canvas, portées par un sprite ---------------------

    function dessinerPlaque(v, valeur) {
      const { ctx, texture } = v.m.plaque;
      const W = PLAQUE_W, H = PLAQUE_H;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(7,9,12,.9)'; ctx.strokeStyle = '#2B3843'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(1, 1, W - 2, H - 2, 6); ctx.fill(); ctx.stroke();
      ctx.textBaseline = 'middle';
      ctx.fillStyle = TEXTE; ctx.font = `700 26px ${POLICE_TITRE}`; ctx.textAlign = 'left';
      ctx.fillText(v.nom, 16, 28);
      ctx.fillStyle = SECONDAIRE; ctx.font = `18px ${POLICE}`;
      ctx.fillText(`${v.taille} · relevé toutes les ${RELEVE} s`, 16, 58);
      ctx.textAlign = 'right'; ctx.fillStyle = valeur >= 100 ? '#FFFFFF' : TEXTE; ctx.font = `700 34px ${POLICE_TITRE}`;
      ctx.fillText(`${Math.round(valeur)} %`, W - 16, 40);
      texture.needsUpdate = true;
    }

    function dessinerJauge(v) {
      const { ctx, texture } = v.m.jauge;
      const W = JAUGE_W, H = JAUGE_H;
      const valeur = v.f(ts), sature = valeur >= 100;
      const modeSeuil = phase === 'seuil' || phase === 'alerte' || (phase === 'resultat' && MANCHES[manche].mode === 'seuil');
      ctx.clearRect(0, 0, W, H);
      const enAlerte = alertes.some(a => a.v === v);
      ctx.fillStyle = 'rgba(7,9,12,.93)'; ctx.strokeStyle = enAlerte ? ROUGE : accent; ctx.lineWidth = enAlerte ? 5 : 3;
      ctx.beginPath(); ctx.roundRect(2, 2, W - 4, H - 4, 8); ctx.fill(); ctx.stroke();
      // en-tête
      ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
      ctx.fillStyle = TEXTE; ctx.font = `700 26px ${POLICE_TITRE}`; ctx.fillText(v.nom, 20, 32);
      const xTaille = 20 + ctx.measureText(v.nom).width + 60;
      ctx.fillStyle = SECONDAIRE; ctx.font = `18px ${POLICE}`; ctx.fillText(v.taille, xTaille, 34);
      if (enAlerte) { ctx.fillStyle = ROUGE; ctx.font = `700 18px ${POLICE}`; ctx.fillText('ALERTE', xTaille + 70, 34); }
      ctx.textAlign = 'right'; ctx.font = `700 40px ${POLICE_TITRE}`; ctx.fillStyle = sature ? '#FFFFFF' : accent;
      ctx.fillText(sature ? 'saturée' : `${Math.round(valeur)} %`, W - 20, 34);
      // zone de tracé
      const g = 58, d = W - 18, ht = 68, bs = H - 50;
      const x = t => g + ((t - (ts - FENETRE)) / (2 * FENETRE)) * (d - g);
      const y = p => ht + (1 - borner(p) / 100) * (bs - ht);
      ctx.lineWidth = 2; ctx.font = `16px ${POLICE}`; ctx.textAlign = 'right';
      for (const p of [0, 50, 100]) {
        ctx.strokeStyle = p === 100 ? '#3A4652' : '#1B232B';
        ctx.beginPath(); ctx.moveTo(g, y(p)); ctx.lineTo(d, y(p)); ctx.stroke();
        ctx.fillStyle = '#5E6C78'; ctx.fillText(String(p), g - 8, y(p));
      }
      ctx.setLineDash([4, 6]); ctx.strokeStyle = '#2B3843';
      ctx.beginPath(); ctx.moveTo(x(ts), ht); ctx.lineTo(x(ts), bs); ctx.stroke();
      if (modeSeuil) { ctx.strokeStyle = accent; ctx.setLineDash([8, 6]); ctx.beginPath(); ctx.moveTo(g, y(seuil)); ctx.lineTo(d, y(seuil)); ctx.stroke(); }
      ctx.setLineDash([]);
      const debut = Math.max(v.sonde, ts - FENETRE), pas = (2 * FENETRE) / 220;
      ctx.strokeStyle = sature ? '#FFFFFF' : accent; ctx.lineWidth = 3.5; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(x(debut), y(v.f(debut)));
      for (let t = debut + pas; t < ts; t += pas) ctx.lineTo(x(t), y(v.f(t)));
      ctx.lineTo(x(ts), y(v.f(ts))); ctx.stroke();
      // remplissage sous la courbe
      ctx.lineTo(x(ts), bs); ctx.lineTo(x(debut), bs); ctx.closePath();
      ctx.fillStyle = sature ? 'rgba(255,255,255,.12)' : 'rgba(79,198,212,.14)'; ctx.fill();
      const p = sature ? null : projeter(v, ts);
      if (p) {
        const tFin = Math.min(ts + FENETRE, p.pente > 0.02 ? ts + p.eta : ts + FENETRE);
        ctx.setLineDash([7, 7]); ctx.strokeStyle = '#9AAAB6'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(x(ts), y(p.valeur)); ctx.lineTo(x(tFin), y(p.valeur + p.pente * (tFin - ts))); ctx.stroke();
        ctx.setLineDash([]);
      }
      for (const a of alertes) {
        if (a.v !== v || a.t < ts - FENETRE) continue;
        ctx.strokeStyle = ctx.fillStyle = a.v.tSat === Infinity && phase === 'resultat' ? ROUGE : accent; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x(a.t), ht); ctx.lineTo(x(a.t), bs); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x(a.t) - 8, ht); ctx.lineTo(x(a.t) + 8, ht); ctx.lineTo(x(a.t), ht + 10); ctx.fill();
      }
      // pied : la lecture
      ctx.textAlign = 'left'; ctx.font = `600 19px ${POLICE}`;
      let texte, couleur = SECONDAIRE;
      if (sature) { texte = `saturée à ${secondes(v.tSat)}`; couleur = '#FFFFFF'; }
      else if (!p) texte = `mesure… ${Math.max(0, Math.round(ts - v.sonde))} s`;
      else if (p.pente > 0.02) { texte = p.eta <= 120 ? `pleine dans ~${Math.round(p.eta)} s` : 'pleine dans > 2 min'; if (p.eta <= 45) couleur = accent; }
      else texte = p.pente < -0.02 ? 'en baisse' : 'stable';
      ctx.fillStyle = couleur; ctx.fillText(texte, 20, H - 24);
      ctx.textAlign = 'right'; ctx.fillStyle = '#5E6C78'; ctx.font = `15px ${POLICE}`;
      ctx.fillText(secondes(ts), W - 20, H - 24);
      texture.needsUpdate = true;
    }

    // ----- résultats -----------------------------------------------------------

    function ligneBaie(v, classe) {
      const c = v.comportement;
      const fin = v.tSat === Infinity ? '' : ' — pleine à ' + secondes(v.tSat);
      return `<li class="${classe}"><b>${v.nom}</b> · ${c.nom} (${c.forme}) — ${c.pourquoi}${fin}</li>`;
    }

    function afficherResultat() {
      phase = 'resultat';
      for (const b of baies) b.m.bouton.hidden = true;
      const ok = choix === premier;
      if (ok) score++;
      let texte;
      if (!choix) texte = `<b>${premier.nom} a saturé à ${secondes(premier.tSat)}</b>, avant que tu désignes quoi que ce soit. Le niveau ne suffit pas : il faut instrumenter tôt.`;
      else if (ok) texte = `<b>${premier.nom} a saturé à ${secondes(premier.tSat)}.</b> Tu l'avais désignée : la courbe l'annonçait, pas le niveau du moment.`;
      else texte = `<b>${premier.nom} a saturé à ${secondes(premier.tSat)}.</b> Tu avais désigné ${choix.nom} : ${choix.comportement.nom}, ${choix.comportement.pourquoi}.`;
      const liste = baies.map(v => ligneBaie(v, v === premier ? 'acc' : (v === choix ? 'ko' : ''))).join('');
      carteResultat = lat.carte(ok ? 'Bien vu' : 'Raté', `<p class="${ok ? 'th-p-ok' : 'th-p-ko'}">${texte}</p><ul class="th-liste">${liste}</ul>`);
      cadre.statut(`Manche ${manche + 1}/${MANCHES.length} · ${ok ? 'réussie' : 'ratée'} · ${score} réussie${score > 1 ? 's' : ''}`, ok ? 'ok' : 'ko');
      ajouterSuite(carteResultat, 'Manche suivante', () => ouvrirManche(manche + 1));
    }

    function majJournal() {
      if (!carteJournal) return;
      const fini = phase === 'resultat';
      const r = fini ? evaluerSeuil(baies, seuil) : null;
      const lignes = alertes.map(a => {
        let suite = '', classe = 'acc';
        if (fini) {
          if (a.v.tSat === Infinity) { suite = ` — fausse alerte : ${a.v.comportement.nom}, ${a.v.comportement.pourquoi}`; classe = 'ko'; }
          else if (a.v === premier) { suite = ` — justifiée : saturation à ${secondes(premier.tSat)}, marge ${Math.round(r.marge)} s`; classe = r.ok ? 'ok' : 'ko'; }
          else suite = ' — justifiée : cette baie finit pleine';
        }
        return `<li class="${classe}">${secondes(a.t)} · ${a.v.nom} · voyant rouge${suite}</li>`;
      });
      if (!lignes.length) lignes.push(`<li class="dim">${fini ? 'aucune alerte avant la saturation' : 'aucune alerte pour l’instant'}</li>`);
      carteJournal.querySelector('.th-liste').innerHTML = lignes.join('');
    }

    function afficherResultatSeuil() {
      phase = 'resultat';
      const r = evaluerSeuil(baies, seuil);
      margeFinale = r.marge;
      if (r.ok) score++;
      majJournal();
      let texte;
      if (r.fausses.length) texte = `Seuil ${seuil} % : ${r.fausses.length} fausse${r.fausses.length > 1 ? 's' : ''} alerte${r.fausses.length > 1 ? 's' : ''} (${r.fausses.map(a => a.v.nom).join(', ')}). À ce niveau, le tableau de bord crie au loup et plus personne ne le lit.`;
      else if (r.marge < DELAI_INTERVENTION) texte = `Seuil ${seuil} % : alerte ${Math.round(r.marge)} s avant la saturation de ${premier.nom}, il en fallait ${DELAI_INTERVENTION}. Aucune fausse alerte, mais trop tard.`;
      else texte = `Seuil ${seuil} % : aucune fausse alerte, et ${Math.round(r.marge)} s de marge avant la saturation de ${premier.nom}. L'équipe est prévenue à temps, et seulement quand ça compte.`;
      carteResultat = lat.carte(r.ok ? 'Seuil juste' : 'Seuil à revoir', `<p class="${r.ok ? 'th-p-ok' : 'th-p-ko'}">${texte}</p>`);
      cadre.statut(`Manche 3/${MANCHES.length} · ${r.ok ? 'réussie' : 'ratée'} · ${score} réussie${score > 1 ? 's' : ''}`, r.ok ? 'ok' : 'ko');
      ajouterSuite(carteResultat, 'Voir le bilan', terminer);
    }

    function ajouterSuite(carte, label, action) {
      const b = document.createElement('button');
      b.className = 'jx-btn fort th-suite';
      b.style.marginTop = '8px';
      b.textContent = label;
      b.addEventListener('click', action);
      carte.appendChild(b);
      b.focus();
      carte.scrollIntoView({ block: 'nearest' });
    }

    function terminer() {
      const total = MANCHES.length;
      const gagne = score >= MANCHES_POUR_GAGNER;
      const fait = api.FAITS.thales;
      cadre.fin({
        titre: gagne ? 'Quartier validé' : 'Pas tout à fait',
        texte: gagne
          ? `${score} manche${score > 1 ? 's' : ''} sur ${total}. Le niveau du moment ne dit rien ; la courbe dit qui sature et quand. ${fait.pourLePoste}`
          : `${score} sur ${total}. La baie la plus pleine n'est pas celle qui déborde en premier, et un seuil trop bas ne prévient personne. Rejoue : les baies sont les mêmes, les courbes aussi.`,
        bouton: gagne ? 'Prendre la clé' : 'Rejouer',
        action: () => gagne
          ? api.fini({ score, message: `${score} manches sur ${total} : saturations vues venir, seuil réglé avec ${Math.round(margeFinale)} s de marge.` })
          : (score = 0, cadre.corps.querySelector('.jx-fin').remove(), ouvrirManche(0)),
      });
    }

    ouvrirManche(0);
    redimensionner();

    // ----- démontage ---------------------------------------------------------------

    function liberer() {
      viderBaies();
      scene.traverse(o => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) { const ms = Array.isArray(o.material) ? o.material : [o.material]; for (const m of ms) { if (m.map) m.map.dispose(); m.dispose(); } }
      });
      halo.dispose();
      Object.values(geometries).forEach(g => g.dispose());
      Object.values(materiaux).forEach(m => m.dispose());
      if (composer) composer.dispose();
      if (renderer) renderer.dispose();
    }

    // Clic simulé sur une baie : mêmes coordonnées écran, même raycaster que le joueur.
    function cliquerBaie(v) {
      if (renderer) {
        const r = renderer.domElement.getBoundingClientRect();
        const p = new THREE.Vector3(v.m.x, SOCLE_H + 1.2, 0).project(camera);
        const ev = new MouseEvent('click', { bubbles: true, clientX: r.left + ((p.x + 1) / 2) * r.width, clientY: r.top + ((1 - p.y) / 2) * r.height });
        const avant = v.sonde;
        renderer.domElement.dispatchEvent(ev);
        if (v.sonde !== avant) return;
      }
      basculerSonde(v);
    }

    return {
      demonter() {
        vivant = false;
        clearInterval(horloge);
        cancelAnimationFrame(animation);
        observateur.disconnect();
        liberer();
        conteneur.innerHTML = '';
      },
      // joue la solution : sondes sur les baies qui montent, désignation de la bonne, seuil au milieu de la fenêtre juste
      async resoudre() {
        vitesse = 30;
        const attendreQue = async cond => { for (let k = 0; k < 400 && vivant && !cond(); k++) await attendre(25); };
        const parSaturation = (a, b) => (a.tSat === b.tSat ? 0 : a.tSat - b.tSat);
        while (vivant && MANCHES[manche].mode === 'designer') {
          for (const v of [...baies].sort(parSaturation).slice(0, NB_SONDES)) cliquerBaie(v);
          await attendreQue(() => ts >= MIN_MESURE + 3);
          premier.m.bouton.click();
          await attendreQue(() => phase === 'resultat');
          carteResultat.querySelector('.th-suite').click();
          await attendre(30);
        }
        const bons = seuilsAcceptables(baies);
        const range = lat.el.querySelector('.th-range');
        range.value = bons.length ? bons[Math.floor(bons.length / 2)] : 90;
        range.dispatchEvent(new Event('input', { bubbles: true }));
        lat.el.querySelector('.th-armer').click();
        await attendreQue(() => phase === 'resultat');
        carteResultat.querySelector('.th-suite').click();
        await attendre(30);
        const fin = cadre.corps.querySelector('.jx-fin .jx-btn');
        fin && fin.click();
      },
    };
  },
};
