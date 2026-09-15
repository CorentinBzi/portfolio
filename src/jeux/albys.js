// QUARTIER 4 — ALBYS — verbe SEGMENTER — « Les cloisons »
// Un étage à plat, seize appareils, un portable invité compromis. 1. Cloisonner : peindre
// les VLAN. 2. Règles : refus par défaut, cinq autorisations, un service par cellule.
// 3. Rejouer la journée : six flux métier ; à 11:40 l'intrus sonde et pivote par tout appareil
// vulnérable joint ; campagne OpenVAS simulée depuis sa position. 4. Consigner le changement.
// Plan illustratif, entreprise fictive. Temps simulé sur minuteur fixe × vitesse ; rAF ne fait
// que dessiner. Aucun Math.random.
import { creerCadre, attendre } from './_contrat.js';
import { FAITS } from '../cv.js';
const ACCENT = '#A98BFF';
const SCENE_HAUT = '#2A3270', SCENE_BAS = '#1A1F4D', PANNEAU = '#232A5E', LIGNE = 'rgba(160,170,255,.28)';
const TEXTE = '#EEF1FF', TEXTE_2 = '#B9C0E8', DATA = '#9FE8FF', OK = '#6FCF8E', ANOMALIE = '#E8503A';
const AMBRE = '#FFB86B', OR = '#FFD166', PLAN = '#1E3566', MUR = '#CFE3FF', ROUGE_TEXTE = '#FF8A76';
const W = 1000, H = 640;                         // repère logique du plan
const PORTE = { x: 600, y: 420 };                // portique pare-feu au cœur du réseau
const INTERVALLE_MS = 40, JOUR_S = 25, SCAN_S = 2.2, DUREE_PAQUET = 1.2, PAS_REDUIT_S = 1.1;
const DEBUT_MIN = 510, FIN_MIN = 1080, INTRUS_MIN = 700, BUDGET = 5, SCORE_MIN = 40;
const VLANS = [{ id: '10', nom: 'Postes', couleur: '#5BC0FF' }, { id: '20', nom: 'Serveurs', couleur: '#54E0A6' }, { id: '30', nom: 'Invités', couleur: '#FF9E5E' },
  { id: '40', nom: 'IoT', couleur: '#F2D13B' }, { id: '99', nom: 'Administration', couleur: '#A98BFF' }];
const ZONE = Object.fromEntries([...VLANS, { id: '1', nom: 'à plat', couleur: '#8E97BF' }, { id: 'vpn', nom: 'VPN', couleur: '#7CF3FF' }].map(v => [v.id, v]));
const LIGNES_MATRICE = ['10', '20', '30', '40', 'vpn'];
const COLONNES = ['10', '20', '30', '40', '99'];
const SERVICES = { fichiers: { nom: 'fichiers', court: 'fichiers', couleur: '#7CF3FF' }, enregistrement: { nom: 'enregistrement', court: 'enreg.', couleur: '#FF9EC4' },
  impression: { nom: 'impression', court: 'impr.', couleur: '#FFF1C9' }, partage: { nom: "partage d'écran", court: 'écran', couleur: OR },
  administration: { nom: 'administration', court: 'admin', couleur: '#C8BEFF' } };
// Appareils : pièce, position sur le plan, icône, services exposés, rôles défendables à la revue.
const A = (id, le, nom, court, piece, x, y, icone, o = {}) => ({ id, le, nom, court, piece, x, y, icone, services: [], ...o });
const APPAREILS = [
  A('visio', "l'", 'Écran de visio', 'Visio', 'Salle de réunion', 140, 128, 'visio', { services: ['partage'], vuln: 'micrologiciel obsolète', roles: ['10', '30', '40'] }),
  A('p1', 'le ', 'Poste 1', 'Poste 1', 'Open space', 320, 118, 'poste', { roles: ['10'] }),
  A('p2', 'le ', 'Poste 2', 'Poste 2', 'Open space', 430, 118, 'poste', { roles: ['10'] }),
  A('p3', 'le ', 'Poste 3', 'Poste 3', 'Open space', 320, 200, 'poste', { roles: ['10'] }),
  A('p4', 'le ', 'Poste 4', 'Poste 4', 'Open space', 430, 200, 'poste', { roles: ['10'] }),
  A('imprimante', "l'", 'Imprimante', 'Imprimante', 'Open space', 548, 160, 'imprimante', { services: ['impression'], roles: ['10', '40'] }),
  A('paie', 'le ', 'Poste paie', 'Paie', 'Comptabilité', 705, 150, 'poste', { critique: true, roles: ['10'] }),
  A('camCou', 'la ', 'Caméra du couloir', 'Cam. couloir', 'Couloir', 745, 288, 'camera', { services: ['administration'], vuln: 'mot de passe par défaut', critique: true, roles: ['40'] }),
  A('borne', 'la ', 'Borne Wi-Fi invités', 'Borne', 'Accueil', 85, 390, 'borne', { roles: ['30', '99'] }),
  A('camAcc', 'la ', "Caméra de l'accueil", 'Cam. accueil', 'Accueil', 392, 380, 'camera', { services: ['administration'], critique: true, roles: ['30', '40'] }),
  A('portable', 'le ', 'Portable invité', 'Portable', 'Accueil', 262, 505, 'portable', { fixe: '30', compromis: true }),
  A('fichiers', 'le ', 'Serveur de fichiers', 'Fichiers', 'Salle serveurs', 478, 505, 'serveur', { services: ['fichiers'], critique: true, roles: ['20'] }),
  A('nas', 'le ', 'NAS', 'NAS', 'Salle serveurs', 555, 552, 'nas', { services: ['fichiers', 'enregistrement'], critique: true, roles: ['20'] }),
  A('switch', 'le ', 'Switch cœur', 'Switch', 'Salle serveurs', 665, 505, 'switch', { services: ['administration'], roles: ['20', '99'] }),
  A('passerelle', 'la ', 'Passerelle', 'Passerelle', 'Salle serveurs', 745, 552, 'passerelle', { services: ['administration'], roles: ['20', '99'] }),
  A('teletravail', 'le ', 'Poste de télétravail', 'Télétravail', 'Télétravail', 905, 215, 'portable', { fixe: 'vpn' }),
];
const APP = Object.fromEntries(APPAREILS.map(a => [a.id, a]));
const PEINTS = APPAREILS.filter(a => !a.fixe);
const FLUX = [
  { id: 'F1', nom: 'postes → fichiers', de: ['p1', 'p2', 'p3', 'p4'], vers: ['fichiers'], service: 'fichiers', heures: [525, 815] },
  { id: 'F2', nom: 'paie → imprimante', de: ['paie'], vers: ['imprimante'], service: 'impression', heures: [615] },
  { id: 'F3', nom: 'télétravail (VPN) → fichiers', de: ['teletravail'], vers: ['fichiers'], service: 'fichiers', heures: [565] },
  { id: 'F4', nom: 'caméras → NAS', de: ['camAcc', 'camCou'], vers: ['nas'], service: 'enregistrement', heures: [540, 760, 980] },
  { id: 'F5', nom: 'portable invité → visio', de: ['portable'], vers: ['visio'], service: 'partage', heures: [660] },
  { id: 'F6', nom: 'passerelle (administration) → caméras', de: ['passerelle'], vers: ['camAcc', 'camCou'], service: 'administration', heures: [880] },
];
const REFERENCE = { // configuration jouée par resoudre()
  vlans: { p1: '10', p2: '10', p3: '10', p4: '10', paie: '10', fichiers: '20', nas: '20', borne: '30', visio: '30', camAcc: '40', camCou: '40', imprimante: '40', passerelle: '99', switch: '99' },
  regles: { '10>20': 'fichiers', '10>40': 'impression', 'vpn>20': 'fichiers', '40>20': 'enregistrement' },
  admin: true,
};
const INDICES = {
  1: ["Commence par l'évident : postes ensemble, serveurs ensemble. Les vrais choix : l'imprimante, l'écran de visio, la caméra de l'accueil, la borne et l'équipement réseau.",
    "Un appareil vulnérable que l'intrus peut joindre devient son tremplin. Où l'écran de visio fait-il le moins de dégâts s'il tombe ?",
    "L'invité a besoin de l'écran de visio : le ranger avec les invités évite d'ouvrir le pare-feu vers un appareil vulnérable."],
  2: ["Pars des six flux : source, destination, service. Deux appareils dans le même VLAN n'ont besoin d'aucune règle.",
    "Une cellule porte un seul service : l'enregistrement des caméras et l'impression de la paie ont chacun besoin de la leur.",
    "Avec la passerelle dans le VLAN 99, la ligne « Administration → tous » suffit pour F6."],
  3: ["Lis le journal : chaque flux bloqué nomme la règle qui manque, et le chemin de l'intrus nomme la cellule ou l'appareil fautif."],
  4: ["La bonne consigne dit ce qui est ouvert, pour qui et pourquoi : quelqu'un d'autre doit pouvoir la vérifier."],
};
// Logique pure. cfg = { vlans: { id: '1'|'10'… }, regles: { '10>20': service }, admin }
const zone = (cfg, id) => APP[id].fixe || cfg.vlans[id];
const libZone = z => z === 'vpn' ? 'VPN' : `${z} ${ZONE[z].nom}`;
const leNom = id => APP[id].le + (/^[A-ZÉ][a-zé]/.test(APP[id].nom) ? APP[id].nom[0].toLowerCase() + APP[id].nom.slice(1) : APP[id].nom);
const enListe = t => t.length < 2 ? (t[0] || '') : `${t.slice(0, -1).join(', ')} et ${t[t.length - 1]}`;
const heure = m => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(Math.floor(m % 60)).padStart(2, '0')}`;
const regle = (cfg, de, vers) => de === vers ? null : de === '99' ? (cfg.admin ? 'administration' : null) : cfg.regles[`${de}>${vers}`] || null;
const servicesDe = (cfg, z) => Object.keys(SERVICES).filter(sv => PEINTS.some(a => cfg.vlans[a.id] === z && a.services.includes(sv)));
function etatFlux(cfg, f) {
  const paires = f.de.flatMap(s => f.vers.map(d => {
    const a = zone(cfg, s), b = zone(cfg, d);
    return { s, d, a, b, meme: a === b, ok: a === b || regle(cfg, a, b) === f.service };
  }));
  return { ok: paires.every(p => p.ok), paires };
}
function reglesActives(cfg) {
  const liste = Object.entries(cfg.regles).map(([cle, service]) => { const [de, vers] = cle.split('>'); return { cle, de, vers, service }; });
  return cfg.admin ? liste.concat({ cle: 'admin', de: '99', vers: 'tous', service: 'administration' }) : liste;
}
const texteRegle = r => `${libZone(r.de)} → ${r.vers === 'tous' ? 'tous' : libZone(r.vers)} : ${SERVICES[r.service].nom}`;
function fluxDeRegle(cfg, r) {
  return FLUX.filter(f => f.service === r.service && etatFlux(cfg, f).paires.some(p => !p.meme && p.a === r.de && (r.vers === 'tous' || p.b === r.vers)));
}
// L'intrus joint tout son VLAN, et au-delà ce que les règles de sa ligne ouvrent vers un
// service réellement exposé. Tout appareil joint ET vulnérable le fait repartir de son VLAN.
function intrus(cfg) {
  const depart = zone(cfg, 'portable');
  const vus = new Set([depart]), atteints = new Map(), etapes = [];
  const file = [{ vlan: depart, source: 'portable' }];
  while (file.length) {
    const { vlan, source } = file.shift();
    const joints = [];
    for (const a of APPAREILS) {
      if (a.id === 'portable' || atteints.has(a.id)) continue;
      const z = zone(cfg, a.id), r = regle(cfg, vlan, z);
      const via = z === vlan ? 'même VLAN' : (r && a.services.includes(r) ? SERVICES[r].nom : null);
      if (via) { atteints.set(a.id, { via, depuis: vlan }); joints.push(a.id); }
    }
    etapes.push({ vlan, source, joints });
    for (const id of joints) {
      const z = zone(cfg, id);
      if (APP[id].vuln && !vus.has(z)) { vus.add(z); file.push({ vlan: z, source: id }); }
    }
  }
  return { depart, etapes, atteints, positions: [...vus], critiques: [...atteints.keys()].filter(id => APP[id].critique) };
}
function verdict(cfg) {
  const flux = FLUX.map(f => ({ f, ...etatFlux(cfg, f) }));
  const regles = reglesActives(cfg).map(r => ({ ...r, flux: fluxDeRegle(cfg, r) }));
  const inutiles = regles.filter(r => !r.flux.length);
  const intr = intrus(cfg);
  const fluxOk = flux.filter(x => x.ok).length;
  return { flux, regles, inutiles, intr, fluxOk, ok: fluxOk === FLUX.length && !intr.critiques.length && regles.length <= BUDGET && !inutiles.length };
}
function revuePlan(cfg) {
  return PEINTS.flatMap(a => {
    const v = cfg.vlans[a.id];
    if (v === '1') return [`${a.nom} est encore sur le VLAN 1, à plat.`];
    if (!a.roles.includes(v)) return [`${a.nom} dans ${libZone(v)} : indéfendable à la revue (plutôt ${a.roles.map(libZone).join(' ou ')}).`];
    return [];
  });
}
function formulations(cfg, v) {
  const joints = v.intr.etapes[0].joints.map(leNom);
  const n = v.regles.length;
  const regles = v.regles.map(r => `${texteRegle(r)} (${r.flux.map(f => f.id).join(', ')})`);
  const bonne = `Invités isolés sur le VLAN 30 : ${joints.length ? `ils ne joignent plus que ${enListe(joints)}` : 'ils ne joignent plus rien du réseau interne'}. ` +
    `${n} autorisation${n > 1 ? 's' : ''} inter-VLAN, ${n > 1 ? 'chacune liée' : 'liée'} à un flux nommé : ${regles.join(' ; ')}.`;
  return [
    { texte: 'Réseau segmenté, plus sécurisé.', bonne: false, pourquoi: "Vague : l'équipe ne sait ni ce qui est ouvert, ni pour qui, ni pourquoi. Personne ne pourra la vérifier." },
    { texte: bonne, bonne: true, pourquoi: 'Vérifiable : chaque ouverture a un nom, un service et une raison. On peut la relire, la tester, la retirer.' },
    { texte: 'Tout est bloqué entre VLAN sauf ce qui a été demandé.', bonne: false, pourquoi: "Incomplète : « ce qui a été demandé » ne dit pas quoi. Au prochain changement, personne ne saura quelle règle sert à quoi." },
  ];
}
function mulberry32(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const echapper = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const CSS = `
  .al-jeu{flex:1;min-width:0;min-height:0;display:flex;background:linear-gradient(180deg,${SCENE_HAUT},${SCENE_BAS});color:${TEXTE};font:13px/1.45 "Archivo",system-ui,sans-serif}
  .al-jeu *{box-sizing:border-box}
  .al-scene{flex:1;min-width:0;min-height:0;position:relative;overflow:hidden}
  .al-scene canvas{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none}
  .al-scene canvas.main{cursor:pointer}
  .al-hud{position:absolute;left:12px;top:10px;display:flex;flex-wrap:wrap;align-items:center;gap:6px 14px;padding:7px 12px;background:rgba(22,26,64,.82);border:1px solid ${LIGNE};border-radius:12px;font:500 11px/1.2 "IBM Plex Mono",ui-monospace,monospace;letter-spacing:.14em;text-transform:uppercase;color:${TEXTE_2};pointer-events:none;max-width:calc(100% - 24px);box-shadow:0 12px 40px rgba(8,10,40,.35)}
  .al-hud b{color:${TEXTE};font-weight:600;letter-spacing:.06em}
  .al-hud .al-horloge{font-size:20px;letter-spacing:.04em;color:${DATA}}
  .al-pastille{display:inline-block;width:11px;height:11px;border-radius:3px;vertical-align:-1px;margin-right:6px;box-shadow:0 0 8px currentColor}
  .al-info{position:absolute;right:12px;top:10px;max-width:min(300px,40%);padding:8px 11px;background:rgba(22,26,64,.88);border:1px solid ${LIGNE};border-left:3px solid ${ACCENT};border-radius:10px;font-size:12px;color:${TEXTE};pointer-events:none}
  .al-info small{display:block;color:${TEXTE_2};font:500 11px/1.35 "IBM Plex Mono",monospace}
  .al-legende{position:absolute;left:12px;right:12px;bottom:7px;font:500 10.5px/1.3 "IBM Plex Mono",monospace;color:${TEXTE_2};pointer-events:none;text-shadow:0 1px 3px ${SCENE_BAS}}
  .al-legende b{color:${AMBRE};font-weight:600}.al-legende i{font-style:normal;color:${ROUGE_TEXTE}}
  .al-lat{width:min(42%,470px);flex:none;display:flex;flex-direction:column;min-height:0;background:${PANNEAU};border-left:1px solid ${LIGNE}}
  .al-etapes{display:grid;grid-template-columns:repeat(4,1fr);gap:4px;padding:8px 10px;margin:0;list-style:none;border-bottom:1px solid ${LIGNE};background:${SCENE_BAS}}
  .al-etapes button{width:100%;min-height:44px;padding:4px;font:600 11.5px/1.15 "Archivo",system-ui,sans-serif;color:${TEXTE_2};background:transparent;border:1px solid transparent;border-radius:8px;cursor:pointer}
  .al-etapes button b{display:block;font:500 10px/1.2 "IBM Plex Mono",monospace;letter-spacing:.1em;margin-bottom:2px}
  .al-etapes button.actif{color:${TEXTE};border-color:${ACCENT};background:rgba(169,139,255,.16)}
  .al-etapes button.fait b{color:${OK}}
  .al-etapes button[disabled]{opacity:.42;cursor:default}
  .al-defil{flex:1;min-height:0;overflow:auto;padding:12px 14px 16px;display:flex;flex-direction:column;gap:11px}
  .al-defil>*{flex:none}
  .al-defil h3{margin:0;font:800 17px/1.2 "Archivo",system-ui,sans-serif;font-stretch:125%;letter-spacing:.01em}
  .al-defil p{margin:0;color:${TEXTE_2}}
  .al-sec{font:500 10.5px/1 "IBM Plex Mono",monospace;letter-spacing:.14em;text-transform:uppercase;color:${TEXTE_2};margin-top:3px}
  .al-btn{min-height:44px;padding:8px 12px;font:600 13px/1.25 "Archivo",system-ui,sans-serif;color:${TEXTE};background:rgba(255,255,255,.05);border:1px solid ${LIGNE};border-radius:8px;cursor:pointer;text-align:left}
  .al-btn:hover{border-color:${ACCENT}}
  .al-jeu button:focus-visible{outline:2px solid #FFE08A;outline-offset:2px;box-shadow:0 0 0 5px rgba(11,14,42,.9)}
  .al-btn.or{background:${OR};border-color:${OR};color:#1A1633;text-align:center}
  .al-btn[disabled]{opacity:.45;cursor:default}
  .al-palette{display:grid;grid-template-columns:repeat(auto-fill,minmax(122px,1fr));gap:6px}
  .al-palette .al-btn,.al-app{display:grid;grid-template-columns:auto 1fr;column-gap:8px;align-items:center;padding:6px 10px}
  .al-palette small,.al-app small{grid-column:2;font:500 10.5px/1.25 "IBM Plex Mono",monospace;color:${TEXTE_2}}
  .al-palette .al-btn[aria-pressed="true"]{background:rgba(255,255,255,.13);border-color:${TEXTE};box-shadow:inset 0 0 0 1px ${TEXTE}}
  .al-apps{display:grid;grid-template-columns:repeat(auto-fill,minmax(148px,1fr));gap:6px}
  .al-app i{grid-row:1/3;width:5px;align-self:stretch;border-radius:3px}
  .al-app span{font-size:12.5px;font-weight:600}
  .al-app em{font-style:normal;color:${AMBRE}}.al-app u{text-decoration:none;color:#C8BEFF}
  .al-alerte{padding:8px 11px;border-radius:8px;border:1px solid rgba(232,80,58,.7);background:rgba(232,80,58,.14);color:${TEXTE};font-size:12.5px}
  .al-alerte.ok{border-color:rgba(111,207,142,.7);background:rgba(111,207,142,.13)}
  .al-alerte ul{margin:4px 0 0;padding-left:18px}
  .al-flux{list-style:none;margin:0;padding:0;display:grid;gap:3px;font:500 11.5px/1.35 "IBM Plex Mono",monospace;color:${TEXTE}}
  .al-flux li{display:flex;justify-content:space-between;gap:8px;padding:5px 8px;background:rgba(10,14,40,.3);border-radius:6px}
  .al-flux li small{color:${TEXTE_2};white-space:nowrap}
  .al-mat{overflow-x:auto;margin:0 -4px}
  .al-matrice{border-collapse:separate;border-spacing:3px;font:500 11px/1.1 "IBM Plex Mono",monospace;width:100%}
  .al-matrice th{color:${TEXTE_2};font-weight:500;padding:2px;text-align:center}
  .al-matrice th[scope=row]{text-align:right;padding-right:6px;white-space:nowrap}
  .al-matrice td button{width:100%;min-width:44px;min-height:44px;padding:2px;font:600 11px/1.1 "IBM Plex Mono",monospace;color:${TEXTE_2};background:rgba(10,14,40,.35);border:1px dashed rgba(160,170,255,.3);border-radius:6px;cursor:pointer}
  .al-matrice td button.ouvert{border-style:solid;color:#1A1633}
  .al-matrice td button[disabled]{cursor:default;opacity:.55}
  .al-matrice td.diag button{background:repeating-linear-gradient(135deg,rgba(160,170,255,.1) 0 4px,transparent 4px 8px);border-style:solid;font-weight:500}
  .al-regles{margin:0;padding:0;list-style:none;display:grid;gap:4px;font:500 12px/1.35 "IBM Plex Mono",monospace}
  .al-regles li{padding:6px 9px;border-left:3px solid var(--c);background:rgba(10,14,40,.3);border-radius:0 6px 6px 0;color:${TEXTE}}
  .al-jauge{height:8px;border-radius:4px;background:rgba(10,14,40,.5);overflow:hidden}.al-jauge i{display:block;height:100%;background:${ACCENT};transition:width .2s}
  .al-tableau{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
  .al-tableau div{padding:8px;border-radius:8px;background:rgba(10,14,40,.35);border:1px solid ${LIGNE};font:500 10px/1.25 "IBM Plex Mono",monospace;color:${TEXTE_2};text-transform:uppercase;letter-spacing:.06em}
  .al-tableau b{display:block;font-size:21px;color:${TEXTE};letter-spacing:0;margin-top:3px}
  .al-tableau .ko b{color:${ROUGE_TEXTE}}.al-tableau .ok b{color:${OK}}
  .al-journal{list-style:none;margin:0;padding:0;display:grid;gap:3px;font:500 11.5px/1.4 "IBM Plex Mono",monospace}
  .al-journal li{padding:4px 8px;border-left:3px solid ${LIGNE};background:rgba(10,14,40,.25);color:${TEXTE}}
  .al-journal li.ok{border-left-color:${OK}}.al-journal li.ko{border-left-color:${ANOMALIE}}.al-journal li.info{border-left-color:${DATA};color:${TEXTE_2}}
  .al-choix{display:grid;gap:8px}.al-choix .al-btn{font-weight:500;line-height:1.45}
  .al-choix .al-btn.ok{border-color:${OK};background:rgba(111,207,142,.14)}.al-choix .al-btn.ko{border-color:${ANOMALIE};background:rgba(232,80,58,.12)}
  .al-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
  .al-fin-defil{display:block;max-height:min(50vh,430px);overflow:auto;margin-top:6px}
  .al-doc{display:block;margin:10px 0;padding:9px 11px;border:1px solid #2B3843;border-left:3px solid ${ACCENT};font-size:12px;line-height:1.5}
  .al-doc b,.al-doc span{display:block}.al-doc b{color:${ACCENT};font-size:11px;letter-spacing:.1em;text-transform:uppercase;margin-bottom:3px}
  @media (max-width:760px){
    .al-jeu{flex-direction:column}
    .al-scene{flex:none;height:38%}
    .al-lat{width:auto;flex:1;border-left:0;border-top:1px solid ${LIGNE}}
    .al-info{display:none}
    .al-hud{gap:4px 10px;padding:4px 8px;font-size:9.5px;left:8px;top:6px;border-radius:9px}
    .al-hud .al-horloge{font-size:14px}
    .al-legende{font-size:9px;left:8px;bottom:4px}
    .al-legende .al-long{display:none}
    .al-etapes{padding:6px 8px}
    .al-defil{padding:10px 12px 14px}
  }`;
// Géométrie du plan (repère logique W × H).
const MURS = [
  [30, 60, 800, 60], [30, 260, 110, 260], [170, 260, 380, 260], [440, 260, 660, 260], [710, 260, 800, 260],
  [30, 340, 200, 340], [270, 340, 560, 340], [640, 340, 800, 340], [30, 600, 140, 600], [220, 600, 800, 600],
  [30, 60, 30, 600], [800, 60, 800, 600], [250, 60, 250, 260], [610, 60, 610, 260], [430, 340, 430, 600],
];
const PIECES = [
  ['Salle de réunion', 30, 60, 220, 200, '#36568F'], ['Open space', 250, 60, 360, 200, '#32528C'], ['Comptabilité', 610, 60, 190, 200, '#385892'],
  ['Couloir', 30, 260, 770, 80, '#2B4A85'], ['Accueil', 30, 340, 400, 260, '#37578F'], ['Salle serveurs', 430, 340, 370, 260, '#2A4882'],
];
const PLANTES = [[50, 238], [590, 82], [412, 582], [48, 580], [782, 80], [232, 82]];
function cheminVersPorte(a) {
  if (a.id === 'teletravail') {
    return Array.from({ length: 15 }, (_, i) => { const t = i / 14, u = 1 - t; return { x: u * u * a.x + 2 * u * t * 975 + t * t * PORTE.x, y: u * u * a.y + 2 * u * t * 470 + t * t * PORTE.y }; });
  }
  const bus = a.piece === 'Salle serveurs' ? 470 : 300;
  return [{ x: a.x, y: a.y }, { x: a.x, y: bus }, { x: PORTE.x, y: bus }, PORTE];
}
const CHEMINS = Object.fromEntries(APPAREILS.map(a => [a.id, cheminVersPorte(a)]));
const longueurs = pts => pts.reduce((l, p, i) => i ? [...l, l[i - 1] + Math.hypot(p.x - pts[i - 1].x, p.y - pts[i - 1].y)] : l, [0]);
function pointA(pts, l, f) {
  const d = Math.max(0, Math.min(1, f)) * l[l.length - 1];
  let i = 1;
  while (i < l.length - 1 && l[i] < d) i++;
  const t = Math.min(1, Math.max(0, (d - l[i - 1]) / ((l[i] - l[i - 1]) || 1)));
  return { x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * t, y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * t };
}
const hexA = (h, a) => `rgba(${parseInt(h.slice(1, 3), 16)},${parseInt(h.slice(3, 5), 16)},${parseInt(h.slice(5, 7), 16)},${a})`;
export default {
  id: 'albys',
  ordre: 3,
  titre: 'Les cloisons',
  employeur: FAITS.albys.employeur,
  annees: FAITS.albys.periode,
  factKey: 'albys',
  verbe: 'SEGMENTER',
  accent: ACCENT,
  description: "Un étage à plat, seize appareils, un portable invité compromis. Peindre les VLAN, n'ouvrir au pare-feu que les flux dont l'entreprise a besoin, rejouer la journée, puis consigner le changement.",
  monter(conteneur, api) {
    const reduit = api.mouvementReduit ?? matchMedia('(prefers-reduced-motion: reduce)').matches;
    const cadre = creerCadre(conteneur, {
      titre: 'Les cloisons', employeur: FAITS.albys.employeur, annees: FAITS.albys.periode, verbe: 'SEGMENTER', accent: api.accent,
      consigne: "Peins les VLAN sur le plan, n'ouvre au pare-feu que le nécessaire, rejoue la journée, puis consigne le changement.",
    });
    const style = document.createElement('style');
    style.id = 'jeu-albys-styles';
    style.textContent = CSS;
    cadre.racine.prepend(style);
    const racine = document.createElement('div');
    racine.className = 'al-jeu';
    racine.innerHTML = `<div class="al-scene"><canvas aria-hidden="true"></canvas><div class="al-hud"></div><div class="al-info" hidden></div>
      <div class="al-legende">plan illustratif, entreprise fictive<span class="al-long"> · <b>⚠</b> vulnérable : pivot si l'intrus le joint · ◆ actif critique · <i>●</i> portable compromis</span></div></div>
      <div class="al-lat"><ol class="al-etapes"></ol><div class="al-defil"></div><div class="al-sr" aria-live="polite"></div></div>`;
    cadre.corps.appendChild(racine);
    const $ = sel => racine.querySelector(sel);
    const scene = $('.al-scene'), canvas = $('canvas'), ctx = canvas.getContext('2d');
    const hud = $('.al-hud'), info = $('.al-info'), etapesEl = $('.al-etapes'), defil = $('.al-defil'), annonce = $('.al-sr');
    let cfg = { vlans: Object.fromEntries(PEINTS.map(a => [a.id, '1'])), regles: {}, admin: false };
    let phase = 1, planValide = false, rejeuOk = false, rates = 0, pinceau = '10', indice = 0, dernierVerdict = null;
    let jour = null, vivant = true, enPause = false, vitesse = 1, horloge = 0, dernierDessin = 0, raf = 0, minuteur = 0;
    let survol = null, peinture = false, surligne = null, hudTexte = '';
    let CW = 1, CH = 1, dpr = 1, s = 1, ox = 0, oy = 0;
    const alea = mulberry32(2021);
    const AMBIANCE = Array.from({ length: 10 }, () => ({ id: PEINTS[Math.floor(alea() * PEINTS.length)].id, d: alea(), v: 0.12 + alea() * 0.1 }));
    cadre.bouton('Abandonner', () => api.abandonner());
    const btnIndice = cadre.bouton('Indice', () => donnerIndice());
    function redimensionner() {
      const r = scene.getBoundingClientRect();
      CW = Math.max(1, r.width); CH = Math.max(1, r.height);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(CW * dpr); canvas.height = Math.round(CH * dpr);
      const etroit = CW < 560, haut = etroit ? 30 : 58, bas = etroit ? 14 : 24, marge = etroit ? 6 : 18;
      s = Math.max(0.05, Math.min((CW - 2 * marge) / W, (CH - haut - bas) / H));
      ox = (CW - W * s) / 2;
      oy = haut + (CH - haut - bas - H * s) / 2;
      dessiner();
    }
    const observateur = new ResizeObserver(redimensionner);
    observateur.observe(scene);
    const X = x => ox + x * s, Y = y => oy + y * s;
    function boite(x, y, w, h, fond) {
      const e = Math.max(2, 6 * s);
      ctx.fillStyle = 'rgba(8,12,40,.32)'; ctx.fillRect(X(x) + e * 0.7, Y(y) + e * 1.2, w * s, h * s);
      ctx.fillStyle = hexA(fond, 1); ctx.fillRect(X(x), Y(y) - e + h * s, w * s, e);
      ctx.fillStyle = fond; ctx.fillRect(X(x), Y(y) - e, w * s, h * s);
      ctx.strokeStyle = 'rgba(207,227,255,.45)'; ctx.lineWidth = 1; ctx.strokeRect(X(x) + 0.5, Y(y) - e + 0.5, w * s - 1, h * s - 1);
      ctx.fillStyle = 'rgba(8,12,40,.28)'; ctx.fillRect(X(x), Y(y) - e + h * s, w * s, e);
    }
    function disque(x, y, r, fond) { ctx.fillStyle = fond; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
    const led = (i, periode = 2) => reduit || (Math.floor(horloge * periode + i * 7.3) % 5) !== 0;
    function dessinerFond() {
      ctx.save();
      ctx.shadowColor = 'rgba(8,10,40,.55)'; ctx.shadowBlur = 30 * s; ctx.shadowOffsetY = 10 * s;
      ctx.fillStyle = PLAN; ctx.fillRect(X(0), Y(18), W * s, (H - 12) * s);
      ctx.restore();
      ctx.lineWidth = 1;
      const trait = (g, x1, y1, x2, y2) => { ctx.strokeStyle = g % 100 ? 'rgba(207,227,255,.05)' : 'rgba(207,227,255,.12)'; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); };
      for (let g = 0; g <= W; g += 20) trait(g, X(g) + 0.5, Y(18), X(g) + 0.5, Y(H + 6));
      for (let g = 20; g <= H; g += 20) trait(g, X(0), Y(g) + 0.5, X(W), Y(g) + 0.5);
      ctx.fillStyle = 'rgba(8,12,40,.35)'; ctx.fillRect(X(38), Y(70), 770 * s, 540 * s);
      const petit = s < 0.55;
      for (const [nom, x, y, w, h, sol] of PIECES) {
        ctx.fillStyle = sol; ctx.fillRect(X(x), Y(y), w * s, h * s);
        if (petit) continue;
        ctx.font = `600 ${Math.max(9, 11 * s)}px "IBM Plex Mono",ui-monospace,monospace`; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillStyle = 'rgba(207,227,255,.62)'; ctx.fillText(nom.toUpperCase(), X(x + 10), Y(y + 9));
      }
      ctx.fillStyle = '#244F66'; ctx.fillRect(X(846), Y(118), 136 * s, 150 * s);
      for (let i = 0; i < 7; i++) disque(X(858 + i * 19), Y(262), 5 * s, '#2F6A70');
      boite(862, 150, 96, 88, '#3B5C98');
      ctx.fillStyle = '#4C6FB0'; ctx.beginPath(); ctx.moveTo(X(854), Y(146)); ctx.lineTo(X(910), Y(116)); ctx.lineTo(X(966), Y(146)); ctx.closePath(); ctx.fill();
      if (!petit) {
        ctx.font = `600 ${Math.max(9, 11 * s)}px "IBM Plex Mono",monospace`; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(207,227,255,.75)';
        ctx.fillText('TÉLÉTRAVAIL', X(914), Y(96));
      }
    }
    function dessinerMobilier() {
      for (const id of ['p1', 'p2', 'p3', 'p4', 'paie']) { const a = APP[id]; boite(a.x - 40, a.y - 20, 80, 42, '#43629E'); disque(X(a.x), Y(a.y + 38), 8 * s, '#566FA8'); }
      ctx.fillStyle = '#43629E'; ctx.beginPath(); ctx.ellipse(X(140), Y(205), 64 * s, 26 * s, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(207,227,255,.4)'; ctx.lineWidth = 1; ctx.stroke();
      for (let i = 0; i < 6; i++) { const t = Math.PI * (0.15 + i * 0.34); disque(X(140 + Math.cos(t) * 78), Y(205 + Math.sin(t) * 38), 7 * s, '#566FA8'); }
      boite(46, 448, 132, 34, '#43629E');
      boite(214, 552, 116, 30, '#5B4E93');
      boite(228, 486, 70, 38, '#43629E');
      boite(300, 420, 60, 40, '#3A5A98');
      for (let i = 0; i < 3; i++) {
        boite(654 + i * 48, 374, 40, 20, '#18294F');
        for (let k = 0; k < 3; k++) if (led(i * 4 + k)) disque(X(662 + i * 48 + k * 11), Y(380), 1.8 * s + 0.6, k % 2 ? OK : DATA);
      }
      boite(442, 362, 30, 56, '#35548F');
      for (const [x, y] of PLANTES) { disque(X(x), Y(y), 13 * s, '#2E7A6B'); disque(X(x - 4), Y(y - 4), 8 * s, '#49A585'); disque(X(x + 5), Y(y + 3), 6 * s, '#3C9479'); }
    }
    function dessinerGoulottes() {
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      const trace = pts => { ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(X(p.x), Y(p.y)) : ctx.moveTo(X(p.x), Y(p.y))); ctx.stroke(); };
      const tronc = [[{ x: 60, y: 300 }, { x: 790, y: 300 }], [{ x: 600, y: 300 }, PORTE], [{ x: 470, y: 470 }, { x: 750, y: 470 }], [{ x: 600, y: 470 }, PORTE]];
      ctx.strokeStyle = 'rgba(207,227,255,.2)'; ctx.lineWidth = Math.max(3, 9 * s); tronc.forEach(trace);
      ctx.setLineDash([6 * s + 2, 10 * s + 2]); ctx.lineDashOffset = -horloge * 40;
      ctx.strokeStyle = 'rgba(207,227,255,.55)'; ctx.lineWidth = Math.max(1, 2 * s); tronc.forEach(trace);
      for (const a of APPAREILS) {
        if (a.id === 'teletravail') continue;
        ctx.strokeStyle = hexA(ZONE[zone(cfg, a.id)].couleur, 0.75); ctx.lineWidth = Math.max(1, 2.5 * s);
        trace(CHEMINS[a.id].slice(0, 2));
      }
      ctx.strokeStyle = hexA(ZONE.vpn.couleur, 0.25); ctx.lineWidth = Math.max(4, 14 * s); ctx.setLineDash([]); trace(CHEMINS.teletravail);
      ctx.setLineDash([10 * s + 2, 8 * s + 2]); ctx.strokeStyle = ZONE.vpn.couleur; ctx.lineWidth = Math.max(1.5, 3 * s); trace(CHEMINS.teletravail);
      ctx.setLineDash([]);
      if (s >= 0.55) {
        ctx.font = `600 ${Math.max(9, 11 * s)}px "IBM Plex Mono",monospace`; ctx.fillStyle = ZONE.vpn.couleur; ctx.textAlign = 'left';
        ctx.fillText('tunnel VPN', X(870), Y(390));
      }
      for (const m of AMBIANCE) {
        if (reduit || phase === 3) break;
        const pts = CHEMINS[m.id], l = longueurs(pts), p = pointA(pts, l, 1 - ((horloge * m.v + m.d) % 1));
        disque(X(p.x), Y(p.y), Math.max(1.5, 3.5 * s), hexA(ZONE[zone(cfg, m.id)].couleur, 0.9));
      }
    }
    function dessinerMurs() {
      const e = Math.max(3, 8 * Math.min(1, s * 1.2));
      ctx.lineCap = 'square';
      ctx.strokeStyle = 'rgba(8,12,40,.35)'; ctx.lineWidth = Math.max(3, 7 * s);
      for (const [x1, y1, x2, y2] of MURS) { ctx.beginPath(); ctx.moveTo(X(x1) + 3, Y(y1) + 4); ctx.lineTo(X(x2) + 3, Y(y2) + 4); ctx.stroke(); }
      ctx.fillStyle = 'rgba(150,180,235,.55)';
      for (const [x1, y1, x2, y2] of MURS) {
        if (y1 === y2) ctx.fillRect(X(x1), Y(y1) - e, (x2 - x1) * s, e);
        else ctx.fillRect(X(x1) - 1.5, Y(y1) - e, 3, (y2 - y1) * s + e);
      }
      ctx.strokeStyle = MUR; ctx.lineWidth = Math.max(2, 4 * s);
      for (const [x1, y1, x2, y2] of MURS) { ctx.beginPath(); ctx.moveTo(X(x1), Y(y1) - e); ctx.lineTo(X(x2), Y(y2) - e); ctx.stroke(); }
    }
    function dessinerPortique() {
      const x = X(PORTE.x), y = Y(PORTE.y), u = Math.max(0.45, s);
      const souffle = reduit ? 0.3 : 0.26 + 0.1 * Math.sin(horloge * 2);
      const g = ctx.createRadialGradient(x, y - 14 * u, 4, x, y - 14 * u, 80 * u);
      g.addColorStop(0, hexA(ACCENT, souffle + 0.2)); g.addColorStop(1, hexA(ACCENT, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y - 14 * u, 80 * u, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = hexA(ACCENT, 0.2); ctx.fillRect(x - 22 * u, y - 36 * u, 44 * u, 40 * u);
      if (!reduit) { const b = ((horloge * 0.8) % 1) * 38 * u; ctx.fillStyle = hexA('#E6DDFF', 0.55); ctx.fillRect(x - 22 * u, y - 36 * u + b, 44 * u, 2); }
      for (const dx of [-30, 22]) { ctx.fillStyle = '#4A3E9A'; ctx.fillRect(x + dx * u, y - 40 * u, 8 * u, 46 * u); ctx.strokeStyle = MUR; ctx.lineWidth = 1; ctx.strokeRect(x + dx * u, y - 40 * u, 8 * u, 46 * u); }
      ctx.fillStyle = '#6B58D6'; ctx.fillRect(x - 34 * u, y - 50 * u, 68 * u, 12 * u); ctx.strokeStyle = MUR; ctx.strokeRect(x - 34 * u, y - 50 * u, 68 * u, 12 * u);
      for (let k = 0; k < 5; k++) disque(x - 24 * u + k * 12 * u, y - 44 * u, 1.6 * u + 0.5, led(k + 40, 3) ? '#FFE3A3' : '#2A2466');
      if (s >= 0.55) {
        ctx.font = `700 ${Math.max(9, 11 * s)}px "IBM Plex Mono",monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        ctx.fillStyle = 'rgba(22,26,64,.8)'; ctx.fillRect(x - 38 * u, y + 10 * u, 76 * u, 15 * u);
        ctx.fillStyle = '#D9CCFF'; ctx.fillText('PARE-FEU', x, y + 12 * u);
      }
    }
    function icone(type, u) {
      const clair = '#DCE8FF', ecran = '#3D74C0', sombre = '#1E3566';
      const R = (c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(x * u, y * u, w * u, h * u); };
      ctx.lineWidth = Math.max(1, u * 0.16); ctx.strokeStyle = clair;
      if (type === 'poste') { R(clair, -0.85, -0.75, 1.7, 1.1); R(ecran, -0.68, -0.6, 1.36, 0.78); R(clair, -0.12, 0.35, 0.24, 0.3); R(clair, -0.5, 0.62, 1, 0.16); }
      else if (type === 'portable') { R(clair, -0.75, -0.8, 1.5, 1); R(ecran, -0.6, -0.66, 1.2, 0.72); R(clair, -1.05, 0.25, 2.1, 0.32); }
      else if (type === 'visio') { R(clair, -1.1, -0.66, 2.2, 1.2); R(ecran, -0.95, -0.52, 1.9, 0.92); disque(-0.4 * u, -0.1 * u, 0.2 * u, clair); disque(0.4 * u, -0.1 * u, 0.2 * u, clair); R(clair, -0.08, 0.54, 0.16, 0.3); }
      else if (type === 'imprimante') { R('#FFFFFF', -0.45, -0.95, 0.9, 0.55); R(clair, -0.95, -0.45, 1.9, 0.95); R(sombre, -0.62, 0.08, 1.24, 0.14); disque(0.7 * u, -0.25 * u, 0.1 * u + 0.5, OK); }
      else if (type === 'camera') { R(clair, -0.12, -0.95, 0.24, 0.4); ctx.fillStyle = clair; ctx.beginPath(); ctx.arc(0, -0.45 * u, 0.8 * u, 0, Math.PI); ctx.fill(); disque(0, -0.05 * u, 0.3 * u, sombre); disque(0.5 * u, -0.3 * u, 0.09 * u + 0.5, led(3, 1) ? ANOMALIE : sombre); }
      else if (type === 'borne') { disque(0, 0.35 * u, 0.45 * u, clair); for (const r of [0.8, 1.2]) { ctx.beginPath(); ctx.arc(0, 0.35 * u, r * u, -2.45, -0.7); ctx.stroke(); } }
      else if (type === 'serveur') { R(clair, -0.5, -0.95, 1, 1.9); for (const y of [-0.55, -0.15, 0.25]) R(sombre, -0.36, y, 0.72, 0.1); disque(0.25 * u, 0.62 * u, 0.1 * u + 0.5, led(5) ? OK : sombre); }
      else if (type === 'nas') { R(clair, -0.9, -0.75, 1.8, 1.5); for (let k = 0; k < 4; k++) R(sombre, -0.72 + k * 0.4, -0.55, 0.26, 1.1); disque(0.72 * u, 0.6 * u, 0.08 * u + 0.5, led(8) ? DATA : sombre); }
      else if (type === 'switch') { R(clair, -1.05, -0.38, 2.1, 0.76); for (let k = 0; k < 6; k++) disque((-0.75 + k * 0.3) * u, 0, 0.09 * u + 0.5, led(k + 20, 4) ? OK : sombre); }
      else if (type === 'passerelle') { R(clair, -0.95, -0.2, 1.9, 0.68); ctx.beginPath(); ctx.moveTo(-0.6 * u, -0.2 * u); ctx.lineTo(-0.85 * u, -0.95 * u); ctx.moveTo(0.6 * u, -0.2 * u); ctx.lineTo(0.85 * u, -0.95 * u); ctx.stroke(); disque(0, 0.14 * u, 0.1 * u + 0.5, led(11) ? DATA : sombre); }
    }
    function dessinerAppareil(a) {
      const z = zone(cfg, a.id), c = ZONE[z].couleur, x = X(a.x), y = Y(a.y), r = Math.max(8, 21 * s);
      ctx.save();
      ctx.globalAlpha = surligne && !surligne.includes(z) ? 0.35 : 1;
      ctx.fillStyle = 'rgba(8,12,40,.4)'; ctx.beginPath(); ctx.ellipse(x + r * 0.2, y + r * 0.9, r, r * 0.34, 0, 0, Math.PI * 2); ctx.fill();
      const g = ctx.createRadialGradient(x, y, r * 0.5, x, y, r * 2);
      g.addColorStop(0, hexA(c, z === '1' ? 0.18 : 0.5)); g.addColorStop(1, hexA(c, 0));
      disque(x, y, r * 2, g);
      disque(x, y, r, '#15295A');
      ctx.strokeStyle = c; ctx.lineWidth = Math.max(2, 3.2 * s); ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
      ctx.translate(x, y); icone(a.icone, r * 0.6); ctx.translate(-x, -y);
      if (survol === a.id) { ctx.strokeStyle = TEXTE; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, r + 5, 0, Math.PI * 2); ctx.stroke(); }
      if (a.compromis) {
        const p = reduit ? 0.5 : (horloge * 0.9) % 1;
        ctx.strokeStyle = hexA(ANOMALIE, 1 - p); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, r + 3 + p * 12 * Math.max(s, 0.5), 0, Math.PI * 2); ctx.stroke();
      }
      if (a.vuln) {
        const k = r * 0.5, vx = x - r * 0.95, vy = y - r * 0.7;
        ctx.fillStyle = AMBRE; ctx.beginPath(); ctx.moveTo(vx, vy - k); ctx.lineTo(vx + k * 0.95, vy + k * 0.6); ctx.lineTo(vx - k * 0.95, vy + k * 0.6); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#1A1633'; ctx.fillRect(vx - 0.8, vy - k * 0.45, 1.6, k * 0.6); ctx.fillRect(vx - 0.8, vy + k * 0.28, 1.6, 1.6);
      }
      if (a.critique) {
        const k = r * 0.38, cx = x + r * 0.9, cy = y - r * 0.78;
        ctx.fillStyle = '#FFE3A3'; ctx.strokeStyle = '#1A1633'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(cx, cy - k); ctx.lineTo(cx + k, cy); ctx.lineTo(cx, cy + k); ctx.lineTo(cx - k, cy); ctx.closePath(); ctx.fill(); ctx.stroke();
      }
      if (s >= 0.55) {
        ctx.font = `600 ${Math.max(9, 11.5 * s)}px "Archivo",system-ui,sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        const nom = `${a.court} · ${z === 'vpn' ? 'VPN' : z === '1' ? 'VLAN 1' : z}`;
        const w = ctx.measureText(nom).width + 10, ly = y + r + 11 * s + 4;
        ctx.fillStyle = 'rgba(18,24,62,.82)'; ctx.fillRect(x - w / 2, ly - 8 * s - 1, w, 16 * s + 2);
        ctx.fillStyle = c; ctx.fillRect(x - w / 2, ly - 8 * s - 1, 3, 16 * s + 2);
        ctx.fillStyle = TEXTE; ctx.fillText(nom, x + 1, ly);
      }
      ctx.restore();
    }
    const centreZone = z => {
      const l = APPAREILS.filter(a => zone(cfg, a.id) === z);
      return l.length ? { x: l.reduce((t, a) => t + a.x, 0) / l.length, y: l.reduce((t, a) => t + a.y, 0) / l.length } : null;
    };
    function dessinerRegles() {
      ctx.lineCap = 'round';
      for (const r of reglesActives(cfg)) {
        const a = centreZone(r.de);
        const cibles = (r.vers === 'tous' ? COLONNES.filter(z => z !== '99') : [r.vers]).map(centreZone).filter(Boolean);
        if (!a) continue;
        ctx.strokeStyle = hexA(SERVICES[r.service].couleur, 0.9); ctx.lineWidth = Math.max(1.5, 3 * s);
        ctx.setLineDash([9 * s + 2, 7 * s + 2]); ctx.lineDashOffset = reduit ? 0 : -horloge * 30;
        for (const b of cibles) {
          ctx.beginPath(); ctx.moveTo(X(a.x), Y(a.y));
          ctx.quadraticCurveTo(X((a.x + PORTE.x) / 2), Y(Math.min(a.y, PORTE.y) - 50), X(PORTE.x), Y(PORTE.y - 20));
          ctx.quadraticCurveTo(X((b.x + PORTE.x) / 2), Y(Math.min(b.y, PORTE.y) - 50), X(b.x), Y(b.y));
          ctx.stroke();
        }
      }
      ctx.setLineDash([]);
    }
    const minutesDe = t => DEBUT_MIN + (t / JOUR_S) * (FIN_MIN - DEBUT_MIN);
    const tDe = m => (m - DEBUT_MIN) / (FIN_MIN - DEBUT_MIN) * JOUR_S;
    function anneau(x, y, r, couleur, largeur, tirets) { ctx.strokeStyle = couleur; ctx.lineWidth = largeur; ctx.setLineDash(tirets || []); ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); }
    function dessinerJour() {
      const t = jour.t, p = t / JOUR_S, u = Math.max(0.5, s);
      ctx.fillStyle = `rgba(255,190,140,${0.1 * (1 - p)})`; ctx.fillRect(X(0), Y(18), W * s, (H - 12) * s);
      ctx.fillStyle = `rgba(255,120,200,${0.1 * p})`; ctx.fillRect(X(0), Y(18), W * s, (H - 12) * s);
      for (const q of jour.paquets) {
        const age = t - q.t0, f = age / q.duree, fin = q.pts[q.pts.length - 1];
        if (reduit) {
          if (age < -1 || age >= JOUR_S / 12) continue;
          ctx.strokeStyle = hexA(q.couleur, 0.7); ctx.lineWidth = 2 * u; ctx.beginPath();
          q.pts.forEach((pt, i) => i ? ctx.lineTo(X(pt.x), Y(pt.y)) : ctx.moveTo(X(pt.x), Y(pt.y))); ctx.stroke();
          disque(X(fin.x), Y(fin.y), 6 * u, q.couleur);
          continue;
        }
        if (f < 0 || f > 1.7) continue;
        if (f <= 1) {
          const a = pointA(q.pts, q.l, f), b = pointA(q.pts, q.l, Math.max(0, f - 0.1));
          ctx.strokeStyle = hexA(q.couleur, 0.55); ctx.lineWidth = 3 * u; ctx.beginPath(); ctx.moveTo(X(b.x), Y(b.y)); ctx.lineTo(X(a.x), Y(a.y)); ctx.stroke();
          disque(X(a.x), Y(a.y), 7 * u, hexA(q.couleur, 0.3)); disque(X(a.x), Y(a.y), 3.5 * u, q.couleur);
          continue;
        }
        const k = (f - 1) / 0.7;
        anneau(X(fin.x), Y(fin.y), (6 + 24 * k) * u, hexA(q.couleur, 1 - k), 2 * u);
        if (q.issue === 'bloque') for (let i = 0; i < 6; i++) {
          const ang = i * Math.PI / 3 + 0.4, r0 = 8 * u + 14 * k * u;
          ctx.beginPath(); ctx.moveTo(X(fin.x) + Math.cos(ang) * r0, Y(fin.y) + Math.sin(ang) * r0);
          ctx.lineTo(X(fin.x) + Math.cos(ang) * (r0 + 7 * u), Y(fin.y) + Math.sin(ang) * (r0 + 7 * u)); ctx.stroke();
        }
      }
      for (const [id, t0] of jour.touches) if (t >= t0) anneau(X(APP[id].x), Y(APP[id].y), Math.max(12, 30 * s), ROUGE_TEXTE, 2, [4, 4]);
      for (const [id, t0] of jour.balises) {
        if (t < t0) continue;
        const a = APP[id], x = X(a.x), y = Y(a.y), puls = reduit ? 0.5 : (horloge * 1.4) % 1;
        anneau(x, y, Math.max(12, 30 * s) + puls * 14 * u, hexA(ANOMALIE, 1 - puls), 3 * u);
        ctx.fillStyle = ANOMALIE; ctx.fillRect(x - 9 * u, y - 52 * u, 18 * u, 18 * u);
        ctx.fillStyle = '#FFFFFF'; ctx.font = `800 ${13 * u}px "Archivo",sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('!', x, y - 43 * u);
      }
      if (jour.scan === null) return;
      const k = reduit ? 0.6 : (jour.scan / SCAN_S * 2) % 1;
      for (const e of jour.v.intr.etapes) anneau(X(APP[e.source].x), Y(APP[e.source].y), k * 520 * s, hexA(DATA, 0.9 * (1 - k)), 3 * u);
    }
    function dessiner() {
      if (!vivant) return;
      dernierDessin = performance.now();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, CW, CH);
      dessinerFond(); dessinerMobilier(); dessinerGoulottes();
      if (phase >= 2) dessinerRegles();
      dessinerMurs(); dessinerPortique();
      for (const a of PAR_Y) dessinerAppareil(a);
      if (phase === 3 && jour) dessinerJour();
      majHud();
    }
    const PAR_Y = [...APPAREILS].sort((a, b) => a.y - b.y);
    function majHud() {
      const n = reglesActives(cfg).length, c = ZONE[pinceau].couleur;
      const t = phase === 1 ? `Étape 1 · Cloisonner <span><span class="al-pastille" style="background:${c};color:${c}"></span><b>${pinceau} ${ZONE[pinceau].nom}</b></span>`
        : phase === 2 ? `Étape 2 · Règles <span>autorisations <b>${n}/${BUDGET}</b></span>`
          : phase === 3 ? `Étape 3 · Journée <b class="al-horloge">${heure(minutesDe(jour ? jour.t : 0))}</b>${jour && jour.scan !== null ? '<b>OpenVAS simulé</b>' : ''}`
            : 'Étape 4 · Consigner <span>segmentation <b>tenue</b></span>';
      if (t !== hudTexte) { hud.innerHTML = t; hudTexte = t; }
    }
    const annoncer = t => { annonce.textContent = t; };
    etapesEl.innerHTML = ['Cloisonner', 'Règles', 'Journée', 'Consigner'].map((n, k) => `<li><button data-etape="${k + 1}"><b>${k + 1}</b>${n}</button></li>`).join('');
    function majEtapes() {
      const enCours = phase === 3 && jour && !jour.fini;
      etapesEl.querySelectorAll('button').forEach(b => {
        const k = +b.dataset.etape;
        b.classList.toggle('actif', k === phase);
        b.classList.toggle('fait', (k === 1 && planValide) || (k > 1 && k < 4 && rejeuOk));
        if (k === phase) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
        b.disabled = enCours ? k !== 3 : k === 3 ? phase !== 3 : k === 4 ? !rejeuOk : false;
      });
    }
    etapesEl.addEventListener('click', e => {
      const b = e.target.closest('button');
      if (!b || b.disabled || +b.dataset.etape === phase) return;
      const k = +b.dataset.etape;
      if (k === 2 && phase === 1) validerPlan(); else afficherPhase(k);
    });
    function afficherPhase(k) {
      phase = k; indice = 0; surligne = null; if (k !== 3) jour = null; cadre.statut(['Peins les VLAN sur le plan.', 'Ouvre au pare-feu le strict nécessaire.', 'Journée en cours.', 'Consigne le changement.'][k - 1]);
      [rendrePhase1, rendrePhase2, rendrePhase3, rendrePhase4][k - 1]();
      defil.scrollTop = 0; majEtapes(); dessiner();
    }
    function donnerIndice() {
      const liste = INDICES[phase], t = liste[Math.min(indice, liste.length - 1)];
      indice++;
      let el = defil.querySelector('.al-indice');
      if (!el) { el = document.createElement('div'); el.className = 'al-alerte al-indice'; el.style.cssText = `border-color:${DATA};background:rgba(159,232,255,.1)`; defil.querySelector('h3').after(el); }
      el.textContent = `Indice : ${t}`;
      annoncer(t);
    }
    const blocRaisons = () => dernieresRaisons.length ? `<div class="al-alerte"><b>Dernier rejeu :</b><ul>${dernieresRaisons.map(r => `<li>${echapper(r)}</li>`).join('')}</ul></div>` : '';
    let dernieresRaisons = [];
    function rendrePhase1() {
      defil.innerHTML = `<h3>Cloisonner l'étage</h3>
        <p>Tout est sur le VLAN 1 : le portable invité compromis voit tout l'étage. Choisis un VLAN, puis touche ou glisse sur les appareils du plan, ou utilise les boutons.</p>${blocRaisons()}
        <div class="al-sec">Pinceau · plan d'adressage</div>
        <div class="al-palette" role="group" aria-label="VLAN à peindre">${VLANS.map(v => `<button class="al-btn" data-vlan="${v.id}"><span class="al-pastille" style="background:${v.couleur};color:${v.couleur}"></span><span>${v.id} · ${v.nom}</span><small>10.0.${v.id}.0/24 · <b data-eff></b></small></button>`).join('')}</div>
        <div class="al-sec">Appareils</div>
        <div class="al-apps">${APPAREILS.map(a => `<button class="al-btn al-app" data-app="${a.id}"${a.fixe ? ' disabled' : ''}><i></i><span>${a.nom}</span><small></small></button>`).join('')}</div>
        <div class="al-revue" role="alert" hidden></div>
        <button class="al-btn or" data-action="valider">Valider le plan →</button>`;
      defil.querySelectorAll('[data-vlan]').forEach(b => b.addEventListener('click', () => { pinceau = b.dataset.vlan; majPhase1(); dessiner(); }));
      defil.querySelectorAll('[data-app]').forEach(b => b.addEventListener('click', () => peindre(b.dataset.app)));
      defil.querySelector('[data-action="valider"]').addEventListener('click', validerPlan);
      majPhase1();
    }
    function majPhase1() {
      defil.querySelectorAll('[data-vlan]').forEach(b => {
        b.setAttribute('aria-pressed', String(b.dataset.vlan === pinceau));
        const n = APPAREILS.filter(a => zone(cfg, a.id) === b.dataset.vlan).length;
        b.querySelector('[data-eff]').textContent = `${n} appareil${n > 1 ? 's' : ''}`;
      });
      defil.querySelectorAll('[data-app]').forEach(b => {
        const a = APP[b.dataset.app], z = zone(cfg, a.id);
        b.querySelector('i').style.background = ZONE[z].couleur;
        const marques = `${a.vuln ? ` · <em>⚠ ${a.vuln}</em>` : ''}${a.critique ? ' · <u>◆ critique</u>' : ''}`;
        b.querySelector('small').innerHTML = a.fixe === 'vpn' ? 'arrive par le VPN' : `${a.fixe ? 'imposé : ' : ''}${z === '1' ? 'VLAN 1 · à plat' : `VLAN ${z} · ${ZONE[z].nom}`}${marques}`;
        b.setAttribute('aria-label', `${a.nom}, ${a.piece}, ${z === 'vpn' ? 'VPN' : 'VLAN ' + z}${a.vuln ? ', vulnérable : ' + a.vuln : ''}${a.critique ? ', actif critique' : ''}${a.fixe ? '' : '. Peindre en VLAN ' + pinceau}`);
      });
    }
    function peindre(id) {
      const a = APP[id];
      if (a.fixe) { cadre.statut(a.fixe === 'vpn' ? 'Le télétravail arrive par le tunnel VPN : sa zone est imposée.' : 'Le portable invité reste sur le VLAN 30 : il arrive par le Wi-Fi invités.'); return; }
      if (cfg.vlans[id] === pinceau) return;
      cfg = { ...cfg, vlans: { ...cfg.vlans, [id]: pinceau } };
      planValide = false; rejeuOk = false;
      const regles = Object.fromEntries(Object.entries(cfg.regles).filter(([cle, sv]) => servicesDe(cfg, cle.split('>')[1]).includes(sv)));
      if (Object.keys(regles).length !== Object.keys(cfg.regles).length) { cfg = { ...cfg, regles }; cadre.statut("Règle retirée : plus aucun appareil de sa colonne n'offre ce service."); }
      if (phase === 1) majPhase1();
      majEtapes(); dessiner();
    }
    function validerPlan() {
      const erreurs = revuePlan(cfg), revue = defil.querySelector('.al-revue');
      if (!erreurs.length) { planValide = true; afficherPhase(2); return; }
      revue.hidden = false; revue.className = 'al-revue al-alerte';
      revue.innerHTML = `<b>Revue du plan :</b><ul>${erreurs.slice(0, 4).map(e => `<li>${echapper(e)}</li>`).join('')}${erreurs.length > 4 ? `<li>et ${erreurs.length - 4} autre(s).</li>` : ''}</ul>`;
      annoncer(`Plan refusé : ${erreurs.length} point(s) à revoir.`);
    }
    function rendrePhase2() {
      defil.innerHTML = `<h3>Écrire les règles</h3>
        <p>Refus par défaut entre VLAN. Touche une cellule pour ouvrir un service de la ligne (source) vers la colonne (destination). Un service par cellule, ${BUDGET} autorisations au plus.</p>${blocRaisons()}
        <div class="al-sec">Les six flux dont l'entreprise a besoin</div><ul class="al-flux"></ul>
        <div class="al-sec">Pare-feu · source → destination</div>
        <div class="al-mat"><table class="al-matrice"><thead><tr><th></th>${COLONNES.map(c => `<th scope="col">${c}<br>${ZONE[c].nom.slice(0, 6)}</th>`).join('')}</tr></thead>
        <tbody>${LIGNES_MATRICE.map(l => `<tr><th scope="row">${libZone(l)}</th>${COLONNES.map(c => `<td${l === c ? ' class="diag"' : ''}><button data-cle="${l}>${c}"></button></td>`).join('')}</tr>`).join('')}</tbody></table></div>
        <button class="al-btn" data-action="admin"></button>
        <div class="al-sec">Autorisations <b data-budget></b></div><div class="al-jauge"><i></i></div>
        <ul class="al-regles"></ul>
        <button class="al-btn or" data-action="rejouer">Rejouer la journée →</button>`;
      defil.querySelectorAll('[data-cle]').forEach(b => {
        b.addEventListener('click', () => cycler(b.dataset.cle));
        const marquer = on => { surligne = on ? b.dataset.cle.split('>') : null; dessiner(); };
        b.addEventListener('pointerenter', () => marquer(true)); b.addEventListener('focus', () => marquer(true));
        b.addEventListener('pointerleave', () => marquer(false)); b.addEventListener('blur', () => marquer(false));
      });
      defil.querySelector('[data-action="admin"]').addEventListener('click', () => {
        if (!cfg.admin && reglesActives(cfg).length >= BUDGET) { refuserBudget(); return; }
        cfg = { ...cfg, admin: !cfg.admin }; rejeuOk = false; majPhase2();
      });
      defil.querySelector('[data-action="rejouer"]').addEventListener('click', lancerJour);
      majPhase2();
    }
    function refuserBudget() { cadre.statut(`Budget atteint : ${BUDGET} autorisations. Retire une règle d'abord.`, 'ko'); annoncer('Budget atteint.'); }
    function cycler(cle) {
      const offerts = servicesDe(cfg, cle.split('>')[1]), actuel = cfg.regles[cle];
      const suivant = actuel ? offerts[offerts.indexOf(actuel) + 1] : offerts[0];
      if (!actuel && suivant && reglesActives(cfg).length >= BUDGET) { refuserBudget(); return; }
      const regles = { ...cfg.regles };
      if (suivant) regles[cle] = suivant; else delete regles[cle];
      cfg = { ...cfg, regles }; rejeuOk = false;
      majPhase2();
      annoncer(suivant ? `Autorisé : ${SERVICES[suivant].nom}` : 'Bloqué');
    }
    function majPhase2() {
      defil.querySelectorAll('[data-cle]').forEach(b => {
        const [l, c] = b.dataset.cle.split('>'), sv = cfg.regles[b.dataset.cle], offerts = servicesDe(cfg, c);
        if (l === c) { b.textContent = 'même'; b.disabled = true; b.title = 'même VLAN : pas de pare-feu'; return; }
        b.disabled = !offerts.length && !sv;
        b.classList.toggle('ouvert', !!sv);
        b.style.background = sv ? SERVICES[sv].couleur : ''; b.style.borderColor = sv ? SERVICES[sv].couleur : '';
        b.textContent = sv ? SERVICES[sv].court : offerts.length ? 'bloqué' : '—';
        b.setAttribute('aria-label', `${libZone(l)} vers ${libZone(c)} : ${sv ? 'autorisé, ' + SERVICES[sv].nom : offerts.length ? 'bloqué, services possibles : ' + offerts.map(o => SERVICES[o].nom).join(', ') : 'aucun service à ouvrir'}`);
      });
      const admin = defil.querySelector('[data-action="admin"]');
      admin.innerHTML = `99 Administration → tous : administration · <b style="color:${cfg.admin ? OK : TEXTE_2}">${cfg.admin ? 'autorisé' : 'bloqué'}</b>`;
      admin.setAttribute('aria-pressed', String(cfg.admin)); admin.style.borderColor = cfg.admin ? SERVICES.administration.couleur : '';
      const actives = reglesActives(cfg), n = actives.length;
      defil.querySelector('[data-budget]').textContent = `${n}/${BUDGET}`;
      defil.querySelector('.al-jauge i').style.width = `${(n / BUDGET) * 100}%`;
      defil.querySelector('.al-regles').innerHTML = n ? actives.map(r => `<li style="--c:${SERVICES[r.service].couleur}">autoriser ${echapper(texteRegle(r))}</li>`).join('')
        : `<li style="--c:${LIGNE}">aucune : tout est refusé entre VLAN</li>`;
      defil.querySelector('.al-flux').innerHTML = FLUX.map(f => {
        const besoins = [...new Set(etatFlux(cfg, f).paires.map(p => p.meme ? 'même VLAN' : `${p.a === 'vpn' ? 'VPN' : p.a}→${p.b}`))];
        return `<li><span>${f.id} · ${f.nom}</span><small>${besoins.join(', ')} · ${SERVICES[f.service].court}</small></li>`;
      }).join('');
      dessiner();
    }
    function paquet(src, dst, t0, couleur, issue) {
      const pts = issue === 'bloque' ? CHEMINS[src] : CHEMINS[src].concat(CHEMINS[dst].slice(0, -1).reverse());
      return { pts, l: longueurs(pts), t0, duree: DUREE_PAQUET * (issue === 'bloque' ? 0.6 : 1), couleur, issue };
    }
    function lancerJour() {
      const v = verdict(cfg), evts = [];
      for (const x of v.flux) for (const m of x.f.heures) evts.push({ t: tDe(m), faire: () => evtFlux(x, m) });
      evts.push({ t: tDe(INTRUS_MIN), faire: () => evtIntrus(v.intr) });
      evts.sort((a, b) => a.t - b.t);
      jour = { t: 0, v, evts, i: 0, paquets: [], balises: new Map(), touches: new Map(), scan: null, fini: false, acc: 1, pas: 0, vus: new Set(), intrus: false };
      afficherPhase(3);
      annoncer('Rejeu de la journée lancé.');
    }
    function rendrePhase3() {
      defil.innerHTML = `<h3>Rejouer la journée</h3>
        <p>08:30 → 18:00. Les flux métier traversent le pare-feu ; à 11:40, le portable invité sonde tout ce que tes règles lui laissent joindre. Tout appareil joint et vulnérable devient un pivot.</p>
        <div class="al-tableau"><div data-t="flux">Flux métier<b>0/6</b></div><div data-t="crit">Actifs critiques atteints<b>0</b></div><div data-t="regles">Autorisations<b>${jour.v.regles.length}/${BUDGET}</b></div></div>
        <button class="al-btn" data-action="accel" aria-pressed="false">Accélérer ×4</button>
        <div class="al-sec">Journal</div><ul class="al-journal"></ul><div class="al-resultat"></div>`;
      defil.querySelector('[data-action="accel"]').addEventListener('click', e => { jour.acc = jour.acc === 1 ? 4 : 1; e.currentTarget.setAttribute('aria-pressed', String(jour.acc === 4)); e.currentTarget.textContent = jour.acc === 4 ? 'Vitesse normale' : 'Accélérer ×4'; });
    }
    function journal(texte, classe) {
      const ul = defil.querySelector('.al-journal'), li = document.createElement('li');
      if (ul) { li.className = classe || ''; li.textContent = texte; ul.appendChild(li); defil.scrollTop = defil.scrollHeight; }
    }
    function majTableau() {
      const passes = jour.v.flux.filter(x => jour.vus.has(x.f.id) && x.ok).length, ratesFlux = jour.v.flux.some(x => jour.vus.has(x.f.id) && !x.ok);
      const crit = jour.intrus ? jour.v.intr.critiques.length : 0, cases = defil.querySelectorAll('.al-tableau div');
      cases[0].querySelector('b').textContent = `${passes}/${FLUX.length}`; cases[0].className = ratesFlux ? 'ko' : passes === FLUX.length ? 'ok' : '';
      cases[1].querySelector('b').textContent = String(crit); cases[1].className = crit ? 'ko' : jour.intrus ? 'ok' : '';
    }
    function evtFlux(x, m) {
      x.paires.forEach((p, k) => jour.paquets.push(paquet(p.s, p.d, jour.t + k * 0.12, p.ok ? SERVICES[x.f.service].couleur : AMBRE, p.ok ? 'passe' : 'bloque')));
      if (jour.vus.has(x.f.id)) return;
      jour.vus.add(x.f.id);
      const manque = [...new Set(x.paires.filter(p => !p.ok).map(p => texteRegle({ de: p.a, vers: p.a === '99' ? 'tous' : p.b, service: x.f.service })))];
      const detail = x.ok ? (x.paires.every(p => p.meme) ? 'même VLAN, sans pare-feu' : 'passe le pare-feu') : `bloqué au pare-feu, il manque ${manque.join(' ; ')}`;
      journal(`${heure(m)} · ${x.f.id} ${x.f.nom} : ${x.ok ? '✓' : '✗'} ${detail}`, x.ok ? 'ok' : 'ko');
      majTableau();
    }
    function evtIntrus(intr) {
      const noms = ids => enListe(ids.map(id => APP[id].nom));
      intr.etapes.forEach((e, k) => {
        const t0 = jour.t + k * 1.4, dejaVus = new Set(intr.etapes.slice(0, k).flatMap(x => x.joints));
        for (const a of APPAREILS) {
          if (a.id === e.source || a.id === 'portable' || dejaVus.has(a.id)) continue;
          const touche = e.joints.includes(a.id);
          jour.paquets.push(paquet(e.source, a.id, t0, touche ? ROUGE_TEXTE : AMBRE, touche ? 'intrus' : 'bloque'));
          if (touche) (a.critique ? jour.balises : jour.touches).set(a.id, t0 + DUREE_PAQUET);
        }
        journal(k === 0 ? `${heure(INTRUS_MIN)} · L'intrus sonde depuis le VLAN ${e.vlan} : ${e.joints.length ? 'il joint ' + noms(e.joints) : 'il ne joint rien'}.`
          : `Pivot par ${APP[e.source].nom} (${APP[e.source].vuln}) : il repart du VLAN ${e.vlan} et joint ${e.joints.length ? noms(e.joints) : 'rien de plus'}.`, e.joints.some(id => APP[id].critique) ? 'ko' : 'info');
      });
      journal(intr.critiques.length ? `✗ Actif critique atteint : ${noms(intr.critiques)}.` : '✓ Aucun actif critique atteint.', intr.critiques.length ? 'ko' : 'ok');
      jour.intrus = true; majTableau();
    }
    function avancerJour(dt) {
      if (jour.scan !== null) { jour.scan += dt; if (jour.scan >= SCAN_S) finirJour(); return; }
      if (reduit) { jour.pas += dt; if (jour.pas < PAS_REDUIT_S) return; jour.pas = 0; dt = JOUR_S / 12; }
      jour.t = Math.min(JOUR_S, jour.t + dt);
      while (jour.i < jour.evts.length && jour.evts[jour.i].t <= jour.t) jour.evts[jour.i++].faire();
      if (jour.t >= JOUR_S && jour.i >= jour.evts.length && jour.paquets.every(q => jour.t - q.t0 > q.duree)) {
        jour.scan = 0;
        journal(`18:00 · Campagne OpenVAS simulée depuis la position de l'intrus (VLAN ${jour.v.intr.positions.join(', ')}).`, 'info');
      }
    }
    function raisons(v) {
      const r = v.flux.filter(x => !x.ok).map(x => `${x.f.id} ${x.f.nom} est bloqué au pare-feu.`);
      if (v.intr.critiques.length) {
        const pivots = v.intr.etapes.slice(1).map(e => APP[e.source].nom);
        r.push(`L'intrus atteint ${enListe(v.intr.critiques.map(leNom))}${pivots.length ? `, après un pivot par ${enListe(pivots)}` : ''} (${enListe(v.intr.critiques.map(id => { const at = v.intr.atteints.get(id); return `${APP[id].court} : depuis le VLAN ${at.depuis}, ${at.via}`; }))}).`);
      }
      return r.concat(v.inutiles.map(u => `La règle ${texteRegle(u)} ne sert aucun flux métier : elle ouvre sans rien servir.`));
    }
    function finirJour() {
      const v = jour.v;
      jour.fini = true;
      const res = defil.querySelector('.al-resultat');
      res.innerHTML = `<div class="al-sec" style="margin:10px 0 6px">Campagne OpenVAS simulée</div><ul class="al-journal">${APPAREILS.filter(a => a.vuln).map(a => {
        const at = v.intr.atteints.get(a.id), pivot = v.intr.etapes.some(e => e.source === a.id);
        return `<li class="${at ? (pivot ? 'ko' : 'info') : 'ok'}">${a.nom} : ${a.vuln} — ${at ? `joignable (${at.via}), ${pivot ? `pivot vers le VLAN ${zone(cfg, a.id)}` : 'aucun pivot utile'}` : "injoignable depuis la position de l'intrus"}</li>`;
      }).join('')}</ul>`;
      majEtapes();
      if (v.ok) {
        rejeuOk = true; dernieresRaisons = [];
        res.insertAdjacentHTML('beforeend', `<div class="al-alerte ok" style="margin-top:10px">Flux métier ${v.fluxOk}/${FLUX.length} · Actifs critiques atteints 0 · Autorisations ${v.regles.length}/${BUDGET}. La segmentation tient.</div>
          <button class="al-btn or" data-action="consigner" style="margin-top:10px;width:100%">Consigner le changement →</button>`);
        res.querySelector('[data-action="consigner"]').addEventListener('click', () => afficherPhase(4));
        majEtapes(); cadre.statut('La segmentation tient.', 'ok'); annoncer('La segmentation tient. Consigne le changement.');
        defil.scrollTop = defil.scrollHeight;
        return;
      }
      rates++;
      dernieresRaisons = raisons(v);
      const cible = v.intr.critiques.some(id => v.intr.atteints.get(id).via === 'même VLAN') || v.intr.etapes.length > 1 ? 1 : 2;
      cadre.statut(`Rejeu raté : ${dernieresRaisons.length} point(s) à reprendre.`, 'ko');
      cadre.fin({
        titre: 'Pas tout à fait',
        texte: `${echapper(dernieresRaisons.join(' '))} Tes VLAN et tes règles sont conservés : reprends à l'étape ${cible}.`,
        bouton: 'Rejouer',
        action: () => { const f = cadre.corps.querySelector('.jx-fin'); if (f) f.remove(); afficherPhase(cible); },
      });
    }
    function rendrePhase4() {
      const choix = formulations(cfg, verdict(cfg));
      defil.innerHTML = `<h3>Consigner le changement</h3>
        <p>Consigne le changement pour l'équipe. Les trois phrases sont tirées de ta configuration : laquelle permet à quelqu'un d'autre de vérifier la refonte ?</p>
        <div class="al-choix">${choix.map((c, k) => `<button class="al-btn" data-choix="${k}">${echapper(c.texte)}</button>`).join('')}</div><div class="al-retour" aria-live="polite"></div>`;
      defil.querySelectorAll('[data-choix]').forEach(b => b.addEventListener('click', () => {
        const c = choix[+b.dataset.choix];
        b.classList.add(c.bonne ? 'ok' : 'ko');
        defil.querySelector('.al-retour').innerHTML = `<div class="al-alerte${c.bonne ? ' ok' : ''}">${echapper(c.pourquoi)}</div>`;
        if (c.bonne) gagner();
      }));
    }
    function gagner() {
      const v = verdict(cfg), n = v.regles.length, score = Math.max(SCORE_MIN, 100 - 10 * rates), pl = n > 1 ? 's' : '';
      const bilan = `Six flux métier sur six, aucun actif critique atteint, ${n} autorisation${pl} sur ${BUDGET}${rates ? `, après ${rates} rejeu${rates > 1 ? 'x' : ''} raté${rates > 1 ? 's' : ''}` : ', du premier coup'}.`;
      const doc = `<span class="al-doc"><b>Document de refonte · ta configuration</b>${VLANS.map(z => `<span>VLAN ${z.id} ${z.nom} · 10.0.${z.id}.0/24 · ${APPAREILS.filter(a => zone(cfg, a.id) === z.id).length} appareil(s)</span>`).join('')}
        ${v.regles.map(r => `<span>autoriser ${echapper(texteRegle(r))} (${r.flux.map(f => f.id).join(', ')})</span>`).join('')}<span>tout le reste : refusé</span></span>`;
      const fait = `<span class="al-doc"><b>Au CV · ${echapper(api.FAITS.albys.poste)}</b>${echapper(api.FAITS.albys.texte)}</span>`;
      const message = `Refonte jouée : ${n} autorisation${pl} inter-VLAN, 6 flux métier sur 6, intrus confiné au VLAN ${v.intr.positions.join(', ')}${rates ? `, après ${rates} rejeu(x) raté(s)` : ''}.`.slice(0, 200);
      cadre.statut('Quartier validé.', 'ok');
      cadre.fin({ titre: 'Quartier validé', texte: `<span class="al-fin-defil">${bilan}${doc}${fait}${echapper(api.FAITS.albys.pourLePoste)}</span>`, bouton: 'Prendre la clé', action: () => api.fini({ score, message }) });
    }
    function appareilSous(e) {
      const r = canvas.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      let meilleur = null, d0 = Math.max(18, 30 * s);
      for (const a of APPAREILS) { const d = Math.hypot(x - X(a.x), y - Y(a.y)); if (d < d0) { d0 = d; meilleur = a.id; } }
      return meilleur;
    }
    function montrerInfo(id) {
      info.hidden = !id; if (!id) return;
      const a = APP[id], z = zone(cfg, id);
      info.innerHTML = `${a.nom}<small>${a.piece} · ${z === 'vpn' ? 'VPN' : 'VLAN ' + z} · ${a.services.length ? a.services.map(sv => SERVICES[sv].nom).join(', ') : 'aucun service exposé'}${a.vuln ? ` · ⚠ ${a.vuln}` : ''}${a.critique ? ' · ◆ actif critique' : ''}</small>`;
    }
    canvas.addEventListener('pointerdown', e => {
      const id = appareilSous(e);
      montrerInfo(id);
      if (!id || phase !== 1) return;
      peinture = true; peindre(id);
      try { canvas.setPointerCapture(e.pointerId); } catch (_) { /* pointeur synthétique sans capture */ }
    });
    canvas.addEventListener('pointermove', e => {
      const id = appareilSous(e);
      if (id !== survol) { survol = id; montrerInfo(id); canvas.classList.toggle('main', !!id); }
      if (peinture && id && !APP[id].fixe) peindre(id);
    });
    for (const type of ['pointerup', 'pointercancel']) canvas.addEventListener(type, () => { peinture = false; });
    canvas.addEventListener('pointerleave', () => { survol = null; info.hidden = true; });
    function tic() {
      if (!vivant || enPause) return;
      if (!reduit) horloge += INTERVALLE_MS / 1000;
      if (phase === 3 && jour && !jour.fini) avancerJour((INTERVALLE_MS / 1000) * vitesse * jour.acc);
      if (performance.now() - dernierDessin > 200) dessiner();
    }
    function boucle() { if (!vivant || enPause) return; dessiner(); raf = requestAnimationFrame(boucle); }
    function demarrer() { minuteur = setInterval(tic, INTERVALLE_MS); if (reduit) dessiner(); else raf = requestAnimationFrame(boucle); }
    function arreter() { clearInterval(minuteur); cancelAnimationFrame(raf); }
    afficherPhase(1);
    redimensionner();
    demarrer();
    async function attendreQue(cond, maxMs) {
      const t0 = performance.now();
      while (!cond()) { if (performance.now() - t0 > maxMs) throw new Error('attente dépassée'); await attendre(30); }
    }
    const cliquer = sel => { const b = racine.querySelector(sel); if (!b || b.disabled) throw new Error(`bouton indisponible : ${sel}`); b.click(); };
    return {
      demonter() { vivant = false; arreter(); observateur.disconnect(); conteneur.innerHTML = ''; },
      pause() { if (vivant && !enPause) { enPause = true; arreter(); } },
      reprendre() { if (vivant && enPause) { enPause = false; demarrer(); } },
      // Joue la configuration de référence par les mêmes boutons que le joueur.
      async resoudre() {
        vitesse = 10;
        const ouvert = cadre.corps.querySelector('.jx-fin .jx-btn');
        if (ouvert) ouvert.click();
        if (phase === 3 && jour && !jour.fini) await attendreQue(() => jour.fini, 15000);
        if (phase !== 1) cliquer('[data-etape="1"]');
        for (const [id, v] of Object.entries(REFERENCE.vlans)) { cliquer(`[data-vlan="${v}"]`); cliquer(`[data-app="${id}"]`); }
        cliquer('[data-action="valider"]');
        const cellules = [...racine.querySelectorAll('.al-matrice [data-cle]')];
        for (const b of cellules.filter(c => cfg.regles[c.dataset.cle] && !REFERENCE.regles[c.dataset.cle])) while (cfg.regles[b.dataset.cle]) b.click();
        for (const b of cellules.filter(c => REFERENCE.regles[c.dataset.cle])) for (let n = 0; n < 8 && cfg.regles[b.dataset.cle] !== REFERENCE.regles[b.dataset.cle]; n++) b.click();
        if (cfg.admin !== REFERENCE.admin) cliquer('[data-action="admin"]');
        await attendre(30);
        cliquer('[data-action="rejouer"]');
        await attendreQue(() => jour && jour.fini, 15000);
        cliquer('[data-action="consigner"]');
        cliquer(`[data-choix="${formulations(cfg, verdict(cfg)).findIndex(c => c.bonne)}"]`);
        await attendre(40);
        const fin = cadre.corps.querySelector('.jx-fin .jx-btn');
        if (fin) fin.click();
      },
    };
  },
};
