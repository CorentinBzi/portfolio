// REGISTRE — le seul fichier partagé du répertoire des niveaux.
// Une ligne par niveau : un seul point de conflit quand plusieurs personnes
// écrivent des niveaux en parallèle. L'ordre est celui du parcours.

import medline from './medline.js';
import thales from './thales.js';
import albys from './albys.js';
import independant from './independant.js';
import digitalrealty from './digitalrealty.js';
import scenario from './scenario.js';

export const NIVEAUX = [
  medline,
  thales,
  albys,
  independant,
  digitalrealty,
  scenario,
];
