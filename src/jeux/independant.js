// QUARTIER 4 — INDÉPENDANT — verbe ATTESTER — « L'usurpation »
//
// Deux temps. (1) Huit courriels arrivent un par un dans le terminal, avec leurs
// vrais en-têtes : From, Return-Path, Received, Authentication-Results. Pour
// chacun, un verdict : légitime ou usurpé. Les pièges sont ceux du métier : un
// SPF qui passe mais pour un autre domaine, un DKIM valide signé par un tiers,
// un nom d'affichage qui imite une adresse. (2) Le tri à la main fait, on
// assemble la chaîne qui le remplace : cinq étapes à remettre dans l'ordre.
// C'est l'outil de supervision DMARC du CV, joué plutôt que lu.

import { creerCadre, creerTerminal, creerLateral, attendre } from './_contrat.js';

const DOMAINE = 'atelier-morel.fr';
const SEUIL = 7;

// Chaque courriel : en-têtes tels qu'un serveur de réception les écrit, le
// verdict attendu, et la ligne d'explication donnée après le clic.
const COURRIELS = [
  {
    objet: 'Devis n° 2024-118',
    entetes: [
      ['From', `"Atelier Morel" <contact@${DOMAINE}>`],
      ['Return-Path', `<contact@${DOMAINE}>`],
      ['Received', `from mail.${DOMAINE} (192.0.2.10)`],
    ],
    auth: [
      `spf=pass    smtp.mailfrom=${DOMAINE}`,
      `dkim=pass   header.d=${DOMAINE}  header.s=mail`,
      `dmarc=pass  header.from=${DOMAINE}  (spf aligné, dkim aligné)`,
    ],
    usurpe: false,
    why: "SPF et DKIM passent et sont alignés sur le domaine du From : c'est bien notre serveur.",
  },
  {
    objet: 'Mise à jour de vos coordonnées bancaires',
    entetes: [
      ['From', `"Atelier Morel" <contact@${DOMAINE}>`],
      ['Return-Path', '<bounce-88213@mail-blast.example>'],
      ['Received', 'from mx3.mail-blast.example (203.0.113.40)'],
    ],
    auth: [
      'spf=pass    smtp.mailfrom=mail-blast.example',
      'dkim=none',
      `dmarc=fail  header.from=${DOMAINE}  (spf non aligné, dkim absent)`,
    ],
    usurpe: true,
    why: "SPF passe, mais pour mail-blast.example, pas pour le domaine du From. Sans alignement, un pass ne vaut rien.",
  },
  {
    objet: 'URGENT : virement à effectuer avant 17h',
    entetes: [
      ['From', `"Direction Atelier Morel" <direction@${DOMAINE}>`],
      ['Return-Path', `<direction@${DOMAINE}>`],
      ['Received', 'from unknown (198.51.100.77)'],
    ],
    auth: [
      `spf=fail    smtp.mailfrom=${DOMAINE}  (198.51.100.77 non autorisée)`,
      `dkim=fail   header.d=${DOMAINE}  (signature invalide)`,
      `dmarc=fail  header.from=${DOMAINE}  (politique p=reject)`,
    ],
    usurpe: true,
    why: "L'adresse IP n'est pas dans notre SPF et la signature DKIM est cassée : usurpation directe, que p=reject renvoie.",
  },
  {
    objet: 'Facture F-2024-0917',
    entetes: [
      ['From', `"Atelier Morel - Facturation" <facturation@${DOMAINE}>`],
      ['Return-Path', '<b.7f2a@bounces.factuflow.example>'],
      ['Received', 'from out2.factuflow.example (203.0.113.115)'],
    ],
    auth: [
      'spf=pass    smtp.mailfrom=bounces.factuflow.example',
      `dkim=pass   header.d=${DOMAINE}  header.s=factu`,
      `dmarc=pass  header.from=${DOMAINE}  (dkim aligné)`,
    ],
    usurpe: false,
    why: "SPF n'est pas aligné (c'est le prestataire de facturation), mais DKIM est signé par notre domaine : un seul alignement suffit à DMARC.",
  },
  {
    objet: 'Nos nouveautés de septembre',
    entetes: [
      ['From', `"Atelier Morel" <newsletter@${DOMAINE}>`],
      ['Return-Path', '<l-4410@newsletter-pro.example>'],
      ['Received', 'from smtp7.newsletter-pro.example (203.0.113.201)'],
    ],
    auth: [
      'spf=pass    smtp.mailfrom=newsletter-pro.example',
      'dkim=pass   header.d=newsletter-pro.example',
      `dmarc=fail  header.from=${DOMAINE}  (aucun identifiant aligné)`,
    ],
    usurpe: true,
    why: "DKIM passe, mais la signature est celle de newsletter-pro.example. Une signature valide d'un tiers ne prouve rien sur notre domaine.",
  },
  {
    objet: 'Re: planning de la semaine',
    entetes: [
      ['From', `"Julie Morel" <julie@${DOMAINE}>`],
      ['Return-Path', `<julie@${DOMAINE}>`],
      ['Received', `from relais.site2.${DOMAINE} (192.0.2.58)`],
    ],
    auth: [
      `spf=softfail  smtp.mailfrom=${DOMAINE}  (192.0.2.58 hors SPF, ~all)`,
      `dkim=pass   header.d=${DOMAINE}  header.s=mail`,
      `dmarc=pass  header.from=${DOMAINE}  (dkim aligné)`,
    ],
    usurpe: false,
    why: "Le softfail vient du relais du second site, oublié dans le SPF. DKIM est aligné, DMARC passe : légitime, et un SPF à corriger.",
  },
  {
    objet: 'Relance facture impayée',
    entetes: [
      ['From', '"Atelier Morel - Comptabilité" <compta@atelier-more1.fr>'],
      ['Return-Path', '<compta@atelier-more1.fr>'],
      ['Received', 'from mail.atelier-more1.fr (198.51.100.23)'],
    ],
    auth: [
      'spf=pass    smtp.mailfrom=atelier-more1.fr',
      'dkim=pass   header.d=atelier-more1.fr',
      'dmarc=pass  header.from=atelier-more1.fr',
    ],
    usurpe: true,
    why: "Tout passe... pour atelier-more1.fr, avec un 1 à la place du l. Le nom d'affichage est le nôtre, le domaine non.",
  },
  {
    objet: 'Documents à signer',
    entetes: [
      ['From', `"julie@${DOMAINE}" <julie.morel.pro@webmail.example>`],
      ['Return-Path', '<julie.morel.pro@webmail.example>'],
      ['Received', 'from mail-out12.webmail.example (203.0.113.9)'],
    ],
    auth: [
      'spf=pass    smtp.mailfrom=webmail.example',
      'dkim=pass   header.d=webmail.example',
      'dmarc=pass  header.from=webmail.example',
    ],
    usurpe: true,
    why: "L'authentification est correcte pour webmail.example. Mais le nom d'affichage imite une adresse de notre domaine : hors de portée de DMARC, d'où une règle en plus.",
  },
];

// Les cinq étapes de la chaîne, et l'ordre qui a un sens.
const ETAPES = {
  collecte: { titre: 'Collecte des rapports DMARC', detail: 'lecture des rapports agrégés reçus dans la boîte RUA' },
  parsing:  { titre: 'Parsing des rapports', detail: 'XML → source, volume, résultat SPF, DKIM, alignement' },
  regles:   { titre: "Règles d'alignement", detail: 'qui a le droit d’envoyer au nom du domaine, et qui ne l’a pas' },
  resume:   { titre: 'Modèle de langage', detail: 'résumé des rapports en français, lisible sans être expert' },
  alerte:   { titre: 'Alerte automatique', detail: 'notification dès qu’une source usurpe le domaine' },
};
const ORDRE_INITIAL = ['alerte', 'parsing', 'resume', 'collecte', 'regles'];
// Contraintes : [avant, après, explication si violée]
const CONTRAINTES = [
  ['collecte', 'parsing', 'Rien à parser avant la collecte : les rapports ne sont pas encore là.'],
  ['parsing', 'regles', "Les règles d'alignement travaillent sur les champs extraits par le parsing."],
  ['regles', 'alerte', "Alerter sur quoi ? Les règles n'ont pas encore tranché."],
  ['regles', 'resume', 'Le modèle résume un verdict, il ne le prend pas : les règles d’abord.'],
];

const NOMBRE_USURPES = COURRIELS.filter(c => c.usurpe).length;

function trouverViolation(ordre) {
  return CONTRAINTES.find(([a, b]) => ordre.indexOf(a) > ordre.indexOf(b));
}

export default {
  id: 'independant',
  ordre: 4,
  titre: "L'usurpation",
  employeur: 'INDÉPENDANT',
  annees: '2023 - 2025',
  factKey: 'independant',
  verbe: 'ATTESTER',
  accent: '#FF9A5C',
  description: "Huit courriels au nom du domaine, avec leurs en-têtes d'authentification. Dire lesquels sont usurpés, puis assembler la chaîne qui le fera chaque nuit.",

  monter(conteneur, api) {
    const cadre = creerCadre(conteneur, {
      titre: "L'usurpation", employeur: 'INDÉPENDANT', annees: '2023 - 2025', verbe: 'ATTESTER',
      accent: api.accent,
      consigne: "Lis les en-têtes, tranche : légitime ou usurpé. Puis remets dans l'ordre la chaîne qui automatise le tri.",
    });
    const style = document.createElement('style');
    style.textContent = `
      .jx-independant-h{display:flex;gap:8px}
      .jx-independant-h .k{color:#7A8A96;flex:none;width:12ch}
      .jx-independant-h .v{color:#C8D3DA;overflow-wrap:anywhere}
      .jx-independant-verdict{display:flex;flex-direction:row;gap:8px}
      .jx-independant-verdict button{flex:1;text-align:center;font-weight:600;letter-spacing:.06em;text-transform:uppercase}
      .jx-independant-etape{display:flex;align-items:center;gap:8px;padding:7px 8px;margin-bottom:6px;
        border:1px solid #2B3843;border-radius:2px;background:#0E1318}
      .jx-independant-etape .n{flex:none;width:18px;color:var(--acc);font-weight:600}
      .jx-independant-etape .t{flex:1;min-width:0}
      .jx-independant-etape .t b{display:block;font-weight:600;font-size:12.5px}
      .jx-independant-etape .t small{display:block;color:#7A8A96;font-size:11px;line-height:1.35}
      .jx-independant-etape .m{flex:none;display:flex;flex-direction:column;gap:3px}
      .jx-independant-etape .m button{font:12px/1 "IBM Plex Mono",monospace;color:#C8D3DA;background:transparent;
        border:1px solid #3A4652;border-radius:2px;width:26px;height:22px;cursor:pointer;padding:0}
      .jx-independant-etape .m button:hover{border-color:var(--acc);color:var(--acc)}
      .jx-independant-etape .m button[disabled]{opacity:.25;cursor:default}
      .jx-independant-etape.ok{border-color:#6FCF8E}
      .jx-independant-etape.ko{border-color:#E8503A}
      .jx-independant-lancer{width:100%;margin-top:4px}
      @media (max-width:760px){.jx-independant-p2 .jx-lat{max-height:72%}}`;
    conteneur.appendChild(style);

    const term = creerTerminal(cadre.corps, { invite: 'dmarc@' + DOMAINE + ':~$' });
    // Pas de commande à taper ici : le terminal n'est qu'un flux de lecture.
    term.el.querySelector('.jx-term-in').style.display = 'none';
    const lat = creerLateral(cadre.corps);
    let i = 0, score = 0, vivant = true, phase = 1;
    let carteVerdict = null, carteChaine = null, ordre = ORDRE_INITIAL;

    cadre.bouton('Abandonner', () => api.abandonner());

    // Une ligne vide qui garde sa hauteur (une div vide s'écrase).
    function espace() { term.ecrire(' '); }

    // Une ligne d'en-tête : clé grisée, valeur en clair.
    function ligneEntete(cle, valeur, classeValeur) {
      const l = term.ecrire('');
      l.classList.add('jx-independant-h');
      const k = document.createElement('span'); k.className = 'k'; k.textContent = cle + ':';
      const v = document.createElement('span'); v.className = 'v' + (classeValeur ? ' ' + classeValeur : ''); v.textContent = valeur;
      l.append(k, v);
      return l;
    }

    function statutFlux(etat) {
      cadre.statut(`Courriel ${Math.min(i + 1, COURRIELS.length)} sur ${COURRIELS.length} · ${score} verdict${score > 1 ? 's' : ''} juste${score > 1 ? 's' : ''}`, etat);
    }

    // ----------------------------------------------------------------- phase 1
    function ouvrirCourriel() {
      const c = COURRIELS[i];
      term.effacer();
      lat.vider();
      term.ecrire(`COURRIEL ${i + 1}/${COURRIELS.length} — reçu par mx.${DOMAINE}`, 'acc');
      espace();
      for (const [k, v] of c.entetes) ligneEntete(k, v);
      ligneEntete('Subject', c.objet);
      espace();
      term.ecrire(`Authentication-Results: mx.${DOMAINE};`, 'sys');
      for (const a of c.auth) term.ecrire('    ' + a);
      espace();
      term.ecrire('Verdict à droite : légitime ou usurpé.', 'sys');

      lat.carte('Le domaine surveillé', `<p><b>${DOMAINE}</b> · DMARC p=reject</p>
        <p>Un courriel est légitime si SPF <i>ou</i> DKIM passe <b>et</b> s'aligne sur le domaine du From. Le nom d'affichage ne prouve rien.</p>
        <div class="jx-jauge" aria-label="progression"><i style="width:${Math.round(i / COURRIELS.length * 100)}%"></i></div>`);
      carteVerdict = lat.carte(`Courriel ${i + 1} : ton verdict`, `<div class="jx-choix jx-independant-verdict">
          <button data-v="legitime">Légitime</button><button data-v="usurpe">Usurpé</button></div>`);
      carteVerdict.querySelectorAll('button').forEach(b => b.addEventListener('click', () => trancher(b.dataset.v === 'usurpe')));
      statutFlux();
    }

    function trancher(ditUsurpe) {
      if (!vivant || phase !== 1 || carteVerdict._suite) return;
      const c = COURRIELS[i];
      const juste = ditUsurpe === c.usurpe;
      carteVerdict.querySelectorAll('button').forEach(b => {
        b.disabled = true;
        const estUsurpe = b.dataset.v === 'usurpe';
        if (estUsurpe === c.usurpe) b.classList.add('ok');
        else if (estUsurpe === ditUsurpe) b.classList.add('ko');
      });
      if (juste) score++;
      term.ecrire((juste ? 'JUSTE — ' : 'RATÉ — ') + (c.usurpe ? 'usurpé. ' : 'légitime. ') + c.why, juste ? 'ok' : 'ko');
      statutFlux(juste ? 'ok' : 'ko');
      const suite = document.createElement('button');
      suite.className = 'jx-btn fort';
      suite.style.marginTop = '8px';
      suite.textContent = i + 1 < COURRIELS.length ? 'Courriel suivant' : 'Passer à la chaîne';
      suite.addEventListener('click', () => { i++; if (i < COURRIELS.length) ouvrirCourriel(); else finPhase1(); });
      carteVerdict.appendChild(suite);
      suite.focus();
      carteVerdict._suite = suite;
    }

    function finPhase1() {
      if (score >= SEUIL) { ouvrirChaine(); return; }
      cadre.fin({
        titre: 'Pas tout à fait',
        texte: `${score} verdicts justes sur ${COURRIELS.length} : il en faut ${SEUIL}. Un outil qui se trompe autant, personne ne lui confie les alertes. Rejoue : les courriels sont les mêmes, l'alignement fait tout.`,
        bouton: 'Rejouer',
        action: () => { i = 0; score = 0; cadre.corps.querySelector('.jx-fin').remove(); ouvrirCourriel(); },
      });
    }

    // ----------------------------------------------------------------- phase 2
    function ouvrirChaine() {
      phase = 2;
      cadre.racine.classList.add('jx-independant-p2');
      term.effacer();
      lat.vider();
      term.ecrire(`TRI MANUEL TERMINÉ — ${score}/${COURRIELS.length} verdicts justes.`, 'acc');
      term.ecrire('Huit courriels à la main, ça va. Huit cents par nuit, non.', 'sys');
      term.ecrire("Remets les cinq étapes dans l'ordre, puis lance la chaîne.", 'sys');
      espace();
      cadre.statut('Chaîne à assembler · 5 étapes');
      carteChaine = lat.carte('La chaîne qui remplace le tri', '<div class="etapes"></div>');
      const lancer = document.createElement('button');
      lancer.className = 'jx-btn fort jx-independant-lancer';
      lancer.textContent = 'Lancer la chaîne';
      lancer.addEventListener('click', lancerChaine);
      carteChaine.appendChild(lancer);
      carteChaine._lancer = lancer;
      dessinerChaine();
    }

    function dessinerChaine(classe) {
      const zone = carteChaine.querySelector('.etapes');
      zone.innerHTML = '';
      ordre.forEach((cle, k) => {
        const e = ETAPES[cle];
        const row = document.createElement('div');
        row.className = 'jx-independant-etape' + (classe ? ' ' + classe : '');
        row.dataset.cle = cle;
        row.innerHTML = `<span class="n">${k + 1}</span><span class="t"><b></b><small></small></span><span class="m"></span>`;
        row.querySelector('b').textContent = e.titre;
        row.querySelector('small').textContent = e.detail;
        const m = row.querySelector('.m');
        const haut = document.createElement('button'); haut.textContent = '▲'; haut.setAttribute('aria-label', 'monter ' + e.titre); haut.disabled = k === 0;
        const bas = document.createElement('button'); bas.textContent = '▼'; bas.setAttribute('aria-label', 'descendre ' + e.titre); bas.disabled = k === ordre.length - 1;
        haut.addEventListener('click', () => deplacer(k, -1));
        bas.addEventListener('click', () => deplacer(k, 1));
        m.append(haut, bas);
        zone.appendChild(row);
      });
    }

    function deplacer(k, delta) {
      if (!vivant || phase !== 2) return;
      const j = k + delta;
      if (j < 0 || j >= ordre.length) return;
      const suivant = ordre.slice();
      [suivant[k], suivant[j]] = [suivant[j], suivant[k]];
      ordre = suivant;
      dessinerChaine();
    }

    function lancerChaine() {
      if (!vivant || phase !== 2) return;
      const violation = trouverViolation(ordre);
      if (violation) {
        dessinerChaine('ko');
        term.ecrire('ÉCHEC — ' + violation[2], 'ko');
        cadre.statut('Ordre invalide : corrige et relance', 'ko');
        return;
      }
      phase = 3;
      dessinerChaine('ok');
      carteChaine._lancer.disabled = true;
      cadre.statut('Chaîne en cours', 'ok');
      const sorties = {
        collecte: `collecte : ${COURRIELS.length} enregistrements reçus pour ${DOMAINE}`,
        parsing: `parsing  : ${COURRIELS.length} lignes → ip, from, spf, dkim, alignement`,
        regles: `règles   : ${NOMBRE_USURPES} non alignés, ${COURRIELS.length - NOMBRE_USURPES} légitimes (toi : ${score}/${COURRIELS.length})`,
        resume: `résumé   : « ${NOMBRE_USURPES} messages usurpent ${DOMAINE} depuis 4 sources ; un relais interne manque au SPF. »`,
        alerte: `alerte   : envoyée — ${NOMBRE_USURPES} usurpations, 1 SPF à corriger`,
      };
      ordre.forEach((cle, k) => term.ecrire(`[${k + 1}/5] ` + sorties[cle], cle === 'alerte' ? 'acc' : undefined));
      term.ecrire('Chaîne terminée sans intervention.', 'ok');
      terminer();
    }

    function terminer() {
      cadre.fin({
        titre: 'Quartier validé',
        texte: `${score} verdicts sur ${COURRIELS.length}, et une chaîne qui tourne seule. Deux ans à construire l'outil qui remplace le tri à la main : lire les rapports, appliquer les règles d'alignement, résumer en français, alerter.`,
        bouton: 'Prendre la clé',
        action: () => api.fini({ score, message: `${score} verdicts justes sur ${COURRIELS.length}, chaîne DMARC assemblée.` }),
      });
    }

    ouvrirCourriel();

    return {
      demonter() { vivant = false; conteneur.innerHTML = ''; },
      // joue la solution : le bon verdict pour chaque courriel, puis la chaîne remise dans l'ordre
      async resoudre() {
        for (let n = 0; n < COURRIELS.length; n++) {
          const c = COURRIELS[i];
          carteVerdict.querySelector(`[data-v="${c.usurpe ? 'usurpe' : 'legitime'}"]`).click();
          await attendre(20);
          carteVerdict._suite.click();
          await attendre(20);
        }
        const cible = ['collecte', 'parsing', 'regles', 'resume', 'alerte'];
        for (let k = 0; k < cible.length; k++) {
          while (ordre[k] !== cible[k]) {
            const idx = ordre.indexOf(cible[k]);
            carteChaine.querySelectorAll('.jx-independant-etape')[idx].querySelector('.m button').click();
            await attendre(10);
          }
        }
        carteChaine._lancer.click();
        await attendre(30);
        const fin = cadre.corps.querySelector('.jx-fin .jx-btn');
        fin && fin.click();
      },
    };
  },
};
