// NIVEAU 4 — INDÉPENDANT — verbe ATTESTER
// Un atelier, un convoyeur, un mur de rapports. Le niveau tient dans un seul
// écart : ce qu'un message prétend être, et ce que son verdict d'authentification
// dit. Les cibles sont des en-têtes ; l'impulsion les remplace par le verdict.
// Le sol lui-même joue le même jeu : les tuiles '~' sont des appuis qui ont
// l'air légitimes en SURFACE et que les journaux révèlent vides, et le seul
// franchissement du convoyeur central n'existe que dans les journaux.

import { cible, acteur } from './_contrat.js';

export default {
  id: 'independant',
  numero: 4,
  titre: "Quelqu'un signait son nom",
  employeur: 'INDEPENDANT',
  annees: '2023 - 2025',
  factKey: 'independant',
  verbe: 'ATTESTER',
  accent: '#E08A5B',
  targetSeconds: 75,
  indice: "Maj maintenue : le verdict d'authentification",

  map: [
      '#                                                                                                                            #',
      '#                                                                                                                            #',
      '#                                                                                                                            #',
      '#                                                                                                                            #',
      '#                                                                                                                            #',
      '#                                                                                                                            #',
      '#                                                                                                                            #',
      '#                                                                                                                            #',
      '#                                                                                                                            #',
      '#                                                                                                                            #',
      '#                                                                                      o    o                                #',
      '#                                                                                      o    o                        SSSSSSSS#',
      '#                                                                                      o    o                       =========#',
      '#                                                                                      o    o                                #',
      '#                                                                                                           ========         #',
      '#  |                    |                               |             |                               |                      #',
      '###############   #############~~~~~~~~######:::::::::#########   ####~~~~#######                #############################'
  ],

  spawn: { tx: 2, ty: 14 },

  cibles: [
    // A — le premier en-tete, au-dessus du premier trou de l'atelier
    cible(18, 13, 'FROM: DIRECTION', "ce message ne vient pas de la direction"),
    // B — apres le convoyeur : ni l'enveloppe ni la signature ne repondent
    cible(66, 13, 'SPF NEUTRAL, DKIM FAIL', "ni l'enveloppe ni la signature"),
    // C, D, E — le mur de rapports : trois cibles rapprochees, deux ancres
    // entre elles, donc un seul temps de vol suffit a les enchainer.
    cible(84, 13, 'RAPPORT 1/3', "les rapports arrivent, je ne lis plus"),
    cible(89, 13, 'RAPPORT 2/3', "l'alerte part avant que je la voie"),
    cible(94, 11, 'RAPPORT 3/3', "l'outil signe le verdict, pas moi"),
  ],

  acteurs: [
    acteur(7, 15, "c'est le directeur qui ecrit"),
    acteur(27, 15, "l'adresse a l'air bonne"),
    acteur(58, 15, "on a toujours fait comme ca"),
    acteur(78, 15, "j'ai clique, c'est grave ?"),
    acteur(105, 15, "qui a signe, au juste ?"),
  ],

  init(ctx) {
    ctx.etape = 0;
  },

  pas(ctx, input) {
    const x = ctx.sonde.box.x / 16;
    // Le niveau n'explique rien avant que la situation l'exige.
    if (ctx.etape === 0 && x > 12) {
      ctx.etape = 1;
      ctx.msg("En l'air, Espace : attester l'en-tete", 300);
    }
    if (ctx.etape === 1 && x > 31) {
      ctx.etape = 2;
      ctx.msg('Ce sol se lit bien. Verifiez-le quand meme', 300);
    }
    if (ctx.etape === 2 && x > 43) {
      ctx.etape = 3;
      ctx.msg('Maj maintenue : le convoyeur est dans les journaux', 340);
    }
    if (ctx.etape === 3 && x > 80) {
      ctx.etape = 4;
      ctx.msg('Le mur de rapports : enchainez, les ancres rechargent', 340);
    }
  },
};
