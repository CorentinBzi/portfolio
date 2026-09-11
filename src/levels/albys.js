// NIVEAU 3 — ALBYS — verbe SEGMENTER
// Des ilots de baies separes par du vide, relies par rien. Chaque cible est
// une jonction reseau : segmenter y pose une cloison, et la cloison devient
// le pont. Le gouffre central n'a aucune traversee en surface — les deux
// dalles qui le franchissent n'existent que dans les journaux. Un flux
// lateral court au ras du sol : on ne le coupe pas, on passe au-dessus.

import { cible, acteur } from './_contrat.js';

export default {
  id: 'albys',
  numero: 3,
  titre: 'Tout ce qui passe passe quelque part',
  employeur: 'ALBYS',
  annees: '2021 - 2023',
  factKey: 'albys',
  verbe: 'SEGMENTER',
  accent: '#7C6CE0',
  targetSeconds: 80,
  indice: 'Espace pour sauter, Maj maintenue pour les journaux',

  map: [
    "#                                                                                                                                #",
    "#                                                                                                                                #",
    "#                                                                                                                                #",
    "#                                                                                                                                #",
    "#                                                                                                                                #",
    "#                                                                                                                                #",
    "#                                                                                                                                #",
    "#                                                                                                                                #",
    "#                                                                                                                                #",
    "#                                                                                                                                #",
    "#                                                                                                                                #",
    "#                                                                                                                                #",
    "#                                                                                                                                #",
    "#                                                           ::::::::                                                           SS#",
    "#                                                   :::::::                            =========                               ==#",
    "#  |                                              |                          |                                                   #",
    "#################     ############     ############                  ##################xxxxx##############     ###########~~~~#  #",
  ],

  spawn: { tx: 2, ty: 14 },

  cibles: [
    // Jonction 1 — au-dessus du premier vide : la cloison devient le pont.
    cible(19, 13, 'VLAN 40 TRUNK', 'le poste invite est isole'),
    // Jonction 2 — meme geste, plus rien en dessous.
    cible(37, 13, 'PORT 12 UP', 'chaque service a son couloir'),
    // Jonction 3 — apres le gouffre et le flux lateral.
    cible(109, 13, 'GW 10.0.40.1', 'le vpn ne sort que par le pare-feu'),
  ],

  acteurs: [
    acteur(9, 15, 'le wifi rame'),
    acteur(28, 15, 'on partage tout'),
    acteur(47, 15, "c'est ouvert partout"),
    acteur(81, 15, "j'ai besoin d'un acces"),
    acteur(117, 15, 'le prestataire attend'),
  ],

  init(ctx) {
    ctx.etape = 0;
  },

  pas(ctx) {
    const x = ctx.sonde.box.x / 16;
    // Le niveau n'annonce rien d'avance : il nomme ce qu'on vient de voir.
    if (ctx.etape === 0 && x > 12) {
      ctx.etape = 1;
      ctx.msg("Une jonction en l'air : Espace a nouveau, segmenter", 300);
    }
    if (ctx.etape === 1 && x > 44) {
      ctx.etape = 2;
      ctx.msg('Rien ne traverse en surface. Lire les journaux', 340);
    }
    if (ctx.etape === 2 && x > 74) {
      ctx.etape = 3;
      ctx.msg('Le flux lateral court au ras du sol', 260);
    }
    if (ctx.etape === 3 && x > 112) {
      ctx.etape = 4;
      ctx.msg('Une passerelle que seule la surface montre', 300);
    }
  },
};
