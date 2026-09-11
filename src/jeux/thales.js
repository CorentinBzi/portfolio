// QUARTIER 2 — THALES — verbe INSTRUMENTER — « La salle de stockage »
//
// Six volumes se remplissent en temps réel, chacun à sa manière : dents de
// scie d'une sauvegarde, sinusoïde d'un cache, paliers d'une fuite, plat d'une
// baie morte, droite lente, à-coups. Sans sonde, on ne voit qu'un taux relevé
// toutes les quatre secondes : c'est trompeur. Une sonde dessine la courbe et
// projette la tendance. Deux manches pour désigner le volume qui saturera en
// premier, puis une manche pour régler un seuil d'alerte qui prévient à temps
// sans crier au loup. La simulation est déterministe (graine fixe).

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
const SEUIL_MIN = 50, SEUIL_MAX = 99, SEUIL_DEPART = 75;
const MANCHES_POUR_GAGNER = 2;

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
  sauvegarde: {
    nom: 'sauvegarde nocturne', forme: 'dents de scie',
    pourquoi: 'monte pendant l’écriture, se vide à chaque rotation : jamais plein',
    f: p => t => p.base + p.amp * ((t % p.periode) / p.periode),
  },
  cache: {
    nom: 'cache', forme: 'sinusoïde',
    pourquoi: 'respire, monte et redescend : jamais plein',
    f: p => t => p.base + p.amp * Math.sin(2 * Math.PI * t / p.periode),
  },
  fuite: {
    nom: 'fuite applicative', forme: 'paliers',
    pourquoi: 'chaque palier reste acquis, rien ne redescend',
    f: p => t => p.base + p.pas * Math.floor(t / p.periode),
  },
  mort: {
    nom: 'baie morte', forme: 'plat',
    pourquoi: 'plus aucune écriture : haut, mais immobile',
    f: p => () => p.base,
  },
  croissance: {
    nom: 'croissance régulière', forme: 'droite',
    pourquoi: 'lente mais sans retour',
    f: p => t => p.base + p.pente * t,
  },
  aleatoire: {
    nom: 'à-coups', forme: 'bruit',
    pourquoi: 'bruyant, sans tendance : jamais plein',
    f: (p, graine) => { const table = tableAleatoire(p, graine); return t => table[Math.min(Math.floor(t), HORIZON)]; },
  },
};

// Trois manches. Le nom des volumes ne trahit rien : seule la courbe parle.
const MANCHES = [
  {
    graine: 11, mode: 'designer',
    volumes: [
      { nom: 'vol-01', taille: '4 To', type: 'mort', p: { base: 93 } },
      { nom: 'vol-02', taille: '2 To', type: 'sauvegarde', p: { base: 50, amp: 36, periode: 9 } },
      { nom: 'vol-03', taille: '8 To', type: 'fuite', p: { base: 44, pas: 7, periode: 5 } },        // plein à 40 s
      { nom: 'vol-04', taille: '1 To', type: 'cache', p: { base: 62, amp: 14, periode: 10 } },
      { nom: 'vol-05', taille: '6 To', type: 'croissance', p: { base: 68, pente: 0.45 } },        // plein à 71 s
      { nom: 'vol-06', taille: '2 To', type: 'aleatoire', p: { base: 45, min: 30, max: 88 } },
    ],
  },
  {
    graine: 23, mode: 'designer',
    volumes: [
      { nom: 'vol-01', taille: '2 To', type: 'sauvegarde', p: { base: 58, amp: 38, periode: 10 } }, // pic à 96, jamais plein
      { nom: 'vol-02', taille: '4 To', type: 'mort', p: { base: 88 } },
      { nom: 'vol-03', taille: '1 To', type: 'aleatoire', p: { base: 55, min: 35, max: 90 } },
      { nom: 'vol-04', taille: '8 To', type: 'fuite', p: { base: 40, pas: 5, periode: 6 } },        // plein à 72 s
      { nom: 'vol-05', taille: '6 To', type: 'croissance', p: { base: 60, pente: 1.0 } },         // plein à 40 s
      { nom: 'vol-06', taille: '2 To', type: 'cache', p: { base: 50, amp: 20, periode: 8 } },
    ],
  },
  {
    graine: 37, mode: 'seuil',
    volumes: [
      { nom: 'vol-01', taille: '2 To', type: 'sauvegarde', p: { base: 46, amp: 38, periode: 9 } },  // pic à 84
      { nom: 'vol-02', taille: '6 To', type: 'croissance', p: { base: 62, pente: 0.35 } },        // plein à 109 s
      { nom: 'vol-03', taille: '4 To', type: 'mort', p: { base: 82 } },
      { nom: 'vol-04', taille: '1 To', type: 'cache', p: { base: 60, amp: 16, periode: 10 } },     // pic à 76
      { nom: 'vol-05', taille: '2 To', type: 'aleatoire', p: { base: 50, min: 30, max: 80 } },
      { nom: 'vol-06', taille: '8 To', type: 'fuite', p: { base: 30, pas: 4, periode: 8 } },        // 82 à 109 s
    ],
  },
];

function borner(x) { return Math.max(0, Math.min(100, x)); }

// Premier instant (pas de 0,1 s) où f atteint le seuil, sinon Infinity.
function premierInstant(f, seuil) {
  for (let k = 0; k <= HORIZON * 10; k++) { const t = k / 10; if (f(t) >= seuil - 1e-9) return t; }
  return Infinity;
}

function construireVolumes(manche) {
  return manche.volumes.map((d, i) => {
    const comportement = COMPORTEMENTS[d.type];
    const brut = comportement.f(d.p, manche.graine * 7 + i);
    const f = t => borner(brut(Math.max(0, t)));
    return { ...d, i, f, comportement, tSat: premierInstant(f, 100), sonde: null, el: null, canvas: null };
  });
}

function volumePremier(vols) {
  return vols.reduce((a, b) => (b.tSat < a.tSat ? b : a));
}

// Régression linéaire sur l'historique de la sonde : pente en %/s.
function projeter(v, ts) {
  const debut = Math.max(v.sonde, ts - MAX_REGRESSION);
  if (ts - debut < MIN_MESURE) return null;
  let n = 0, sx = 0, sy = 0, sxx = 0, sxy = 0;
  for (let t = debut; t <= ts; t += 0.25) { const y = v.f(t); n++; sx += t; sy += y; sxx += t * t; sxy += t * y; }
  const pente = (n * sxy - sx * sy) / (n * sxx - sx * sx || 1);
  const valeur = v.f(ts);
  const eta = pente > 0.02 ? (100 - valeur) / pente : Infinity;
  return { pente, eta, valeur };
}

// Manche du seuil : qui alerte, à quel instant, et avec quelle marge.
function evaluerSeuil(vols, seuil) {
  const premier = volumePremier(vols);
  const alertes = vols.map(v => ({ v, t: premierInstant(v.f, seuil) })).filter(a => a.t < premier.tSat);
  const fausses = alertes.filter(a => a.v.tSat === Infinity);
  const vraie = alertes.find(a => a.v === premier);
  const marge = vraie ? premier.tSat - vraie.t : 0;
  return { premier, alertes, fausses, marge, ok: fausses.length === 0 && marge >= DELAI_INTERVENTION };
}

function seuilsAcceptables(vols) {
  const ok = [];
  for (let s = SEUIL_MIN; s <= SEUIL_MAX; s++) if (evaluerSeuil(vols, s).ok) ok.push(s);
  return ok;
}

function secondes(t) { return `t+${Math.round(t)} s`; }

const CSS = `
.th-scene{flex:1;min-width:0;min-height:0;display:grid;grid-template-columns:1fr 1fr;grid-auto-rows:1fr;
  gap:8px;padding:10px;background:#05070A;border-right:1px solid #1F2832}
.th-vol{display:flex;flex-direction:column;min-height:0;min-width:0;border:1px solid #2B3843;border-radius:2px;
  background:#0B0E11;transition:border-color .2s}
.th-vol.sonde{border-color:var(--acc)}
.th-vol.choix{box-shadow:inset 0 0 0 1px var(--acc)}
.th-vol.sature{border-color:#E8503A}
.th-vt{flex:none;display:flex;align-items:baseline;gap:8px;padding:5px 8px 2px;font-size:12px}
.th-vt .th-nom{white-space:nowrap}
.th-vt small{color:#7A8A96;font-size:10px;margin-left:4px}
.th-taux{font-family:"Archivo",system-ui,sans-serif;font-weight:700;font-size:13px;font-variant-numeric:tabular-nums}
.th-taux.ko{color:#E8503A}
.th-cv{flex:1;min-height:36px;position:relative;margin:0 6px}
.th-cv canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
.th-vp{flex:none;display:flex;align-items:center;gap:6px;padding:4px 8px 6px;font-size:10.5px;color:#7A8A96;min-height:30px}
.th-vp[hidden]{display:none}
.th-b{font:600 10px/1 "IBM Plex Mono",ui-monospace,monospace;letter-spacing:.06em;text-transform:uppercase;color:#C8D3DA;
  background:transparent;border:1px solid #3A4652;border-radius:2px;padding:5px 8px;cursor:pointer}
.th-b:hover{border-color:var(--acc);color:var(--acc)}
.th-b:focus-visible{outline:2px solid #7FA3FF;outline-offset:1px}
.th-b[disabled]{opacity:.3;cursor:default}
.th-eta{margin-left:auto;font-size:10.5px;color:#7A8A96;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
.th-eta.acc{color:var(--acc)}
.th-taux{flex:none}
.th-sondes{display:flex;gap:6px;align-items:center;font-size:12px}
.th-sondes i{width:10px;height:10px;border-radius:50%;border:1px solid var(--acc);display:inline-block}
.th-sondes i.on{background:var(--acc)}
.th-liste{margin:0;padding:0;list-style:none;font-size:12px}
.th-liste li{padding:3px 0;border-top:1px solid #1B232B}
.th-liste li.acc{color:var(--acc)}.th-liste li.ko{color:#E8503A}.th-liste li.ok{color:#6FCF8E}
.th-liste li.dim{color:#7A8A96}
.th-range{width:100%;accent-color:var(--acc);margin:6px 0;display:block}
.th-sv{color:var(--acc);font-size:15px}
.th-p-ok{color:#6FCF8E}.th-p-ko{color:#E8503A}
@media (max-width:760px){
  .th-scene{border-right:0;gap:6px;padding:6px}
  .th-b{padding:4px 6px}.th-vp{padding:2px 6px 4px;min-height:24px}
  .th-vt{padding:3px 6px 1px;flex-wrap:wrap;row-gap:0}
  .th-vt .th-eta{order:3;flex-basis:100%;text-align:right;font-size:10px;line-height:1.2}
  .th-cv{min-height:28px}
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
  description: "Six volumes se remplissent, chacun à sa façon. Trois sondes pour dessiner les courbes et désigner celui qui saturera en premier, puis un seuil d'alerte à régler : assez tôt, sans crier au loup.",

  monter(conteneur, api) {
    const cadre = creerCadre(conteneur, {
      titre: 'La salle de stockage', employeur: 'THALES', annees: '2020 - 2021', verbe: 'INSTRUMENTER',
      accent: api.accent,
      consigne: "Pose tes trois sondes, lis les courbes, désigne le volume qui saturera en premier avant qu'il sature.",
    });
    const style = document.createElement('style');
    style.textContent = CSS;
    cadre.racine.prepend(style);
    const scene = document.createElement('div');
    scene.className = 'th-scene';
    cadre.corps.appendChild(scene);
    const lat = creerLateral(cadre.corps);
    cadre.bouton('Abandonner', () => api.abandonner());

    let vivant = true, manche = 0, score = 0, ts = 0, vitesse = 1, phase = 'jeu';
    let vols = [], premier = null, choix = null, seuil = SEUIL_DEPART, alertes = [], margeFinale = 0;
    let carteSondes = null, carteResultat = null, carteJournal = null, derniereSeconde = -1;
    let precedent = performance.now();
    const tailles = new Map();
    const observateur = new ResizeObserver(entrees => {
      for (const e of entrees) tailles.set(e.target, [e.contentRect.width, e.contentRect.height]);
    });

    // ----- construction d'une manche --------------------------------------

    function ouvrirManche(k) {
      manche = k;
      const m = MANCHES[k];
      vols = construireVolumes(m);
      premier = volumePremier(vols);
      ts = 0; choix = null; alertes = []; seuil = SEUIL_DEPART; derniereSeconde = -1;
      phase = m.mode === 'seuil' ? 'seuil' : 'jeu';
      if (m.mode === 'seuil') vols.forEach(v => { v.sonde = 0; });
      construireGrille();
      lat.vider();
      if (m.mode === 'seuil') cartesSeuil(); else cartesDesignation();
      majStatut(true);
    }

    function construireGrille() {
      observateur.disconnect();
      tailles.clear();
      scene.innerHTML = '';
      const modeSeuil = MANCHES[manche].mode === 'seuil';
      for (const v of vols) {
        const el = document.createElement('div');
        el.className = 'th-vol' + (v.sonde !== null ? ' sonde' : '');
        el.innerHTML = `
          <div class="th-vt"><span class="th-nom">${v.nom}<small>${v.taille}</small></span><span class="th-eta"></span><span class="th-taux">—</span></div>
          <div class="th-cv"><canvas aria-label="courbe de remplissage ${v.nom}"></canvas></div>
          <div class="th-vp" ${modeSeuil ? 'hidden' : ''}>
            <button class="th-b th-sonder">Sonder</button>
            <button class="th-b th-designer">Désigner</button>
          </div>`;
        v.el = el;
        v.canvas = el.querySelector('canvas');
        el.querySelector('.th-sonder').addEventListener('click', () => basculerSonde(v));
        el.querySelector('.th-designer').addEventListener('click', () => designer(v));
        scene.appendChild(el);
        observateur.observe(el.querySelector('.th-cv'));
      }
      majBoutons();
    }

    function cartesDesignation() {
      lat.carte(`Manche ${manche + 1} sur ${MANCHES.length} · qui sature en premier ?`,
        `<p>Six volumes, trois sondes. Sans sonde, le taux n'est relevé que toutes les ${RELEVE} s : un chiffre, pas une tendance.</p>
         <p>Une sonde dessine la courbe en direct et projette la tendance. Désigne le volume qui saturera <b>en premier</b>, avant qu'il sature.</p>`);
      carteSondes = lat.carte('Sondes', '<div class="th-sondes"></div>');
      lat.carte('Lecture', `<p><span style="color:${api.accent}">trait plein</span> : mesure · <span style="color:#7A8A96">pointillé</span> : projection linéaire sur l'historique de la sonde · retirer une sonde la libère.</p>`);
      majSondes();
    }

    function cartesSeuil() {
      lat.carte(`Manche 3 sur ${MANCHES.length} · le seuil d'alerte`,
        `<p>Toutes les sondes sont posées : c'est le tableau de bord complet. Règle le seuil qui déclenche l'alerte.</p>
         <p>Une intervention prend <b>${DELAI_INTERVENTION} s</b>. Trop bas : fausses alertes sur les volumes qui respirent. Trop haut : l'alerte arrive trop tard.</p>`);
      const c = lat.carte('Seuil',
        `<p>Alerte à partir de <b class="th-sv">${seuil} %</b></p>
         <input class="th-range" type="range" min="${SEUIL_MIN}" max="${SEUIL_MAX}" step="1" value="${seuil}" aria-label="seuil d'alerte en pourcentage">
         <button class="jx-btn fort th-armer">Armer l'alerte</button>`);
      const range = c.querySelector('.th-range');
      range.addEventListener('input', () => { seuil = Number(range.value); c.querySelector('.th-sv').textContent = seuil + ' %'; majStatut(true); });
      c.querySelector('.th-armer').addEventListener('click', armer);
      carteJournal = lat.carte('Journal des alertes', '<ul class="th-liste"><li class="dim">— en attente d’armement —</li></ul>');
    }

    // ----- interactions ---------------------------------------------------

    function sondesPosees() { return vols.filter(v => v.sonde !== null).length; }

    function basculerSonde(v) {
      if (!vivant || phase !== 'jeu') return;
      if (v.sonde !== null) v.sonde = null;
      else if (sondesPosees() < NB_SONDES) v.sonde = ts;
      else return;
      v.el.classList.toggle('sonde', v.sonde !== null);
      majBoutons();
      majSondes();
      majStatut(true);
    }

    function majBoutons() {
      const plein = sondesPosees() >= NB_SONDES;
      for (const v of vols) {
        const b = v.el.querySelector('.th-sonder');
        b.textContent = v.sonde !== null ? 'Retirer' : 'Sonder';
        b.disabled = phase !== 'jeu' || (v.sonde === null && plein);
        v.el.querySelector('.th-designer').disabled = phase !== 'jeu';
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
      v.el.classList.add('choix');
      majBoutons();
      cadre.statut(`Manche ${manche + 1}/${MANCHES.length} · ${v.nom} désigné · avance rapide jusqu'à la saturation`);
    }

    function armer() {
      if (!vivant || phase !== 'seuil') return;
      phase = 'alerte';
      ts = 0; alertes = []; derniereSeconde = -1;
      const c = lat.el.querySelector('.th-range');
      c.disabled = true;
      lat.el.querySelector('.th-armer').disabled = true;
      majJournal();
      cadre.statut(`Manche 3/${MANCHES.length} · seuil ${seuil} % armé · la nuit défile en accéléré`);
    }

    // ----- boucle de simulation ------------------------------------------

    const horloge = setInterval(tick, TICK_MS);

    function tick() {
      if (!vivant) return;
      const maintenant = performance.now();
      const dt = Math.min(0.1, (maintenant - precedent) / 1000);
      precedent = maintenant;
      const facteur = phase === 'rapide' ? VITESSE_RAPIDE : phase === 'alerte' ? VITESSE_ALERTE : 1;
      if (phase !== 'resultat') ts += dt * vitesse * facteur;
      if (phase === 'jeu' && ts >= premier.tSat) afficherResultat();
      else if (phase === 'rapide' && ts >= premier.tSat + 1.5) afficherResultat();
      else if (phase === 'seuil' && ts >= premier.tSat) ts = 0;
      else if (phase === 'alerte') { verifierAlertes(); if (ts >= premier.tSat + 1.5) afficherResultatSeuil(); }
      for (const v of vols) dessinerVolume(v);
      majStatut(false);
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

    function verifierAlertes() {
      for (const v of vols) {
        if (alertes.some(a => a.v === v)) continue;
        if (v.f(ts) >= seuil) { alertes.push({ v, t: premierInstant(v.f, seuil) }); majJournal(); }
      }
    }

    // ----- dessin -----------------------------------------------------------

    function dessinerVolume(v) {
      const c = v.canvas;
      const [W, H] = tailles.get(c.parentElement) || [c.parentElement.clientWidth, c.parentElement.clientHeight];
      if (!W || !H) return;
      const dpr = window.devicePixelRatio || 1;
      const pw = Math.round(W * dpr), ph = Math.round(H * dpr);
      if (c.width !== pw || c.height !== ph) { c.width = pw; c.height = ph; }
      const ctx = c.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      const valeur = v.sonde !== null ? v.f(ts) : v.f(Math.floor(ts / RELEVE) * RELEVE);
      majEntete(v, valeur);
      if (v.sonde === null) dessinerJauge(ctx, W, H, valeur);
      else dessinerCourbe(ctx, W, H, v);
    }

    function majEntete(v, valeur) {
      const sature = valeur >= 100;
      const taux = v.el.querySelector('.th-taux');
      taux.textContent = sature ? '100 % · saturé' : Math.round(valeur) + ' %';
      taux.className = 'th-taux' + (sature ? ' ko' : '');
      v.el.classList.toggle('sature', sature);
      const eta = v.el.querySelector('.th-eta');
      if (v.sonde === null) { eta.textContent = `relevé toutes les ${RELEVE} s`; eta.className = 'th-eta'; return; }
      if (sature) { eta.textContent = ''; eta.className = 'th-eta'; return; }
      const p = projeter(v, ts);
      if (!p) { eta.textContent = `mesure… ${Math.max(0, Math.round(ts - v.sonde))} s`; eta.className = 'th-eta'; return; }
      if (p.pente > 0.02) {
        eta.textContent = p.eta <= 120 ? `plein dans ~${Math.round(p.eta)} s` : 'plein dans > 2 min';
        eta.className = 'th-eta' + (p.eta <= 45 ? ' acc' : '');
      } else { eta.textContent = p.pente < -0.02 ? 'en baisse' : 'stable'; eta.className = 'th-eta'; }
    }

    function dessinerJauge(ctx, W, H, valeur) {
      const h = Math.min(10, Math.max(6, H * 0.14)), y = H / 2 - h / 2, marge = 8;
      ctx.fillStyle = '#1B232B';
      ctx.fillRect(marge, y, W - 2 * marge, h);
      ctx.fillStyle = valeur >= 100 ? '#E8503A' : '#3A4652';
      ctx.fillRect(marge, y, (W - 2 * marge) * valeur / 100, h);
      ctx.fillStyle = '#4E5A66';
      ctx.font = '9px "IBM Plex Mono",ui-monospace,monospace';
      ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillText('taux du moment · aucune courbe', marge, y + h + 4);
    }

    function dessinerCourbe(ctx, W, H, v) {
      const gauche = 24, droite = 4, haut = 8, bas = 4;
      const x = t => gauche + ((t - (ts - FENETRE)) / (2 * FENETRE)) * (W - gauche - droite);
      const y = p => haut + (1 - borner(p) / 100) * (H - haut - bas);
      ctx.lineWidth = 1;
      ctx.font = '9px "IBM Plex Mono",ui-monospace,monospace';
      ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      for (const p of [0, 50, 100]) {
        ctx.strokeStyle = p === 100 ? '#3A4652' : '#1B232B';
        ctx.beginPath(); ctx.moveTo(gauche, y(p)); ctx.lineTo(W - droite, y(p)); ctx.stroke();
        ctx.fillStyle = '#4E5A66'; ctx.fillText(String(p), gauche - 4, y(p));
      }
      ctx.setLineDash([2, 3]); ctx.strokeStyle = '#2B3843';
      ctx.beginPath(); ctx.moveTo(x(ts), haut); ctx.lineTo(x(ts), H - bas); ctx.stroke();
      ctx.setLineDash([]);
      if (phase === 'seuil' || phase === 'alerte' || (phase === 'resultat' && MANCHES[manche].mode === 'seuil')) {
        ctx.setLineDash([4, 3]); ctx.strokeStyle = api.accent;
        ctx.beginPath(); ctx.moveTo(gauche, y(seuil)); ctx.lineTo(W - droite, y(seuil)); ctx.stroke();
        ctx.setLineDash([]);
      }
      const debut = Math.max(v.sonde, ts - FENETRE);
      const pas = (2 * FENETRE) / Math.max(60, W);
      const sature = v.f(ts) >= 100;
      ctx.strokeStyle = sature ? '#E8503A' : api.accent;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x(debut), y(v.f(debut)));
      for (let t = debut + pas; t < ts; t += pas) ctx.lineTo(x(t), y(v.f(t)));
      ctx.lineTo(x(ts), y(v.f(ts)));
      ctx.stroke();
      ctx.lineWidth = 1;
      const p = sature ? null : projeter(v, ts);
      if (p) {
        const tFin = Math.min(ts + FENETRE, p.pente > 0.02 ? ts + p.eta : ts + FENETRE);
        ctx.setLineDash([3, 3]); ctx.strokeStyle = '#7A8A96';
        ctx.beginPath(); ctx.moveTo(x(ts), y(p.valeur)); ctx.lineTo(x(tFin), y(p.valeur + p.pente * (tFin - ts))); ctx.stroke();
        ctx.setLineDash([]);
      }
      for (const a of alertes) {
        if (a.v !== v || a.t < ts - FENETRE) continue;
        ctx.strokeStyle = a.v.tSat === Infinity && phase === 'resultat' ? '#E8503A' : api.accent;
        ctx.beginPath(); ctx.moveTo(x(a.t), haut); ctx.lineTo(x(a.t), H - bas); ctx.stroke();
        ctx.fillStyle = ctx.strokeStyle;
        ctx.beginPath(); ctx.moveTo(x(a.t) - 4, haut); ctx.lineTo(x(a.t) + 4, haut); ctx.lineTo(x(a.t), haut + 5); ctx.fill();
      }
    }

    // ----- résultats ------------------------------------------------------

    function ligneVolume(v, classe) {
      const c = v.comportement;
      const fin = v.tSat === Infinity ? '' : ' — plein à ' + secondes(v.tSat);
      return `<li class="${classe}"><b>${v.nom}</b> · ${c.nom} (${c.forme}) — ${c.pourquoi}${fin}</li>`;
    }

    function afficherResultat() {
      phase = 'resultat';
      majBoutons();
      const ok = choix === premier;
      if (ok) score++;
      let texte;
      if (!choix) texte = `<b>${premier.nom} a saturé à ${secondes(premier.tSat)}</b>, avant que tu désignes quoi que ce soit. Le cadran ne suffit pas : il faut instrumenter tôt.`;
      else if (ok) texte = `<b>${premier.nom} a saturé à ${secondes(premier.tSat)}.</b> Tu l'avais désigné : la courbe l'annonçait, pas le taux du moment.`;
      else texte = `<b>${premier.nom} a saturé à ${secondes(premier.tSat)}.</b> Tu avais désigné ${choix.nom} : ${choix.comportement.nom}, ${choix.comportement.pourquoi}.`;
      const liste = vols.map(v => ligneVolume(v, v === premier ? 'acc' : (v === choix ? 'ko' : ''))).join('');
      carteResultat = lat.carte(ok ? 'Bien vu' : 'Raté', `<p class="${ok ? 'th-p-ok' : 'th-p-ko'}">${texte}</p><ul class="th-liste">${liste}</ul>`);
      cadre.statut(`Manche ${manche + 1}/${MANCHES.length} · ${ok ? 'réussie' : 'ratée'} · ${score} réussie${score > 1 ? 's' : ''}`, ok ? 'ok' : 'ko');
      ajouterSuite(carteResultat, 'Manche suivante', () => ouvrirManche(manche + 1));
    }

    function majJournal() {
      if (!carteJournal) return;
      const fini = phase === 'resultat';
      const r = fini ? evaluerSeuil(vols, seuil) : null;
      const lignes = alertes.map(a => {
        let suite = '', classe = 'acc';
        if (fini) {
          if (a.v.tSat === Infinity) { suite = ` — fausse alerte : ${a.v.comportement.nom}, ${a.v.comportement.pourquoi}`; classe = 'ko'; }
          else if (a.v === premier) { suite = ` — justifiée : saturation à ${secondes(premier.tSat)}, marge ${Math.round(r.marge)} s`; classe = r.ok ? 'ok' : 'ko'; }
          else suite = ' — justifiée : ce volume finit plein';
        }
        return `<li class="${classe}">${secondes(a.t)} · ${a.v.nom} · alerte${suite}</li>`;
      });
      if (!lignes.length) lignes.push(`<li class="dim">${fini ? 'aucune alerte avant la saturation' : 'aucune alerte pour l’instant'}</li>`);
      carteJournal.querySelector('.th-liste').innerHTML = lignes.join('');
    }

    function afficherResultatSeuil() {
      phase = 'resultat';
      const r = evaluerSeuil(vols, seuil);
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
          ? `${score} manche${score > 1 ? 's' : ''} sur ${total}. Le taux du moment ne dit rien ; la courbe dit qui sature et quand. ${fait.pourLePoste}`
          : `${score} sur ${total}. Le volume le plus plein n'est pas celui qui déborde en premier, et un seuil trop bas ne prévient personne. Rejoue : les volumes sont les mêmes, les courbes aussi.`,
        bouton: gagne ? 'Prendre la clé' : 'Rejouer',
        action: () => gagne
          ? api.fini({ score, message: `${score} manches sur ${total} : saturations vues venir, seuil réglé avec ${Math.round(margeFinale)} s de marge.` })
          : (score = 0, cadre.corps.querySelector('.jx-fin').remove(), ouvrirManche(0)),
      });
    }

    ouvrirManche(0);

    return {
      demonter() {
        vivant = false;
        clearInterval(horloge);
        observateur.disconnect();
        conteneur.innerHTML = '';
      },
      // joue la solution : sondes sur les volumes qui montent, désignation du bon, seuil au milieu de la fenêtre juste
      async resoudre() {
        vitesse = 30;
        const attendreQue = async cond => { for (let k = 0; k < 400 && vivant && !cond(); k++) await attendre(25); };
        const parSaturation = (a, b) => (a.tSat === b.tSat ? 0 : a.tSat - b.tSat);
        while (vivant && MANCHES[manche].mode === 'designer') {
          for (const v of [...vols].sort(parSaturation).slice(0, NB_SONDES)) v.el.querySelector('.th-sonder').click();
          await attendreQue(() => ts >= MIN_MESURE + 3);
          premier.el.querySelector('.th-designer').click();
          await attendreQue(() => phase === 'resultat');
          carteResultat.querySelector('.th-suite').click();
          await attendre(30);
        }
        const bons = seuilsAcceptables(vols);
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
