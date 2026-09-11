// REGISTRE des jeux — le seul fichier partagé du répertoire.
// Une ligne par jeu. L'id d'un jeu est l'id du quartier qui l'héberge.

import medline from './medline.js';

export const JEUX = [
  medline,
];

export function jeuPour(id) { return JEUX.find(j => j.id === id) || null; }
