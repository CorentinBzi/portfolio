# Portfolio — Corentin Bezille

Portfolio de candidature orienté **Forward Deployed Engineer** : diagnostic de systèmes
critiques, Python, modèles de langage, et communication avec des utilisateurs qui ne sont
pas techniciens.

| Page | Rôle |
|---|---|
| `index.html` | Portfolio. Une mise en situation, la boucle de résolution d'incident, quatre cas détaillés, la stack avec ses trous assumés, le parcours. |
| `cv.html` | CV sur deux pages A4, imprimable en PDF depuis le navigateur. |

## Principes

- **Un fichier par page**, HTML + CSS + un court script. Aucun framework, aucune dépendance
  hors les polices Google (Archivo, Source Serif 4, IBM Plex Mono).
- **Le contenu ne dépend pas de JavaScript.** L'animation d'apparition ne s'active que si le
  script tourne ; sans lui, toute la page reste lisible.
- **Thème clair et sombre**, suivant le réglage du système.
- Responsive jusqu'au mobile, focus clavier visible, `prefers-reduced-motion` respecté.

## Lancer en local

```bash
python -m http.server 8123
```

Puis ouvrir <http://localhost:8123/>.

## Produire le PDF du CV

Ouvrir `cv.html`, imprimer (Ctrl+P), choisir « Enregistrer au format PDF », A4, et **activer
les arrière-plans** pour conserver les liserés de couleur. La pagination est figée à deux
pages dans le CSS.

## Hébergement

Site statique publié via **GitHub Pages** depuis la branche `main`, dossier racine.

---

Version précédente : « SecAudit », un mini-jeu d'audit cybersécurité qui déchiffrait le CV.
Remplacée le 11 septembre 2026 — l'angle jeu desservait une candidature où ce qui compte est
la clarté d'explication, pas la mise en scène.
