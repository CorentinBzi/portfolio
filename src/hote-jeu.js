// Hôte des jeux : import dynamique à la demande (jamais src/jeux/index.js), contrat vérifié,
// API gelée, fini/abandonner une seule fois et différés, démontage protégé.
// Un jeu cassé ne fait jamais tomber la carte : l'échec revient en surQuitte({ erreur }).

import { valider } from './jeux/_contrat.js';
import { FAITS } from './cv.js';
import { NIVEAUX, niveau } from './niveaux.js';

const IDS = new Set(NIVEAUX.map((n) => n.id));
const META = new Map();
const MESSAGE_MAX = 300;

export function metaJeu(id) {
  return META.get(id) || null;
}

async function charger(id) {
  if (!IDS.has(id)) throw new Error(`jeu inconnu : ${id}`);
  const module = await import(`./jeux/${id}.js`);
  const jeu = module && module.default;
  if (!jeu || typeof jeu !== 'object') throw new Error('export par défaut absent');
  if (typeof jeu.description === 'string') META.set(id, { description: jeu.description });
  return jeu;
}

export async function monterJeu({ id, conteneur, mouvementReduit = false, journal = () => {}, surGagne, surQuitte }) {
  const n = niveau(id);
  const noter = (m) => { try { journal(m); } catch { /* le journal est facultatif */ } };
  let jeu;
  try {
    jeu = await charger(id);
  } catch (e) {
    noter(`JEU ${id} import : ${e && e.message ? e.message : e}`);
    surQuitte({ erreur: 'import' });
    return null;
  }
  let erreurs;
  try { erreurs = valider(jeu); } catch (e) { erreurs = [String(e && e.message ? e.message : e)]; }
  if (erreurs.length) {
    noter(`JEU ${id} contrat : ${erreurs.join(' · ')}`);
    surQuitte({ erreur: 'contrat' });
    return null;
  }
  for (const champ of ['titre', 'verbe', 'accent']) {
    const a = String(jeu[champ] || ''), b = String(n[champ] || '');
    if ((champ === 'accent' ? a.toLowerCase() !== b.toLowerCase() : a !== b)) noter(`INCOHERENCE ${id} ${champ}`);
  }

  let etat = 'monte';
  let inst = null;
  const nettoyer = () => {
    try { if (inst && typeof inst.demonter === 'function') inst.demonter(); } catch (e) { noter(`JEU ${id} demonter : ${e && e.message ? e.message : e}`); }
    conteneur.replaceChildren();
  };
  const conclure = (rappel, valeur) => {
    if (etat !== 'monte') return;
    etat = 'fini';
    setTimeout(() => { nettoyer(); rappel(valeur); }, 0);
  };
  const api = Object.freeze({
    FAITS,
    accent: n.accent,
    mouvementReduit: !!mouvementReduit,
    fini(r) {
      const score = r && typeof r.score === 'number' && Number.isFinite(r.score) ? r.score : null;
      const message = r && typeof r.message === 'string' ? r.message.slice(0, MESSAGE_MAX) : null;
      conclure(surGagne, { score, message });
    },
    abandonner() { conclure(surQuitte, {}); },
  });

  try {
    inst = jeu.monter(conteneur, api) || {};
  } catch (e) {
    noter(`JEU ${id} monter : ${e && e.message ? e.message : e}`);
    etat = 'fini';
    nettoyer();
    surQuitte({ erreur: 'montage' });
    return null;
  }

  const appeler = (nom) => {
    try { if (inst && typeof inst[nom] === 'function') inst[nom](); } catch (e) { noter(`JEU ${id} ${nom} : ${e && e.message ? e.message : e}`); }
  };
  return {
    jeu,
    aPause: typeof inst.pause === 'function',
    pause: () => appeler('pause'),
    reprendre: () => appeler('reprendre'),
    demonter() {
      if (etat !== 'monte') return;
      etat = 'fini';
      nettoyer();
    },
  };
}
