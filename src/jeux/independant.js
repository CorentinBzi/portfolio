// QUARTIER 5 — INDÉPENDANT — verbe AUTOMATISER — « Du geste à l'outil »
//
// Le phare-trieur en coupe : une constellation « Internet » envoie des courriers vers la porte
// d'un domaine fictif ; au pied du phare, une salle de tri ; dans la lanterne, un orbe
// « modèle de langage (API) ». (1) Le geste : trier à la main des rapports DMARC jusqu'à ne plus
// suivre, sans défaite possible. (2) p=reject sans casser le courrier : corriger les sources,
// monter la politique d'un cran par journée. (3) La veille qui n'invente rien : composer la
// consigne d'un modèle ; les badges des fiches sont déterminés par les étiquettes choisies.
// Aucun fait de parcours ici : l'écran de fin cite api.FAITS. Domaine .example, IP RFC 5737.

import { creerCadre, attendre } from './_contrat.js';
import { FAITS } from '../cv.js';

const ID = 'independant', DOMAINE = 'atelier-fictif.example';
const SCENE_HAUT = '#3A2A4A', SCENE_BAS = '#2A2346', PANNEAU = '#232A5E', LIGNE = 'rgba(160,170,255,.28)';
const TEXTE = '#EEF1FF', TEXTE_2 = '#B9C0E8', DATA = '#9FE8FF', OK = '#6FCF8E', ANOMALIE = '#E8503A';
const ANOMALIE_TEXTE = '#FF8A76', AMBRE = '#FFB86B', OR = '#FFD166', MAGENTA = '#FF6FD8', VIOLET = '#B98BFF', SPAM = '#A99CC8';
const INTERVALLE_MS = 40, VITESSE_RESOLUTION = 10, PAS_MAX = 0.1;
const ACTE1_DUREE = 25, SEUIL_FILE = 10, VOL_ARRIVEE = 0.8, VOL_BAC = 0.35;
const DUREE_TRANSITION = 1.2, DUREE_JOURNEE = 10, VOL_JOURNEE = 1.1, DUREE_CARTE = 0.7;
const TIERS = ['none', 'quarantine', 'reject'];

const mulberry32 = a => () => {
  a |= 0; a = a + 0x6D2B79F5 | 0;
  let t = Math.imul(a ^ a >>> 15, 1 | a);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
};
const borne = (v, a, b) => Math.max(a, Math.min(b, v));
const lisse = p => p * p * (3 - 2 * p);
const nombre = n => n.toLocaleString('fr-FR');
const pluriel = (n, mot) => `${n} ${mot}${n > 1 ? 's' : ''}`;
const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${n >> 8 & 255},${n & 255},${a})`; };

// --- Acte 1 : rapports à trier (noeud = index dans SOURCES) ---------------------------------
const BACS = [{ id: 'legitime', nom: 'Légitime', touche: '1', couleur: OK },
  { id: 'usurpation', nom: 'Usurpation', touche: '2', couleur: ANOMALIE_TEXTE },
  { id: 'service', nom: 'Service à déclarer', touche: '3', couleur: AMBRE }];
const TYPES_RAPPORT = [
  { nature: 'legitime', source: 'serveur interne', noeud: 0, spf: true, dkim: true, align: true, poids: 3 },
  { nature: 'service', source: 'outil de facturation', noeud: 2, spf: true, dkim: true, align: false, poids: 3 },
  { nature: 'usurpation', source: '198.51.100.7', noeud: 5, spf: false, dkim: false, align: false, poids: 2 },
  { nature: 'legitime', source: "lettre d'information", noeud: 1, spf: true, dkim: true, align: true, poids: 2 },
  { nature: 'legitime', source: 'liste de diffusion', noeud: 4, spf: false, dkim: true, align: true, poids: 2 },
  { nature: 'usurpation', source: '203.0.113.9', noeud: 6, spf: false, dkim: false, align: false, poids: 1 },
  { nature: 'usurpation', source: '203.0.113.44', noeud: 7, spf: false, dkim: false, align: false, poids: 1 },
];
const SUITE_RAPPORTS = (() => {
  const r = mulberry32(2023), total = TYPES_RAPPORT.reduce((n, t) => n + t.poids, 0);
  const tirer = () => { let x = r() * total; return TYPES_RAPPORT.find(t => (x -= t.poids) < 0) || TYPES_RAPPORT[0]; };
  return TYPES_RAPPORT.slice(0, 5).concat(Array.from({ length: 95 }, tirer));
})();
const tampons = r => `SPF ${r.spf ? '✓' : '✗'} · DKIM ${r.dkim ? '✓' : '✗'} · alignement ${r.align ? '✓' : '✗'}`;
const explicationTri = r => `${r.source} (${tampons(r)}) : ` + (r.nature === 'legitime' ? "un tampon passe et s'aligne sur le domaine, c'est légitime."
  : r.nature === 'service' ? "ça passe, mais au nom d'un prestataire. Service à déclarer." : 'rien ne passe. Usurpation.');

// --- Acte 2 : le rapport agrégé (spf/dkim = alignés au départ) ------------------------------
const SOURCES = [
  { id: 'interne', nom: 'serveur interne 192.0.2.10', court: 'interne', volume: 1200, spf: true, dkim: true, legitime: true, detail: 'adresse de retour du domaine, signe au nom du domaine', effet: 'courriers internes' },
  { id: 'lettre', nom: "lettre d'information", court: 'lettre', volume: 900, spf: true, dkim: true, legitime: true, detail: 'plateforme déjà déclarée dans SPF, signe au nom du domaine', effet: "lettre d'information" },
  { id: 'facturation', nom: 'outil de facturation', court: 'factures', volume: 180, spf: false, dkim: false, legitime: true, detail: 'adresse de retour chez le prestataire ; signe en DKIM, mais au nom du prestataire', effet: 'factures clients' },
  { id: 'crm', nom: 'CRM', court: 'CRM', volume: 260, spf: false, dkim: false, legitime: true, detail: 'adresse de retour du domaine, mais son include SPF est absent ; ne sait pas signer en DKIM', effet: 'relances commerciales' },
  { id: 'liste', nom: 'liste de diffusion (transfert)', court: 'liste', volume: 70, spf: false, dkim: true, legitime: true, detail: "le transfert réécrit l'adresse de retour ; la signature DKIM du domaine survit", effet: 'messages de la liste' },
  ...[['u1', '198.51.100.7', 3400], ['u2', '203.0.113.9', 1100], ['u3', '203.0.113.44', 650]].map(([id, ip, volume]) =>
    ({ id, nom: ip, court: ip, volume, spf: false, dkim: false, legitime: false, detail: 'aucune signature' })),
];
const ACTIONS = [['rien', 'Ne rien faire'], ['spf', 'Autoriser dans SPF'], ['dkim', 'Demander la signature DKIM']];

function etatSource(s, action) {
  const autorise = !s.legitime && action === 'spf';
  const spf = s.spf || autorise || (s.id === 'crm' && action === 'spf');
  const dkim = s.dkim || (s.id === 'facturation' && action === 'dkim');
  return { spf, dkim, aligne: spf || dkim, autorise };
}
function noteAction(s, action) {
  if (!s.legitime) return action === 'spf' ? { ko: true, t: `${s.nom} ne t'appartient pas : l'autoriser, c'est signer l'usurpation.` }
    : { t: action === 'dkim' ? "Personne à qui demander : cette source n'est pas à toi." : '' };
  if (action === 'rien') return { t: s.spf || s.dkim ? 'Déjà aligné.' : '' };
  if (s.id === 'crm') return action === 'spf' ? { ok: true, t: 'Include ajouté : le CRM passe SPF, aligné sur le domaine.' } : { t: 'Sans effet : le CRM ne sait pas signer en DKIM.' };
  if (s.id === 'facturation') return action === 'dkim' ? { ok: true, t: 'Le prestataire signe désormais au nom du domaine : DKIM aligné.' } : { t: "Sans effet : l'adresse de retour reste chez le prestataire, SPF ne s'alignera pas." };
  if (s.id === 'liste') return { t: action === 'spf' ? "Sans effet : le transfert réécrit l'adresse de retour. DKIM aligné suffit déjà." : 'Déjà signé au nom du domaine.' };
  return { t: 'Déjà aligné : rien à changer.' };
}
function resultatJournee(actions, politique) {
  const lignes = SOURCES.map(s => {
    const e = etatSource(s, actions[s.id]);
    return { s, ...e, sort: e.aligne || politique === 0 ? 'delivre' : politique === 1 ? 'indesirable' : 'rejete' };
  });
  const volume = f => lignes.filter(f).reduce((n, l) => n + l.s.volume, 0);
  return { lignes, delivres: volume(l => l.sort === 'delivre'), indesirables: volume(l => l.sort === 'indesirable'), rejetes: volume(l => l.sort === 'rejete'),
    legitRejetes: lignes.filter(l => l.s.legitime && l.sort === 'rejete'), legitIndesirables: lignes.filter(l => l.s.legitime && l.sort === 'indesirable'),
    usurpDelivrees: volume(l => !l.s.legitime && l.sort === 'delivre'), usurpAutorisees: lignes.filter(l => l.autorise).length };
}

// --- Acte 3 : la veille (articles et produits fictifs) --------------------------------------
const PRODUITS = ['messagerie', 'pare-feu', 'VPN', 'CRM'];
const ARTICLES = [
  { titre: 'Faille corrigée dans un serveur de messagerie', produit: 'messagerie', suivi: true, gravite: 'élevée', ref: true, resume: 'correctif publié, mise à jour conseillée' },
  { titre: 'Console de jeux : sortie avancée', produit: 'console de jeux', suivi: false },
  { titre: 'Pare-feu : correctif publié, gravité non communiquée', produit: 'pare-feu', suivi: true, gravite: null, ref: true, resume: 'faille de filtrage corrigée' },
  { titre: 'Montre connectée : autonomie en hausse', produit: 'montre connectée', suivi: false },
  { titre: "VPN : contournement d'authentification signalé, sans identifiant", produit: 'VPN', suivi: true, gravite: 'critique', ref: false, resume: "contournement d'authentification, mesure provisoire proposée" },
  { titre: 'Covoiturage : fuite de données annoncée', produit: 'application de covoiturage', suivi: false },
  { titre: 'Imprimante 3D : défaut de buse', produit: 'imprimante 3D', suivi: false },
  { titre: 'Montage vidéo : version 12', produit: 'logiciel de montage', suivi: false },
];
const ETIQUETTES = [['creatif', 'Sois exhaustif et créatif'], ['format', 'Réponds uniquement au format : produit · gravité · résumé · lien source'],
  ['complete', 'Complète les identifiants manquants'], ['ignore', 'Ignore ce qui ne concerne pas notre liste de produits'], ['mots300', 'Résume en 300 mots'],
  ['nonprecise', "Si l'information n'est pas dans l'article, écris : non précisé"], ['critique', 'Classe tout en critique par précaution']].map(([id, texte]) => ({ id, texte }));
const BONNES = ['format', 'ignore', 'nonprecise'];
const BADGES = { utile: ['✓ utile', OK], horssujet: ['⚠ hors sujet', AMBRE], invente: ['✗ inventé', ANOMALIE_TEXTE],
  format: ['✗ format', ANOMALIE_TEXTE], fatigue: ["fatigue d'alerte", ANOMALIE_TEXTE], ecarte: ['écarté', TEXTE_2] };

function evaluer(ids) {
  const a = new Set(ids), cibleCreative = ARTICLES.find(x => x.suivi && x.ref && x.gravite);
  const fiches = ARTICLES.map((art, k) => {
    const lien = `source : article fictif ${k + 1}`;
    if (!art.suivi) return a.has('ignore') ? { art, badges: ['ecarte'], sortie: 'écarté : hors de la liste suivie' }
      : { art, badges: ['horssujet'], sortie: `${art.produit} · ${a.has('critique') ? 'critique' : 'faible'} · hors liste, fiche produite quand même · ${lien}` };
    const inventeRef = !art.ref && (a.has('complete') || !a.has('nonprecise'));
    const inventeGravite = !art.gravite && !a.has('nonprecise');
    const inventeCreatif = art === cibleCreative && a.has('creatif');
    const gravite = a.has('critique') ? 'critique' : art.gravite || (inventeGravite ? 'élevée' : 'non précisé');
    const resume = art.resume + (inventeRef ? ' · CVE-2099-XXXX' : art.ref ? '' : ' · identifiant non précisé') + (inventeCreatif ? ' · exploit public disponible' : '');
    const badges = [inventeRef || inventeGravite || inventeCreatif ? 'invente' : '', !a.has('format') || a.has('mots300') ? 'format' : '', a.has('critique') ? 'fatigue' : ''].filter(Boolean);
    const sortie = badges.includes('format') ? `« ${art.titre} » : un long texte en prose${a.has('mots300') ? ' de 300 mots' : ''}, sans les champs attendus…`
      : `${art.produit} · ${gravite} · ${resume} · ${lien}`;
    return { art, badges: badges.length ? badges : ['utile'], sortie };
  });
  const compte = b => fiches.filter(f => f.badges.includes(b)).length;
  const totaux = { utile: compte('utile'), horssujet: compte('horssujet'), invente: compte('invente'), format: compte('format'), fatigue: compte('fatigue') };
  return { fiches, totaux, gagne: totaux.utile === 3 && totaux.horssujet + totaux.invente + totaux.format + totaux.fatigue === 0 };
}
const indiceVeille = t => t.invente ? "Le modèle a comblé des trous : dis-lui quoi écrire quand l'article ne sait pas, et ne l'invite ni à compléter ni à créer."
  : t.horssujet ? 'Des fiches parlent de produits que personne ne suit : il manque une étiquette qui écarte le reste.'
  : t.format ? 'Ces fiches ne se relisent pas par un script : impose le format, sans longueur en mots.'
  : t.fatigue ? "Tout en critique, plus rien ne l'est : retire la précaution."
  : "Trois défauts à fermer : le hors sujet, l'invention, le hors format. Chaque étiquette juste en ferme un.";

const M = '"IBM Plex Mono",ui-monospace,monospace', A = '"Archivo",system-ui,sans-serif';
const CSS = `
.in-scene{flex:1;min-width:0;min-height:0;position:relative;overflow:hidden;background:linear-gradient(${SCENE_HAUT},${SCENE_BAS})}
.in-scene canvas{position:absolute;inset:0;display:block;touch-action:manipulation}.in-scene canvas.main{cursor:pointer}
.in-hud,.in-legende{position:absolute;display:flex;flex-wrap:wrap;gap:4px 14px;background:rgba(42,35,70,.84);border:1px solid ${LIGNE};border-radius:10px;color:${TEXTE_2};pointer-events:none}
.in-hud{left:12px;top:10px;padding:7px 12px;max-width:calc(100% - 24px);font-size:12px}.in-hud b{color:${DATA};font-weight:500}.in-hud .ko{color:${ANOMALIE_TEXTE}}
.in-legende{right:12px;top:10px;padding:2px 9px;font-size:10.5px}
.in-panneau{width:min(44%,500px);flex:none;overflow:auto;display:flex;flex-direction:column;gap:11px;padding:14px 16px 18px;background:linear-gradient(#2C2A5E,${PANNEAU});border-left:1px solid ${LIGNE};color:${TEXTE};font:13px/1.5 ${M}}
.in-panneau>*,.in-contenu>*{flex:none}.in-contenu{display:flex;flex-direction:column;gap:11px}
.in-etapes{display:flex;gap:6px;margin:0;padding:0;list-style:none}
.in-etapes li{flex:1;font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:${TEXTE_2};border-bottom:3px solid rgba(160,170,255,.22);padding-bottom:4px}
.in-etapes li.actif{color:${TEXTE};border-color:var(--acc)}.in-etapes li.fait{color:${OK};border-color:${OK}}
.in-panneau h3{font:800 19px/1.2 ${A};font-stretch:125%;letter-spacing:.01em;margin:0}.in-panneau h3:focus{outline:none}
.in-panneau p{margin:0;color:${TEXTE_2}}.in-panneau b{color:${TEXTE};font-weight:600}
.in-regle{background:rgba(255,154,92,.1);border:1px solid rgba(255,154,92,.5);border-radius:12px;padding:8px 11px;font-size:12px}
.in-carte{background:rgba(20,24,62,.5);border:1px solid ${LIGNE};border-radius:12px;padding:9px 11px;display:grid;gap:6px}
.in-ligne{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
.in-puce{display:inline-flex;padding:2px 8px;border-radius:8px;border:1px solid ${LIGNE};font-size:12px}
.in-puce.oui{border-color:${OK};color:${OK}}.in-puce.non{border-color:${ANOMALIE_TEXTE};color:${ANOMALIE_TEXTE}}
.in-bacs,.in-crans{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.in-panneau button.in-b{min-height:48px;border-radius:12px;border:2px solid var(--c,${LIGNE});background:rgba(20,24,62,.55);color:${TEXTE};font:600 13px/1.25 ${A};cursor:pointer;padding:6px 9px}
.in-panneau button.in-b:hover:not([disabled]){background:rgba(255,154,92,.18)}.in-panneau button.in-b small{display:block;font:500 11px ${M};color:${TEXTE_2}}
.in-panneau button.in-b[disabled]{opacity:.55;cursor:default}.in-panneau button.in-b.actif{background:var(--acc);border-color:var(--acc);color:#1A1633;opacity:1}
.in-panneau button[aria-pressed=true]{border-color:var(--acc);opacity:.75}
.in-panneau button:focus-visible,.in-panneau select:focus-visible,.in-panneau input:focus-visible{outline:2px solid #FFE08A;outline-offset:2px;box-shadow:0 0 0 5px rgba(11,14,42,.9)}
.in-panneau .jx-btn{min-height:44px}.in-panneau input[type=range]{width:100%;min-height:36px;accent-color:#FF9A5C;margin:0}
.in-sources,.in-fiches{margin:0;padding:0;list-style:none;display:grid;gap:8px}
.in-src{background:rgba(20,24,62,.5);border:1px solid ${LIGNE};border-left:4px solid var(--c,${LIGNE});border-radius:10px;padding:8px 10px;display:grid;gap:5px}
.in-src.vise{box-shadow:0 0 0 2px var(--acc)}.in-src small,.in-fiche small{display:block;color:${TEXTE_2};font-size:11.5px;line-height:1.35}
.in-src .in-tete{display:flex;justify-content:space-between;gap:8px}
.in-barre{height:6px;background:rgba(160,170,255,.16);border-radius:3px;overflow:hidden}.in-barre i{display:block;height:100%;background:${DATA}}
.in-panneau select{flex:1 1 190px;min-height:44px;background:#1A1F4D;color:${TEXTE};border:1px solid ${LIGNE};border-radius:8px;font:12.5px ${M};padding:0 8px}
.in-note{font-size:11.5px;color:${TEXTE_2}}.in-note.ko,.in-res.ko{color:${ANOMALIE_TEXTE}}.in-note.ok,.in-res.ok{color:${OK}}.in-res{font-size:12px}.in-res.gris{color:${SPAM}}
.in-note button{margin-left:6px;min-height:36px;background:transparent;color:${OR};border:1px solid ${OR};border-radius:8px;font:600 11px ${M};cursor:pointer}
.in-consigne{background:#1A1F4D;border:1px solid ${LIGNE};border-radius:12px;padding:10px;display:grid;gap:6px}
.in-panneau button.in-fente{min-height:44px;text-align:left;border:1px dashed rgba(255,154,92,.7);border-radius:8px;background:transparent;color:${TEXTE_2};padding:6px 10px;font:12.5px/1.35 ${M};cursor:pointer}
.in-panneau button.in-fente.pleine{border-style:solid;background:rgba(255,154,92,.14);color:${TEXTE}}
.in-etiquettes{display:grid;gap:6px}.in-panneau .in-etiquettes button.in-b{text-align:left;font:500 12.5px/1.35 ${M}}
.in-fiche{background:rgba(20,24,62,.5);border:1px solid ${LIGNE};border-radius:10px;padding:6px 10px;font-size:12px}
.in-badge{display:inline-block;margin:2px 6px 2px 0;padding:0 7px;border-radius:7px;border:1px solid currentColor;font-size:11px}
.in-annonce{min-height:1.5em;border-left:3px solid var(--acc);padding:2px 0 2px 9px;font-size:12.5px}.in-annonce.ko{border-color:${ANOMALIE_TEXTE}}.in-annonce.ok{border-color:${OK}}
.in-appel{animation:in-pulse 1.1s ease-in-out infinite}@keyframes in-pulse{50%{box-shadow:0 0 0 7px rgba(255,154,92,.35)}}
@media (prefers-reduced-motion:reduce){.in-appel{animation:none;box-shadow:0 0 0 4px rgba(255,154,92,.45)}}
@media (max-width:760px){.in-scene{flex:none;height:36%;min-height:210px}.in-legende{display:none}.in-panneau h3{font-size:16px}
  .in-panneau{width:auto;flex:1;min-height:0;border-left:0;border-top:1px solid ${LIGNE};padding:10px 12px 14px}.in-hud{font-size:11px;gap:2px 10px;padding:4px 8px;left:8px;top:6px}}`;

// Constellation « Internet » : un nœud par source (index de SOURCES), en fractions de la scène.
const POS_SOURCES = [[0.07, 0.25], [0.18, 0.15], [0.3, 0.27], [0.43, 0.15], [0.54, 0.31], [0.1, 0.46], [0.26, 0.43], [0.41, 0.47]];
const ARETES = [[0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [2, 6], [4, 7], [1, 6], [3, 7]];
const ETOILES = (() => { const r = mulberry32(77); return Array.from({ length: 70 }, () => [r(), r() * 0.5, 0.5 + r() * 1.2, r() * 6]); })();
const ILES = [[0.02, 0.2, 0.5], [0.24, 0.16, 0.8], [0.46, 0.22, 0.45], [0.9, 0.14, 0.6]];
const TITRE = "Du geste à l'outil";

export default {
  id: ID,
  ordre: 4,
  titre: TITRE,
  employeur: FAITS[ID].employeur,
  annees: FAITS[ID].periode,
  factKey: ID,
  verbe: 'AUTOMATISER',
  accent: '#FF9A5C',
  description: "Des rapports DMARC arrivent plus vite qu'on ne les trie. Trier à la main jusqu'à ne plus suivre, faire passer le domaine en p=reject sans perdre un courrier légitime, puis écrire la consigne d'un modèle de veille qui n'invente rien.",

  monter(conteneur, api) {
    const reduit = api.mouvementReduit ?? matchMedia('(prefers-reduced-motion: reduce)').matches;
    const cadre = creerCadre(conteneur, { titre: TITRE, employeur: FAITS[ID].employeur, annees: FAITS[ID].periode, verbe: 'AUTOMATISER', accent: api.accent,
      consigne: "Trie à la main, puis construis l'outil. Passe le domaine en p=reject sans perdre un courrier légitime. Écris une consigne de veille qui n'invente rien." });
    const style = document.createElement('style');
    style.id = 'jeu-independant-styles';
    style.textContent = CSS;
    cadre.racine.prepend(style);
    const scene = document.createElement('div');
    scene.className = 'in-scene';
    scene.innerHTML = `<canvas aria-hidden="true"></canvas><div class="in-hud"></div><div class="in-legende">domaine fictif · adresses de documentation · articles fictifs</div>`;
    const panneau = document.createElement('div');
    panneau.className = 'in-panneau';
    panneau.innerHTML = `<ol class="in-etapes" aria-label="Actes"><li>1 · Le geste</li><li>2 · p=reject</li><li>3 · La veille</li></ol>
      <div class="in-annonce" role="status" aria-live="polite"></div><div class="in-contenu"></div>`;
    cadre.corps.append(scene, panneau);
    const canvas = scene.querySelector('canvas'), ctx = canvas.getContext('2d'), hud = scene.querySelector('.in-hud');
    const contenu = panneau.querySelector('.in-contenu'), annonceEl = panneau.querySelector('.in-annonce');

    let vivant = true, enPause = false, vitesse = 1, animation = 0, dernierDessin = 0;
    let tSim = 0, tAmb = reduit ? 4.4 : 0, flash = 0, alerte = 0, alerteTexte = '';
    let acte = 1;                                   // 1 | 'transition' | 2 | 3
    let W = 1, H = 1, dpr = 1, G = null, sourceVisee = -1, hudHtml = '', courantHtml = '';
    // acte 1
    let file = [], prochainRapport = 0, prochaineArrivee = 0.4, tries = 0, justes = 0, volsBac = [], deborde = false;
    const parBac = { legitime: 0, usurpation: 0, service: 0 };
    // transition et acte 2
    let tTransition = 0, fileGelee = [], actions = Object.fromEntries(SOURCES.map(s => [s.id, 'rien']));
    let politique = 0, journee = null, jours = [], quarantaineFaite = false, legitRejetesCumul = 0, acte2Gagne = false, dernier = null;
    // acte 3
    let fentes = [null, null, null], essais3 = 0, passage = null, acte3Gagne = false, finAffichee = false, derniereEval = null;

    function annoncer(texte, etat) {
      annonceEl.textContent = texte;
      annonceEl.className = 'in-annonce' + (etat ? ' ' + etat : '');
    }

    // --- géométrie --------------------------------------------------------
    function redimensionner() {
      const r = scene.getBoundingClientRect();
      W = Math.max(1, r.width); H = Math.max(1, r.height);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      canvas.style.width = `${W}px`; canvas.style.height = `${H}px`;
      const e = borne(Math.min(W / 820, H / 600), 0.62, 1.3), sol = H * 0.62, tw = Math.max(30, Math.min(W * 0.13, H * 0.19)), tx = W * 0.8;
      G = { e, sol, tw, tx, orbeY: H * 0.17, hautY: H * 0.245, tapisY: sol + (H - sol) * 0.36, tete: W * 0.47, tubeX: tx - tw * 0.95 };
      dessiner();
    }
    const observateur = new ResizeObserver(redimensionner);
    observateur.observe(scene);

    const police = (taille, poids = 500) => `${poids} ${Math.max(9, taille * G.e).toFixed(1)}px ${M}`;
    const noeud = i => [POS_SOURCES[i][0] * W, POS_SOURCES[i][1] * H];
    const porte = () => [G.tx, G.sol - Math.min(G.tw * 0.25, H * 0.05)];

    function halo(x, y, r, couleur, a) {
      const g = ctx.createRadialGradient(x, y, 0, x, y, Math.max(1, r));
      g.addColorStop(0, rgba(couleur, a)); g.addColorStop(1, rgba(couleur, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, Math.max(1, r), 0, Math.PI * 2); ctx.fill();
    }
    function etiquette(txt, x, y, { couleur = TEXTE, fond = 'rgba(42,35,70,.86)', taille = 10.5, bord = null, align = 'center' } = {}) {
      ctx.font = police(taille);
      const w = ctx.measureText(txt).width + 12 * G.e, h = (taille + 7) * G.e, x0 = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
      ctx.fillStyle = fond; ctx.beginPath(); ctx.roundRect(x0, y - h / 2, w, h, 6 * G.e); ctx.fill();
      if (bord) { ctx.strokeStyle = bord; ctx.lineWidth = 1; ctx.stroke(); }
      ctx.fillStyle = couleur; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(txt, x0 + w / 2, y + 0.5);
    }
    function enveloppe(x, y, w, { alpha = 1, teinte = '#FFF3E4', rapport = null, lueur = null } = {}) {
      const h = w * 0.64;
      ctx.save(); ctx.globalAlpha = alpha;
      if (lueur) halo(x, y, w * 1.1, lueur, 0.55);
      ctx.fillStyle = 'rgba(20,16,40,.32)'; ctx.fillRect(x - w / 2 + 2, y - h / 2 + 3, w, h);
      ctx.fillStyle = teinte; ctx.fillRect(x - w / 2, y - h / 2, w, h);
      ctx.strokeStyle = '#B98B8B'; ctx.lineWidth = 1; ctx.strokeRect(x - w / 2, y - h / 2, w, h);
      ctx.beginPath(); ctx.moveTo(x - w / 2, y - h / 2); ctx.lineTo(x, y + h * 0.06); ctx.lineTo(x + w / 2, y - h / 2); ctx.stroke();
      (rapport && w >= 30 ? [rapport.spf, rapport.dkim, rapport.align] : []).forEach((v, k) => {
        const cx = x - w * 0.3 + k * w * 0.3, cy = y + h * 0.24, r = w * 0.11;
        ctx.fillStyle = v ? '#3E9E62' : '#C8412E'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#FFFFFF'; ctx.font = `700 ${(r * 1.3).toFixed(1)}px system-ui,sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(v ? '✓' : '✗', cx, cy + 0.5);
      });
      ctx.restore();
    }
    // Arc d'un point à un autre ; en mouvement réduit, trois positions seulement.
    function arc([x0, y0], [x1, y1], p) {
      const q = reduit ? Math.round(p * 2) / 2 : p, cy = Math.min(y0, y1) - Math.abs(x1 - x0) * 0.25;
      return [x0 + (x1 - x0) * q, (1 - q) * (1 - q) * y0 + 2 * (1 - q) * q * cy + q * q * y1];
    }

    // --- décor ------------------------------------------------------------
    function fond() {
      const g = ctx.createLinearGradient(0, 0, 0, G.sol), hy = G.sol - H * 0.13;
      g.addColorStop(0, SCENE_BAS); g.addColorStop(0.5, SCENE_HAUT); g.addColorStop(1, '#9A6280');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, G.sol);
      halo(G.tx, G.orbeY, Math.max(W, H) * 0.55, '#FFB38A', 0.22);
      for (const [x, y, r, ph] of ETOILES) { ctx.fillStyle = rgba('#FFF1C9', 0.3 + 0.3 * Math.sin(tAmb * 1.3 + ph)); ctx.fillRect(x * W, y * H, r, r); }
      ctx.fillStyle = '#B49BCB';
      for (const [x, larg, haut] of ILES) {
        ctx.beginPath(); ctx.moveTo(x * W, hy);
        ctx.quadraticCurveTo((x + larg * 0.3) * W, hy - H * 0.05 * haut, (x + larg * 0.55) * W, hy - H * 0.03 * haut);
        ctx.quadraticCurveTo((x + larg * 0.8) * W, hy - H * 0.06 * haut, (x + larg) * W, hy); ctx.fill();
      }
      const m = ctx.createLinearGradient(0, hy, 0, G.sol);
      m.addColorStop(0, '#9A86C6'); m.addColorStop(1, '#5B4A93');
      ctx.fillStyle = m; ctx.fillRect(0, hy, W, G.sol - hy);
      for (let k = 0; k < 7; k++) {
        const l = G.tw * (0.5 + 0.25 * Math.sin(tAmb * 0.9 + k * 1.7));
        ctx.fillStyle = rgba('#FFC7A0', 0.45 - k * 0.05); ctx.fillRect(G.tx - l / 2 - W * 0.12, hy + (G.sol - hy) * (0.15 + k * 0.12), l, 1.5);
      }
    }
    function constellation() {
      const actif = acte === 2 || acte === 3;
      ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(200,190,255,.4)';
      ARETES.forEach(([a, b], k) => {
        const [x0, y0] = noeud(a), [x1, y1] = noeud(b), p = (tAmb * 0.3 + k * 0.37) % 1;
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
        if (!reduit) halo(x0 + (x1 - x0) * p, y0 + (y1 - y0) * p, 5 * G.e, DATA, 0.9);
      });
      if (W > 520) etiquette('INTERNET · 8 sources', noeud(1)[0], noeud(1)[1] - 20 * G.e, { couleur: TEXTE_2, taille: 10 });
      SOURCES.forEach((s, i) => {
        const [x, y] = noeud(i), c = actif && !s.legitime ? ANOMALIE_TEXTE : DATA;
        halo(x, y, 16 * G.e, c, 0.5);
        ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, 5 * G.e, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(x, y, 2 * G.e, 0, Math.PI * 2); ctx.fill();
        if (sourceVisee === i) { ctx.strokeStyle = OR; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 11 * G.e, 0, Math.PI * 2); ctx.stroke(); }
        if (actif && W > 520) etiquette(s.court, x + (i === 1 ? 30 * G.e : 0), y + (i === 1 ? 12 : 17) * G.e, { taille: 9.5, couleur: s.legitime ? TEXTE : ANOMALIE_TEXTE });
      });
    }
    function faisceau(devant) {
      const a = tAmb * Math.PI / 4, c = Math.cos(a), s = Math.sin(a);
      if ((s < 0) !== devant) return;
      const L = W * 1.05 * c, sp = H * (0.03 + 0.05 * Math.abs(s)), coul = alerte > 0 ? AMBRE : '#FFD9A8';
      const g = ctx.createLinearGradient(G.tx, G.orbeY, G.tx + L, G.orbeY);
      g.addColorStop(0, rgba(coul, (devant ? 0.6 : 0.3) + (alerte > 0 ? 0.25 : 0))); g.addColorStop(1, rgba(coul, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(G.tx, G.orbeY); ctx.lineTo(G.tx + L, G.orbeY - sp); ctx.lineTo(G.tx + L, G.orbeY + sp); ctx.closePath(); ctx.fill();
    }
    function tour() {
      const { tx, tw, sol, orbeY, hautY, e } = G, b2 = tw / 2, h2 = tw * 0.33;
      ctx.fillStyle = 'rgba(20,16,40,.35)'; ctx.beginPath(); ctx.ellipse(tx + tw * 0.4, sol, tw * 0.9, tw * 0.1, 0, 0, Math.PI * 2); ctx.fill();
      ctx.save();
      ctx.beginPath(); ctx.moveTo(tx - b2, sol); ctx.lineTo(tx - h2, hautY); ctx.lineTo(tx + h2, hautY); ctx.lineTo(tx + b2, sol); ctx.closePath(); ctx.clip();
      for (let i = 0; i < 6; i++) { ctx.fillStyle = i % 2 ? '#FFE3C4' : '#FF9A5C'; ctx.fillRect(tx - b2, sol - (sol - hautY) * (i + 1) / 6, tw, (sol - hautY) / 6 + 1); }
      const g = ctx.createLinearGradient(tx - b2, 0, tx + b2, 0);
      g.addColorStop(0, 'rgba(255,245,230,.3)'); g.addColorStop(0.45, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(42,35,70,.55)');
      ctx.fillStyle = g; ctx.fillRect(tx - b2, hautY, tw, sol - hautY);
      ctx.fillStyle = '#FFF1C9';
      for (let i = 1; i < 4; i++) ctx.fillRect(tx - 3 * e, sol - (sol - hautY) * i / 4 - 6 * e, 6 * e, 10 * e);
      ctx.restore();
      // porte du domaine : ouverte, grillée à moitié ou fermée selon la politique
      const [px, py] = porte(), pw = tw * 0.36, ph = sol - py + tw * 0.12, grille = acte === 2 || acte === 3 ? politique / 2 : 0;
      halo(px, py, pw * 1.4, '#FF9A5C', 0.45);
      ctx.fillStyle = '#FFE9C7'; ctx.beginPath(); ctx.moveTo(px - pw / 2, sol); ctx.lineTo(px - pw / 2, sol - ph + pw / 2);
      ctx.arc(px, sol - ph + pw / 2, pw / 2, Math.PI, 0); ctx.lineTo(px + pw / 2, sol); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#2A2346'; ctx.lineWidth = 2; ctx.stroke();
      ctx.lineWidth = 2 * e;
      for (let k = 1; k < 5 && grille > 0; k++) { const x = px - pw / 2 + pw * k / 5; ctx.beginPath(); ctx.moveTo(x, sol); ctx.lineTo(x, sol - (ph - 2) * grille); ctx.stroke(); }
      // lanterne et orbe du modèle
      const vy = orbeY - H * 0.06;
      ctx.fillStyle = '#2A2346'; ctx.fillRect(tx - tw * 0.42, hautY - 4 * e, tw * 0.84, 5 * e);
      ctx.fillStyle = 'rgba(255,227,196,.22)'; ctx.fillRect(tx - tw * 0.3, vy, tw * 0.6, hautY - 4 * e - vy);
      ctx.strokeStyle = '#FFC7A0'; ctx.lineWidth = 1.5; ctx.strokeRect(tx - tw * 0.3, vy, tw * 0.6, hautY - 4 * e - vy);
      ctx.fillStyle = '#4A3358'; ctx.beginPath(); ctx.moveTo(tx - tw * 0.36, vy); ctx.lineTo(tx, vy - tw * 0.3); ctx.lineTo(tx + tw * 0.36, vy); ctx.closePath(); ctx.fill(); ctx.stroke();
      if (reduit || Math.sin(tAmb * 4) > 0) halo(tx, vy - tw * 0.3, 7 * e, AMBRE, 0.95);
      const r = tw * 0.15 * (1 + 0.08 * Math.sin(tAmb * 1.6)) * (1 + flash * 0.35);
      halo(tx, orbeY, r * 3.4, MAGENTA, 0.35 + flash * 0.4);
      const o = ctx.createRadialGradient(tx - r * 0.3, orbeY - r * 0.3, 0, tx, orbeY, r);
      o.addColorStop(0, '#FFFFFF'); o.addColorStop(0.45, '#FFB8EC'); o.addColorStop(1, VIOLET);
      ctx.fillStyle = o; ctx.beginPath(); ctx.arc(tx, orbeY, r, 0, Math.PI * 2); ctx.fill();
      etiquette(DOMAINE, px, sol - ph - 11 * e, { taille: 9.5, bord: rgba('#FF9A5C', 0.7) });
    }
    // Étiquettes de la lanterne, dessinées en dernier pour rester lisibles sous le faisceau.
    function etiquettesLanterne() {
      etiquette('modèle de langage (API)', G.tx - G.tw * 0.42, G.orbeY, { align: 'right', taille: 10, bord: rgba(MAGENTA, 0.6) });
      if (alerte > 0) etiquette(alerteTexte, G.tx - G.tw * 0.42, G.orbeY + 24 * G.e, { align: 'right', taille: 10, fond: 'rgba(120,40,50,.92)', bord: AMBRE });
    }
    function pointTube(p) {
      const x1 = G.tx - G.tw * 0.3, y1 = G.hautY - 10 * G.e, lv = G.tapisY - y1, lh = x1 - G.tubeX, d = p * (lv + lh);
      return d < lv ? [G.tubeX, G.tapisY - d] : [G.tubeX + (d - lv), y1];
    }
    function tube() {
      const [xa, ya] = pointTube(0), [xb, yb] = pointTube(0.999), yc = G.hautY - 10 * G.e;
      for (const [larg, coul] of [[9, 'rgba(255,227,196,.28)'], [3, 'rgba(159,232,255,.45)']]) {
        ctx.strokeStyle = coul; ctx.lineWidth = larg * G.e; ctx.lineJoin = 'round';
        ctx.beginPath(); ctx.moveTo(xa, ya); ctx.lineTo(G.tubeX, yc); ctx.lineTo(xb, yb); ctx.stroke();
      }
      for (let k = 0; k < 3 && !reduit; k++) { const [x, y] = pointTube((tAmb * 0.18 + k / 3) % 1); halo(x, y, 7 * G.e, DATA, 0.8); }
    }
    function salle() {
      const { sol, e } = G, g = ctx.createLinearGradient(0, sol, 0, H), sy = G.tapisY + 16 * e;
      g.addColorStop(0, '#71527A'); g.addColorStop(1, '#4E3B62');
      ctx.fillStyle = g; ctx.fillRect(0, sol, W, H - sol);
      ctx.strokeStyle = 'rgba(255,225,205,.1)'; ctx.lineWidth = 1;
      for (let i = -7; i <= 7; i++) { ctx.beginPath(); ctx.moveTo(W * 0.45 + i * W * 0.03, sy); ctx.lineTo(W * 0.45 + i * W * 0.16, H); ctx.stroke(); }
      for (let k = 1; k < 4; k++) { const y = sy + (H - sy) * k * k / 10; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
      for (let k = 0; k < 4; k++) {
        const x = W * (0.1 + k * 0.2);
        ctx.strokeStyle = 'rgba(42,35,70,.8)'; ctx.beginPath(); ctx.moveTo(x, sol); ctx.lineTo(x, sol + 7 * e); ctx.stroke();
        halo(x, sol + 9 * e, 46 * e, '#FFD99A', 0.3); halo(x, sol + 9 * e, 4 * e, '#FFF1C9', 1);
      }
      ctx.fillStyle = '#2A2346'; ctx.fillRect(0, sol - 3 * e, W, 5 * e);
      ctx.fillStyle = 'rgba(255,199,160,.75)'; ctx.fillRect(0, sol - 3 * e, W, 1.2);
      ctx.strokeStyle = 'rgba(255,199,160,.3)'; ctx.strokeRect(3.5, sol + 2 * e, W - 7, H - sol - 5);
    }
    function tapis(x0, x1, decalage) {
      const y = G.tapisY, h = 8 * G.e, pas = 14 * G.e;
      ctx.fillStyle = 'rgba(20,16,40,.3)'; ctx.fillRect(x0, y + h + 6 * G.e, x1 - x0, 5 * G.e);
      ctx.fillStyle = '#2A2346';
      for (let x = x0 + 10; x < x1; x += 70 * G.e) ctx.fillRect(x, y + h, 3 * G.e, 12 * G.e);
      ctx.fillStyle = '#3A2C50'; ctx.fillRect(x0, y, x1 - x0, h);
      ctx.strokeStyle = 'rgba(255,220,200,.3)'; ctx.lineWidth = 1;
      for (let x = x0 + ((decalage * 30 * G.e) % pas); x < x1; x += pas) { ctx.beginPath(); ctx.moveTo(x, y + 1); ctx.lineTo(x, y + h - 1); ctx.stroke(); }
      ctx.fillStyle = 'rgba(255,199,160,.6)'; ctx.fillRect(x0, y, x1 - x0, 1.2);
    }

    // --- dessin des actes ---------------------------------------------------
    const bacX = k => W * (0.09 + k * 0.125);
    const posesSurTapis = () => file.filter(r => tSim - r.t0 >= VOL_ARRIVEE);
    const bac = () => [W * 0.71, H - 12 * G.e];

    function dessinerBacs() {
      BACS.forEach((b, k) => {
        const x = bacX(k), w = W * 0.1, y0 = G.tapisY + 26 * G.e, y1 = H - 10, d = 6 * G.e;
        ctx.fillStyle = 'rgba(20,16,40,.3)'; ctx.fillRect(x - w / 2 + 5, y1 - 3, w, 7);
        ctx.fillStyle = rgba(b.couleur, 0.35);
        ctx.beginPath(); ctx.moveTo(x - w / 2, y0); ctx.lineTo(x - w / 2 + d, y0 - d); ctx.lineTo(x + w / 2 + d, y0 - d); ctx.lineTo(x + w / 2, y0); ctx.fill();
        for (let j = 0; j < Math.min(parBac[b.id], 5); j++) enveloppe(x + (j % 2 ? 3 : -3), y0 + 2 - j * 2, w * 0.5, { alpha: 0.9 });
        const g = ctx.createLinearGradient(0, y0, 0, y1);
        g.addColorStop(0, '#46355E'); g.addColorStop(1, rgba(b.couleur, 0.28));
        ctx.fillStyle = g; ctx.fillRect(x - w / 2, y0, w, y1 - y0);
        ctx.strokeStyle = b.couleur; ctx.lineWidth = 2; ctx.strokeRect(x - w / 2, y0, w, y1 - y0);
        ctx.fillStyle = b.couleur; ctx.font = `800 ${(20 * G.e).toFixed(1)}px ${A}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(b.touche, x, (y0 + y1) / 2 + 2);
        if (W >= 600) etiquette(b.nom, x, y0 - 16 * G.e, { taille: 9, couleur: b.couleur });
      });
    }
    function dessinerActe1() {
      const x1 = G.tx - G.tw * 0.5, poses = posesSurTapis(), pas = Math.min(38 * G.e, (x1 - G.tete - 30 * G.e) / Math.max(1, poses.length - 1));
      tapis(W * 0.4, x1, tSim);
      dessinerBacs();
      file.forEach(r => {
        const p = (tSim - r.t0) / VOL_ARRIVEE;
        if (p >= 0 && p < 1) { const [x, y] = arc(noeud(r.type.noeud), porte(), p); enveloppe(x, y, 18 * G.e, { lueur: DATA }); }
      });
      for (let j = poses.length - 1; j > 0; j--) enveloppe(G.tete + 30 * G.e + (j - 1) * pas, G.tapisY - 9 * G.e, 22 * G.e);
      if (poses[0]) {
        const w = 58 * G.e, y = G.tapisY - w * 0.36;
        enveloppe(G.tete, y, w, { rapport: poses[0].type, lueur: OR });
        etiquette('SPF · DKIM · ALIGN', G.tete, y - w * 0.32 - 10 * G.e, { taille: 8.5, bord: rgba(OR, 0.7) });
      }
      volsBac.forEach(v => {
        const [x, y] = arc([G.tete, G.tapisY - 20 * G.e], [bacX(v.k), G.tapisY + 24 * G.e], (tSim - v.t0) / VOL_BAC);
        enveloppe(x, y, 30 * G.e, { lueur: v.ok ? OK : ANOMALIE });
      });
      if (poses.length >= SEUIL_FILE) etiquette('Le geste ne tient pas le volume.', W * 0.36, G.sol - 20 * G.e, { taille: 12, fond: 'rgba(120,40,50,.9)', bord: ANOMALIE_TEXTE });
    }
    function barres(k) {
      const x0 = W * 0.04, base = H - 12 * G.e, hMax = base - G.sol - 34 * G.e, larg = W * 0.58 / SOURCES.length;
      etiquette('rapport agrégé · courriers par source et par jour', x0, G.sol + 14 * G.e, { align: 'left', taille: 9.5, couleur: TEXTE_2 });
      SOURCES.forEach((s, i) => {
        const h = hMax * Math.sqrt(s.volume / 3400) * k, x = x0 + i * larg + larg * 0.2, w = larg * 0.6, l = dernier && dernier.lignes[i];
        const c = !l ? DATA : l.sort === 'indesirable' ? SPAM : (l.sort === 'delivre') === s.legitime ? (s.legitime ? OK : AMBRE) : ANOMALIE;
        if (sourceVisee === i) halo(x + w / 2, base - h, w * 1.2, OR, 0.6);
        ctx.fillStyle = 'rgba(20,16,40,.3)'; ctx.fillRect(x + 4, base - h + 4, w, h);
        ctx.fillStyle = c; ctx.fillRect(x, base - h, w, h);
        ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.fillRect(x, base - h, w * 0.25, h);
        if (k > 0.9 && W > 520) etiquette(nombre(s.volume), x + w / 2, base - h - 9 * G.e, { taille: 8.5, couleur: s.legitime ? TEXTE : ANOMALIE_TEXTE });
      });
    }
    function dessinerTransition() {
      const k = lisse(borne((tSim - tTransition) / DUREE_TRANSITION, 0, 1));
      dessinerBacs();
      fileGelee.forEach((r, j) => {
        const x = G.tete + j * 20 * G.e, cible = W * 0.04 + (r.type.noeud + 0.5) * (W * 0.58 / SOURCES.length);
        enveloppe(x + (cible - x) * k, G.tapisY - 9 * G.e + (H - 30 * G.e - G.tapisY) * k, 22 * G.e * (1 - k * 0.7), { alpha: 1 - k });
      });
      barres(k);
    }
    function dessinerActe2() {
      const [bx, by] = bac(), [gx, gy] = porte(), e = G.e;
      barres(1);
      ctx.fillStyle = rgba(SPAM, 0.3); ctx.fillRect(bx - 26 * e, by - 26 * e, 52 * e, 26 * e);
      ctx.strokeStyle = SPAM; ctx.lineWidth = 2; ctx.strokeRect(bx - 26 * e, by - 26 * e, 52 * e, 26 * e);
      etiquette('indésirables', bx, by - 36 * e, { taille: 9, couleur: SPAM });
      (journee ? journee.vols : []).forEach(v => {
        const l = journee.res.lignes[v.i], p = (tSim - v.t0) / VOL_JOURNEE, q = (p - 1) / 0.6;
        if (p < 0 || q >= 1) return;
        if (p < 1) { const [x, y] = arc(noeud(v.i), [gx, gy], p); enveloppe(x, y, 14 * e, { lueur: l.s.legitime ? DATA : ANOMALIE_TEXTE }); }
        else if (l.sort === 'delivre') enveloppe(gx, gy - q * 22 * e, 14 * e, { alpha: 1 - q, lueur: l.s.legitime ? OK : ANOMALIE });
        else if (l.sort === 'indesirable') enveloppe(gx + (bx - gx) * q, gy + (by - 14 * e - gy) * q, 12 * e, { teinte: '#DDD3EE', lueur: SPAM });
        else {
          ctx.strokeStyle = rgba(l.s.legitime ? ANOMALIE : AMBRE, 1 - q); ctx.lineWidth = 2;
          for (let a = 0; a < 8; a++) {
            const c = Math.cos(a * Math.PI / 4), s = Math.sin(a * Math.PI / 4), r0 = (4 + q * 10) * e, r1 = r0 + 9 * e;
            ctx.beginPath(); ctx.moveTo(gx + c * r0, gy + s * r0); ctx.lineTo(gx + c * r1, gy + s * r1); ctx.stroke();
          }
        }
      });
    }
    function carte(x, y, devant, alpha = 1) {
      const w = 20 * G.e, h = 26 * G.e;
      ctx.save(); ctx.globalAlpha = alpha;
      ctx.fillStyle = 'rgba(20,16,40,.3)'; ctx.fillRect(x - w / 2 + 2, y - h / 2 + 3, w, h);
      ctx.fillStyle = '#FFF8EC'; ctx.fillRect(x - w / 2, y - h / 2, w, h);
      ctx.strokeStyle = '#B98B8B'; ctx.lineWidth = 1; ctx.strokeRect(x - w / 2, y - h / 2, w, h);
      ctx.fillStyle = '#C9A9B4';
      for (let k = 0; k < 4; k++) ctx.fillRect(x - w * 0.34, y - h * 0.3 + k * h * 0.17, w * (k === 0 ? 0.68 : 0.5), 1.6);
      ctx.restore();
      if (devant && W > 520) etiquette('article fictif', x, y - h / 2 - 9 * G.e, { taille: 8.5 });
    }
    function dessinerActe3() {
      const x1 = G.tubeX, tx = W * 0.93, ty = H - 12 * G.e, e = G.e, enCours = passage ? Math.floor((tSim - passage.t0) / DUREE_CARTE) : 0;
      const debut = passage ? enCours + 1 : acte3Gagne ? ARTICLES.length : 0, ev = passage ? passage.eval : derniereEval, n = passage ? passage.faites : ev ? ARTICLES.length : 0;
      tapis(W * 0.06, x1, passage ? tSim : 0);
      for (let k = ARTICLES.length - 1; k >= debut; k--) carte(x1 - 22 * e - (k - debut) * 26 * e, G.tapisY - 15 * e, k === debut);
      if (passage && enCours < ARTICLES.length) {
        const p = (tSim - passage.t0) / DUREE_CARTE - enCours, q = (p - 0.7) / 0.3, x0 = G.tx + G.tw * 0.35;
        if (p < 0.35) carte(x1 - 22 * e + (p / 0.35) * 22 * e, G.tapisY - 15 * e, false);
        else if (p < 0.7) { const [x, y] = pointTube((p - 0.35) / 0.35); carte(x, y, false, 0.85); }
        else enveloppe(x0 + (tx - x0) * q, G.orbeY + (ty - 20 * e - G.orbeY) * q, 16 * e, { teinte: '#FFF8EC', lueur: BADGES[passage.eval.fiches[enCours].badges[0]][1] });
      }
      ctx.fillStyle = '#3A2C50'; ctx.fillRect(tx - 22 * e, ty - 30 * e, 44 * e, 30 * e);
      for (let k = 0; k < n; k++) { ctx.fillStyle = BADGES[ev.fiches[k].badges[0]][1]; ctx.fillRect(tx - 18 * e, ty - 4 * e - k * 3.2 * e, 36 * e, 2.4 * e); }
      ctx.strokeStyle = '#FFC7A0'; ctx.lineWidth = 1.5; ctx.strokeRect(tx - 22 * e, ty - 30 * e, 44 * e, 30 * e);
      etiquette('fiches', tx, ty - 40 * e, { taille: 9 });
    }
    function dessiner() {
      if (!vivant || !G) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      fond(); constellation(); faisceau(false); tube(); tour(); faisceau(true); salle();
      if (acte === 1) dessinerActe1(); else if (acte === 'transition') dessinerTransition(); else if (acte === 2) dessinerActe2(); else dessinerActe3();
      etiquettesLanterne();
    }

    // --- horloge : temps simulé sur minuteur fixe, rAF ne fait que dessiner --
    function majHud() {
      const n = posesSurTapis().length;
      const h = acte === 1 ? `<span>file <b class="${n >= SEUIL_FILE ? 'ko' : ''}">${n}</b></span><span>triés <b>${tries}</b></span><span>justes <b>${justes}</b></span><span>reste <b>${Math.max(0, Math.ceil(ACTE1_DUREE - tSim))} s</b></span>`
        : acte === 'transition' ? '<span>agrégation des rapports…</span>'
        : acte === 2 ? `<span>politique <b>p=${TIERS[politique]}</b></span><span>journée <b>${jours.length + (journee ? 1 : 0)}</b></span>${journee ? `<span>en cours <b>${Math.round(borne((tSim - journee.t0) / DUREE_JOURNEE, 0, 1) * 100)} %</b></span>` : ''}`
        : `<span>produits suivis <b>${PRODUITS.length}</b></span><span>articles <b>${ARTICLES.length}</b></span><span>essais <b>${essais3}</b></span>`;
      if (h !== hudHtml) { hud.innerHTML = h; hudHtml = h; }
      if (acte === 1) majActe1();
    }
    function image() { dernierDessin = performance.now(); majHud(); dessiner(); }
    function boucle() { if (vivant && !enPause) { image(); animation = requestAnimationFrame(boucle); } }
    function tic() {
      if (!vivant || enPause) return; // en pause (CV ouvert) : ni temps simulé ni dessin
      for (let dt = INTERVALLE_MS / 1000 * vitesse; dt > 1e-6 && vivant; dt -= PAS_MAX) avancer(Math.min(dt, PAS_MAX));
      if (!reduit) tAmb += INTERVALLE_MS / 1000;
      flash = Math.max(0, flash - 0.06);
      alerte = Math.max(0, alerte - INTERVALLE_MS / 1000);
      if (performance.now() - dernierDessin > 200) image();
    }
    function avancer(dt) {
      tSim += dt;
      volsBac = volsBac.filter(v => tSim - v.t0 < VOL_BAC);
      if (acte === 1) avancerActe1();
      else if (acte === 'transition' && tSim - tTransition >= DUREE_TRANSITION) ouvrirActe2();
      else if (acte === 2 && journee) avancerJournee();
      else if (acte === 3 && passage) avancerPassage();
    }

    // --- acte 1 : le geste ----------------------------------------------------
    function avancerActe1() {
      while (tSim >= prochaineArrivee && prochaineArrivee < ACTE1_DUREE) {
        const t = prochaineArrivee, lot = t < 8 ? 1 : t < 16 ? 2 : 3;
        file = file.concat(Array.from({ length: lot }, (_, k) => ({ type: SUITE_RAPPORTS[(prochainRapport + k) % SUITE_RAPPORTS.length], t0: t + k * 0.15 })));
        prochainRapport += lot;
        prochaineArrivee = t + 3 - 2.2 * Math.min(1, t / ACTE1_DUREE);
      }
      if (!deborde && posesSurTapis().length >= SEUIL_FILE) {
        deborde = true; contenu.querySelector('.in-outil')?.classList.add('in-appel');
        annoncer("Le geste ne tient pas le volume. Construis l'outil.", 'ko');
      }
      if (tSim >= ACTE1_DUREE) construireOutil();
    }
    function trier(id) {
      if (!vivant || enPause || acte !== 1) return;
      const r = posesSurTapis()[0], k = BACS.findIndex(b => b.id === id);
      if (!r) { annoncer("Aucun rapport posé sur le tapis pour l'instant."); return; }
      const juste = r.type.nature === id;
      file = file.filter(x => x !== r); volsBac = volsBac.concat({ k, t0: tSim, ok: juste });
      tries += 1; justes += juste ? 1 : 0; parBac[id] += 1;
      annoncer(juste ? `Juste : ${r.type.source} → ${BACS[k].nom}.` : `Raté. ${explicationTri(r.type)}`, juste ? 'ok' : 'ko');
      majActe1();
    }
    function panneauActe1() {
      contenu.innerHTML = `<h3 tabindex="-1">Acte 1 · Le geste</h3>
        <p>Des rapports d'authentification arrivent sur le tapis, chacun avec trois tampons. Trie le premier : un bac, ou les touches 1, 2, 3.</p>
        <div class="in-regle"><b>Légitime</b> : SPF ou DKIM passe, et l'alignement est bon.<br><b>Service à déclarer</b> : ça passe, mais au nom d'un prestataire (non aligné).<br><b>Usurpation</b> : rien ne passe.</div>
        <div class="in-carte in-courant"></div>
        <div class="in-bacs">${BACS.map(b => `<button class="in-b" data-bac="${b.id}" style="--c:${b.couleur}">${b.nom}<small>touche ${b.touche}</small></button>`).join('')}</div>
        <button class="jx-btn fort in-outil">Construire l'outil</button>`;
      contenu.querySelectorAll('[data-bac]').forEach(b => b.addEventListener('click', () => trier(b.dataset.bac)));
      contenu.querySelector('.in-outil').addEventListener('click', construireOutil);
      courantHtml = '';
      majActe1();
    }
    function majActe1() {
      const el = contenu.querySelector('.in-courant'), poses = posesSurTapis(), r = poses[0];
      const puce = (n, v) => `<span class="in-puce ${v ? 'oui' : 'non'}">${n} ${v ? '✓' : '✗'}</span>`;
      const h = r ? `<span class="in-note">Premier rapport sur le tapis · ${poses.length} en attente</span><b>${r.type.source}</b><div class="in-ligne">${puce('SPF', r.type.spf)}${puce('DKIM', r.type.dkim)}${puce('alignement', r.type.align)}</div>`
        : '<span class="in-note">Le tapis est vide : un rapport arrive.</span>';
      if (el && h !== courantHtml) { el.innerHTML = h; courantHtml = h; }
    }
    function construireOutil() {
      if (acte !== 1) return;
      fileGelee = posesSurTapis(); file = []; acte = 'transition'; tTransition = tSim;
      annoncer(`${tries ? `La main a trié ${pluriel(tries, 'rapport')}. ` : ''}L'outil agrège la journée entière en une seconde : ${nombre(SOURCES.reduce((n, s) => n + s.volume, 0))} courriers, ${SOURCES.length} sources.`, 'ok');
      contenu.innerHTML = "<h3>Construction de l'outil…</h3><p>Les rapports se compactent en un tableau par source.</p>";
      etapes();
    }

    // --- acte 2 : p=reject sans casser le courrier ------------------------------
    const bon = l => l.s.legitime ? l.sort === 'delivre' : l.sort === 'rejete';
    const texteSort = l => l.sort === 'indesirable' ? (l.s.legitime ? `${l.s.effet} en indésirables` : 'en indésirables')
      : l.sort === 'delivre' ? (l.s.legitime ? 'délivré' : 'usurpation délivrée') : (l.s.legitime ? `${l.s.effet} rejetés` : 'rejeté');
    const $ = sel => contenu.querySelector(sel);
    function nouvelActe(html) { contenu.innerHTML = html; panneau.scrollTop = 0; etapes(); $('h3').focus({ preventScroll: true }); }
    // Fait défiler le panneau seul (jamais la page) jusqu'à un élément.
    const montrer = el => { const r = el.getBoundingClientRect(), p = panneau.getBoundingClientRect(); panneau.scrollTop += r.bottom > p.bottom ? r.bottom - p.bottom + 12 : Math.min(0, r.top - p.top - 12); };
    function ouvrirActe2() {
      acte = 2;
      nouvelActe(`<h3 tabindex="-1">Acte 2 · p=reject sans casser le courrier</h3>
        <p>L'outil agrège les rapports par source. Corrige ce qui doit l'être, puis monte la politique d'un cran : chaque cran joue une journée.</p>
        <div class="in-carte"><div class="in-ligne"><b>Politique DMARC</b><span class="in-note">au moins une journée en quarantine avant reject</span></div>
          <input type="range" min="0" max="2" step="1" value="0" aria-label="Politique DMARC : none, quarantine, reject">
          <div class="in-crans">${TIERS.map((t, k) => `<button class="in-b" data-cran="${k}">p=${t}</button>`).join('')}</div>
          <div class="in-note in-bilan"></div>
          <div class="in-ligne"><button class="jx-btn in-rejouer">Rejouer la journée</button><button class="jx-btn fort in-suite" hidden>Passer à la veille</button></div></div>
        <ul class="in-sources">${SOURCES.map(s => `<li class="in-src" data-src="${s.id}">
          <div class="in-tete"><b>${s.nom}</b><span class="in-note">${nombre(s.volume)}/j</span></div>
          <div class="in-barre"><i style="width:${Math.round(Math.sqrt(s.volume / 3400) * 100)}%"></i></div>
          <small>${s.legitime ? 'source connue' : 'source inconnue'} · ${s.detail}</small>
          <div class="in-ligne"><span class="in-puce" data-spf></span><span class="in-puce" data-dkim></span>
            <select data-id="${s.id}" aria-label="Action pour ${s.nom}">${ACTIONS.map(([v, t]) => `<option value="${v}">${t}</option>`).join('')}</select></div>
          <div class="in-note" data-note></div><div class="in-res" data-res></div></li>`).join('')}</ul>`);
      $('input[type=range]').addEventListener('change', e => choisirPolitique(+e.target.value));
      contenu.querySelectorAll('[data-cran]').forEach(b => b.addEventListener('click', () => choisirPolitique(+b.dataset.cran)));
      contenu.querySelectorAll('select[data-id]').forEach(s => s.addEventListener('change', () => changerAction(s.dataset.id, s.value)));
      $('.in-rejouer').addEventListener('click', () => { if (!journee) lancerJournee(); });
      $('.in-suite').addEventListener('click', ouvrirActe3);
      lancerJournee();
    }
    function majActe2() {
      SOURCES.forEach(s => {
        const li = $(`[data-src="${s.id}"]`), e = etatSource(s, actions[s.id]), n = noteAction(s, actions[s.id]);
        const l = dernier && dernier.lignes.find(x => x.s.id === s.id), res = li.querySelector('[data-res]'), note = li.querySelector('[data-note]');
        [['[data-spf]', 'SPF aligné', e.spf], ['[data-dkim]', 'DKIM aligné', e.dkim]].forEach(([sel, t, v]) => {
          const p = li.querySelector(sel); p.className = `in-puce ${v ? 'oui' : 'non'}`; p.textContent = `${t} ${v ? '✓' : '✗'}`;
        });
        li.querySelector('select').value = actions[s.id];
        note.className = 'in-note' + (n.ko ? ' ko' : n.ok ? ' ok' : '');
        note.textContent = n.t;
        if (n.ko) { const b = document.createElement('button'); b.textContent = 'Annuler'; b.addEventListener('click', () => changerAction(s.id, 'rien')); note.appendChild(b); }
        li.style.setProperty('--c', !l ? LIGNE : l.sort === 'indesirable' ? SPAM : bon(l) ? OK : ANOMALIE_TEXTE);
        res.className = 'in-res' + (!l ? '' : l.sort === 'indesirable' ? ' gris' : bon(l) ? ' ok' : ' ko');
        res.textContent = l ? `Dernière journée : ${texteSort(l)}` : '';
      });
      Object.assign($('input[type=range]'), { value: String(politique), disabled: !!journee });
      contenu.querySelectorAll('[data-cran]').forEach((b, k) => { b.classList.toggle('actif', k === politique); b.disabled = !!journee; });
      $('.in-rejouer').disabled = !!journee;
      $('.in-suite').hidden = !acte2Gagne;
    }
    function changerAction(id, v) {
      if (acte !== 2) return;
      const s = SOURCES.find(x => x.id === id), n = noteAction(s, v);
      actions = { ...actions, [id]: v };
      annoncer(`${s.nom} : ${n.t || 'aucune action.'}${journee ? ' Appliqué dès la prochaine journée.' : ''}`, n.ko ? 'ko' : n.ok ? 'ok' : '');
      majActe2();
    }
    function choisirPolitique(k) {
      if (acte !== 2) return;
      if (journee) annoncer('Une journée est en cours : attends sa fin.');
      else if (k === 2 && !quarantaineFaite) annoncer("Passe d'abord une journée entière en quarantine : elle montre ce qui casserait, sans rien perdre.", 'ko');
      else if (k !== politique) { politique = k; lancerJournee(); return; }
      majActe2();
    }
    function lancerJournee() {
      const r = mulberry32(100 + jours.length);
      const vols = SOURCES.flatMap((s, i) => Array.from({ length: borne(Math.round(s.volume / 280), 1, 12) }, () => ({ i, t0: tSim + r() * (DUREE_JOURNEE - 2) })));
      journee = { n: jours.length + 1, politique, t0: tSim, res: resultatJournee(actions, politique), vols, alertes: 0 };
      annoncer(`Journée ${journee.n} · p=${TIERS[politique]} : les courriers arrivent à la porte du domaine.`);
      majActe2();
    }
    function avancerJournee() {
      const p = (tSim - journee.t0) / DUREE_JOURNEE, usurp = journee.res.lignes.filter(l => !l.s.legitime);
      if (journee.alertes < usurp.length && p >= 0.2 + journee.alertes * 0.25) {
        const l = usurp[journee.alertes];
        journee = { ...journee, alertes: journee.alertes + 1 }; alerte = 1.6;
        alerteTexte = `alerte automatique : ${l.s.nom} usurpe le domaine`;
        cadre.statut(`Alerte : ${l.s.nom}`, 'ko');
      }
      if (p >= 1) finirJournee();
    }
    function finirJournee() {
      const j = journee, res = j.res;
      journee = null; dernier = res;
      jours = jours.concat({ n: j.n, politique: j.politique });
      quarantaineFaite = quarantaineFaite || j.politique === 1;
      legitRejetesCumul += res.legitRejetes.length;
      acte2Gagne = j.politique === 2 && !res.legitRejetes.length && !res.usurpDelivrees && !res.usurpAutorisees;
      const effets = res.legitRejetes.map(l => `${l.s.effet} rejetés`).concat(res.legitIndesirables.map(l => `${l.s.effet} en indésirables`));
      const bilan = `Journée ${j.n} · p=${TIERS[j.politique]} : ${nombre(res.delivres)} délivrés, ${nombre(res.indesirables)} en indésirables, ${nombre(res.rejetes)} rejetés.`
        + (acte2Gagne ? ' Aucun courrier légitime perdu, aucune usurpation ne passe : le domaine est protégé.'
          : res.usurpAutorisees ? " Une source inconnue est autorisée : l'usurpation passe pour légitime."
          : effets.length ? ` Effet de bord : ${effets.join(', ')}.`
          : res.usurpDelivrees ? ` ${nombre(res.usurpDelivrees)} courriers usurpés délivrés : monte la politique.`
          : j.politique === 1 ? ' Rien de légitime ne casse : reject est possible.' : '');
      annoncer(bilan, acte2Gagne ? 'ok' : res.legitRejetes.length || res.usurpAutorisees ? 'ko' : '');
      $('.in-bilan').textContent = bilan;
      cadre.statut(acte2Gagne ? 'Domaine en p=reject.' : `Journée ${j.n} terminée.`, acte2Gagne ? 'ok' : '');
      majActe2();
      if (acte2Gagne) $('.in-suite').focus();
    }

    // --- acte 3 : la veille qui n'invente rien ---------------------------------
    function ouvrirActe3() {
      if (acte !== 2 || !acte2Gagne) return;
      acte = 3;
      sourceVisee = -1;
      nouvelActe(`<h3 tabindex="-1">Acte 3 · La veille qui n'invente rien</h3>
        <p>Un modèle de langage (API) lit chaque article et rédige une fiche d'alerte. Compose sa consigne : trois étiquettes parmi sept, puis lance.</p>
        <div class="in-regle">Produits suivis (liste fictive) : <b>${PRODUITS.join(' · ')}</b>. Huit articles fictifs attendent sur le tapis.</div>
        <div class="in-consigne"><span class="in-note">Tu reçois un article de veille.</span>${[0, 1, 2].map(k => `<button class="in-fente" data-fente="${k}"></button>`).join('')}</div>
        <div class="in-etiquettes">${ETIQUETTES.map(t => `<button class="in-b" data-etiq="${t.id}">${t.texte}</button>`).join('')}</div>
        <button class="jx-btn fort in-lancer">Lancer la veille</button>
        <ol class="in-fiches" aria-label="Fiches produites"></ol>`);
      contenu.querySelectorAll('[data-fente]').forEach(b => b.addEventListener('click', () => {
        if (!passage && !acte3Gagne) { fentes = fentes.map((f, j) => j === +b.dataset.fente ? null : f); majActe3(); }
      }));
      contenu.querySelectorAll('[data-etiq]').forEach(b => b.addEventListener('click', () => {
        const k = fentes.indexOf(null);
        if (!passage && !acte3Gagne && k >= 0 && !fentes.includes(b.dataset.etiq)) { fentes = fentes.map((f, j) => j === k ? b.dataset.etiq : f); majActe3(); }
      }));
      $('.in-lancer').addEventListener('click', lancerVeille);
      annoncer("Dernier acte : écris la consigne d'une veille qui n'invente rien.", 'ok');
      majActe3();
    }
    function majActe3() {
      const bloque = !!passage || acte3Gagne;
      contenu.querySelectorAll('[data-fente]').forEach((b, k) => {
        const t = ETIQUETTES.find(x => x.id === fentes[k]);
        b.textContent = `[${k + 1}] ${t ? t.texte : 'vide : choisis une étiquette'}`;
        b.classList.toggle('pleine', !!t);
        b.setAttribute('aria-label', t ? `Emplacement ${k + 1} : ${t.texte}. Activer pour le vider.` : `Emplacement ${k + 1} vide`);
        b.disabled = bloque;
      });
      contenu.querySelectorAll('[data-etiq]').forEach(b => {
        const pris = fentes.includes(b.dataset.etiq);
        b.setAttribute('aria-pressed', String(pris));
        b.disabled = pris || !fentes.includes(null) || bloque;
      });
      $('.in-lancer').disabled = fentes.includes(null) || bloque;
    }
    function lancerVeille() {
      if (acte !== 3 || passage || acte3Gagne || fentes.includes(null)) return;
      essais3 += 1;
      derniereEval = evaluer(fentes);
      passage = { t0: tSim, eval: derniereEval, faites: 0 };
      $('.in-fiches').innerHTML = '';
      annoncer(`Essai ${essais3} : les articles montent vers le modèle.`);
      cadre.statut(`Veille · essai ${essais3}`);
      majActe3();
    }
    function avancerPassage() {
      for (const n = Math.min(ARTICLES.length, Math.floor((tSim - passage.t0) / DUREE_CARTE + 0.3)); passage.faites < n;) {
        const f = passage.eval.fiches[passage.faites], li = document.createElement('li');
        li.className = 'in-fiche';
        li.innerHTML = `<small>${f.art.titre} · article fictif</small>${f.badges.map(b => `<span class="in-badge" style="color:${BADGES[b][1]}">${BADGES[b][0]}</span>`).join('')}<span></span>`;
        li.lastChild.textContent = f.sortie;
        $('.in-fiches').appendChild(li);
        if (!passage.faites) montrer(li);
        passage = { ...passage, faites: passage.faites + 1 };
        flash = 1;
      }
      if (tSim - passage.t0 < ARTICLES.length * DUREE_CARTE + 0.3) return;
      const { totaux: t, gagne } = passage.eval;
      passage = null;
      acte3Gagne = gagne;
      majActe3();
      if (gagne) { annoncer(`Essai ${essais3} : trois alertes utiles, rien d'inventé, rien hors sujet, tout au format.`, 'ok'); terminer(); return; }
      annoncer(`Essai ${essais3} : ${t.utile} utile${t.utile > 1 ? 's' : ''}, ${t.horssujet} hors sujet, ${t.invente} inventée${t.invente > 1 ? 's' : ''}, ${t.format} hors format${t.fatigue ? `, ${t.fatigue} en fatigue d'alerte` : ''}. ${indiceVeille(t)}`, 'ko');
    }

    // --- aide, fin, entrées ---------------------------------------------------
    function etapes() {
      const n = acte === 1 ? 1 : acte === 3 ? 3 : 2;
      panneau.querySelectorAll('.in-etapes li').forEach((li, k) => {
        li.className = k + 1 < n ? 'fait' : k + 1 === n ? 'actif' : '';
        if (k + 1 === n) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
      });
      cadre.statut(`Acte ${n} sur 3`);
    }
    function indice() {
      const res = resultatJournee(actions, 2), autorisee = res.lignes.find(l => l.autorise), casse = res.legitRejetes[0];
      const t = acte === 1 ? "Lis l'alignement d'abord. Aligné avec un tampon qui passe : légitime. Non aligné mais un tampon passe : service à déclarer. Rien ne passe : usurpation. Quand la file déborde, construis l'outil."
        : acte === 'transition' ? "L'outil se construit."
        : acte === 3 ? (passage ? 'Les articles passent dans le modèle : regarde les badges.' : indiceVeille(derniereEval ? derniereEval.totaux : {}))
        : autorisee ? `${autorisee.s.nom} est autorisée dans SPF : annule, elle n'est pas à toi.`
        : casse && casse.s.id === 'crm' ? "Le CRM écrit déjà avec l'adresse de retour du domaine : il ne lui manque que son include SPF."
        : casse ? 'Le prestataire de facturation signe déjà, mais à son nom : demande-lui de signer au nom du domaine.'
        : !quarantaineFaite ? "Tout ce qui est légitime s'aligne désormais. Monte en quarantine une journée, puis en reject."
        : politique < 2 ? 'Tout est aligné et la quarantine est passée : monte en reject.' : 'Rejoue la journée pour confirmer.';
      annoncer('Indice : ' + t);
    }
    function terminer() {
      if (finAffichee) return;
      finAffichee = true;
      const f = api.FAITS[ID], score = Math.max(40, 100 - 10 * (essais3 - 1) - 10 * legitRejetesCumul);
      const main = tries ? `Tu as trié ${pluriel(tries, 'rapport')} à la main (${justes} juste${justes > 1 ? 's' : ''}) avant de construire l'outil` : "Tu as construit l'outil sans trier à la main";
      const route = legitRejetesCumul ? `, avec ${pluriel(legitRejetesCumul, 'rejet')} de courrier légitime en route` : ' sans perdre un courrier légitime';
      const bilan = `${main}, passé ${DOMAINE} en p=reject en ${pluriel(jours.length, 'journée')}${route}, puis écrit une consigne de veille juste en ${pluriel(essais3, 'essai')}.`;
      const message = `p=reject en ${pluriel(jours.length, 'journée')}, ${pluriel(legitRejetesCumul, 'rejet')} légitime en route, consigne de veille juste en ${pluriel(essais3, 'essai')}.`;
      cadre.statut('Quartier validé.', 'ok');
      cadre.fin({ titre: 'Quartier validé', texte: `${bilan} ${f.pourLePoste}<br><br><b>${f.poste}</b> · ${f.employeur}, ${f.periode}<br>${f.texte}`,
        bouton: 'Prendre la clé', action: () => api.fini({ score, message }) });
    }
    function surTouche(e) {
      if (acte !== 1 || !vivant || e.target.closest?.('input,textarea,select,[contenteditable]')) return;
      const b = BACS.find(x => x.touche === e.key);
      if (b) { e.preventDefault(); trier(b.id); }
    }
    function cible(e) {
      const r = canvas.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      const k = BACS.findIndex((_, j) => Math.abs(x - bacX(j)) < W * 0.06 && y > G.tapisY), i = SOURCES.findIndex((_, j) => Math.hypot(x - noeud(j)[0], y - noeud(j)[1]) < 22 * G.e);
      if (acte === 1) return k >= 0 ? { bac: BACS[k].id } : null;
      if (acte === 2 && i >= 0) return { source: i };
      return acte === 3 && Math.hypot(x - G.tx, y - G.orbeY) < G.tw * 0.5 ? { orbe: true } : null;
    }
    function surClic(e) {
      const c = cible(e);
      if (!c || enPause) return;
      if (c.bac) { trier(c.bac); return; }
      if (c.orbe) { lancerVeille(); return; }
      const li = $(`[data-src="${SOURCES[c.source].id}"]`);
      sourceVisee = c.source;
      contenu.querySelectorAll('.in-src').forEach(x => x.classList.toggle('vise', x === li));
      montrer(li); li.querySelector('select').focus({ preventScroll: true });
    }
    document.addEventListener('keydown', surTouche);
    canvas.addEventListener('click', surClic);
    canvas.addEventListener('pointermove', e => canvas.classList.toggle('main', !!cible(e)));
    cadre.bouton('Indice', indice);
    cadre.bouton('Abandonner', () => api.abandonner());
    panneauActe1();
    etapes();
    annoncer('Acte 1 : trie les rapports qui arrivent. Un bac, ou les touches 1, 2, 3.');
    redimensionner();
    const minuteur = setInterval(tic, INTERVALLE_MS);
    animation = requestAnimationFrame(boucle);

    async function attendreQue(cond, max = 9000) {
      for (const t0 = performance.now(); !cond(); await attendre(25)) {
        if (!vivant) throw new Error('jeu démonté');
        if (performance.now() - t0 > max) throw new Error('attente dépassée');
      }
    }
    const changer = (el, v) => { el.value = v; el.dispatchEvent(new Event('change', { bubbles: true })); };
    const reprendre = () => { if (vivant && enPause) { enPause = false; animation = requestAnimationFrame(boucle); } };

    return {
      demonter() {
        vivant = false; clearInterval(minuteur); cancelAnimationFrame(animation); observateur.disconnect();
        document.removeEventListener('keydown', surTouche); conteneur.innerHTML = '';
      },
      pause() { enPause = true; cancelAnimationFrame(animation); },
      reprendre,
      // Joue la solution par les mêmes gestionnaires que le joueur.
      async resoudre() {
        vitesse = VITESSE_RESOLUTION;
        reprendre();
        await attendreQue(() => acte !== 'transition');
        if (acte === 1) $('.in-outil').click();
        await attendreQue(() => acte === 2 && !journee);
        changer($('select[data-id="facturation"]'), 'dkim');
        changer($('select[data-id="crm"]'), 'spf');
        changer($('input[type=range]'), '1');
        await attendreQue(() => quarantaineFaite && !journee);
        changer($('input[type=range]'), '2');
        await attendreQue(() => acte2Gagne && !journee);
        $('.in-suite').click();
        await attendreQue(() => acte === 3);
        for (const id of BONNES) $(`[data-etiq="${id}"]`).click();
        $('.in-lancer').click();
        await attendreQue(() => finAffichee);
        cadre.corps.querySelector('.jx-fin .jx-btn').click();
      },
    };
  },
};
