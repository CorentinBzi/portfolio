// Progression du visiteur : fonctions pures (nouvel objet gelé à chaque changement)
// et un adaptateur de stockage protégé. Rien ici n'est un fait du candidat :
// `message` décrit la partie du visiteur et n'est rendu que par textContent.

export const CLE_STOCKAGE = 'cb-portfolio.v3';
export const CLE_ANCIENNE = 'qsp3d.v2';
const MIGRABLES = Object.freeze(['ecole', 'medline', 'digitalrealty']);
const MESSAGE_MAX = 300;
const DATE_MAX = 40;

function geler(p) {
  const cles = {};
  for (const [id, e] of Object.entries(p.cles || {})) cles[id] = Object.isFrozen(e) ? e : Object.freeze({ ...e });
  return Object.freeze({ version: 3, vu: p.vu === true, animations: p.animations === 'reduites' ? 'reduites' : 'auto', cles: Object.freeze(cles) });
}

export function progressionVide() {
  return geler({ version: 3, vu: false, animations: 'auto', cles: {} });
}

const scoreValide = (s) => (typeof s === 'number' && Number.isFinite(s) ? s : null);
const messageValide = (m) => (typeof m === 'string' ? m.slice(0, MESSAGE_MAX) : null);

function entreeValide(brute) {
  if (!brute || typeof brute !== 'object') return null;
  const e = {
    score: scoreValide(brute.score),
    message: messageValide(brute.message),
    date: typeof brute.date === 'string' ? brute.date.slice(0, DATE_MAX) : '',
  };
  if (brute.migree === true) e.migree = true;
  return Object.freeze(e);
}

export function validerProgression(brute, idsConnus) {
  if (!brute || typeof brute !== 'object' || brute.version !== 3) return progressionVide();
  const ids = new Set(idsConnus || []);
  const cles = {};
  if (brute.cles && typeof brute.cles === 'object' && !Array.isArray(brute.cles)) {
    for (const [id, v] of Object.entries(brute.cles)) {
      if (!ids.has(id)) continue;
      const e = entreeValide(v);
      if (e) cles[id] = e;
    }
  }
  return geler({ vu: brute.vu === true, animations: brute.animations, cles });
}

// Migration depuis la ville 3D : seules les clés des jeux inchangés sont reprises.
export function migrerV2(brute, idsConnus) {
  if (!brute || !Array.isArray(brute.cles)) return progressionVide();
  const ids = new Set(idsConnus || []);
  const cles = {};
  for (const id of brute.cles) {
    if (typeof id === 'string' && MIGRABLES.includes(id) && ids.has(id)) {
      cles[id] = Object.freeze({ score: null, message: null, date: '', migree: true });
    }
  }
  return geler({ vu: false, animations: 'auto', cles });
}

function lireBrut(stockage, cle) {
  try {
    const s = stockage ? stockage.getItem(cle) : null;
    return s ? JSON.parse(s) : null;
  } catch {
    return null;
  }
}

export function lireProgression(stockage, idsConnus) {
  const v3 = lireBrut(stockage, CLE_STOCKAGE);
  if (v3) return validerProgression(v3, idsConnus);
  return migrerV2(lireBrut(stockage, CLE_ANCIENNE), idsConnus);
}

export function ecrireProgression(p, stockage) {
  try {
    if (!stockage) return false;
    stockage.setItem(CLE_STOCKAGE, JSON.stringify(p));
    return true;
  } catch {
    return false;
  }
}

export function stockageDisponible(stockage) {
  try {
    if (!stockage) return false;
    const k = '__cb_portfolio_test__';
    stockage.setItem(k, '1');
    stockage.removeItem(k);
    return true;
  } catch {
    return false;
  }
}

// Nouvelle clé : on garde le meilleur score, la dernière partie décrit « votre partie ».
export function avecCle(p, id, { score = null, message = null } = {}, date = '') {
  const ancienne = p.cles[id];
  const s = scoreValide(score);
  const meilleur = ancienne && ancienne.score !== null ? (s === null ? ancienne.score : Math.max(ancienne.score, s)) : s;
  const entree = Object.freeze({ score: meilleur, message: messageValide(message), date: String(date || '').slice(0, DATE_MAX) });
  return geler({ ...p, cles: { ...p.cles, [id]: entree } });
}

export function avecVu(p) {
  return p.vu ? p : geler({ ...p, vu: true });
}

export function avecAnimations(p, valeur) {
  return geler({ ...p, animations: valeur });
}

export function sansCles(p) {
  return geler({ ...p, cles: {} });
}

export function nbCles(p) {
  return Object.keys(p.cles).length;
}

export function aCle(p, id) {
  return Object.prototype.hasOwnProperty.call(p.cles, id);
}

// ?progres=all|none : état en mémoire seulement.
export function progressionForcee(mode, idsConnus) {
  if (mode !== 'all') return progressionVide();
  const cles = {};
  for (const id of idsConnus || []) cles[id] = Object.freeze({ score: null, message: null, date: '' });
  return geler({ vu: true, animations: 'auto', cles });
}

// Le niveau suggéré : le premier non gagné (le premier niveau si tout est gagné).
export function suggere(p, ids) {
  return (ids || []).find((id) => !aCle(p, id)) || (ids || [])[0] || null;
}
