// Point d'entrée : la ville en 3D, la sonde, les portails, et le passage
// de la ville à un jeu puis retour. Un seul renderer pour la ville ; les jeux
// dessinent où ils veulent dans leur conteneur, la ville s'arrête pendant ce temps.

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

import { P, QUARTIERS } from './palette.js';
import { construireVille, DISTRICTS, PAS } from './ville.js';
import { creerSonde } from './sonde.js';
import { creerEntrees } from './entrees.js';
import { FAITS, PROFIL } from './cv.js';
import { JEUX, jeuPour } from './jeux/index.js';
import { valider } from './jeux/_contrat.js';

const CLE_SAUVE = 'qsp3d.v1';
const PARAMS = new URLSearchParams(location.search);
const CAPTURE = PARAMS.has('capture') ? (PARAMS.get('capture') || '3').split(',').map(Number) : null;
// ?sans=miroir,fog,tone : bisection des effets, pour la recette headless uniquement
const SANS = new Set((PARAMS.get('sans') || '').split(',').filter(Boolean));
const etat = { cles: [], mode: 'ville' };
try { const s = JSON.parse(localStorage.getItem(CLE_SAUVE) || '{}'); if (Array.isArray(s.cles)) etat.cles = s.cles; } catch (e) {}
function sauve() { try { localStorage.setItem(CLE_SAUVE, JSON.stringify({ cles: etat.cles })); } catch (e) {} }

// ---------------------------------------------------------------- rendu
const conteneur = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
renderer.toneMapping = SANS.has('tone') ? THREE.NoToneMapping : THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
conteneur.appendChild(renderer.domElement);

const scene = new THREE.Scene();
// le ciel : un dégradé du noir-bleu vers un horizon un peu plus clair, dessiné sur canvas
{
  const c = document.createElement('canvas'); c.width = 4; c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#04060A'); grad.addColorStop(0.28, '#0A0E16'); grad.addColorStop(0.44, '#1a2846'); grad.addColorStop(0.52, '#0d121c'); grad.addColorStop(1, '#0B0E11');
  g.fillStyle = grad; g.fillRect(0, 0, 4, 256);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  scene.background = tex;
}
if (!SANS.has('fog')) scene.fog = new THREE.FogExp2(P.nuit, 0.011);

const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 260);
scene.add(new THREE.HemisphereLight(0x2a3a55, 0x05070a, 1.8));

const ville = construireVille(scene, { miroir: !SANS.has('miroir') });
const entrees = creerEntrees(document.getElementById('pad'));
const sonde = creerSonde(scene, camera, entrees, ville.occupe);
sonde.teleporter(0, 108, 0);
if (CAPTURE && CAPTURE.length >= 3) sonde.teleporter(CAPTURE[1], CAPTURE[2], CAPTURE[3] || 0);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.55, 0.65, 0.72);
if (!CAPTURE) composer.addPass(bloom);
composer.addPass(new OutputPass());

function redimensionner() {
  const w = conteneur.clientWidth, h = conteneur.clientHeight;
  renderer.setSize(w, h, false);
  renderer.domElement.style.width = w + 'px';
  renderer.domElement.style.height = h + 'px';
  composer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  if (CAPTURE && window.__capturePret) renderer.render(scene, camera);
}
addEventListener('resize', redimensionner);
redimensionner();

// ---------------------------------------------------------------- HUD
const el = id => document.getElementById(id);
const invite = el('invite'), quartierEl = el('quartier'), clesEl = el('cles');
const panneau = el('panneau'), jeuEl = el('jeu'), minicarte = el('minicarte');
const mctx = minicarte.getContext('2d');

function afficheCles() {
  clesEl.innerHTML = DISTRICTS.map(d => {
    const ok = etat.cles.includes(d.id);
    return `<span class="cle${ok ? ' ok' : ''}" style="--c:${QUARTIERS[d.id].hex}" title="${d.nom}"></span>`;
  }).join('');
}
afficheCles();

function ouvrirPanneau(html, boutons) {
  document.body.dataset.modal = '1';
  panneau.innerHTML = `<div class="pan-in" role="dialog" aria-modal="true">${html}<div class="pan-btns"></div></div>`;
  const zone = panneau.querySelector('.pan-btns');
  for (const b of boutons) {
    const btn = document.createElement('button');
    btn.className = 'btn' + (b.fort ? ' fort' : '');
    btn.textContent = b.label;
    btn.addEventListener('click', b.action);
    zone.appendChild(btn);
  }
  panneau.hidden = false;
  const premier = zone.querySelector('.btn.fort') || zone.querySelector('.btn');
  premier && premier.focus();
}
function fermerPanneau() {
  panneau.hidden = true;
  panneau.innerHTML = '';
  document.body.dataset.modal = '0';
  entrees.reset();
}
panneau.addEventListener('keydown', e => {
  if (e.key === 'Escape') { e.preventDefault(); if (etat.mode === 'ville') fermerPanneau(); }
});

function carteFait(d) {
  const f = FAITS[d.id];
  const acc = QUARTIERS[d.id].hex;
  const scen = d.id === 'scenario';
  return `
    <p class="pan-k" style="color:${acc}">${scen ? 'Scénario — mise en situation' : 'Relevé du quartier'}</p>
    <h2>${f.employeur} <span>${f.periode}</span></h2>
    <p class="pan-p">${f.poste}</p>
    <p>${f.texte}</p>
    <p class="pan-w"><b>Ce que ça vaut pour le poste visé :</b> ${f.pourLePoste}</p>`;
}

// ---------------------------------------------------------------- portails
let portailProche = null;

function verifierPortails() {
  let best = null, bd = 1e9;
  for (const p of ville.portails) {
    const dx = sonde.pos.x - p.x, dz = sonde.pos.z - p.z;
    const d = Math.hypot(dx, dz);
    if (d < p.rayon + 1.2 && d < bd) { bd = d; best = p; }
  }
  if (best !== portailProche) {
    portailProche = best;
    if (best) {
      const j = jeuPour(best.id);
      invite.innerHTML = `<kbd>Espace</kbd> entrer — <b style="color:${best.accent.hex}">${best.nom}</b>${j ? ' · ' + j.verbe.toLowerCase() : ''}`;
      invite.hidden = false;
    } else invite.hidden = true;
  }
  // le quartier courant, d'après la rangée
  let q = null, qd = 1e9;
  for (const d of DISTRICTS) { const dz = Math.abs(sonde.pos.z - d.bz * PAS); if (dz < qd) { qd = dz; q = d; } }
  quartierEl.textContent = q ? `${q.nom} · ${q.annees}` : '';
}

function entrerPortail(p) {
  const j = jeuPour(p.id);
  const deja = etat.cles.includes(p.id);
  const boutons = [];
  if (j) boutons.push({ label: deja ? 'Rejouer' : 'Jouer', fort: true, action: () => { fermerPanneau(); lancerJeu(j, p); } });
  boutons.push({ label: 'Retour à la ville', action: fermerPanneau });
  ouvrirPanneau(carteFait(p) + (j ? `<p class="pan-j"><b>${j.verbe}</b> — ${j.description}</p>`
                                    : `<p class="pan-j">Le jeu de ce quartier arrive bientôt.</p>`), boutons);
}

// ---------------------------------------------------------------- jeux
let jeuCourant = null;

function lancerJeu(j, p) {
  const err = valider(j);
  if (err.length) { ouvrirPanneau(`<h2>Jeu refusé</h2><p>${err.join('<br>')}</p>`, [{ label: 'Retour', fort: true, action: fermerPanneau }]); return; }
  etat.mode = 'jeu';
  document.body.dataset.modal = '1';
  jeuEl.innerHTML = '';
  jeuEl.hidden = false;
  jeuEl.style.setProperty('--acc', j.accent);
  const api = {
    FAITS, accent: j.accent,
    fini({ score, message } = {}) { terminerJeu(j, p, true, { score, message }); },
    abandonner() { terminerJeu(j, p, false); },
  };
  try {
    jeuCourant = j.monter(jeuEl, api) || {};
  } catch (e) {
    console.error(e);
    terminerJeu(j, p, false);
    ouvrirPanneau(`<h2>Le jeu a rencontré une erreur</h2><p>${String(e.message || e)}</p>`,
                  [{ label: 'Retour à la ville', fort: true, action: fermerPanneau }]);
  }
}

function terminerJeu(j, p, gagne, res) {
  try { jeuCourant && jeuCourant.demonter && jeuCourant.demonter(); } catch (e) { console.error(e); }
  jeuCourant = null;
  jeuEl.hidden = true;
  jeuEl.innerHTML = '';
  etat.mode = 'ville';
  document.body.dataset.modal = '0';
  entrees.reset();
  redimensionner();
  if (!gagne) return;
  if (!etat.cles.includes(j.id)) etat.cles.push(j.id);
  sauve();
  afficheCles();
  const total = DISTRICTS.length;
  const tout = etat.cles.length >= total;
  const acc = QUARTIERS[j.id].hex;
  ouvrirPanneau(
    `<p class="pan-k" style="color:${acc}">${tout ? 'Ville traversée' : 'Clé acquise'}</p>
     <h2>${j.employeur} <span>${j.verbe}</span></h2>
     <p>${(res && res.message) || 'Le quartier est validé.'}</p>
     ${tout ? `<p class="pan-w">Vous avez traversé cinq postes et un scénario. La machine peut écrire le
       correctif ; elle ne peut pas décider, à quatre heures du matin, qui on réveille dans le service,
       ni avec quels mots. C'est le poste que je cherche.</p>
       <p class="pan-w"><b>${PROFIL.nom}</b> · <a href="mailto:${PROFIL.email}">${PROFIL.email}</a></p>`
            : `<p class="pan-w">${etat.cles.length} quartier${etat.cles.length > 1 ? 's' : ''} sur ${total}. Le suivant est plus au nord.</p>`}`,
    [{ label: 'Retour à la ville', fort: true, action: fermerPanneau }]);
}

// ---------------------------------------------------------------- minicarte
function dessinerMinicarte() {
  const w = minicarte.width, h = minicarte.height;
  mctx.clearRect(0, 0, w, h);
  mctx.fillStyle = 'rgba(11,14,17,.82)';
  mctx.fillRect(0, 0, w, h);
  // repère : x de -110 à 110 → 0..w ; z de -150 à 125 → 0..h (le nord en haut)
  const X = x => (x + 110) / 220 * w, Z = z => (z + 150) / 275 * h;
  mctx.strokeStyle = '#223038'; mctx.lineWidth = 6;
  mctx.beginPath(); mctx.moveTo(X(0), Z(120)); mctx.lineTo(X(0), Z(-116)); mctx.stroke();
  for (const p of ville.portails) {
    mctx.fillStyle = etat.cles.includes(p.id) ? p.accent.hex : 'rgba(0,0,0,0)';
    mctx.strokeStyle = p.accent.hex; mctx.lineWidth = 1.5;
    mctx.beginPath(); mctx.arc(X(p.x), Z(p.z), 4, 0, Math.PI * 2); mctx.fill(); mctx.stroke();
  }
  mctx.save();
  mctx.translate(X(sonde.pos.x), Z(sonde.pos.z));
  mctx.rotate(-sonde.yaw);
  mctx.fillStyle = P.sondeHex;
  mctx.beginPath(); mctx.moveTo(0, -5); mctx.lineTo(3.5, 4); mctx.lineTo(-3.5, 4); mctx.closePath(); mctx.fill();
  mctx.restore();
}

// ---------------------------------------------------------------- boucle
let dernier = performance.now(), tVille = 0, images = 0;
function boucle(now) {
  images++;
  if (!CAPTURE || images < CAPTURE[0]) requestAnimationFrame(boucle);
  let dt = (now - dernier) / 1000; dernier = now;
  if (dt > 0.1) dt = 0.1;
  if (etat.mode !== 'ville') return;
  tVille += dt;
  const modal = document.body.dataset.modal === '1';
  if (!modal) {
    sonde.mettreAJour(dt);
    verifierPortails();
    if (portailProche && entrees.action()) entrerPortail(portailProche);
    else entrees.action();
  }
  ville.animer(tVille);
  // en capture, rendu direct : le rendu logiciel headless ne sort rien du composer
  if (CAPTURE) renderer.render(scene, camera); else composer.render();
  dessinerMinicarte();
}
requestAnimationFrame(boucle);
// en capture headless, requestAnimationFrame peut ne jamais tirer : on rend une image tout de suite
if (CAPTURE) {
  sonde.mettreAJour(1 / 60); ville.animer(0); verifierPortails();
  renderer.render(scene, camera); dessinerMinicarte();
  window.__capturePret = true;
  setTimeout(() => { sonde.mettreAJour(1 / 60); renderer.render(scene, camera); }, 400);
  // diagnostic headless : taille du canvas, appels de dessin, pixel central
  try {
    const gl = renderer.getContext();
    const px = new Uint8Array(4);
    gl.readPixels(Math.floor(gl.drawingBufferWidth / 2), Math.floor(gl.drawingBufferHeight / 2), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    window.__journal && window.__journal(`DIAG canvas ${renderer.domElement.width}x${renderer.domElement.height} style ${renderer.domElement.style.width}x${renderer.domElement.style.height} conteneur ${conteneur.clientWidth}x${conteneur.clientHeight} appels ${renderer.info.render.calls} tri ${renderer.info.render.triangles} pixel ${[...px].join(',')} cam ${camera.position.toArray().map(v => v.toFixed(1)).join(',')} sonde ${sonde.pos.toArray().map(v => v.toFixed(1)).join(',')}`);
  } catch (e) { window.__journal && window.__journal('DIAG erreur ' + e.message); }
}

// ---------------------------------------------------------------- liens
el('btn-dossier').addEventListener('click', () => { location.href = 'dossier.html'; });
addEventListener('keydown', e => {
  if (e.code === 'KeyD' && e.shiftKey && !e.repeat) location.href = 'dossier.html';
});

// la tour est la destination : on l'indique une fois, au départ
setTimeout(() => {
  if (etat.cles.length) return;
  invite.innerHTML = `Flèches pour voler · <kbd>Maj</kbd> accélère · six quartiers, du sud au nord`;
  invite.hidden = false;
  setTimeout(() => { if (!portailProche) invite.hidden = true; }, 6000);
}, 800);

window.__ville = { etat, sonde, ville, DISTRICTS, JEUX, lancerJeu, entrerPortail };
// recette : ?panneau=<id> ouvre le relevé d'un quartier ; ?jeu=<id> lance son jeu dans la page
if (PARAMS.get('panneau')) { const p = ville.portails.find(x => x.id === PARAMS.get('panneau')); p && entrerPortail(p); }
if (PARAMS.get('jeu')) { const p = ville.portails.find(x => x.id === PARAMS.get('jeu')); const j = jeuPour(PARAMS.get('jeu')); p && j && lancerJeu(j, p); }
