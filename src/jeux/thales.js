// QUARTIER 3 — THALES — verbe INSTRUMENTER — « Qui prend la place ? »
//
// Un nuage de points : chaque point est un fichier d'un volume de stockage presque plein, placé selon la date de
// sa dernière modification (abscisse) et sa taille (ordonnée, échelle logarithmique). Plus le fichier est gros,
// plus le point est large. Au survol : nom, taille, date, propriétaire, serveur et emplacement du serveur.
// Le joueur repère les gros fichiers anciens, contacte leur propriétaire et ne supprime qu'avec son accord, jusqu'à
// repasser sous le seuil. Six messages seulement : certains propriétaires diront de garder.
// Fichiers, propriétaires et serveurs sont fictifs ; le fait de CV est cité en fin de partie depuis api.FAITS.
// Données déterministes (mulberry32).

import { creerCadre, creerLateral, attendre } from './_contrat.js';
import { FAITS } from '../cv.js';

const ACCENT = '#3EE0C0';
const C = {
  fond: '#1B2152', grille: 'rgba(170,180,255,.13)', axe: 'rgba(205,212,255,.62)', texte: '#EEF1FF', texte2: '#B9C0E8',
  point: '#8FD8FF', attente: '#C9B6FF', ok: '#6FCF8E', garder: '#FFB86B', selection: '#FFD166', zone: 'rgba(62,224,192,.11)',
};
const CONTACTS = 6, SEUIL = 0.75, REMPLISSAGE = 0.94, NB_REMPLISSAGE = 58;
const AN_MIN = 2012, AN_MAX = 2022, Y_MIN = 0.008, Y_MAX = 400;       // abscisse en années, ordonnée en Go (log)
const ZONE_AN = 2019, ZONE_GO = 30;                                  // l'indice surligne : avant 2019, plus de 30 Go
const MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const SERVEURS = { 'stockage-01': 'salle A, baie 1', 'stockage-02': 'salle A, baie 3', 'stockage-03': 'salle B, baie 2' };
const LIBELLES = { libre: 'non contacté', attente: 'message envoyé…', ok: 'accord pour supprimer', garder: 'à garder', supprime: 'supprimé', parti: 'supprimé' };
const COULEURS = { libre: C.point, attente: C.attente, ok: C.ok, garder: C.garder, supprime: C.ok, parti: C.ok };

// [nom, taille en Go, année, mois (0-11), propriétaire, serveur, vérité, réponse du propriétaire]
const CLES = [
  // Gros, anciens, plus utiles : les vrais candidats.
  ['banc_essais_2014_brut.tar', 182, 2014, 2, 'm.lefevre · Essais', 'stockage-02', 'ok', "Les résultats sont publiés depuis 2015, le brut ne sert plus à personne. Tu peux supprimer."],
  ['vm_banc_2015_ancienne.vmdk', 138, 2015, 5, 'r.garnier · Infrastructure', 'stockage-02', 'ok', "Cette VM de banc est décommissionnée depuis des années. Supprime."],
  ['export_mesures_2013_doublon.zip', 104, 2013, 10, 'équipe Mesures', 'stockage-01', 'ok', "C'est un doublon de l'export déjà versé à l'archive. D'accord pour supprimer."],
  ['captures_video_demo_2016.mov', 96, 2016, 1, 'c.roux · Démonstrations', 'stockage-03', 'ok', "La démo est terminée depuis longtemps, rien à garder."],
  ['logs_debug_2017.gz', 74, 2017, 8, 's.benali · Logiciel', 'stockage-02', 'ok', "Des journaux de débogage de 2017 ? Supprime sans hésiter."],
  ['sauvegarde_poste_adurand_2014.bak', 61, 2014, 7, "a.durand · a quitté l'entreprise", 'stockage-01', 'ok', "Réponse de son ancien responsable : a.durand est parti en 2019, rien à récupérer. Supprimable."],
  // Gros et anciens, mais à garder : c'est pour ça qu'on demande.
  ['archive_reglementaire_programme_2013.tar', 210, 2013, 4, 'service Qualité', 'stockage-01', 'garder', "À garder : archive réglementaire, sa durée de conservation est une obligation."],
  ['reference_calibration_2015.h5', 150, 2015, 0, 'l.moreau · Calibration', 'stockage-03', 'garder', "Surtout pas : c'est la référence de calibration que les bancs utilisent encore."],
  ['simulation_2016_projet_relance.h5', 120, 2016, 9, 'p.nguyen · Simulation', 'stockage-02', 'garder', "Le projet vient d'être relancé, on repart de ces données. À garder."],
  // Gros mais récents : en service.
  ['essais_2021_en_cours.parquet', 230, 2021, 8, 'm.lefevre · Essais', 'stockage-03', 'garder', "On l'exploite cette semaine, ne touche à rien."],
  ['vm_integration_2021.vmdk', 160, 2021, 5, 'r.garnier · Infrastructure', 'stockage-02', 'garder', "C'est la VM d'intégration active."],
  ['campagne_mesures_2020.tar', 90, 2020, 10, 'équipe Mesures', 'stockage-01', 'garder', "Campagne encore en cours d'analyse. À garder."],
];
const PREFIXES = ['rapport', 'essai', 'mesures', 'config', 'script', 'export', 'journal', 'plan_test', 'notes', 'resultats', 'image', 'maquette'];
const EXTENSIONS = ['.pdf', '.csv', '.zip', '.log', '.docx', '.tar.gz', '.h5', '.xlsx', '.json', '.png'];
const PROPRIETAIRES = ['m.lefevre · Essais', 'r.garnier · Infrastructure', 's.benali · Logiciel', 'c.roux · Démonstrations', 'l.moreau · Calibration', 'p.nguyen · Simulation', 'équipe Mesures', 'j.martin · Projets', 'e.faure · Logiciel'];

const CSS = `
.th-jeu{background:#151A42}
.th-jeu .jx-tete,.th-jeu .jx-pied{background:#1A1F4D;border-color:rgba(160,170,255,.22)}
.th-jeu .jx-lat{background:#171C47}
.th-jeu .jx-carte{background:#1E2458;border-color:rgba(160,170,255,.26)}
.th-graphe{flex:1;min-width:0;min-height:240px;position:relative;background:${C.fond}}
.th-graphe canvas{position:absolute;inset:0;width:100%;height:100%;display:block;cursor:crosshair;touch-action:manipulation}
.th-graphe canvas:focus-visible{outline:2px solid #7FA3FF;outline-offset:-3px}
.th-bulle{position:absolute;z-index:3;pointer-events:none;max-width:300px;background:rgba(14,18,48,.96);border:1px solid rgba(160,170,255,.35);
  border-left:3px solid var(--acc);border-radius:3px;padding:8px 10px;font-size:12px;line-height:1.5;color:${C.texte};box-shadow:0 8px 24px rgba(0,0,0,.35)}
.th-bulle b{display:block;font-size:12.5px;color:#fff;word-break:break-all;margin-bottom:2px}
.th-bulle span{color:${C.texte2}}
.th-note{position:absolute;right:14px;bottom:52px;font-size:10.5px;color:${C.texte2};background:rgba(14,18,48,.62);padding:3px 7px;border-radius:2px;pointer-events:none}
.th-vol{font-size:13px;margin:0 0 6px}
.th-jeu .jx-jauge{position:relative;height:9px;overflow:visible}
.th-seuil{position:absolute;left:75%;top:-4px;bottom:-4px;width:2px;background:${C.selection}}
.th-aide{font-size:12px;color:${C.texte2};margin:6px 0 0}
.th-legende{display:flex;flex-wrap:wrap;gap:4px 12px;font-size:11.5px;color:${C.texte2};margin-top:8px}
.th-legende i{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:5px;vertical-align:-1px}
.th-nom{font-weight:600;color:#fff;word-break:break-all;margin:0 0 4px}
.th-ligne{display:flex;justify-content:space-between;gap:10px;font-size:12.5px;margin:2px 0}
.th-ligne span:first-child{color:#8E97C8;flex:none}
.th-ligne span:last-child{text-align:right}
.th-etat{display:inline-block;margin-top:6px;font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;padding:2px 6px;border-radius:2px;border:1px solid currentColor}
.th-actions{display:flex;flex-wrap:wrap;gap:6px;margin-top:9px}
.th-boite{display:flex;flex-direction:column;gap:6px;max-height:220px;overflow:auto;margin-top:8px}
.th-msg{font-size:12px;border-left:2px solid #5A63A8;padding:3px 8px;color:#C8D3DA}
.th-msg.ok{border-color:${C.ok}}.th-msg.garder{border-color:${C.garder}}
.th-msg b{color:${C.texte}}
.th-fait{font-size:12.5px;color:${C.texte2}}
`;

function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function genererFichiers() {
  const r = mulberry32(20200);
  const choix = (t) => t[Math.floor(r() * t.length)];
  const fichiers = CLES.map(([nom, taille, an, mois, proprio, serveur, verite, reponse], i) =>
    ({ id: 'k' + i, nom, taille, an, mois, proprio, serveur, verite, reponse, cle: true }));
  for (let i = 0; i < NB_REMPLISSAGE; i++) {
    const an = AN_MIN + Math.floor(r() * 10), mois = Math.floor(r() * 12);
    const taille = Math.exp(Math.log(0.02) + r() * Math.log(18 / 0.02));
    const verite = an >= 2019 ? 'garder' : 'ok';
    fichiers.push({
      id: 'f' + i, nom: `${choix(PREFIXES)}_${an}_${String(i + 1).padStart(2, '0')}${choix(EXTENSIONS)}`, taille, an, mois,
      proprio: choix(PROPRIETAIRES), serveur: choix(Object.keys(SERVEURS)), verite, cle: false,
      reponse: verite === 'ok' ? 'Plus utile depuis longtemps, tu peux supprimer.' : 'Encore utilisé, garde-le.',
    });
  }
  return fichiers;
}

function taillePropre(go) {
  if (go >= 100) return `${Math.round(go)} Go`;
  if (go >= 1) return `${go.toFixed(1).replace('.', ',')} Go`;
  return `${Math.max(1, Math.round(go * 1024))} Mo`;
}
const abscisse = (f) => f.an + (f.mois + 0.5) / 12;
const pluriel = (n, mot, s = 's') => `${n} ${mot}${n > 1 ? s : ''}`;

function el(tag, classe, texte) {
  const e = document.createElement(tag);
  if (classe) e.className = classe;
  if (texte !== undefined) e.textContent = texte;
  return e;
}

const META = {
  id: 'thales', ordre: 2, titre: 'Qui prend la place ?', employeur: FAITS.thales.employeur, annees: FAITS.thales.periode,
  factKey: 'thales', verbe: 'INSTRUMENTER', accent: ACCENT,
  description: "Un volume de stockage plein à 94 % et soixante-dix fichiers en nuage de points : la date en abscisse, la taille en ordonnée. Repérer les gros fichiers anciens, contacter leur propriétaire, et ne supprimer qu'avec son accord jusqu'à repasser sous 75 %.",
};

export default {
  ...META,
  monter(conteneur, api) {
    const fait = api.FAITS[META.factKey];
    const reduit = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    let vivant = true, enPause = false, rapide = false, raf = 0, enAttentePause = [];
    let W = 0, H = 0, dpr = 1, k = 1;
    const attentes = new Map(), minuteurs = new Set();
    const alea = mulberry32(7);

    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    const cadre = creerCadre(conteneur, {
      titre: META.titre, employeur: fait.employeur, annees: fait.periode, verbe: META.verbe, accent: api.accent || ACCENT,
      consigne: "Chaque point est un fichier : à droite les plus récents, en haut les plus gros. Trouve ce qui ne sert plus, contacte le propriétaire, supprime avec son accord.",
    });
    cadre.racine.classList.add('th-jeu');

    // --- le graphique ------------------------------------------------------------------------------------------
    const zone = el('div', 'th-graphe');
    const canvas = el('canvas');
    canvas.tabIndex = 0;
    canvas.setAttribute('role', 'application');
    canvas.setAttribute('aria-label', 'Nuage de points des fichiers. Flèches : parcourir. Entrée : contacter le propriétaire. Suppr : supprimer après accord.');
    const bulle = el('div', 'th-bulle');
    bulle.hidden = true;
    const note = el('div', 'th-note', 'Données fictives · volume vol-projets, réparti sur trois serveurs');
    zone.append(canvas, bulle, note);
    cadre.corps.appendChild(zone);
    const ctx = canvas.getContext('2d');

    // --- le panneau --------------------------------------------------------------------------------------------
    const lat = creerLateral(cadre.corps);
    const carteVolume = lat.carte('Volume vol-projets', '');
    const volTexte = el('p', 'th-vol');
    const jauge = el('div', 'jx-jauge');
    const jaugeRemplie = el('i');
    jauge.append(jaugeRemplie, el('span', 'th-seuil'));
    const volObjectif = el('p', 'th-aide');
    const legende = el('div', 'th-legende');
    for (const [couleur, texte] of [[C.point, 'non contacté'], [C.attente, 'en attente'], [C.ok, 'accord'], [C.garder, 'à garder']]) {
      const s = el('span', '', texte);
      const pastille = el('i');
      pastille.style.background = couleur;
      s.prepend(pastille);
      legende.appendChild(s);
    }
    carteVolume.append(volTexte, jauge, volObjectif, legende);

    const carteFichier = lat.carte('Fichier sélectionné', '');
    const fiche = el('div');
    carteFichier.appendChild(fiche);

    const carteMessages = lat.carte('Messagerie', '');
    const contactsTexte = el('p', 'th-vol');
    const regle = el('p', 'th-aide', "Règle : on ne supprime jamais un fichier sans l'accord de son propriétaire. Chaque message compte : choisis bien qui tu interroges.");
    const boite = el('div', 'th-boite');
    boite.setAttribute('aria-live', 'polite');
    carteMessages.append(contactsTexte, regle, boite);

    cadre.bouton('Indice', () => {
      if (!etat || etat.fin) return;
      etat.indice = Math.min(2, etat.indice + 1);
      cadre.statut(etat.indice === 1
        ? `La zone surlignée regroupe les fichiers anciens (avant ${ZONE_AN}) et volumineux (plus de ${ZONE_GO} Go) : c'est là que le ménage rapporte.`
        : "Lis les noms : une archive réglementaire, une référence ou un projet relancé, leur propriétaire dira non. Et un fichier récent sert souvent encore.");
      dessinerMaintenant();
    });
    cadre.bouton('Abandonner', () => api.abandonner());

    let etat = null;
    function etatInitial() {
      const fichiers = genererFichiers().map(f => ({ ...f, etat: 'libre' }));
      const total = fichiers.reduce((s, f) => s + f.taille, 0);
      return {
        fichiers, capacite: Math.round(total / REMPLISSAGE / 10) * 10, utilise: total, libere: 0,
        contacts: CONTACTS, utilises: 0, refus: 0, supprimes: 0, selection: null, survol: null, indice: 0,
        fin: false, ecran: null, messages: [],
      };
    }

    // --- échelles et dessin ------------------------------------------------------------------------------------
    const M = { g: 66, d: 18, h: 22, b: 46 };
    const sx = (x) => M.g + 12 + (x - AN_MIN) / (AN_MAX - AN_MIN) * (W - M.g - M.d - 12);
    const sy = (go) => H - M.b - (Math.log(go) - Math.log(Y_MIN)) / (Math.log(Y_MAX) - Math.log(Y_MIN)) * (H - M.h - M.b);
    const rayon = (go) => (3 + 15 * Math.sqrt(go / Y_MAX)) * k;

    function dessiner(t) {
      if (!W || !H || !etat) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = C.fond;
      ctx.fillRect(0, 0, W, H);
      const police = (px) => `${px}px "IBM Plex Mono", ui-monospace, monospace`;

      if (etat.indice >= 1) {
        ctx.fillStyle = C.zone;
        ctx.fillRect(sx(AN_MIN), sy(Y_MAX), sx(ZONE_AN) - sx(AN_MIN), sy(ZONE_GO) - sy(Y_MAX));
        ctx.strokeStyle = 'rgba(62,224,192,.45)';
        ctx.setLineDash([5, 4]);
        ctx.strokeRect(sx(AN_MIN), sy(Y_MAX), sx(ZONE_AN) - sx(AN_MIN), sy(ZONE_GO) - sy(Y_MAX));
        ctx.setLineDash([]);
        ctx.fillStyle = ACCENT;
        ctx.font = police(11);
        ctx.textAlign = 'left';
        ctx.fillText('anciens et volumineux', sx(AN_MIN) + 8, sy(ZONE_GO) - 8);
      }

      // Grille, graduations, titres d'axes.
      ctx.lineWidth = 1;
      ctx.font = police(W < 520 ? 10 : 11);
      const bande = sx(AN_MIN + 1) - sx(AN_MIN);
      for (let an = AN_MIN; an <= AN_MAX; an++) {
        const x = Math.round(sx(an)) + 0.5;
        ctx.strokeStyle = C.grille;
        ctx.beginPath(); ctx.moveTo(x, M.h); ctx.lineTo(x, H - M.b); ctx.stroke();
        if (an < AN_MAX && (bande >= 38 || an % 2 === 0)) {
          ctx.fillStyle = C.texte2;
          ctx.textAlign = 'center';
          ctx.fillText(String(an), sx(an + 0.5), H - M.b + 17);
        }
      }
      for (const [go, libelle] of [[0.01, '10 Mo'], [0.1, '100 Mo'], [1, '1 Go'], [10, '10 Go'], [100, '100 Go']]) {
        const y = Math.round(sy(go)) + 0.5;
        ctx.strokeStyle = C.grille;
        ctx.beginPath(); ctx.moveTo(M.g, y); ctx.lineTo(W - M.d, y); ctx.stroke();
        ctx.fillStyle = C.texte2;
        ctx.textAlign = 'right';
        ctx.fillText(libelle, M.g - 8, y + 4);
      }
      ctx.strokeStyle = C.axe;
      ctx.beginPath(); ctx.moveTo(M.g + 0.5, M.h); ctx.lineTo(M.g + 0.5, H - M.b + 0.5); ctx.lineTo(W - M.d, H - M.b + 0.5); ctx.stroke();
      ctx.fillStyle = C.texte;
      ctx.textAlign = 'left';
      ctx.fillText('↑ taille', M.g + 8, M.h + 12);
      ctx.textAlign = 'right';
      ctx.fillText('date de dernière modification →', W - M.d, H - 8);

      // Les fichiers : les gros d'abord, pour que les petits restent visibles par-dessus.
      const liste = etat.fichiers.filter(f => f.etat !== 'parti').sort((a, b) => b.taille - a.taille);
      for (const f of liste) {
        let r = rayon(f.taille);
        if (f.etat === 'supprime') {
          const p = Math.min(1, (t - f.tSuppr) / 450);
          r *= 1 - p;
          if (p >= 1) { f.etat = 'parti'; f.px = undefined; continue; }
        }
        const x = sx(abscisse(f)), y = sy(f.taille);
        f.px = x; f.py = y; f.pr = r;
        const couleur = COULEURS[f.etat];
        ctx.beginPath();
        ctx.arc(x, y, Math.max(0.5, r), 0, Math.PI * 2);
        ctx.globalAlpha = f.etat === 'libre' ? 0.5 : 0.72;
        ctx.fillStyle = couleur;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = couleur;
        if (f.etat === 'garder') ctx.setLineDash([3, 2]);
        ctx.stroke();
        ctx.setLineDash([]);
        if (f.etat === 'attente') {
          const onde = reduit ? 4 : 4 + 3 * (0.5 + 0.5 * Math.sin(t / 180));
          ctx.beginPath();
          ctx.arc(x, y, r + onde, 0, Math.PI * 2);
          ctx.strokeStyle = C.attente;
          ctx.stroke();
        }
      }
      for (const [f, couleur, epaisseur] of [[etat.survol, '#FFFFFF', 1.5], [etat.selection, C.selection, 2.4]]) {
        if (!f || f.px === undefined || f.etat === 'supprime' || f.etat === 'parti') continue;
        ctx.beginPath();
        ctx.arc(f.px, f.py, f.pr + 4, 0, Math.PI * 2);
        ctx.lineWidth = epaisseur;
        ctx.strokeStyle = couleur;
        ctx.stroke();
      }
    }
    function dessinerMaintenant() { dessiner(performance.now()); }
    function enMouvement() { return etat && etat.fichiers.some(f => f.etat === 'supprime' || (!reduit && f.etat === 'attente')); }
    function boucle(t) {
      raf = 0;
      if (!vivant || enPause) return;
      dessiner(t);
      if (enMouvement()) raf = requestAnimationFrame(boucle);
    }
    function animer() { if (!raf && vivant && !enPause) raf = requestAnimationFrame(boucle); }
    function programmer(fn, ms) {
      const id = setTimeout(() => { minuteurs.delete(id); if (vivant) fn(); }, ms);
      minuteurs.add(id);
    }

    function redimensionner() {
      const r = zone.getBoundingClientRect();
      W = Math.max(200, r.width);
      H = Math.max(200, r.height);
      dpr = Math.min(2, window.devicePixelRatio || 1);
      k = Math.max(0.6, Math.min(1, W / 760));
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      dessinerMaintenant();
      if (etat && (etat.survol || etat.selection)) montrerBulle(etat.survol || etat.selection);
    }
    const observateur = typeof ResizeObserver === 'function' ? new ResizeObserver(redimensionner) : null;
    if (observateur) observateur.observe(zone);

    // --- survol, sélection, clavier ----------------------------------------------------------------------------
    function pointSous(mx, my) {
      let meilleur = null;
      for (const f of etat.fichiers) {
        if (f.px === undefined || f.etat === 'supprime' || f.etat === 'parti') continue;
        if (Math.hypot(mx - f.px, my - f.py) <= Math.max(f.pr, 6) + 3 && (!meilleur || f.pr < meilleur.pr)) meilleur = f;
      }
      return meilleur;
    }
    function coordonnees(e) {
      const r = canvas.getBoundingClientRect();
      return [e.clientX - r.left, e.clientY - r.top];
    }
    function montrerBulle(f) {
      if (!f || f.px === undefined || f.etat === 'supprime' || f.etat === 'parti') { bulle.hidden = true; return; }
      bulle.textContent = '';
      bulle.append(
        el('b', '', f.nom),
        el('span', '', `${taillePropre(f.taille)} · modifié en ${MOIS[f.mois]} ${f.an}`), el('br'),
        el('span', '', `Propriétaire : ${f.proprio}`), el('br'),
        el('span', '', `Serveur : ${f.serveur} (${SERVEURS[f.serveur]})`),
      );
      bulle.hidden = false;
      const zw = zone.clientWidth, zh = zone.clientHeight, bw = bulle.offsetWidth, bh = bulle.offsetHeight;
      let x = f.px + f.pr + 12;
      if (x + bw > zw - 6) x = f.px - f.pr - 12 - bw;
      bulle.style.left = `${Math.max(6, x)}px`;
      bulle.style.top = `${Math.min(Math.max(6, f.py - bh / 2), zh - bh - 6)}px`;
    }
    function selectionner(f) {
      etat.selection = f || null;
      majFiche();
      montrerBulle(etat.selection);
      dessinerMaintenant();
    }

    canvas.addEventListener('pointermove', (e) => {
      if (!etat || e.pointerType === 'touch') return;
      const f = pointSous(...coordonnees(e));
      if (f !== etat.survol) {
        etat.survol = f;
        canvas.style.cursor = f ? 'pointer' : 'crosshair';
        dessinerMaintenant();
      }
      montrerBulle(f || etat.selection);
    });
    canvas.addEventListener('pointerleave', () => {
      if (!etat) return;
      etat.survol = null;
      dessinerMaintenant();
      montrerBulle(etat.selection);
    });
    canvas.addEventListener('click', (e) => {
      if (!etat || etat.fin) return;
      selectionner(pointSous(...coordonnees(e)));
    });
    canvas.addEventListener('keydown', (e) => {
      if (!etat || etat.fin) return;
      const vivants = etat.fichiers.filter(f => f.etat !== 'supprime' && f.etat !== 'parti')
        .sort((a, b) => abscisse(a) - abscisse(b) || b.taille - a.taille);
      if (!vivants.length) return;
      const i = vivants.indexOf(etat.selection);
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') selectionner(vivants[(i + 1) % vivants.length]);
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') selectionner(vivants[(i - 1 + vivants.length) % vivants.length]);
      else if (e.key === 'Enter') contacter(etat.selection);
      else if (e.key === 'Delete' || e.key === 'Backspace') supprimer(etat.selection);
      else return;
      e.preventDefault();
      e.stopPropagation();
    });

    // --- actions -----------------------------------------------------------------------------------------------
    function contacter(f) {
      if (!f || etat.fin || f.etat !== 'libre') return;
      if (etat.contacts <= 0) { cadre.statut('Plus aucun message disponible.', 'ko'); return; }
      etat.contacts--;
      etat.utilises++;
      f.etat = 'attente';
      message(f, 'envoi', 'Demande envoyée : ce fichier peut-il être supprimé ?');
      cadre.statut(`Message envoyé à ${f.proprio.split(' · ')[0]}. En attente de sa réponse…`);
      planifierReponse(f);
      majTout();
      animer();
    }
    function planifierReponse(f) {
      const delai = rapide ? 20 : reduit ? 250 : 700 + Math.floor(alea() * 600);
      const id = setTimeout(() => {
        attentes.delete(f.id);
        if (vivant && f.etat === 'attente') repondre(f);
      }, delai);
      attentes.set(f.id, id);
    }
    function repondre(f) {
      f.etat = f.verite === 'ok' ? 'ok' : 'garder';
      if (f.etat === 'garder') etat.refus++;
      message(f, f.etat, f.reponse);
      cadre.statut(f.etat === 'ok'
        ? `Accord reçu pour ${f.nom} : tu peux le supprimer.`
        : `${f.proprio.split(' · ')[0]} demande de garder ${f.nom}.`, f.etat === 'ok' ? 'ok' : '');
      majTout();
      dessinerMaintenant();
      verifierFin();
    }
    function supprimer(f) {
      if (!f || etat.fin) return;
      if (f.etat !== 'ok') {
        cadre.statut(f.etat === 'garder' ? 'Son propriétaire a demandé de le garder.' : "On ne supprime rien sans l'accord du propriétaire : contacte-le d'abord.", 'ko');
        return;
      }
      f.etat = reduit ? 'parti' : 'supprime';
      f.tSuppr = performance.now();
      etat.utilise -= f.taille;
      etat.libere += f.taille;
      etat.supprimes++;
      if (etat.selection === f) { etat.selection = null; bulle.hidden = true; }
      if (etat.survol === f) etat.survol = null;
      cadre.statut(`${f.nom} supprimé : ${taillePropre(f.taille)} libérés.`, 'ok');
      majTout();
      dessinerMaintenant();
      animer();
      verifierFin();
    }
    function verifierFin() {
      if (etat.fin) return;
      if (etat.utilise <= SEUIL * etat.capacite) {
        etat.fin = true;
        programmer(victoire, rapide ? 30 : 700);
        return;
      }
      const actionnable = etat.fichiers.some(f => f.etat === 'ok' || f.etat === 'attente');
      if (etat.contacts === 0 && !actionnable) {
        etat.fin = true;
        programmer(defaite, rapide ? 30 : 600);
      }
    }

    function message(f, classe, texte) {
      etat.messages.unshift({ classe, qui: classe === 'envoi' ? 'Toi' : f.proprio.split(' · ')[0], fichier: f.nom, texte });
      majBoite();
    }

    // --- affichage du panneau ----------------------------------------------------------------------------------
    function majJauge() {
      const pct = etat.utilise / etat.capacite;
      jaugeRemplie.style.width = `${Math.min(100, pct * 100).toFixed(1)}%`;
      jauge.classList.toggle('ko', pct > SEUIL);
      volTexte.textContent = `${Math.round(etat.utilise)} Go sur ${etat.capacite} Go · ${Math.round(pct * 100)} %`;
      const reste = etat.utilise - SEUIL * etat.capacite;
      volObjectif.textContent = reste > 0 ? `Objectif : 75 % au plus. Reste à libérer : ${Math.ceil(reste)} Go.` : 'Objectif atteint.';
      contactsTexte.textContent = `Messages restants : ${etat.contacts} sur ${CONTACTS}`;
    }
    function ligne(parent, cle, valeur) {
      const l = el('div', 'th-ligne');
      l.append(el('span', '', cle), el('span', '', valeur));
      parent.appendChild(l);
    }
    function majFiche() {
      fiche.textContent = '';
      const f = etat.selection;
      if (!f) {
        fiche.appendChild(el('p', 'th-aide', 'Survole un point pour lire le fichier ; clique ou touche-le pour le sélectionner.'));
        return;
      }
      fiche.appendChild(el('p', 'th-nom', f.nom));
      ligne(fiche, 'Taille', taillePropre(f.taille));
      ligne(fiche, 'Modifié', `${MOIS[f.mois]} ${f.an}`);
      ligne(fiche, 'Propriétaire', f.proprio);
      ligne(fiche, 'Serveur', `${f.serveur} (${SERVEURS[f.serveur]})`);
      const badge = el('span', 'th-etat', LIBELLES[f.etat]);
      badge.style.color = COULEURS[f.etat];
      fiche.appendChild(badge);
      const actions = el('div', 'th-actions');
      const contact = el('button', 'jx-btn fort', 'Contacter le propriétaire');
      contact.disabled = f.etat !== 'libre' || etat.contacts <= 0 || etat.fin;
      contact.addEventListener('click', () => contacter(f));
      const suppression = el('button', 'jx-btn', 'Supprimer');
      suppression.disabled = f.etat !== 'ok' || etat.fin;
      suppression.addEventListener('click', () => supprimer(f));
      actions.append(contact, suppression);
      fiche.appendChild(actions);
      if (f.etat === 'libre') fiche.appendChild(el('p', 'th-aide', 'Suppression possible seulement après accord du propriétaire.'));
    }
    function majBoite() {
      boite.textContent = '';
      if (!etat.messages.length) { boite.appendChild(el('p', 'th-aide', 'Aucun message pour le moment.')); return; }
      for (const m of etat.messages.slice(0, 14)) {
        const d = el('div', `th-msg ${m.classe}`);
        d.append(el('b', '', m.qui), document.createTextNode(` · ${m.fichier}`), el('br'), document.createTextNode(m.texte));
        boite.appendChild(d);
      }
    }
    function majTout() { majJauge(); majFiche(); majBoite(); }

    // --- fins de partie ----------------------------------------------------------------------------------------
    function ecranFin(options, precision) {
      const f = cadre.fin(options);
      if (precision) {
        const b = f.querySelector('button');
        const p = el('p', 'th-fait', precision);
        b.parentNode.insertBefore(p, b);
      }
      etat.ecran = f;
      return f;
    }
    function victoire() {
      const pct = Math.round(100 * etat.utilise / etat.capacite);
      const score = Math.max(40, 100 - 10 * Math.max(0, etat.utilises - 3));
      const refus = etat.refus
        ? ` ${pluriel(etat.refus, 'propriétaire')} ${etat.refus > 1 ? "t'ont" : "t'a"} demandé de garder un fichier : c'est exactement pour ça qu'on demande avant de supprimer.`
        : '';
      const bilan = `Volume repassé à ${pct} % : ${Math.round(etat.libere)} Go libérés, ${pluriel(etat.supprimes, 'fichier')} supprimé${etat.supprimes > 1 ? 's' : ''} avec l'accord de leur propriétaire, ${pluriel(etat.utilises, 'message')} envoyé${etat.utilises > 1 ? 's' : ''}.${refus}`;
      ecranFin(
        { titre: 'Quartier validé', texte: `${bilan} ${fait.pourLePoste}`, bouton: 'Prendre la clé',
          action: () => api.fini({ score, message: `Volume à ${pct} % : ${Math.round(etat.libere)} Go libérés en ${pluriel(etat.utilises, 'message')}, rien supprimé sans accord.` }) },
        `Le fait de CV derrière ce quartier : ${fait.employeur}, ${fait.periode}, ${fait.poste}. ${fait.texte}`,
      );
    }
    function defaite() {
      const pct = Math.round(100 * etat.utilise / etat.capacite);
      ecranFin({
        titre: 'Pas tout à fait',
        texte: `Plus de message disponible, et le volume est encore à ${pct} %. Les fichiers qui libèrent vraiment de la place sont en haut à gauche du graphique : gros et anciens. Certains propriétaires diront non : interroge d'abord les plus gros candidats, et lis bien les noms.`,
        bouton: 'Rejouer', action: () => reinitialiser(),
      });
    }
    function reinitialiser() {
      if (etat && etat.ecran) etat.ecran.remove();
      for (const id of attentes.values()) clearTimeout(id);
      attentes.clear();
      etat = etatInitial();
      bulle.hidden = true;
      majTout();
      cadre.statut("Survole les points. Objectif : repasser sous 75 %, sans jamais supprimer sans l'accord du propriétaire.");
      dessinerMaintenant();
    }

    reinitialiser();
    redimensionner();

    return {
      demonter() {
        vivant = false;
        cancelAnimationFrame(raf);
        for (const id of attentes.values()) clearTimeout(id);
        attentes.clear();
        for (const id of minuteurs) clearTimeout(id);
        minuteurs.clear();
        if (observateur) observateur.disconnect();
        style.remove();
        conteneur.innerHTML = '';
      },
      pause() {
        enPause = true;
        cancelAnimationFrame(raf);
        raf = 0;
        enAttentePause = [...attentes.keys()];
        for (const id of attentes.values()) clearTimeout(id);
        attentes.clear();
      },
      reprendre() {
        if (!vivant || !enPause) return;
        enPause = false;
        for (const id of enAttentePause) {
          const f = etat.fichiers.find(x => x.id === id);
          if (f && f.etat === 'attente') planifierReponse(f);
        }
        enAttentePause = [];
        dessinerMaintenant();
        animer();
      },
      async resoudre() {
        rapide = true;
        const cibles = etat.fichiers.filter(f => f.cle && f.verite === 'ok').sort((a, b) => b.taille - a.taille);
        for (const f of cibles) {
          if (!vivant || etat.fin) break;
          selectionner(f);
          contacter(f);
          for (let n = 0; n < 100 && vivant && f.etat === 'attente'; n++) await attendre(15);
          supprimer(f);
          await attendre(20);
        }
        for (let n = 0; n < 200 && vivant && !etat.ecran; n++) await attendre(20);
        const bouton = etat.ecran && etat.ecran.querySelector('button');
        if (bouton) bouton.click();
      },
    };
  },
};
