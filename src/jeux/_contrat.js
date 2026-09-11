// CONTRAT DE JEU — figé. Chaque quartier de la ville héberge un jeu.
//
// Un jeu exporte par défaut :
//   {
//     id, ordre, titre, employeur, annees, factKey, verbe, accent, description,
//     monter(conteneur, api) -> { demonter(), resoudre() }
//   }
//
// - conteneur : un <div> plein écran, vide, que le jeu remplit comme il veut
//   (DOM, canvas 2D, ou Three.js avec son propre renderer via `import * as THREE from 'three'`).
// - api.fini({ score, message })  : le jeu est gagné ; la ville reprend la main.
// - api.abandonner()              : retour à la ville sans victoire.
// - api.FAITS                     : les faits de CV (lecture seule). Un jeu n'invente rien.
// - api.accent                    : la couleur du quartier, en hex CSS.
// - resoudre() : joue une solution correcte SANS intervention humaine et doit aboutir
//   à api.fini en moins de 20 s. C'est le crochet de la recette automatique : un jeu
//   qui ne sait pas se résoudre ne sait pas prouver qu'il est gagnable.
// - demonter() : retire tout (DOM, écouteurs, boucles, renderer). Rien ne doit survivre.

import { FAITS } from '../cv.js';

export function valider(j) {
  const e = [];
  for (const k of ['id', 'ordre', 'titre', 'employeur', 'factKey', 'verbe', 'accent', 'description'])
    if (j[k] === undefined || j[k] === '') e.push(`champ manquant : ${k}`);
  if (typeof j.monter !== 'function') e.push('monter() manquant');
  if (!FAITS[j.factKey]) e.push(`factKey inconnue : ${j.factKey}`);
  return e;
}

// ---------------------------------------------------------------------------
// Aides visuelles partagées : un cadre, un terminal, des boutons. Les jeux
// gardent la même peau sans se copier du CSS.
// ---------------------------------------------------------------------------

let stylesPoses = false;
export function injecterStyles() {
  if (stylesPoses) return;
  stylesPoses = true;
  const s = document.createElement('style');
  s.id = 'jeu-styles';
  s.textContent = `
  .jx{position:absolute;inset:0;display:flex;flex-direction:column;
      background:#07090C;color:#C8D3DA;font:14px/1.5 "IBM Plex Mono",ui-monospace,Menlo,monospace;
      --acc:#FFB454;overflow:hidden}
  .jx *{box-sizing:border-box}
  .jx-tete{flex:none;display:flex;align-items:baseline;gap:14px;padding:10px 16px;
      border-bottom:1px solid #2B3843;background:#0B0E11}
  .jx-tete h2{font-family:"Archivo",system-ui,sans-serif;font-size:15px;font-weight:700;margin:0;letter-spacing:.01em}
  .jx-tete h2 small{font-family:"IBM Plex Mono",monospace;font-weight:400;font-size:11px;color:#7A8A96;margin-left:8px}
  .jx-tete .jx-verbe{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--acc)}
  .jx-tete .jx-sp{flex:1}
  .jx-tete .jx-consigne{font-size:12px;color:#7A8A96;max-width:52ch;text-align:right}
  .jx-corps{flex:1;min-height:0;position:relative;display:flex}
  .jx-pied{flex:none;display:flex;align-items:center;gap:12px;padding:9px 16px;
      border-top:1px solid #2B3843;background:#0B0E11;font-size:12px;color:#7A8A96}
  .jx-pied .jx-sp{flex:1}
  .jx-btn{font:600 12px/1 "IBM Plex Mono",monospace;letter-spacing:.08em;text-transform:uppercase;
      color:#C8D3DA;background:transparent;border:1px solid #3A4652;border-radius:2px;
      padding:9px 14px;cursor:pointer}
  .jx-btn:hover{border-color:var(--acc);color:var(--acc)}
  .jx-btn.fort{background:var(--acc);border-color:var(--acc);color:#0B0E11}
  .jx-btn.fort:hover{opacity:.88;color:#0B0E11}
  .jx-btn:focus-visible{outline:2px solid #7FA3FF;outline-offset:2px}
  .jx-btn[disabled]{opacity:.35;cursor:default}
  .jx-statut{color:#C8D3DA}
  .jx-statut.ok{color:#6FCF8E}.jx-statut.ko{color:#E8503A}

  .jx-term{flex:1;min-width:0;display:flex;flex-direction:column;background:#05070A;
      border-right:1px solid #1F2832;font-size:13px}
  .jx-term-out{flex:1;overflow:auto;padding:14px 16px;white-space:pre-wrap;word-break:break-word}
  .jx-term-out .l{margin:0 0 2px}
  .jx-term-out .sys{color:#7A8A96}.jx-term-out .acc{color:var(--acc)}
  .jx-term-out .ok{color:#6FCF8E}.jx-term-out .ko{color:#E8503A}.jx-term-out .cmd{color:#BFE9DF}
  .jx-term-out .dim{color:#4E5A66}
  .jx-term-in{flex:none;display:flex;align-items:center;gap:8px;padding:8px 16px;border-top:1px solid #1F2832}
  .jx-term-in span{color:var(--acc)}
  .jx-term-in input{flex:1;background:transparent;border:0;outline:0;color:#E6EDEA;
      font:13px "IBM Plex Mono",monospace;caret-color:var(--acc)}
  .jx-lat{width:min(42%,460px);flex:none;overflow:auto;padding:14px 16px;display:flex;flex-direction:column;gap:10px}
  .jx-carte{border:1px solid #2B3843;border-left:3px solid var(--acc);border-radius:2px;
      padding:10px 12px;background:#0B0E11}
  .jx-carte h3{font:700 11px/1.3 "Archivo",sans-serif;letter-spacing:.1em;text-transform:uppercase;
      color:var(--acc);margin:0 0 6px}
  .jx-carte p{margin:0 0 6px;font-size:12.5px}
  .jx-carte p:last-child{margin:0}
  .jx-choix{display:flex;flex-direction:column;gap:6px}
  .jx-choix button{text-align:left;font:13px "IBM Plex Mono",monospace;color:#C8D3DA;background:#0E1318;
      border:1px solid #2B3843;border-radius:2px;padding:9px 11px;cursor:pointer}
  .jx-choix button:hover{border-color:var(--acc)}
  .jx-choix button.ok{border-color:#6FCF8E;color:#6FCF8E}
  .jx-choix button.ko{border-color:#E8503A;color:#E8503A}
  .jx-jauge{height:6px;background:#1B232B;border-radius:1px;overflow:hidden}
  .jx-jauge i{display:block;height:100%;background:var(--acc);transition:width .2s}
  .jx-jauge.ko i{background:#E8503A}
  .jx-fin{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
      background:rgba(5,7,10,.82);z-index:5}
  .jx-fin .jx-carte{max-width:520px;width:calc(100% - 40px);padding:20px 22px}
  .jx-fin h3{font-size:14px}
  .jx-fin p{font-size:14px}
  @media (max-width:760px){
    .jx-corps{flex-direction:column}
    .jx-lat{width:auto;flex:none;max-height:44%;border-top:1px solid #1F2832}
    .jx-term{border-right:0}
    .jx-tete .jx-consigne{display:none}
  }`;
  document.head.appendChild(s);
}

// Le cadre : en-tête (titre, employeur, verbe, consigne), corps, pied.
export function creerCadre(conteneur, { titre, employeur, annees, verbe, accent, consigne }) {
  injecterStyles();
  const racine = document.createElement('div');
  racine.className = 'jx';
  racine.style.setProperty('--acc', accent);
  racine.innerHTML = `
    <div class="jx-tete">
      <span class="jx-verbe">${verbe}</span>
      <h2>${titre}<small>${employeur}${annees ? ' · ' + annees : ''}</small></h2>
      <span class="jx-sp"></span>
      <span class="jx-consigne">${consigne || ''}</span>
    </div>
    <div class="jx-corps"></div>
    <div class="jx-pied"><span class="jx-statut"></span><span class="jx-sp"></span></div>`;
  conteneur.appendChild(racine);
  const corps = racine.querySelector('.jx-corps');
  const pied = racine.querySelector('.jx-pied');
  const statutEl = racine.querySelector('.jx-statut');
  return {
    racine, corps, pied,
    statut(txt, etat) { statutEl.textContent = txt; statutEl.className = 'jx-statut' + (etat ? ' ' + etat : ''); },
    bouton(label, fn, fort) {
      const b = document.createElement('button');
      b.className = 'jx-btn' + (fort ? ' fort' : '');
      b.textContent = label;
      b.addEventListener('click', fn);
      pied.appendChild(b);
      return b;
    },
    // Écran de fin en surimpression, avec le fait de CV prouvé.
    fin({ titre: t, texte, bouton: bl, action }) {
      const f = document.createElement('div');
      f.className = 'jx-fin';
      f.innerHTML = `<div class="jx-carte"><h3>${t}</h3><p>${texte}</p></div>`;
      const b = document.createElement('button');
      b.className = 'jx-btn fort';
      b.textContent = bl || 'Continuer';
      b.style.marginTop = '12px';
      b.addEventListener('click', action);
      f.querySelector('.jx-carte').appendChild(b);
      corps.appendChild(f);
      b.focus();
      return f;
    },
  };
}

// Un terminal : sortie défilante, invite de commande facultative.
export function creerTerminal(parent, { invite = '>' } = {}) {
  const t = document.createElement('div');
  t.className = 'jx-term';
  t.innerHTML = `<div class="jx-term-out" aria-live="polite"></div>
    <div class="jx-term-in" hidden><span>${invite}</span><input type="text" autocomplete="off" spellcheck="false" aria-label="commande"></div>`;
  parent.appendChild(t);
  const out = t.querySelector('.jx-term-out');
  const zone = t.querySelector('.jx-term-in');
  const input = zone.querySelector('input');
  let surCommande = null;
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && surCommande) {
      const v = input.value.trim();
      input.value = '';
      if (v) { ecrire(invite + ' ' + v, 'cmd'); surCommande(v); }
      e.stopPropagation();
    }
  });
  function ecrire(txt, classe) {
    const l = document.createElement('div');
    l.className = 'l' + (classe ? ' ' + classe : '');
    l.textContent = txt;
    out.appendChild(l);
    out.scrollTop = out.scrollHeight;
    return l;
  }
  return {
    el: t,
    ecrire,
    vide() { ecrire(''); },
    effacer() { out.innerHTML = ''; },
    invite(cb) { surCommande = cb; zone.hidden = !cb; if (cb) setTimeout(() => input.focus(), 30); },
    // Déclenche une commande comme si l'utilisateur l'avait tapée (pour resoudre()).
    executer(v) { ecrire(invite + ' ' + v, 'cmd'); if (surCommande) surCommande(v); },
    focus() { input.focus(); },
  };
}

// Colonne latérale de cartes.
export function creerLateral(parent) {
  const l = document.createElement('div');
  l.className = 'jx-lat';
  parent.appendChild(l);
  return {
    el: l,
    carte(titre, html) {
      const c = document.createElement('div');
      c.className = 'jx-carte';
      c.innerHTML = `<h3>${titre}</h3>${html}`;
      l.appendChild(c);
      return c;
    },
    vider() { l.innerHTML = ''; },
  };
}

export function attendre(ms) { return new Promise(r => setTimeout(r, ms)); }
