// QUARTIER 3 — THALES — verbe INSTRUMENTER — « Avant que ça sature »
//
// Une salle de stockage en coupe (trois baies, six silos, un collecteur) et le mur-écran d'un tableau de bord.
// 1. Centraliser : un lecteur par format. 2. Rendre visible : quatre courbes pour six volumes, régression sur
// 7 ou 30 jours, avance d'alerte. 3. Avant que ça sature : trente jours simulés, extensions livrées en trois jours.
// Volumes, chiffres et pseudo-code fictifs ; le fait de CV est cité en fin de partie depuis api.FAITS. Aucun
// apprentissage automatique : une régression et l'œil du joueur. Simulation déterministe (mulberry32, setInterval).

import { creerCadre, attendre } from './_contrat.js';
import { FAITS } from '../cv.js';

const ACCENT = '#3EE0C0', SCENE_HAUT = '#2A3270', SCENE_BAS = '#1A1F4D', PANNEAU = '#232A5E', LIGNE = 'rgba(160,170,255,.28)';
const TEXTE = '#EEF1FF', TEXTE_2 = '#B9C0E8', DATA = '#9FE8FF', OK = '#6FCF8E', ANOMALIE = '#E8503A', ANOMALIE_TEXTE = '#FF8A76';
const AMBRE = '#FFB86B', OR = '#FFD166';

const PAR_JOUR = 4, HISTORIQUE = 30, DUREE = 30;     // relevés par jour, jours connus, jours à tenir
const JOURS_PAR_S = 2, INTERVALLE_MS = 40;           // 30 jours en 15 s réelles
const DELAI_LIVRAISON = 3, GAIN_EXTENSION = 0.4, RAPPEL_IGNORE = 2, HORIZON_JAMAIS = 60;
const AVANCE_DEPART = 5, AVANCE_MIN = 1, AVANCE_MAX = 10, VITESSE_RESOLUTION = 20, NB_EMPLACEMENTS = 4, BRUIT = 0.6;
const K0 = HISTORIQUE * PAR_JOUR, NB_RELEVES = (HISTORIQUE + DUREE + 1) * PAR_JOUR + 1;
const VIRTUEL = { l: 1000, h: 720, sol: 560 };

function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

const fracHaut = t => t - Math.ceil(t) + 1;           // purge juste après minuit
// Lois en % de la capacité d'origine (1000 G), t en jours depuis J0 ; bruit amorcé ±0,6 point.
const VOLUMES = Object.freeze([
  ['sauvegardes', 0, t => 55 + 38 * fracHaut(t)], ['archives', 0, t => 76 + t],
  ['journaux', 1, t => 35 * Math.exp((t + 30) / 40)], ['base', 1, () => 78],
  ['cache', 2, t => 57.5 + 17.5 * Math.sin(2 * Math.PI * t / 3)], ['exports', 2, t => 30 + 7 * Math.floor((t + 30) / 5)],
].map(([id, baie, loi], i) => {
  const r = mulberry32(2020 + i * 97);
  return Object.freeze({ id, baie, loi, bruit: Object.freeze(Array.from({ length: NB_RELEVES }, () => (r() * 2 - 1) * BRUIT)) });
}));
const volume = id => VOLUMES.find(v => v.id === id);
const tDe = k => -HISTORIQUE + k / PAR_JOUR;
const mesure = (v, k) => v.loi(tDe(k)) + v.bruit[Math.max(0, Math.min(NB_RELEVES - 1, k))];
function niveauContinu(v, t) {
  const x = (t + HISTORIQUE) * PAR_JOUR, k = Math.max(0, Math.min(NB_RELEVES - 2, Math.floor(x))), f = x - k;
  return v.loi(t) + v.bruit[k] * (1 - f) + v.bruit[k + 1] * f;
}

// Régression linéaire sur la fenêtre ; jours avant que la droite atteigne la capacité.
function estimer(v, k, fenetre, capacite) {
  const k0 = Math.max(0, k - fenetre * PAR_JOUR);
  let n = 0, sx = 0, sy = 0, sxx = 0, sxy = 0;
  for (let j = k0; j <= k; j++) { const x = tDe(j), y = mesure(v, j); n++; sx += x; sy += y; sxx += x * x; sxy += x * y; }
  const b = (n * sxy - sx * sy) / (n * sxx - sx * sx), a = (sy - b * sx) / n;
  const jours = b > 1e-3 ? (capacite - a) / b - tDe(k) : Infinity;
  return { a, b, t0: tDe(k0), tk: tDe(k), jours: jours > HORIZON_JAMAIS ? null : Math.max(0, jours) };
}
// Extension utile : le volume aurait saturé dans les 30 jours suivant la commande.
function saturerait(v, t, capacite) {
  for (let s = t; s <= t + DUREE; s += 1 / PAR_JOUR) if (v.loi(s) >= capacite) return true;
  return false;
}

const LECTEURS = Object.freeze([
  { id: 'colonnes', nom: 'colonnes fixes', code: 'colonnes', ecrire: (v, g) => ('/' + v).padEnd(14) + (g + 'G').padStart(6) + '1000G'.padStart(7),
    lire: l => { const c = [l.slice(0, 14).trim(), l.slice(14, 20).trim(), l.slice(20).trim()];
      return /^\/[a-z]+$/.test(c[0]) && /^\d+G$/.test(c[1]) && /^\d+G$/.test(c[2]) ? { nom: c[0].slice(1), utilise: parseInt(c[1], 10) } : null; } },
  { id: 'separateur', nom: 'séparateur ;', code: 'separateur', ecrire: (v, g) => `${v};${g};1000`,
    lire: l => { const c = l.split(';'); return c.length === 3 && /^[a-z]+$/.test(c[0]) && /^\d+$/.test(c[1]) && /^\d+$/.test(c[2]) ? { nom: c[0], utilise: +c[1] } : null; } },
  { id: 'cle', nom: 'clé=valeur', code: 'cle_valeur', ecrire: (v, g) => `volume=${v} utilise=${g} total=1000`,
    lire: l => { const o = Object.fromEntries([...l.matchAll(/(\w+)=(\S+)/g)].map(m => [m[1], m[2]]));
      return o.volume && /^\d+$/.test(o.utilise || '') && /^\d+$/.test(o.total || '') ? { nom: o.volume, utilise: +o.utilise } : null; } },
]);
const BAIES = Object.freeze(['S1', 'S2', 'S3']), FORMAT_BAIE = Object.freeze(['colonnes', 'separateur', 'cle']);
const sortieBaie = b => VOLUMES.filter(v => v.baie === b).map(v => LECTEURS.find(l => l.id === FORMAT_BAIE[b]).ecrire(v.id, Math.round(mesure(v, K0) * 10)));

const virgule = (n, d = 1) => n.toFixed(d).replace('.', ',');
const jour = t => 'J' + String(Math.round(t * 4) / 4).replace('.', ',');
const badge = e => e === null ? 'jamais' : `J+${Math.round(e)}`;
const borne = (x, a, b) => Math.max(a, Math.min(b, x));
const hexRgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const melange = (c1, c2, f) => { const a = hexRgb(c1), b = hexRgb(c2); return `rgb(${a.map((x, i) => Math.round(x + (b[i] - x) * f)).join(',')})`; };
const couleurNiveau = p => p >= 95 ? ANOMALIE : melange(ACCENT, AMBRE, borne((p - 60) / 30, 0, 1));
const hachage = (a, b) => { let h = Math.imul(a + 1, 374761393) ^ Math.imul(b + 7, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

const CSS = `
.th-scene{flex:1;min-width:0;min-height:0;display:flex;position:relative;color:${TEXTE};background:linear-gradient(180deg,${SCENE_HAUT},${SCENE_BAS});font:13px/1.45 "IBM Plex Mono",ui-monospace,monospace}
.th-salle{flex:0 0 56%;position:relative;min-width:0;overflow:hidden}
.th-salle canvas{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none}.th-salle canvas.main{cursor:pointer}
.th-mur{flex:1;min-width:0;min-height:0;display:flex;flex-direction:column;gap:9px;padding:10px 14px;overflow:auto;background:linear-gradient(180deg,rgba(40,48,106,.97),rgba(26,31,77,.99));
  border-left:1px solid rgba(62,224,192,.4);box-shadow:inset 14px 0 34px -20px rgba(62,224,192,.55)}
.th-etape{font:600 11px/1.3 "IBM Plex Mono",monospace;letter-spacing:.14em;text-transform:uppercase;color:${ACCENT}}
.th-titre{font:800 20px/1.15 "Archivo",system-ui,sans-serif;font-stretch:112%;margin:2px 0;color:${TEXTE}}.th-consigne{color:${TEXTE_2};margin:0;font-size:12.5px}
.th-btn{min-height:44px;padding:0 12px;font:600 12px/1.2 "IBM Plex Mono",monospace;letter-spacing:.04em;color:${TEXTE};background:#2E3673;border:1px solid rgba(160,170,255,.38);border-radius:8px;cursor:pointer}
.th-btn:hover{border-color:${ACCENT}}.th-btn[aria-pressed="true"]{background:${ACCENT};color:#1A1633;border-color:${ACCENT}}
.th-btn.or{background:${OR};color:#1A1633;border-color:${OR}}.th-btn[disabled]{opacity:.45;cursor:default}
.th-scene :focus-visible{outline:2px solid #FFE08A;outline-offset:2px;box-shadow:0 0 0 5px rgba(11,14,42,.9)}
.th-rangee{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
.th-baie{border:1px solid ${LIGNE};border-left:3px solid #9DB4E8;border-radius:12px;background:${PANNEAU};padding:9px 12px}
.th-baie.ok{border-left-color:${OK}}.th-baie.ko{border-left-color:${ANOMALIE}}.th-baie.vise{box-shadow:0 0 0 2px ${ACCENT},0 0 22px rgba(62,224,192,.35)}
.th-baie h4{margin:0;font:700 13px "Archivo",system-ui,sans-serif;display:flex;justify-content:space-between;gap:8px}.th-baie h4 small{color:${TEXTE_2};font:11px "IBM Plex Mono",monospace}
.th-brut{background:#141A44;border-radius:8px;padding:6px 8px;color:${DATA};white-space:pre;overflow:auto;font-size:12px;margin:6px 0}
.th-verdict{font-size:12px;margin-top:6px;color:${TEXTE_2}}.th-verdict.ok{color:${OK}}.th-verdict.ko{color:${ANOMALIE_TEXTE}}
.th-grille{display:grid;grid-template-columns:1fr 1fr;gap:9px}
.th-slot{min-height:180px;border:1px dashed rgba(160,170,255,.45);border-radius:12px;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:4px;
  color:${TEXTE_2};font-size:12px;background:rgba(20,26,68,.45);padding:7px 10px;min-width:0}
.th-slot.survol{border-color:${ACCENT};background:rgba(62,224,192,.14)}.th-slot.plein{border-style:solid;border-color:${LIGNE};background:${PANNEAU};align-items:stretch;justify-content:flex-start}
.th-slot.alerte{border-color:${AMBRE};box-shadow:0 0 20px rgba(255,184,107,.35)}.th-slot.sature{border-color:${ANOMALIE};box-shadow:0 0 20px rgba(232,80,58,.4)}
.th-wtete{display:flex;justify-content:space-between;align-items:baseline;gap:6px}.th-wtete b{font:700 13px "Archivo",system-ui,sans-serif}.th-wtete small{color:${TEXTE_2};font-size:11px}
.th-pct{font:600 17px "IBM Plex Mono",monospace;color:${DATA}}.th-slot canvas{width:100%;height:70px;display:block}.th-slot .th-btn{padding:0 9px}
.th-badge{font-size:11.5px;padding:2px 8px;border-radius:8px;background:#141A44;color:${DATA};white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.th-badge.proche{color:#1A1633;background:${AMBRE}}.th-badge.jamais{color:${TEXTE_2}}
.th-code{font-size:11px;color:${TEXTE_2};white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.th-puces{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}
.th-puce{display:flex;align-items:center;justify-content:space-between;gap:6px;min-height:46px;padding:3px 8px;border:1px solid ${LIGNE};border-radius:8px;background:${PANNEAU};
  color:${TEXTE};cursor:grab;touch-action:none;font:12px "IBM Plex Mono",monospace;text-align:left}
.th-puce span{display:flex;flex-direction:column;line-height:1.2;min-width:0}.th-puce small{color:${TEXTE_2};font-size:10.5px}
.th-puce canvas{width:46px;height:24px;flex:none}.th-puce[disabled]{opacity:.38;cursor:default}
.th-reglage{display:flex;flex-wrap:wrap;gap:6px 12px;align-items:center;font-size:12.5px}.th-reglage input{flex:1;min-width:130px;height:44px;accent-color:${ACCENT}}
.th-reglage output{color:${DATA};font-weight:600;min-width:4ch}
.th-frise{display:flex;align-items:center;gap:8px}.th-jour{font:600 16px "IBM Plex Mono",monospace;color:${DATA};min-width:4ch;text-align:right}
.th-piste{flex:1;position:relative;height:30px;border-radius:8px;background:#141A44;border:1px solid ${LIGNE};overflow:hidden}
.th-piste i{position:absolute;top:0;bottom:0;left:0;background:linear-gradient(90deg,rgba(62,224,192,.15),rgba(62,224,192,.45))}
.th-piste b{position:absolute;top:50%;transform:translate(-50%,-50%);font-size:10px;color:${AMBRE}}
.th-piste span{position:absolute;inset:0;display:flex;align-items:center;justify-content:space-between;padding:0 8px;font-size:11px;color:${TEXTE_2}}
.th-journal{background:#141A44;border-radius:12px;padding:7px 10px;font-size:12px;min-height:60px;max-height:120px;overflow:auto}
.th-journal div{color:${TEXTE_2}}.th-journal .ok{color:${OK}}.th-journal .amb{color:${AMBRE}}
.th-alerte{position:absolute;right:14px;bottom:14px;width:min(430px,calc(100% - 28px));z-index:3;background:${SCENE_BAS};border:1px solid ${AMBRE};border-radius:12px;
  padding:12px 14px;box-shadow:0 12px 40px rgba(8,10,40,.6),0 0 30px rgba(255,184,107,.3)}
.th-alerte h4{margin:0 0 4px;font:800 15px "Archivo",system-ui,sans-serif;color:${AMBRE}}.th-alerte p{margin:0 0 8px;font-size:12.5px;color:${TEXTE_2}}
.th-code-salle{position:absolute;left:12px;top:10px;max-width:min(58%,400px);background:rgba(20,24,62,.88);border:1px solid rgba(62,224,192,.38);border-radius:12px;
  padding:6px 10px;font-size:11.5px;line-height:1.5;pointer-events:none}
.th-code-salle b{color:${ACCENT};font-weight:600}.th-code-salle div{white-space:pre;overflow:hidden;text-overflow:ellipsis}.th-code-salle .c{color:#9AA3D6}
.th-legende{position:absolute;right:12px;bottom:10px;background:rgba(20,24,62,.86);border-radius:8px;padding:5px 9px;font-size:11px;color:${TEXTE_2};text-align:right;pointer-events:none}
.th-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.th-fantome{position:absolute;z-index:60;pointer-events:none;padding:8px 12px;border-radius:8px;background:${ACCENT};color:#1A1633;font:600 12px "IBM Plex Mono",monospace;
  box-shadow:0 10px 30px rgba(8,10,40,.5);transform:translate(-50%,-120%)}
.th-fin-graphe{width:100%;height:130px;display:block;margin:4px 0;background:#141A44;border-radius:8px}
.jx-fin .th-fait{font-size:12px;color:${TEXTE_2};border-top:1px solid ${LIGNE};padding-top:8px}
@media (max-width:760px){
  .th-scene{flex-direction:column}.th-salle{flex:0 0 36%;min-height:200px}.th-mur{border-left:0;border-top:1px solid rgba(62,224,192,.4);padding:10px;gap:8px}
  .th-code-salle,.th-code{display:none}.th-slot{min-height:150px;padding:6px 7px}.th-slot canvas{height:58px}
  .th-puces{grid-template-columns:repeat(2,minmax(0,1fr))}.th-titre{font-size:17px}.th-legende{font-size:10px;top:6px;bottom:auto}.th-badge{white-space:normal;font-size:10.5px}.th-alerte{right:8px;left:8px;bottom:8px;width:auto}
}`;

const INDICES = {
  1: ["Regarde comment chaque sortie sépare ses champs : des espaces alignés, des points-virgules, ou des paires nom=valeur.",
      "S1 aligne ses colonnes, S2 sépare par « ; », S3 écrit clé=valeur."],
  2: ["Trois volumes montent vraiment d'ici trente jours. Place-les, lis leur badge, retire ce qui ne bouge pas.",
      "sauvegardes affiche 93 % mais se vide chaque nuit ; base est plein mais plat. Aucun des deux ne sature.",
      "journaux accélère : compare sa fenêtre 7 j et 30 j. La fenêtre courte suit mieux une accélération.",
      "Une extension met 3 jours à arriver, et une tendance se trompe un peu : garde plus de 3 jours d'avance."],
  3: ["Commande quand l'alerte vient d'un volume qui monte vraiment ; un volume cyclique ou plat peut être ignoré.",
      "Tu peux commander à la main depuis un widget, et suspendre le temps avec ⏸."],
};
const ATTENDU = { colonnes: 'des colonnes alignées', separateur: 'des champs séparés par « ; »', cle: 'des paires clé=valeur' };
const META = {
  id: 'thales', ordre: 2, titre: 'Avant que ça sature', employeur: FAITS.thales.employeur, annees: FAITS.thales.periode,
  factKey: 'thales', verbe: 'INSTRUMENTER', accent: ACCENT,
  description: "Trois serveurs qui parlent trois formats, six volumes, un mur de quatre courbes. Centraliser la collecte, choisir ce que le tableau de bord montre, puis tenir trente jours sans qu'un volume sature.",
};

export default {
  ...META,
  monter(conteneur, api) {
    const reduit = api.mouvementReduit ?? matchMedia('(prefers-reduced-motion: reduce)').matches;
    const fait = api.FAITS[META.factKey];
    const cadre = creerCadre(conteneur, { titre: META.titre, employeur: fait.employeur, annees: fait.periode, verbe: META.verbe, accent: api.accent || ACCENT,
      consigne: 'Centralise la collecte, choisis les courbes du mur, puis tiens trente jours sans saturation.' });
    cadre.racine.prepend(Object.assign(document.createElement('style'), { id: 'jeu-thales-styles', textContent: CSS }));
    const scene = Object.assign(document.createElement('div'), { className: 'th-scene' });
    scene.innerHTML = `<div class="th-salle"><canvas aria-hidden="true"></canvas><div class="th-code-salle" aria-hidden="true"></div>
        <div class="th-legende">salle des volumes, fictive<br>teal → ambre : se remplit · rouge : ≥ 95 %</div></div>
      <section class="th-mur" aria-label="Mur-écran du tableau de bord"><div><div class="th-etape"></div><h3 class="th-titre"></h3><p class="th-consigne"></p></div>
        <div class="th-zone"></div><div class="th-grille" hidden></div><div class="th-bas"></div></section><div class="th-sr" aria-live="polite"></div>`;
    cadre.corps.appendChild(scene);
    const $ = sel => scene.querySelector(sel);
    const canvas = $('canvas'), ctx = canvas.getContext('2d'), salle = $('.th-salle'), mur = $('.th-mur');
    const zone = $('.th-zone'), grille = $('.th-grille'), bas = $('.th-bas'), annonceEl = $('.th-sr'), codeSalle = $('.th-code-salle');
    cadre.bouton('Abandonner', () => api.abandonner());
    cadre.bouton('Indice', () => indice());

    const simInitiale = () => ({ k: K0, t: 0, ext: {}, attente: [], commandes: [], rappel: {}, alerte: null, joue: false, rapide: false, sature: null });
    let etat = { phase: 1, lecteurs: [null, null, null], mur: Array(NB_EMPLACEMENTS).fill(null), avance: AVANCE_DEPART, ...simInitiale() };
    const maj = patch => { etat = { ...etat, ...patch }; };
    let vivant = true, enPause = false, vitesse = 1, horloge = 0, animation = 0, dernierDessin = 0, reserveReduit = 0;
    let indiceN = 0, baieVisee = null, survol = null, glisse = null, alerteEl = null, codes = [];

    const capacite = id => 100 * (1 + GAIN_EXTENSION * (etat.ext[id] || 0));
    const pct = v => (etat.phase === 3 || etat.phase === 'fin' ? niveauContinu(v, etat.t) : mesure(v, K0)) / capacite(v.id) * 100;
    const surMur = id => etat.mur.some(w => w && w.vol === id);
    const annoncer = txt => { annonceEl.textContent = txt; };
    const lu = b => etat.lecteurs[b] === FORMAT_BAIE[b];

    function code(cle, ligne) {
      codes = [...codes.filter(c => c.cle !== cle), { cle, ligne }].slice(-9);
      codeSalle.innerHTML = '<b>collecte.py</b> <span class="c"># pseudo-code du jeu</span>' +
        codes.map(c => `<div>${c.ligne.replace(/#.*$/, m => `<span class="c">${m}</span>`)}</div>`).join('');
    }
    function entete(n, titre, consigne) {
      [$('.th-etape').textContent, $('.th-titre').textContent, $('.th-consigne').textContent, indiceN] = [`Étape ${n}/3`, titre, consigne, 0];
    }
    function indice() {
      const liste = INDICES[etat.phase] || INDICES[3], txt = 'Indice : ' + liste[indiceN++ % liste.length];
      cadre.statut(txt); annoncer(txt);
    }

    // --- étape 1 : centraliser ------------------------------------------------------------
    function phase1() {
      entete(1, 'Centraliser la collecte', "Trois serveurs, trois formats de sortie. Branche sur chaque baie le lecteur qui la comprend : touche une baie dans la salle, ou choisis ci-dessous.");
      zone.innerHTML = BAIES.map((b, i) => `<div class="th-baie" data-baie="${i}"><h4>${b}<small>sortie brute</small></h4><div class="th-brut">${sortieBaie(i).join('\n')}</div>
        <div class="th-rangee" role="group" aria-label="Lecteur pour ${b}">${LECTEURS.map(l => `<button class="th-btn" data-lecteur="${l.id}" aria-pressed="false">${l.nom}</button>`).join('')}</div>
        <div class="th-verdict">aucun lecteur branché</div></div>`).join('');
      zone.querySelectorAll('[data-lecteur]').forEach(btn => btn.addEventListener('click', () => brancher(+btn.closest('[data-baie]').dataset.baie, btn.dataset.lecteur)));
      bas.innerHTML = '<button class="th-btn or" data-action="mur" hidden>Ouvrir le tableau de bord ▸</button>';
      bas.firstChild.addEventListener('click', phase2);
      code('intro', 'from collecte import lire, mur, alerte');
      majPhase1();
      cadre.statut('Étape 1 : un lecteur par baie.');
    }

    function brancher(b, id) {
      if (etat.phase !== 1) return;
      const lecteur = LECTEURS.find(l => l.id === id), lus = sortieBaie(b).map(lecteur.lire), ok = lus.every(Boolean);
      maj({ lecteurs: etat.lecteurs.map((x, i) => i === b ? id : x) });
      baieVisee = b;
      code(BAIES[b], `lire(${BAIES[b]}, format="${lecteur.code}")  # ${ok ? lus.map(x => x.nom).join(', ') : 'valeur illisible'}`);
      annoncer(ok ? `${BAIES[b]} : lecteur ${lecteur.nom} branché, ${lus.map(x => x.nom).join(' et ')} collectés.` : `${BAIES[b]} : le lecteur ${lecteur.nom} ne comprend pas cette sortie. Valeur illisible.`);
      majPhase1();
    }

    function majPhase1() {
      zone.querySelectorAll('[data-baie]').forEach(carte => {
        const b = +carte.dataset.baie, id = etat.lecteurs[b], css = id ? (lu(b) ? ' ok' : ' ko') : '';
        carte.className = 'th-baie' + css + (baieVisee === b ? ' vise' : '');
        carte.querySelectorAll('[data-lecteur]').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.lecteur === id)));
        const v = carte.querySelector('.th-verdict');
        v.className = 'th-verdict' + css;
        v.textContent = !id ? 'aucun lecteur branché' : lu(b) ? '✓ lus : ' + sortieBaie(b).map(LECTEURS.find(l => l.id === id).lire).map(x => `${x.nom} ${x.utilise} G / 1000 G`).join(' · ')
          : `✕ valeur illisible : ce lecteur attend ${ATTENDU[id]}.`;
      });
      const suite = bas.querySelector('[data-action="mur"]');
      if (suite && suite.hidden && BAIES.every((_, b) => lu(b))) { suite.hidden = false; cadre.statut('Collecte centralisée : six volumes, un seul collecteur.', 'ok'); }
    }

    // --- étape 2 : rendre visible --------------------------------------------------------
    function phase2() {
      fermerAlerte();
      maj({ phase: 2, ...simInitiale() });
      entete(2, 'Rendre visible', "Quatre places pour six volumes : glisse ou touche un volume pour le placer, compare 7 j et 30 j, règle l'avance. Hors du mur, aucune alerte.");
      grille.hidden = false;
      zone.innerHTML = `<div class="th-puces">${VOLUMES.map(v => `<button class="th-puce" data-vol="${v.id}" aria-label="Placer ${v.id} sur le mur">
        <span>${v.id}<small>${BAIES[v.baie]} · ${Math.round(mesure(v, K0))} %</small></span><canvas aria-hidden="true"></canvas></button>`).join('')}</div>`;
      zone.querySelectorAll('.th-puce').forEach(p => {
        p.addEventListener('pointerdown', e => debutGlisse(e, p.dataset.vol));
        p.addEventListener('click', () => { if (!(glisse && glisse.clicIgnore)) placer(p.dataset.vol, null); });
      });
      bas.innerHTML = `<div class="th-reglage"><label for="th-avance">Avance d'alerte <small>(livraison ${DELAI_LIVRAISON} j)</small></label>
        <input id="th-avance" type="range" min="${AVANCE_MIN}" max="${AVANCE_MAX}" step="1" value="${etat.avance}"><output>${etat.avance} j</output>
        <button class="th-btn or" data-action="lancer">Lancer les 30 jours ▸</button></div>`;
      const curseur = bas.querySelector('input');
      curseur.addEventListener('input', () => {
        maj({ avance: borne(Math.round(+curseur.value), AVANCE_MIN, AVANCE_MAX) });
        bas.querySelector('output').textContent = `${etat.avance} j`;
        code('avance', `alerte.avance = ${etat.avance}  # jours`); majWidgets();
      });
      bas.querySelector('[data-action="lancer"]').addEventListener('click', phase3);
      code('avance', `alerte.avance = ${etat.avance}  # jours`);
      construireMur();
      cadre.statut("Étape 2 : quatre courbes, une avance d'alerte.");
    }

    function placer(id, slot) {
      if (etat.phase !== 2 || surMur(id)) return;
      const i = slot ?? etat.mur.indexOf(null);
      if (i < 0) { annoncer("Le mur est plein : retire une courbe avant d'en placer une autre."); cadre.statut('Le mur est plein.', 'ko'); return; }
      const depuisPuce = document.activeElement && document.activeElement.classList.contains('th-puce');
      maj({ mur: etat.mur.map((w, j) => j === i ? { vol: id, fenetre: 30 } : w) });
      code('mur' + i, `mur.placer("${id}", fenetre=30)`);
      annoncer(`${id} placé sur le mur, emplacement ${i + 1}.`);
      construireMur();
      if (depuisPuce) grille.querySelector(`[data-slot="${i}"] [data-fenetre="7"]`).focus();
    }

    function retirer(i) {
      if (etat.phase !== 2 || !etat.mur[i]) return;
      const id = etat.mur[i].vol;
      maj({ mur: etat.mur.map((w, j) => j === i ? null : w) });
      codes = codes.filter(c => c.cle !== 'mur' + i); code('avance', `alerte.avance = ${etat.avance}  # jours`);
      annoncer(`${id} retiré du mur.`);
      construireMur();
      zone.querySelector(`.th-puce[data-vol="${id}"]`).focus();
    }

    function changerFenetre(i, f) {
      const w = etat.mur[i];
      if (!w || (etat.phase !== 2 && etat.phase !== 3)) return;
      maj({ mur: etat.mur.map((x, j) => j === i ? { ...x, fenetre: f } : x) });
      const el = grille.querySelector(`[data-slot="${i}"]`);
      el.querySelectorAll('[data-fenetre]').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.fenetre === f)));
      el.querySelector('.th-code').textContent = `pente = regression(mesures, jours=${f})`;
      code('mur' + i, `mur.placer("${w.vol}", fenetre=${f})`);
      annoncer(`${w.vol} : fenêtre ${f} jours, saturation estimée ${badge(estimer(volume(w.vol), etat.k, f, capacite(w.vol)).jours)}.`);
      majWidgets();
    }

    function construireMur() {
      grille.innerHTML = etat.mur.map((w, i) => !w ? `<div class="th-slot" data-slot="${i}">emplacement ${i + 1} libre<small>glisse un volume ici</small></div>`
        : `<div class="th-slot plein" data-slot="${i}"><div class="th-wtete"><b>${w.vol} <small>${BAIES[volume(w.vol).baie]}</small></b><span class="th-pct">–</span></div>
          <canvas aria-hidden="true"></canvas><span class="th-badge">–</span>
          <div class="th-rangee"><span class="th-rangee" role="group" aria-label="Fenêtre de régression de ${w.vol}">${[7, 30].map(f =>
            `<button class="th-btn" data-fenetre="${f}" aria-pressed="${w.fenetre === f}">${f} j</button>`).join('')}</span>
          ${etat.phase === 2 ? `<button class="th-btn" data-retirer aria-label="Retirer ${w.vol} du mur">Retirer</button>`
            : `<button class="th-btn" data-commander aria-label="Commander une extension pour ${w.vol}">Commander +40 %</button>`}</div>
          <div class="th-code">pente = regression(mesures, jours=${w.fenetre})</div></div>`).join('');
      const slotDe = b => +b.closest('[data-slot]').dataset.slot;
      grille.querySelectorAll('[data-fenetre]').forEach(b => b.addEventListener('click', () => changerFenetre(slotDe(b), +b.dataset.fenetre)));
      grille.querySelectorAll('[data-retirer]').forEach(b => b.addEventListener('click', () => retirer(slotDe(b))));
      grille.querySelectorAll('[data-commander]').forEach(b => b.addEventListener('click', () => commander(etat.mur[slotDe(b)].vol)));
      zone.querySelectorAll('.th-puce').forEach(p => { p.disabled = surMur(p.dataset.vol); });
      majWidgets();
      zone.querySelectorAll('.th-puce canvas').forEach(cv => etincelle(cv, volume(cv.parentNode.dataset.vol)));
    }

    function majWidgets() {
      grille.querySelectorAll('.th-slot.plein').forEach(el => {
        const w = etat.mur[+el.dataset.slot];
        if (!w) return;
        const v = volume(w.vol), est = estimer(v, etat.k, w.fenetre, capacite(v.id));
        const texte = (s, t) => { const n = el.querySelector(s); if (n.textContent !== t) n.textContent = t; return n; };
        texte('.th-pct', `${Math.round(pct(v))} %`);
        texte('.th-badge', est.jours === null ? 'saturation estimée : jamais' : `saturation estimée ${badge(est.jours)}`)
          .className = 'th-badge' + (est.jours === null ? ' jamais' : est.jours <= etat.avance ? ' proche' : '');
        el.classList.toggle('alerte', !!etat.alerte && etat.alerte.vol === w.vol);
        el.classList.toggle('sature', !!etat.sature && etat.sature.vol === w.vol);
        const cmd = el.querySelector('[data-commander]');
        if (cmd) cmd.disabled = etat.phase !== 3 || !!etat.sature || etat.attente.some(c => c.vol === w.vol);
        courbe(el.querySelector('canvas'), v, w.fenetre, est);
      });
    }

    // --- courbes du mur ---------------------------------------------------------------------
    function preparer(cv) {
      const w = cv.clientWidth, h = cv.clientHeight, r = Math.min(2, window.devicePixelRatio || 1);
      if (!w || !h) return null;
      if (cv.width !== Math.round(w * r) || cv.height !== Math.round(h * r)) { cv.width = Math.round(w * r); cv.height = Math.round(h * r); }
      const c = cv.getContext('2d'); c.setTransform(r, 0, 0, r, 0, 0); c.clearRect(0, 0, w, h);
      return { c, w, h };
    }
    function etincelle(cv, v) {
      const p = preparer(cv);
      if (!p) return;
      p.c.beginPath();
      for (let k = 0; k <= K0; k++) { const x = k / K0 * p.w, y = p.h - 2 - (mesure(v, k) - 20) / 90 * (p.h - 4); k ? p.c.lineTo(x, y) : p.c.moveTo(x, y); }
      p.c.strokeStyle = ACCENT; p.c.lineWidth = 1.3; p.c.stroke();
    }
    // Historique, capacité en marches (livraisons), fenêtre de régression, tendance pointillée.
    function courbe(cv, v, fenetre, est, kFin = etat.k) {
      const p = preparer(cv);
      if (!p) return;
      const { c, w, h } = p, tNow = tDe(kFin);
      const livraisons = etat.commandes.filter(x => x.vol === v.id && x.arrivee <= etat.t + 1e-9).map(x => x.arrivee).sort((a, b) => a - b);
      const yMin = 20, yMax = Math.max(112, 100 * (1 + GAIN_EXTENSION * livraisons.length) + 10);
      const X = t => 3 + (t + HISTORIQUE) / (HISTORIQUE + DUREE) * (w - 6), Y = q => h - 3 - (q - yMin) / (yMax - yMin) * (h - 6);
      const trait = (couleur, lw, tirets = []) => { c.strokeStyle = couleur; c.lineWidth = lw; c.setLineDash(tirets); c.stroke(); c.setLineDash([]); };
      c.fillStyle = 'rgba(62,224,192,.13)'; c.fillRect(X(tNow - fenetre), 0, X(tNow) - X(tNow - fenetre), h);
      c.beginPath(); for (const g of [50, 75]) { c.moveTo(0, Y(g)); c.lineTo(w, Y(g)); } c.moveTo(X(0), 0); c.lineTo(X(0), h); trait('rgba(160,170,255,.2)', 1);
      let cap = 100;
      c.beginPath(); c.moveTo(X(-HISTORIQUE), Y(cap));
      for (const a of livraisons) { c.lineTo(X(a), Y(cap)); cap += 100 * GAIN_EXTENSION; c.lineTo(X(a), Y(cap)); }
      c.lineTo(X(DUREE), Y(cap)); trait(ANOMALIE_TEXTE, 1.2);
      const g = c.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, 'rgba(159,232,255,.38)'); g.addColorStop(1, 'rgba(159,232,255,0)');
      c.beginPath(); c.moveTo(X(-HISTORIQUE), h);
      for (let k = 0; k <= kFin; k++) c.lineTo(X(tDe(k)), Y(mesure(v, k)));
      c.lineTo(X(tNow), h); c.closePath(); c.fillStyle = g; c.fill();
      c.beginPath(); for (let k = 0; k <= kFin; k++) c.lineTo(X(tDe(k)), Y(mesure(v, k))); trait(DATA, 1.4);
      if (est) {
        const tFin = est.jours === null ? DUREE : Math.min(DUREE, est.tk + est.jours);
        c.beginPath(); c.moveTo(X(est.t0), Y(est.a + est.b * est.t0)); c.lineTo(X(tFin), Y(est.a + est.b * tFin)); trait(AMBRE, 1.7, [4, 3]);
        if (est.jours !== null && est.tk + est.jours <= DUREE) { c.fillStyle = AMBRE; c.beginPath(); c.arc(X(tFin), Y(est.a + est.b * tFin), 3.2, 0, Math.PI * 2); c.fill(); }
      }
      c.beginPath(); c.moveTo(X(tNow), 0); c.lineTo(X(tNow), h); trait('rgba(238,241,255,.75)', 1);
    }

    // --- la salle des volumes (canvas, repère virtuel 1000 × 720) --------------------------------
    let W = 1, H = 1, dpr = 1, ech = 1, ox = 0, oy = 0;
    const BX = [190, 500, 810], BAIE_L = 236, BAIE_H = 150, BAIE_P = 26, SILO_H = 185, RAIL_Y = 58, BAC_Y = 106, HUB = { x: 500, y: 598, l: 196, h: 104 };
    const silo = v => ({ x: BX[v.baie] + (VOLUMES.filter(x => x.baie === v.baie).indexOf(v) ? 56 : -56), y: VIRTUEL.sol - BAIE_H, r: 40,
      h: SILO_H * (1 + 0.6 * (capacite(v.id) / 100 - 1)) });
    const ell = (x, y, rx, ry) => { ctx.beginPath(); ctx.ellipse(x, y, rx, Math.max(0.1, ry), 0, 0, Math.PI * 2); };
    const degradeV = (y0, y1, a, b) => { const g = ctx.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, a); g.addColorStop(1, b); return g; };
    function poly(pts, remplir) { ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.fillStyle = remplir; ctx.fill(); }
    function ecrire(t, x, y, px, couleur, align = 'center', poids = 600, famille = '"IBM Plex Mono",ui-monospace,monospace') {
      ctx.font = `${poids} ${px}px ${famille}`; ctx.fillStyle = couleur; ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.fillText(t, x, y);
    }
    const debit = v => { const t = etat.phase === 3 ? etat.t : 0; return Math.max(0, (v.loi(t + 0.1) - v.loi(t)) / 0.1); };
    const lisible = () => ech >= 0.55;

    function fond() {
      const sol = oy + VIRTUEL.sol * ech, fx = W / 2, fy = sol - 260 * ech, k = (H - fy) / (sol - fy);
      ctx.fillStyle = degradeV(0, sol, SCENE_HAUT, '#434C98'); ctx.fillRect(0, 0, W, sol);
      ctx.fillStyle = degradeV(sol, H, '#39418A', SCENE_BAS); ctx.fillRect(0, sol, W, H - sol);
      ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(160,170,255,.1)'; ctx.beginPath();
      for (let x = ox % (96 * ech); x < W; x += 96 * ech) { ctx.moveTo(x, 0); ctx.lineTo(x, sol); }
      ctx.stroke(); ctx.strokeStyle = 'rgba(170,180,255,.17)'; ctx.beginPath();
      for (let i = -14; i <= 14; i++) { const d = i * 70 * ech; ctx.moveTo(fx + d, sol); ctx.lineTo(fx + d * k, H); }
      for (let j = 1; j <= 7; j++) { const y = sol + (H - sol) * (j / 7) ** 1.7; ctx.moveTo(0, y); ctx.lineTo(W, y); }
      ctx.stroke(); ctx.strokeStyle = 'rgba(62,224,192,.35)'; ctx.beginPath(); ctx.moveTo(0, sol); ctx.lineTo(W, sol); ctx.stroke();
    }

    function decorArriere(haut) {
      if (RAIL_Y - haut > 150) for (const gx of [40, 300, 600, 860]) {          // grilles de ventilation du mur
        const gy = (haut + RAIL_Y) / 2 - 20;
        ctx.fillStyle = 'rgba(58,66,140,.8)'; ctx.fillRect(gx, gy, 100, 44);
        ctx.fillStyle = 'rgba(28,33,84,.9)'; for (let s = 0; s < 5; s++) ctx.fillRect(gx + 6, gy + 5 + s * 8, 88, 3);
        ctx.fillStyle = hachage(gx, Math.floor(horloge * 1.5)) > 0.5 ? OK : 'rgba(111,207,142,.3)'; ctx.fillRect(gx + 104, gy + 4, 4, 4);
      }
      ctx.strokeStyle = '#5A63B0'; ctx.lineWidth = 3; ctx.beginPath();                 // poutre en treillis
      ctx.moveTo(-200, RAIL_Y - 44); ctx.lineTo(1200, RAIL_Y - 44); ctx.moveTo(-200, RAIL_Y - 14); ctx.lineTo(1200, RAIL_Y - 14);
      for (let x = -200; x < 1200; x += 40) { ctx.moveTo(x, RAIL_Y - 44); ctx.lineTo(x + 20, RAIL_Y - 14); ctx.lineTo(x + 40, RAIL_Y - 44); }
      ctx.stroke();
      for (let i = 0; i < 14; i++) {                                                    // rangée lointaine, voilée par la distance
        const x = -110 + i * 88, y = 372;
        ctx.fillStyle = 'rgba(84,94,170,.55)'; ctx.fillRect(x, y, 62, VIRTUEL.sol - y);
        ctx.fillStyle = 'rgba(120,130,210,.4)'; ctx.fillRect(x, y, 62, 6);
        for (let r = 0; r < 8; r++) for (let c = 0; c < 3; c++) {
          const on = hachage(i * 31 + r, c + Math.floor(horloge * (0.6 + hachage(i, r)))) > 0.62;
          ctx.fillStyle = on ? (c === 2 ? 'rgba(255,217,154,.8)' : 'rgba(159,232,255,.75)') : 'rgba(40,46,110,.6)';
          ctx.fillRect(x + 10 + c * 17, y + 18 + r * 20, 8, 3);
        }
      }
      for (const x of BX) {                                                             // cônes des plafonniers
        poly([[x - 16, RAIL_Y - 10], [x + 16, RAIL_Y - 10], [x + 190, VIRTUEL.sol], [x - 190, VIRTUEL.sol]], degradeV(RAIL_Y - 14, VIRTUEL.sol, 'rgba(255,241,201,.22)', 'rgba(255,241,201,0)'));
        ctx.fillStyle = '#FFF1C9'; ctx.fillRect(x - 24, RAIL_Y - 16, 48, 7);
      }
      ctx.fillStyle = '#4A529C'; ctx.fillRect(-200, RAIL_Y - 3, 1400, 6);
      ctx.fillStyle = '#2F3570'; ctx.fillRect(-200, BAC_Y, 1400, 12);
      ctx.strokeStyle = 'rgba(160,170,255,.45)'; ctx.lineWidth = 1; ctx.strokeRect(-200, BAC_Y, 1400, 12);
      for (const v of VOLUMES) {                                                        // arrivées d'écriture
        const s = silo(v), top = s.y - s.h - s.r * 0.32;
        ctx.strokeStyle = '#5D66B8'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(s.x, BAC_Y + 12); ctx.lineTo(s.x, top + 4); ctx.stroke();
        if (debit(v) > 0.05 && !reduit) {
          ctx.strokeStyle = DATA; ctx.lineWidth = 2; ctx.setLineDash([4, 10]); ctx.lineDashOffset = -horloge * 40;
          ctx.beginPath(); ctx.moveTo(s.x, BAC_Y + 12); ctx.lineTo(s.x, top + 4); ctx.stroke(); ctx.setLineDash([]);
        }
      }
    }

    function dessinerBaie(b) {
      const x = BX[b] - BAIE_L / 2, y = VIRTUEL.sol - BAIE_H, bas = VIRTUEL.sol, P = BAIE_P, id = etat.lecteurs[b];
      ctx.fillStyle = 'rgba(12,14,44,.35)'; ell(BX[b] + 12, bas + 6, BAIE_L * 0.64, 13); ctx.fill();
      ctx.fillStyle = degradeV(bas, bas + 70, 'rgba(90,100,190,.35)', 'rgba(90,100,190,0)'); ctx.fillRect(x, bas, BAIE_L, 70);
      poly([[x + BAIE_L, y], [x + BAIE_L + P, y - P * 0.6], [x + BAIE_L + P, bas - P * 0.6], [x + BAIE_L, bas]], '#262C66');
      poly([[x, y], [x + P, y - P * 0.6], [x + BAIE_L + P, y - P * 0.6], [x + BAIE_L, y]], '#5A63B0');
      ctx.fillStyle = degradeV(y, bas, '#454C92', '#2F3570'); ctx.fillRect(x, y, BAIE_L, BAIE_H);
      ctx.strokeStyle = 'rgba(180,190,255,.45)'; ctx.lineWidth = 1.5; ctx.strokeRect(x, y, BAIE_L, BAIE_H);
      ctx.fillStyle = '#141A44'; ctx.fillRect(x + 10, y + 8, BAIE_L - 20, 32);
      ecrire(BAIES[b], x + 24, y + 24, 17, ACCENT, 'left', 700, '"Archivo",system-ui,sans-serif');
      if (lisible()) ecrire(!id ? 'format ?' : lu(b) ? '✓ 2 volumes lus' : '✕ illisible', x + 64, y + 24, 12, !id ? TEXTE_2 : lu(b) ? OK : ANOMALIE_TEXTE, 'left', 600);
      for (let r = 0; r < 5; r++) {
        const ry = y + 50 + r * 19;
        ctx.fillStyle = '#20265C'; ctx.fillRect(x + 12, ry, BAIE_L - 24, 13);
        for (let d = 0; d < 10; d++) {
          ctx.fillStyle = hachage(b * 50 + r, d + Math.floor(horloge * (1 + 2 * hachage(r, d)))) > 0.5 ? (id && !lu(b) ? ANOMALIE : lu(b) ? OK : DATA) : 'rgba(159,232,255,.2)';
          ctx.fillRect(x + 20 + d * 20, ry + 5, 7, 3);
        }
      }
      if (etat.phase === 1 && (baieVisee === b || (survol && survol.b === b))) {
        ctx.save(); ctx.shadowColor = ACCENT; ctx.shadowBlur = 18; ctx.strokeStyle = ACCENT; ctx.lineWidth = 3;
        ctx.strokeRect(x - 6, y - SILO_H - 50, BAIE_L + 12, BAIE_H + SILO_H + 56); ctx.restore();
      }
    }

    function dessinerSilo(v) {
      const { x, y, r, h } = silo(v), ry = r * 0.32, p = pct(v), coul = couleurNiveau(p), surf = y - h * borne(p / 100, 0, 1), top = y - h;
      const corps = (haut, basY) => {
        ctx.beginPath(); ctx.moveTo(x - r, haut); ctx.lineTo(x - r, basY); ctx.ellipse(x, basY, r, ry, 0, Math.PI, 0, true);
        ctx.lineTo(x + r, haut); ctx.ellipse(x, haut, r, ry, 0, 0, Math.PI, true); ctx.closePath();
      };
      const vise = (survol && survol.v === v) || (glisse && glisse.vol === v.id);
      if (p >= 95 || vise) {
        const halo = ctx.createRadialGradient(x, surf, 4, x, surf, 120);
        halo.addColorStop(0, p >= 95 ? 'rgba(232,80,58,.5)' : 'rgba(62,224,192,.45)'); halo.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = halo; ctx.fillRect(x - 120, surf - 120, 240, 240);
      }
      corps(top, y); ctx.fillStyle = 'rgba(200,212,255,.13)'; ctx.fill();
      corps(surf, y); ctx.fillStyle = coul; ctx.fill();
      const ombre = ctx.createLinearGradient(x - r, 0, x + r, 0);
      ombre.addColorStop(0, 'rgba(14,18,60,.45)'); ombre.addColorStop(0.35, 'rgba(255,255,255,.16)'); ombre.addColorStop(1, 'rgba(14,18,60,.5)');
      ctx.fillStyle = ombre; ctx.fill();
      ell(x, surf, r, ry * (1 + (reduit ? 0 : 0.18 * Math.sin(horloge * 2.2 + v.baie * 2)))); ctx.fillStyle = coul; ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.fill();
      if (!reduit) {
        for (let i = 0, n = Math.min(5, 1 + Math.round(debit(v))); i < n; i++) {           // bulles d'écriture
          const q = (horloge * (0.35 + 0.1 * i) + hachage(i, v.baie * 9 + v.id.length)) % 1, rb = 2 + 1.5 * hachage(v.baie, i);
          ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1.2; ell(x + (hachage(i, v.id.length) - 0.5) * r * 1.3, y - q * (y - surf), rb, rb); ctx.stroke();
        }
        for (let i = 0, n = Math.min(4, Math.round(debit(v) / 2)); i < n; i++) {           // gouttes au débit réel
          ctx.fillStyle = DATA; ell(x, top + ry + ((horloge * 1.2 + i / n) % 1) * (surf - top - ry), 3, 4.5); ctx.fill();
        }
      }
      ctx.lineWidth = 3; ctx.strokeStyle = AMBRE;
      for (let j = 1; j * 44.4 < h - SILO_H + 1; j++) { ctx.beginPath(); ctx.ellipse(x, y - SILO_H - (j - 1) * 44.4, r + 2, ry + 1, 0, 0, Math.PI); ctx.stroke(); }
      ctx.strokeStyle = 'rgba(157,180,232,.9)';
      for (const yy of [y, y - SILO_H / 2]) { ctx.beginPath(); ctx.ellipse(x, yy, r + 1, ry + 1, 0, 0, Math.PI); ctx.stroke(); }
      ctx.strokeStyle = 'rgba(230,236,255,.5)'; ctx.lineWidth = 1; ctx.beginPath();
      for (const q of [0.25, 0.5, 0.75]) { ctx.moveTo(x + r - 9, y - SILO_H * q); ctx.lineTo(x + r, y - SILO_H * q); }
      ctx.stroke();
      corps(top, y); ctx.strokeStyle = vise ? ACCENT : 'rgba(215,225,255,.6)'; ctx.lineWidth = vise ? 3 : 1.5; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.17)'; ctx.fillRect(x - r * 0.64, top + 8, r * 0.18, h - 14);
      ell(x, top, r, ry); ctx.fillStyle = '#5A63B0'; ctx.fill(); ctx.strokeStyle = 'rgba(215,225,255,.7)'; ctx.stroke();
      if (p >= 100) {                                                                      // débordement
        ctx.strokeStyle = ANOMALIE; ctx.lineWidth = 3; ctx.beginPath();
        for (let i = 0; i < 3; i++) { const dx = (i - 1) * r * 0.7, q = reduit ? 0.5 : (horloge * 2 + i / 3) % 1; ctx.moveTo(x + dx, top); ctx.lineTo(x + dx * 1.6, top + q * (VIRTUEL.sol - top)); }
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(20,24,62,.86)'; ctx.fillRect(x - 50, top - 44, 100, lisible() ? 34 : 30);
      const couleurPct = p >= 95 ? ANOMALIE_TEXTE : DATA;
      if (lisible()) { ecrire(v.id, x, top - 35, 12, TEXTE); ecrire(`${Math.round(p)} %`, x, top - 20, 13, couleurPct); }
      else ecrire(`${Math.round(p)}%`, x, top - 29, 26, couleurPct, 'center', 700);
    }

    function cables() {
      for (let b = 0; b < 3; b++) {
        const id = etat.lecteurs[b], ok = lu(b);
        const p0 = [BX[b], VIRTUEL.sol - 6], p1 = [BX[b], VIRTUEL.sol + 44], p3 = [HUB.x + (b - 1) * 54, HUB.y + 4], p2 = [p3[0], p3[1] - 34];
        const pt = u => [0, 1].map(i => (1 - u) ** 3 * p0[i] + 3 * (1 - u) ** 2 * u * p1[i] + 3 * (1 - u) * u * u * p2[i] + u ** 3 * p3[i]);
        ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.bezierCurveTo(p1[0], p1[1], p2[0], p2[1], p3[0], p3[1]);
        ctx.setLineDash(id ? (ok ? [] : [7, 6]) : [3, 7]);
        ctx.strokeStyle = ok ? 'rgba(62,224,192,.9)' : id ? 'rgba(232,80,58,.7)' : 'rgba(160,170,255,.4)';
        ctx.lineWidth = ok ? 6 : 3; ctx.stroke(); ctx.setLineDash([]);
        if (ok) for (let i = 0; i < 7; i++) {                                              // mesures qui rejoignent le collecteur
          const [x, y] = pt(reduit ? i / 7 : (horloge * 0.45 + i / 7) % 1);
          ctx.fillStyle = 'rgba(159,232,255,.35)'; ell(x, y, 8, 8); ctx.fill();
          ctx.fillStyle = DATA; ell(x, y, 3.5, 3.5); ctx.fill();
        } else if (id) {                                                                   // valeurs illisibles qui s'entassent
          for (let i = 0; i < 6; i++) {
            const [x, y] = pt(0.05 + (i % 3) * 0.04);
            ctx.fillStyle = '#9CA2C8'; ell(x + (i % 2 ? 7 : -7) + (reduit ? 0 : Math.sin(horloge * 6 + i)), y - Math.floor(i / 3) * 9, 4.5, 4.5); ctx.fill();
          }
          ctx.fillStyle = 'rgba(20,24,62,.86)'; ctx.fillRect(BX[b] - 62, VIRTUEL.sol + 22, 124, 26);
          ecrire('✕ illisible', BX[b], VIRTUEL.sol + 35, lisible() ? 14 : 22, ANOMALIE_TEXTE, 'center', 700);
        }
      }
    }

    function hub() {
      const { x, y, l, h } = HUB, g = ctx.createRadialGradient(x, y + h / 2, 10, x, y + h / 2, 300), g0 = x - l / 2 + 20;
      g.addColorStop(0, 'rgba(62,224,192,.34)'); g.addColorStop(1, 'rgba(62,224,192,0)');
      ctx.fillStyle = g; ctx.fillRect(x - 300, y + h / 2 - 300, 600, 600);
      ctx.fillStyle = 'rgba(12,14,44,.35)'; ell(x + 10, y + h + 6, l * 0.62, 11); ctx.fill();
      poly([[x + l / 2, y], [x + l / 2 + 20, y - 12], [x + l / 2 + 20, y + h - 12], [x + l / 2, y + h]], '#262C66');
      poly([[x - l / 2, y], [x - l / 2 + 20, y - 12], [x + l / 2 + 20, y - 12], [x + l / 2, y]], '#5A63B0');
      ctx.fillStyle = '#3A4286'; ctx.fillRect(x - l / 2, y, l, h); ctx.strokeStyle = ACCENT; ctx.lineWidth = 2; ctx.strokeRect(x - l / 2, y, l, h);
      ctx.fillStyle = '#10153A'; ctx.fillRect(x - l / 2 + 9, y + 9, l - 18, h - 18);
      const n = VOLUMES.filter(v => lu(v.baie)).length, marche = etat.phase === 3 && etat.joue && !etat.alerte && !etat.sature && !enPause;
      if (lisible()) {
        ecrire('collecte.py', g0, y + 25, 15, ACCENT, 'left', 600);
        ecrire(`baies lues   ${BAIES.filter((_, b) => lu(b)).length}/3`, g0, y + 45, 12, TEXTE_2, 'left', 500);
        ecrire(`relevés      ${n * (etat.k + 1)}`, g0, y + 61, 12, DATA, 'left', 500);
        ecrire(`mesures/s    ${marche ? n * PAR_JOUR * JOURS_PAR_S * (etat.rapide ? 4 : 1) * vitesse : 0}`, g0, y + 77, 12, DATA, 'left', 500);
      } else ecrire('collecte.py', x, y + h / 2, 26, ACCENT, 'center', 700);
      ctx.fillStyle = marche && Math.sin(horloge * 12) > 0 ? OK : 'rgba(111,207,142,.35)'; ell(x + l / 2 - 20, y + 22, 5, 5); ctx.fill();
    }

    function nacelles() {
      for (const c of etat.attente) {
        const s = silo(volume(c.vol)), q = borne((etat.t - c.t) / DELAI_LIVRAISON, 0, 1), top = s.y - s.h - 40;
        const cx = VIRTUEL.l + 90 + (s.x - VIRTUEL.l - 90) * Math.min(1, q / 0.8), cy = RAIL_Y + 30 + Math.max(0, (q - 0.8) / 0.2) * Math.max(0, top - RAIL_Y - 60);
        ctx.fillStyle = '#20265C'; ctx.fillRect(cx - 24, RAIL_Y - 9, 48, 15); ctx.strokeStyle = AMBRE; ctx.lineWidth = 2; ctx.strokeRect(cx - 24, RAIL_Y - 9, 48, 15);
        ctx.strokeStyle = 'rgba(230,236,255,.75)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(cx - 12, RAIL_Y + 6); ctx.lineTo(cx - 34, cy); ctx.moveTo(cx + 12, RAIL_Y + 6); ctx.lineTo(cx + 34, cy); ctx.stroke();
        ctx.fillStyle = 'rgba(200,212,255,.3)'; ctx.fillRect(cx - 44, cy, 88, 30); ctx.strokeStyle = AMBRE; ctx.lineWidth = 2.5; ctx.strokeRect(cx - 44, cy, 88, 30);
        ecrire('+40 %', cx, cy + 15, lisible() ? 15 : 22, AMBRE, 'center', 700);
        if (lisible()) { ctx.fillStyle = 'rgba(20,24,62,.86)'; ctx.fillRect(cx - 62, cy + 34, 124, 20); ecrire(`${c.vol} · ${jour(c.arrivee)}`, cx, cy + 44, 11, TEXTE, 'center', 500); }
      }
    }

    function dessiner() {
      if (!vivant) return;
      dernierDessin = performance.now();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      fond();
      ctx.setTransform(dpr * ech, 0, 0, dpr * ech, dpr * ox, dpr * oy);
      decorArriere(-oy / ech);
      cables();
      for (let b = 0; b < 3; b++) { dessinerBaie(b); VOLUMES.filter(v => v.baie === b).forEach(dessinerSilo); }
      hub();
      nacelles();
      if (etat.phase === 3) { majWidgets(); majFrise(); }
    }

    // --- étape 3 : avant que ça sature ---------------------------------------------------------
    function phase3() {
      if (etat.phase !== 2) return;
      if (!etat.mur.some(Boolean)) { cadre.statut('Place au moins une courbe sur le mur.', 'ko'); annoncer('Place au moins une courbe sur le mur avant de lancer.'); return; }
      maj({ phase: 3, ...simInitiale(), joue: true });
      reserveReduit = 0;
      entete(3, 'Avant que ça sature', `Trente jours en quinze secondes. Une alerte suspend le temps : commande l'extension (+40 %, livrée en ${DELAI_LIVRAISON} jours) ou ignore-la. Tu peux aussi commander depuis un widget.`);
      zone.innerHTML = `<div class="th-frise"><button class="th-btn" data-action="pause" aria-pressed="false" aria-label="Suspendre le temps">⏸</button>
        <button class="th-btn" data-action="lecture" aria-pressed="true" aria-label="Faire avancer le temps">▶</button>
        <button class="th-btn" data-action="rapide" aria-pressed="false" aria-label="Avance rapide, quatre fois">×4</button>
        <div class="th-piste" aria-hidden="true"><i></i><span><em>J0</em><em>J30</em></span></div><span class="th-jour">J0</span></div>`;
      bas.innerHTML = '<div class="th-journal" aria-label="Journal des alertes"></div>';
      zone.querySelector('[data-action="pause"]').addEventListener('click', () => lecture(false));
      zone.querySelector('[data-action="lecture"]').addEventListener('click', () => lecture(true));
      zone.querySelector('[data-action="rapide"]').addEventListener('click', e => { maj({ rapide: !etat.rapide }); e.currentTarget.setAttribute('aria-pressed', String(etat.rapide)); });
      construireMur();
      noter(`J0 · simulation lancée · avance d'alerte ${etat.avance} j`);
      code('run', 'while jour < 30: collecter(); alerter()');
      cadre.statut('Étape 3 : trente jours à tenir.');
      annoncer('Simulation lancée : trente jours à tenir.');
    }

    function lecture(oui) {
      if (etat.phase !== 3) return;
      maj({ joue: oui });
      [['lecture', oui], ['pause', !oui]].forEach(([a, v]) => zone.querySelector(`[data-action="${a}"]`).setAttribute('aria-pressed', String(v)));
      annoncer(oui ? 'Le temps avance.' : 'Temps suspendu.');
    }

    function noter(txt, classe = '') {
      const el = bas.querySelector('.th-journal');
      if (!el) return;
      el.appendChild(Object.assign(document.createElement('div'), { textContent: txt, className: classe }));
      el.scrollTop = el.scrollHeight;
    }

    function majFrise() {
      const piste = zone.querySelector('.th-piste'), j = zone.querySelector('.th-jour');
      if (!piste) return;
      piste.querySelector('i').style.width = `${borne(etat.t / DUREE, 0, 1) * 100}%`;
      if (j.textContent !== `J${Math.floor(etat.t)}`) j.textContent = `J${Math.floor(etat.t)}`;
      const marques = etat.commandes.map(c => `<b style="left:${Math.min(97, c.arrivee / DUREE * 100)}%">◆</b>`).join('');
      if (piste.dataset.m !== marques) { piste.querySelectorAll('b').forEach(b => b.remove()); piste.insertAdjacentHTML('beforeend', marques); piste.dataset.m = marques; }
    }

    function ouvrirAlerte(vol, jours) {
      fermerAlerte();
      maj({ alerte: { vol, jours } });
      alerteEl = Object.assign(document.createElement('div'), { className: 'th-alerte' });
      alerteEl.setAttribute('role', 'alertdialog'); alerteEl.setAttribute('aria-label', `Alerte de saturation : ${vol}`);
      alerteEl.innerHTML = `<h4>Alerte : ${vol}, saturation estimée ${badge(jours)}.</h4>
        <p>${jour(etat.t)} · niveau ${Math.round(pct(volume(vol)))} % · une extension commandée maintenant arriverait au ${jour(etat.t + DELAI_LIVRAISON)}.</p>
        <div class="th-rangee"><button class="th-btn or" data-action="commander">Commander l'extension</button><button class="th-btn" data-action="ignorer">Ignorer</button></div>`;
      alerteEl.querySelector('[data-action="commander"]').addEventListener('click', () => commander(vol));
      alerteEl.querySelector('[data-action="ignorer"]').addEventListener('click', ignorer);
      scene.appendChild(alerteEl);
      noter(`${jour(etat.t)} · alerte ${vol} · saturation estimée ${badge(jours)}`, 'amb');
      annoncer(`Alerte : ${vol}, saturation estimée ${badge(jours)}. Commander l'extension, ou ignorer.`);
      alerteEl.querySelector('[data-action="commander"]').focus();
    }

    function fermerAlerte() {
      const avaitFocus = alerteEl && alerteEl.contains(document.activeElement), retour = zone.querySelector('[data-action="pause"]');
      if (alerteEl) { alerteEl.remove(); alerteEl = null; }
      if (etat.alerte) maj({ alerte: null });
      if (avaitFocus && retour) retour.focus();
    }

    function commander(vol) {
      if (etat.phase !== 3 || etat.sature || etat.attente.some(c => c.vol === vol)) return;
      const v = volume(vol), w = etat.mur.find(x => x && x.vol === vol);
      const c = { vol, t: etat.t, arrivee: etat.t + DELAI_LIVRAISON, utile: saturerait(v, etat.t, capacite(vol)), estimation: w ? estimer(v, etat.k, w.fenetre, capacite(vol)).jours : null };
      maj({ attente: [...etat.attente, c], commandes: [...etat.commandes, c] });
      if (etat.alerte && etat.alerte.vol === vol) fermerAlerte();
      noter(`${jour(etat.t)} · extension commandée : ${vol}, livraison ${jour(c.arrivee)}`);
      code('cmd-' + vol, `commander("${vol}", extension=0.4)  # ${jour(etat.t)}`);
      annoncer(`Extension commandée pour ${vol}, livraison au ${jour(c.arrivee)}.`);
      majWidgets();
    }

    function ignorer() {
      const a = etat.alerte;
      if (!a) return;
      maj({ rappel: { ...etat.rappel, [a.vol]: etat.t + RAPPEL_IGNORE } });
      fermerAlerte();
      noter(`${jour(etat.t)} · alerte ignorée : ${a.vol}, rappel dans ${RAPPEL_IGNORE} j`);
      annoncer(`Alerte ignorée pour ${a.vol}.`);
    }

    // --- horloge simulée -------------------------------------------------------------------------
    function avancer(jours) {
      for (let reste = jours; reste > 1e-9 && etat.phase === 3 && !etat.alerte && !etat.sature;) {
        const prochain = tDe(etat.k + 1), pas = Math.min(reste, prochain - etat.t);
        reste -= pas;
        if (etat.t + pas >= prochain - 1e-9) { maj({ t: prochain, k: etat.k + 1 }); releve(); } else maj({ t: etat.t + pas });
      }
    }
    // À chaque relevé : livraisons, saturation, fin des trente jours, puis alertes des widgets.
    function releve() {
      const t = etat.t, livrees = etat.attente.filter(c => c.arrivee <= t + 1e-9);
      if (livrees.length) {
        maj({ ext: livrees.reduce((e, c) => ({ ...e, [c.vol]: (e[c.vol] || 0) + 1 }), etat.ext), attente: etat.attente.filter(c => !livrees.includes(c)) });
        livrees.forEach(c => { noter(`${jour(t)} · extension livrée : ${c.vol}, +40 %`, 'ok'); annoncer(`Extension livrée pour ${c.vol}.`); });
      }
      const plein = VOLUMES.find(v => mesure(v, etat.k) >= capacite(v.id));
      if (plein) { maj({ sature: { vol: plein.id, t } }); perdreSaturation(plein); return; }
      if (t >= DUREE - 1e-9) { terminer(); return; }
      for (const w of etat.mur) {
        if (!w || etat.attente.some(c => c.vol === w.vol) || t < (etat.rappel[w.vol] ?? -Infinity)) continue;
        const e = estimer(volume(w.vol), etat.k, w.fenetre, capacite(w.vol)).jours;
        if (e !== null && e <= etat.avance) { ouvrirAlerte(w.vol, e); return; }
      }
    }
    function tic() {
      if (!vivant || enPause) return;
      if (!reduit) horloge += INTERVALLE_MS / 1000;
      if (etat.phase === 3 && etat.joue && !etat.alerte && !etat.sature) {
        const jours = INTERVALLE_MS / 1000 * JOURS_PAR_S * (etat.rapide ? 4 : 1) * vitesse;
        if (!reduit) avancer(jours);
        else if ((reserveReduit += jours) >= 1) { const pas = Math.floor(reserveReduit); reserveReduit -= pas; avancer(pas); dessiner(); }  // un jour par pas visible
      }
      if (performance.now() - dernierDessin > 200) dessiner();
    }

    // --- fins de partie ------------------------------------------------------------------------------
    function insererAvantBouton(f, balise, classe, texte) {
      const el = Object.assign(document.createElement(balise), { className: classe });
      if (texte) el.textContent = texte; else el.setAttribute('aria-hidden', 'true');
      return f.querySelector('.jx-carte').insertBefore(el, f.querySelector('.jx-btn'));
    }
    function terminer() {
      const inutiles = etat.commandes.filter(c => !c.utile), utiles = etat.commandes.filter(c => c.utile && c.estimation !== null);
      if (inutiles.length > 1) {
        echec(`${inutiles.length} extensions inutiles : ${inutiles.map(c => `${c.vol} au ${jour(c.t)}`).join(', ')}. Ces volumes n'auraient pas saturé dans les trente jours suivant la commande : un tableau de bord sert aussi à ne pas acheter pour rien.`, null);
        return;
      }
      fermerAlerte();
      maj({ phase: 'fin', joue: false });
      const avMoy = utiles.length ? utiles.reduce((s, c) => s + c.estimation, 0) / utiles.length : 0, n = etat.commandes.length, s = n > 1 ? 's' : '';
      const score = Math.max(0, Math.round(100 - 15 * inutiles.length - 2 * Math.max(0, avMoy - DELAI_LIVRAISON)));
      const bilan = `Trente jours tenus, aucun volume saturé. ${n} extension${s} commandée${s}, ${inutiles.length ? 'dont une inutile' : 'aucune inutile'}, avance moyenne ${virgule(avMoy)} j pour ${DELAI_LIVRAISON} j de livraison.`;
      const message = `30 jours tenus sans saturation : ${n} extension${s} commandée${s}, ${inutiles.length} inutile, alertes à ${etat.avance} j d'avance.`;
      cadre.statut(bilan, 'ok'); annoncer('Quartier validé. ' + bilan);
      const f = cadre.fin({ titre: 'Quartier validé', texte: `${bilan} ${fait.pourLePoste}`, bouton: 'Prendre la clé', action: () => api.fini({ score, message: message.slice(0, 200) }) });
      insererAvantBouton(f, 'p', 'th-fait', `Le fait de CV derrière ce quartier : ${fait.employeur}, ${fait.periode}, ${fait.poste}. ${fait.texte}`);
    }
    function perdreSaturation(v) {
      const w = etat.mur.find(x => x && x.vol === v.id), t = etat.t, cmd = [...etat.commandes].reverse().find(c => c.vol === v.id);
      const parties = [`« ${v.id} » a saturé au ${jour(t)}.`];
      if (!w) parties.push("Il n'était pas au mur : un volume qu'on ne regarde pas n'émet aucune alerte.");
      else {
        parties.push(`Au J0, son widget (fenêtre ${w.fenetre} j) estimait la saturation à ${badge(estimer(v, K0, w.fenetre, 100).jours)}.`);
        if (w.fenetre === 30 && v.id === 'journaux') parties.push("En 30 j, la tendance lissait l'accélération : compare avec la fenêtre 7 j.");
        if (cmd && cmd.arrivee > t) parties.push(`L'extension commandée au ${jour(cmd.t)} devait arriver au ${jour(cmd.arrivee)} : trop tard. ${etat.avance} j d'avance moins ${DELAI_LIVRAISON} j de livraison laissent peu de place à l'erreur d'estimation.`);
        else if (etat.rappel[v.id] !== undefined) parties.push('Son alerte avait été ignorée.');
        else if (cmd) parties.push(`Après la livraison du ${jour(cmd.arrivee)}, il en fallait une autre : aucune alerte n'est repartie à temps.`);
        else parties.push(`Aucune alerte n'est partie à temps avec ${etat.avance} j d'avance.`);
      }
      echec(parties.join(' '), { v, w });
    }
    function echec(texte, graphe) {
      fermerAlerte();
      maj({ phase: 'fin', joue: false });
      cadre.statut('Rejoue : retour au tableau de bord, tes choix sont conservés.', 'ko'); annoncer('Pas tout à fait. ' + texte);
      const f = cadre.fin({ titre: 'Pas tout à fait', texte, bouton: 'Rejouer', action: () => { f.remove(); phase2(); } });
      if (!graphe) return;
      const fenetre = graphe.w ? graphe.w.fenetre : 30;
      courbe(insererAvantBouton(f, 'canvas', 'th-fin-graphe'), graphe.v, fenetre, graphe.w ? estimer(graphe.v, K0, fenetre, 100) : null);
      insererAvantBouton(f, 'p', 'th-fait', `Trait plein : mesures de ${graphe.v.id}. ${graphe.w ? 'Pointillés : la tendance que son widget traçait au J0. ' : ''}Ligne rouge : capacité.`);
    }

    // --- glisser un volume sur le mur (souris, doigt) --------------------------------------------------
    let minuteurClic = 0;
    function debutGlisse(e, vol) {
      if (etat.phase !== 2 || !vol || surMur(vol) || e.button > 0) return;
      glisse = { vol, x0: e.clientX, y0: e.clientY, actif: false, id: e.pointerId, fantome: null };
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    const slotSous = e => { const el = document.elementFromPoint(e.clientX, e.clientY), s = el && el.closest('.th-slot'); return s && grille.contains(s) ? s : null; };
    scene.addEventListener('pointermove', e => {
      if (!glisse || glisse.id !== e.pointerId) return;
      if (!glisse.actif && Math.hypot(e.clientX - glisse.x0, e.clientY - glisse.y0) > 8) {
        glisse = { ...glisse, actif: true, fantome: Object.assign(document.createElement('div'), { className: 'th-fantome', textContent: glisse.vol }) };
        scene.appendChild(glisse.fantome);
      }
      if (!glisse.actif) return;
      const r = scene.getBoundingClientRect(), s = slotSous(e);
      Object.assign(glisse.fantome.style, { left: `${e.clientX - r.left}px`, top: `${e.clientY - r.top}px` });
      grille.querySelectorAll('.th-slot').forEach(x => x.classList.toggle('survol', x === s));
    });
    const relacher = e => {
      if (!glisse || glisse.id !== e.pointerId) return;
      const g = glisse, s = g.actif && e.type === 'pointerup' ? slotSous(e) : null;
      if (g.fantome) g.fantome.remove();
      grille.querySelectorAll('.th-slot.survol').forEach(x => x.classList.remove('survol'));
      glisse = g.actif ? { clicIgnore: true } : null;     // le clic qui suit un glisser n'est pas un « placer »
      if (s) placer(g.vol, +s.dataset.slot);
      if (g.actif) minuteurClic = setTimeout(() => { if (glisse && glisse.clicIgnore) glisse = null; }, 0);
    };
    scene.addEventListener('pointerup', relacher);
    scene.addEventListener('pointercancel', relacher);

    // --- la salle : survol, clic, début de glisser ---------------------------------------------------------
    function cibleSous(e) {
      const r = canvas.getBoundingClientRect(), px = (e.clientX - r.left - ox) / ech, py = (e.clientY - r.top - oy) / ech;
      const v = VOLUMES.find(x => { const s = silo(x); return Math.abs(px - s.x) <= s.r + 10 && py >= s.y - s.h - 50 && py <= s.y + 8; });
      const b = v ? v.baie : BX.findIndex(x => Math.abs(px - x) <= BAIE_L / 2 + 12 && py >= VIRTUEL.sol - BAIE_H - 12 && py <= VIRTUEL.sol + 16);
      return b >= 0 ? { v: v || null, b } : null;
    }
    canvas.addEventListener('pointermove', e => {
      if (glisse && glisse.actif) return;
      survol = cibleSous(e);
      canvas.classList.toggle('main', !!survol && (etat.phase === 1 || (etat.phase === 2 && !!survol.v)));
    });
    canvas.addEventListener('pointerleave', () => { survol = null; canvas.classList.remove('main'); });
    canvas.addEventListener('pointerdown', e => { const c = cibleSous(e); if (c && c.v) debutGlisse(e, c.v.id); });
    canvas.addEventListener('click', e => {
      const c = cibleSous(e);
      if (!c || (glisse && glisse.clicIgnore)) return;
      if (etat.phase === 2 && c.v && !surMur(c.v.id)) { placer(c.v.id, null); return; }
      if (etat.phase !== 1) { if (c.v) cadre.statut(`${c.v.id} (${BAIES[c.b]}) : ${Math.round(pct(c.v))} % de sa capacité.`); return; }
      baieVisee = c.b;
      majPhase1();
      const btn = zone.querySelector(`[data-baie="${c.b}"] [data-lecteur]`);
      btn.closest('.th-baie').scrollIntoView({ block: 'nearest' });
      btn.focus({ preventScroll: true });
      annoncer(`${BAIES[c.b]} sélectionnée : choisis son lecteur.`);
    });

    // --- taille et boucles --------------------------------------------------------------------------------
    function redimensionner() {
      const r = salle.getBoundingClientRect();
      [W, H, dpr] = [Math.max(1, r.width), Math.max(1, r.height), Math.min(2, window.devicePixelRatio || 1)];
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      ech = Math.min(W / VIRTUEL.l, H / VIRTUEL.h);
      [ox, oy] = [(W - VIRTUEL.l * ech) / 2, Math.max(0, H - VIRTUEL.h * ech) * 0.62];
      dessiner();
    }
    const observateur = new ResizeObserver(() => {
      if (!vivant) return;
      redimensionner(); majWidgets(); zone.querySelectorAll('.th-puce canvas').forEach(cv => etincelle(cv, volume(cv.parentNode.dataset.vol)));
    });
    [salle, mur].forEach(el => observateur.observe(el));
    function boucle() { if (!vivant || enPause) return; dessiner(); animation = requestAnimationFrame(boucle); }
    phase1();
    redimensionner();
    const minuteur = setInterval(tic, INTERVALLE_MS);
    if (!reduit) animation = requestAnimationFrame(boucle);

    // --- résolution automatique, par les mêmes gestionnaires que le joueur ----------------------------------------
    async function attendreQue(cond, maxMs = 12000) {
      for (const t0 = performance.now(); !cond(); await attendre(25)) {
        if (!vivant) throw new Error('jeu démonté pendant la résolution');
        if (performance.now() - t0 > maxMs) throw new Error('attente dépassée');
      }
    }
    const cliquer = (racine, sel) => { const b = racine.querySelector(sel); if (!b) throw new Error(`élément introuvable : ${sel}`); b.click(); };

    return {
      demonter() { vivant = false; clearInterval(minuteur); clearTimeout(minuteurClic); cancelAnimationFrame(animation); observateur.disconnect(); conteneur.innerHTML = ''; },
      pause() { enPause = true; cancelAnimationFrame(animation); },
      reprendre() { if (!vivant || !enPause) return; enPause = false; if (!reduit) animation = requestAnimationFrame(boucle); dessiner(); },
      async resoudre() {
        vitesse = VITESSE_RESOLUTION;
        if (etat.phase === 'fin') { cliquer(cadre.corps, '.jx-fin .jx-btn'); if (etat.phase === 'fin') return; }
        if (etat.phase === 1) {
          BAIES.forEach((_, b) => cliquer(zone, `[data-baie="${b}"] [data-lecteur="${FORMAT_BAIE[b]}"]`));
          await attendre(40);
          cliquer(bas, '[data-action="mur"]');
        }
        if (etat.phase === 2) {
          const cibles = ['journaux', 'archives', 'exports', 'cache'];
          etat.mur.forEach((w, i) => { if (w && !cibles.includes(w.vol)) cliquer(grille, `[data-slot="${i}"] [data-retirer]`); });
          cibles.filter(id => !surMur(id)).forEach(id => cliquer(zone, `.th-puce[data-vol="${id}"]`));
          cliquer(grille, `[data-slot="${etat.mur.findIndex(w => w && w.vol === 'journaux')}"] [data-fenetre="7"]`);
          Object.assign(bas.querySelector('input'), { value: '7' }).dispatchEvent(new Event('input', { bubbles: true }));
          await attendre(40);
          cliquer(bas, '[data-action="lancer"]');
        }
        if (etat.phase === 3 && !etat.joue) cliquer(zone, '[data-action="lecture"]');
        while (etat.phase === 3) {
          await attendreQue(() => etat.phase !== 3 || !!alerteEl);
          if (alerteEl) cliquer(alerteEl, ['journaux', 'archives', 'exports'].includes(etat.alerte.vol) ? '[data-action="commander"]' : '[data-action="ignorer"]');
        }
        await attendreQue(() => !!cadre.corps.querySelector('.jx-fin .jx-btn'), 3000);
        await attendre(40);
        cliquer(cadre.corps, '.jx-fin .jx-btn');
      },
    };
  },
};
