// QUARTIER 3 — ALBYS — verbe SEGMENTER — « Le réseau »
//
// Un poste invité compromis sur un réseau à plat. À chaque tour, l'intrus gagne
// un saut sur tout lien ouvert. Le joueur cloisonne (VLAN) ou écrit des règles
// de pare-feu qui ne laissent passer qu'un flux nommé, sans couper les trois
// flux qui font tourner l'entreprise. Puis, dans un scan OpenVAS, il priorise
// les alertes que l'intrus peut réellement atteindre, pas celles au score le
// plus haut. Tout est déterministe : même topologie, même intrus, même solution.

import { creerCadre, creerLateral, attendre } from './_contrat.js';

const LARGEUR = 800, HAUTEUR = 500;
const TOURS_MAX = 4, GESTES_PAR_TOUR = 2, BUDGET_CLOISONS = 3, BUDGET_REGLES = 2;
const ALERTES_A_TRAITER = 2;
const RAYON_CLIC = 12, RAYON_NOEUD = 22;
const ROUGE = '#E8503A', VERT = '#6FCF8E', TEXTE = '#C8D3DA', SECONDAIRE = '#7A8A96';
const FOND = '#07090C', LIEN_OUVERT = '#34424F', SURFACE = '#0E1318';

// `court` : le nom affiché quand le schéma est réduit (téléphone).
const NOEUDS = [
  { id: 'G',    nom: 'Poste invité',        court: 'Invité',       sous: 'compromis', x: 85,  y: 410, type: 'hote', origine: true },
  { id: 'INV',  nom: 'Borne Wi-Fi invités', court: 'Borne invités', x: 85,  y: 265, type: 'infra' },
  { id: 'SWA',  nom: 'Switch accueil',      court: 'Sw. accueil',  x: 235, y: 265, type: 'infra' },
  { id: 'IMP',  nom: 'Imprimante',          court: 'Imprimante',   x: 235, y: 95,  type: 'hote' },
  { id: 'CAM',  nom: 'Caméra IP',           court: 'Caméra',       x: 235, y: 440, type: 'hote' },
  { id: 'SW0',  nom: 'Switch cœur',         court: 'Sw. cœur',     x: 415, y: 265, type: 'infra' },
  { id: 'R',    nom: 'Routeur UniFi',       court: 'Routeur',      x: 415, y: 95,  type: 'routeur' },
  { id: 'VPN',  nom: 'Télétravail (VPN)',   court: 'VPN',          x: 575, y: 95,  type: 'hote' },
  { id: 'FS',   nom: 'Serveur de fichiers', court: 'Fichiers',     x: 415, y: 385, type: 'serveur', critique: true },
  { id: 'NAS',  nom: 'NAS de sauvegarde',   court: 'NAS',          x: 590, y: 445, type: 'serveur', critique: true },
  { id: 'SWB',  nom: 'Switch bureaux',      court: 'Sw. bureaux',  x: 600, y: 265, type: 'infra' },
  { id: 'P1',   nom: 'Poste bureau 1',      court: 'Poste 1',      x: 740, y: 150, type: 'hote' },
  { id: 'P2',   nom: 'Poste bureau 2',      court: 'Poste 2',      x: 740, y: 265, type: 'hote' },
  { id: 'PAIE', nom: 'Serveur de paie',     court: 'Paie',         x: 740, y: 385, type: 'serveur', critique: true },
];
const ECHELLE_NOMS_COURTS = 0.72;
const NOEUD = Object.fromEntries(NOEUDS.map(n => [n.id, n]));

const LIENS = [
  ['G', 'INV'], ['INV', 'SWA'], ['SWA', 'IMP'], ['SWA', 'CAM'], ['SWA', 'SW0'],
  ['SW0', 'R'], ['R', 'VPN'], ['SW0', 'SWB'], ['SWB', 'P1'], ['SWB', 'P2'], ['SWB', 'PAIE'],
  ['SW0', 'FS'], ['SW0', 'NAS'], ['FS', 'NAS'], ['CAM', 'NAS'],
].map(([a, b]) => ({ id: `${a}-${b}`, a, b }));
const LIEN = Object.fromEntries(LIENS.map(l => [l.id, l]));

const FLUX = [
  { id: 'paie',     nom: 'paie -> imprimante',       court: 'paie → impr.',    de: ['PAIE'],     vers: 'IMP' },
  { id: 'fichiers', nom: 'postes -> fichiers',       court: 'postes → fich.',  de: ['P1', 'P2'], vers: 'FS' },
  { id: 'vpn',      nom: 'télétravail -> fichiers',  court: 'VPN → fich.',     de: ['VPN'],      vers: 'FS' },
];
const FLUX_PAR_ID = Object.fromEntries(FLUX.map(f => [f.id, f]));

const ALERTES = [
  { hote: 'NAS',  titre: 'NAS de sauvegarde',   detail: 'exécution de code à distance, correctif disponible', cvss: 9.8 },
  { hote: 'INV',  titre: 'Borne Wi-Fi invités', detail: "identifiants d'administration par défaut",           cvss: 8.8 },
  { hote: 'PAIE', titre: 'Serveur de paie',     detail: 'SMBv1 encore activé',                                 cvss: 8.1 },
  { hote: 'IMP',  titre: 'Imprimante',          detail: 'interface web sans authentification, firmware 2019',  cvss: 7.5 },
  { hote: 'CAM',  titre: 'Caméra IP',           detail: 'flux RTSP ouvert, mot de passe faible',               cvss: 7.2 },
];

const ATTEINTS_DEPART = ['G', 'INV', 'SWA'];

// ---------------------------------------------------------------------------
// Graphe : fonctions pures sur (atteints, poses).
// Une pose est { type: 'cloison' | 'regle', flux?, tour }.
// ---------------------------------------------------------------------------

// Un flux ne transite que par les équipements réseau : une caméra ou un NAS ne
// route pas de paquets. L'intrus, lui, pivote par tout ce qu'il a compromis.
const TRANSITE = id => NOEUD[id].type === 'infra' || NOEUD[id].type === 'routeur';

function joignable(de, vers, passe) {
  const vus = new Set([de]);
  const file = [de];
  while (file.length) {
    const c = file.shift();
    if (c === vers) return true;
    if (c !== de && !TRANSITE(c)) continue;
    for (const l of LIENS) {
      if ((l.a !== c && l.b !== c) || !passe(l)) continue;
      const v = l.a === c ? l.b : l.a;
      if (!vus.has(v)) { vus.add(v); file.push(v); }
    }
  }
  return false;
}

function fluxPossible(f, poses) {
  const passe = l => { const p = poses.get(l.id); return !p || (p.type === 'regle' && p.flux === f.id); };
  return f.de.some(d => joignable(d, f.vers, passe));
}

function fluxCoupes(poses) { return FLUX.filter(f => !fluxPossible(f, poses)); }

// Les liens ouverts qui relient la zone de l'intrus au reste : son prochain saut.
function liensMenaces(atteints, poses) {
  return LIENS.filter(l => !poses.has(l.id) && atteints.has(l.a) !== atteints.has(l.b));
}

function propager(atteints, poses) {
  const suite = new Set(atteints);
  for (const l of liensMenaces(atteints, poses)) { suite.add(l.a); suite.add(l.b); }
  return suite;
}

// Ce qu'une cloison sur ce lien couperait, dans l'état actuel.
function fluxQueCouperait(lienId, poses) {
  const essai = new Map(poses);
  essai.set(lienId, { type: 'cloison' });
  return FLUX.filter(f => fluxPossible(f, poses) && !fluxPossible(f, essai));
}

function distanceSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const l2 = dx * dx + dy * dy;
  const t = l2 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2)) : 0;
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function noeudSous(x, y) {
  return NOEUDS.find(n => Math.hypot(x - n.x, y - n.y) < RAYON_NOEUD) || null;
}

function lienSous(x, y) {
  let meilleur = null, dmin = RAYON_CLIC;
  for (const l of LIENS) {
    const A = NOEUD[l.a], B = NOEUD[l.b];
    const d = distanceSegment(x, y, A.x, A.y, B.x, B.y);
    if (d < dmin) { dmin = d; meilleur = l; }
  }
  return meilleur;
}

function nomLien(l) { return `${NOEUD[l.a].nom} ↔ ${NOEUD[l.b].nom}`; }

function etatInitial() {
  return {
    phase: 'reseau', tour: 1, gestes: 0, cloisons: BUDGET_CLOISONS, regles: BUDGET_REGLES,
    atteints: new Set(ATTEINTS_DEPART), poses: new Map(), selection: null, choix: new Set(),
  };
}

const CSS = `
  .albys-scene{flex:1;min-width:0;min-height:0;position:relative;background:${FOND}}
  .albys-scene canvas{position:absolute;inset:0;display:block;cursor:default;touch-action:manipulation}
  .albys-scene canvas.sur-lien{cursor:pointer}
  .albys-legende{position:absolute;left:14px;bottom:8px;font-size:11px;color:#5E6C78;line-height:1.5;pointer-events:none}
  .jx-lat.albys-lat{width:min(36%,360px)}
  .albys-flux{display:flex;justify-content:space-between;gap:10px;margin:0 0 4px;font-size:12.5px}
  .albys-flux b{font-weight:400;color:${VERT};white-space:nowrap}
  .albys-flux.ko b{color:${ROUGE}}
  .albys-flux.ko span{color:${ROUGE}}
  .albys-note{color:${SECONDAIRE};font-size:12px}
  .albys-note.ko{color:${ROUGE}}
  .albys-lien .jx-choix{margin-top:8px}
  .albys-lien .jx-choix button.pose{border-color:var(--acc);color:var(--acc)}
  .albys-lien .jx-choix button[disabled]{opacity:.4;cursor:default}
  .albys-scan button{display:flex;gap:10px;align-items:baseline}
  .albys-scan button.sel{border-color:var(--acc);color:var(--acc);background:#13111C}
  .albys-scan button[disabled]{cursor:default}
  .albys-cvss{flex:none;font-size:11px;color:${SECONDAIRE};min-width:5.5ch}
  .albys-scan button.sel .albys-cvss,.albys-scan button.ok .albys-cvss,.albys-scan button.ko .albys-cvss{color:inherit}
  .albys-detail{display:block;font-size:11.5px;color:${SECONDAIRE};margin-top:2px}
  @media (max-width:760px){
    .jx-lat.albys-lat{width:auto}
    .albys-legende{display:none}
  }`;

export default {
  id: 'albys',
  ordre: 3,
  titre: 'Le réseau',
  employeur: 'ALBYS',
  annees: '2021 - 2023',
  factKey: 'albys',
  verbe: 'SEGMENTER',
  accent: '#9B7CFF',
  description: "Un poste invité compromis sur un réseau à plat. Cloisonner en VLAN, écrire des règles de pare-feu, confiner l'intrus sans couper les trois flux qui font tourner l'entreprise, puis prioriser les alertes du scan là où il peut frapper.",

  monter(conteneur, api) {
    const accent = api.accent;
    const cadre = creerCadre(conteneur, {
      titre: 'Le réseau', employeur: 'ALBYS', annees: '2021 - 2023', verbe: 'SEGMENTER', accent,
      consigne: "Clique un lien pour y poser une cloison VLAN ou une règle de pare-feu. Deux gestes par tour, puis l'intrus avance d'un saut.",
    });
    const style = document.createElement('style');
    style.textContent = CSS;
    cadre.racine.prepend(style);

    const scene = document.createElement('div');
    scene.className = 'albys-scene';
    const canvas = document.createElement('canvas');
    const legende = document.createElement('div');
    legende.className = 'albys-legende';
    legende.textContent = "rouge : joignable par l'intrus · pointillés rouges : son prochain saut · cadenas : actif à protéger";
    scene.append(canvas, legende);
    cadre.corps.appendChild(scene);
    const ctx = canvas.getContext('2d');

    const lat = creerLateral(cadre.corps);
    lat.el.classList.add('albys-lat');

    let etat = etatInitial();
    let vivant = true, survol = null, animation = 0, dephasage = 0;
    let W = 1, H = 1, dpr = 1, echelle = 1, ox = 0, oy = 0;
    let carteFlux = null, carteLien = null, carteScan = null;

    const btnAbandon = cadre.bouton('Abandonner', () => api.abandonner());
    const btnTour = cadre.bouton('Tour suivant', () => (etat.phase === 'scan' ? validerAlertes() : tourSuivant()), true);
    void btnAbandon;

    // --- géométrie ---------------------------------------------------------

    function redimensionner() {
      const r = scene.getBoundingClientRect();
      W = Math.max(1, r.width); H = Math.max(1, r.height);
      dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      canvas.style.width = `${W}px`; canvas.style.height = `${H}px`;
      echelle = Math.min(W / LARGEUR, H / HAUTEUR);
      ox = (W - LARGEUR * echelle) / 2; oy = (H - HAUTEUR * echelle) / 2;
      dessiner();
    }
    const observateur = new ResizeObserver(redimensionner);
    observateur.observe(scene);

    // taille en pixels écran, exprimée en unités du schéma (le contexte est mis à l'échelle)
    const px = v => v / echelle;
    const police = (taille, gras) => `${gras ? '600 ' : ''}${px(Math.min(14, Math.max(10, taille * Math.sqrt(echelle))))}px "IBM Plex Mono",ui-monospace,Menlo,monospace`;

    function coords(e) {
      const r = canvas.getBoundingClientRect();
      return { x: (e.clientX - r.left - ox) / echelle, y: (e.clientY - r.top - oy) / echelle };
    }

    // --- dessin ------------------------------------------------------------

    function dessiner() {
      if (!vivant) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.translate(ox, oy);
      ctx.scale(echelle, echelle);
      const menaces = new Set(etat.phase === 'reseau' ? liensMenaces(etat.atteints, etat.poses).map(l => l.id) : []);
      for (const l of LIENS) dessinerLien(l, menaces.has(l.id));
      for (const n of NOEUDS) dessinerNoeud(n);
      for (const n of NOEUDS) dessinerEtiquette(n);
      if (etat.phase !== 'reseau') for (const a of ALERTES) dessinerBadge(a);
    }

    function trait(A, B) { ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke(); }

    function dessinerLien(l, menace) {
      const A = NOEUD[l.a], B = NOEUD[l.b];
      const pose = etat.poses.get(l.id);
      const selection = etat.selection === l.id, sur = survol === l.id;
      ctx.save();
      ctx.lineCap = 'round';
      if (selection || sur) {
        ctx.strokeStyle = selection ? TEXTE : SECONDAIRE; ctx.lineWidth = px(8); ctx.globalAlpha = selection ? .28 : .18;
        trait(A, B); ctx.globalAlpha = 1;
      }
      if (pose) {
        ctx.strokeStyle = accent; ctx.lineWidth = px(1.5);
        if (pose.type === 'cloison') { ctx.setLineDash([px(3), px(6)]); ctx.globalAlpha = .45; }
        trait(A, B); ctx.setLineDash([]); ctx.globalAlpha = 1;
        dessinerMarque(A, B, pose);
      } else if (menace) {
        ctx.strokeStyle = ROUGE; ctx.lineWidth = px(2);
        ctx.setLineDash([px(6), px(6)]); ctx.lineDashOffset = -dephasage;
        trait(A, B); ctx.setLineDash([]);
        dessinerFleche(etat.atteints.has(l.a) ? A : B, etat.atteints.has(l.a) ? B : A);
      } else {
        const rouge = etat.atteints.has(l.a) && etat.atteints.has(l.b);
        ctx.strokeStyle = rouge ? ROUGE : LIEN_OUVERT; ctx.globalAlpha = rouge ? .55 : 1; ctx.lineWidth = px(1.5);
        trait(A, B);
      }
      ctx.restore();
    }

    function dessinerFleche(de, vers) {
      const dx = vers.x - de.x, dy = vers.y - de.y, L = Math.hypot(dx, dy) || 1;
      const ux = dx / L, uy = dy / L;
      const tx = vers.x - ux * (RAYON_NOEUD + 4), ty = vers.y - uy * (RAYON_NOEUD + 4);
      const s = px(6);
      ctx.fillStyle = ROUGE;
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(tx - ux * s * 1.6 - uy * s, ty - uy * s * 1.6 + ux * s);
      ctx.lineTo(tx - ux * s * 1.6 + uy * s, ty - uy * s * 1.6 - ux * s);
      ctx.closePath(); ctx.fill();
    }

    function dessinerMarque(A, B, pose) {
      const mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2;
      if (pose.type === 'cloison') {
        const dx = B.x - A.x, dy = B.y - A.y, L = Math.hypot(dx, dy) || 1;
        const nx = -dy / L, ny = dx / L, ux = dx / L, uy = dy / L;
        ctx.fillStyle = FOND; ctx.beginPath(); ctx.arc(mx, my, px(9), 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = accent; ctx.lineWidth = px(2);
        for (const k of [-1, 1]) {
          const cx = mx + ux * k * px(3), cy = my + uy * k * px(3);
          ctx.beginPath(); ctx.moveTo(cx + nx * px(7), cy + ny * px(7)); ctx.lineTo(cx - nx * px(7), cy - ny * px(7)); ctx.stroke();
        }
        return;
      }
      const texte = FLUX_PAR_ID[pose.flux].court;
      ctx.font = police(10.5, true);
      const w = ctx.measureText(texte).width + px(12), h = px(17);
      ctx.fillStyle = FOND; ctx.strokeStyle = accent; ctx.lineWidth = px(1);
      ctx.beginPath(); ctx.roundRect(mx - w / 2, my - h / 2, w, h, px(3)); ctx.fill(); ctx.stroke();
      ctx.fillStyle = accent; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(texte, mx, my + px(0.5));
    }

    function dessinerNoeud(n) {
      const atteint = etat.atteints.has(n.id);
      const couleur = atteint ? ROUGE : (n.critique ? accent : SECONDAIRE);
      ctx.save();
      ctx.lineWidth = px(1.5); ctx.strokeStyle = couleur;
      ctx.fillStyle = atteint ? 'rgba(232,80,58,.16)' : SURFACE;
      formeNoeud(n);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = couleur;
      glypheNoeud(n);
      if (n.critique) dessinerCadenas(n.x + 18, n.y - 20, couleur);
      if (n.origine) {
        ctx.strokeStyle = ROUGE; ctx.globalAlpha = .35 + .25 * Math.sin(dephasage / 6); ctx.lineWidth = px(1.5);
        ctx.beginPath(); ctx.arc(n.x, n.y, 24, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.restore();
    }

    function formeNoeud(n) {
      ctx.beginPath();
      if (n.type === 'hote') ctx.arc(n.x, n.y, 16, 0, Math.PI * 2);
      else if (n.type === 'serveur') ctx.roundRect(n.x - 18, n.y - 15, 36, 30, 3);
      else if (n.type === 'infra') ctx.roundRect(n.x - 24, n.y - 11, 48, 22, 3);
      else { ctx.moveTo(n.x, n.y - 18); ctx.lineTo(n.x + 24, n.y); ctx.lineTo(n.x, n.y + 18); ctx.lineTo(n.x - 24, n.y); ctx.closePath(); }
    }

    function glypheNoeud(n) {
      if (n.type === 'hote') { ctx.fillRect(n.x - 6, n.y - 5, 12, 8); ctx.fillRect(n.x - 3, n.y + 4, 6, 1.5); return; }
      if (n.type === 'serveur') { for (const k of [-6, 0, 6]) ctx.fillRect(n.x - 10, n.y + k - 1, 20, 2); return; }
      if (n.type === 'infra') { for (let k = -15; k <= 15; k += 10) ctx.fillRect(n.x + k - 2.5, n.y - 2.5, 5, 5); return; }
      ctx.beginPath(); ctx.arc(n.x, n.y, 4, 0, Math.PI * 2); ctx.fill();
    }

    function dessinerCadenas(x, y, couleur) {
      ctx.save();
      ctx.fillStyle = FOND; ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = couleur; ctx.fillStyle = couleur; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(x, y - 1.5, 3.2, Math.PI, 0); ctx.stroke();
      ctx.fillRect(x - 4.5, y - 1.5, 9, 6.5);
      ctx.restore();
    }

    function dessinerEtiquette(n) {
      const atteint = etat.atteints.has(n.id);
      const nom = echelle < ECHELLE_NOMS_COURTS ? n.court : n.nom;
      const y = n.y + (n.type === 'infra' ? 24 : 30);
      ctx.save();
      ctx.font = police(11, n.critique);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const w = ctx.measureText(nom).width + px(8), h = px(16);
      ctx.fillStyle = FOND; ctx.globalAlpha = .88;
      ctx.fillRect(n.x - w / 2, y - h / 2, w, h);
      ctx.globalAlpha = 1;
      ctx.fillStyle = atteint ? ROUGE : (n.critique ? TEXTE : SECONDAIRE);
      ctx.fillText(nom, n.x, y);
      if (n.sous) { ctx.font = police(9.5); ctx.fillStyle = ROUGE; ctx.fillText(n.sous, n.x, y + px(14)); }
      ctx.restore();
    }

    function dessinerBadge(a) {
      const n = NOEUD[a.hote];
      const expose = etat.atteints.has(a.hote);
      const revele = etat.phase === 'fin';
      const couleur = revele ? (expose ? ROUGE : SECONDAIRE) : accent;
      const x = n.x - 20, y = n.y - 18;
      ctx.save();
      ctx.fillStyle = FOND; ctx.beginPath(); ctx.arc(x, y, px(9), 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = couleur; ctx.lineWidth = px(1.5); ctx.stroke();
      ctx.fillStyle = couleur; ctx.font = police(11, true); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('!', x, y + px(0.5));
      ctx.restore();
    }

    function boucle() {
      if (!vivant) return;
      dephasage = (dephasage + 0.35) % 10000;
      dessiner();
      animation = requestAnimationFrame(boucle);
    }

    // --- colonne latérale, tableau 1 ---------------------------------------

    function construireLateralReseau() {
      lat.vider();
      lat.carte('La situation', `<p>L'EDR remonte un poste invité compromis sur le Wi-Fi de l'accueil. Le réseau est à plat : l'intrus voit déjà le switch de l'accueil.</p>
        <p class="albys-note">Garde la paie, les fichiers et les sauvegardes hors de sa portée. Budget : ${BUDGET_CLOISONS} cloisons VLAN, ${BUDGET_REGLES} règles de pare-feu, ${TOURS_MAX} tours.</p>`);
      carteFlux = lat.carte('Trois flux à préserver', '<div></div>');
      carteLien = lat.carte('Lien', '<p class="albys-note"></p><div class="jx-choix"></div>');
      carteLien.classList.add('albys-lien');
      majFlux(); majLien();
    }

    function majFlux() {
      if (!carteFlux) return;
      carteFlux.querySelector('div').innerHTML = FLUX.map(f => {
        const ok = fluxPossible(f, etat.poses);
        return `<p class="albys-flux${ok ? '' : ' ko'}"><span>${f.nom}</span><b>${ok ? 'passe' : 'coupé'}</b></p>`;
      }).join('');
    }

    function majLien() {
      if (!carteLien) return;
      const note = carteLien.querySelector('.albys-note');
      const zone = carteLien.querySelector('.jx-choix');
      zone.innerHTML = '';
      note.className = 'albys-note';
      const l = etat.selection && LIEN[etat.selection];
      if (!l) { note.textContent = 'Clique un lien du schéma pour y poser une cloison VLAN ou une règle.'; return; }
      carteLien.querySelector('h3').textContent = nomLien(l);
      const pose = etat.poses.get(l.id);
      const couperait = fluxQueCouperait(l.id, etat.poses);
      const plein = etat.gestes >= GESTES_PAR_TOUR;
      if (pose) note.textContent = pose.type === 'cloison' ? 'Cloison VLAN posée : rien ne passe.' : `Règle posée : seul « ${FLUX_PAR_ID[pose.flux].nom} » passe.`;
      else if (couperait.length) { note.textContent = `Une cloison ici couperait : ${couperait.map(f => f.nom).join(', ')}. Préfère une règle.`; note.classList.add('ko'); }
      else note.textContent = 'Aucun flux légitime ne passe par ce lien.';
      if (plein && !pose) { note.textContent = 'Deux gestes déjà posés ce tour. Appuie sur « Tour suivant ».'; }
      const bouton = (label, action, actif) => {
        const b = document.createElement('button');
        b.textContent = label; b.dataset.pose = action; b.disabled = !actif;
        b.addEventListener('click', () => poser(action));
        zone.appendChild(b);
        return b;
      };
      const b1 = bouton(`Cloison VLAN — couper le lien (${etat.cloisons} restante${etat.cloisons > 1 ? 's' : ''})`, 'cloison', !plein && etat.cloisons > 0 && !(pose && pose.type === 'cloison'));
      if (pose && pose.type === 'cloison') b1.classList.add('pose');
      for (const f of FLUX) {
        const deja = pose && pose.type === 'regle' && pose.flux === f.id;
        const b = bouton(`Règle — ne laisser passer que « ${f.nom} » (${etat.regles} restante${etat.regles > 1 ? 's' : ''})`, `regle:${f.id}`, !plein && etat.regles > 0 && !deja);
        if (deja) b.classList.add('pose');
      }
      if (pose) bouton('Retirer', 'retirer', true);
    }

    function majStatut(texte, etatCss) {
      if (etat.phase !== 'reseau') return;
      const base = `Tour ${etat.tour}/${TOURS_MAX} · gestes ${etat.gestes}/${GESTES_PAR_TOUR} · cloisons ${etat.cloisons} · règles ${etat.regles}`;
      cadre.statut(texte ? `${base} — ${texte}` : base, etatCss);
    }

    function rafraichir() { majFlux(); majLien(); dessiner(); }

    // --- actions du joueur -------------------------------------------------

    function selectionner(lienId) {
      if (etat.phase !== 'reseau') return;
      etat = { ...etat, selection: lienId };
      rafraichir();
    }

    function poser(action) {
      const id = etat.selection;
      if (!id || etat.phase !== 'reseau') return;
      const ancien = etat.poses.get(id);
      let { gestes, cloisons, regles } = etat;
      if (ancien) {
        if (ancien.tour === etat.tour) gestes -= 1;
        if (ancien.type === 'cloison') cloisons += 1; else regles += 1;
      }
      const poses = new Map(etat.poses);
      poses.delete(id);
      if (action === 'retirer') {
        etat = { ...etat, poses, gestes, cloisons, regles };
        rafraichir(); majStatut(`retiré sur ${nomLien(LIEN[id])}.`);
        return;
      }
      if (gestes >= GESTES_PAR_TOUR) { majStatut('deux gestes déjà posés ce tour.', 'ko'); return; }
      const type = action === 'cloison' ? 'cloison' : 'regle';
      if (type === 'cloison' && cloisons <= 0) { majStatut('plus de cloison disponible.', 'ko'); return; }
      if (type === 'regle' && regles <= 0) { majStatut('plus de règle disponible.', 'ko'); return; }
      const flux = type === 'regle' ? action.split(':')[1] : undefined;
      poses.set(id, { type, flux, tour: etat.tour });
      etat = { ...etat, poses, gestes: gestes + 1, cloisons: cloisons - (type === 'cloison' ? 1 : 0), regles: regles - (type === 'regle' ? 1 : 0) };
      rafraichir();
      const coupes = fluxCoupes(etat.poses);
      if (coupes.length) majStatut(`posé, mais « ${coupes[0].nom} » ne passe plus. Retire ou remplace par une règle.`, 'ko');
      else majStatut(`${type === 'cloison' ? 'cloison' : 'règle'} posée sur ${nomLien(LIEN[id])}.`, 'ok');
    }

    function tourSuivant() {
      if (etat.phase !== 'reseau') return;
      const coupes = fluxCoupes(etat.poses);
      if (coupes.length) {
        majStatut(`flux coupé : ${coupes.map(f => f.nom).join(', ')}. Retire la cloison ou remplace-la par une règle avant d'avancer.`, 'ko');
        return;
      }
      const atteints = propager(etat.atteints, etat.poses);
      const nouveaux = [...atteints].filter(id => !etat.atteints.has(id)).map(id => NOEUD[id].nom);
      const perdu = NOEUDS.find(n => n.critique && atteints.has(n.id));
      etat = { ...etat, atteints, selection: null };
      if (perdu) {
        perdre(`L'intrus a atteint ${perdu.nom} au tour ${etat.tour}. Regarde par où il est passé : chaque lien rouge en pointillés est un saut qu'il fera au tour suivant.`);
        return;
      }
      if (liensMenaces(atteints, etat.poses).length === 0) { passerAuScan(); return; }
      if (etat.tour >= TOURS_MAX) {
        perdre(`Quatre tours et l'intrus circule encore. Ce qu'il touche : ${[...atteints].map(id => NOEUD[id].nom).join(', ')}. Le cœur de réseau se ferme avec une règle, pas une cloison : la paie doit encore imprimer.`);
        return;
      }
      etat = { ...etat, tour: etat.tour + 1, gestes: 0 };
      rafraichir();
      majStatut(nouveaux.length ? `l'intrus a gagné ${nouveaux.join(', ')}.` : "l'intrus n'a rien gagné.", nouveaux.length ? 'ko' : 'ok');
    }

    // --- tableau 2 : le scan -----------------------------------------------

    function passerAuScan() {
      etat = { ...etat, phase: 'scan', choix: new Set() };
      btnTour.textContent = 'Traiter ces alertes';
      lat.vider();
      const zone = [...etat.atteints].map(id => NOEUD[id].nom).join(', ');
      lat.carte('Intrus confiné', `<p>Confiné en ${etat.tour} tour${etat.tour > 1 ? 's' : ''}. Les trois flux passent. Sa zone : ${zone}.</p>`);
      carteScan = lat.carte(`Scan OpenVAS : ${ALERTES.length} alertes`, `<p>Tu as le temps d'en traiter ${ALERTES_A_TRAITER} ce soir. Lesquelles ?</p><div class="jx-choix albys-scan"></div>`);
      const choix = carteScan.querySelector('.jx-choix');
      ALERTES.forEach((a, k) => {
        const b = document.createElement('button');
        b.dataset.alerte = k;
        b.innerHTML = `<span class="albys-cvss">${a.cvss.toFixed(1)}</span><span>${a.titre}<span class="albys-detail">${a.detail}</span></span>`;
        b.addEventListener('click', () => basculerAlerte(k));
        choix.appendChild(b);
      });
      cadre.statut(`Tableau 2 · choisis ${ALERTES_A_TRAITER} alertes sur ${ALERTES.length}, puis « Traiter ces alertes ».`);
      dessiner();
    }

    function basculerAlerte(k) {
      if (etat.phase !== 'scan') return;
      const choix = new Set(etat.choix);
      if (choix.has(k)) choix.delete(k);
      else if (choix.size < ALERTES_A_TRAITER) choix.add(k);
      else { cadre.statut(`Deux alertes seulement ce soir : retire-en une avant d'en choisir une autre.`, 'ko'); return; }
      etat = { ...etat, choix };
      carteScan.querySelectorAll('[data-alerte]').forEach(b => { b.className = choix.has(+b.dataset.alerte) ? 'sel' : ''; });
      cadre.statut(`Tableau 2 · ${choix.size}/${ALERTES_A_TRAITER} alerte${choix.size > 1 ? 's' : ''} choisie${choix.size > 1 ? 's' : ''}.`);
    }

    function validerAlertes() {
      if (etat.phase !== 'scan') return;
      if (etat.choix.size !== ALERTES_A_TRAITER) { cadre.statut(`Choisis exactement ${ALERTES_A_TRAITER} alertes.`, 'ko'); return; }
      const boutons = carteScan.querySelectorAll('[data-alerte]');
      const mauvais = [...etat.choix].filter(k => !etat.atteints.has(ALERTES[k].hote));
      if (mauvais.length) {
        const a = ALERTES[mauvais[0]];
        const choix = new Set([...etat.choix].filter(k => !mauvais.includes(k)));
        etat = { ...etat, choix };
        mauvais.forEach(k => { boutons[k].className = 'ko'; });
        cadre.statut(`${a.titre} : CVSS ${a.cvss.toFixed(1)}, mais l'intrus ne peut pas l'atteindre, c'est pour demain. Ce soir, traite ce qu'il touche.`, 'ko');
        return;
      }
      boutons.forEach(b => { b.disabled = true; if (etat.choix.has(+b.dataset.alerte)) b.className = 'ok'; });
      btnTour.disabled = true;
      gagner();
    }

    // --- fin ---------------------------------------------------------------

    function gagner() {
      etat = { ...etat, phase: 'fin' };
      dessiner();
      const hotes = NOEUDS.filter(n => n.type !== 'infra' && n.type !== 'routeur' && !n.origine);
      const proteges = hotes.filter(n => !etat.atteints.has(n.id)).length;
      const touches = hotes.filter(n => etat.atteints.has(n.id)).map(n => n.nom);
      const message = `Intrus confiné en ${etat.tour} tour${etat.tour > 1 ? 's' : ''}, trois flux préservés, ${proteges} actifs sur ${hotes.length} jamais joignables, alertes traitées dans sa zone.`;
      cadre.fin({
        titre: 'Quartier validé',
        texte: `${message}${touches.length ? ` ${touches.join(' et ')} : à réinitialiser, pas à pleurer.` : ''} Le 9.8 isolé attendra demain ; ce que l'intrus touche, c'était ce soir. ${api.FAITS.albys.pourLePoste}`,
        bouton: 'Prendre la clé',
        action: () => api.fini({ score: proteges, message }),
      });
    }

    function perdre(texte) {
      etat = { ...etat, phase: 'fin' };
      dessiner();
      cadre.statut('Rejoue : même réseau, même intrus.', 'ko');
      cadre.fin({
        titre: 'Pas tout à fait',
        texte,
        bouton: 'Rejouer',
        action: () => { const f = cadre.corps.querySelector('.jx-fin'); f && f.remove(); reinitialiser(); },
      });
    }

    function reinitialiser() {
      etat = etatInitial();
      btnTour.disabled = false;
      btnTour.textContent = 'Tour suivant';
      construireLateralReseau();
      rafraichir();
      majStatut();
    }

    // --- souris / tactile --------------------------------------------------

    function surDeplacement(e) {
      if (etat.phase !== 'reseau') { survol = null; canvas.classList.remove('sur-lien'); return; }
      const { x, y } = coords(e);
      const l = noeudSous(x, y) ? null : lienSous(x, y);
      survol = l ? l.id : null;
      canvas.classList.toggle('sur-lien', !!l);
    }
    function surClic(e) {
      const { x, y } = coords(e);
      const n = noeudSous(x, y);
      if (n) {
        const role = n.critique ? 'actif à protéger' : (n.type === 'infra' ? 'équipement réseau' : (n.type === 'routeur' ? 'routeur et pare-feu' : 'poste'));
        const etatN = etat.atteints.has(n.id) ? "joignable par l'intrus" : 'hors de portée';
        if (etat.phase === 'reseau') majStatut(`${n.nom} : ${role}, ${etatN}.`);
        return;
      }
      const l = lienSous(x, y);
      if (l) selectionner(l.id);
    }
    canvas.addEventListener('pointermove', surDeplacement);
    canvas.addEventListener('pointerleave', () => { survol = null; canvas.classList.remove('sur-lien'); });
    canvas.addEventListener('click', surClic);

    construireLateralReseau();
    majStatut();
    redimensionner();
    animation = requestAnimationFrame(boucle);

    return {
      demonter() {
        vivant = false;
        cancelAnimationFrame(animation);
        observateur.disconnect();
        conteneur.innerHTML = '';
      },
      // joue la solution : règle sur le cœur (la paie doit imprimer), cloison sur la
      // caméra (elle enregistre sur le NAS), un tour, puis les deux alertes exposées.
      async resoudre() {
        const clic = (carte, sel) => { const b = carte.querySelector(sel); if (b) b.click(); };
        selectionner('SWA-SW0');
        await attendre(20);
        clic(carteLien, '[data-pose="regle:paie"]');
        selectionner('SWA-CAM');
        await attendre(20);
        clic(carteLien, '[data-pose="cloison"]');
        await attendre(20);
        btnTour.click();
        await attendre(60);
        const exposees = ALERTES.map((a, k) => k).filter(k => etat.atteints.has(ALERTES[k].hote)).slice(0, ALERTES_A_TRAITER);
        for (const k of exposees) { clic(carteScan, `[data-alerte="${k}"]`); await attendre(20); }
        btnTour.click();
        await attendre(60);
        const fin = cadre.corps.querySelector('.jx-fin .jx-btn');
        fin && fin.click();
      },
    };
  },
};
