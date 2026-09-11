// NIVEAU 6 — SCÉNARIO — aucun verbe nouveau
//
// Ce niveau ne revendique aucune expérience : c'est une mise en situation pour
// le poste visé. Il rejoue les cinq verbes déjà acquis, dans l'ordre où ils ont
// été appris, chacun nommant son employeur au moment de servir.
//
// La plainte est fausse : « l'assistant propose des posologies incohérentes ».
// La descente va du symptôme déclaré à une cause physique — un noeud GPU qui
// se bride thermiquement parce qu'une baie voisine lui souffle son air chaud.
// La piste évidente — « on redémarre le modèle » — est une passerelle '~' qui
// s'évapore dès qu'on ouvre les journaux, et qui de toute façon s'arrête au
// milieu du gouffre ; la cause réelle est un sol ':' qui n'existe que sous les
// journaux. Il faut donc les lire pour passer : c'est le seul passage obligé.

import { cible, acteur } from './_contrat.js';

// Les cinq verbes reviennent dans l'ordre chronologique du parcours.
// Une seule étape est consommée par pas : les messages ne se recouvrent pas.
const ETAPES = [
  { x: 3,   msg: 'SCENARIO - CE QUE JE FERAIS CHEZ VOUS' },
  { x: 8,   msg: 'PLAINTE 05:12 - POSOLOGIES INCOHERENTES' },
  { x: 11,  verbe: 'TRADUIRE',     msg: 'MEDLINE - TRADUIRE LA PLAINTE' },
  { x: 25,  verbe: 'INSTRUMENTER', msg: 'THALES - INSTRUMENTER LA CHAINE' },
  { x: 55,  verbe: 'SEGMENTER',    msg: 'ALBYS - SEGMENTER POUR ELIMINER' },
  { x: 70,  msg: 'MAJ MAINTENUE : LIRE LES JOURNAUX' },
  { x: 90,  verbe: 'ATTESTER',     msg: 'INDEPENDANT - ATTESTER LA CAUSE' },
  { x: 104, verbe: 'COORDONNER',   msg: 'DIGITAL REALTY - COORDONNER' },
  { x: 118, msg: 'ON REMONTE EXPLIQUER' },
];

const niveau = {
  id: 'scenario',
  numero: 6,
  titre: "05:52 - Quelqu'un sur place",
  employeur: 'LE POSTE VISE',
  annees: 'SCENARIO',
  factKey: 'scenario',
  verbe: 'LES CINQ',
  accent: '#E9EEF2',
  targetSeconds: 85,
  scenario: true,
  indice: 'Mise en situation - aucune experience revendiquee',

  map: [
      '#                                                                                                                                #',
      '#                                                                                                                                #',
      '#                                                                                                                                #',
      '#                                                                                                                                #',
      '#                                                                                                                                #',
      '#                                                                                                                                #',
      '#                                                                                                                                #',
      '#                                                                                                                                #',
      '#                                                                                                                                #',
      '#                                                                                                                                #',
      '#                                                                                                                                #',
      '#                                                                                                                             SSS#',
      '#                                                                                                                            ====#',
      '#                                                                       ~~~~~~~oo                                                #',
      '#                                                                                                                       ====     #',
      '#  |                  |              |              |              |                  |               |              |           #',
      '#############     ##########     ##########     ###########     ###########:::::::############     ###########     #####         #'
  ],

  spawn: { tx: 2, ty: 14 },

  // Chaque cible est posee au-dela du sommet du saut, jamais au-dessus du bord :
  // l'impulsion remplace la vitesse verticale, donc declenchee trop tot elle
  // casserait l'elan au lieu d'ajouter un palier.
  cibles: [
    // MEDLINE — traduire ce qui est dit en ce qui est observe
    cible(16, 13, 'TICKET 05:12', "ils disent : reponses incoherentes"),
    // THALES — instrumenter : ce qui est mesure, et depuis quand
    cible(30, 13, 'LATENCE P99 4200MS', "la lenteur commence a 00:10"),
    cible(46, 13, 'TOKENS/S -63%', "le debit chute, la qualite non"),
    // ALBYS — segmenter pour eliminer une couche entiere
    cible(61, 13, 'VLAN SOINS : RAS', "le reseau n'est pas en cause"),
    // INDEPENDANT — attester : la preuve est dans les journaux
    cible(96, 13, 'GPU 0 THROTTLE 87C', "le noeud se bride, pas le modele"),
    // DIGITAL REALTY — coordonner : la cause est dans la salle
    cible(112, 13, 'INLET BAIE 7 : 41C', "la baie voisine souffle son air chaud"),
  ],

  acteurs: [
    acteur(6, 15, "il dit n'importe quoi"),
    acteur(20, 15, 'depuis minuit environ'),
    acteur(35, 15, "on n'a rien change"),
    acteur(51, 15, "c'est le wifi non ?"),
    acteur(66, 15, 'on redemarre le modele ?'),
    acteur(88, 15, "le modele n'a pas bouge"),
    acteur(103, 15, 'la baie 7 date de lundi'),
    acteur(117, 15, 'je monte leur expliquer'),
  ],

  init(ctx) {
    ctx.etape = 0;
    niveau.verbe = 'TRADUIRE';
  },

  pas(ctx) {
    const x = ctx.sonde.box.x / 16;
    const e = ETAPES[ctx.etape];
    if (!e || x <= e.x) return;
    ctx.etape++;
    if (e.verbe) niveau.verbe = e.verbe;
    ctx.msg(e.msg, 280);
  },
};

export default niveau;
