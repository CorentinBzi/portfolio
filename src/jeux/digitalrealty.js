// QUARTIER 5 — DIGITAL REALTY — verbe COORDONNER — « La supervision »
//
// Une région vue de haut, la nuit : cinq data centers reliés par des routes,
// un poste de supervision au centre. Quatre incidents tombent, chacun avec un
// anneau de délai qui se referme. Pour chacun : y aller soi-même (le pion se
// déplace réellement sur les routes), déléguer à un prestataire avec une
// consigne qu'il appliquera mot pour mot, ou classer sans suite. Un des quatre
// est un faux positif : le journal le dit, à condition de le lire.
// Gagné si les trois vrais incidents sont tenus dans leur délai et le faux
// positif classé. Le temps s'arrête tant qu'une fiche est ouverte.
//
// Le temps se compte en secondes de jeu ; `vitesse` multiplie l'horloge réelle
// et resoudre() la pousse à 20 pour conclure en quelques secondes.

import { creerCadre, attendre } from './_contrat.js';

const TW = 64, TH = 30, TZ = 20;                 // tuile isométrique et hauteur d'un étage
const VITESSE_PION = 0.5;                        // cases par seconde de jeu
const VITESSE_NORMALE = 1, VITESSE_RESOLUTION = 20;
const DT_MAX = 0.25;                             // seconde de jeu maximale par pas de simulation
const INTERVALLE_MS = 40;                        // période du minuteur de simulation
const DELAIS = { P1: 45, P2: 80, P3: 120 };      // engagements de service, en secondes de jeu
const HEURE_BASE = 14 * 3600;                    // 14:00:00 à T+0
const MALUS_CONSIGNE = 10, MALUS_DEPLACEMENT = 15;
const DELAI_FIN = 1.2;                           // seconde de jeu avant l'écran de fin
const ROUGE = '#E8503A', VERT = '#6FCF8E', TEXTE = '#C8D3DA', SECONDAIRE = '#7A8A96';
const FOND = '#07090C', LAMPE = '#E0B45A', P3_COULEUR = '#9ABFD6';

// Sites : boîtes isométriques (u, v, largeur, profondeur, étages) et une porte sur la route.
const SITES = [
  { code: 'DC 1', nom: 'Data center 1', lecteurs: 18, cameras: 42, porte: [3, 2],
    boites: [[0.6, 0.6, 2.2, 1.6, 2], [0.6, 2.2, 1.0, 0.8, 1]], centre: [1.6, 1.6] },
  { code: 'DC 2', nom: 'Data center 2', lecteurs: 22, cameras: 58, porte: [10, 4],
    boites: [[9.2, 1.0, 1.8, 1.8, 4], [11.0, 1.4, 1.0, 1.4, 2]], centre: [10.2, 2.0] },
  { code: 'DC 3', nom: 'Data center 3', lecteurs: 16, cameras: 37, porte: [14.5, 9],
    boites: [[14.0, 5.4, 2.0, 1.2, 2], [14.0, 6.6, 1.2, 1.6, 3]], centre: [14.8, 6.4] },
  { code: 'DC 4', nom: 'Data center 4', lecteurs: 24, cameras: 61, porte: [13, 10.7],
    boites: [[8.8, 10.0, 3.0, 1.4, 2], [9.4, 11.4, 1.8, 0.9, 1]], centre: [10.3, 10.9] },
  { code: 'DC 5', nom: 'Data center 5', lecteurs: 20, cameras: 49, porte: [3, 7],
    boites: [[0.6, 6.0, 1.6, 1.6, 3], [0.6, 7.6, 1.6, 1.4, 3]], centre: [1.4, 7.4] },
];
const QG = { code: 'SUPERVISION', porte: [8, 6.5], boites: [[6.2, 5.9, 1.4, 1.2, 1]], centre: [6.9, 6.5] };

// Routes : polylignes axées sur la grille. Les nœuds sont les jonctions et les portes.
const ROUTES = [
  [[0, 4], [3, 4], [8, 4], [10, 4], [13, 4], [16, 4]],
  [[0, 9], [3, 9], [8, 9], [13, 9], [14.5, 9], [16, 9]],
  [[3, 0], [3, 2], [3, 4], [3, 7], [3, 9], [3, 12]],
  [[8, 0], [8, 4], [8, 6.5], [8, 9], [8, 12]],
  [[13, 0], [13, 4], [13, 9], [13, 10.7], [13, 12]],
];
const LAMPES = [[3, 4], [8, 4], [13, 4], [3, 9], [8, 9], [13, 9], [3, 2], [10, 4], [14.5, 9], [13, 10.7], [3, 7], [8, 6.5]];

// Journaux : [décalage en secondes, source, texte]. Trois lignes, la décisive parmi elles.
const INCIDENTS = [
  {
    site: 1, prio: 'P2', arrivee: 3, vrai: true,
    titre: 'Lecteur de badge hors ligne',
    journaux: [
      [0, 'acs', 'lecteur R-07 (sas livraisons) : heartbeat perdu'],
      [0, 'net', 'contrôleur C-2 : lien DOWN sur le port 12'],
      [4, 'acs', 'porte sas livraisons verrouillée (fail-secure), 3 badges refusés'],
    ],
    consignes: [
      { t: 'Passer la porte du sas en ouverture libre le temps du dépannage.', ok: false,
        effet: 'sas livraisons ouvert sans contrôle, écart de conformité consigné. Lecteur toujours hors ligne.' },
      { t: 'Remonter le port 12 du contrôleur C-2, puis confirmer le heartbeat de R-07.', ok: true,
        effet: 'port 12 remonté, heartbeat R-07 rétabli, badges acceptés.' },
      { t: 'Remplacer le lecteur R-07 par un neuf du stock.', ok: false,
        effet: 'lecteur remplacé, toujours hors ligne : le port 12 du contrôleur est resté DOWN.' },
    ],
    surPlace: 'port 12 remonté sur C-2, lecteur R-07 de retour, badges acceptés.',
  },
  {
    site: 3, prio: 'P3', arrivee: 9, vrai: true,
    titre: 'Caméra sans signal',
    journaux: [
      [0, 'vms', 'caméra CAM-31 (couloir salle B) : NO SIGNAL'],
      [0, 'net', 'switch SW-B port 9 : défaut PoE, alimentation coupée'],
      [1, 'vms', 'enregistrement CAM-31 interrompu, 60 autres caméras nominales'],
    ],
    consignes: [
      { t: "Redémarrer l'enregistreur vidéo du site.", ok: false,
        effet: 'enregistreur redémarré, 61 caméras coupées 4 min. CAM-31 toujours sans signal, le port PoE est resté en défaut.' },
      { t: "Réarmer le PoE du port 9 sur SW-B, puis vérifier le retour d'image de CAM-31.", ok: true,
        effet: 'PoE réarmé, CAM-31 de retour, enregistrement repris.' },
      { t: 'Déclarer la caméra en panne et planifier son remplacement à la prochaine visite.', ok: false,
        effet: 'remplacement planifié la semaine prochaine. Couloir salle B sans vidéo d’ici là.' },
    ],
    surPlace: 'PoE réarmé sur SW-B, CAM-31 de retour, enregistrement repris.',
  },
  {
    site: 0, prio: 'P3', arrivee: 16, vrai: false,
    titre: 'Mouvement répété, zone 7',
    journaux: [
      [0, 'ids', 'zone 7 (local onduleurs) : mouvement, 4e détection en 6 min'],
      [-330, 'acs', 'badge prestataire ELEC-2 accepté en zone 7 : ordre de travail OT-2291, maintenance onduleurs 14:00-16:00'],
      [1, 'vms', 'CAM-07 zone 7 : une personne, gilet prestataire, badge visible'],
    ],
    consignes: [
      { t: 'Faire évacuer la zone 7 et verrouiller le local.', ok: false,
        effet: 'ELEC-2 sorti du local, maintenance onduleurs interrompue, OT-2291 à replanifier.' },
      { t: "Vérifier l'identité de la personne en zone 7.", ok: false,
        effet: 'identité vérifiée : ELEC-2, OT-2291, déjà accepté par le badge. Déplacement inutile.' },
      { t: 'Désactiver le capteur de la zone 7.', ok: false,
        effet: 'capteur désactivé, zone 7 sans détection, écart de conformité consigné.' },
    ],
    surPlace: 'ELEC-2, badgé, OT-2291 en cours. Déplacement pour rien.',
    sansSuite: 'mouvement expliqué : prestataire badgé sur ordre de travail. Classé sans suite.',
  },
  {
    site: 2, prio: 'P1', arrivee: 22, vrai: true,
    titre: 'Porte forcée, salle serveurs C',
    journaux: [
      [0, 'acs', 'porte P-14 (salle serveurs C) : OUVERTE sans badge ni bouton de sortie'],
      [0, 'acs', 'P-14 : contact de porte forcé, alarme intrusion'],
      [1, 'vms', 'CAM-19 : porte entrebâillée, personne visible, caisse au sol'],
    ],
    consignes: [
      { t: "Couper l'alarme intrusion pour arrêter les notifications.", ok: false,
        effet: 'alarme coupée. Porte toujours ouverte, personne toujours dans la salle.' },
      { t: "Constater sur place, sécuriser P-14 et consigner l'état de la salle.", ok: true,
        effet: 'porte P-14 sécurisée, constat consigné.' },
      { t: 'Remettre la porte en mode normal depuis le logiciel.', ok: false,
        effet: 'commande envoyée. Le contact est forcé physiquement : la porte reste ouverte.' },
    ],
    surPlace: 'porte P-14 refermée, salle C sécurisée, constat consigné.',
  },
];

const PIONS_DEPART = [
  { id: 'coord', nom: 'vous', depart: QG.porte, forme: 'rond' },
  { id: 'A', nom: 'prestataire A', depart: SITES[4].porte, forme: 'carre' },
  { id: 'B', nom: 'prestataire B', depart: SITES[2].porte, forme: 'carre' },
];

const CSS = `
  .dr-scene{flex:1;min-width:0;min-height:0;position:relative;overflow:hidden;
      background:radial-gradient(120% 90% at 50% 110%,#0B1524 0%,#07090C 60%)}
  .dr-scene canvas{position:absolute;inset:0;display:block;touch-action:manipulation}
  .dr-scene canvas.sur-cible{cursor:pointer}
  .dr-hud{position:absolute;left:14px;top:12px;display:flex;align-items:center;gap:16px;
      padding:8px 12px;background:rgba(7,9,12,.72);border:1px solid #1F2832;border-radius:2px;
      font-size:12px;color:${SECONDAIRE};pointer-events:none;backdrop-filter:blur(3px)}
  .dr-hud b{font-weight:400;color:${TEXTE}}
  .dr-hud .dr-conf{display:flex;align-items:center;gap:8px}
  .dr-hud .jx-jauge{width:120px}
  .dr-hud .dr-heure{font-variant-numeric:tabular-nums;color:${TEXTE}}
  .dr-hud .dr-pause{color:var(--acc);letter-spacing:.1em;font-size:10.5px}
  .dr-fil{position:absolute;left:14px;bottom:12px;max-width:min(52%,520px);font-size:11.5px;line-height:1.45;
      color:${SECONDAIRE};pointer-events:none;display:flex;flex-direction:column;gap:2px}
  .dr-fil div{background:rgba(7,9,12,.7);padding:2px 8px;border-left:2px solid #2B3843}
  .dr-fil div.ok{border-left-color:${VERT};color:${TEXTE}}
  .dr-fil div.ko{border-left-color:${ROUGE};color:${TEXTE}}
  .dr-fil div.acc{border-left-color:var(--acc);color:${TEXTE}}
  .dr-fiche{position:absolute;right:14px;top:12px;width:min(360px,calc(100% - 28px));
      background:rgba(11,14,17,.94);border:1px solid #2B3843;border-left:3px solid var(--acc);border-radius:2px;
      padding:12px 14px;font-size:12.5px;box-shadow:0 12px 40px rgba(0,0,0,.5)}
  .dr-fiche.p1{border-left-color:${ROUGE}}
  .dr-fiche h3{font:700 11px/1.3 "Archivo",sans-serif;letter-spacing:.1em;text-transform:uppercase;color:var(--acc);margin:0 22px 4px 0}
  .dr-fiche.p1 h3{color:${ROUGE}}
  .dr-fiche .dr-delai{font-size:11px;color:${SECONDAIRE};margin-bottom:8px;font-variant-numeric:tabular-nums}
  .dr-fiche .dr-delai b{font-weight:400;color:${TEXTE}}
  .dr-fermer{position:absolute;right:8px;top:8px;background:transparent;border:0;color:${SECONDAIRE};font:16px/1 monospace;cursor:pointer;padding:2px 6px}
  .dr-fermer:hover{color:${TEXTE}}
  .dr-journal{background:#05070A;border:1px solid #1F2832;padding:8px 10px;margin-bottom:10px;font-size:11.5px;line-height:1.5}
  .dr-journal div{display:grid;grid-template-columns:5.2ch 3.2ch 1fr;gap:8px;color:${TEXTE}}
  .dr-journal .h{color:#4E5A66;font-variant-numeric:tabular-nums}
  .dr-journal .s{color:var(--acc);text-transform:uppercase;font-size:10px;padding-top:2px}
  .dr-fiche .jx-choix button{display:flex;justify-content:space-between;gap:10px;align-items:baseline}
  .dr-fiche .jx-choix button small{color:${SECONDAIRE};font-size:10.5px;white-space:nowrap}
  .dr-fiche .jx-choix button[disabled]{opacity:.4;cursor:default}
  .dr-consignes{margin-top:8px}
  .dr-consignes p{margin:0 0 6px;font-size:11.5px;color:${SECONDAIRE}}
  .dr-consignes .jx-choix button{display:block;line-height:1.35}
  .dr-legende{position:absolute;right:14px;bottom:12px;font-size:10.5px;color:#5E6C78;pointer-events:none;text-align:right;line-height:1.5}
  @media (max-width:760px){
    .dr-fiche{right:0;left:0;top:auto;bottom:0;width:auto;max-height:62%;overflow:auto;border-left:0;border-top:3px solid var(--acc)}
    .dr-fiche.p1{border-top-color:${ROUGE}}
    .dr-fil{max-width:calc(100% - 28px);bottom:8px}
    .dr-legende{display:none}
    .dr-hud{gap:10px;padding:6px 8px}
    .dr-hud .jx-jauge{width:70px}
  }`;

// ---------------------------------------------------------------------------
// Graphe routier : fonctions pures.
// ---------------------------------------------------------------------------

const cle = ([u, v]) => `${u},${v}`;
const depuisCle = k => k.split(',').map(Number);
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

const VOISINS = (() => {
  const m = new Map();
  const lier = (a, b) => {
    if (!m.has(a)) m.set(a, []);
    m.get(a).push(b);
  };
  for (const r of ROUTES) for (let i = 0; i + 1 < r.length; i++) { lier(cle(r[i]), cle(r[i + 1])); lier(cle(r[i + 1]), cle(r[i])); }
  return m;
})();

// Plus court chemin entre deux nœuds : liste de points, départ exclu.
function chemin(deK, versK) {
  if (deK === versK) return [];
  const d = new Map([[deK, 0]]), prev = new Map(), vus = new Set();
  while (true) {
    let c = null;
    for (const [k, v] of d) if (!vus.has(k) && (c === null || v < d.get(c))) c = k;
    if (c === null || c === versK) break;
    vus.add(c);
    for (const n of VOISINS.get(c) || []) {
      const nd = d.get(c) + dist(depuisCle(c), depuisCle(n));
      if (!d.has(n) || nd < d.get(n)) { d.set(n, nd); prev.set(n, c); }
    }
  }
  if (!prev.has(versK)) return null;
  const out = [];
  for (let k = versK; k !== deK; k = prev.get(k)) out.unshift(depuisCle(k));
  return out;
}

function longueur(pos, pts) {
  let L = 0, p = pos;
  for (const q of pts) { L += dist(p, q); p = q; }
  return L;
}

// Itinéraire d'un pion : il finit d'abord son segment en cours (vers `prochain`).
function itineraire(pion, porte) {
  const suite = chemin(cle(pion.prochain), cle(porte));
  if (!suite) return null;
  const pts = (cle(pion.prochain) === cle(pion.pos) ? [] : [pion.prochain]).concat(suite);
  return { pts, duree: longueur(pion.pos, pts) / VITESSE_PION };
}

// Avance un pion de `d` cases le long de son chemin ; renvoie le pion mis à jour et s'il est arrivé.
function avancer(pion, d) {
  let pos = pion.pos, pts = pion.chemin;
  while (d > 0 && pts.length) {
    const seg = dist(pos, pts[0]);
    if (seg <= d) { d -= seg; pos = pts[0]; pts = pts.slice(1); }
    else { const t = d / seg; pos = [pos[0] + (pts[0][0] - pos[0]) * t, pos[1] + (pts[0][1] - pos[1]) * t]; d = 0; }
  }
  const prochain = pts.length ? pts[0] : pos;
  return { pion: { ...pion, pos, chemin: pts, prochain }, arrive: pts.length === 0 && pion.chemin.length > 0 };
}

const projeter = (u, v, z = 0) => ({ x: (u - v) * TW / 2, y: (u + v) * TH / 2 - (z || 0) * TZ });
const heure = s => { const t = HEURE_BASE + Math.round(s); return [t / 3600, (t / 60) % 60, t % 60].map(n => String(Math.floor(n)).padStart(2, '0')).join(':'); };
const mmss = s => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.floor(Math.max(0, s) % 60)).padStart(2, '0')}`;
const couleurPrio = (prio, accent) => prio === 'P1' ? ROUGE : prio === 'P2' ? accent : P3_COULEUR;
const hachage = (a, b, c) => { let h = a * 374761393 + b * 668265263 + c * 2147483647; h = (h ^ (h >> 13)) * 1274126177; return ((h ^ (h >> 16)) >>> 0) % 1000 / 1000; };

function etatInitial() {
  return {
    phase: 'jeu', t: 0, conformite: 100, fiche: null, finA: null,
    incidents: INCIDENTS.map(i => ({ ...i, statut: 'attente', echeance: 0, essayees: [], resume: '' })),
    pions: PIONS_DEPART.map(p => ({ ...p, pos: p.depart, prochain: p.depart, chemin: [], mission: null })),
  };
}

export default {
  id: 'digitalrealty',
  ordre: 5,
  titre: 'La supervision',
  employeur: 'DIGITAL REALTY',
  annees: '2025 → aujourd’hui',
  factKey: 'digitalrealty',
  verbe: 'COORDONNER',
  accent: '#5AA9E6',
  description: "Cinq data centers sur une carte de nuit, quatre incidents dans leur délai. Y aller, déléguer avec une consigne exécutable, ou classer sans suite : un des quatre est un faux positif que le journal révèle.",

  monter(conteneur, api) {
    const accent = api.accent;
    const cadre = creerCadre(conteneur, {
      titre: 'La supervision', employeur: 'DIGITAL REALTY', annees: '2025 → aujourd’hui', verbe: 'COORDONNER', accent,
      consigne: "Clique un incident sur la carte. Lis le journal, puis : y aller, déléguer avec une consigne, ou classer sans suite. Le temps s'arrête tant qu'une fiche est ouverte.",
    });
    const style = document.createElement('style');
    style.textContent = CSS;
    cadre.racine.prepend(style);

    const scene = document.createElement('div');
    scene.className = 'dr-scene';
    scene.innerHTML = `<canvas></canvas>
      <div class="dr-hud"><span class="dr-conf">conformité <span class="jx-jauge"><i style="width:100%"></i></span><b class="dr-pct">100 %</b></span>
        <span>tenus <b class="dr-tenus">0/3</b></span><span class="dr-heure">14:00:00</span><span class="dr-pause"></span></div>
      <div class="dr-fil"></div>
      <div class="dr-legende">anneau : délai restant · P1 court, P3 long<br>rond : vous · carrés : prestataires A et B</div>`;
    cadre.corps.appendChild(scene);
    const canvas = scene.querySelector('canvas');
    const ctx = canvas.getContext('2d');
    const hud = {
      jauge: scene.querySelector('.jx-jauge i'), pct: scene.querySelector('.dr-pct'), tenus: scene.querySelector('.dr-tenus'),
      heure: scene.querySelector('.dr-heure'), pause: scene.querySelector('.dr-pause'), fil: scene.querySelector('.dr-fil'),
    };

    let etat = etatInitial();
    let vivant = true, animation = 0, vitesse = VITESSE_NORMALE, precedent = 0, horloge = 0;
    let W = 1, H = 1, dpr = 1, echelle = 1, ox = 0, oy = 0, survol = null, ficheEl = null;

    cadre.bouton('Abandonner', () => api.abandonner());

    // --- géométrie écran ---------------------------------------------------

    const BORNES = (() => {
      const pts = [projeter(-0.5, 12.5), projeter(16.5, -0.5), projeter(-0.5, -0.5), projeter(16.5, 12.5)];
      const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
      return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys) - 4.2 * TZ, y1: Math.max(...ys) - 2 * TH };
    })();

    function redimensionner() {
      const r = scene.getBoundingClientRect();
      W = Math.max(1, r.width); H = Math.max(1, r.height);
      dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      canvas.style.width = `${W}px`; canvas.style.height = `${H}px`;
      const lw = BORNES.x1 - BORNES.x0, lh = BORNES.y1 - BORNES.y0;
      echelle = Math.min(W / lw, H / lh) * 0.98;
      ox = (W - lw * echelle) / 2 - BORNES.x0 * echelle;
      oy = (H - lh * echelle) / 2 - BORNES.y0 * echelle;
      dessiner();
    }
    const observateur = new ResizeObserver(redimensionner);
    observateur.observe(scene);

    const ecran = (u, v, z) => { const p = projeter(u, v, z); return { x: ox + p.x * echelle, y: oy + p.y * echelle }; };
    const px = v => v * echelle;
    const police = (taille, gras) => `${gras ? '700 ' : ''}${Math.max(9, Math.min(15, taille * Math.sqrt(echelle)))}px "IBM Plex Mono",ui-monospace,Menlo,monospace`;
    const policeTitre = taille => `700 ${Math.max(9, Math.min(16, taille * Math.sqrt(echelle)))}px "Archivo",system-ui,sans-serif`;

    // Position écran du marqueur d'un site (sommet du bâtiment le plus haut).
    function marqueurEcran(site) {
      const haut = Math.max(...site.boites.map(b => b[4]));
      const p = ecran(site.centre[0], site.centre[1], haut + 1.1);
      return { x: p.x, y: p.y - px(6) };
    }

    // --- dessin ------------------------------------------------------------

    function poly(pts, remplir, tracer, largeur) {
      ctx.beginPath();
      pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      ctx.closePath();
      if (remplir) { ctx.fillStyle = remplir; ctx.fill(); }
      if (tracer) { ctx.strokeStyle = tracer; ctx.lineWidth = largeur || 1; ctx.stroke(); }
    }

    function dessinerSol() {
      ctx.save();
      poly([ecran(-0.5, -0.5), ecran(16.5, -0.5), ecran(16.5, 12.5), ecran(-0.5, 12.5)], 'rgba(12,18,26,.9)', 'rgba(90,169,230,.12)', 1);
      ctx.strokeStyle = 'rgba(90,169,230,.05)'; ctx.lineWidth = 1;
      for (let u = 0; u <= 16; u++) { const a = ecran(u, -0.5), b = ecran(u, 12.5); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
      for (let v = 0; v <= 12; v++) { const a = ecran(-0.5, v), b = ecran(16.5, v); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
      ctx.restore();
    }

    function dessinerRoutes() {
      ctx.save();
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      const tracer = (largeur, couleur, tirets) => {
        ctx.lineWidth = largeur; ctx.strokeStyle = couleur; ctx.setLineDash(tirets || []);
        for (const r of ROUTES) { ctx.beginPath(); r.forEach((p, i) => { const e = ecran(p[0], p[1]); i ? ctx.lineTo(e.x, e.y) : ctx.moveTo(e.x, e.y); }); ctx.stroke(); }
      };
      tracer(px(15), '#0E141A');
      tracer(px(12), '#161E26');
      tracer(px(1), 'rgba(200,211,218,.13)', [px(6), px(7)]);
      ctx.restore();
      for (const [u, v] of LAMPES) {
        const p = ecran(u, v, 0), h = ecran(u, v, 0.7);
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, px(22));
        g.addColorStop(0, 'rgba(224,180,90,.22)'); g.addColorStop(1, 'rgba(224,180,90,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(p.x, p.y, px(22), px(11), 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(200,211,218,.35)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(h.x, h.y); ctx.stroke();
        ctx.fillStyle = LAMPE; ctx.beginPath(); ctx.arc(h.x, h.y, px(1.8), 0, Math.PI * 2); ctx.fill();
      }
    }

    function dessinerBoite(site, b, k, halo) {
      const [u0, v0, w, d, h] = b;
      const P = (u, v, z) => ecran(u, v, z);
      if (halo) {
        const c = P(u0 + w / 2, v0 + d / 2, 0);
        const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, px(70));
        g.addColorStop(0, halo); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(c.x, c.y, px(70), px(35), 0, 0, Math.PI * 2); ctx.fill();
      }
      poly([P(u0, v0 + d, 0), P(u0 + w, v0 + d, 0), P(u0 + w, v0 + d, h), P(u0, v0 + d, h)], '#0E151C', 'rgba(90,169,230,.28)', 1);
      poly([P(u0 + w, v0 + d, 0), P(u0 + w, v0, 0), P(u0 + w, v0, h), P(u0 + w, v0 + d, h)], '#131C25', 'rgba(90,169,230,.28)', 1);
      poly([P(u0, v0, h), P(u0 + w, v0, h), P(u0 + w, v0 + d, h), P(u0, v0 + d, h)], '#1B2733', 'rgba(90,169,230,.45)', 1);
      // fenêtres : gauche le long de u, droite le long de v
      const fen = (face, n, etage, j) => {
        const a = (j + 0.22) / n, bb = (j + 0.78) / n, z0 = etage + 0.3, z1 = etage + 0.72;
        const pts = face === 'g'
          ? [P(u0 + w * a, v0 + d, z0), P(u0 + w * bb, v0 + d, z0), P(u0 + w * bb, v0 + d, z1), P(u0 + w * a, v0 + d, z1)]
          : [P(u0 + w, v0 + d * (1 - a), z0), P(u0 + w, v0 + d * (1 - bb), z0), P(u0 + w, v0 + d * (1 - bb), z1), P(u0 + w, v0 + d * (1 - a), z1)];
        const r = hachage(k * 7 + etage, j, face === 'g' ? 1 : 2);
        const clignote = ((r * 100 + Math.floor(horloge * 0.6)) % 9) === 0;
        const allume = r > 0.28 && !clignote;
        poly(pts, allume ? (r > 0.8 ? 'rgba(224,180,90,.55)' : 'rgba(120,190,255,.5)') : 'rgba(20,28,36,.9)');
      };
      for (let e = 0; e < h; e++) {
        const ng = Math.max(2, Math.round(w * 3)), nd = Math.max(2, Math.round(d * 3));
        for (let j = 0; j < ng; j++) fen('g', ng, e, j);
        for (let j = 0; j < nd; j++) fen('d', nd, e, j);
      }
      // toit : groupes froids et balise
      const nb = Math.max(1, Math.round(w * d));
      for (let i = 0; i < nb; i++) {
        const cu = u0 + 0.25 + (w - 0.5) * ((i + 0.5) / nb), cv = v0 + d * 0.5;
        const s = 0.18;
        poly([P(cu - s, cv + s, h), P(cu + s, cv + s, h), P(cu + s, cv + s, h + 0.25), P(cu - s, cv + s, h + 0.25)], '#0B1218');
        poly([P(cu + s, cv + s, h), P(cu + s, cv - s, h), P(cu + s, cv - s, h + 0.25), P(cu + s, cv + s, h + 0.25)], '#101922');
        poly([P(cu - s, cv - s, h + 0.25), P(cu + s, cv - s, h + 0.25), P(cu + s, cv + s, h + 0.25), P(cu - s, cv + s, h + 0.25)], '#243440');
      }
      const bal = P(u0 + w, v0, h + 0.55), baseBal = P(u0 + w, v0, h);
      ctx.strokeStyle = 'rgba(200,211,218,.4)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(baseBal.x, baseBal.y); ctx.lineTo(bal.x, bal.y); ctx.stroke();
      if (Math.sin(horloge * 3 + k) > 0.6) { ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(bal.x, bal.y, px(1.8), 0, Math.PI * 2); ctx.fill(); }
    }

    function dessinerSite(site, k, incident) {
      const halo = incident ? (incident.prio === 'P1' ? `rgba(232,80,58,${0.14 + 0.1 * Math.sin(horloge * 5)})` : `rgba(90,169,230,${0.12 + 0.08 * Math.sin(horloge * 3)})`) : null;
      site.boites.forEach((b, i) => dessinerBoite(site, b, k * 3 + i, i === 0 ? halo : null));
      // plaque au sol devant la porte
      const p = ecran(site.porte[0], site.porte[1], 0);
      const c = ecran(site.centre[0], site.centre[1], 0);
      ctx.strokeStyle = 'rgba(90,169,230,.35)'; ctx.lineWidth = px(2); ctx.setLineDash([px(3), px(3)]);
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(c.x, c.y); ctx.stroke(); ctx.setLineDash([]);
      const l = ecran(site.centre[0], site.centre[1] + (site === QG ? 1.1 : 1.7), 0);
      ctx.font = policeTitre(11); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const w = ctx.measureText(site.code).width + px(14), h = px(16);
      ctx.fillStyle = 'rgba(7,9,12,.85)'; ctx.fillRect(l.x - w / 2, l.y - h / 2, w, h);
      ctx.strokeStyle = site === QG ? accent : 'rgba(90,169,230,.5)'; ctx.lineWidth = 1; ctx.strokeRect(l.x - w / 2, l.y - h / 2, w, h);
      ctx.fillStyle = site === QG ? accent : TEXTE; ctx.fillText(site.code, l.x, l.y + 0.5);
    }

    function dessinerMarqueur(incident) {
      const site = SITES[incident.site];
      const m = marqueurEcran(site);
      const couleur = couleurPrio(incident.prio, accent);
      const y = m.y + Math.sin(horloge * 2.5 + incident.site) * px(3);
      const r = px(14);
      const fraction = Math.max(0, Math.min(1, (incident.echeance - etat.t) / DELAIS[incident.prio]));
      const pulse = (horloge * 1.1 + incident.site * 0.3) % 1;
      ctx.save();
      ctx.strokeStyle = couleur; ctx.globalAlpha = (1 - pulse) * 0.55; ctx.lineWidth = px(1.5);
      ctx.beginPath(); ctx.arc(m.x, y, r + pulse * px(16), 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
      const pied = ecran(site.centre[0], site.centre[1], Math.max(...site.boites.map(b => b[4])));
      ctx.setLineDash([px(2), px(3)]); ctx.strokeStyle = couleur; ctx.globalAlpha = .5; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(m.x, y + r); ctx.lineTo(pied.x, pied.y); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(7,9,12,.92)'; ctx.beginPath(); ctx.arc(m.x, y, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(200,211,218,.15)'; ctx.lineWidth = px(3); ctx.beginPath(); ctx.arc(m.x, y, r, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = couleur; ctx.lineWidth = px(3); ctx.lineCap = 'butt';
      ctx.beginPath(); ctx.arc(m.x, y, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * fraction); ctx.stroke();
      if (survol === incident || etat.fiche === incident) { ctx.strokeStyle = TEXTE; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(m.x, y, r + px(4), 0, Math.PI * 2); ctx.stroke(); }
      ctx.fillStyle = couleur; ctx.font = police(10.5, true); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(incident.prio, m.x, y + 0.5);
      ctx.restore();
    }

    function dessinerPion(pion) {
      const p = ecran(pion.pos[0], pion.pos[1], 0);
      const couleur = pion.id === 'coord' ? accent : LAMPE;
      ctx.save();
      if (pion.chemin.length) {
        ctx.strokeStyle = couleur; ctx.globalAlpha = .55; ctx.lineWidth = px(2); ctx.setLineDash([px(4), px(5)]); ctx.lineDashOffset = -horloge * px(20);
        ctx.beginPath(); ctx.moveTo(p.x, p.y);
        for (const q of pion.chemin) { const e = ecran(q[0], q[1], 0); ctx.lineTo(e.x, e.y); }
        ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
      }
      ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.beginPath(); ctx.ellipse(p.x, p.y + px(2), px(8), px(4), 0, 0, Math.PI * 2); ctx.fill();
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, px(18));
      g.addColorStop(0, couleur + '55'); g.addColorStop(1, couleur + '00');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, px(18), 0, Math.PI * 2); ctx.fill();
      const y = p.y - px(7), r = px(6.5);
      ctx.fillStyle = couleur; ctx.strokeStyle = FOND; ctx.lineWidth = px(1.5);
      ctx.beginPath();
      if (pion.forme === 'rond') ctx.arc(p.x, y, r, 0, Math.PI * 2); else ctx.rect(p.x - r, y - r, r * 2, r * 2);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = FOND; ctx.font = police(8.5, true); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(pion.id === 'coord' ? '●' : pion.id, p.x, y + 0.5);
      ctx.font = police(9.5, pion.id === 'coord'); ctx.fillStyle = couleur;
      const nom = pion.id === 'coord' ? 'vous' : pion.id;
      const w = ctx.measureText(nom).width + px(6);
      ctx.fillStyle = 'rgba(7,9,12,.8)'; ctx.fillRect(p.x - w / 2, y - r - px(15), w, px(12));
      ctx.fillStyle = couleur; ctx.fillText(nom, p.x, y - r - px(9));
      ctx.restore();
    }

    function dessiner() {
      if (!vivant) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      dessinerSol();
      dessinerRoutes();
      const objets = SITES.map((s, k) => ({ prof: s.centre[0] + s.centre[1], f: () => dessinerSite(s, k, etat.incidents.find(i => i.site === k && i.statut === 'ouvert')) }));
      objets.push({ prof: QG.centre[0] + QG.centre[1], f: () => dessinerSite(QG, 9, null) });
      for (const p of etat.pions) objets.push({ prof: p.pos[0] + p.pos[1] + 0.01, f: () => dessinerPion(p) });
      objets.sort((a, b) => a.prof - b.prof).forEach(o => o.f());
      for (const i of etat.incidents) if (i.statut === 'ouvert') dessinerMarqueur(i);
    }

    // --- HUD et fil d'événements ------------------------------------------

    function majHud() {
      hud.jauge.style.width = `${etat.conformite}%`;
      hud.jauge.parentNode.classList.toggle('ko', etat.conformite < 70);
      hud.pct.textContent = `${etat.conformite} %`;
      hud.tenus.textContent = `${etat.incidents.filter(i => i.statut === 'clos').length}/3`;
      hud.heure.textContent = heure(etat.t);
      hud.pause.textContent = etat.fiche ? 'PAUSE' : '';
    }

    function fil(texte, classe) {
      const d = document.createElement('div');
      d.textContent = `${heure(etat.t)}  ${texte}`;
      if (classe) d.className = classe;
      hud.fil.appendChild(d);
      while (hud.fil.children.length > 3) hud.fil.firstChild.remove();
      cadre.statut(texte, classe === 'acc' ? '' : classe);
    }

    // --- horloge -----------------------------------------------------------

    // La simulation tourne sur un minuteur fixe (elle avance même sans image) ;
    // requestAnimationFrame ne fait que dessiner, avec un dessin de secours si
    // aucune image n'est venue depuis 200 ms.
    function image() {
      precedent = performance.now();
      horloge = precedent / 1000;
      majHud();
      dessiner();
    }
    function boucle() {
      if (!vivant) return;
      image();
      animation = requestAnimationFrame(boucle);
    }
    function tic() {
      if (!vivant) return;
      if (etat.phase === 'jeu' && !etat.fiche) {
        let dt = (INTERVALLE_MS / 1000) * vitesse;
        while (dt > 0 && etat.phase === 'jeu') { const pas = Math.min(dt, DT_MAX); avancerTemps(pas); dt -= pas; }
      }
      if (etat.phase === 'jeu' && etat.finA !== null && etat.t >= etat.finA) gagner();
      if (performance.now() - precedent > 200) image();
    }

    function avancerTemps(dt) {
      const t = etat.t + dt;
      const nouveaux = etat.incidents.filter(i => i.statut === 'attente' && t >= i.arrivee);
      const incidents = etat.incidents.map(i => nouveaux.includes(i) ? { ...i, statut: 'ouvert', echeance: i.arrivee + DELAIS[i.prio] } : i);
      const pions = [], arrives = [];
      for (const p of etat.pions) { const r = avancer(p, VITESSE_PION * dt); pions.push(r.pion); if (r.arrive) arrives.push(r.pion); }
      etat = { ...etat, t, incidents, pions };
      for (const i of nouveaux) fil(`${SITES[i.site].code} · ${i.prio} · ${i.titre} — délai ${mmss(DELAIS[i.prio])}`, i.prio === 'P1' ? 'ko' : 'acc');
      for (const p of arrives) arrivee(p);
      const rompu = etat.incidents.find(i => i.statut === 'ouvert' && i.vrai && etat.t >= i.echeance);
      if (rompu) perdre(`Engagement rompu sur ${SITES[rompu.site].code} : « ${rompu.titre} » (${rompu.prio}) n'a pas été tenu dans son délai de ${mmss(DELAIS[rompu.prio])}. Sur une carte, la distance compte : envoie le plus proche, et lis les consignes avant de déléguer.`);
    }

    // --- missions ----------------------------------------------------------

    const modifierIncident = (cible, patch) => { etat = { ...etat, incidents: etat.incidents.map(i => i === cible ? { ...i, ...patch } : i) }; return etat.incidents.find(i => i.titre === cible.titre); };
    const modifierPion = (id, patch) => { etat = { ...etat, pions: etat.pions.map(p => p.id === id ? { ...p, ...patch } : p) }; };
    const incidentActuel = titre => etat.incidents.find(i => i.titre === titre);

    function envoyer(pionId, siteIdx, mission) {
      const pion = etat.pions.find(p => p.id === pionId);
      const it = itineraire(pion, SITES[siteIdx].porte);
      if (!it) return false;
      modifierPion(pionId, { chemin: it.pts, prochain: it.pts.length ? it.pts[0] : pion.pos, mission });
      return true;
    }

    function arrivee(pion) {
      const m = pion.mission;
      modifierPion(pion.id, { mission: null });
      if (!m) return;
      const inc = incidentActuel(m.titre);
      const site = SITES[inc.site];
      if (inc.statut !== 'ouvert') { fil(`${pion.nom} sur ${site.code} : déjà traité.`); return; }
      if (m.type === 'aller') {
        if (inc.vrai) { clore(inc, `Sur place, ${site.code} : ${inc.surPlace}`); return; }
        etat = { ...etat, conformite: Math.max(0, etat.conformite - MALUS_DEPLACEMENT) };
        fil(`Sur place, ${site.code} : ${inc.surPlace} Le journal le disait déjà : classe-le.`, 'ko');
        return;
      }
      const c = inc.consignes[m.consigne];
      if (c.ok && inc.vrai) { clore(inc, `${pion.nom}, ${site.code} : ${c.effet}`); return; }
      etat = { ...etat, conformite: Math.max(0, etat.conformite - MALUS_CONSIGNE) };
      modifierIncident(inc, { essayees: inc.essayees.concat(m.consigne) });
      fil(`${pion.nom}, ${site.code} : ${c.effet}`, 'ko');
    }

    function clore(inc, texte) {
      modifierIncident(inc, { statut: 'clos', resume: texte });
      fil(texte, 'ok');
      verifierFin();
    }

    function classer(inc) {
      if (inc.vrai) {
        perdre(`« ${inc.titre} » sur ${SITES[inc.site].code} classé sans suite. Relis le journal : ${inc.journaux[0][2]}. Le seul faux positif de la soirée est celui dont le journal explique la cause par un badge attendu.`);
        return;
      }
      modifierIncident(inc, { statut: 'classe', resume: inc.sansSuite });
      fil(`${SITES[inc.site].code} : ${inc.sansSuite}`, 'ok');
      verifierFin();
    }

    function verifierFin() {
      if (etat.incidents.every(i => i.statut === 'clos' || i.statut === 'classe')) etat = { ...etat, finA: etat.t + DELAI_FIN };
    }

    // --- fiche d'incident --------------------------------------------------

    function ouvrirFiche(inc) {
      if (etat.phase !== 'jeu' || inc.statut !== 'ouvert') return;
      fermerFiche();
      etat = { ...etat, fiche: inc };
      ficheEl = document.createElement('div');
      ficheEl.className = 'dr-fiche' + (inc.prio === 'P1' ? ' p1' : '');
      ficheEl.setAttribute('role', 'dialog');
      const site = SITES[inc.site];
      const coord = etat.pions.find(p => p.id === 'coord');
      const itC = itineraire(coord, site.porte);
      const libres = etat.pions.filter(p => p.id !== 'coord' && !p.mission).map(p => ({ p, it: itineraire(p, site.porte) })).filter(x => x.it).sort((a, b) => a.it.duree - b.it.duree);
      const presta = libres[0] || null;
      const journal = inc.journaux.map(([dt, src, txt]) => `<div><span class="h">${heure(inc.arrivee + dt).slice(0, 5)}</span><span class="s">${src}</span><span>${txt}</span></div>`).join('');
      ficheEl.innerHTML = `<button class="dr-fermer" aria-label="Fermer">×</button>
        <h3>${site.code} · ${inc.prio} · ${inc.titre}</h3>
        <div class="dr-delai">délai restant <b>${mmss(inc.echeance - etat.t)}</b> · ${site.lecteurs} lecteurs, ${site.cameras} caméras</div>
        <div class="dr-journal">${journal}</div>
        <div class="jx-choix">
          <button data-action="aller">J'y vais<small>trajet ${itC ? Math.round(itC.duree) + ' s' : '—'}</small></button>
          <button data-action="deleguer" ${presta ? '' : 'disabled'}>Déléguer<small>${presta ? presta.p.nom + ', ' + Math.round(presta.it.duree) + ' s' : 'aucun prestataire libre'}</small></button>
          <button data-action="classer">Classer sans suite<small>aucun déplacement</small></button>
        </div>
        <div class="dr-consignes" hidden><p>Consigne pour ${presta ? presta.p.nom : 'le prestataire'} — il l'appliquera mot pour mot :</p><div class="jx-choix">
          ${inc.consignes.map((c, k) => `<button data-consigne="${k}" ${inc.essayees.includes(k) ? 'class="ko" disabled' : ''}>${c.t}</button>`).join('')}
        </div></div>`;
      ficheEl.querySelector('.dr-fermer').addEventListener('click', fermerFiche);
      ficheEl.querySelector('[data-action="aller"]').addEventListener('click', () => {
        if (envoyer('coord', inc.site, { type: 'aller', titre: inc.titre })) fil(`Vous partez pour ${site.code} : ${Math.round(itC.duree)} s de trajet.`, 'acc');
        fermerFiche();
      });
      ficheEl.querySelector('[data-action="deleguer"]').addEventListener('click', () => { ficheEl.querySelector('.dr-consignes').hidden = false; });
      ficheEl.querySelector('[data-action="classer"]').addEventListener('click', () => { fermerFiche(); classer(incidentActuel(inc.titre)); });
      ficheEl.querySelectorAll('[data-consigne]').forEach(b => b.addEventListener('click', () => {
        const k = +b.dataset.consigne;
        if (presta && envoyer(presta.p.id, inc.site, { type: 'consigne', titre: inc.titre, consigne: k })) fil(`${presta.p.nom} part pour ${site.code} avec la consigne : « ${inc.consignes[k].t} »`, 'acc');
        fermerFiche();
      }));
      scene.appendChild(ficheEl);
      majHud();
    }

    function fermerFiche() {
      if (ficheEl) { ficheEl.remove(); ficheEl = null; }
      etat = { ...etat, fiche: null };
      majHud();
    }

    // --- fin ---------------------------------------------------------------

    function gagner() {
      etat = { ...etat, phase: 'fin', finA: null };
      const message = `Trois incidents tenus dans leur délai, le faux positif classé sur lecture du journal, conformité ${etat.conformite} %.`;
      cadre.statut(message, 'ok');
      cadre.fin({
        titre: 'Quartier validé',
        texte: `${message} ${etat.conformite === 100 ? 'Aucune consigne ratée, aucun déplacement pour rien.' : 'Chaque consigne ratée ou trajet inutile a coûté des points : le prestataire fait ce qu’on lui écrit, pas ce qu’on pense.'} ${api.FAITS.digitalrealty.pourLePoste}`,
        bouton: 'Prendre la clé',
        action: () => api.fini({ score: etat.conformite, message }),
      });
    }

    function perdre(texte) {
      fermerFiche();
      etat = { ...etat, phase: 'fin' };
      cadre.statut('Rejoue : mêmes sites, mêmes incidents.', 'ko');
      cadre.fin({ titre: 'Pas tout à fait', texte, bouton: 'Rejouer', action: () => { const f = cadre.corps.querySelector('.jx-fin'); f && f.remove(); reinitialiser(); } });
    }

    function reinitialiser() {
      fermerFiche();
      etat = etatInitial();
      hud.fil.innerHTML = '';
      cadre.statut("Les incidents arrivent. Clique un marqueur pour ouvrir sa fiche.");
      majHud();
    }

    // --- souris / tactile --------------------------------------------------

    function incidentSous(e) {
      const r = canvas.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      for (const i of etat.incidents) {
        if (i.statut !== 'ouvert') continue;
        const m = marqueurEcran(SITES[i.site]);
        if (Math.hypot(x - m.x, y - m.y) < px(22)) return i;
      }
      for (const i of etat.incidents) {
        if (i.statut !== 'ouvert') continue;
        const s = SITES[i.site];
        const c = ecran(s.centre[0], s.centre[1], 1);
        if (Math.hypot(x - c.x, y - c.y) < px(60)) return i;
      }
      return null;
    }
    function siteSous(e) {
      const r = canvas.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      return SITES.find(s => { const c = ecran(s.centre[0], s.centre[1], 1); return Math.hypot(x - c.x, y - c.y) < px(60); }) || null;
    }
    const surDeplacement = e => { survol = etat.phase === 'jeu' ? incidentSous(e) : null; canvas.classList.toggle('sur-cible', !!survol); };
    const surClic = e => {
      if (etat.phase !== 'jeu') return;
      const i = incidentSous(e);
      if (i) { ouvrirFiche(i); return; }
      const s = siteSous(e);
      if (s) cadre.statut(`${s.nom} : ${s.lecteurs} lecteurs de badge, ${s.cameras} caméras, nominal.`);
      else if (etat.fiche) fermerFiche();
    };
    canvas.addEventListener('pointermove', surDeplacement);
    canvas.addEventListener('pointerleave', () => { survol = null; canvas.classList.remove('sur-cible'); });
    canvas.addEventListener('click', surClic);

    reinitialiser();
    redimensionner();
    const minuteur = setInterval(tic, INTERVALLE_MS);
    animation = requestAnimationFrame(boucle);

    // --- résolution automatique --------------------------------------------

    async function attendreQue(cond, maxMs = 6000) {
      const t0 = performance.now();
      while (!cond()) { if (performance.now() - t0 > maxMs) throw new Error('attente dépassée'); await attendre(30); }
    }
    function cliquerMarqueur(inc) {
      const m = marqueurEcran(SITES[inc.site]);
      const r = canvas.getBoundingClientRect();
      canvas.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: r.left + m.x, clientY: r.top + m.y }));
    }
    const cliquer = sel => { const b = ficheEl && ficheEl.querySelector(sel); if (b) b.click(); };

    return {
      demonter() {
        vivant = false;
        clearInterval(minuteur);
        cancelAnimationFrame(animation);
        observateur.disconnect();
        conteneur.innerHTML = '';
      },
      // Joue la solution : les deux premiers délégués avec la bonne consigne, le faux
      // positif classé, la porte forcée (P1) traitée sur place par le coordinateur.
      async resoudre() {
        vitesse = VITESSE_RESOLUTION;
        const plan = [
          { titre: INCIDENTS[0].titre, faire: () => { cliquer('[data-action="deleguer"]'); cliquer('[data-consigne="1"]'); } },
          { titre: INCIDENTS[1].titre, faire: () => { cliquer('[data-action="deleguer"]'); cliquer('[data-consigne="1"]'); } },
          { titre: INCIDENTS[2].titre, faire: () => cliquer('[data-action="classer"]') },
          { titre: INCIDENTS[3].titre, faire: () => cliquer('[data-action="aller"]') },
        ];
        for (const p of plan) {
          await attendreQue(() => incidentActuel(p.titre).statut === 'ouvert');
          cliquerMarqueur(incidentActuel(p.titre));
          await attendreQue(() => !!ficheEl, 1000);
          p.faire();
          await attendre(30);
        }
        await attendreQue(() => etat.phase === 'fin', 12000);
        await attendre(50);
        const fin = cadre.corps.querySelector('.jx-fin .jx-btn');
        fin && fin.click();
      },
    };
  },
};
