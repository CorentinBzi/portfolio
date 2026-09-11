// NIVEAU 1 — MEDLINE — verbe TRADUIRE
// Le niveau est encombré de texte machine infranchissable. Une impulsion
// dessus le recompose en phrase française, et la phrase devient du sol.
// C'est le niveau de référence : il enseigne marcher, sauter, l'impulsion,
// puis la TRACE, sans une ligne d'instruction.

import { cible, acteur } from './_contrat.js';

export default {
  id: 'medline',
  numero: 1,
  titre: "Ce qu'ils voulaient vraiment dire",
  employeur: 'MEDLINE',
  annees: '2018 - 2020',
  factKey: 'medline',
  verbe: 'TRADUIRE',
  accent: '#8FA6B8',
  targetSeconds: 55,
  indice: 'Flèches pour avancer, Espace pour sauter',

  map: [
      '#                                                                                              #',
      '#                                                                                              #',
      '#                                                                                              #',
      '#                                                                                              #',
      '#                                                                                              #',
      '#                                                                                              #',
      '#                                                                                              #',
      '#                                                                                              #',
      '#                                                                                              #',
      '#                                                                                              #',
      '#                                                                                              #',
      '#                                                                                           SSS#',
      '#                                                                                          ====#',
      '#                                                             :::                              #',
      '#                                                         :::                          ====    #',
      '#  |           ##            |                 |             ~     |            |              #',
      '#######################     #############     ###########         #####################        #'
  ],

  spawn: { tx: 2, ty: 14 },

  cibles: [
    // B — la premiere traduction, au-dessus d'un trou de cinq tuiles
    cible(24, 13, '0x0000007E', "le disque rend des erreurs"),
    // C — la deuxieme, plus haute : l'impulsion garde l'elan du saut
    cible(42, 12, 'DHCP LEASE EXPIRED', "le poste n'a plus d'adresse"),
    // D — juste avant le gouffre des journaux
    cible(70, 12, 'SMART 197', "le disque a des secteurs en attente"),
    // E — au pied de l'escalier
    cible(83, 13, 'ERR_NAME_NOT_RESOLVED', "le nom de domaine ne repond pas"),
  ],

  acteurs: [
    acteur(8, 15, "ca marche plus"),
    acteur(33, 15, "c'etait lent ce matin"),
    acteur(51, 15, "j'ai rien touche"),
    acteur(75, 15, "c'est urgent"),
  ],

  init(ctx) {
    ctx.etape = 0;
  },

  pas(ctx, input) {
    const x = ctx.sonde.box.x / 16;
    // Le niveau enseigne au fil de l'avancée, une phrase à la fois.
    if (ctx.etape === 0 && x > 12) { ctx.etape = 1; ctx.msg('Espace pour sauter', 200); }
    if (ctx.etape === 1 && x > 21) {
      ctx.etape = 2;
      ctx.msg("En l'air, Espace a nouveau : traduire", 300);
    }
    if (ctx.etape === 2 && x > 55) {
      ctx.etape = 3;
      ctx.msg('Maj maintenue : lire les journaux', 320);
    }
    if (ctx.etape === 3 && x > 75) {
      ctx.etape = 4;
      ctx.msg('Le local technique est en haut', 220);
    }
  },
};
