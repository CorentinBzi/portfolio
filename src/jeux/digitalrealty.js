// QUARTIER 5 — DIGITAL REALTY — verbe COORDONNER — « La supervision »
//
// Une salle de supervision, cinq écrans, un par data center. Quatre incidents
// tombent, chacun avec son engagement de délai. Pour chacun, trois leviers :
// y aller soi-même (10 s, une seule place à la fois), déléguer au prestataire
// (20 s, il exécute la consigne mot pour mot), ou ne rien faire. Un des quatre
// est un faux positif : ses journaux le disent, à condition de les lire.
// Gagné si les trois vrais incidents sont tenus dans leur délai et le faux
// positif classé sans suite.
//
// Le temps se compte en pas de simulation (1 pas = 100 ms en jeu). resoudre()
// coupe l'horloge réelle et fait avancer les pas lui-même.

import { creerCadre, creerTerminal, creerLateral, attendre } from './_contrat.js';

const PAS_MS = 100;            // durée réelle d'un pas
const PAS_PAR_S = 10;
const DUREE_PARTIE = 90 * PAS_PAR_S;
const DUREE_DEPLACEMENT = 10 * PAS_PAR_S;
const DUREE_DELEGATION = 20 * PAS_PAR_S;
const PAUSE_FIN = 15;          // pas avant l'écran de fin, une fois tout clos
const HEURE_BASE = 14 * 3600;  // 14:00:00 à T+0

const MALUS_ROMPU = 30, MALUS_FAUX_POSITIF = 15, MALUS_CONSIGNE = 10;

const SITES = [
  { code: 'SITE 1', lecteurs: 18, cameras: 42 },
  { code: 'SITE 2', lecteurs: 22, cameras: 58 },
  { code: 'SITE 3', lecteurs: 16, cameras: 37 },
  { code: 'SITE 4', lecteurs: 24, cameras: 61 },
  { code: 'SITE 5', lecteurs: 20, cameras: 49 },
];

// Journaux : [décalage en secondes par rapport à l'arrivée, source, texte].
// `cle` : l'indice de la ligne qui décide.
const INCIDENTS = [
  {
    site: 1, prio: 'P2', delai: 30, arrivee: 3, vrai: true,
    titre: 'Lecteur de badge hors ligne', tuile: 'lecteur R-07 hors ligne', compte: 'lecteurs 21/22',
    journaux: [
      [0, 'acs', 'lecteur R-07 (sas livraisons) : heartbeat perdu'],
      [0, 'net', 'contrôleur C-2 : lien DOWN sur le port 12'],
      [2, 'acs', 'porte sas livraisons : verrouillée par défaut (fail-secure)'],
      [4, 'acs', '3 badges présentés, 3 refus'],
    ],
    cle: 1,
    consignes: [
      { t: 'Passer la porte du sas en ouverture libre le temps du dépannage.', ok: false,
        effet: 'Sas livraisons ouvert sans contrôle : écart de conformité consigné. Lecteur toujours hors ligne.' },
      { t: 'Remonter le port 12 du contrôleur C-2, puis confirmer le heartbeat de R-07.', ok: true,
        effet: 'Port 12 remonté, heartbeat R-07 rétabli, badges acceptés.' },
      { t: 'Remplacer le lecteur R-07 par un neuf du stock.', ok: false,
        effet: 'Lecteur remplacé. Toujours hors ligne : le port 12 du contrôleur est resté DOWN.' },
    ],
    surPlace: 'Port 12 remonté sur C-2, lecteur R-07 de retour, badges acceptés.',
  },
  {
    site: 3, prio: 'P3', delai: 60, arrivee: 8, vrai: true,
    titre: 'Caméra sans signal', tuile: 'CAM-31 sans signal', compte: 'caméras 60/61',
    journaux: [
      [0, 'vms', 'caméra CAM-31 (couloir salle B) : NO SIGNAL'],
      [0, 'net', 'switch SW-B port 9 : défaut PoE, alimentation coupée'],
      [1, 'vms', 'enregistrement CAM-31 interrompu, 60 autres caméras nominales'],
    ],
    cle: 1,
    consignes: [
      { t: "Redémarrer l'enregistreur vidéo du site.", ok: false,
        effet: 'Enregistreur redémarré : 61 caméras coupées 4 min. CAM-31 toujours sans signal, le port PoE est resté en défaut.' },
      { t: "Réarmer le PoE du port 9 sur SW-B, puis vérifier le retour d'image de CAM-31.", ok: true,
        effet: 'PoE réarmé, CAM-31 de retour, enregistrement repris.' },
      { t: 'Déclarer la caméra en panne et planifier son remplacement à la prochaine visite.', ok: false,
        effet: "Remplacement planifié la semaine prochaine. Couloir salle B sans vidéo d'ici là." },
    ],
    surPlace: 'PoE réarmé sur SW-B, CAM-31 de retour, enregistrement repris.',
  },
  {
    site: 0, prio: 'P3', delai: 60, arrivee: 16, vrai: false,
    titre: 'Détection de mouvement répétée, zone 7', tuile: 'mouvement zone 7', compte: 'lecteurs 18/18',
    journaux: [
      [0, 'ids', 'zone 7 (local onduleurs) : mouvement, 4e détection en 6 min'],
      [-330, 'acs', 'badge prestataire ELEC-2 accepté en zone 7 — ordre de travail OT-2291, maintenance onduleurs 14:00-16:00'],
      [1, 'vms', 'CAM-07 zone 7 : une personne, gilet prestataire, badge visible'],
    ],
    cle: 1,
    consignes: [
      { t: 'Faire évacuer la zone 7 et verrouiller le local.', ok: false,
        effet: 'ELEC-2 sorti du local : maintenance onduleurs interrompue, OT-2291 à replanifier.' },
      { t: "Vérifier l'identité de la personne en zone 7.", ok: false,
        effet: 'Identité vérifiée : ELEC-2, OT-2291, déjà accepté par le badge. Déplacement inutile.' },
      { t: 'Désactiver le capteur de la zone 7.', ok: false,
        effet: 'Capteur désactivé : zone 7 sans détection, écart de conformité consigné.' },
    ],
    surPlace: 'Sur place : ELEC-2, badgé, OT-2291 en cours. Déplacement pour rien.',
    sansSuite: 'Mouvement expliqué : prestataire badgé sur ordre de travail. Classé sans suite.',
  },
  {
    site: 2, prio: 'P1', delai: 15, arrivee: 20, vrai: true,
    titre: 'Porte forcée', tuile: 'porte P-14 forcée', compte: 'alarme intrusion',
    journaux: [
      [0, 'acs', 'porte P-14 (salle serveurs C) : OUVERTE sans badge ni bouton de sortie'],
      [0, 'acs', 'P-14 : contact de porte forcé, alarme intrusion'],
      [1, 'vms', 'CAM-19 : porte entrebâillée, personne visible, caisse au sol'],
    ],
    cle: 0,
    consignes: [
      { t: "Couper l'alarme intrusion pour arrêter les notifications.", ok: false,
        effet: 'Alarme coupée. Porte toujours ouverte, personne toujours dans la salle.' },
      { t: "Constater sur place, sécuriser P-14 et consigner l'état de la salle.", ok: true,
        effet: 'Prestataire sur P-14 : porte sécurisée, constat consigné.' },
      { t: 'Remettre la porte en mode normal depuis le logiciel.', ok: false,
        effet: 'Commande envoyée. Le contact est forcé physiquement : la porte reste ouverte.' },
    ],
    surPlace: 'Sur place à P-14 : porte refermée, salle C sécurisée, constat consigné.',
  },
];

const STYLE = `
  .dr-main{flex:1;min-width:0;min-height:0;display:flex;flex-direction:column;border-right:1px solid #1F2832}
  .dr-mur{flex:none;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;padding:12px 12px 10px}
  .dr-ecran{position:relative;overflow:hidden;min-height:84px;padding:8px 10px;border:1px solid #2B3843;border-radius:2px;
      background:linear-gradient(180deg,#0C1116,#090C10);display:flex;flex-direction:column;gap:3px;
      transition:border-color .25s,box-shadow .25s}
  .dr-ecran::after{content:"";position:absolute;inset:0;pointer-events:none;
      background:repeating-linear-gradient(0deg,rgba(255,255,255,.025) 0 1px,transparent 1px 3px)}
  .dr-ligne{display:flex;align-items:center;gap:7px}
  .dr-led{width:6px;height:6px;border-radius:50%;background:#6FCF8E;box-shadow:0 0 6px #6FCF8E;flex:none}
  .dr-ecran.alerte .dr-led{background:var(--acc);box-shadow:0 0 6px var(--acc)}
  .dr-ecran.p1 .dr-led{background:#E8503A;box-shadow:0 0 6px #E8503A}
  .dr-code{font:700 11px/1 "Archivo",system-ui,sans-serif;letter-spacing:.12em;color:#C8D3DA}
  .dr-sp{flex:1}
  .dr-prio{font-size:10px;letter-spacing:.1em;color:var(--acc)}
  .dr-ecran.p1 .dr-prio{color:#E8503A}
  .dr-etat{font-size:12px;color:#7A8A96;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .dr-ecran.alerte .dr-etat{color:#C8D3DA}
  .dr-compte{font-size:10.5px;color:#4E5A66;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .dr-ecran.alerte{border-color:var(--acc)}
  .dr-ecran.p1{border-color:#E8503A;box-shadow:0 0 0 1px rgba(232,80,58,.25),0 0 18px rgba(232,80,58,.18)}
  .dr-ecran.ici{outline:1px dashed #6FCF8E;outline-offset:-4px}
  .dr-ecran.ici .dr-compte{color:#6FCF8E}
  .dr-poste{border-color:#3A4652;background:#0B0E11}
  .dr-poste .dr-horloge{font-size:11px;color:var(--acc);letter-spacing:.06em}
  .dr-inc{position:relative}
  .dr-inc h3 span{float:right;font-weight:400;letter-spacing:0;text-transform:none;color:#7A8A96}
  .dr-inc.p1 h3,.dr-inc.p1 h3 span{color:#E8503A}
  .dr-inc.p1{border-left-color:#E8503A}
  .dr-inc.clos{opacity:.55}
  .dr-inc.clos.ok{opacity:.8;border-left-color:#6FCF8E}
  .dr-inc.clos.ko{opacity:.8;border-left-color:#E8503A}
  .dr-inc .jx-jauge{margin:6px 0 8px}
  .dr-inc.p1 .jx-jauge i{background:#E8503A}
  .dr-acts{display:flex;flex-wrap:wrap;gap:5px}
  .dr-acts button{font:11px/1 "IBM Plex Mono",monospace;letter-spacing:.04em;color:#C8D3DA;background:#0E1318;
      border:1px solid #2B3843;border-radius:2px;padding:7px 9px;cursor:pointer}
  .dr-acts button:hover{border-color:var(--acc);color:var(--acc)}
  .dr-acts button[disabled]{opacity:.35;cursor:default;color:#C8D3DA;border-color:#2B3843}
  .dr-acts button.actif{border-color:var(--acc);color:var(--acc)}
  .dr-acts button:focus-visible{outline:2px solid #7FA3FF;outline-offset:2px}
  .dr-consignes{display:none;margin-top:8px}
  .dr-consignes.ouvert{display:flex}
  .dr-consignes .dr-titre{font-size:11px;color:#7A8A96;margin:0 0 2px}
  .dr-issue{margin:8px 0 0;font-size:12px;color:#7A8A96}
  .dr-issue:empty{display:none}
  .dr-issue.ok{color:#6FCF8E}.dr-issue.ko{color:#E8503A}
  .dr-regles p{font-size:11.5px;color:#7A8A96}
  .dr-regles b{color:#C8D3DA;font-weight:600}
  @media (prefers-reduced-motion:no-preference){
    .dr-ecran.p1{animation:dr-pulse 1.2s ease-in-out infinite alternate}
    @keyframes dr-pulse{to{box-shadow:0 0 0 1px rgba(232,80,58,.5),0 0 26px rgba(232,80,58,.35)}}
  }
  @media (max-width:760px){
    .dr-main{border-right:0}
    .dr-mur{gap:6px;padding:8px}
    .dr-ecran{min-height:64px;padding:6px 8px}
    .dr-compte{display:none}
  }`;

function horodater(tick) {
  const s = HEURE_BASE + Math.max(0, Math.round(tick / PAS_PAR_S));
  const p = n => String(n).padStart(2, '0');
  return `${p(Math.floor(s / 3600))}:${p(Math.floor(s / 60) % 60)}:${p(s % 60)}`;
}

export default {
  id: 'digitalrealty',
  ordre: 5,
  titre: 'La supervision',
  employeur: 'DIGITAL REALTY',
  annees: '2025 → aujourd’hui',
  factKey: 'digitalrealty',
  verbe: 'COORDONNER',
  accent: '#5AA9E6',
  description: "Cinq data centers, quatre incidents, des délais contractuels. Lire les journaux, puis y aller, déléguer avec une consigne exécutable, ou savoir ne rien faire.",

  monter(conteneur, api) {
    const cadre = creerCadre(conteneur, {
      titre: 'La supervision', employeur: 'DIGITAL REALTY', annees: '2025 → aujourd’hui', verbe: 'COORDONNER',
      accent: api.accent,
      consigne: "Quatre incidents vont tomber. Pour chacun : lire les journaux, puis y aller, déléguer, ou ne rien faire. Chaque priorité a son délai.",
    });
    const style = document.createElement('style');
    style.textContent = STYLE;
    cadre.racine.appendChild(style);

    const main = document.createElement('div');
    main.className = 'dr-main';
    cadre.corps.appendChild(main);
    const mur = document.createElement('div');
    mur.className = 'dr-mur';
    main.appendChild(mur);
    const term = creerTerminal(main, { invite: '>' });
    term.el.querySelector('.jx-term-in').style.display = 'none'; // pas de saisie ici : le journal se lit
    const lat = creerLateral(cadre.corps);

    cadre.bouton('Abandonner', () => api.abandonner());

    // ------------------------------------------------------------- état
    let tick = 0, horloge = null, vivant = true, termine = false, enPause = false, finTick = 0;
    let joueur = { site: null, jusqua: 0 };
    let incs = [];
    const tuiles = [];

    // ------------------------------------------------------------- mur
    SITES.forEach((s, k) => {
      const t = document.createElement('div');
      t.className = 'dr-ecran';
      t.innerHTML = `<div class="dr-ligne"><span class="dr-led"></span><span class="dr-code">${s.code}</span><span class="dr-sp"></span><span class="dr-prio"></span></div>
        <div class="dr-etat">nominal</div><div class="dr-compte">badges ${s.lecteurs} · caméras ${s.cameras}</div>`;
      mur.appendChild(t);
      tuiles[k] = { el: t, prio: t.querySelector('.dr-prio'), etat: t.querySelector('.dr-etat'), compte: t.querySelector('.dr-compte'),
        nominal: `badges ${s.lecteurs} · caméras ${s.cameras}` };
    });
    const poste = document.createElement('div');
    poste.className = 'dr-ecran dr-poste';
    poste.innerHTML = `<div class="dr-ligne"><span class="dr-code">POSTE</span><span class="dr-sp"></span><span class="dr-horloge">14:00:00</span></div>
      <div class="dr-etat">vous : libre</div><div class="dr-compte">conformité 100 %</div>`;
    mur.appendChild(poste);
    const posteHorloge = poste.querySelector('.dr-horloge');
    const posteEtat = poste.querySelector('.dr-etat');
    const posteConf = poste.querySelector('.dr-compte');

    // ------------------------------------------------------------- utilitaires
    const secondes = t => Math.max(0, Math.ceil(t / PAS_PAR_S));
    const ligne = (txt, classe) => term.ecrire(`${horodater(tick)}  ${txt}`, classe);

    function conformite() {
      let c = 100;
      for (const i of incs) {
        if (i.etat === 'rompu') c -= MALUS_ROMPU;
        if (!i.vrai && (i.deplace || i.delegue)) c -= MALUS_FAUX_POSITIF;
        c -= MALUS_CONSIGNE * i.mauvaisesConsignes;
      }
      return Math.max(0, c);
    }

    function majTuile(i) {
      const t = tuiles[i.site];
      const ouvert = !i.etat;
      t.el.classList.toggle('alerte', ouvert);
      t.el.classList.toggle('p1', ouvert && i.prio === 'P1');
      t.prio.textContent = ouvert ? i.prio : '';
      t.etat.textContent = ouvert ? i.tuile : (i.etat === 'rompu' ? 'engagement rompu' : 'nominal');
      t.compte.textContent = ouvert ? i.compte : t.nominal;
    }

    function majPoste() {
      posteHorloge.textContent = horodater(tick);
      const occupe = joueur.site !== null && tick < joueur.jusqua;
      posteEtat.textContent = occupe ? `vous : ${SITES[joueur.site].code}, ${secondes(joueur.jusqua - tick)} s` : 'vous : libre';
      posteConf.textContent = `conformité ${conformite()} %`;
      tuiles.forEach((t, k) => t.el.classList.toggle('ici', occupe && joueur.site === k));
    }

    function majStatut() {
      const ouverts = incs.filter(i => !i.etat).length;
      cadre.statut(`T+${secondes(tick)} s · ${ouverts} incident${ouverts > 1 ? 's' : ''} ouvert${ouverts > 1 ? 's' : ''} · conformité ${conformite()} %`);
    }

    function majJauge(i) {
      if (!i.el || i.etat) return;
      const reste = i.echeance - tick;
      i.jauge.style.width = `${Math.max(0, 100 * reste / (i.delai * PAS_PAR_S))}%`;
      i.reste.textContent = `${secondes(reste)} s`;
    }

    function boutons(i, actifs) {
      for (const [k, b] of Object.entries(i.btn)) b.disabled = !actifs.includes(k);
      if (actifs.includes('aller') && joueur.site !== null && tick < joueur.jusqua) {
        i.btn.aller.disabled = true;
        i.btn.aller.title = `Vous êtes sur ${SITES[joueur.site].code} encore ${secondes(joueur.jusqua - tick)} s.`;
      } else i.btn.aller.title = '';
    }

    function rafraichirAller() {
      for (const i of incs) if (!i.etat && !i.action) boutons(i, ['journaux', 'aller', 'deleguer', 'rien']);
    }

    // ------------------------------------------------------------- incidents
    function apparaitre(def) {
      const i = { ...def, etat: null, action: null, finAction: 0, echeance: tick + def.delai * PAS_PAR_S,
        deplace: false, delegue: false, mauvaisesConsignes: 0, btn: {} };
      incs = [...incs, i];
      const c = document.createElement('div');
      c.className = `jx-carte dr-inc ${i.prio.toLowerCase()}`;
      c.innerHTML = `<h3>${i.prio} · ${SITES[i.site].code} <span class="dr-reste">${i.delai} s</span></h3>
        <p><b>${i.titre}</b></p><div class="jx-jauge"><i style="width:100%"></i></div>
        <div class="dr-acts"></div>
        <div class="dr-consignes jx-choix"><p class="dr-titre">Consigne au prestataire (il fera exactement ça) :</p></div>
        <p class="dr-issue"></p>`;
      i.el = c; i.jauge = c.querySelector('.jx-jauge i'); i.reste = c.querySelector('.dr-reste');
      i.issue = c.querySelector('.dr-issue'); i.zoneConsignes = c.querySelector('.dr-consignes');
      const acts = c.querySelector('.dr-acts');
      const bouton = (cle, label, fn) => {
        const b = document.createElement('button');
        b.textContent = label;
        b.addEventListener('click', () => { if (vivant && !termine) fn(); });
        acts.appendChild(b);
        i.btn[cle] = b;
      };
      bouton('journaux', 'Lire les journaux', () => lireJournaux(i));
      bouton('aller', 'Y aller · 10 s', () => yAller(i));
      bouton('deleguer', 'Déléguer · 20 s', () => ouvrirConsignes(i));
      bouton('rien', 'Ne rien faire', () => neRienFaire(i));
      i.consignes.forEach((cs, k) => {
        const b = document.createElement('button');
        b.textContent = cs.t;
        b.addEventListener('click', () => { if (vivant && !termine) deleguer(i, k); });
        i.zoneConsignes.appendChild(b);
      });
      lat.el.insertBefore(c, lat.el.firstChild);
      boutons(i, ['journaux', 'aller', 'deleguer', 'rien']);
      majTuile(i);
      ligne(`${SITES[i.site].code}  ${i.prio}  ${i.titre} — engagement ${i.delai} s`, i.prio === 'P1' ? 'ko' : 'acc');
    }

    function lireJournaux(i) {
      term.vide();
      term.ecrire(`— journaux ${SITES[i.site].code} · ${i.titre}`, 'sys');
      const t0 = i.echeance - i.delai * PAS_PAR_S;
      i.journaux.forEach(([dt, src, txt], k) => term.ecrire(`${horodater(t0 + dt * PAS_PAR_S)}  ${src.padEnd(4)} ${txt}`, k === i.cle ? 'acc' : undefined));
      i.btn.journaux.classList.add('actif');
    }

    function yAller(i) {
      if (i.etat || i.action || (joueur.site !== null && tick < joueur.jusqua)) return;
      fermerConsignes();
      i.action = 'deplacement'; i.finAction = tick + DUREE_DEPLACEMENT; i.deplace = true;
      joueur = { site: i.site, jusqua: i.finAction };
      i.issue.className = 'dr-issue'; i.issue.textContent = `Vous partez sur ${SITES[i.site].code}. Arrivée dans 10 s.`;
      i.btn.aller.classList.add('actif');
      boutons(i, ['journaux']);
      rafraichirAller();
      ligne(`vous → ${SITES[i.site].code} (${i.titre})`, 'cmd');
    }

    function ouvrirConsignes(i) {
      if (i.etat || i.action) return;
      const etaitOuvert = i.zoneConsignes.classList.contains('ouvert');
      fermerConsignes();
      if (etaitOuvert) return;
      i.zoneConsignes.classList.add('ouvert');
      i.btn.deleguer.classList.add('actif');
      enPause = true;
      cadre.statut('Temps suspendu : choisis la consigne.');
    }

    // Referme tout panneau de consignes ouvert (un seul à la fois) et relance le temps.
    function fermerConsignes() {
      for (const i of incs) { i.zoneConsignes.classList.remove('ouvert'); i.btn.deleguer.classList.remove('actif'); }
      if (enPause) { enPause = false; majStatut(); }
    }

    function deleguer(i, k) {
      if (i.etat || i.action) return;
      fermerConsignes();
      i.action = 'delegation'; i.finAction = tick + DUREE_DELEGATION; i.delegue = true; i.consigne = k;
      [...i.zoneConsignes.querySelectorAll('button')].forEach((b, j) => { b.disabled = true; if (j === k) b.classList.add('ok'); });
      i.issue.className = 'dr-issue'; i.issue.textContent = 'Prestataire en route avec la consigne. Retour dans 20 s.';
      boutons(i, ['journaux']);
      ligne(`prestataire → ${SITES[i.site].code} : « ${i.consignes[k].t} »`, 'cmd');
    }

    function neRienFaire(i) {
      if (i.etat || i.action) return;
      fermerConsignes();
      if (i.vrai) clore(i, 'rompu', `Classé sans suite. ${i.titre} : l'engagement court toujours, et il est rompu.`);
      else clore(i, 'sansSuite', i.sansSuite);
    }

    function clore(i, etat, texte) {
      i.etat = etat; i.finTick = tick;
      const ok = etat === 'resolu' || (etat === 'sansSuite' && !i.vrai);
      i.el.classList.add('clos', ok ? 'ok' : 'ko');
      i.issue.className = 'dr-issue ' + (ok ? 'ok' : 'ko');
      i.issue.textContent = texte;
      i.reste.textContent = etat === 'resolu' ? 'tenu' : etat === 'rompu' ? 'rompu' : 'sans suite';
      i.jauge.style.width = etat === 'resolu' ? i.jauge.style.width : '0%';
      boutons(i, ['journaux']);
      majTuile(i);
      ligne(texte, ok ? 'ok' : 'ko');
    }

    function arriver(i) {
      i.action = null;
      if (!i.vrai) {
        ligne(i.surPlace, 'ko');
        i.issue.className = 'dr-issue ko'; i.issue.textContent = i.surPlace;
        boutons(i, ['journaux', 'rien']);
        return;
      }
      if (i.etat === 'rompu') { ligne(`${SITES[i.site].code} : ${i.surPlace} Hors engagement.`, 'ko'); i.issue.textContent += ' Résolu hors engagement.'; return; }
      clore(i, 'resolu', i.surPlace);
    }

    function retourPrestataire(i) {
      i.action = null;
      const cs = i.consignes[i.consigne];
      if (!cs.ok) {
        i.mauvaisesConsignes++;
        const b = i.zoneConsignes.querySelectorAll('button')[i.consigne];
        b.classList.remove('ok'); b.classList.add('ko');
        i.issue.className = 'dr-issue ko'; i.issue.textContent = `Prestataire : ${cs.effet}`;
        ligne(`prestataire ${SITES[i.site].code} : ${cs.effet}`, 'ko');
        if (i.etat) return;
        [...i.zoneConsignes.querySelectorAll('button')].forEach(x => { x.disabled = false; });
        boutons(i, i.vrai ? ['journaux', 'aller', 'deleguer'] : ['journaux', 'aller', 'deleguer', 'rien']);
        return;
      }
      if (i.etat === 'rompu') { ligne(`prestataire ${SITES[i.site].code} : ${cs.effet} Hors engagement.`, 'ko'); i.issue.textContent += ' Résolu hors engagement.'; return; }
      clore(i, 'resolu', `Prestataire : ${cs.effet}`);
    }

    function expirer(i) {
      if (i.vrai) {
        const txt = i.action ? `Délai dépassé avant la fin de l'action : engagement ${i.prio} rompu.` : `Délai dépassé sans résolution : engagement ${i.prio} rompu.`;
        const action = i.action;
        clore(i, 'rompu', txt);
        i.action = action; // l'action en cours va à son terme, mais hors engagement
      } else clore(i, 'sansSuite', 'Délai écoulé sans action. Classé sans suite.');
    }

    // ------------------------------------------------------------- horloge
    function pas() {
      if (!vivant || termine || enPause) return;
      tick++;
      for (const d of INCIDENTS) if (d.arrivee * PAS_PAR_S === tick) apparaitre(d);
      for (const i of incs) {
        if (i.action === 'deplacement' && tick >= i.finAction) { arriver(i); rafraichirAller(); }
        else if (i.action === 'delegation' && tick >= i.finAction) retourPrestataire(i);
        if (!i.etat && tick >= i.echeance) expirer(i);
        majJauge(i);
      }
      majPoste();
      majStatut();
      const toutClos = incs.length === INCIDENTS.length && incs.every(i => i.etat && !i.action);
      if (toutClos && !finTick) finTick = tick + PAUSE_FIN;
      if ((finTick && tick >= finTick) || tick >= DUREE_PARTIE) terminer();
    }

    function terminer() {
      termine = true;
      if (horloge) { clearInterval(horloge); horloge = null; }
      const vrais = incs.filter(i => i.vrai), faux = incs.find(i => !i.vrai);
      const tenus = vrais.filter(i => i.etat === 'resolu').length;
      const fauxIgnore = !!faux && faux.etat === 'sansSuite' && !faux.deplace && !faux.delegue;
      const gagne = tenus === 3 && fauxIgnore;
      const score = conformite();
      const manques = [];
      if (tenus < 3) manques.push(`${3 - tenus} engagement${3 - tenus > 1 ? 's' : ''} rompu${3 - tenus > 1 ? 's' : ''}`);
      if (faux && !fauxIgnore) manques.push(faux.deplace ? 'un déplacement sur un faux positif' : faux.delegue ? 'un prestataire envoyé sur un faux positif' : 'un faux positif non classé');
      cadre.fin({
        titre: gagne ? 'Quartier validé' : 'Pas tout à fait',
        texte: gagne
          ? `Trois engagements tenus, un faux positif classé sans suite. Conformité ${score} %. Coordonner, c'est ça : lire avant d'agir, déléguer une consigne qu'on peut exécuter, et savoir ne pas bouger.`
          : `Conformité ${score} % : ${manques.join(', ')}. Les journaux disent presque toujours quoi faire, et le P1 ne laisse le temps que d'y aller soi-même. Rejoue : les incidents sont les mêmes.`,
        bouton: gagne ? 'Prendre la clé' : 'Rejouer',
        action: () => gagne
          ? api.fini({ score, message: `Trois incidents tenus dans leur délai, un faux positif classé sans suite. Conformité ${score} %.` })
          : rejouer(),
      });
    }

    function rejouer() {
      const f = cadre.corps.querySelector('.jx-fin'); f && f.remove();
      for (const i of incs) i.el.remove();
      incs = []; tick = 0; termine = false; enPause = false; finTick = 0; joueur = { site: null, jusqua: 0 };
      tuiles.forEach(t => { t.el.className = 'dr-ecran'; t.prio.textContent = ''; t.etat.textContent = 'nominal'; t.compte.textContent = t.nominal; });
      term.effacer();
      demarrer();
    }

    function demarrer() {
      term.ecrire('SUPERVISION — cinq sites nominaux. Contrôle d’accès et vidéo.', 'acc');
      term.ecrire('Les incidents arrivent ici et dans la colonne de droite. Y aller : 10 s, une seule place à la fois. Déléguer : 20 s, le prestataire fait mot pour mot ce qui est écrit. Tout n’appelle pas une action.', 'sys');
      term.vide();
      majPoste(); majStatut();
      horloge = setInterval(pas, PAS_MS);
    }

    lat.el.appendChild(Object.assign(document.createElement('div'), { className: 'jx-carte dr-regles' }));
    lat.el.lastChild.innerHTML = `<h3>Engagements de service</h3>
      <p><b>P1</b> 15 s · <b>P2</b> 30 s · <b>P3</b> 60 s — la barre s'amincit.</p>
      <p><b>Y aller</b> résout en 10 s, vous n'êtes qu'à un endroit à la fois. <b>Déléguer</b> résout en 20 s si la consigne est la bonne. <b>Ne rien faire</b> est parfois la réponse.</p>`;

    demarrer();

    // ------------------------------------------------------------- résolution automatique
    async function avancerJusqua(cond) {
      let garde = DUREE_PARTIE + 50;
      while (!cond() && !termine && vivant && garde-- > 0) pas();
      await attendre(15);
    }
    const trouver = titre => incs.find(i => i.titre === titre);
    const bonneConsigne = i => [...i.zoneConsignes.querySelectorAll('button')][i.consignes.findIndex(c => c.ok)];

    return {
      demonter() {
        vivant = false;
        if (horloge) { clearInterval(horloge); horloge = null; }
        conteneur.innerHTML = '';
      },
      // Joue la solution : lit les journaux, délègue le P2 et le P3 avec la bonne
      // consigne, classe le faux positif sans suite, va soi-même sur le P1.
      async resoudre() {
        if (horloge) { clearInterval(horloge); horloge = null; }
        const d = t => trouver(t);
        await avancerJusqua(() => d('Lecteur de badge hors ligne'));
        let i = d('Lecteur de badge hors ligne');
        i.btn.journaux.click(); i.btn.deleguer.click(); await attendre(15); bonneConsigne(i).click();
        await avancerJusqua(() => d('Caméra sans signal'));
        i = d('Caméra sans signal');
        i.btn.journaux.click(); i.btn.deleguer.click(); await attendre(15); bonneConsigne(i).click();
        await avancerJusqua(() => d('Détection de mouvement répétée, zone 7'));
        i = d('Détection de mouvement répétée, zone 7');
        i.btn.journaux.click(); await attendre(15); i.btn.rien.click();
        await avancerJusqua(() => d('Porte forcée'));
        i = d('Porte forcée');
        i.btn.journaux.click(); await attendre(15); i.btn.aller.click();
        await avancerJusqua(() => termine);
        await attendre(30);
        const fin = cadre.corps.querySelector('.jx-fin .jx-btn');
        fin && fin.click();
      },
    };
  },
};
