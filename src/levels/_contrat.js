// CONTRAT DE NIVEAU — figé. Un niveau n'importe QUE ce fichier.
// Il ne touche jamais au moteur, au rendu ni à la physique : s'il lui manque
// quelque chose, il le met dans ses propres `cibles` ou son `pas`.

import { F } from '../physics.js';
import { CLES } from '../cv.js';

// Légende commune des cartes ASCII. Un auteur de niveau n'en invente pas.
export const LEGENDE = {
  ' ': F.VIDE,
  '#': F.SOLIDE,                 // béton : portant dans les deux couches
  '=': F.PLATEFORME,             // portant par le dessus seulement
  '~': F.BRUIT,                  // faux positif : portant en SURFACE, vide en TRACE
  ':': F.TRACE_SEUL,             // la cause réelle : portante en TRACE seulement
  'x': F.DANGER,                 // décrochage au contact
  '|': F.PASSAGE,                // point de passage
  'S': F.SORTIE,                 // sortie du niveau
  'o': F.ANCRE,                  // recharge l'impulsion en vol
};

// Fabrique une cible verbale. C'est la seule primitive du jeu :
// une impulsion dessus la transforme en sol praticable.
//   tx, ty : position en TUILES
//   avant  : le texte machine, illisible (affiché avant transformation)
//   apres  : la phrase française, lisible (affichée sur le sol fabriqué)
//   opts   : { w, h, visibleSurface, solW, solH, solDy, sansSol }
export function cible(tx, ty, avant, apres, opts = {}) {
  const w = opts.w || Math.max(28, String(avant).length * 4 + 8);
  return {
    x: tx * 16, y: ty * 16,
    w, h: opts.h || 14,
    avant, apres,
    visibleSurface: opts.visibleSurface !== false,
    solW: opts.solW || Math.max(40, String(apres).length * 4 + 8),
    solH: opts.solH || 6,
    solDy: opts.solDy === undefined ? 10 : opts.solDy,
    sansSol: !!opts.sansSol,
    tag: opts.tag || null,
    fait: false,
  };
}

export function acteur(tx, ty, bulle) {
  return { x: tx * 16, y: ty * 16, bulle: bulle || null };
}

// Vérifie un niveau au chargement. Un niveau qui ne passe pas ne démarre pas :
// mieux vaut un écran d'erreur franc qu'un niveau infranchissable en silence.
export function valide(n) {
  const err = [];
  if (!n.id) err.push('id manquant');
  if (!CLES.includes(n.factKey)) err.push(`factKey inconnue : ${n.factKey}`);
  if (!Array.isArray(n.map) || !n.map.length) err.push('carte vide');
  if (!n.spawn) err.push('spawn manquant');
  if (n.targetSeconds > 90) err.push('durée cible > 90 s');

  const joint = (n.map || []).join('');
  for (const ch of joint) {
    if (LEGENDE[ch] === undefined) { err.push(`caractère hors légende : « ${ch} »`); break; }
  }
  if (!joint.includes('S')) err.push('aucune sortie');
  // règle de conception : la TRACE doit servir, sinon la mécanique est décorative
  if (!joint.includes('~') && !joint.includes(':') &&
      !(n.cibles || []).some(c => c.visibleSurface === false)) {
    err.push('aucune raison de passer en TRACE (ni ~ ni : ni cible cachée)');
  }
  return err;
}

// Un niveau exporte par défaut un objet de cette forme :
//
// {
//   id, numero, titre, employeur, annees, factKey, verbe, accent,
//   targetSeconds, indice,
//   map: [ '####', '#  #', ... ],   // lignes de même longueur de préférence
//   spawn: {tx, ty},
//   cibles: [ cible(...) ],
//   acteurs: [ acteur(...) ],
//   pas(ctx)        // optionnel : logique propre au niveau, appelée chaque pas
//   surVerbe(ctx, c)// optionnel : réaction à une cible transformée
//   dessine(ctx)    // optionnel : décor propre, dessiné derrière les entités
// }
//
// ctx expose : { sonde, carte, cam, trace, t, sols, cibles, acteurs, msg(texte),
//                r (renderer), fini() }
