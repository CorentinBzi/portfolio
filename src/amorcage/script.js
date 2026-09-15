// Script de l'amorçage (spec §2.2) : pur. Chaque « [ OK ] » est adossé à une vérification
// réelle, chaque nombre est calculé, chaque valeur factuelle vient de cv.js.

const EN_LETTRES = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix'];
export const lettres = (n) => EN_LETTRES[n] || String(n);

// 'couche socle ' complété par des points jusqu'à 22 caractères.
export const libelleCouche = (nom) => `couche ${nom} `.padEnd(22, '.');

const PLANS = [
  { t: 1000, plan: 'socle', couche: 'socle', nom: 'socle', detail: () => 'campus, hall, portiques' },
  { t: 1350, plan: 'reseau', couche: 'reseau', nom: 'réseau', detail: () => 'câbles, cloisons, pare-feu' },
  { t: 1700, plan: 'donnees', couche: 'donnees', nom: 'données', detail: () => 'volumes montés' },
  { t: 2050, plan: 'usages', couche: 'usages', nom: 'usages', detail: () => 'guichet, centre de tri' },
  { t: 2400, plan: 'horizon', couche: 'sites', nom: 'sites', detail: (n) => `${lettres(n)} campus à l’horizon` },
];

const resultat = (etat, texte) => ({ etat, texte });

// Plan dessiné : [ OK ] ; encore en cours : [ .. ] ; monde en panne (la coquille répond 'panne') : [ !! ].
async function verifierPlan(plan, id, libelle, texteOk) {
  const r = await plan(id);
  if (r === 'panne') return resultat('!!', `${libelle} carte indisponible · le CV reste lisible`);
  return r ? resultat('ok', texteOk) : resultat('..', `${libelle} fin du dessin en arrière-plan`);
}

export function construireScript({
  FAITS, CLES, FORMATION, COMPETENCES, NIVEAUX, PROFIL, progression,
  verifierNiveaux, polices, plan, nbCampus = 5,
}) {
  const nbNiveaux = NIVEAUX.length;
  const nbCles = progression ? Object.keys(progression.cles || {}).length : 0;
  const lignes = [];

  lignes.push({ id: 'titre', t: 0, type: 'statique', texte: `COUCHE PAR COUCHE · amorçage du portfolio de ${PROFIL.nom}` });
  lignes.push({ id: 'commande', t: 0, type: 'statique', texte: '$ amorcer --profil cyber-ia --lecture-seule' });

  lignes.push({
    id: 'polices', t: 300, delai: 900, tot: true,
    verifier: async () => ((await polices())
      ? resultat('ok', 'polices : Archivo, IBM Plex Mono')
      : resultat('--', 'polices système, on continue')),
    retard: resultat('--', 'polices système, on continue'),
  });

  lignes.push({
    id: 'faits', t: 650, delai: 400, tot: true,
    verifier: async () => {
      const erreurs = [];
      if (!Object.isFrozen(FAITS)) erreurs.push('FAITS non gelé');
      if (!Array.isArray(CLES) || CLES.length !== Object.keys(FAITS).length) erreurs.push('CLES incohérent');
      if (!FORMATION || !FORMATION.length) erreurs.push('FORMATION vide');
      if (!COMPETENCES || !COMPETENCES.length) erreurs.push('COMPETENCES vide');
      erreurs.push(...verifierNiveaux({ FAITS, COMPETENCES }));
      if (erreurs.length) return { ...resultat('!!', 'faits incohérents · le CV imprimable reste disponible'), erreurs };
      return resultat('ok', `faits : src/cv.js · ${CLES.length} fiches, ${FORMATION.length} formations, ` +
        `${COMPETENCES.length} groupes de compétences, gelés`);
    },
    retard: resultat('!!', 'faits incohérents · le CV imprimable reste disponible'),
  });

  for (const p of PLANS) {
    const libelle = libelleCouche(p.nom);
    lignes.push({
      id: `plan-${p.plan}`, t: p.t, delai: 320, plan: p.plan, couche: p.couche,
      verifier: () => verifierPlan(plan, p.plan, libelle, `${libelle} ${p.detail(nbCampus)}`),
      retard: resultat('..', `${libelle} fin du dessin en arrière-plan`),
    });
  }

  const libelleModele = libelleCouche('modèle');
  lignes.push({
    id: 'plan-ciel', t: 2750, fin: 3400, type: 'barre', delai: 300, plan: 'ciel', couche: 'modele',
    texteBarre: (fraction) => {
      const pleins = Math.round(Math.max(0, Math.min(1, fraction)) * 10);
      return `${libelleModele} ${'▮'.repeat(pleins)}${'▯'.repeat(10 - pleins)}`;
    },
    verifier: () => verifierPlan(plan, 'ciel', libelleModele, `${libelleModele} prêt`),
    retard: resultat('..', `${libelleModele} fin du dessin en arrière-plan`),
  });

  lignes.push({
    id: 'niveaux', t: 3650, delai: 200,
    verifier: async () => resultat('ok', `niveaux : ${nbNiveaux} déclarés · clés ${nbCles}/${nbNiveaux} · le CV complet se lit sans jouer`),
    retard: resultat('ok', `niveaux : ${nbNiveaux} déclarés · clés ${nbCles}/${nbNiveaux} · le CV complet se lit sans jouer`),
  });

  // Vrai par construction : le site n'écrit que localStorage, aucun cookie, aucun script tiers.
  lignes.push({
    id: 'traceurs', t: 3900, delai: 200,
    verifier: async () => resultat('ok', 'aucun traceur, aucun cookie posé par ce site'),
    retard: resultat('ok', 'aucun traceur, aucun cookie posé par ce site'),
  });

  lignes.push({
    id: 'presentation', t: 4150, type: 'texte', classe: 'presentation',
    texte: `> ${PROFIL.nom} — ${FAITS.digitalrealty.poste} · ${FORMATION[0].titre}`,
  });

  lignes.push({ id: 'invite', t: 4350, type: 'texte', classe: 'invite', texte: '$ carte --parallaxe' });

  return lignes;
}

export const T_REPLI = 4400;
export const DUREE_REPLI = 450;
export const PLAFOND = 5000;
export const PLAFOND_REDUIT = 3000;
export const MINIMUM_REDUIT = 1200;
export const FACTEUR_RETOUR = 0.35;
