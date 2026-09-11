// QUARTIER 6 — LA TOUR — verbe DIAGNOSTIQUER — « 05:52 — Quelqu'un sur place »
//
// MISE EN SITUATION, PAS UNE EXPÉRIENCE. Le jeu le dit dès la première seconde
// et ne revendique aucun fait de parcours. 05:52 : une infirmière de nuit signale
// que l'assistant IA propose des posologies incohérentes depuis minuit. On descend
// couche par couche — la plainte, l'application, l'infra, la salle — on corrèle
// deux indices avant de toucher à quoi que ce soit, on corrige dans l'ordre, puis
// on remonte l'expliquer à quelqu'un dont ce n'est pas le métier.
// Même structure que medline.js : cadre, terminal à gauche, cartes à droite.

import { creerCadre, creerTerminal, creerLateral, attendre } from './_contrat.js';
import { FORMATION, COMPETENCES, A_APPRENDRE } from '../cv.js';

const TITRE = "05:52 — Quelqu'un sur place";
const COUCHES = ['La plainte', "L'application", "L'infrastructure", 'La salle', 'Le retour'];
const HEURES = ['05:52', '05:56', '06:00', '06:03', '06:11'];
const HEURE_CORRECTION = '06:04';
const HEURE_BASCULE = '06:04';
const HEURE_FIN = '06:14';

// (1) La plainte, à traduire en défaut qu'on peut tester.
const PLAINTE = {
  de: "l'infirmière de nuit",
  texte: "L'assistant propose des posologies incohérentes depuis minuit. On a arrêté de s'en servir. Je ne sais pas si c'est nous ou lui.",
  choix: [
    { t: "L'IA déraille : le modèle s'est dégradé cette nuit.", ok: false,
      why: "C'est une conclusion, pas un défaut. Rien n'est testé : on ne sait ni où, ni depuis quand, ni comment le mesurer." },
    { t: "Depuis 00:00, sur les demandes de posologie, l'assistant rend des réponses qui s'écartent de la référence médicament. Un début, un périmètre, un écart mesurable.", ok: true,
      why: "Un défaut qu'on peut tester : on sait quoi comparer, depuis quand, et où regarder." },
    { t: "L'équipe de nuit n'a plus confiance dans l'outil.", ok: false,
      why: "Vrai, et important, mais c'est une conséquence. Un ressenti ne se cherche pas dans un journal." },
  ],
};

// (2) (3) (4) Les commandes, par couche. Une ligne peut être [texte, classe].
const COMMANDES = {
  logs: { couche: 1, indice: 'logs', lignes: [
    'journal applicatif — agent posologie — six dernières heures',
    '23:41  #8812  modèle 1 900 ms · outil reference_medicament 340 ms · modèle 1 850 ms · réponse OK',
    ['00:07  #8859  modèle 5 900 ms · outil reference_medicament 340 ms · modèle : DÉLAI DÉPASSÉ (8 000 ms)', 'ko'],
    ['00:07  #8859  repli : réponse directe du modèle, SANS la référence médicament', 'acc'],
    '00:19  #8874  délai dépassé → repli sans référence',
    '00:31  #8880  délai dépassé → repli sans référence',
    ['05:50  depuis 00:00 : 212 demandes, 67 replis sans référence (32 %). Hier, même tranche : 0.', 'acc'],
  ] },
  latence: { couche: 1, indice: 'latence', lignes: [
    'latence de génération (modèle) — fenêtre 24 h',
    '              p50        p99',
    'hier 22:00    410 ms     1 900 ms',
    'hier 23:00    420 ms     1 950 ms',
    ['00:00         980 ms     5 800 ms   ← ×3', 'acc'],
    '01:00       1 010 ms     6 100 ms',
    '05:00       1 050 ms     6 300 ms',
    ['délai de l\'agent : 8 000 ms, pour deux appels modèle par demande.', 'sys'],
  ] },
  modele: { couche: 1, indice: 'modele', lignes: [
    'rejeu : 50 demandes d\'hier, même invite, même version, température 0',
    ['sorties identiques à hier : 50 / 50', 'acc'],
    'poids : somme de contrôle inchangée depuis le déploiement',
    ['→ le modèle n\'est pas en cause. Quelque chose le ralentit.', 'sys'],
  ] },
  gpu: { couche: 2, indice: 'gpu', lignes: [
    'nvidia-smi — nœuds d\'inférence',
    'gpu-01   util 41 %   temp 58 °C   horloge 1 980 MHz   bridage : aucun',
    ['gpu-02   util 44 %   temp 91 °C   horloge   870 MHz   bridage : THERMIQUE (HW Slowdown actif)', 'ko'],
    ['gpu-02   entrée d\'air 38 °C (seuil salle : 27 °C), depuis 23:50', 'acc'],
    ['→ la moitié des demandes tourne sur une carte qui tourne à moitié.', 'sys'],
  ] },
  reseau: { couche: 2, indice: null, lignes: [
    'réseau — liaison salle ↔ nœuds',
    'perte 0 %   gigue 0,3 ms   débit 2 % de la capacité',
    ['→ rien à signaler. Un réseau sain ne triple pas une latence de calcul.', 'sys'],
  ] },
  baie: { couche: 3, indice: 'baie', lignes: [
    'DCIM — salle serveurs, rangée B',
    'B-05   gpu-01            entrée d\'air 24 °C',
    ['B-06   gpu-02            entrée d\'air 38 °C', 'ko'],
    ['B-07   baie stockage     installée la semaine dernière · flux d\'air INVERSÉ : ses sorties chaudes donnent sur l\'entrée de B-06', 'acc'],
    ['B-07   première sauvegarde complète lancée hier à 23:45. Capteur B-06 : 24 °C jusqu\'à 23:45, 38 °C depuis.', 'acc'],
  ] },
};

const INDICES = {
  latence: { couche: 'app', t: 'Latence de génération ×3 depuis 00:00' },
  logs: { couche: 'app', t: "Délai de l'agent dépassé → 32 % de réponses sans la référence médicament" },
  modele: { couche: 'app', t: 'Modèle : sorties identiques à hier, hors de cause' },
  gpu: { couche: 'infra', t: 'gpu-02 en bridage thermique, 91 °C, entrée d\'air à 38 °C' },
  baie: { couche: 'salle', t: 'B-07, installée la semaine dernière, souffle son air chaud sur gpu-02' },
};
const CAUSE = ['gpu', 'baie'];

// Les trois gestes, dans le bon ordre. L'affichage les mélange.
const GESTES = [
  { id: 'bascule', t: 'Basculer le trafic sur gpu-01', sortie: [
    'routeur d\'inférence : gpu-02 retiré du pool. 100 % des demandes → gpu-01.',
    [`${HEURE_BASCULE}  replis sans référence : 0 sur les 12 dernières demandes.`, 'ok'],
  ] },
  { id: 'batch', t: 'Brider le batch', sortie: [
    'gpu-01 : lot maximal 16 → 8. p99 3 100 ms, sous le délai de 8 000 ms avec marge.',
    ['débit réduit jusqu\'au matin ; chaque réponse repasse par la référence.', 'ok'],
  ] },
  { id: 'baie', t: 'Demander le déplacement de la baie', sortie: [
    'ticket exploitation : retourner B-07, sorties d\'air vers l\'allée chaude, avant la sauvegarde de ce soir.',
    ['gpu-02 reviendra dans le pool quand son entrée d\'air repassera sous 27 °C.', 'ok'],
  ] },
];
const ORDRE_AFFICHE = ['batch', 'baie', 'bascule'];
const REFUS_GESTE = {
  '0:batch': "Pas encore. Tant que gpu-02 sert des réponses, chaque minute produit une posologie sans référence. On met les patients à l'abri d'abord : bascule.",
  '0:baie': "C'est la cause, mais déplacer une baie prend une heure et des bras. Il est 06:04 et des réponses partent encore sans référence. Bascule d'abord.",
  '1:baie': "Avant d'appeler l'exploitation : gpu-01 porte seul tout le trafic. S'il dépasse le délai à son tour, on a déplacé le problème. Bride le batch.",
};

// (5) Remonter expliquer.
const RETOUR = {
  choix: [
    { t: "Un nœud GPU était en bridage thermique à cause du flux d'air inversé d'une baie voisine ; le délai de l'agent était dépassé et il répondait sans l'outil de référence.", ok: false,
      why: "Exact, et elle a retenu « GPU ». Elle ne sait toujours pas quelles réponses revérifier." },
    { t: "C'était un petit bug de nuit, c'est réparé, vous pouvez le réutiliser.", ok: false,
      why: "Rassurant et faux : la cause est encore dans la salle, et six heures de réponses ne sont pas revérifiées." },
    { t: "Depuis minuit, l'assistant répondait trop lentement et finissait par répondre sans consulter la référence des médicaments. Je l'ai remis sur une machine saine : depuis 06:04, les réponses sont fiables. Celles d'entre minuit et 06:04 sont à revérifier.", ok: true,
      why: "Vrai, court, et elle sait quoi faire : reprendre l'outil, et faire revérifier six heures de réponses." },
  ],
};

const CSS = `
  .jx .jx-term-in[hidden]{display:none}
  .jx .scenario-bandeau{border-style:dashed;border-left-style:solid}
  .jx .scenario-bandeau h3{color:#C8D3DA}
  .jx .scenario-dim{color:#7A8A96}
  .jx .scenario-couches{display:flex;flex-direction:column;gap:3px}
  .jx .scenario-couche{display:flex;gap:10px;align-items:baseline;font-size:12px;color:#4E5A66}
  .jx .scenario-couche b{flex:none;width:2ch;font-weight:400}
  .jx .scenario-couche small{margin-left:auto;font-size:11px;color:#4E5A66}
  .jx .scenario-couche.faite{color:#6FCF8E}
  .jx .scenario-couche.cours{color:var(--acc)}
  .jx .scenario-couche.cours small{color:var(--acc)}
  .jx .scenario-zone{display:flex;flex-direction:column;gap:10px}
  .jx .scenario-cmds{display:flex;flex-wrap:wrap;gap:6px}
  .jx .scenario-cmd{font:12px "IBM Plex Mono",monospace;padding:4px 9px;border:1px solid #2B3843;border-radius:2px;
      color:#C8D3DA;background:#0E1318;cursor:pointer}
  .jx .scenario-cmd:hover{border-color:var(--acc)}
  .jx .scenario-cmd.vu{color:#6FCF8E;border-color:#3A5A48}
  .jx .scenario-cmd.ferme{color:#4E5A66;border-style:dashed}
  .jx .scenario-inds{display:flex;flex-direction:column;gap:6px;margin-bottom:8px}
  .jx .scenario-ind{display:flex;gap:9px;align-items:flex-start;text-align:left;font:12.5px/1.4 "IBM Plex Mono",monospace;
      color:#C8D3DA;background:#0E1318;border:1px solid #2B3843;border-radius:2px;padding:8px 10px;cursor:pointer}
  .jx .scenario-ind i{flex:none;width:11px;height:11px;margin-top:4px;border:1px solid #7A8A96;border-radius:1px}
  .jx .scenario-ind:hover{border-color:var(--acc)}
  .jx .scenario-ind.sel{border-color:var(--acc)}
  .jx .scenario-ind.sel i{background:var(--acc);border-color:var(--acc)}
  .jx .scenario-ind em{font-style:normal;color:#7A8A96;font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;display:block}
  .jx .scenario-vide{color:#4E5A66;font-size:12px}
  .jx .scenario-fin{font-size:12.5px;color:#C8D3DA;display:block;margin-top:10px}
  .jx .scenario-fin b{color:var(--acc);display:block;margin-bottom:3px;font-size:11px;letter-spacing:.1em;text-transform:uppercase}
  @media (max-width:760px){
    .jx .scenario-bandeau .scenario-dim{display:none}
    .jx .scenario-couches{flex-direction:row;flex-wrap:wrap;gap:4px 14px}
    .jx .scenario-couche{gap:5px}
    .jx .scenario-couche small{display:none}
  }
`;

function estCoucheOuverte(couche, vus) {
  if (couche === 2) return vus.has('latence') || vus.has('logs');
  if (couche === 3) return vus.has('gpu');
  return true;
}

const REFUS_COUCHE = {
  2: "Rien ne pointe encore vers l'infra. Commence par l'application : logs, latence, modele.",
  3: "La salle, on y va avec une raison. Regarde d'abord les nœuds : gpu, reseau.",
};

// Explique pourquoi une sélection d'indices ne suffit pas. null = la bonne.
function refusCorrelation(sel) {
  if (CAUSE.every(k => sel.has(k)) && sel.size === 2) return null;
  if (sel.size < 2) return "Un indice seul est une hypothèse. Il en faut deux qui se confirment l'un l'autre avant de toucher à quoi que ce soit.";
  if (sel.has('modele')) return "Le modèle rend les mêmes sorties qu'hier : il est hors de cause. Ce n'est pas un indice de panne, c'est une piste écartée.";
  if (sel.size > 2) return "Deux suffisent, si ce sont les bons. Lesquels se confirment l'un l'autre : un effet, et ce qui le produit ?";
  if (sel.has('gpu')) return "Un GPU qui bride, c'est une chaleur qui vient de quelque part. Descends d'une couche.";
  if (sel.has('baie')) return "Une baie qui souffle chaud n'est un problème que si elle abîme quelque chose. Remonte d'une couche.";
  return "La latence et le délai dépassé décrivent le symptôme et sa propagation, pas la cause. Descends.";
}

export default {
  id: 'scenario',
  ordre: 6,
  titre: TITRE,
  employeur: 'SCÉNARIO',
  annees: 'mise en situation',
  factKey: 'scenario',
  verbe: 'DIAGNOSTIQUER',
  accent: '#F0F4F8',
  description: "Mise en situation, pas une expérience. 05:52, l'assistant IA d'un service de soins propose des posologies incohérentes. Descendre couche par couche jusqu'à la cause, corriger dans l'ordre, puis l'expliquer à l'infirmière.",

  monter(conteneur, api) {
    const F = api.FAITS.scenario;
    const cadre = creerCadre(conteneur, {
      titre: TITRE, employeur: F.employeur, annees: F.periode, verbe: 'DIAGNOSTIQUER', accent: api.accent,
      consigne: "Scénario — ce que je ferais chez vous. Descends couche par couche, corrèle deux indices, corrige dans l'ordre, puis explique.",
    });
    const style = document.createElement('style');
    style.textContent = CSS;
    cadre.racine.appendChild(style);
    const term = creerTerminal(cadre.corps, { invite: 'astreinte $' });
    const lat = creerLateral(cadre.corps);

    const etat = { couche: 0, vus: new Set(), selection: new Set(), geste: 0, erreurs: 0, vivant: true, corrige: false };
    let carteCouches = null, zone = null, carteIndices = null, carteGestes = null;

    cadre.bouton('Abandonner', () => api.abandonner());

    // ----- affichage commun -------------------------------------------------
    function ecrireBloc(lignes) {
      for (const l of lignes) Array.isArray(l) ? term.ecrire(l[0], l[1]) : term.ecrire(l);
      term.vide();
    }
    function carteDans(parent, titre, html) {
      const c = document.createElement('div');
      c.className = 'jx-carte';
      c.innerHTML = `<h3>${titre}</h3>${html}`;
      parent.appendChild(c);
      return c;
    }
    function statut(texte, etatCss) {
      const heure = etat.corrige && etat.couche < 4 ? HEURE_CORRECTION : HEURES[etat.couche];
      cadre.statut(`${heure} · ${texte}`, etatCss);
    }
    function rendreCouches() {
      const html = COUCHES.map((nom, k) => {
        const cls = k < etat.couche ? 'faite' : k === etat.couche ? 'cours' : '';
        return `<div class="scenario-couche ${cls}"><b>${k + 1}</b><span>${nom}</span><small>${k <= etat.couche ? HEURES[k] : ''}</small></div>`;
      }).join('');
      carteCouches.querySelector('.scenario-couches').innerHTML = html;
    }
    function avancerCouche(k) {
      if (k <= etat.couche) return;
      etat.couche = k;
      rendreCouches();
      statut(`couche ${k + 1} sur 5 — ${COUCHES[k].toLowerCase()}`);
    }
    function viderZone() { zone.innerHTML = ''; carteIndices = carteGestes = null; }

    // ----- (1) la plainte ---------------------------------------------------
    function ouvrirPlainte() {
      term.effacer();
      term.ecrire('SCÉNARIO — ce que je ferais chez vous. Mise en situation, pas une expérience.', 'acc');
      term.ecrire('05:52 — appel du service de nuit.', 'sys');
      term.ecrire(`« ${PLAINTE.texte} »`);
      term.ecrire(`— ${PLAINTE.de}`, 'dim');
      term.vide();
      term.ecrire("Première chose : traduire la plainte en défaut qu'on peut tester. Choisis à droite.", 'sys');
      viderZone();
      const c = carteDans(zone, 'La plainte, en défaut exploitable', '<div class="jx-choix"></div>');
      const zc = c.querySelector('.jx-choix');
      PLAINTE.choix.forEach((r, k) => {
        const b = document.createElement('button');
        b.textContent = r.t;
        b.dataset.plainte = k;
        b.addEventListener('click', () => choisirPlainte(k, b));
        zc.appendChild(b);
      });
      statut('couche 1 sur 5 — la plainte');
    }
    function choisirPlainte(k, b) {
      if (!etat.vivant || etat.couche > 0) return;
      const r = PLAINTE.choix[k];
      if (!r.ok) {
        etat.erreurs++;
        b.classList.add('ko'); b.disabled = true;
        term.ecrire('PAS ENCORE — ' + r.why, 'ko');
        statut('couche 1 sur 5 — la plainte', 'ko');
        return;
      }
      b.classList.add('ok');
      term.ecrire('DÉFAUT POSÉ — ' + r.why, 'ok');
      term.vide();
      term.ecrire("On descend. Commandes : logs, latence, modele, puis gpu, reseau, puis baie. Tape aide à tout moment.", 'sys');
      avancerCouche(1);
      ouvrirDescente();
    }

    // ----- (2) (3) (4) la descente -----------------------------------------
    function ouvrirDescente() {
      viderZone();
      const cc = carteDans(zone, 'Commandes', '<div class="scenario-cmds"></div>');
      cc.dataset.role = 'cmds';
      carteIndices = carteDans(zone, 'Indices relevés', '<div class="scenario-inds"></div>');
      const corriger = document.createElement('button');
      corriger.className = 'jx-btn fort';
      corriger.textContent = 'Corriger avec ces indices';
      corriger.dataset.role = 'corriger';
      corriger.addEventListener('click', correler);
      carteIndices.appendChild(corriger);
      rendreCommandes();
      rendreIndices();
      term.invite(commande);
    }
    function rendreCommandes() {
      const zc = zone.querySelector('.scenario-cmds');
      if (!zc) return;
      zc.innerHTML = '';
      for (const [nom, c] of Object.entries(COMMANDES)) {
        const b = document.createElement('button');
        b.className = 'scenario-cmd' + (etat.vus.has(nom) ? ' vu' : estCoucheOuverte(c.couche, etat.vus) ? '' : ' ferme');
        b.textContent = nom;
        b.dataset.cmd = nom;
        b.addEventListener('click', () => term.executer(nom));
        zc.appendChild(b);
      }
    }
    function rendreIndices() {
      if (!carteIndices) return;
      const zi = carteIndices.querySelector('.scenario-inds');
      zi.innerHTML = '';
      const releves = Object.keys(INDICES).filter(k => etat.vus.has(k));
      if (!releves.length) { zi.innerHTML = '<p class="scenario-vide">Aucun indice relevé. Lance des commandes : chaque couche en laisse un.</p>'; return; }
      for (const k of releves) {
        const b = document.createElement('button');
        b.className = 'scenario-ind' + (etat.selection.has(k) ? ' sel' : '');
        b.dataset.indice = k;
        b.innerHTML = `<i></i><span><em>${INDICES[k].couche}</em>${INDICES[k].t}</span>`;
        b.addEventListener('click', () => { etat.selection.has(k) ? etat.selection.delete(k) : etat.selection.add(k); rendreIndices(); });
        zi.appendChild(b);
      }
    }
    function commande(v) {
      if (!etat.vivant || etat.corrige) return;
      const mot = v.toLowerCase().trim();
      if (mot === 'aide') { term.ecrire('Commandes : ' + Object.keys(COMMANDES).join(', ') + '. Puis « Corriger » à droite, avec deux indices.', 'sys'); return; }
      const c = COMMANDES[mot];
      if (!c) { term.ecrire(`commande inconnue : ${mot} (tape aide)`, 'ko'); return; }
      if (!estCoucheOuverte(c.couche, etat.vus)) { term.ecrire(REFUS_COUCHE[c.couche], 'ko'); return; }
      ecrireBloc(c.lignes);
      if (etat.vus.has(mot)) return;
      etat.vus.add(mot);
      avancerCouche(c.couche);
      rendreCommandes();
      rendreIndices();
    }
    function correler() {
      if (!etat.vivant || etat.corrige) return;
      const refus = refusCorrelation(etat.selection);
      if (refus) {
        etat.erreurs++;
        term.ecrire('ON NE CORRIGE PAS ENCORE — ' + refus, 'ko');
        statut(`couche ${etat.couche + 1} sur 5 — ${COUCHES[etat.couche].toLowerCase()}`, 'ko');
        return;
      }
      etat.corrige = true;
      term.invite(null);
      term.ecrire('CAUSE ÉTABLIE — B-07 souffle sur gpu-02, gpu-02 bride, le modèle ralentit, l\'agent dépasse son délai et répond sans la référence.', 'ok');
      term.vide();
      term.ecrire('Trois gestes, dans le bon ordre. Choisis à droite.', 'sys');
      statut('corriger — trois gestes, dans l\'ordre');
      ouvrirCorrection();
    }

    // ----- corriger : trois gestes dans l'ordre -----------------------------
    function ouvrirCorrection() {
      viderZone();
      carteGestes = carteDans(zone, 'Corriger — dans l\'ordre', '<div class="jx-choix"></div>');
      const zc = carteGestes.querySelector('.jx-choix');
      for (const id of ORDRE_AFFICHE) {
        const g = GESTES.find(x => x.id === id);
        const b = document.createElement('button');
        b.textContent = g.t;
        b.dataset.geste = id;
        b.addEventListener('click', () => faireGeste(id, b));
        zc.appendChild(b);
      }
    }
    function faireGeste(id, b) {
      if (!etat.vivant || b.disabled) return;
      const attendu = GESTES[etat.geste];
      if (attendu.id !== id) {
        etat.erreurs++;
        b.classList.add('ko');
        term.ecrire('PAS DANS CET ORDRE — ' + REFUS_GESTE[`${etat.geste}:${id}`], 'ko');
        statut('corriger — trois gestes, dans l\'ordre', 'ko');
        return;
      }
      b.classList.remove('ko'); b.classList.add('ok'); b.disabled = true;
      b.textContent = `${etat.geste + 1} · ${attendu.t}`;
      [...b.parentNode.children].forEach(x => x.classList.remove('ko'));
      term.ecrire(`${etat.geste + 1}. ${attendu.t}`, 'cmd');
      ecrireBloc(attendu.sortie);
      etat.geste++;
      statut(`corriger — geste ${etat.geste} sur ${GESTES.length}`, 'ok');
      if (etat.geste === GESTES.length) { avancerCouche(4); ouvrirRetour(); }
    }

    // ----- (5) remonter expliquer -------------------------------------------
    function ouvrirRetour() {
      term.ecrire('06:11 — on remonte. L\'infirmière attend une phrase, pas un rapport.', 'sys');
      viderZone();
      const c = carteDans(zone, "Ce que tu dis à l'infirmière", '<div class="jx-choix"></div>');
      const zc = c.querySelector('.jx-choix');
      RETOUR.choix.forEach((r, k) => {
        const b = document.createElement('button');
        b.textContent = r.t;
        b.dataset.retour = k;
        b.addEventListener('click', () => choisirRetour(k, b));
        zc.appendChild(b);
      });
      statut('couche 5 sur 5 — le retour');
    }
    function choisirRetour(k, b) {
      if (!etat.vivant || b.disabled) return;
      const r = RETOUR.choix[k];
      if (!r.ok) {
        etat.erreurs++;
        b.classList.add('ko'); b.disabled = true;
        term.ecrire('À RETRAVAILLER — ' + r.why, 'ko');
        statut('couche 5 sur 5 — le retour', 'ko');
        return;
      }
      b.classList.add('ok');
      [...b.parentNode.children].forEach(x => { x.disabled = true; });
      term.ecrire('BIEN DIT — ' + r.why, 'ok');
      cadre.statut(`${HEURE_FIN} · scénario joué de bout en bout`, 'ok');
      terminer();
    }

    // ----- fin : rappel du scénario, faits réels transverses ----------------
    function terminer() {
      const langues = COMPETENCES.find(c => c.groupe === 'Langues');
      const formation = FORMATION.map(f => `${f.titre} — ${f.ou} (${f.quand})`).join('<br>');
      const score = Math.max(1, 5 - etat.erreurs);
      cadre.fin({
        titre: 'Fin du scénario — rien de ceci n\'est un fait de parcours',
        texte: `${F.texte}` +
          `<span class="scenario-fin"><b>Ce qui est vrai, en revanche</b>${formation}<br>${langues ? langues.items : ''}</span>` +
          `<span class="scenario-fin"><b>Ce que je ne sais pas encore</b>${A_APPRENDRE}</span>`,
        bouton: 'Prendre la clé',
        action: () => api.fini({
          score,
          message: `Scénario joué de bout en bout, de la plainte à la baie et retour, ${etat.erreurs ? etat.erreurs + ' faux pas' : 'sans faux pas'}. Aucun fait revendiqué.`,
        }),
      });
    }

    // ----- montage ----------------------------------------------------------
    const bandeau = lat.carte('Scénario — ce que je ferais chez vous',
      `<p>Mise en situation, pas une expérience. Aucun fait de parcours n'est revendiqué ici.</p>` +
      `<p class="scenario-dim">Poste visé : Forward Deployed Engineer, IA agentique en établissement de santé.</p>`);
    bandeau.classList.add('scenario-bandeau');
    carteCouches = lat.carte('La descente', '<div class="scenario-couches"></div>');
    zone = document.createElement('div');
    zone.className = 'scenario-zone';
    lat.el.appendChild(zone);
    rendreCouches();
    ouvrirPlainte();

    const clic = sel => { const b = zone.querySelector(sel); if (b) b.click(); return !!b; };

    return {
      demonter() { etat.vivant = false; term.invite(null); conteneur.innerHTML = ''; },
      // joue le chemin : la bonne traduction, toutes les couches, les deux bons
      // indices, les trois gestes dans l'ordre, la bonne phrase, la clé
      async resoudre() {
        clic(`[data-plainte="${PLAINTE.choix.findIndex(c => c.ok)}"]`);
        await attendre(30);
        for (const c of ['latence', 'logs', 'modele', 'gpu', 'reseau', 'baie']) { term.executer(c); await attendre(20); }
        for (const k of CAUSE) clic(`[data-indice="${k}"]`);
        await attendre(30);
        clic('[data-role="corriger"]');
        await attendre(30);
        for (const g of GESTES) { clic(`[data-geste="${g.id}"]`); await attendre(30); }
        clic(`[data-retour="${RETOUR.choix.findIndex(c => c.ok)}"]`);
        await attendre(30);
        const fin = cadre.corps.querySelector('.jx-fin .jx-btn');
        fin && fin.click();
      },
    };
  },
};
