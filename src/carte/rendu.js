// La carte en parallaxe : un seul canvas, huit plans, sept quartiers, le fil et la sonde.

import { echelle, transformePlan, borner, aimanter as stationProche, inertie, sortieDouce, entreeSortie } from './camera.js';
import { creerAlea } from './alea.js';
import { creerTuiles } from './tuiles.js';
import { dessinerFil, dessinerSonde, positionVol } from './fil.js';
import { placements, degagements, degagementsVues, emprises, PLANS, COUCHE_VERS_PLAN } from './niveaux-carte.js';
import { creerQuartiers } from './quartiers-rendu.js';
import { installerInteractions } from './interactions.js';
import ciel from './plans/ciel.js';
import horizon from './plans/horizon.js';
import usages from './plans/usages.js';
import donnees from './plans/donnees.js';
import reseau from './plans/reseau.js';
import socle from './plans/socle.js';
import premierPlan from './plans/premier-plan.js';
import particules from './plans/particules.js';

const PLANS_TUILES = [horizon, usages, donnees, reseau, socle];
const GRAINES = { ciel: 0, horizon: 1, usages: 2, donnees: 3, reseau: 4, socle: 5, 'premier-plan': 6, particules: 7 };
const T_FIGE = 12000;
const FONDU_PLAN = 300;
const REVELATION_CIEL = 650;
const SEUIL_VITESSE = 0.3;
const D = { selection: 600, aimant: 420, plongee: 520, emerger: 400, fondu: 320, vol: 500 };
const LISSAGE = 0.08;
const FENETRE_QUALITE = 90;

export function creerCarte({ canvas, niveaux, progression, preferences = {}, rappels = {}, journal = () => {} }) {
  const ctx = canvas.getContext('2d');
  const mobile = !!preferences.mobile;
  const liste = placements(niveaux);
  const parProfondeur = [...liste].sort((a, b) => b.facteur - a.facteur);
  const stations = niveaux.map((n) => n.station);
  const quartiers = creerQuartiers({ journal });
  const modeles = new Map();
  const caches = new Map();
  const apparitions = new Map();
  const enPanne = new Set();
  const grossier = matchMedia('(pointer: coarse)').matches;
  const s = {
    W: 0, H: 0, dpr: 1, e: 1, camera: 0, ancre: 0, tween: null, vitesse: 0, glisse: false,
    incl: { x: 0, y: 0 }, inclCible: { x: 0, y: 0 }, decalage: 0, decalageCible: 0,
    selection: niveaux[0].id, survol: null, cles: new Set(Object.keys(progression.cles || {})),
    indispo: new Set(), gagnes: new Map(), plongee: null, fondu: null, vol: null, trainee: [],
    qualite: mobile || grossier ? 'moyenne' : 'haute', durees: [], raf: 0, pause: false, cache: false,
    capture: !!preferences.capture, reduit: !!preferences.reduit, t0: performance.now(), tDernier: performance.now(),
    ancres: new Map(), revelation: null, synchrone: false, images: 0, minuterieTaille: 0, manquantes: 0,
  };

  const garde = (id, fn) => {
    if (enPanne.has(id)) return;
    try { fn(); } catch (e) { enPanne.add(id); journal(`PLAN ${id} : ${e && e.message ? e.message : e}`); }
  };

  function modele(plan) {
    if (!modeles.has(plan.id)) {
      let m = null;
      garde(plan.id, () => {
        m = plan.generer(creerAlea(2018 + GRAINES[plan.id]), {
          placements: liste, niveaux, degagements: [...degagements(plan.id, liste), ...degagementsVues(plan.id)], emprises: emprises(plan.id, liste),
        });
      });
      modeles.set(plan.id, m);
    }
    return modeles.get(plan.id);
  }

  function cache(plan) {
    if (!caches.has(plan.id)) caches.set(plan.id, creerTuiles({ plan, modele: modele(plan), mobile: mobile || grossier }));
    return caches.get(plan.id);
  }

  function mesurer() {
    const W = canvas.clientWidth || innerWidth;
    const H = canvas.clientHeight || innerHeight;
    const dpr = Math.min(devicePixelRatio || 1, grossier ? 1.5 : 2);
    if (W === s.W && H === s.H && dpr === s.dpr) return;
    s.W = W; s.H = H; s.dpr = dpr;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    const e = echelle(H, rappels.hauteurBarre ? rappels.hauteurBarre() : 56);
    if (e !== s.e) { s.e = e; quartiers.invalider(); }
  }

  function transfo(facteur) {
    const base = transformePlan({
      facteur, camera: s.camera, e: s.e, largeur: s.W, hauteur: s.H, inclinaison: s.incl,
      decalageFiche: s.decalage, ancre: s.ancre, reduit: s.reduit,
    });
    const p = s.plongee;
    if (!p || p.tau <= 0) return base;
    const z = 1 + 0.25 * facteur * p.tau;
    return { a: base.a * z, tx: p.ax + (base.tx - p.ax) * z, ty: p.ay + (base.ty - p.ay) * z };
  }

  function calculerAncres() {
    const m = new Map();
    for (const q of liste) {
      const t = transfo(q.facteur);
      const x = t.a * q.X + t.tx;
      const demi = q.demiLargeur * q.s * t.a;
      const hautFil = q.plan === 'socle' ? 90 : Math.min(90, q.hauteur * q.s * 0.22);
      m.set(q.id, {
        x, demi, facteur: q.facteur, plan: q.plan,
        yPied: t.a * q.base + t.ty,
        yHaut: t.a * (q.base - q.hauteur * q.s) + t.ty,
        yFil: t.a * (q.base - hautFil) + t.ty,
        visible: x + demi > 0 && x - demi < s.W,
      });
    }
    s.ancres = m;
    return m;
  }

  const alphaPlan = (id, tReel) => (apparitions.has(id) ? Math.max(0, Math.min(1, (tReel - apparitions.get(id)) / FONDU_PLAN)) : 0);

  function etatQuartier(id, tReel) {
    const gagne = s.cles.has(id);
    const tw = s.gagnes.get(id);
    return {
      mode: s.indispo.has(id) ? 'indispo' : gagne ? 'gagne' : id === s.selection ? 'selection' : 'ajouer',
      selectionne: id === s.selection, survol: id === s.survol, reduit: s.reduit, qualite: s.qualite,
      tGagne: tw === undefined ? null : tReel - tw, toutGagne: s.cles.size >= niveaux.length,
    };
  }

  function dessinerPlan(plan, alpha, commun, tReel) {
    const m = modele(plan);
    if (!m) return;
    const tr = transfo(plan.facteur);
    const px = 1 / tr.a;
    const vue = { ...commun, transform: tr, px, facteur: plan.facteur, xMin: -tr.tx * px - 100 * px, xMax: (s.W - tr.tx) * px + 100 * px };
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.setTransform(s.dpr * tr.a, 0, 0, s.dpr * tr.a, s.dpr * tr.tx, s.dpr * tr.ty);
    garde(plan.id, () => {
      if (plan.sol) {
        const g = ctx.createLinearGradient(0, plan.sol.y, 0, plan.sol.y + 90);
        g.addColorStop(0, plan.sol.haut);
        g.addColorStop(1, plan.sol.bas);
        ctx.fillStyle = g;
        ctx.fillRect(vue.xMin, plan.sol.y, vue.xMax - vue.xMin, 1100 - plan.sol.y);
      }
      if (plan.fond) plan.fond(ctx, m, vue);
      if (plan.dessinerTuile) s.manquantes += cache(plan).dessiner(ctx, { e: s.e, dpr: s.dpr, xMin: vue.xMin, xMax: vue.xMax, synchrone: s.synchrone }) || 0;
      for (const q of liste) {
        if (q.plan !== plan.id) continue;
        const a = s.ancres.get(q.id);
        if (a && a.x + a.demi * 1.6 > 0 && a.x - a.demi * 1.6 < s.W) quartiers.dessiner(ctx, q, { e: s.e, dpr: s.dpr, t: commun.t, etat: etatQuartier(q.id, tReel) });
      }
      if (plan.animer) plan.animer(ctx, m, vue);
    });
    ctx.restore();
  }

  function dessinerFilEtSonde(commun, tReel) {
    const points = niveaux.map((n) => {
      const a = s.ancres.get(n.id);
      return { id: n.id, x: a.x, y: a.yFil, accent: n.accent, alpha: alphaPlan(a.plan, tReel), annee: (preferences.annees && preferences.annees[n.id]) || '' };
    });
    ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);
    dessinerFil(ctx, { points, cles: s.cles, t: commun.t, reduit: s.reduit, qualite: s.qualite, alpha: alphaPlan('socle', tReel) });
  }

  function positionSonde(tReel) {
    const a = s.ancres.get(s.selection);
    if (!a) return null;
    const cible = { x: a.x, y: a.yHaut - 84 };
    if (s.vol) {
      const u = (tReel - s.vol.debut) / D.vol;
      if (u >= 1) s.vol = null;
      else return positionVol(s.vol.de, cible, u);
    }
    return cible;
  }

  function dessiner(tReel, tForce) {
    const t = tForce !== undefined ? tForce : s.reduit ? T_FIGE : Math.max(0, tReel - s.t0); // l'horodatage rAF peut précéder t0
    ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    calculerAncres();
    s.manquantes = 0;
    const commun = {
      t, tReel, camera: s.camera, e: s.e, largeur: s.W, hauteur: s.H, cles: s.cles, selection: s.selection,
      qualite: s.qualite, reduit: s.reduit, niveaux, ancres: s.ancres, toutGagne: s.cles.size >= niveaux.length,
    };
    garde('ciel', () => ciel.dessiner(ctx, modele(ciel), {
      ...commun, ty: s.H - 1000 * s.e, etoiles: alphaPlan('ciel', tReel),
      revelation: s.revelation === null ? 0 : Math.max(0, Math.min(1, (tReel - s.revelation) / REVELATION_CIEL)),
    }));
    const tau = s.plongee ? s.plongee.tau : 0;
    for (const plan of PLANS_TUILES) {
      const alpha = alphaPlan(plan.id, tReel);
      if (alpha <= 0) continue;
      dessinerPlan(plan, alpha, commun, tReel);
      if (plan.id === 'socle') dessinerFilEtSonde(commun, tReel);
    }
    const alphaAvant = alphaPlan('premier-plan', tReel) * (1 - tau) * Math.max(0, Math.min(1, 1 + s.decalage / 180));
    if (alphaAvant > 0) dessinerPlan(premierPlan, alphaAvant, commun, tReel);
    const alphaParticules = alphaPlan('particules', tReel) * (1 - tau) * (s.reduit ? 0.5 : 1);
    if (alphaParticules > 0 && s.qualite !== 'basse') {
      ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);
      garde('particules', () => particules.dessiner(ctx, modele(particules), { ...commun, alpha: alphaParticules }));
    }
    ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);
    const sonde = alphaPlan('socle', tReel) > 0 && tau < 0.5 ? positionSonde(tReel) : null;
    if (sonde) {
      if (s.vol) { s.trainee.push(sonde); if (s.trainee.length > 8) s.trainee.shift(); } else s.trainee = [];
      dessinerSonde(ctx, { ...sonde, t, reduit: s.reduit, trainee: s.trainee });
    }
    if (s.fondu) {
      const u = (tReel - s.fondu.debut) / D.fondu;
      ctx.fillStyle = `rgba(35,44,102,${(0.85 * (1 - Math.abs(2 * Math.min(1, u) - 1))).toFixed(3)})`;
      ctx.fillRect(0, 0, s.W, s.H);
    }
    if (rappels.surImage) rappels.surImage(s.ancres);
  }

  function aimanterMaintenant() {
    const station = stationProche(s.camera, stations);
    const id = niveaux[stations.indexOf(station)].id;
    if (s.reduit) { s.camera = station; s.ancre = station; } else s.tween = { de: s.camera, vers: station, debut: performance.now(), duree: D.aimant };
    s.vitesse = 0;
    if (rappels.surAimantation) rappels.surAimantation(id);
    demarrer();
  }

  function mettreAJour(now, dt) {
    if (s.tween) {
      const u = (now - s.tween.debut) / s.tween.duree;
      s.camera = s.tween.de + (s.tween.vers - s.tween.de) * sortieDouce(u);
      if (u >= 1) { s.camera = s.tween.vers; s.tween = null; }
    } else if (!s.glisse && s.vitesse) {
      const r = inertie({ camera: s.camera, vitesse: s.vitesse }, dt);
      s.camera = r.camera;
      s.vitesse = r.vitesse;
      if (Math.abs(s.vitesse) < SEUIL_VITESSE) aimanterMaintenant();
    }
    const k = 1 - Math.pow(1 - LISSAGE, dt / 16.7);
    s.incl.x += (s.inclCible.x - s.incl.x) * k;
    s.incl.y += (s.inclCible.y - s.incl.y) * k;
    s.decalage += (s.decalageCible - s.decalage) * (s.reduit ? 1 : Math.min(1, k * 2));
    if (s.plongee) {
      const p = s.plongee;
      const u = Math.min(1, (now - p.debut) / p.duree);
      p.tau = p.sens > 0 ? entreeSortie(u) : 1 - entreeSortie(u);
      if (u >= 1) { if (p.sens < 0) s.plongee = null; const r = p.resoudre; p.resoudre = null; if (r) r(); }
    }
    if (s.fondu) {
      const u = (now - s.fondu.debut) / D.fondu;
      if (u >= 0.5 && !s.fondu.applique) { s.camera = s.fondu.vers; s.ancre = s.fondu.vers; s.fondu.applique = true; }
      if (u >= 1) s.fondu = null;
    }
    if (++s.images > 30 && s.qualite !== 'basse' && !s.capture) {
      s.durees.push(dt);
      if (s.durees.length > FENETRE_QUALITE) s.durees.shift();
      if (s.durees.length === FENETRE_QUALITE) {
        const moy = s.durees.reduce((x, y) => x + y, 0) / FENETRE_QUALITE;
        if (moy > 33) { s.qualite = 'basse'; s.inclCible = { x: 0, y: 0 }; s.durees = []; } else if (moy > 22 && s.qualite === 'haute') { s.qualite = 'moyenne'; s.durees = []; }
      }
    }
  }

  function boucle(now) {
    s.raf = 0;
    if (s.pause || s.cache || s.capture) return;
    const dt = Math.min(64, Math.max(1, now - s.tDernier));
    s.tDernier = now;
    mesurer();
    mettreAJour(now, dt);
    dessiner(now);
    if (s.reduit && sceneFigee(now)) return; // mouvement réduit : image stable, la prochaine interaction relance la boucle
    s.raf = requestAnimationFrame(boucle);
  }

  // Plus rien ne bouge : ni caméra, ni transition, ni plan en fondu, ni tuile en attente de rendu.
  function sceneFigee(now) {
    if (s.tween || s.vitesse || s.glisse || s.plongee || s.fondu || s.vol || s.manquantes) return false;
    if (s.revelation !== null && now - s.revelation < REVELATION_CIEL) return false;
    for (const debut of apparitions.values()) if (now - debut < FONDU_PLAN) return false;
    return Math.abs(s.decalageCible - s.decalage) < 0.5;
  }

  function demarrer() { if (!s.raf && !s.pause && !s.cache && !s.capture) { s.tDernier = performance.now(); s.raf = requestAnimationFrame(boucle); } }

  function toucher(x, y) {
    for (const q of parProfondeur) {
      const a = s.ancres.get(q.id);
      if (a && x >= a.x - a.demi && x <= a.x + a.demi && y >= a.yHaut - 24 && y <= a.yPied + 8) return q.id;
    }
    return null;
  }

  const desinstaller = installerInteractions({
    canvas,
    pilote: {
      debutGlisse() { s.glisse = true; s.tween = null; s.vitesse = 0; if (rappels.surDebutGlisse) rappels.surDebutGlisse(); demarrer(); },
      glisser(dxPx) { const du = -dxPx / s.e; s.camera = borner(s.camera + du); demarrer(); return du; },
      finGlisse(vitesse, aDeplace) {
        s.glisse = false;
        if (!aDeplace) return;
        if (!s.reduit && Math.abs(vitesse) >= SEUIL_VITESSE) s.vitesse = vitesse; else aimanterMaintenant();
        demarrer();
      },
      molette(delta) { s.tween = null; s.vitesse = 0; s.camera = borner(s.camera + delta / s.e); demarrer(); },
      aimanter: aimanterMaintenant,
      survoler(x, y) {
        const id = x < 0 ? null : toucher(x, y);
        if (id !== s.survol) { s.survol = id; canvas.style.cursor = id ? 'pointer' : ''; if (rappels.surSurvol) rappels.surSurvol(id); demarrer(); }
      },
      incliner(ix, iy) { if (!s.reduit && s.qualite !== 'basse' && !s.capture) s.inclCible = { x: ix, y: iy }; },
      cliquer(x, y) { const id = toucher(x, y); if (id && rappels.surClicQuartier) rappels.surClicQuartier(id); },
    },
  });

  function surVisibilite() { s.cache = document.hidden; if (!s.cache) demarrer(); }
  function rendreCapture() { mesurer(); s.synchrone = true; dessiner(performance.now(), s.tCapture); s.synchrone = false; }
  function surTaille() { clearTimeout(s.minuterieTaille); s.minuterieTaille = setTimeout(() => { mesurer(); if (s.capture) rendreCapture(); else demarrer(); }, 150); }
  document.addEventListener('visibilitychange', surVisibilite);
  addEventListener('resize', surTaille);
  const observateur = typeof ResizeObserver === 'function' ? new ResizeObserver(surTaille) : null;
  if (observateur) observateur.observe(canvas);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { caches.forEach((c) => c.invalider()); demarrer(); });
  mesurer();

  function montrerPlan(planId) {
    const plan = { ciel, horizon, usages, donnees, reseau, socle, 'premier-plan': premierPlan, particules }[planId];
    if (!plan) return Promise.resolve(false);
    const now = performance.now();
    const debut = s.capture ? -1e9 : now;
    modele(plan);
    if (!apparitions.has(planId)) apparitions.set(planId, debut);
    if (planId === 'socle') { apparitions.set('premier-plan', apparitions.get('premier-plan') ?? debut); modele(premierPlan); }
    if (planId === 'ciel') { s.revelation = s.capture ? -1e9 : now; apparitions.set('particules', debut); modele(particules); }
    demarrer();
    return Promise.resolve(!enPanne.has(planId));
  }

  return {
    montrerPlan,
    toutMontrer() { ['socle', 'reseau', 'donnees', 'usages', 'horizon', 'ciel'].forEach((id) => { if (!apparitions.has(id)) { montrerPlan(id); apparitions.set(id, -1e9); } }); apparitions.set('premier-plan', -1e9); apparitions.set('particules', -1e9); s.revelation = -1e9; },
    selectionner(id, { instantane = false, sansCamera = false, depuis = 0 } = {}) {
      const n = niveaux.find((x) => x.id === id);
      if (!n) return;
      const ancienne = s.ancres.get(s.selection);
      if (id !== s.selection && ancienne && !instantane && !s.reduit) s.vol = { debut: performance.now(), de: { x: ancienne.x, y: ancienne.yHaut - 84 } };
      s.selection = id;
      if (sansCamera) { s.ancre = n.station; demarrer(); return; }
      s.vitesse = 0;
      if (instantane || s.capture) { s.camera = borner(n.station + depuis); s.ancre = n.station; s.tween = null; if (depuis) s.tween = { de: s.camera, vers: n.station, debut: performance.now(), duree: 500 }; }
      else if (s.reduit) s.fondu = { debut: performance.now(), vers: n.station };
      else s.tween = { de: s.camera, vers: n.station, debut: performance.now(), duree: D.selection };
      demarrer();
    },
    plonger(id) {
      const a = s.ancres.get(id);
      if (s.reduit || s.capture || !a) return Promise.resolve();
      return new Promise((resoudre) => { s.plongee = { debut: performance.now(), duree: D.plongee, sens: 1, tau: 0, ax: a.x, ay: (a.yHaut + a.yPied) / 2, resoudre }; demarrer(); });
    },
    emerger() {
      if (!s.plongee) return Promise.resolve();
      const enAttente = s.plongee.resoudre; // plongée interrompue (carte en pause) : la conclure avant de repartir
      if (enAttente) { s.plongee.resoudre = null; enAttente(); }
      return new Promise((resoudre) => { Object.assign(s.plongee, { debut: performance.now(), duree: D.emerger, sens: -1, resoudre }); demarrer(); });
    },
    annulerPlongee() { s.plongee = null; },
    celebrer(id) { s.cles.add(id); if (!s.reduit) s.gagnes.set(id, performance.now()); demarrer(); },
    majProgression(p) { s.cles = new Set(Object.keys(p.cles || {})); demarrer(); },
    marquerIndisponible(id) { s.indispo.add(id); demarrer(); },
    majReduit(v) { s.reduit = !!v; s.inclCible = { x: 0, y: 0 }; s.incl = { x: 0, y: 0 }; demarrer(); },
    // Mobile : le monde remonte juste assez pour que le pied du quartier reste au-dessus de la feuille.
    decalerFiche(yCible = null, id = s.selection) {
      const q = liste.find((x) => x.id === id);
      const t = q && transformePlan({ facteur: q.facteur, camera: q.station, e: s.e, largeur: s.W, hauteur: s.H });
      s.decalageCible = yCible === null || !q ? 0 : Math.max(-s.H * 0.5, Math.min(0, (yCible - (t.a * q.base + t.ty)) / Math.max(q.facteur, 0.5)));
      demarrer();
    },
    pause() { s.pause = true; if (s.raf) cancelAnimationFrame(s.raf); s.raf = 0; },
    reprendre() { s.pause = false; demarrer(); },
    redimensionner() { mesurer(); demarrer(); },
    // pagehide : rend la mémoire des tuiles et des sprites (plafonds canvas d'iOS) ; ils se reconstruisent au besoin.
    liberer() { caches.forEach((c) => c.vider()); quartiers.invalider(); },
    ancres: () => s.ancres,
    stationCourante: () => s.camera,
    baseEcran(coucheId) {
      const plan = PLANS[COUCHE_VERS_PLAN[coucheId]];
      if (!plan) return null;
      const t = transfo(plan.facteur);
      return { x: s.W / 2, y: plan.base === null ? s.H * 0.2 : t.a * plan.base + t.ty };
    },
    instantane() {
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(s.W / 4));
      c.height = Math.max(1, Math.round(s.H / 4));
      try { c.getContext('2d').drawImage(canvas, 0, 0, c.width, c.height); } catch { /* instantané facultatif */ }
      return c;
    },
    capturer(tMs = T_FIGE) {
      Object.assign(s, { capture: true, tCapture: tMs, qualite: 'haute', incl: { x: 0, y: 0 }, tween: null, plongee: null, decalage: s.decalageCible });
      if (s.raf) cancelAnimationFrame(s.raf);
      s.raf = 0;
      rendreCapture();
    },
    detruire() {
      s.pause = true;
      if (s.raf) cancelAnimationFrame(s.raf);
      if (observateur) observateur.disconnect();
      desinstaller();
      document.removeEventListener('visibilitychange', surVisibilite); removeEventListener('resize', surTaille);
      caches.forEach((c) => c.vider()); quartiers.invalider();
    },
  };
}
