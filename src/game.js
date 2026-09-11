// Scène de niveau : la sonde, l'impulsion, la TRACE, la caméra, le HUD.

import { P, alpha, ACCENTS } from './palette.js';
import { TUILE, F, M, Carte, deplacer, drapeauxSous, isSolid } from './physics.js';
import { B } from './input.js';
import { VUE_W, VUE_H, texte, largeurTexte } from './render.js';
import { LEGENDE, valide } from './levels/_contrat.js';
import { FAITS } from './cv.js';

const TRACE_MAX = 360;      // 6 s de budget à 60 pas/s
const TRACE_RECUP = 0.62;   // regagné par pas hors trace
const TRACE_COUT = 1;

export function creerNiveau(app, def) {
  const erreurs = valide(def);
  if (erreurs.length) {
    return { erreur: `Niveau « ${def.id} » refusé : ${erreurs.join(' · ')}` };
  }

  const carte = new Carte(def.map, LEGENDE);
  const accent = def.accent || ACCENTS[def.id] || '#8FA6B8';

  const sonde = {
    box: { x: def.spawn.tx * TUILE + 3, y: def.spawn.ty * TUILE + 2, w: 10, h: 12 },
    vx: 0, vy: 0, sol: false, coyote: 0, tampon: 0,
    impulsion: true, cible: null, etire: 1, aplati: 1,
    decroche: 0,
  };

  let cam = { x: 0, y: 0 };
  let trace = false, traceBudget = TRACE_MAX, traceP = 0, balayage = 0;
  let t = 0, fini = false, sortie = 0;
  let passage = { x: sonde.box.x, y: sonde.box.y };
  let message = def.indice || '', messageT = 300;
  let hitstop = 0;
  const echos = [];
  const sols = [];
  const cibles = (def.cibles || []).map(c => ({ ...c }));
  const acteurs = (def.acteurs || []).map(a => ({ ...a }));
  const particules = [];

  const ctx = {
    sonde, carte, cibles, acteurs, sols, particules,
    get cam() { return cam; },
    get trace() { return trace; },
    get t() { return t; },
    def, accent,
    msg(txt, duree) { message = txt; messageT = duree || 260; },
    ajouteSol(x, y, w, h, label) {
      const s = { x, y, w, h, label: label || '', actif: true };
      sols.push(s); return s;
    },
    fini() { if (!fini) { fini = true; sortie = 0; } },
    emet(x, y, n, col) {
      for (let i = 0; i < n; i++) {
        particules.push({
          x, y,
          vx: (((i * 37) % 11) - 5) * 0.16,
          vy: -0.3 - ((i * 13) % 7) * 0.08,
          vie: 22 + (i % 9), max: 22 + (i % 9), col: col || P.sonde,
        });
      }
    },
  };

  if (def.init) def.init(ctx);

  function cibleLaPlusProche() {
    const cx = sonde.box.x + sonde.box.w / 2, cy = sonde.box.y + sonde.box.h / 2;
    let best = null, bd = M.portee * M.portee;
    for (const c of cibles) {
      if (c.fait) continue;
      const dx = (c.x + c.w / 2) - cx, dy = (c.y + c.h / 2) - cy;
      const d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = c; }
    }
    return best;
  }

  function appliqueVerbe(c) {
    c.fait = true;
    ctx.emet(c.x + c.w / 2, c.y + c.h / 2, 8, P.valide);
    hitstop = 3;
    for (let i = 0; i < 5; i++) {
      echos.push({ x: sonde.box.x + 5, y: sonde.box.y + 6, a: 1 - i * 0.18, vie: 8 + i * 3 });
    }
    if (!c.sansSol) {
      ctx.ajouteSol(c.x - (c.solW - c.w) / 2, c.y + c.solDy, c.solW, c.solH, c.apres);
    }
    if (def.surVerbe) def.surVerbe(ctx, c);
  }

  function replace() {
    sonde.box.x = passage.x; sonde.box.y = passage.y;
    sonde.vx = 0; sonde.vy = 0; sonde.impulsion = true;
    sonde.decroche = 22;
  }

  function pas(input) {
    t++;
    if (hitstop > 0) { hitstop--; return; }
    if (sonde.decroche > 0) { sonde.decroche--; if (sonde.decroche > 0) return; }

    // ---- TRACE : ressource, pas information gratuite ----
    const veutTrace = input.tenu(B.TRACE);
    const avant = trace;
    trace = veutTrace && traceBudget > 0;
    if (trace) traceBudget = Math.max(0, traceBudget - TRACE_COUT);
    else traceBudget = Math.min(TRACE_MAX, traceBudget + TRACE_RECUP);
    if (trace !== avant) balayage = 1;
    traceP += ((trace ? 1 : 0) - traceP) * 0.35;
    if (balayage > 0) balayage = Math.max(0, balayage - 0.09);

    // ---- déplacement horizontal ----
    const g = input.tenu(B.GAUCHE), d = input.tenu(B.DROITE);
    const dir = (d ? 1 : 0) - (g ? 1 : 0);
    const acc = sonde.sol ? M.accelSol : M.accelAir;
    if (dir !== 0) {
      const demiTour = (dir > 0 && sonde.vx < 0) || (dir < 0 && sonde.vx > 0);
      sonde.vx += dir * acc * (demiTour ? M.demiTour : 1);
      sonde.vx = Math.max(-M.vmax, Math.min(M.vmax, sonde.vx));
    } else {
      sonde.vx *= sonde.sol ? M.frictionSol : M.frictionAir;
      if (Math.abs(sonde.vx) < 0.04) sonde.vx = 0;
    }

    // ---- saut, puis impulsion au deuxième appui en l'air ----
    if (input.appuye(B.SAUT)) sonde.tampon = M.tampon;
    if (sonde.tampon > 0) sonde.tampon--;
    if (sonde.coyote > 0) sonde.coyote--;

    if (sonde.tampon > 0 && sonde.coyote > 0) {
      sonde.vy = M.saut; sonde.tampon = 0; sonde.coyote = 0; sonde.sol = false;
      sonde.etire = 0.82; sonde.aplati = 1.18;
      ctx.emet(sonde.box.x + 5, sonde.box.y + 12, 4);
    } else if (sonde.tampon > 0 && sonde.impulsion && !sonde.sol) {
      const c = cibleLaPlusProche();
      sonde.tampon = 0;
      sonde.impulsion = false;
      sonde.vy = M.impulsionVy;               // conserve vx : le temps suspendu
      for (let i = 0; i < 5; i++) {
        echos.push({ x: sonde.box.x + 5, y: sonde.box.y + 6, a: 1 - i * 0.18, vie: 8 + i * 3 });
      }
      if (c) appliqueVerbe(c);
      else ctx.emet(sonde.box.x + 5, sonde.box.y + 6, 4, P.halo);
    }
    if (input.relache(B.SAUT) && sonde.vy < M.sautCoupe) sonde.vy = M.sautCoupe;

    // ---- gravité ----
    sonde.vy += sonde.vy < 0 ? M.graviteHaut : M.gravite;
    sonde.vy = Math.min(M.vyMax, sonde.vy);

    const etaitSol = sonde.sol;
    const res = deplacer(carte, sonde.box, sonde.vx, sonde.vy, trace, sols);
    if (res.mur) sonde.vx = 0;
    if (res.plafond && sonde.vy < 0) sonde.vy = 0;
    sonde.sol = res.sol;
    if (res.sol) {
      if (sonde.vy > 2.2) { sonde.etire = 1.22; sonde.aplati = 0.78; ctx.emet(sonde.box.x + 5, sonde.box.y + 12, 5); }
      sonde.vy = 0; sonde.coyote = M.coyote; sonde.impulsion = true;
    } else if (etaitSol) {
      sonde.coyote = M.coyote;
    }

    // ---- drapeaux du décor ----
    const f = drapeauxSous(carte, sonde.box);
    if (f & F.ANCRE) sonde.impulsion = true;
    if (f & F.PASSAGE) { passage = { x: sonde.box.x, y: sonde.box.y }; }
    if ((f & F.SORTIE) && !fini) ctx.fini();
    if ((f & F.DANGER) || res.danger || sonde.box.y > carte.pxH + 40) replace();

    // ---- retours visuels ----
    sonde.etire += (1 - sonde.etire) * 0.16;
    sonde.aplati += (1 - sonde.aplati) * 0.16;
    sonde.cible = cibleLaPlusProche();

    for (let i = echos.length - 1; i >= 0; i--) {
      echos[i].vie--; echos[i].a *= 0.86;
      if (echos[i].vie <= 0) echos.splice(i, 1);
    }
    for (let i = particules.length - 1; i >= 0; i--) {
      const p = particules[i];
      p.x += p.vx; p.y += p.vy; p.vy += 0.04; p.vie--;
      if (p.vie <= 0) particules.splice(i, 1);
    }
    if (messageT > 0) messageT--;

    // ---- caméra : suit avec avance dans le sens de la course ----
    const viseX = sonde.box.x - VUE_W / 2 + sonde.vx * 18;
    const viseY = sonde.box.y - VUE_H * 0.62;
    cam.x += (viseX - cam.x) * 0.11;
    cam.y += (viseY - cam.y) * 0.09;
    cam.x = Math.max(0, Math.min(carte.pxW - VUE_W, cam.x));
    cam.y = Math.max(0, Math.min(Math.max(0, carte.pxH - VUE_H), cam.y));

    if (def.pas) def.pas(ctx, input);

    if (fini) { sortie++; if (sortie > 40) app.finNiveau(def); }
  }

  function dessine(r) {
    const camr = { x: Math.round(cam.x), y: Math.round(cam.y) };
    r.fond(accent, trace);
    r.parallaxe(camr, accent, trace, def.numero || 1, carte.pxH);
    if (def.dessine) def.dessine(ctx, r, camr);
    r.carte(carte, camr, accent, trace, t);

    for (const s of sols) r.support(s, camr, trace);
    for (const a of acteurs) r.acteur(a, camr, trace, t);
    for (const c of cibles) r.cible(c, camr, trace, t, c === sonde.cible);

    const c2 = r.ctx;
    for (const p of particules) {
      c2.fillStyle = alpha(p.col, Math.max(0, p.vie / p.max));
      c2.fillRect(Math.round(p.x - camr.x), Math.round(p.y - camr.y), 2, 2);
    }
    r.echos(echos, camr);
    if (sonde.decroche > 0 && (sonde.decroche >> 1) % 2 === 0) { /* clignote */ }
    else r.sonde(sonde, camr, t, app.etat.modules);

    if (def.dessineDevant) def.dessineDevant(ctx, r, camr);
    r.balayage(1 - balayage);
    r.vignette();
    hud(r);
  }

  function hud(r) {
    const c = r.ctx;
    // bandeau du haut : employeur, années, verbe
    c.fillStyle = alpha(P.fond, 0.72);
    c.fillRect(0, 0, VUE_W, 12);
    c.fillStyle = alpha(accent, 0.5);
    c.fillRect(0, 11, VUE_W, 1);
    texte(c, `${def.numero}.${def.employeur}`, 4, 9, P.texte, 'left');
    texte(c, def.annees, VUE_W - 4, 9, P.texte2, 'right');
    if (def.verbe) texte(c, def.verbe, VUE_W / 2, 9, trace ? P.traceFil : P.sonde, 'center');

    // jauge de TRACE : seule ressource du jeu
    const w = 44, x = 4, y = 16;
    c.fillStyle = alpha(P.panneau, 0.85);
    c.fillRect(x, y, w, 4);
    const p = traceBudget / TRACE_MAX;
    c.fillStyle = p < 0.22 ? P.anomalie : (trace ? P.traceFil : alpha(P.traceFil, 0.55));
    c.fillRect(x, y, Math.round(w * p), 4);
    texte(c, 'trace', x + w + 4, y + 4, P.texte2, 'left');

    // pastille d'impulsion disponible
    c.fillStyle = sonde.impulsion ? P.sonde : alpha(P.texte2, 0.35);
    c.fillRect(x, y + 7, 4, 4);
    texte(c, 'impulsion', x + 7, y + 11, sonde.impulsion ? P.texte2 : alpha(P.texte2, 0.5), 'left');

    if (messageT > 0 && message) {
      const a = Math.min(1, messageT / 40);
      const lw = largeurTexte(message) + 12;
      c.fillStyle = alpha(P.panneau, 0.9 * a);
      c.fillRect(VUE_W / 2 - lw / 2, 30, lw, 13);
      c.fillStyle = alpha(accent, 0.55 * a);
      c.fillRect(VUE_W / 2 - lw / 2, 30, lw, 1);
      texte(c, message, VUE_W / 2, 39, alpha(P.texte, a), 'center');
    }

    if (fini) {
      const a = Math.min(1, sortie / 12);
      c.fillStyle = alpha(P.fond, 0.55 * a);
      c.fillRect(0, 0, VUE_W, VUE_H);
      texte(c, 'NIVEAU TERMINE', VUE_W / 2, VUE_H / 2, alpha(P.valide, a), 'center');
    }
  }

  // `ctx` est exposé pour la recette : un harnais peut simuler un joueur
  // et vérifier qu'un niveau se termine sans y toucher à la main.
  return { pas, dessine, def, ctx, get trace() { return trace; },
           get fini() { return fini; } };
}
