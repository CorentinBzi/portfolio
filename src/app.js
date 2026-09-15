// Point d'entrée de la coquille : paramètres, préférences, machine d'états, câblage des modules.

import { FAITS, CLES, PROFIL, FORMATION, COMPETENCES } from './cv.js';
import { NIVEAUX, niveau, verifierNiveaux, premiereAnnee, slugSection } from './niveaux.js';
import { ETAT_INITIAL, transition } from './etat.js';
import { lireParametres } from './parametres.js';
import * as P from './progression.js';
import { construireScript } from './amorcage/script.js';
import { lancerAmorcage } from './amorcage/terminal.js';
import { creerCarte } from './carte/rendu.js';
import { NB_CAMPUS_DC } from './carte/niveaux-carte.js';
import { creerBarre } from './ui/barre.js';
import { creerRail } from './ui/rail.js';
import { creerBalises } from './ui/balises.js';
import { creerFiche } from './ui/fiche.js';
import { creerDialogueCv } from './ui/cv-dialogue.js';
import { afficherRecompense } from './ui/recompense.js';
import { annoncer } from './ui/annonces.js';
import { installerRaccourcis } from './ui/raccourcis.js';
import { monterJeu, metaJeu } from './hote-jeu.js';
import { toast, ouvrirVolet, fondreVolet, animerCle, chargerPolices } from './ui/effets.js';

const $ = (s) => document.querySelector(s);
const html = document.documentElement;
const journal = (m) => { if (window.__journal) window.__journal(m); };
const IDS = NIVEAUX.map((n) => n.id);
const JEUX_CHRONOMETRES = new Set(['digitalrealty']); // jeux dont l'horloge tourne sans pause possible
const ATTENTE_PLONGEE_MAX_MS = 700; // la plongée dure 520 ms ; si la carte est en pause (CV ouvert), on n'attend pas plus
const DELAI_REDIMENSION_MS = 200; // après la remesure de la carte (150 ms), sinon la fiche mobile part d'anciennes dimensions
const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
const params = lireParametres(location.search, location.hash, IDS);

let stockage = null;
try { stockage = window.localStorage; } catch { stockage = null; }
const persistante = !params.progres && P.stockageDisponible(stockage);
let progression = params.progres ? P.progressionForcee(params.progres, IDS) : P.lireProgression(stockage, IDS);
const premiereVisite = !progression.vu;
const mediaReduit = matchMedia('(prefers-reduced-motion: reduce)');
const mediaMobile = matchMedia('(max-width: 760px)');
const estReduit = () => params.anim === 'reduites' || progression.animations === 'reduites' || mediaReduit.matches;

let etat = transition(ETAT_INITIAL, { type: 'SELECTIONNER', id: P.suggere(progression, IDS) });
const indispo = new Set();
let jeu = null;
let terminal = null;
let lancement = false, tDebutAmorcage = 0;
let aTabule = false;
let historiqueCv = false;

const envoyer = (ev) => { etat = transition(etat, ev); html.dataset.ecran = etat.ecran; return etat; };
const sauver = () => { if (persistante) P.ecrireProgression(progression, stockage); };
const hauteurBarre = () => $('#barre').getBoundingClientRect().height || 56;

// ---------- interface ----------
const barre = creerBarre({
  racine: $('#barre'), niveaux: NIVEAUX, PROFIL,
  surCvComplet: (el) => ouvrirCv({ onglet: 'complet', declencheur: el }),
  surCles: (el) => ouvrirCv({ onglet: 'cles', declencheur: el }),
  surAnimations: basculerAnimations,
  surQuitter: quitterJeu,
});
const rail = creerRail({ racine: $('#rail'), niveaux: NIVEAUX, FAITS, surSelection: (id) => selectionner(id, { ouvrirFiche: true }), surActivation: (id) => jouer(id) });
const balises = creerBalises({ racine: $('#balises'), niveaux: NIVEAUX, surClic: (id) => clicQuartier(id) });
const fiche = creerFiche({
  racine: $('#fiche'), FAITS, surJouer: (id) => jouer(id),
  surLire: (id) => ouvrirCv({ onglet: 'complet', ancre: ancreNiveau(id), declencheur: document.activeElement }),
  surFermer: () => fermerFiche({ rendreFocus: true }),
});
const dialogue = creerDialogueCv({
  dialog: $('#cv'), progression, persistante, surToast: toast,
  surJouer: (id) => { dialogue.fermer(); jouer(id); },
  surAllerNiveau: (id) => { dialogue.fermer(); selectionner(id, { ouvrirFiche: true }); },
  surReinitialiser: reinitialiser,
  surFermeture: surFermetureCv,
});
const annees = Object.fromEntries(NIVEAUX.map((n) => [n.id, n.miseEnSituation ? 'fictif' : premiereAnnee(FAITS[n.id].periode) || '']));
const carte = creerCarteOuRepli({
  canvas: $('#monde'), niveaux: NIVEAUX, progression, journal,
  preferences: { reduit: estReduit(), capture: params.capture, mobile: mediaMobile.matches, annees },
  rappels: {
    hauteurBarre,
    surImage: (ancres) => {
      balises.positionner(ancres);
      if (etat.fiche && !mediaMobile.matches) fiche.positionner(ancres.get(etat.selection), { hautBarre: hauteurBarre(), basRail: $('#rail').offsetHeight + 16 });
    },
    surClicQuartier: (id) => clicQuartier(id),
    surAimantation: (id) => selectionner(id, { sansCamera: true }),
    surDebutGlisse: masquerIndice,
    surSurvol: (id) => balises.maj({ selection: etat.selection, progression, indispo, survol: id }),
  },
});

// Un monde qui ne démarre pas n'emporte rien : CV, rail, fiches et jeux restent utilisables (spec §6.3).
function creerCarteOuRepli(options) {
  try {
    return creerCarte(options);
  } catch (e) {
    journal(`MONDE : ${e && e.message ? e.message : e}`);
    html.classList.add('monde-en-panne');
    return carteInerte();
  }
}

function carteInerte() {
  const rien = () => {};
  const promesse = () => Promise.resolve();
  const vide = new Map();
  return {
    montrerPlan: () => Promise.resolve('panne'), toutMontrer: rien, selectionner: rien, plonger: promesse, emerger: promesse,
    annulerPlongee: rien, celebrer: rien, majProgression: rien, marquerIndisponible: rien, majReduit: rien, decalerFiche: rien,
    pause: rien, reprendre: rien, redimensionner: rien, liberer: rien, ancres: () => vide, stationCourante: () => 0,
    baseEcran: () => null, instantane: () => document.createElement('canvas'), capturer: rien, detruire: rien,
  };
}

function ancreNiveau(id) {
  const n = niveau(id);
  return n ? slugSection(n.sections[0]) : null;
}

function rafraichir() {
  const jeuMonte = etat.ecran === 'jeu';
  rail.maj({ selection: etat.selection, progression, indispo, jeuMonte, reduit: estReduit() });
  balises.maj({ selection: etat.selection, progression, indispo });
  barre.majProgression(progression);
  dialogue.majProgression(progression);
  carte.majProgression(progression);
}

// ---------- carte ----------
function selectionner(id, { ouvrirFiche = false, instantane = false, sansCamera = false } = {}) {
  if (etat.ecran === 'jeu' || !niveau(id)) return;
  const change = id !== etat.selection;
  envoyer({ type: 'SELECTIONNER', id });
  if (change || !sansCamera) carte.selectionner(id, { instantane, sansCamera });
  rafraichir();
  if (ouvrirFiche || etat.fiche) ouvrirFicheNiveau(id, { focus: false });
  if (change) {
    const n = niveau(id);
    annoncer(`${n.quartier}, niveau ${NIVEAUX.indexOf(n) + 1} sur ${NIVEAUX.length}.`);
  }
}

function ouvrirFicheNiveau(id, { focus = false } = {}) {
  if (etat.ecran !== 'carte') return;
  envoyer({ type: 'OUVRIR_FICHE' });
  const meta = metaJeu(id);
  fiche.ouvrir(id, { progression, indispo: indispo.has(id), description: meta && meta.description, focus: focus && !params.capture, mobile: mediaMobile.matches });
  carte.decalerFiche(mediaMobile.matches ? $('#fiche').getBoundingClientRect().top - 14 : null, id);
  const a = carte.ancres().get(id);
  if (a && !mediaMobile.matches) fiche.positionner(a, { hautBarre: hauteurBarre(), basRail: $('#rail').offsetHeight + 16 });
}

function fermerFiche({ rendreFocus = false } = {}) {
  const avaitFocus = fiche.contient(document.activeElement);
  envoyer({ type: 'FERMER_FICHE' });
  fiche.fermer();
  carte.decalerFiche(null);
  if (rendreFocus || avaitFocus) rail.focusSelection();
}

function clicQuartier(id) {
  if (etat.ecran !== 'carte') return;
  masquerIndice();
  if (etat.selection === id && etat.fiche) jouer(id);
  else selectionner(id, { ouvrirFiche: true });
}

function masquerIndice() {
  $('#indice').hidden = true;
}

// ---------- amorçage ----------
function demarrerAmorcage() {
  tDebutAmorcage = performance.now();
  const script = construireScript({
    FAITS, CLES, FORMATION, COMPETENCES, NIVEAUX, PROFIL, progression, verifierNiveaux,
    polices: chargerPolices, plan: (id) => carte.montrerPlan(id), nbCampus: NB_CAMPUS_DC,
  });
  const tCapture = params.t === null ? 2400 : params.t;
  terminal = lancerAmorcage({
    racine: $('#amorcage'), script, reduit: estReduit(), rapide: progression.vu && !params.capture, capture: params.capture, tCapture,
    surPlan: (id) => carte.montrerPlan(id), surFin: () => finirAmorcage(), journal,
    cibleRepli: () => barre.compteur().getBoundingClientRect(), cibleCouche: (c) => carte.baseEcran(c),
  });
  if (params.capture) {
    terminal.pret.then(() => document.fonts.ready).then(() => {
      carte.capturer(tCapture);
      document.title = 'CAPTURE PRETE';
    });
  }
}

function finirAmorcage() {
  if (!terminal) return;
  const t = terminal;
  terminal = null;
  t.detruire();
  $('#amorcage').hidden = true;
  html.dataset.amorcageMs = String(Math.round(performance.now() - tDebutAmorcage));
  entrerCarte();
}

function entrerCarte({ focus = true } = {}) {
  carte.toutMontrer();
  html.classList.add('carte-prete');
  envoyer({ type: 'AMORCAGE_FINI' });
  if (!params.progres && !progression.vu) { progression = P.avecVu(progression); sauver(); }
  rafraichir();
  annoncer(`Carte prête, ${NIVEAUX.length} niveaux.`);
  if (etat.ecran !== 'carte') return;
  if (mediaMobile.matches && premiereVisite && !params.capture) $('#indice').hidden = false;
  else if (!mediaMobile.matches && !dialogue.estOuvert()) ouvrirFicheNiveau(etat.selection);
  if (focus && !aTabule && !dialogue.estOuvert()) rail.focusSelection();
}

// ---------- jeux ----------
function volet(n) {
  if (estReduit() || params.capture) return Promise.resolve();
  const a = carte.ancres().get(n.id);
  return ouvrirVolet($('#volet'), { accent: n.accent, x: a ? a.x : innerWidth / 2, y: a ? (a.yHaut + a.yPied) / 2 - hauteurBarre() : innerHeight / 2 });
}

async function jouer(id = etat.selection) {
  const n = niveau(id);
  if (lancement || etat.ecran === 'jeu' || !n) return;
  if (indispo.has(id)) { selectionner(id, { ouvrirFiche: true }); return; }
  lancement = true;
  try {
    if (terminal) finirAmorcage();
    $('#recompense').dispatchEvent(new CustomEvent('fermer'));
    masquerIndice();
    if (etat.fiche) { envoyer({ type: 'FERMER_FICHE' }); fiche.fermer(); carte.decalerFiche(null); }
    if (etat.selection !== id) { envoyer({ type: 'SELECTIONNER', id }); carte.selectionner(id, { instantane: true }); }
    envoyer({ type: 'JOUER', id });
    barre.modeJeu(n);
    rafraichir();
    const plongee = carte.plonger(id);
    await volet(n);
    const hote = $('#jeu');
    hote.style.setProperty('--acc', n.accent);
    const inst = hote.querySelector('.jeu-instantane');
    const image = carte.instantane();
    inst.width = image.width;
    inst.height = image.height;
    inst.getContext('2d').drawImage(image, 0, 0);
    hote.hidden = false;
    const ecran = hote.querySelector('.jeu-ecran');
    ecran.replaceChildren();
    const monte = await monterJeu({
      id, conteneur: ecran, mouvementReduit: estReduit(), journal,
      surGagne: (r) => victoire(id, r), surQuitte: (info) => sortieJeu(id, info),
    });
    if (monte && etat.jeu === id) {
      jeu = monte;
      if (dialogue.estOuvert()) jeu.pause(); // CV ouvert pendant le chargement du jeu
      // La plongée n'avance que si la carte tourne : un CV ouvert entre-temps l'a mise en pause.
      await Promise.race([plongee, attendre(ATTENTE_PLONGEE_MAX_MS)]);
      if (etat.ecran === 'jeu' && jeu === monte) carte.pause();
      if (document.activeElement === document.body || !document.activeElement) ecran.focus({ preventScroll: true });
    }
  } finally {
    fondreVolet($('#volet'));
    lancement = false;
  }
}

async function sortirVersCarte(id) {
  jeu = null;
  const hote = $('#jeu');
  hote.hidden = true;
  hote.querySelector('.jeu-ecran').replaceChildren();
  $('#volet').hidden = true;
  barre.modeJeu(null);
  carte.reprendre();
  await carte.emerger(id);
}

async function victoire(id, resultat) {
  lancement = false;
  const deja = P.aCle(progression, id);
  progression = P.avecCle(progression, id, resultat || {}, new Date().toISOString());
  sauver();
  envoyer({ type: 'JEU_GAGNE', id, resultat });
  await sortirVersCarte(id);
  rafraichir();
  if (!deja) {
    carte.celebrer(id);
    await volerCle(id);
    barre.eclair(id);
  } else toast('Clé déjà obtenue, votre partie est mise à jour.');
  const n = niveau(id);
  afficherRecompense({
    racine: $('#recompense'), niveau: n, resultat, dejaObtenue: deja, reduit: estReduit(),
    toutGagne: P.nbCles(progression) === NIVEAUX.length,
    surLire: (nid) => ouvrirCv({ onglet: 'complet', ancre: ancreNiveau(nid), declencheur: rail.element(nid) }),
  }).then(() => { envoyer({ type: 'FERMER_RECOMPENSE' }); if (!dialogue.estOuvert()) rail.focusSelection(); });
}

function volerCle(id) {
  const a = carte.ancres().get(id);
  if (estReduit() || !a) return Promise.resolve();
  return animerCle({ x: a.x, y: a.yHaut - 30 }, barre.caseCle(id), niveau(id).accent);
}

async function sortieJeu(id, { erreur } = {}) {
  lancement = false;
  envoyer({ type: 'JEU_QUITTE' });
  await sortirVersCarte(id);
  if (erreur) {
    indispo.add(id);
    carte.marquerIndisponible(id);
    rafraichir();
    ouvrirFicheNiveau(id, { focus: true });
    annoncer(`${niveau(id).quartier} est en maintenance. La section du CV reste lisible.`);
  } else {
    rafraichir();
    rail.focusSelection();
  }
}

function quitterJeu() {
  if (!jeu || etat.ecran !== 'jeu') return;
  const id = etat.jeu;
  jeu.demonter();
  sortieJeu(id, {});
}

// ---------- CV ----------
function ouvrirCv({ onglet = 'complet', ancre = null, declencheur = null, historique = true } = {}) {
  if (terminal) finirAmorcage();
  envoyer({ type: 'OUVRIR_CV', onglet, ancre });
  const enJeu = etat.ecran === 'jeu' && jeu;
  if (enJeu) jeu.pause();
  const avertissement = enJeu && !jeu.aPause && JEUX_CHRONOMETRES.has(etat.jeu)
    ? `L’horloge de « ${niveau(etat.jeu).titre} » continue pendant la lecture.` : '';
  if (!params.capture) carte.pause();
  dialogue.ouvrir({ onglet, ancre, declencheur, avertissement, jeuMonte: etat.ecran === 'jeu' });
  if (historique && !params.capture) {
    try { history.pushState({ cv: true }, '', ancre ? `#cv/${ancre}` : '#cv'); historiqueCv = true; } catch { historiqueCv = false; }
  }
}

function surFermetureCv() {
  envoyer({ type: 'FERMER_CV' });
  if (etat.ecran === 'jeu' && jeu) jeu.reprendre();
  else carte.reprendre();
  if (historiqueCv) {
    historiqueCv = false;
    if (history.state && history.state.cv) history.back();
  } else if (location.hash.startsWith('#cv')) {
    history.replaceState(null, '', location.pathname + location.search);
  }
}

addEventListener('popstate', () => {
  if (dialogue.estOuvert()) { historiqueCv = false; dialogue.fermer(); }
});

function reinitialiser() {
  progression = P.sansCles(progression);
  sauver();
  rafraichir();
  toast('Progression réinitialisée.');
  annoncer('Progression réinitialisée.');
}

function basculerAnimations() {
  progression = P.avecAnimations(progression, progression.animations === 'reduites' ? 'auto' : 'reduites');
  sauver();
  appliquerAnimations();
  toast(estReduit() ? 'Animations réduites.' : 'Animations rétablies.');
}

function appliquerAnimations() {
  const r = estReduit();
  html.dataset.anim = r ? 'reduites' : 'auto';
  carte.majReduit(r);
  barre.majAnimations(r, mediaReduit.matches);
}

// ---------- démarrage ----------
installerRaccourcis({
  etat: () => ({ ecran: etat.ecran, cvOuvert: dialogue.estOuvert() }),
  actions: {
    passer: () => { if (terminal) terminal.passer(); },
    cv: (onglet) => ouvrirCv({ onglet, declencheur: document.activeElement }),
    decaler: (d) => { const k = IDS.indexOf(etat.selection); selectionner(IDS[Math.max(0, Math.min(IDS.length - 1, k + d))], { ouvrirFiche: etat.fiche }); },
    aller: (k) => { if (k < IDS.length || k === Infinity) selectionner(IDS[Math.min(IDS.length - 1, k)], { ouvrirFiche: true }); },
    jouer: () => jouer(etat.selection),
    echap: () => {
      const rc = $('#recompense');
      if (!rc.hidden) rc.dispatchEvent(new CustomEvent('fermer'));
      else if (etat.fiche) fermerFiche({ rendreFocus: true });
    },
  },
});
addEventListener('keydown', (e) => { if (e.key === 'Tab') aTabule = true; }, true);
$('#saut-cv').addEventListener('click', (e) => { e.preventDefault(); ouvrirCv({ onglet: 'complet', declencheur: $('#cv-complet') }); });
$('#am-passer')?.addEventListener('click', () => { if (terminal) terminal.passer(); }); // absent si le filet de 6 s a remplacé le panneau
$('#rail').addEventListener('pointerdown', masquerIndice);
mediaReduit.addEventListener('change', appliquerAnimations);
let minuterieRedimension = 0;
addEventListener('resize', () => {
  clearTimeout(minuterieRedimension);
  minuterieRedimension = setTimeout(() => { carte.redimensionner(); if (etat.fiche) ouvrirFicheNiveau(etat.selection); }, DELAI_REDIMENSION_MS);
});
addEventListener('pagehide', () => carte.liberer()); // plafonds mémoire des canvas d'iOS (spec, risque 2)
addEventListener('pageshow', (e) => { if (e.persisted) carte.redimensionner(); });

window.__cpcPret = true;
html.dataset.ecran = etat.ecran;
appliquerAnimations();
rafraichir();

async function capturerCarte() {
  if (!params.capture) return;
  await document.fonts.ready;
  await new Promise((r) => setTimeout(r, 60));
  carte.capturer(params.t === null ? 12000 : params.t);
  if (etat.fiche && !mediaMobile.matches) fiche.positionner(carte.ancres().get(etat.selection), { hautBarre: hauteurBarre(), basRail: $('#rail').offsetHeight + 16 });
  document.title = 'CAPTURE PRETE';
}

const passeAvantModule = (window.__cpc && window.__cpc.passer) || !!$('#amorcage .am-echec'); // module arrivé après le filet : carte directe
const idDirect = params.jeu || params.niveau;
if (params.boot && !passeAvantModule) {
  carte.selectionner(etat.selection, { instantane: true, depuis: estReduit() || params.capture ? 0 : -120 });
  demarrerAmorcage();
} else {
  $('#amorcage').hidden = true;
  if (idDirect) envoyer({ type: 'SELECTIONNER', id: idDirect });
  carte.selectionner(etat.selection, { instantane: true });
  entrerCarte({ focus: !params.capture && !idDirect && !params.cv });
  if (params.jeu) { if (params.capture) carte.capturer(12000); jouer(params.jeu); }
  else if (params.niveau) ouvrirFicheNiveau(params.niveau, { focus: !params.capture });
  else if (params.cv) ouvrirCv({ onglet: params.cv.onglet, ancre: params.cv.ancre, historique: false });
  if (!params.jeu) capturerCarte();
}
