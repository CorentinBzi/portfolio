// NIVEAU 5 — DIGITAL REALTY — verbe COORDONNER
// Cinq tranches du meme batiment, separees par des cloisons de beton.
// Un site, un incident : la cible porte l'alerte brute, l'impulsion la
// qualifie et la decision devient le sol sur lequel on passe.
// Le site 3 est un faux positif : son sol ('~') tient tant qu'on ne lit pas
// les journaux. Le site 5 fait l'inverse : la voie n'existe qu'en TRACE.

import { cible, acteur } from './_contrat.js';

export default {
  id: 'digitalrealty',
  numero: 5,
  titre: 'Cinq sites, une personne',
  employeur: 'DIGITAL REALTY',
  annees: 'DEPUIS 2025',
  factKey: 'digitalrealty',
  verbe: 'COORDONNER',
  accent: '#5AA9E6',
  targetSeconds: 80,
  indice: 'Maj maintenue : lire les journaux',

  map: [
      '#                     #                     #                     #                       #                                      #',
      '#                     #                     #                     #                       #                                      #',
      '#                     #                     #                     #                       #                                      #',
      '#                     #                     #                     #                       #                                      #',
      '#                     #                     #                     #                       #                                      #',
      '#                     #                     #                     #                       #                                      #',
      '#                     #                     #                     #                       #                                      #',
      '#                     #                     #                     #                       #                                      #',
      '#                     #                     #                     #                       #                                      #',
      '#                     #                     #                     #                       #                                      #',
      '#                     #                     #                     #                       #                                      #',
      '#                     #                     #                     #                       #                                      #',
      '#                     #                     #                     #                       #                                      #',
      '#                     #                     #                     #                       #                                      #',
      '#                                                                                                                           SSSSS#',
      '#  |              |     |             |                       |     |             |         |            |     |            =====#',
      '############    ################     ###########~~~~~~~##    ################    ###################    #########::::::::#########'
  ],

  spawn: { tx: 2, ty: 14 },

  cibles: [
    // Site 1 — un lecteur de badge tombe : la decision est d'envoyer quelqu'un.
    cible(13, 14, 'BADGE READER 3 OFFLINE', "j'envoie le prestataire sur site"),
    // Site 2 — la video manque : on bascule avant de reparer.
    cible(34, 14, 'CAM 12 SIGNAL LOSS', 'je bascule sur la camera voisine'),
    // Site 3 — l'alerte de trop : la qualifier, c'est decider de ne rien faire.
    cible(58, 14, 'MOTION ZONE 7 REPEAT', "rien a faire, c'est la ronde"),
    // Site 4 — l'engagement de service court : on escalade avant l'echeance.
    cible(79, 14, 'SLA 4H : T-20MIN', "j'escalade chez le prestataire"),
    // Site 5 — plus personne ne sait : les journaux, eux, savent.
    cible(101, 14, 'CAUSE NON IDENTIFIEE', 'la cause est dans les journaux'),
  ],

  acteurs: [
    acteur(5, 15, 'ca sonne sur les cinq sites'),
    acteur(26, 15, 'la camera 12 est noire'),
    acteur(50, 15, 'elle sonne toutes les nuits'),
    acteur(70, 15, 'le prestataire ne repond pas'),
    acteur(106, 15, 'personne ne sait pourquoi'),
  ],

  init(ctx) {
    ctx.site = 0;
  },

  // Un message par tranche : le niveau se lit comme une tournee de sites.
  pas(ctx) {
    const x = ctx.sonde.box.x / 16;
    if (ctx.site === 0 && x > 3) { ctx.site = 1; ctx.msg("Site 1 : controle d'acces", 240); }
    if (ctx.site === 1 && x > 25) { ctx.site = 2; ctx.msg('Site 2 : videosurveillance', 240); }
    if (ctx.site === 2 && x > 44) { ctx.site = 3; ctx.msg("Site 3 : l'alerte de toutes les nuits", 200); }
    if (ctx.site === 3 && x > 47) { ctx.site = 4; ctx.msg('ce sol ne tient pas dans les journaux', 300); }
    if (ctx.site === 4 && x > 68) { ctx.site = 5; ctx.msg('Site 4 : engagement de service', 240); }
    if (ctx.site === 5 && x > 91) { ctx.site = 6; ctx.msg('Site 5 : plus personne ne sait', 240); }
    if (ctx.site === 6 && x > 110) { ctx.site = 7; ctx.msg('Maj maintenue : la voie est dedans', 320); }
  },
};
