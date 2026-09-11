// QUARTIER 1 — MEDLINE — verbe TRADUIRE — « Le helpdesk »
//
// Quatre tickets d'utilisateurs, écrits comme les gens parlent. Pour chacun :
// on ouvre un terminal, on lance les bons tests, on trouve la cause, puis on
// l'explique en une phrase à quelqu'un dont ce n'est pas le métier. La bonne
// réponse n'est ni la plus technique ni la plus rassurante : c'est la vraie,
// dite simplement. C'est le jeu de référence : les autres en copient la forme.

import { creerCadre, creerTerminal, creerLateral, attendre } from './_contrat.js';

const TICKETS = [
  {
    de: 'Nadia, comptabilité',
    plainte: "Internet ne marche plus sur mon poste depuis ce matin. Les autres, ça marche.",
    poste: 'PC-COMPTA-04',
    sorties: {
      ipconfig: ['Carte Ethernet :', '   Adresse IPv4 . . . . : 169.254.31.7', '   Masque . . . . . . . : 255.255.0.0', '   Passerelle . . . . . : (aucune)', '   Bail DHCP  . . . . . : EXPIRE'],
      'ping 10.0.0.1': ['Envoi de 4 paquets vers 10.0.0.1', 'Delai d attente depasse x4', 'Perte : 100 %'],
      nslookup: ['Serveur DNS : injoignable (pas de passerelle)'],
      smart: ['SMART OK - aucune erreur'],
      journal: ['09:02 dhcp-client : DISCOVER envoye, aucune OFFER', '09:03 dhcp-client : bascule APIPA 169.254.31.7'],
      ecran: ['DP1 : signal OK  -  HDMI : aucun'],
    },
    indices: ['ipconfig', 'journal'],
    reponses: [
      { t: "Le bail DHCP a expiré et l'APIPA a pris le relais en 169.254, la passerelle est absente.", ok: false, why: "Exact, mais Nadia n'a rien compris. Une explication qu'on ne comprend pas ne rassure pas." },
      { t: "Le wifi de l'immeuble est en panne, il faut attendre que ça revienne.", ok: false, why: "Simple mais faux : les autres postes marchent, et celui-ci est en filaire." },
      { t: "Votre poste n'a pas reçu d'adresse du réseau ce matin. Je relance la demande, ça revient en une minute.", ok: true, why: "Vrai, court, et Nadia sait quoi attendre." },
    ],
  },
  {
    de: 'Marc, logistique',
    plainte: "Mon ordinateur est très lent depuis quelques jours. Il fait un bruit bizarre parfois.",
    poste: 'PC-LOGI-11',
    sorties: {
      ipconfig: ['Adresse IPv4 : 10.0.4.23  -  Bail DHCP : OK'],
      'ping 10.0.0.1': ['Reponse de 10.0.0.1 : temps < 1 ms x4'],
      nslookup: ['srv-fichiers -> 10.0.0.12'],
      smart: ['Modele : ST1000  -  Temperature : 41 C', '  5 Reallocated_Sector_Ct   : 148', '197 Current_Pending_Sector  : 12', '198 Offline_Uncorrectable   : 9', 'ETAT : PRE-FAIL'],
      journal: ['Erreurs E/S disque : 37 sur 24 h'],
      ecran: ['DP1 : signal OK'],
    },
    indices: ['smart'],
    reponses: [
      { t: "C'est sûrement la mise à jour de Windows, ça va se calmer.", ok: false, why: "Rassurant et faux. Le disque est en train de mourir." },
      { t: "Le disque commence à lâcher. On sauvegarde vos fichiers aujourd'hui et on le remplace demain.", ok: true, why: "Vrai, concret, avec une date. Marc sait ce qui se passe et ce qu'on fait." },
      { t: "SMART remonte 148 secteurs réalloués et 12 en attente, statut PRE-FAIL.", ok: false, why: "Exact. Marc a retenu « pré-fail » et rien d'autre." },
    ],
  },
  {
    de: 'Sophie, direction',
    plainte: "Je n'arrive plus à ouvrir le dossier partagé. Ça dit que le serveur est introuvable.",
    poste: 'PC-DIR-01',
    sorties: {
      ipconfig: ['Adresse IPv4 : 10.0.1.5  -  Bail DHCP : OK'],
      'ping 10.0.0.12': ['Reponse de 10.0.0.12 : temps < 1 ms x4'],
      nslookup: ['Serveur DNS : 10.0.0.2', '*** srv-fichiers : NXDOMAIN (nom inconnu)'],
      smart: ['SMART OK'],
      journal: ['10:14 dns : entree srv-fichiers absente de la zone'],
      ecran: ['DP1 : signal OK'],
    },
    indices: ['nslookup'],
    reponses: [
      { t: "Le serveur ne répond plus, il faut appeler le prestataire.", ok: false, why: "Faux : le serveur répond par son adresse. C'est son nom qui manque." },
      { t: "Le nom du serveur ne se traduit plus en adresse. En attendant que je corrige, ouvrez-le par son adresse : \\\\10.0.0.12.", ok: true, why: "Vrai, et Sophie repart avec une solution immédiate." },
      { t: "L'enregistrement A de srv-fichiers a disparu de la zone DNS, NXDOMAIN.", ok: false, why: "Exact, et parfaitement inutile pour Sophie." },
    ],
  },
  {
    de: 'Karim, accueil',
    plainte: "L'écran est tout noir mais la tour est allumée, il y a une lumière verte.",
    poste: 'PC-ACC-02',
    sorties: {
      ipconfig: ['Adresse IPv4 : 10.0.2.8  -  Bail DHCP : OK'],
      'ping 10.0.0.1': ['Reponse de 10.0.0.1 : temps < 1 ms x4'],
      nslookup: ['srv-fichiers -> 10.0.0.12'],
      smart: ['SMART OK'],
      journal: ['08:51 session ouverte, aucune erreur'],
      ecran: ['DP1 : aucun signal', 'HDMI : signal OK, aucun ecran branche'],
    },
    indices: ['ecran'],
    reponses: [
      { t: "La sortie DisplayPort ne délivre aucun signal, la HDMI est active sans périphérique.", ok: false, why: "Exact. Karim regarde ses pieds." },
      { t: "Le câble de l'écran est branché sur la mauvaise prise de la tour. Je le change de prise, c'est réglé.", ok: true, why: "Vrai, et Karim pourra le refaire seul la prochaine fois." },
      { t: "La carte graphique est morte, il faut changer le poste.", ok: false, why: "Faux, et cher." },
    ],
  },
];

const COMMANDES = ['aide', 'ipconfig', 'ping <adresse>', 'nslookup', 'smart', 'journal', 'ecran'];

export default {
  id: 'medline',
  ordre: 1,
  titre: 'Le helpdesk',
  employeur: 'MEDLINE',
  annees: '2018 - 2020',
  factKey: 'medline',
  verbe: 'TRADUIRE',
  accent: '#8FB4D6',
  description: "Quatre utilisateurs, quatre pannes racontées avec leurs mots. Trouver la cause au terminal, puis l'expliquer en une phrase que la personne comprend.",

  monter(conteneur, api) {
    const cadre = creerCadre(conteneur, {
      titre: 'Le helpdesk', employeur: 'MEDLINE', annees: '2018 - 2020', verbe: 'TRADUIRE',
      accent: api.accent,
      consigne: "Tape des commandes pour diagnostiquer, puis choisis l'explication à donner à l'utilisateur.",
    });
    const term = creerTerminal(cadre.corps, { invite: 'support@medline:~$' });
    const lat = creerLateral(cadre.corps);
    let i = 0, score = 0, vivant = true, carteChoix = null;

    cadre.bouton('Abandonner', () => api.abandonner());

    function ecrireLent(lignes, classe) {
      for (const l of lignes) term.ecrire(l, classe);
    }

    function ouvrirTicket() {
      const t = TICKETS[i];
      term.effacer();
      lat.vider();
      term.ecrire(`TICKET ${i + 1}/${TICKETS.length} — ${t.de} — poste ${t.poste}`, 'acc');
      term.ecrire(`« ${t.plainte} »`);
      term.ecrire('Diagnostique au terminal, puis choisis ta réponse à droite.', 'sys');
      term.vide();
      lat.carte('Le ticket', `<p><b>${t.de}</b> · ${t.poste}</p><p>${t.plainte}</p>`);
      lat.carte('Commandes', `<p>${COMMANDES.join(' · ')}</p>`);
      carteChoix = lat.carte('Ce que tu dis à ' + t.de.split(',')[0], '<div class="jx-choix"></div>');
      const zone = carteChoix.querySelector('.jx-choix');
      t.reponses.forEach((r, k) => {
        const b = document.createElement('button');
        b.textContent = r.t;
        b.dataset.k = k;
        b.addEventListener('click', () => repondre(k));
        zone.appendChild(b);
      });
      cadre.statut(`Ticket ${i + 1} sur ${TICKETS.length} · ${score} bien expliqué${score > 1 ? 's' : ''}`);
      term.invite(commande);
    }

    function commande(v) {
      const t = TICKETS[i];
      const mot = v.toLowerCase().trim();
      if (mot === 'aide') { ecrireLent(['Commandes : ' + COMMANDES.join(', ')], 'sys'); return; }
      const cle = Object.keys(t.sorties).find(k => k === mot || (k.startsWith('ping') && mot.startsWith('ping')) || (k === 'nslookup' && mot.startsWith('nslookup')));
      if (!cle) { term.ecrire(`commande inconnue : ${mot} (tape aide)`, 'ko'); return; }
      if (mot.startsWith('ping') && !mot.split(' ')[1]) { term.ecrire('ping : il manque l adresse (ex : ping 10.0.0.1)', 'ko'); return; }
      ecrireLent(t.sorties[cle], t.indices.includes(cle.split(' ')[0]) ? 'acc' : undefined);
      term.vide();
    }

    function repondre(k) {
      if (!vivant) return;
      const t = TICKETS[i];
      const r = t.reponses[k];
      const zone = carteChoix.querySelector('.jx-choix');
      [...zone.children].forEach((b, j) => { b.disabled = true; if (t.reponses[j].ok) b.classList.add('ok'); else if (j === k) b.classList.add('ko'); });
      if (r.ok) score++;
      term.ecrire((r.ok ? 'BIEN DIT — ' : 'À RETRAVAILLER — ') + r.why, r.ok ? 'ok' : 'ko');
      cadre.statut(`Ticket ${i + 1} sur ${TICKETS.length} · ${score} bien expliqué${score > 1 ? 's' : ''}`, r.ok ? 'ok' : 'ko');
      term.invite(null);
      const suite = document.createElement('button');
      suite.className = 'jx-btn fort';
      suite.style.marginTop = '8px';
      suite.textContent = i + 1 < TICKETS.length ? 'Ticket suivant' : 'Clôturer';
      suite.addEventListener('click', () => { i++; if (i < TICKETS.length) ouvrirTicket(); else terminer(); });
      carteChoix.appendChild(suite);
      suite.focus();
      carteChoix._suite = suite;
    }

    function terminer() {
      const total = TICKETS.length;
      const gagne = score >= 3;
      cadre.fin({
        titre: gagne ? 'Quartier validé' : 'Pas tout à fait',
        texte: gagne
          ? `${score} explications sur ${total} que l'utilisateur a comprises. Deux ans de support, c'est ça : la bonne cause, dite avec les mots de la personne en face.`
          : `${score} sur ${total}. La bonne réponse est rarement la plus technique. Rejoue : les tickets sont les mêmes, les mots comptent.`,
        bouton: gagne ? 'Prendre la clé' : 'Rejouer',
        action: () => gagne ? api.fini({ score, message: `${score} pannes expliquées sur ${total}, dans les mots des utilisateurs.` })
                            : (i = 0, score = 0, ouvrirTicket(), cadre.corps.querySelector('.jx-fin').remove()),
      });
    }

    ouvrirTicket();

    return {
      demonter() { vivant = false; conteneur.innerHTML = ''; },
      // joue la solution : les bons tests, puis la bonne phrase, pour chaque ticket
      async resoudre() {
        for (let n = 0; n < TICKETS.length; n++) {
          const t = TICKETS[i];
          for (const c of t.indices) term.executer(c === 'ping' ? 'ping 10.0.0.1' : c);
          await attendre(30);
          repondre(t.reponses.findIndex(r => r.ok));
          await attendre(30);
          carteChoix._suite.click();
          await attendre(30);
        }
        const fin = cadre.corps.querySelector('.jx-fin .jx-btn');
        fin && fin.click();
      },
    };
  },
};
