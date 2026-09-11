// REGISTRE des jeux — le seul fichier partagé du répertoire.
// Une ligne par jeu. L'id d'un jeu est l'id du quartier qui l'héberge.

import medline from './medline.js';
import thales from './thales.js';
import albys from './albys.js';
import independant from './independant.js';
import digitalrealty from './digitalrealty.js';
import scenario from './scenario.js';

export const JEUX = [medline, thales, albys, independant, digitalrealty, scenario];

export function jeuPour(id) { return JEUX.find(j => j.id === id) || null; }
