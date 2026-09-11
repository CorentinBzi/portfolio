// Recette en ligne de commande : node tools/recette.mjs [id-de-niveau]
//
// Simule un joueur rustique sur chaque niveau. S'il arrive à la sortie,
// un humain y arrivera aussi. S'il n'y arrive pas, le niveau est à revoir :
// c'est le seul critère qui compte avant de livrer.

import { NIVEAUX } from '../src/levels/index.js';
import { creerNiveau } from '../src/game.js';
import { valide } from '../src/levels/_contrat.js';
import { CLES } from '../src/cv.js';

const B = { GAUCHE: 1, DROITE: 2, SAUT: 4, TRACE: 8 };
const faux = (b, f) => ({ tenu: x => (b & x) !== 0, appuye: x => (f & x) !== 0, relache: () => false });
const app = { etat: { faits: [], modules: [] }, finNiveau() {} };

function joue(def, pasMax = 5000) {
  const sc = creerNiveau(app, def);
  if (sc.erreur) return { erreur: sc.erreur };
  const c = sc.ctx;
  let bloque = 0, dx = -1, sauts = 0, maxX = 0, chutes = 0, yPrec = 0;
  for (let i = 0; i < pasMax && !sc.fini; i++) {
    const s = c.sonde;
    maxX = Math.max(maxX, s.box.x);
    if (Math.abs(s.box.x - dx) < 0.3) bloque++; else bloque = 0;
    dx = s.box.x;
    if (s.box.y < yPrec - 40) chutes++;
    yPrec = s.box.y;

    const pieds = Math.floor((s.box.y + s.box.h + 1) / 16);
    const devant = Math.floor((s.box.x + s.box.w + 6) / 16);
    const trou = c.carte.at(devant, pieds) === 0 && c.carte.at(devant + 1, pieds) === 0;
    const marche = c.carte.at(devant, pieds - 1) !== 0 || c.carte.at(devant, pieds - 2) !== 0;

    let bits = B.DROITE, fronts = 0;
    if (trou || !s.sol) bits |= B.TRACE;         // on lit les journaux quand le sol manque
    if (s.sol && (trou || marche || bloque > 4)) { fronts |= B.SAUT; sauts++; }
    if (!s.sol && s.impulsion && s.cible) fronts |= B.SAUT;
    else if (!s.sol && s.impulsion && s.vy > 1.3) { fronts |= B.SAUT; sauts++; }
    sc.pas(faux(bits, fronts));
  }
  return {
    fini: sc.fini, sauts, chutes,
    avance: `${Math.round(maxX / 16)}/${c.carte.w}`,
    cibles: `${c.cibles.filter(t => t.fait).length}/${c.cibles.length}`,
  };
}

// Deux usages :
//   node tools/recette.mjs                  -> tous les niveaux du registre
//   node tools/recette.mjs thales           -> un niveau du registre
//   node tools/recette.mjs ./src/levels/x.js -> un fichier, meme hors registre
const arg = process.argv[2];
let liste;
if (arg && (arg.endsWith('.js') || arg.startsWith('.') || arg.includes('/'))) {
  const mod = await import(new URL(arg, import.meta.url).href.replace('/tools/', '/'));
  liste = [mod.default];
} else {
  liste = arg ? NIVEAUX.filter(n => n.id === arg) : NIVEAUX;
}
if (!liste.length || !liste[0]) { console.error(`aucun niveau « ${arg} »`); process.exit(2); }

let echecs = 0;
for (const n of liste) {
  const e = valide(n);
  if (e.length) { console.log(`FAIL  validateur   ${n.id} :: ${e.join(' · ')}`); echecs++; continue; }
  if (!CLES.includes(n.factKey)) { console.log(`FAIL  fait inconnu ${n.id} :: ${n.factKey}`); echecs++; continue; }
  const r = joue(n);
  if (r.erreur) { console.log(`FAIL  refuse       ${n.id} :: ${r.erreur}`); echecs++; continue; }
  const ok = r.fini;
  if (!ok) echecs++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  franchissable ${n.id.padEnd(14)} ` +
              `avance ${r.avance}  cibles ${r.cibles}  ${r.sauts} sauts  ${r.chutes} chutes`);
}
console.log(echecs ? `\n${echecs} échec(s).` : `\nTout passe (${liste.length} niveau(x)).`);
process.exit(echecs ? 1 : 0);
