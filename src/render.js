// Rendu. Seul fichier autorisé à toucher un contexte 2D.
// Tampon interne fixe 480x270, présenté à l'échelle entière la plus grande
// possible : le pixel reste carré, quelle que soit la fenêtre.

import { P, alpha, mix } from './palette.js';
import { TUILE, F, isSolid } from './physics.js';

// Cadrage serré : 20 tuiles de large, 11 de haut. Assez petit pour que les
// sprites se lisent, assez grand pour voir le saut suivant arriver.
export const VUE_W = 320, VUE_H = 180;

export function createRenderer(canvas) {
  const tampon = document.createElement('canvas');
  tampon.width = VUE_W; tampon.height = VUE_H;
  const c = tampon.getContext('2d', { alpha: false });
  const out = canvas.getContext('2d', { alpha: false });
  c.imageSmoothingEnabled = false;
  out.imageSmoothingEnabled = false;

  return {
    ctx: c,
    taille() { return { w: VUE_W, h: VUE_H }; },

    fond(accent, trace) {
      c.fillStyle = trace ? P.traceFond : P.fond;
      c.fillRect(0, 0, VUE_W, VUE_H);
      if (trace) return;
      // dégradé vertical très sourd, teinté par l'accent du niveau
      const g = c.createLinearGradient(0, 0, 0, VUE_H);
      g.addColorStop(0, alpha(accent, 0.10));
      g.addColorStop(0.55, alpha(accent, 0.03));
      g.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g;
      c.fillRect(0, 0, VUE_W, VUE_H);
    },

    // Trois couches de parallaxe faites de rectangles : baies, montants, sol.
    parallaxe(cam, accent, trace, graine, solY) {
      solY = solY === undefined ? 0 : solY;
      if (trace) return;
      const couches = [
        { p: 0.12, h: 92, a: 0.13, pas: 44, larg: 16 },
        { p: 0.30, h: 66, a: 0.17, pas: 31, larg: 11 },
        { p: 0.55, h: 40, a: 0.24, pas: 21, larg: 8 },
      ];
      for (let i = 0; i < couches.length; i++) {
        const k = couches[i];
        const ox = -(cam.x * k.p) % k.pas;
        c.fillStyle = alpha(mix(P.structure, accent, 0.18 + i * 0.06), k.a);
        for (let x = ox - k.pas; x < VUE_W + k.pas; x += k.pas) {
          const j = Math.floor((x + cam.x * k.p) / k.pas);
          const hh = k.h + ((j * 37 + graine * 13) % 5) * 7;
          const base = solY ? (solY - cam.y) : VUE_H;
          c.fillRect(Math.round(x), base - hh, k.larg, hh);
          // hublots : un point tous les 12 px, densité stable par colonne
          if (i > 0) {
            c.fillStyle = alpha(accent, 0.10 + i * 0.05);
            for (let y = base - hh + 5; y < base - 6; y += 10) {
              if (((j * 7 + y) % 3) === 0) c.fillRect(Math.round(x) + 3, y, 3, 2);
            }
            c.fillStyle = alpha(mix(P.structure, accent, 0.18 + i * 0.06), k.a);
          }
        }
      }
    },

    carte(carte, cam, accent, trace, t) {
      const x0 = Math.max(0, Math.floor(cam.x / TUILE));
      const x1 = Math.min(carte.w - 1, Math.ceil((cam.x + VUE_W) / TUILE));
      const y0 = Math.max(0, Math.floor(cam.y / TUILE));
      const y1 = Math.min(carte.h - 1, Math.ceil((cam.y + VUE_H) / TUILE));

      const solide = trace ? mix(P.traceFil, P.traceFond, 0.78) : mix(P.structure, accent, 0.22);
      const arete  = trace ? P.traceFil : mix(P.ligne, accent, 0.35);

      for (let ty = y0; ty <= y1; ty++) {
        for (let tx = x0; tx <= x1; tx++) {
          const f = carte.at(tx, ty);
          if (!f) continue;
          const px = Math.round(tx * TUILE - cam.x), py = Math.round(ty * TUILE - cam.y);

          if (f & F.SOLIDE) {
            if (trace) {
              c.fillStyle = alpha(P.traceFil, 0.07);
              c.fillRect(px, py, TUILE, TUILE);
              c.strokeStyle = alpha(P.traceFil, 0.55);
              c.lineWidth = 1;
              c.strokeRect(px + 0.5, py + 0.5, TUILE - 1, TUILE - 1);
              if (!(carte.at(tx, ty - 1) & F.SOLIDE)) {
                c.fillStyle = P.traceFil;
                c.fillRect(px, py, TUILE, 1);
              }
            } else {
              c.fillStyle = solide;
              c.fillRect(px, py, TUILE, TUILE);
              if (!(carte.at(tx, ty - 1) & F.SOLIDE)) {
                c.fillStyle = arete;
                c.fillRect(px, py, TUILE, 2);
              }
            }
          } else if (f & F.PLATEFORME) {
            c.fillStyle = trace ? alpha(P.traceFil, 0.5) : arete;
            c.fillRect(px, py, TUILE, 3);
          } else if (f & F.BRUIT) {
            // faux positif : plein et rassurant en surface, fantôme en trace
            if (trace) {
              c.strokeStyle = alpha(P.anomalie, 0.35);
              c.setLineDash([2, 3]);
              c.strokeRect(px + 0.5, py + 0.5, TUILE - 1, TUILE - 1);
              c.setLineDash([]);
            } else {
              c.fillStyle = solide;
              c.fillRect(px, py, TUILE, TUILE);
              c.fillStyle = arete;
              c.fillRect(px, py, TUILE, 2);
            }
          } else if (f & F.TRACE_SEUL) {
            // la cause réelle : n'existe que sous les journaux
            if (trace) {
              const pulse = 0.55 + 0.25 * Math.sin(t / 9 + tx);
              c.fillStyle = alpha(P.traceFil, pulse);
              c.fillRect(px, py, TUILE, TUILE);
              c.fillStyle = alpha(P.traceFond, 0.55);
              c.fillRect(px + 2, py + 2, TUILE - 4, TUILE - 4);
            } else {
              c.strokeStyle = alpha(P.traceFil, 0.13);
              c.setLineDash([1, 4]);
              c.strokeRect(px + 0.5, py + 0.5, TUILE - 1, TUILE - 1);
              c.setLineDash([]);
            }
          } else if (f & F.DANGER) {
            const pulse = 0.5 + 0.3 * Math.sin(t / 7);
            c.fillStyle = alpha(P.anomalie, trace ? 0.75 : pulse);
            c.fillRect(px, py + 4, TUILE, TUILE - 4);
          } else if (f & F.PASSAGE) {
            c.fillStyle = alpha(P.sonde, 0.30);
            c.fillRect(px + 7, py, 2, TUILE);
          } else if (f & F.SORTIE) {
            const pulse = 0.35 + 0.2 * Math.sin(t / 12);
            c.fillStyle = alpha(P.valide, pulse);
            c.fillRect(px + 2, py, TUILE - 4, TUILE);
          } else if (f & F.ANCRE) {
            c.fillStyle = alpha(P.sonde, 0.5);
            c.fillRect(px + 6, py + 6, 4, 4);
          }
        }
      }
    },

    // La sonde : un losange à coins abattus, plus ses modules acquis.
    sonde(s, cam, t, modules) {
      const x = Math.round(s.box.x - cam.x + s.box.w / 2);
      const y = Math.round(s.box.y - cam.y + s.box.h / 2);
      const sx = s.etire, sy = s.aplati;

      c.save();
      c.translate(x, y);
      if (Math.abs(s.vx) > 0.4) c.rotate((s.vx > 0 ? 1 : -1) * 0.1);
      c.scale(sx, sy);

      // halo par contours empilés — jamais shadowBlur, trop coûteux
      for (let i = 3; i >= 1; i--) {
        c.fillStyle = alpha(P.halo, 0.05 * i);
        losange(c, 0, 0, 8 + i * 2);
      }
      c.fillStyle = P.sonde;
      losange(c, 0, 0, 7);
      // la fente : le seul regard du personnage
      c.fillStyle = s.cible ? '#FFFFFF' : mix(P.sonde, P.fond, 0.55);
      c.fillRect(-3, -1, 6, 2);
      c.restore();

      // modules acquis, en orbite fixe autour du corps
      if (modules && modules.length) {
        for (let i = 0; i < modules.length; i++) {
          const a = (i / 5) * Math.PI * 2 + t / 90;
          const mx = x + Math.cos(a) * 12, my = y + Math.sin(a) * 12;
          c.fillStyle = alpha(P.sonde, 0.75);
          dessineModule(c, modules[i], mx, my);
        }
      }
    },

    // Echos de l'impulsion : cinq silhouettes décroissantes.
    echos(liste, cam) {
      for (const e of liste) {
        c.fillStyle = alpha(P.halo, e.a * 0.5);
        losange(c, Math.round(e.x - cam.x), Math.round(e.y - cam.y), 7);
      }
    },

    // Une cible verbale : petit rectangle de texte machine, qui devient
    // une phrase solide une fois transformée.
    cible(ci, cam, trace, t, aPortee) {
      const x = Math.round(ci.x - cam.x), y = Math.round(ci.y - cam.y);
      // une cible transformée disparaît : la phrase vit désormais sur le sol
      // qu'elle a fabriqué, et l'écrire deux fois brouille la lecture
      if (ci.fait) return;
      const visible = trace || ci.visibleSurface;
      if (!visible) return;
      const puls = aPortee ? 0.55 + 0.3 * Math.sin(t / 6) : 0.22;
      c.fillStyle = alpha(trace ? P.traceFil : P.sonde, puls * 0.25);
      c.fillRect(x, y, ci.w, ci.h);
      c.strokeStyle = alpha(trace ? P.traceFil : P.sonde, puls);
      c.lineWidth = 1;
      c.strokeRect(x + 0.5, y + 0.5, ci.w - 1, ci.h - 1);
      texte(c, ci.avant, x + 4, y + ci.h / 2 + 3,
            trace ? P.traceTexte : P.texte2, 'left');
    },

    // Sol fabriqué par un verbe : phrase, courbe, pont.
    support(s, cam, trace) {
      if (!s.actif) return;
      const x = Math.round(s.x - cam.x), y = Math.round(s.y - cam.y);
      c.fillStyle = alpha(P.valide, 0.20);
      c.fillRect(x, y, s.w, s.h);
      c.fillStyle = P.valide;
      c.fillRect(x, y, s.w, 2);
      if (s.label) texte(c, s.label, x + 4, y + 11, P.texte, 'left');
    },

    acteur(a, cam, trace, t) {
      const x = Math.round(a.x - cam.x), y = Math.round(a.y - cam.y);
      // silhouette humaine : trois rectangles, pas de visage
      const col = trace ? alpha(P.traceFil, 0.35) : mix(P.texte2, P.fond, 0.25);
      c.fillStyle = col;
      c.fillRect(x + 3, y + 4, 6, 12);   // buste
      c.fillRect(x + 4, y, 4, 4);        // tête
      c.fillRect(x + 3, y + 16, 2, 4);
      c.fillRect(x + 7, y + 16, 2, 4);
      if (a.bulle && !trace) {
        const w = a.bulle.length * 4 + 8;
        c.fillStyle = alpha(P.panneau, 0.92);
        c.fillRect(x - 2, y - 16, w, 12);
        c.strokeStyle = alpha(P.ligne, 0.9);
        c.strokeRect(x - 1.5, y - 15.5, w - 1, 11);
        texte(c, a.bulle, x + 2, y - 7, P.texte2, 'left');
      }
    },

    // Bascule TRACE : une passe franche de gauche à droite, puis plus rien.
    balayage(p) {
      if (p <= 0.02 || p >= 0.98) return;
      const x = p * (VUE_W + 60) - 30;
      const g = c.createLinearGradient(x - 40, 0, x + 8, 0);
      g.addColorStop(0, 'rgba(70,230,200,0)');
      g.addColorStop(1, 'rgba(70,230,200,0.22)');
      c.fillStyle = g;
      c.fillRect(x - 40, 0, 48, VUE_H);
    },

    vignette() {
      const g = c.createRadialGradient(VUE_W / 2, VUE_H / 2, VUE_H * 0.35,
                                       VUE_W / 2, VUE_H / 2, VUE_H * 0.78);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, 'rgba(0,0,0,0.42)');
      c.fillStyle = g;
      c.fillRect(0, 0, VUE_W, VUE_H);
    },

    texte,

    present() {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      const dispo = canvas.parentElement.getBoundingClientRect();
      const e = Math.max(1, Math.floor(Math.min(dispo.width / VUE_W, dispo.height / VUE_H)));
      const w = VUE_W * e, h = VUE_H * e;
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr; canvas.height = h * dpr;
        canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
        out.imageSmoothingEnabled = false;
      }
      out.setTransform(dpr, 0, 0, dpr, 0, 0);
      out.imageSmoothingEnabled = false;
      out.drawImage(tampon, 0, 0, VUE_W, VUE_H, 0, 0, w, h);
    },
  };
}

function losange(c, x, y, r) {
  c.beginPath();
  c.moveTo(x, y - r);
  c.lineTo(x + r * 0.78, y - r * 0.22);
  c.lineTo(x + r * 0.78, y + r * 0.22);
  c.lineTo(x, y + r);
  c.lineTo(x - r * 0.78, y + r * 0.22);
  c.lineTo(x - r * 0.78, y - r * 0.22);
  c.closePath();
  c.fill();
}

function dessineModule(c, nom, x, y) {
  switch (nom) {
    case 'TRADUIRE':      c.fillRect(x - 3, y - 1, 6, 1); c.fillRect(x - 3, y + 1, 6, 1); break;
    case 'INSTRUMENTER':  c.fillRect(x - 1, y - 4, 1, 8); c.fillRect(x - 3, y + 2, 5, 1); break;
    case 'SEGMENTER':     c.fillRect(x - 3, y - 3, 2, 6); c.fillRect(x + 1, y - 3, 2, 6); break;
    case 'ATTESTER':      c.fillRect(x - 3, y, 2, 2); c.fillRect(x, y - 2, 2, 2); c.fillRect(x + 2, y + 1, 2, 2); break;
    case 'COORDONNER':    for (let i = 0; i < 5; i++) { const a = i / 5 * 6.283; c.fillRect(x + Math.cos(a) * 3 - 1, y + Math.sin(a) * 3 - 1, 2, 2); } break;
    default:              c.fillRect(x - 1, y - 1, 2, 2);
  }
}

// Police bitmap 3x5 : 15 bits par glyphe, avance de 4 px. Aucune dépendance.
const GLYPHES = {};
const SRC = {
  A:'010101111101101', B:'110101110101110', C:'011100100100011', D:'110101101101110',
  E:'111100110100111', F:'111100110100100', G:'011100101101011', H:'101101111101101',
  I:'111010010010111', J:'001001001101010', K:'101101110101101', L:'100100100100111',
  M:'101111111101101', N:'101111101101101', O:'010101101101010', P:'110101110100100',
  Q:'010101101110011', R:'110101110101101', S:'011100010001110', T:'111010010010010',
  U:'101101101101011', V:'101101101101010', W:'101101111111101', X:'101101010101101',
  Y:'101101010010010', Z:'111001010100111',
  0:'011101101101110', 1:'010110010010111', 2:'110001010100111', 3:'110001010001110',
  4:'101101111001001', 5:'111100110001110', 6:'011100110101010', 7:'111001010010010',
  8:'010101010101010', 9:'010101011001110',
  '.':'000000000000010', '-':'000000111000000', ':':'000010000010000',
  '/':'001001010100100', '+':'000010111010000', '!':'010010010000010',
  '?':'110001010000010', "'":'010010000000000', '(':'001010010010001',
  ')':'100010010010100', '>':'100010001010100', '<':'001010100010001',
  '=':'000111000111000', '_':'000000000000111', ',':'000000000010100',
  '*':'000101010101000', '#':'101111101111101', '"':'101101000000000',
  ';':'000010000010100', '%':'101001010100101', '[':'011010010010011',
  ']':'110010010010110',
};
for (const k in SRC) {
  const bits = SRC[k];
  const pts = [];
  for (let i = 0; i < 15; i++) if (bits[i] === '1') pts.push([i % 3, Math.floor(i / 3)]);
  GLYPHES[k] = pts;
}

// Les accents sont repliés : la police est capitale et sans diacritiques,
// comme un afficheur d'exploitation. Le texte long vit dans le DOM, pas ici.
const PLIS = { 'É':'E','È':'E','Ê':'E','Ë':'E','À':'A','Â':'A','Ä':'A','Î':'I','Ï':'I',
               'Ô':'O','Ö':'O','Û':'U','Ù':'U','Ü':'U','Ç':'C','Œ':'OE','’':"'",
               '«':'"','»':'"','—':'-','–':'-','…':'...','·':'-' };

export function texte(c, str, x, y, col, align) {
  if (!str) return;
  let s = String(str).toUpperCase();
  let out = '';
  for (const ch of s) out += (PLIS[ch] !== undefined ? PLIS[ch] : ch);
  s = out;
  const larg = s.length * 4;
  let px = align === 'center' ? Math.round(x - larg / 2)
         : align === 'right'  ? Math.round(x - larg)
         : Math.round(x);
  const py = Math.round(y) - 5;
  c.fillStyle = col;
  for (let i = 0; i < s.length; i++) {
    const g = GLYPHES[s[i]];
    if (g) for (const [gx, gy] of g) c.fillRect(px + gx, py + gy, 1, 1);
    px += 4;
  }
}

export function largeurTexte(str) { return String(str).length * 4; }
