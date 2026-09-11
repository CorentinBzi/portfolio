// NIVEAU 2 — THALES — verbe INSTRUMENTER
// Une salle de baies de stockage, la nuit. Le niveau est surtout ABSENT :
// entre deux baies il n'y a rien, et ce rien ne se franchit pas en sautant.
// Chaque cible est un capteur : l'instrumenter transforme un relevé brut en
// une mesure lisible, et la mesure devient le palier qui permet de monter.
// Au milieu, un gouffre que la SURFACE remplit de faux planchers : seule la
// TRACE montre la passerelle qui porte vraiment.
//
// Geometrie de la montee, a ne pas casser : chaque baie est un bloc plein dont
// le sommet est la ligne R. Entre deux baies il y a cinq tuiles de vide, et la
// baie suivante est deux tuiles plus haut (R-2) : c'est hors de portee d'un
// saut. La cible qui comble le trou se place donc en (T+4, R-3), T etant la
// derniere colonne de la baie de depart. L'impulsion part alors assez tard
// dans la montee pour que la sonde retombe SUR la mesure, laquelle atterrit
// six pixels au-dessus du palier suivant : on y marche, puis on s'y laisse
// tomber. Deplacer une cible de plus d'une tuile casse cet enchainement.
//
// Le gouffre du milieu fait douze tuiles : plus loin qu'un saut prolonge par
// l'impulsion. Rien ne le franchit hors TRACE, et le validateur le sait.

import { cible, acteur } from './_contrat.js';

export default {
  id: 'thales',
  numero: 2,
  titre: 'Combien il en reste',
  employeur: 'THALES',
  annees: '2020 - 2021',
  factKey: 'thales',
  verbe: 'INSTRUMENTER',
  accent: '#4FB2C4',
  targetSeconds: 70,
  indice: 'Les baies montent : mesurer pour monter',

  map: [
    '#                                                                                                                             #',
    '#                                                                                                                             #',
    '#                                                                                                                             #',
    '#                                                                                                                       SSSSSS#',
    '#                                                                                                                       SSSSSS#',
    '#                                                                                      ======                           SSSSSS#',
    '#                                                                                                                       #######',
    '#                                                                                                         |             #######',
    '#                                                                                                      ############     #######',
    '#                           ======                                                       |             ############     #######',
    '#                                                                                   ##############     ############     #######',
    '#                                                     ~~              |             ##############     ############     #######',
    '#                                           ##########::::::::::::#############     ##############     ############     #######',
    '#                             |             ##########            #############     ##############     ############     #######',
    '#                       ###############     ##########            #############     ##############     ############     #######',
    '#    |                  ###############     ##########~~~~~~~~~~~~#############     ##############     ############     #######',
    '###################     ###############     ##########            #############     ##############     ############     #######',
  ],

  spawn: { tx: 2, ty: 14 },

  cibles: [
    // premiere baie : le trou ne se saute pas
    cible(22, 13, 'VOL0 94%', "le volume sature dans 3 jours", { w: 48 }),
    // deuxieme baie : le palier monte de deux tuiles
    cible(42, 11, 'IOWAIT 812MS', "la baie attend ses propres disques", { w: 48 }),
    // apres le gouffre, la montee reprend
    cible(82, 9, 'SNAP 0 / 14', "plus une seule sauvegarde valide", { w: 48 }),
    // avant-derniere baie
    cible(101, 7, 'THERMO 41C', "la rangee chauffe du mauvais cote", { w: 48 }),
    // dernier capteur : il ouvre le palier de sortie
    cible(118, 5, 'QUOTA 0 GO', "il ne reste rien a distribuer", { w: 48 }),
  ],

  acteurs: [
    acteur(9, 15, "le stockage tient encore"),
    acteur(31, 13, "on verra au prochain trimestre"),
    acteur(72, 11, "personne ne lit ces chiffres"),
    acteur(93, 9, "combien il en reste ?"),
  ],

  init(ctx) {
    ctx.etape = 0;
  },

  pas(ctx) {
    const x = ctx.sonde.box.x / 16;
    // Le niveau n'explique rien avant que la question se pose.
    if (ctx.etape === 0 && x > 15) {
      ctx.etape = 1;
      ctx.msg("En l'air, Espace a nouveau : mesurer", 300);
    }
    if (ctx.etape === 1 && x > 30) {
      ctx.etape = 2;
      ctx.msg('une mesure lue devient un palier', 260);
    }
    if (ctx.etape === 2 && x > 48) {
      ctx.etape = 3;
      ctx.msg('Maj maintenue : lire les journaux', 340);
    }
    if (ctx.etape === 3 && x > 68) {
      ctx.etape = 4;
      ctx.msg('le plancher rassurant ne portait pas', 280);
    }
    if (ctx.etape === 4 && x > 104) {
      ctx.etape = 5;
      ctx.msg('la derniere baie est en haut a droite', 260);
    }
  },
};
