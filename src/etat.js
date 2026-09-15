// Machine d'états de la coquille : pure, chaque état est gelé.
// Invariants : jeu !== null <=> ecran === 'jeu' ; fiche === false si ecran === 'jeu' ;
// le CV peut être ouvert dans tous les écrans.

export const ETAT_INITIAL = Object.freeze({
  ecran: 'amorcage', selection: 'ecole', fiche: false, cv: null, jeu: null, recompense: null,
});

const avec = (etat, changements) => Object.freeze({ ...etat, ...changements });

export function transition(etat, ev) {
  if (!etat || !ev || typeof ev.type !== 'string') return etat;
  switch (ev.type) {
    case 'AMORCAGE_FINI':
      return etat.ecran === 'amorcage' ? avec(etat, { ecran: 'carte' }) : etat;
    case 'SELECTIONNER':
      if (!ev.id || etat.ecran === 'jeu' || etat.selection === ev.id) return etat;
      return avec(etat, { selection: ev.id });
    case 'OUVRIR_FICHE':
      return etat.ecran === 'carte' && !etat.fiche ? avec(etat, { fiche: true }) : etat;
    case 'FERMER_FICHE':
      return etat.fiche ? avec(etat, { fiche: false }) : etat;
    case 'JOUER':
      if (!ev.id || etat.ecran === 'jeu') return etat;
      return avec(etat, { ecran: 'jeu', jeu: ev.id, selection: ev.id, fiche: false, recompense: null });
    case 'JEU_GAGNE':
      if (etat.ecran !== 'jeu') return etat;
      return avec(etat, {
        ecran: 'carte', jeu: null,
        recompense: Object.freeze({ id: ev.id || etat.jeu, resultat: ev.resultat || null }),
      });
    case 'JEU_QUITTE':
      return etat.ecran === 'jeu' ? avec(etat, { ecran: 'carte', jeu: null }) : etat;
    case 'OUVRIR_CV':
      return avec(etat, {
        cv: Object.freeze({ onglet: ev.onglet === 'cles' ? 'cles' : 'complet', ancre: ev.ancre || null }),
      });
    case 'FERMER_CV':
      return etat.cv ? avec(etat, { cv: null }) : etat;
    case 'FERMER_RECOMPENSE':
      return etat.recompense ? avec(etat, { recompense: null }) : etat;
    default:
      return etat;
  }
}

export function invariants(etat) {
  const e = [];
  if ((etat.jeu !== null) !== (etat.ecran === 'jeu')) e.push('jeu !== null <=> ecran === jeu');
  if (etat.ecran === 'jeu' && etat.fiche) e.push('fiche ouverte pendant un jeu');
  if (!['amorcage', 'carte', 'jeu'].includes(etat.ecran)) e.push(`écran inconnu : ${etat.ecran}`);
  if (!Object.isFrozen(etat)) e.push('état non gelé');
  return e;
}
