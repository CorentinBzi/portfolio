// QUARTIER 3 — ESIEE-IT — verbe APPRENDRE — « Le campus »
//
// Un menu, deux ateliers. « Code » : des blocs colorés façon Scratch, en
// pseudo-Python lisible, à glisser dans un cadre pour former un programme ;
// trois exercices croissants, deux intrus par exercice, un bouton Exécuter qui
// vérifie l'ordre (les blocs indépendants peuvent se permuter) et affiche une
// sortie simulée dans un terminal. « Déchiffrer » : un plan de travail façon
// CyberChef, une recette d'opérations réellement implémentées (base64, hex,
// ROT13, reverse, URL decode, XOR) et quatre flags QSP{...} à faire apparaître.
// Le quartier est gagné quand les deux ateliers sont finis. Glisser-déposer en
// Pointer Events ; un clic simple fait la même chose que le glisser.

import { creerCadre, creerTerminal, attendre } from './_contrat.js';
import { FORMATION } from '../cv.js';

const ACCENT_DEFAUT = '#F2D13B';
const SEUIL_GLISSER = 6;
const DELAI_LIGNE_TERMINAL = 130;
const NB_INDICES = 3;
const COULEURS = { boucle: '#FFAB19', condition: '#4C97FF', variable: '#59C059', donnee: '#CF63CF', sortie: '#9966FF' };
const CATEGORIES_OPS = { enc: { nom: 'encodage', c: '#4C97FF' }, chiffre: { nom: 'chiffrement', c: '#FF8C1A' }, texte: { nom: 'texte', c: '#59C059' } };

// ---------------------------------------------------------------------------
// Atelier 1 — les exercices. `solutions` : plusieurs séquences acceptées ; un
// tableau dans une séquence = des blocs indépendants, dans n'importe quel ordre.
// ---------------------------------------------------------------------------

const EXERCICES = [
  {
    id: 'compter_erreurs', titre: 'Compter les erreurs', fichier: 'serveur.log',
    consigne: 'Le journal fait 8 lignes. Compte celles qui contiennent « ERREUR » et affiche le total.',
    apercu: ['INFO   démarrage du service', 'ERREUR connexion refusée', 'INFO   requête /login', 'ERREUR délai dépassé',
             'INFO   requête /', 'AVERT  disque à 80 %', 'ERREUR fichier introuvable', 'INFO   arrêt propre'],
    blocs: {
      lire: { cat: 'donnee',    niv: 0, txt: 'journal = lire("serveur.log")' },
      init: { cat: 'variable',  niv: 0, txt: 'compteur = 0' },
      pour: { cat: 'boucle',    niv: 0, txt: 'pour ligne dans journal :' },
      si:   { cat: 'condition', niv: 1, txt: 'si "ERREUR" dans ligne :' },
      plus: { cat: 'variable',  niv: 2, txt: 'compteur += 1' },
      aff:  { cat: 'sortie',    niv: 0, txt: 'afficher(compteur)' },
      i1:   { cat: 'variable',  niv: 2, txt: 'compteur -= 1', intrus: 'il décompte au lieu de compter' },
      i2:   { cat: 'sortie',    niv: 0, txt: 'afficher("aucune erreur")', intrus: "il affiche une phrase, pas le total" },
    },
    reserve: ['aff', 'si', 'i1', 'lire', 'plus', 'i2', 'pour', 'init'],
    solutions: [[['lire', 'init'], 'pour', 'si', 'plus', 'aff']],
    sortie: ['3'],
    commentaire: '3 lignes ERREUR sur 8. Le compteur part de zéro avant la boucle, jamais dedans.',
    indices: ['Commence par préparer : lire le fichier et mettre le compteur à zéro (dans l\'ordre que tu veux).',
              'Un bloc décalé vers la droite vit à l\'intérieur du bloc qui le précède : la condition sous la boucle, l\'incrément sous la condition.',
              'Deux intrus : « compteur -= 1 » et « afficher("aucune erreur") » ne servent pas à compter.'],
  },
  {
    id: 'ips_insistantes', titre: 'Repérer les adresses insistantes', fichier: 'auth.log',
    consigne: "Chaque ligne d'auth.log commence par une adresse IP. Liste celles qui ont tenté plus de 5 connexions, triées.",
    apercu: ['10.0.0.7       échec mot de passe', '172.16.4.2     échec mot de passe', '10.0.0.7       échec mot de passe',
             '192.168.1.44   échec mot de passe', '10.0.0.7       échec mot de passe', '… 412 lignes'],
    blocs: {
      dict:  { cat: 'variable',  niv: 0, txt: 'tentatives = {}' },
      liste: { cat: 'variable',  niv: 0, txt: 'suspectes = []' },
      pour1: { cat: 'boucle',    niv: 0, txt: 'pour ligne dans journal :' },
      ip:    { cat: 'donnee',    niv: 1, txt: 'ip = ligne.split()[0]' },
      inc:   { cat: 'variable',  niv: 1, txt: 'tentatives[ip] = tentatives.get(ip, 0) + 1' },
      pour2: { cat: 'boucle',    niv: 0, txt: 'pour ip, n dans tentatives.items() :' },
      si:    { cat: 'condition', niv: 1, txt: 'si n > 5 :' },
      app:   { cat: 'donnee',    niv: 2, txt: 'suspectes.append(ip)' },
      tri:   { cat: 'donnee',    niv: 0, txt: 'suspectes.sort()' },
      aff:   { cat: 'sortie',    niv: 0, txt: 'afficher(suspectes)' },
      i1:    { cat: 'condition', niv: 1, txt: 'si n < 5 :', intrus: 'il garderait les adresses discrètes, pas les insistantes' },
      i2:    { cat: 'variable',  niv: 0, txt: 'tentatives = []', intrus: 'une liste ne se lit pas par adresse, il faut un dictionnaire' },
    },
    reserve: ['si', 'tri', 'pour1', 'i2', 'app', 'dict', 'aff', 'ip', 'i1', 'pour2', 'liste', 'inc'],
    solutions: [
      [['dict', 'liste'], 'pour1', 'ip', 'inc', 'pour2', 'si', 'app', 'tri', 'aff'],
      ['dict', 'pour1', 'ip', 'inc', 'liste', 'pour2', 'si', 'app', 'tri', 'aff'],
    ],
    sortie: ["['10.0.0.7', '192.168.1.44']"],
    commentaire: 'Deux adresses au-dessus du seuil, triées. Un dictionnaire pour compter, une liste pour rendre.',
    indices: ['Deux boucles : la première compte par adresse dans le dictionnaire, la seconde relit le dictionnaire.',
              'Le tri vient après avoir rempli la liste, et juste avant de l\'afficher.',
              'Deux intrus : « si n < 5 » et « tentatives = [] ».'],
  },
  {
    id: 'chaine_traitement', titre: 'Chaîne de traitement', fichier: 'capteurs.csv',
    consigne: 'Lire les mesures, les nettoyer, détecter les anomalies, alerter : une vraie chaîne, dans cet ordre.',
    apercu: ['id;temp_c', '12;21.4', '13;21.6', '14;98.6', '15;', '27;-3.1', '… 1 440 mesures'],
    blocs: {
      lire:    { cat: 'donnee',    niv: 0, txt: 'brut = lire("capteurs.csv")' },
      net:     { cat: 'donnee',    niv: 0, txt: 'mesures = nettoyer(brut)' },
      pour:    { cat: 'boucle',    niv: 0, txt: 'pour m dans mesures :' },
      si:      { cat: 'condition', niv: 1, txt: 'si est_anormale(m) :' },
      alerte:  { cat: 'sortie',    niv: 2, txt: 'alerter(m)' },
      journal: { cat: 'sortie',    niv: 2, txt: 'journaliser(m)' },
      fin:     { cat: 'sortie',    niv: 0, txt: 'afficher("analyse terminée")' },
      i1:      { cat: 'donnee',    niv: 0, txt: 'mesures = nettoyer(mesures)', intrus: "« mesures » n'existe pas encore, on nettoie ce qu'on a lu" },
      i2:      { cat: 'sortie',    niv: 1, txt: 'alerter(brut)', intrus: 'il alerte sur tout le fichier brut, sans détecter quoi que ce soit' },
    },
    reserve: ['fin', 'si', 'i1', 'net', 'journal', 'lire', 'i2', 'alerte', 'pour'],
    solutions: [['lire', 'net', 'pour', 'si', ['alerte', 'journal'], 'fin']],
    sortie: ['ALERTE  mesure 14 : 98.6 °C', 'ALERTE  mesure 27 : -3.1 °C', 'analyse terminée'],
    commentaire: 'La ligne vide a été nettoyée avant la détection : sans ça, la chaîne aurait planté sur « 15; ».',
    indices: ['Lire, puis nettoyer ce qu\'on a lu, puis parcourir le résultat.',
              'Sous la condition, alerter et journaliser sont indépendants : l\'ordre entre les deux n\'a pas d\'importance.',
              'Deux intrus : « nettoyer(mesures) » et « alerter(brut) ».'],
  },
];

// ---------------------------------------------------------------------------
// Atelier 2 — les opérations, réellement implémentées sur des chaînes d'octets
// (un caractère = un octet, comme CyberChef en mode latin-1).
// ---------------------------------------------------------------------------

const OPS = {
  from_b64:   { nom: 'From Base64', cat: 'enc', f: t => { try { return atob(t.replace(/\s+/g, '')); } catch { throw new Error('base64 invalide'); } } },
  to_b64:     { nom: 'To Base64',   cat: 'enc', f: t => { try { return btoa(t); } catch { throw new Error('octet hors plage'); } } },
  from_hex:   { nom: 'From Hex',    cat: 'enc', f: t => {
    const h = t.replace(/[\s:]/g, '');
    if (!/^[0-9a-fA-F]*$/.test(h) || h.length % 2) throw new Error('hexadécimal invalide');
    let s = ''; for (let i = 0; i < h.length; i += 2) s += String.fromCharCode(parseInt(h.slice(i, i + 2), 16)); return s; } },
  to_hex:     { nom: 'To Hex',      cat: 'enc', f: t => [...t].map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join('') },
  url_decode: { nom: 'URL Decode',  cat: 'enc', f: t => { try { return decodeURIComponent(t); } catch { throw new Error('séquence % invalide'); } } },
  rot13:      { nom: 'ROT13',       cat: 'chiffre', f: t => t.replace(/[a-zA-Z]/g, c => { const b = c <= 'Z' ? 65 : 97; return String.fromCharCode((c.charCodeAt(0) - b + 13) % 26 + b); }) },
  xor:        { nom: 'XOR',         cat: 'chiffre', cle: true, f: (t, cle) => {
    if (!cle) throw new Error('saisis une clé');
    let s = ''; for (let i = 0; i < t.length; i++) s += String.fromCharCode((t.charCodeAt(i) ^ cle.charCodeAt(i % cle.length)) & 0xFF); return s; } },
  reverse:    { nom: 'Reverse',     cat: 'texte', f: t => [...t].reverse().join('') },
};
const ORDRE_OPS = ['from_b64', 'to_b64', 'from_hex', 'to_hex', 'url_decode', 'rot13', 'xor', 'reverse'];

const chiffrer = (texte, etapes) => etapes.reduce((t, [op, cle]) => OPS[op].f(t, cle), texte);

const DEFIS = [
  { titre: 'Encodé, pas chiffré', flag: 'QSP{bts_sio_sisr}',
    texte: "Un camarade t'envoie ce message. Rien n'est secret : c'est un encodage, pas un chiffrement.",
    codage: [['to_b64']], solution: [{ op: 'from_b64' }],
    indices: ['Le texte se termine par « = » : un remplissage typique.', 'Une seule opération suffit.', 'From Base64.'] },
  { titre: 'Deux couches', flag: 'QSP{bachelor_cyber}',
    texte: 'Des chiffres hexadécimaux qui cachent des lettres décalées. Défais les couches une par une.',
    codage: [['rot13'], ['to_hex']], solution: [{ op: 'from_hex' }, { op: 'rot13' }],
    indices: ['Que des 0-9 et a-f : commence par From Hex.', 'Le résultat a la forme du flag, mais les lettres sont décalées de 13.', 'From Hex, puis ROT13.'] },
  { titre: 'Trois couches', flag: 'QSP{master_msc_cyber}',
    texte: "Encodé en base64, retourné, puis passé en hexadécimal. Pour déchiffrer, on remonte la chaîne à l'envers.",
    codage: [['to_b64'], ['reverse'], ['to_hex']], solution: [{ op: 'from_hex' }, { op: 'reverse' }, { op: 'from_b64' }],
    indices: ['La dernière couche posée se retire en premier : From Hex.', 'Le résultat, lu à l\'envers, ressemble à du base64.', 'From Hex, Reverse, From Base64.'] },
  { titre: 'Une clé', flag: 'QSP{secnumedu_anssi}',
    texte: 'Chiffré par XOR avec la clé « ESIEE », puis encodé en base64.',
    codage: [['xor', 'ESIEE'], ['to_b64']], solution: [{ op: 'from_b64' }, { op: 'xor', cle: 'ESIEE' }],
    indices: ['Défais le base64 en premier.', 'Tape la clé dans le bloc XOR, en majuscules.', 'From Base64, puis XOR avec ESIEE.'] },
].map(d => ({ ...d, entree: chiffrer(d.flag, d.codage) }));

// ---------------------------------------------------------------------------
// Fonctions pures.
// ---------------------------------------------------------------------------

// Compare un programme à une séquence attendue ; renvoie la première divergence.
function comparer(programme, solution, blocs) {
  let p = 0;
  for (const etape of solution) {
    const groupe = Array.isArray(etape) ? etape : [etape];
    const vus = [];
    for (let k = 0; k < groupe.length; k++) {
      const id = programme[p + k];
      const restant = groupe.filter(g => !vus.includes(g));
      if (id === undefined) return { ok: false, type: 'manque', pos: p + k, attendu: restant };
      if (!restant.includes(id)) return { ok: false, type: blocs[id].intrus ? 'intrus' : 'ordre', pos: p + k, bloc: id, attendu: restant };
      vus.push(id);
    }
    p += groupe.length;
  }
  if (p < programme.length) return { ok: false, type: blocs[programme[p]].intrus ? 'intrus' : 'trop', pos: p, bloc: programme[p], attendu: [] };
  return { ok: true, pos: p };
}

// Retient la solution qui va le plus loin : le message d'erreur colle au mieux à ce que le joueur a fait.
function evaluer(programme, exercice) {
  return exercice.solutions
    .map(s => comparer(programme, s, exercice.blocs))
    .reduce((m, r) => (r.ok || r.pos > m.pos ? r : m));
}

function messageEvaluation(res, programme, ex) {
  const txt = id => `« ${ex.blocs[id].txt} »`;
  const attendus = res.attendu.map(txt).join(' ou ');
  if (res.type === 'intrus') return `ligne ${res.pos + 1} : ${txt(res.bloc)} est un intrus, ${ex.blocs[res.bloc].intrus}. Renvoie-le dans la réserve.`;
  if (res.type === 'manque') return programme.length
    ? `ligne ${res.pos + 1} : le programme s'arrête trop tôt. Il attend ${attendus}.`
    : 'Le programme est vide : glisse des blocs depuis la réserve, ou clique-les.';
  if (res.type === 'trop') return `ligne ${res.pos + 1} : ${txt(res.bloc)} est en trop, le programme était déjà complet.`;
  return `ligne ${res.pos + 1} : ${txt(res.bloc)} n'est pas à sa place. Ici, le programme attend ${attendus}.`;
}

// Affiche une chaîne d'octets : les non-imprimables deviennent « · ».
const lisible = s => [...s].map(c => { const k = c.charCodeAt(0); return k < 32 || k > 126 ? '·' : c; }).join('');

function derouler(entree, recette) {
  let txt = entree, erreur = null;
  const etapes = recette.map(et => {
    if (erreur) return { saute: true };
    try { txt = OPS[et.op].f(txt, et.cle); return { ok: true, txt }; }
    catch (e) { erreur = e.message; return { ok: false, txt: e.message }; }
  });
  return { etapes, sortie: erreur ? null : txt, erreur };
}

// ---------------------------------------------------------------------------
// Glisser-déposer en Pointer Events : un moteur pour les deux ateliers.
// Un `[data-item]` se prend au doigt ; un `[data-zone]` reçoit ; sans mouvement, c'est un clic.
// ---------------------------------------------------------------------------

function creerGlisser({ racine, scene, surDepot, surClic }) {
  let actif = null;

  function debut(e) {
    if (e.button !== undefined && e.button > 0) return;
    if (e.target.closest('input,button,textarea,select')) return;
    const item = e.target.closest('[data-item]');
    if (!item || !racine.contains(item)) return;
    actif = { item, source: item.closest('[data-zone]'), x0: e.clientX, y0: e.clientY, pid: e.pointerId, enCours: false };
    try { item.setPointerCapture(e.pointerId); } catch { /* pointeur synthétique */ }
  }

  function commencer(e) {
    const r = actif.item.getBoundingClientRect();
    const fantome = actif.item.cloneNode(true);
    fantome.classList.add('ecole-fantome');
    fantome.style.width = `${r.width}px`;
    scene.appendChild(fantome);
    const ins = document.createElement('div');
    ins.className = 'ecole-ins';
    actif = { ...actif, enCours: true, fantome, ins, dx: e.clientX - r.left, dy: e.clientY - r.top };
    actif.item.classList.add('ecole-source');
  }

  function zoneSous(x, y) {
    const el = document.elementFromPoint(x, y);
    const z = el && el.closest('[data-zone]');
    return z && racine.contains(z) && z.dataset.depot !== 'non' ? z : null;
  }

  function itemsDe(zone) { return [...zone.querySelectorAll(':scope > [data-item]')].filter(i => i !== actif.item); }

  function placerIndicateur(zone, y) {
    const { ins } = actif;
    if (!zone) { ins.remove(); actif = { ...actif, zone: null, index: 0 }; return; }
    const items = itemsDe(zone);
    let index = items.length;
    for (let k = 0; k < items.length; k++) {
      const r = items[k].getBoundingClientRect();
      if (y < r.top + r.height / 2) { index = k; break; }
    }
    if (items[index]) zone.insertBefore(ins, items[index]); else zone.appendChild(ins);
    actif = { ...actif, zone, index };
  }

  function mouvement(e) {
    if (!actif || e.pointerId !== actif.pid) return;
    if (!actif.enCours) {
      if (Math.hypot(e.clientX - actif.x0, e.clientY - actif.y0) < SEUIL_GLISSER) return;
      commencer(e);
    }
    const rs = scene.getBoundingClientRect();
    actif.fantome.style.left = `${e.clientX - rs.left - actif.dx}px`;
    actif.fantome.style.top = `${e.clientY - rs.top - actif.dy}px`;
    placerIndicateur(zoneSous(e.clientX, e.clientY), e.clientY);
  }

  function fin(e) {
    if (!actif || e.pointerId !== actif.pid) return;
    const a = actif;
    actif = null;
    try { a.item.releasePointerCapture(a.pid); } catch { /* idem */ }
    if (!a.enCours) { surClic(a.item, a.source); return; }
    a.fantome.remove(); a.ins.remove();
    a.item.classList.remove('ecole-source');
    surDepot({ item: a.item, source: a.source, zone: a.zone || null, index: a.index || 0 });
  }

  racine.addEventListener('pointerdown', debut);
  racine.addEventListener('pointermove', mouvement);
  racine.addEventListener('pointerup', fin);
  racine.addEventListener('pointercancel', fin);
  return {
    detruire() {
      racine.removeEventListener('pointerdown', debut);
      racine.removeEventListener('pointermove', mouvement);
      racine.removeEventListener('pointerup', fin);
      racine.removeEventListener('pointercancel', fin);
    },
  };
}

// Un clic simulé passe par le même chemin qu'un vrai doigt : pointerdown puis pointerup, sans mouvement.
function simulerClic(el) {
  const r = el.getBoundingClientRect();
  const opts = { bubbles: true, cancelable: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, pointerId: 7, button: 0, isPrimary: true };
  el.dispatchEvent(new PointerEvent('pointerdown', opts));
  el.dispatchEvent(new PointerEvent('pointerup', opts));
}

// ---------------------------------------------------------------------------
// Peau.
// ---------------------------------------------------------------------------

const CSS = `
  .ecole-scene{position:absolute;inset:0;overflow:hidden;display:flex;flex-direction:column}
  .ecole-fond{position:absolute;inset:0;pointer-events:none}
  .ecole-fond canvas{position:absolute;inset:0;display:block}
  .ecole-vue{position:relative;flex:1;min-height:0;display:flex;flex-direction:column;overflow:auto}
  .ecole-scene>.ecole-fantome{position:absolute;margin:0;z-index:60;pointer-events:none;transform:rotate(-1.5deg) scale(1.04);
      box-shadow:0 16px 34px rgba(0,0,0,.75)!important;opacity:.96}
  .ecole-ins{align-self:stretch;flex:none;height:3px;margin:1px 0;border-radius:2px;background:var(--acc);box-shadow:0 0 12px var(--acc)}
  .ecole-source{opacity:.28}

  /* menu */
  .ecole-menu{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:24px;padding:22px 26px}
  .ecole-frise{display:flex;align-items:stretch;justify-content:center;gap:0}
  .ecole-frise span{display:flex;flex-direction:column;justify-content:center;gap:2px;padding:7px 12px;max-width:250px;
      border:1px solid #2B3843;border-radius:6px;background:rgba(11,14,17,.85);font-size:11.5px;line-height:1.35}
  .ecole-frise span b{color:#C8D3DA;font-weight:600}
  .ecole-frise span small{font-size:10.5px;color:#7A8A96}
  .ecole-frise i{align-self:center;width:28px;height:2px;background:var(--acc);opacity:.7;flex:none}
  .ecole-cartes{display:flex;gap:22px;width:100%;max-width:840px}
  .ecole-carte{flex:1;position:relative;display:flex;flex-direction:column;gap:10px;padding:20px 22px 18px;cursor:pointer;text-align:left;
      background:linear-gradient(165deg,#141B23,#0A0D11);border:1px solid #2B3843;border-radius:12px;color:#C8D3DA;font:inherit;
      transition:transform .18s,border-color .18s,box-shadow .18s}
  .ecole-carte:hover,.ecole-carte:focus-visible{transform:translateY(-4px);border-color:var(--acc);outline:0;
      box-shadow:0 0 0 1px var(--acc),0 26px 40px -18px rgba(0,0,0,.95),0 0 48px -14px var(--acc)}
  .ecole-carte.fait{border-color:#6FCF8E;box-shadow:0 0 0 1px #6FCF8E,0 0 40px -16px #6FCF8E}
  .ecole-carte svg{width:100%;height:118px;display:block;overflow:visible}
  .ecole-carte h3{margin:0;font:700 19px/1.15 "Archivo",system-ui,sans-serif;letter-spacing:.01em}
  .ecole-carte h3 small{display:block;font:500 10.5px/1.4 "IBM Plex Mono",monospace;color:var(--acc);letter-spacing:.16em;text-transform:uppercase;margin-bottom:5px}
  .ecole-carte p{margin:0;font-size:12.5px;color:#7A8A96;line-height:1.5}
  .ecole-etat{position:absolute;top:14px;right:14px;font-size:10px;letter-spacing:.14em;text-transform:uppercase;padding:4px 8px;
      border-radius:2px;border:1px solid #3A4652;color:#7A8A96;background:rgba(7,9,12,.7)}
  .ecole-carte.fait .ecole-etat{border-color:#6FCF8E;color:#6FCF8E}
  .ecole-legende{font-size:11.5px;color:#7A8A96;text-align:center;max-width:64ch}

  /* colonnes communes */
  .ecole-titre{flex:none;display:flex;align-items:baseline;gap:10px;padding:10px 14px 4px;font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:#7A8A96}
  .ecole-titre b{color:var(--acc);font-weight:600}
  .ecole-titre .ecole-sp{flex:1}
  .ecole-consigne{flex:none;padding:0 14px 8px;font-size:12.5px;color:#C8D3DA;line-height:1.45}
  .ecole-zone{flex:1;min-height:90px;overflow:auto;padding:8px 14px 16px;display:flex;flex-direction:column;align-items:flex-start;gap:5px;--fond:#0B0E11}

  /* atelier Code */
  .ecole-code{flex:1;min-height:0;display:flex;flex-direction:column}
  .ecole-etabli{flex:1;min-height:0;display:flex}
  .ecole-palette,.ecole-prog{display:flex;flex-direction:column;min-width:0;min-height:0}
  .ecole-palette{flex:0 0 44%;border-right:1px solid #1F2832;background:rgba(11,14,17,.72)}
  .ecole-prog{flex:1;background:rgba(7,9,12,.55);position:relative}
  .ecole-prog .ecole-zone{--fond:#090C10}
  .ecole-chapeau{position:relative;display:flex;align-items:center;gap:9px;margin-bottom:5px;padding:8px 14px 8px 12px;
      border-radius:16px 16px 5px 5px;background:var(--acc);color:#0B0E11;font:700 12px/1 "Archivo",system-ui,sans-serif;letter-spacing:.04em;
      cursor:pointer;user-select:none;border:0;box-shadow:inset 0 -2px 0 rgba(0,0,0,.28)}
  .ecole-chapeau:hover{filter:brightness(1.08)}
  .ecole-chapeau::after{content:'';position:absolute;bottom:-4px;left:12px;width:16px;height:4px;background:var(--acc);border-radius:0 0 3px 3px}
  .ecole-chapeau i{width:0;height:0;border-left:9px solid #0B0E11;border-top:6px solid transparent;border-bottom:6px solid transparent}
  .ecole-vide{position:absolute;left:50%;top:58%;transform:translate(-50%,-50%);font-size:12px;color:#4E5A66;text-align:center;pointer-events:none;
      border:1px dashed #2B3843;border-radius:8px;padding:14px 18px;width:min(78%,300px)}
  .ecole-bloc{position:relative;flex:none;padding:6px 14px 6px 12px;border-radius:5px;color:#fff;font:500 12.5px/1.3 "IBM Plex Mono",ui-monospace,monospace;
      background:var(--c);box-shadow:inset 0 -2px 0 rgba(0,0,0,.3),0 1px 0 rgba(0,0,0,.55);cursor:grab;user-select:none;touch-action:none;
      white-space:nowrap;text-shadow:0 1px 0 rgba(0,0,0,.35);transition:box-shadow .15s}
  .ecole-bloc::before{content:'';position:absolute;top:0;left:12px;width:16px;height:4px;background:var(--fond);border-radius:0 0 3px 3px}
  .ecole-bloc::after{content:'';position:absolute;bottom:-4px;left:12px;width:16px;height:4px;background:var(--c);border-radius:0 0 3px 3px;box-shadow:inset 0 -2px 0 rgba(0,0,0,.3)}
  .ecole-bloc:hover{box-shadow:inset 0 -2px 0 rgba(0,0,0,.3),0 0 0 2px rgba(255,255,255,.35),0 4px 12px rgba(0,0,0,.5)}
  .ecole-bloc[data-niv="1"]{margin-left:26px}.ecole-bloc[data-niv="2"]{margin-left:52px}
  .ecole-bloc.ko{box-shadow:0 0 0 2px #E8503A,0 0 18px rgba(232,80,58,.7);animation:ecole-secoue .45s}
  .ecole-bloc.ok{box-shadow:0 0 0 2px #6FCF8E,0 0 14px rgba(111,207,142,.55)}
  @keyframes ecole-secoue{0%,100%{transform:translateX(0)}25%{transform:translateX(-5px)}75%{transform:translateX(5px)}}
  .ecole-term{flex:none;height:118px;display:flex;border-top:1px solid #1F2832;background:#05070A}
  .ecole-term .jx-term{border-right:0}
  .ecole-term .jx-term-out{padding:8px 14px;font-size:12.5px}
  .ecole-term .jx-term-in[hidden]{display:none}

  /* atelier Déchiffrer */
  .ecole-chef{flex:1;min-height:0;display:flex}
  .ecole-ops,.ecole-recette,.ecole-io{display:flex;flex-direction:column;min-width:0;min-height:0}
  .ecole-ops{flex:0 0 190px;border-right:1px solid #1F2832;background:rgba(11,14,17,.72)}
  .ecole-ops .ecole-zone,.ecole-recette .ecole-zone{align-items:stretch;gap:6px}
  .ecole-recette{flex:1.05;border-right:1px solid #1F2832;background:rgba(7,9,12,.55);position:relative}
  .ecole-io{flex:1.2;padding-bottom:4px}
  .ecole-op,.ecole-etape{position:relative;flex:none;padding:7px 10px 7px 12px;border-radius:5px;background:#12181F;border:1px solid #2B3843;border-left:4px solid var(--c);
      font:500 12.5px/1.3 "IBM Plex Mono",ui-monospace,monospace;color:#E6EDEA;cursor:grab;user-select:none;touch-action:none;transition:border-color .15s,background .15s}
  .ecole-op:hover,.ecole-etape:hover{border-color:var(--c);background:#171F28}
  .ecole-op{display:flex;align-items:baseline;gap:8px;padding:6px 10px 6px 12px}
  .ecole-op small{margin-left:auto;font-size:9px;color:#7A8A96;letter-spacing:.1em;text-transform:uppercase}
  .ecole-etape{padding-right:32px;cursor:grab}
  .ecole-etape .ecole-x{position:absolute;top:5px;right:5px;width:22px;height:22px;border:0;border-radius:3px;background:transparent;color:#7A8A96;font:14px/1 monospace;cursor:pointer}
  .ecole-etape .ecole-x:hover{color:#E8503A;background:rgba(232,80,58,.12)}
  .ecole-etape .ecole-apercu{margin-top:4px;font-size:11px;color:#7A8A96;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .ecole-etape .ecole-apercu b{font-weight:400;color:#4E5A66;margin-right:5px}
  .ecole-etape.ko{border-color:#E8503A}.ecole-etape.ko .ecole-apercu{color:#E8503A}
  .ecole-etape.saute{opacity:.45}
  .ecole-etape input{display:block;width:100%;margin-top:5px;padding:5px 8px;background:#05070A;border:1px solid #2B3843;border-radius:3px;color:#E6EDEA;
      font:12.5px "IBM Plex Mono",monospace;user-select:text;touch-action:auto;outline:0}
  .ecole-etape input:focus{border-color:var(--acc)}
  .ecole-num{display:inline-block;min-width:18px;color:#4E5A66;font-size:11px}
  .ecole-defis{display:flex;gap:5px;align-items:center}
  .ecole-defis i{width:24px;height:4px;border-radius:2px;background:#2B3843}
  .ecole-defis i.fait{background:#6FCF8E}.ecole-defis i.actuel{background:var(--acc);box-shadow:0 0 8px var(--acc)}
  .ecole-defi-texte{padding:0 14px 6px;font-size:12.5px;color:#C8D3DA;line-height:1.45}
  .ecole-defi-texte b{font-family:"Archivo",system-ui,sans-serif;color:#E6EDEA}
  .ecole-indice{padding:0 14px 8px;font-size:12px;color:var(--acc);line-height:1.4;min-height:0}
  .ecole-boite{flex:1;min-height:56px;margin:0 14px 10px;padding:9px 12px;background:#05070A;border:1px solid #1F2832;border-radius:5px;
      font:13px/1.55 "IBM Plex Mono",ui-monospace,monospace;overflow:auto;word-break:break-all;white-space:pre-wrap;color:#E6EDEA;transition:border-color .2s,box-shadow .2s}
  .ecole-boite.vide{color:#4E5A66}
  .ecole-boite.ko{border-color:#E8503A;color:#E8503A}
  .ecole-boite.ok{border-color:#6FCF8E;box-shadow:0 0 28px -8px rgba(111,207,142,.8)}
  .ecole-boite mark{background:rgba(111,207,142,.18);color:#6FCF8E;padding:0 3px;border-radius:2px;font-weight:600}
  .ecole-vide-recette{position:absolute;left:50%;top:55%;transform:translate(-50%,-50%);font-size:12px;color:#4E5A66;text-align:center;pointer-events:none;
      border:1px dashed #2B3843;border-radius:8px;padding:14px 18px;width:min(80%,260px)}

  @media (max-width:760px){
    .ecole-etabli,.ecole-chef{flex-direction:column;overflow:auto}
    .ecole-palette,.ecole-ops,.ecole-recette,.ecole-io,.ecole-prog{flex:none;border-right:0;border-bottom:1px solid #1F2832}
    .ecole-zone{flex:none;overflow:visible;min-height:60px}
    .ecole-ops .ecole-zone{flex-direction:row;flex-wrap:wrap}
    .ecole-ops .ecole-op{flex:1 1 auto}.ecole-ops .ecole-op small{display:none}
    .ecole-cartes{flex-direction:column;gap:12px}
    .ecole-carte{flex-direction:row;align-items:center;padding:14px 16px}
    .ecole-carte svg{width:84px;height:64px;flex:none}
    .ecole-carte p{display:none}
    .ecole-menu{gap:14px;padding:14px;justify-content:flex-start}
    .ecole-frise{flex-wrap:wrap;gap:6px}.ecole-frise i{display:none}
    .ecole-legende{display:none}
    .ecole-term{height:96px}
    .ecole-boite{min-height:64px;flex:none}
    .ecole-vide,.ecole-vide-recette{position:static;transform:none;margin:6px 14px;width:auto}
  }`;

const SVG_CODE = `<svg viewBox="0 0 240 118" aria-hidden="true">
  <g transform="translate(22,6)">
    <rect x="0" y="0" width="150" height="26" rx="6" fill="#FFAB19"/><rect x="0" y="0" width="150" height="26" rx="6" fill="url(#ecole-gl)"/>
    <rect x="12" y="8" width="70" height="4" rx="2" fill="#fff" opacity=".85"/><rect x="90" y="8" width="30" height="4" rx="2" fill="#fff" opacity=".5"/>
    <rect x="12" y="16" width="40" height="4" rx="2" fill="#fff" opacity=".5"/>
    <rect x="12" y="26" width="16" height="4" fill="#FFAB19"/>
    <rect x="22" y="31" width="128" height="26" rx="6" fill="#4C97FF"/>
    <rect x="34" y="39" width="58" height="4" rx="2" fill="#fff" opacity=".85"/><rect x="34" y="47" width="30" height="4" rx="2" fill="#fff" opacity=".5"/>
    <rect x="34" y="57" width="16" height="4" fill="#4C97FF"/>
    <rect x="44" y="62" width="96" height="26" rx="6" fill="#59C059"/>
    <rect x="56" y="70" width="48" height="4" rx="2" fill="#fff" opacity=".85"/><rect x="56" y="78" width="22" height="4" rx="2" fill="#fff" opacity=".5"/>
    <rect x="0" y="94" width="110" height="24" rx="6" fill="#9966FF"/>
    <rect x="12" y="101" width="60" height="4" rx="2" fill="#fff" opacity=".85"/><rect x="12" y="109" width="20" height="4" rx="2" fill="#fff" opacity=".5"/>
    <g transform="translate(176,20)"><circle cx="16" cy="16" r="16" fill="#0B0E11" stroke="currentColor" stroke-width="1.5"/>
      <path d="M12 9 L24 16 L12 23 Z" fill="currentColor"/></g>
  </g></svg>`;

const SVG_CHEF = `<svg viewBox="0 0 240 118" aria-hidden="true">
  <defs><linearGradient id="ecole-gl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".12"/><stop offset="1" stop-color="#000" stop-opacity=".12"/></linearGradient></defs>
  <g font-family="IBM Plex Mono,monospace" font-size="10" font-weight="600">
    <rect x="8" y="8" width="66" height="30" rx="5" fill="#12181F" stroke="#4C97FF" stroke-width="1.5"/>
    <rect x="8" y="8" width="4" height="30" rx="2" fill="#4C97FF"/><text x="20" y="27" fill="#E6EDEA">From Hex</text>
    <path d="M78 23 H92" stroke="#7A8A96" stroke-width="1.5"/><path d="M90 19 L96 23 L90 27 Z" fill="#7A8A96"/>
    <rect x="100" y="8" width="60" height="30" rx="5" fill="#12181F" stroke="#59C059" stroke-width="1.5"/>
    <rect x="100" y="8" width="4" height="30" rx="2" fill="#59C059"/><text x="112" y="27" fill="#E6EDEA">Reverse</text>
    <path d="M164 23 H178" stroke="#7A8A96" stroke-width="1.5"/><path d="M176 19 L182 23 L176 27 Z" fill="#7A8A96"/>
    <rect x="186" y="8" width="48" height="30" rx="5" fill="#12181F" stroke="#FF8C1A" stroke-width="1.5"/>
    <rect x="186" y="8" width="4" height="30" rx="2" fill="#FF8C1A"/><text x="198" y="27" fill="#E6EDEA">XOR</text>
    <text x="10" y="64" fill="#4E5A66" font-weight="400">3d3d51557a4e46564f3d6a6e5a</text>
    <path d="M120 70 V84" stroke="currentColor" stroke-width="1.5"/><path d="M114 82 L120 90 L126 82 Z" fill="currentColor"/>
    <rect x="52" y="94" width="136" height="24" rx="12" fill="#0B0E11" stroke="#6FCF8E" stroke-width="1.5"/>
    <text x="120" y="110" text-anchor="middle" fill="#6FCF8E" font-size="12">QSP{ flag }</text>
  </g></svg>`;

// ---------------------------------------------------------------------------
// Le jeu.
// ---------------------------------------------------------------------------

export default {
  id: 'ecole',
  ordre: 3,
  titre: 'Le campus',
  employeur: 'ESIEE-IT',
  annees: '2018 – 2023',
  factKey: 'ecole',
  verbe: 'APPRENDRE',
  accent: ACCENT_DEFAUT,
  description: "Deux ateliers du campus. Code : assembler des blocs façon Scratch en pseudo-Python, trois exercices, deux intrus par exercice. Déchiffrer : empiler des opérations façon CyberChef jusqu'à faire apparaître quatre flags. Le quartier est gagné quand les deux ateliers sont finis.",

  monter(conteneur, api) {
    const accent = api.accent || ACCENT_DEFAUT;
    const F = api.FAITS.ecole;
    const cadre = creerCadre(conteneur, {
      titre: 'Le campus', employeur: 'ESIEE-IT', annees: '2018 – 2023', verbe: 'APPRENDRE', accent,
      consigne: 'Deux ateliers : assembler du code, puis déchiffrer des messages. Le quartier est gagné quand les deux sont finis.',
    });
    const style = document.createElement('style');
    style.textContent = CSS;
    cadre.racine.prepend(style);

    const scene = document.createElement('div');
    scene.className = 'ecole-scene';
    scene.innerHTML = '<div class="ecole-fond"><canvas></canvas></div><div class="ecole-vue"></div>';
    cadre.corps.appendChild(scene);
    const canvas = scene.querySelector('canvas');
    const ctx = canvas.getContext('2d');
    const vue = scene.querySelector('.ecole-vue');

    let etat = etatInitial();
    let vivant = true, accelere = false, animation = 0, jeton = 0;
    let terminal = null, refs = {};

    const btnAbandon = cadre.bouton('Abandonner', () => api.abandonner());
    const btnMenu = cadre.bouton('Ateliers', () => afficherMenu());
    const btnIndice = cadre.bouton('Indice', () => donnerIndice());
    const btnAction = cadre.bouton('Exécuter', () => actionPrincipale(), true);
    cadre.pied.style.flexWrap = 'wrap';
    for (const b of [btnAbandon, btnMenu, btnIndice, btnAction]) b.style.whiteSpace = 'nowrap';

    function etatInitial() {
      return {
        ecran: 'menu', faits: { code: false, chef: false },
        code: { ex: 0, reserve: [], programme: [], gagne: false, echecs: 0, indice: 0 },
        chef: { defi: 0, recette: [], uid: 0, gagne: false, indice: 0 },
      };
    }

    // --- fond animé : grille, halos, glyphes qui tombent ---------------------

    const GLYPHES = '01{}<>=/#$%&*+-:;abcdef';
    const particules = Array.from({ length: 70 }, (_, k) => ({
      x: (k * 137.5) % 1, y: (k * 97.3) % 1, v: 0.012 + (k % 7) * 0.004, a: 0.05 + (k % 5) * 0.03,
      t: 10 + (k % 4) * 3, c: GLYPHES[k % GLYPHES.length],
    }));
    let W = 1, H = 1, dpr = 1, dernier = 0;

    function redimensionner() {
      const r = scene.getBoundingClientRect();
      W = Math.max(1, r.width); H = Math.max(1, r.height);
      dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      canvas.style.width = `${W}px`; canvas.style.height = `${H}px`;
      dessinerFond(0);
    }
    const observateur = new ResizeObserver(redimensionner);
    observateur.observe(scene);

    function dessinerFond(dt) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      let g = ctx.createRadialGradient(W * 0.85, H * 0.05, 0, W * 0.85, H * 0.05, Math.max(W, H) * 0.6);
      g.addColorStop(0, 'rgba(242,209,59,.13)'); g.addColorStop(1, 'rgba(242,209,59,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      g = ctx.createRadialGradient(W * 0.08, H * 0.98, 0, W * 0.08, H * 0.98, Math.max(W, H) * 0.55);
      g.addColorStop(0, 'rgba(76,151,255,.11)'); g.addColorStop(1, 'rgba(76,151,255,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(242,209,59,.045)'; ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0.5; x < W; x += 44) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
      for (let y = 0.5; y < H; y += 44) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
      ctx.stroke();
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (const p of particules) {
        p.y += p.v * dt; if (p.y > 1.05) { p.y = -0.05; }
        ctx.font = `${p.t}px "IBM Plex Mono",ui-monospace,monospace`;
        ctx.fillStyle = `rgba(242,209,59,${p.a})`;
        ctx.fillText(p.c, p.x * W, p.y * H);
      }
    }

    function boucle(ts) {
      if (!vivant) return;
      const dt = dernier ? Math.min(0.1, (ts - dernier) / 1000) : 0;
      dernier = ts;
      dessinerFond(dt);
      animation = requestAnimationFrame(boucle);
    }

    // --- glisser-déposer ------------------------------------------------------

    const glisser = creerGlisser({
      racine: vue, scene,
      surDepot({ item, source, zone, index }) {
        const id = item.dataset.item;
        const de = source ? source.dataset.zone : null, vers = zone ? zone.dataset.zone : null;
        if (etat.ecran === 'code') {
          if (vers === 'programme' || vers === 'reserve') deplacerBloc(id, vers, index);
          return;
        }
        if (etat.ecran !== 'chef') return;
        if (de === 'ops') { if (vers === 'recette') ajouterOperation(id, index); return; }
        if (de === 'recette') { if (vers === 'recette') deplacerEtape(+id, index); else retirerEtape(+id); }
      },
      surClic(item, source) {
        const id = item.dataset.item;
        const de = source ? source.dataset.zone : null;
        if (etat.ecran === 'code') {
          if (de === 'reserve') deplacerBloc(id, 'programme', etat.code.programme.length);
          else if (de === 'programme') deplacerBloc(id, 'reserve', etat.code.reserve.length);
        } else if (etat.ecran === 'chef' && de === 'ops') ajouterOperation(id, etat.chef.recette.length);
      },
    });

    // --- menu -----------------------------------------------------------------

    function afficherMenu() {
      jeton++;
      etat = { ...etat, ecran: 'menu' };
      terminal = null; refs = {};
      const n = (etat.faits.code ? 1 : 0) + (etat.faits.chef ? 1 : 0);
      const frise = [...FORMATION].reverse().map(f => `<span><b>${f.titre}</b><small>${f.ou} · ${f.quand}</small></span>`).join('<i></i>');
      vue.innerHTML = `<div class="ecole-menu">
        <div class="ecole-frise">${frise}</div>
        <div class="ecole-cartes">
          <button class="ecole-carte${etat.faits.code ? ' fait' : ''}" data-atelier="code">
            <span class="ecole-etat">${etat.faits.code ? 'validé' : 'atelier 1'}</span>
            ${SVG_CODE}
            <h3><small>Programmation</small>Code</h3>
            <p>Assemble des blocs en pseudo-Python. Trois exercices, deux intrus par exercice, un bouton Exécuter.</p>
          </button>
          <button class="ecole-carte${etat.faits.chef ? ' fait' : ''}" data-atelier="chef">
            <span class="ecole-etat">${etat.faits.chef ? 'validé' : 'atelier 2'}</span>
            ${SVG_CHEF}
            <h3><small>Cryptographie</small>Déchiffrer</h3>
            <p>Empile des opérations façon CyberChef jusqu'à faire apparaître le flag QSP{…}. Quatre défis.</p>
          </button>
        </div>
        <div class="ecole-legende">${F.poste}. Cinq années en alternance : la moitié du temps en cours, l'autre en entreprise.</div>
      </div>`;
      vue.querySelectorAll('[data-atelier]').forEach(b => b.addEventListener('click', () => ouvrirAtelier(b.dataset.atelier)));
      btnMenu.hidden = true; btnIndice.hidden = true; btnAction.hidden = true;
      cadre.statut(n === 2 ? 'Deux ateliers validés.' : n === 1 ? "Un atelier validé sur deux : l'autre t'attend." : 'Deux ateliers · choisis par lequel commencer.', n ? 'ok' : '');
    }

    function ouvrirAtelier(nom) {
      if (nom === 'code') ouvrirCode(); else ouvrirChef();
    }

    function terminerAtelier(nom) {
      etat = { ...etat, faits: { ...etat.faits, [nom]: true } };
      afficherMenu();
      if (etat.faits.code && etat.faits.chef) gagner();
    }

    // --- atelier 1 : Code -----------------------------------------------------

    function ouvrirCode() {
      etat = { ...etat, ecran: 'code' };
      vue.innerHTML = `<div class="ecole-code">
        <div class="ecole-etabli">
          <div class="ecole-palette">
            <div class="ecole-titre"><b>Réserve</b><span>exercice <span class="ecole-num-ex"></span>/${EXERCICES.length}</span><span class="ecole-sp"></span><span class="ecole-fichier"></span></div>
            <div class="ecole-consigne"></div>
            <div class="ecole-zone" data-zone="reserve"></div>
          </div>
          <div class="ecole-prog">
            <div class="ecole-titre"><b>Programme</b><span>glisse ou clique les blocs, puis Exécuter</span></div>
            <div class="ecole-zone" data-zone="programme"></div>
            <div class="ecole-vide">Glisse tes blocs ici, sous le chapeau.<br>Un clic sur un bloc l'ajoute aussi.</div>
          </div>
        </div>
        <div class="ecole-term"></div>
      </div>`;
      refs = {
        numEx: vue.querySelector('.ecole-num-ex'), fichier: vue.querySelector('.ecole-fichier'), consigne: vue.querySelector('.ecole-consigne'),
        reserve: vue.querySelector('[data-zone="reserve"]'), programme: vue.querySelector('[data-zone="programme"]'), vide: vue.querySelector('.ecole-vide'),
      };
      terminal = creerTerminal(vue.querySelector('.ecole-term'));
      btnMenu.hidden = false; btnIndice.hidden = false; btnAction.hidden = false;
      chargerExercice(etat.code.ex);
    }

    function chargerExercice(k) {
      jeton++;
      const ex = EXERCICES[k];
      etat = { ...etat, code: { ex: k, reserve: [...ex.reserve], programme: [], gagne: false, echecs: 0, indice: 0 } };
      refs.numEx.textContent = k + 1;
      refs.fichier.textContent = ex.fichier;
      refs.consigne.textContent = ex.consigne;
      terminal.effacer();
      terminal.ecrire(`$ cat ${ex.fichier}`, 'cmd');
      ex.apercu.forEach(l => terminal.ecrire(l, 'dim'));
      btnAction.textContent = 'Exécuter';
      btnAction.disabled = false;
      majIndice();
      rendreCode();
      cadre.statut(`Atelier Code · exercice ${k + 1}/${EXERCICES.length} · ${ex.titre}`);
    }

    function creerBloc(ex, id) {
      const b = ex.blocs[id];
      const el = document.createElement('div');
      el.className = 'ecole-bloc';
      el.dataset.item = id; el.dataset.niv = b.niv;
      el.style.setProperty('--c', COULEURS[b.cat]);
      el.textContent = b.txt;
      return el;
    }

    function rendreCode() {
      const ex = EXERCICES[etat.code.ex];
      refs.reserve.innerHTML = '';
      refs.programme.innerHTML = '';
      const chapeau = document.createElement('button');
      chapeau.className = 'ecole-chapeau';
      chapeau.innerHTML = '<i></i>quand ▶ cliqué';
      chapeau.title = 'Exécuter';
      chapeau.addEventListener('click', () => executer());
      refs.programme.appendChild(chapeau);
      for (const id of etat.code.reserve) refs.reserve.appendChild(creerBloc(ex, id));
      for (const id of etat.code.programme) refs.programme.appendChild(creerBloc(ex, id));
      refs.vide.hidden = etat.code.programme.length > 0;
    }

    function deplacerBloc(id, vers, index) {
      if (etat.ecran !== 'code' || etat.code.gagne) return;
      const reserve = etat.code.reserve.filter(x => x !== id);
      const programme = etat.code.programme.filter(x => x !== id);
      if (vers === 'programme') programme.splice(Math.min(index, programme.length), 0, id);
      else reserve.splice(Math.min(index, reserve.length), 0, id);
      etat = { ...etat, code: { ...etat.code, reserve, programme } };
      rendreCode();
      const ex = EXERCICES[etat.code.ex];
      cadre.statut(`Atelier Code · exercice ${etat.code.ex + 1}/${EXERCICES.length} · ${programme.length} bloc${programme.length > 1 ? 's' : ''} posé${programme.length > 1 ? 's' : ''} sur ${ex.solutions[0].flat().length}`);
    }

    async function executer() {
      if (etat.ecran !== 'code' || etat.code.gagne) return;
      const ex = EXERCICES[etat.code.ex];
      const prog = etat.code.programme;
      const res = evaluer(prog, ex);
      terminal.effacer();
      terminal.ecrire(`$ python ${ex.id}.py`, 'cmd');
      if (!res.ok) {
        const msg = messageEvaluation(res, prog, ex);
        etat = { ...etat, code: { ...etat.code, echecs: etat.code.echecs + 1 } };
        if (res.bloc) { const el = refs.programme.querySelector(`[data-item="${res.bloc}"]`); el && el.classList.add('ko'); }
        terminal.ecrire(msg, 'ko');
        cadre.statut(etat.code.echecs >= 2 ? 'Ça résiste ? Le bouton Indice est là pour ça.' : 'Le programme ne passe pas encore : lis le terminal, corrige, réexécute.', 'ko');
        return;
      }
      etat = { ...etat, code: { ...etat.code, gagne: true } };
      refs.programme.querySelectorAll('[data-item]').forEach(el => el.classList.add('ok'));
      const dernier = etat.code.ex >= EXERCICES.length - 1;
      btnAction.textContent = dernier ? 'Atelier terminé' : 'Exercice suivant';
      btnIndice.disabled = true;
      cadre.statut(`Exercice ${etat.code.ex + 1} réussi.${dernier ? ' Atelier Code validé.' : ''}`, 'ok');
      const mien = ++jeton;
      for (const l of ex.sortie) {
        await attendre(accelere ? 0 : DELAI_LIGNE_TERMINAL);
        if (jeton !== mien || !vivant) return;
        terminal.ecrire(l, 'ok');
      }
      await attendre(accelere ? 0 : DELAI_LIGNE_TERMINAL);
      if (jeton !== mien || !vivant) return;
      terminal.ecrire(ex.commentaire, 'sys');
    }

    function exerciceSuivant() {
      if (etat.code.ex >= EXERCICES.length - 1) { terminerAtelier('code'); return; }
      chargerExercice(etat.code.ex + 1);
    }

    // --- atelier 2 : Déchiffrer -------------------------------------------------

    function ouvrirChef() {
      etat = { ...etat, ecran: 'chef' };
      vue.innerHTML = `<div class="ecole-chef">
        <div class="ecole-ops">
          <div class="ecole-titre"><b>Opérations</b><span>clique ou glisse</span></div>
          <div class="ecole-zone" data-zone="ops" data-depot="non"></div>
        </div>
        <div class="ecole-recette">
          <div class="ecole-titre"><b>Recette</b><span>de haut en bas</span><span class="ecole-sp"></span><span class="ecole-defis"></span></div>
          <div class="ecole-zone" data-zone="recette"></div>
          <div class="ecole-vide-recette">Dépose des opérations ici.<br>La sortie se recalcule à chaque changement.</div>
        </div>
        <div class="ecole-io">
          <div class="ecole-titre"><b>Défi</b><span class="ecole-num-defi"></span></div>
          <div class="ecole-defi-texte"></div>
          <div class="ecole-indice"></div>
          <div class="ecole-titre"><b>Entrée</b></div>
          <div class="ecole-boite ecole-entree"></div>
          <div class="ecole-titre"><b>Sortie</b><span class="ecole-sp"></span><span class="ecole-verdict"></span></div>
          <div class="ecole-boite ecole-sortie vide"></div>
        </div>
      </div>`;
      refs = {
        ops: vue.querySelector('[data-zone="ops"]'), recette: vue.querySelector('[data-zone="recette"]'), vide: vue.querySelector('.ecole-vide-recette'),
        defis: vue.querySelector('.ecole-defis'), numDefi: vue.querySelector('.ecole-num-defi'), defiTexte: vue.querySelector('.ecole-defi-texte'),
        indice: vue.querySelector('.ecole-indice'), entree: vue.querySelector('.ecole-entree'), sortie: vue.querySelector('.ecole-sortie'), verdict: vue.querySelector('.ecole-verdict'),
      };
      for (const id of ORDRE_OPS) {
        const op = OPS[id], cat = CATEGORIES_OPS[op.cat];
        const el = document.createElement('div');
        el.className = 'ecole-op'; el.dataset.item = id;
        el.style.setProperty('--c', cat.c);
        el.innerHTML = `${op.nom}${op.cle ? ' <span class="ecole-num">· clé</span>' : ''}<small>${cat.nom}</small>`;
        refs.ops.appendChild(el);
      }
      btnMenu.hidden = false; btnIndice.hidden = false; btnAction.hidden = false;
      chargerDefi(etat.chef.defi);
    }

    function chargerDefi(k) {
      const d = DEFIS[k];
      etat = { ...etat, chef: { ...etat.chef, defi: k, recette: [], gagne: false, indice: 0 } };
      refs.numDefi.textContent = `${k + 1}/${DEFIS.length}`;
      refs.defiTexte.innerHTML = `<b>${d.titre}.</b> ${d.texte} Le flag a la forme <b>QSP{…}</b>.`;
      refs.entree.textContent = d.entree;
      refs.defis.innerHTML = DEFIS.map((_, i) => `<i class="${i < k ? 'fait' : i === k ? 'actuel' : ''}"></i>`).join('');
      btnAction.textContent = k >= DEFIS.length - 1 ? 'Atelier terminé' : 'Défi suivant';
      btnAction.disabled = true;
      majIndice();
      rendreRecette();
      cadre.statut(`Atelier Déchiffrer · défi ${k + 1}/${DEFIS.length} · ${d.titre}`);
    }

    function rendreRecette() {
      refs.recette.innerHTML = '';
      etat.chef.recette.forEach((et, i) => {
        const op = OPS[et.op], cat = CATEGORIES_OPS[op.cat];
        const el = document.createElement('div');
        el.className = 'ecole-etape'; el.dataset.item = et.uid;
        el.style.setProperty('--c', cat.c);
        el.innerHTML = `<span class="ecole-num">${i + 1}</span>${op.nom}<button class="ecole-x" title="Retirer" aria-label="Retirer">×</button><div class="ecole-apercu"></div>`;
        el.querySelector('.ecole-x').addEventListener('click', () => retirerEtape(et.uid));
        if (op.cle) {
          const inp = document.createElement('input');
          inp.type = 'text'; inp.placeholder = 'clé'; inp.value = et.cle || ''; inp.autocomplete = 'off'; inp.spellcheck = false;
          inp.setAttribute('aria-label', 'clé XOR');
          inp.addEventListener('input', () => changerCle(et.uid, inp.value));
          el.insertBefore(inp, el.querySelector('.ecole-apercu'));
        }
        refs.recette.appendChild(el);
      });
      refs.vide.hidden = etat.chef.recette.length > 0;
      recalculer();
    }

    function recalculer() {
      const d = DEFIS[etat.chef.defi];
      const { etapes, sortie, erreur } = derouler(d.entree, etat.chef.recette);
      const els = refs.recette.querySelectorAll('.ecole-etape');
      etapes.forEach((r, i) => {
        const el = els[i]; if (!el) return;
        el.classList.toggle('ko', r.ok === false); el.classList.toggle('saute', !!r.saute);
        el.querySelector('.ecole-apercu').innerHTML = r.saute ? '<b>↳</b>ignorée' : `<b>↳</b>${r.ok ? echapper(lisible(r.txt)) : echapper(r.txt)}`;
      });
      refs.sortie.className = 'ecole-boite ecole-sortie';
      refs.verdict.textContent = '';
      if (erreur) { refs.sortie.classList.add('ko'); refs.sortie.textContent = `⚠ ${erreur}`; return; }
      if (!etat.chef.recette.length) { refs.sortie.classList.add('vide'); refs.sortie.textContent = '(la sortie apparaîtra ici)'; return; }
      const txt = lisible(sortie);
      const k = txt.indexOf(d.flag);
      if (k < 0) { refs.sortie.textContent = txt; return; }
      refs.sortie.innerHTML = `${echapper(txt.slice(0, k))}<mark>${echapper(d.flag)}</mark>${echapper(txt.slice(k + d.flag.length))}`;
      refs.sortie.classList.add('ok');
      refs.verdict.textContent = 'flag trouvé';
      refs.verdict.style.color = '#6FCF8E';
      if (!etat.chef.gagne) gagnerDefi();
    }

    function gagnerDefi() {
      etat = { ...etat, chef: { ...etat.chef, gagne: true } };
      const dernier = etat.chef.defi >= DEFIS.length - 1;
      refs.defis.children[etat.chef.defi].className = 'fait';
      btnAction.disabled = false;
      btnIndice.disabled = true;
      cadre.statut(`Flag trouvé en ${etat.chef.recette.length} opération${etat.chef.recette.length > 1 ? 's' : ''}.${dernier ? ' Atelier Déchiffrer validé.' : ' « Défi suivant » pour continuer.'}`, 'ok');
    }

    function ajouterOperation(op, index) {
      if (etat.ecran !== 'chef' || !OPS[op]) return;
      const uid = etat.chef.uid + 1;
      const recette = [...etat.chef.recette];
      recette.splice(Math.min(index, recette.length), 0, { uid, op, cle: '' });
      etat = { ...etat, chef: { ...etat.chef, recette, uid } };
      rendreRecette();
    }

    function retirerEtape(uid) {
      etat = { ...etat, chef: { ...etat.chef, recette: etat.chef.recette.filter(e => e.uid !== uid) } };
      rendreRecette();
    }

    function deplacerEtape(uid, index) {
      const et = etat.chef.recette.find(e => e.uid === uid);
      if (!et) return;
      const recette = etat.chef.recette.filter(e => e.uid !== uid);
      recette.splice(Math.min(index, recette.length), 0, et);
      etat = { ...etat, chef: { ...etat.chef, recette } };
      rendreRecette();
    }

    function changerCle(uid, cle) {
      etat = { ...etat, chef: { ...etat.chef, recette: etat.chef.recette.map(e => (e.uid === uid ? { ...e, cle } : e)) } };
      recalculer();
    }

    function defiSuivant() {
      if (etat.chef.defi >= DEFIS.length - 1) { terminerAtelier('chef'); return; }
      chargerDefi(etat.chef.defi + 1);
    }

    // --- indices, action principale, fin ----------------------------------------

    function majIndice() {
      const n = etat.ecran === 'code' ? etat.code.indice : etat.chef.indice;
      btnIndice.textContent = `Indice ${Math.min(n, NB_INDICES)}/${NB_INDICES}`;
      btnIndice.disabled = n >= NB_INDICES;
      if (refs.indice) refs.indice.textContent = '';
    }

    function donnerIndice() {
      if (etat.ecran === 'code') {
        const ex = EXERCICES[etat.code.ex], n = etat.code.indice;
        if (n >= NB_INDICES) return;
        etat = { ...etat, code: { ...etat.code, indice: n + 1 } };
        terminal.ecrire(`indice ${n + 1} : ${ex.indices[n]}`, 'acc');
        cadre.statut(ex.indices[n]);
      } else if (etat.ecran === 'chef') {
        const d = DEFIS[etat.chef.defi], n = etat.chef.indice;
        if (n >= NB_INDICES) return;
        etat = { ...etat, chef: { ...etat.chef, indice: n + 1 } };
        refs.indice.textContent = `indice ${n + 1} : ${d.indices[n]}`;
        cadre.statut(d.indices[n]);
      }
      majIndice();
    }

    function actionPrincipale() {
      if (etat.ecran === 'code') { if (etat.code.gagne) exerciceSuivant(); else executer(); }
      else if (etat.ecran === 'chef' && etat.chef.gagne) defiSuivant();
    }

    function gagner() {
      const message = `Deux ateliers validés : ${EXERCICES.length} programmes assemblés bloc par bloc, ${DEFIS.length} flags déchiffrés.`;
      cadre.fin({
        titre: 'Quartier validé',
        texte: `${message} ${F.poste} (${F.periode}). ${F.pourLePoste}`,
        bouton: 'Prendre la clé',
        action: () => api.fini({ score: EXERCICES.length + DEFIS.length, message }),
      });
    }

    afficherMenu();
    redimensionner();
    animation = requestAnimationFrame(boucle);

    return {
      demonter() {
        vivant = false;
        jeton++;
        cancelAnimationFrame(animation);
        observateur.disconnect();
        glisser.detruire();
        conteneur.innerHTML = '';
      },
      // Joue les deux ateliers par les chemins du joueur : clics (pointerdown/up)
      // sur les blocs de la réserve dans le bon ordre, clics sur les opérations,
      // saisie de la clé, boutons du pied.
      async resoudre() {
        accelere = true;
        const tic = () => attendre(6);
        vue.querySelector('[data-atelier="code"]').click();
        await tic();
        for (let k = 0; k < EXERCICES.length; k++) {
          for (const id of EXERCICES[k].solutions[0].flat()) {
            simulerClic(refs.reserve.querySelector(`[data-item="${id}"]`));
            await tic();
          }
          btnAction.click();           // Exécuter
          await attendre(30);
          btnAction.click();           // Exercice suivant / Atelier terminé
          await tic();
        }
        vue.querySelector('[data-atelier="chef"]').click();
        await tic();
        for (let k = 0; k < DEFIS.length; k++) {
          for (const et of DEFIS[k].solution) {
            simulerClic(refs.ops.querySelector(`[data-item="${et.op}"]`));
            await tic();
            if (et.cle) {
              const inp = refs.recette.querySelector('.ecole-etape:last-child input');
              inp.value = et.cle;
              inp.dispatchEvent(new Event('input', { bubbles: true }));
              await tic();
            }
          }
          btnAction.click();           // Défi suivant / Atelier terminé
          await tic();
        }
        await tic();
        const fin = cadre.corps.querySelector('.jx-fin .jx-btn');
        fin && fin.click();
      },
    };
  },
};

function echapper(s) {
  return s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}
