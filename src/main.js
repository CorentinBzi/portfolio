// Point d'entrée : boucle à pas fixe, machine à états de scènes, sauvegarde.

import { createRenderer, VUE_W, VUE_H, texte } from './render.js';
import { createInput, B } from './input.js';
import { creerNiveau } from './game.js';
import { creerHub } from './hub.js';
import { creerFin } from './fin.js';
import { FAITS } from './cv.js';
import { P, alpha } from './palette.js';
import { NIVEAUX } from './levels/index.js';

const CLE_SAUVE = 'qsp.v1';

const app = {
  etat: { faits: [], modules: [] },
  scene: null,
};

function charge() {
  try {
    const s = JSON.parse(localStorage.getItem(CLE_SAUVE) || '{}');
    if (Array.isArray(s.faits)) app.etat.faits = s.faits;
    if (Array.isArray(s.modules)) app.etat.modules = s.modules;
  } catch (e) { /* stockage refusé : on joue sans mémoire, c'est tout */ }
}
function sauve() {
  try { localStorage.setItem(CLE_SAUVE, JSON.stringify(app.etat)); } catch (e) {}
}

const canvas = document.getElementById('jeu');
const pad = document.getElementById('pad');
const r = createRenderer(canvas);
const input = createInput(canvas, pad);

// ---- carte de relevé : le fait de CV, en DOM, physique en pause ----
const carteEl = document.getElementById('releve');
let carteOuverte = false;

function montreCarte(factKey, accent, apres) {
  const f = FAITS[factKey];
  if (!f) { apres && apres(); return; }
  carteOuverte = true;
  document.body.dataset.modal = '1';
  carteEl.style.setProperty('--acc', accent || '#FFB454');
  carteEl.innerHTML = `
    <div class="rel-in" role="dialog" aria-modal="true" aria-labelledby="rel-t">
      <p class="rel-k">${factKey === 'scenario' ? 'Scénario — mise en situation' : 'Relevé'}</p>
      <h2 id="rel-t">${f.employeur} <span>${f.periode}</span></h2>
      <p class="rel-p">${f.poste}</p>
      <p>${f.texte}</p>
      <p class="rel-w"><b>Ce que ça vaut pour le poste visé :</b> ${f.pourLePoste}</p>
      <button id="rel-ok" class="rel-b">Continuer</button>
    </div>`;
  carteEl.hidden = false;
  const b = document.getElementById('rel-ok');
  b.focus();
  const fermer = () => {
    carteEl.hidden = true;
    carteOuverte = false;
    document.body.dataset.modal = '0';
    input.reset();
    canvas.focus();
    apres && apres();
  };
  b.onclick = fermer;
  carteEl.onkeydown = e => { if (e.key === 'Escape' || e.key === 'Enter') { e.preventDefault(); fermer(); } };
}

app.jouer = function (id) {
  const def = NIVEAUX.find(n => n.id === id);
  if (!def) return;
  const sc = creerNiveau(app, def);
  if (sc.erreur) { app.scene = ecranErreur(sc.erreur); return; }
  app.scene = sc;
  input.reset();
  // le fait est délivré à l'entrée, pas en récompense : qui abandonne
  // à la vingtième seconde repart quand même avec l'information
  montreCarte(def.factKey, def.accent);
};

app.finNiveau = function (def) {
  if (!app.etat.faits.includes(def.id)) app.etat.faits.push(def.id);
  if (def.verbe && !app.etat.modules.includes(def.verbe)) app.etat.modules.push(def.verbe);
  sauve();
  // tout est traversé : on conclut, une seule fois, puis retour au hub
  if (app.etat.faits.length >= NIVEAUX.length) {
    app.scene = creerFin(app);
    input.reset();
    return;
  }
  const i = NIVEAUX.findIndex(n => n.id === def.id);
  app.scene = creerHub(app, NIVEAUX, Math.min(NIVEAUX.length - 1, i + 1));
  input.reset();
};

app.versHub = function () {
  app.scene = creerHub(app, NIVEAUX, 0);
  input.reset();
};

function ecranErreur(msg) {
  return {
    pas() {},
    dessine(r) {
      const c = r.ctx;
      c.fillStyle = P.fond; c.fillRect(0, 0, VUE_W, VUE_H);
      texte(c, 'NIVEAU REFUSE AU DEMARRAGE', VUE_W / 2, 110, P.anomalie, 'center');
      const mots = String(msg).match(/.{1,58}/g) || [];
      mots.forEach((m, i) => texte(c, m, VUE_W / 2, 132 + i * 10, P.texte2, 'center'));
      texte(c, 'D : DOSSIER  -  ECHAP : RETOUR', VUE_W / 2, 200, P.texte2, 'center');
    },
  };
}

// ---- boucle à pas fixe ----
let acc = 0, dernier = 0;
const PAS = 1000 / 60;

function boucle(ts) {
  requestAnimationFrame(boucle);
  if (!dernier) dernier = ts;
  let dt = ts - dernier;
  dernier = ts;
  if (dt > 250) dt = 250;              // onglet revenu au premier plan
  acc += dt;
  let tours = 0;
  while (acc >= PAS && tours < 5) {
    acc -= PAS; tours++;
    const inp = inputGele();
    if (!carteOuverte) {
      if (inp.appuye(B.PAUSE) && !app.scene.hub) app.versHub();
      app.scene.pas(inp);
    }
  }
  app.scene.dessine(r);
  if (carteOuverte) {
    const c = r.ctx;
    c.fillStyle = alpha(P.fond, 0.55);
    c.fillRect(0, 0, VUE_W, VUE_H);
  }
  r.present();
}

function inputGele() { input.poll(); return input; }

// ---- dossier : la sortie de secours, toujours à un geste ----
document.getElementById('btn-dossier').addEventListener('click', () => {
  location.href = 'dossier.html';
});
addEventListener('keydown', e => {
  if (e.code === 'KeyD' && !e.repeat && document.body.dataset.modal !== '1' &&
      !(e.ctrlKey || e.metaKey || e.altKey)) {
    // D ouvre le dossier seulement hors déplacement : on exige Maj+D
    if (e.shiftKey) location.href = 'dossier.html';
  }
});

charge();
app.versHub();
canvas.setAttribute('tabindex', '0');
requestAnimationFrame(boucle);

// diagnostic : accessible depuis la console, utile en recette
window.__qsp = { app, NIVEAUX };
