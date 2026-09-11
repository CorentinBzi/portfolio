# Quelqu'un sur place — portfolio de Corentin Bezille

Un CV qui se joue. Jeu de plateforme 2D dans le navigateur, sans framework, sans
compilation, sans un seul fichier image : tout est dessiné par le code.

| Page | Rôle |
|---|---|
| `index.html` | **Le jeu.** Six niveaux, un par étape du parcours. |
| `dossier.html` | Le même contenu à lire, pour qui ne veut pas jouer. |
| `cv.html` | Le CV sur deux pages A4, imprimable en PDF. |

## Le jeu en deux phrases

Il est 02:14, un agent IA déployé dans un groupe hospitalier vient de décrocher. On incarne
**la sonde**, un petit programme de diagnostic amputé de ses capacités : pour réparer, elle
doit traverser les cinq environnements où ces capacités ont été écrites, et en rapporter un
verbe à chaque fois.

## Les deux mécaniques

**L'impulsion.** En l'air, un deuxième appui sur Saut applique le verbe du niveau sur la
cible la plus proche, et la transforme en sol praticable. Une seule par temps de vol,
rechargée à l'atterrissage. Aucun verbe ne détruit : tous fabriquent du terrain. C'est ce
qui interdit mécaniquement les ennemis, les pièces à ramasser et le combat.

**La trace.** Maj bascule le monde entre ce que les gens disent et ce que les journaux
disent. Les deux ne sont jamais d'accord : une plateforme rassurante s'évapore, la vraie
cause apparaît. C'est une ressource de six secondes, pas une information gratuite. La
géométrie vit dans la fonction de collision, pas dans le rendu, donc la mécanique ne peut
pas devenir décorative.

| Niveau | Étape | Verbe |
|---|---|---|
| 1 | Medline, 2018-2020 | Traduire |
| 2 | Thales, 2020-2021 | Instrumenter |
| 3 | Albys, 2021-2023 | Segmenter |
| 4 | Indépendant, 2023-2025 | Attester |
| 5 | Digital Realty, depuis 2025 | Coordonner |
| 6 | Scénario — le poste visé | Les cinq |

Le niveau 6 est une **mise en situation**, étiquetée comme telle partout : il ne revendique
aucune expérience.

## Honnêteté par construction

Les faits du parcours vivent dans un seul fichier, `src/cv.js`. Un niveau ne contient aucun
fait : il cite une clé. Le validateur refuse de démarrer sur une clé inconnue, donc le jeu
ne *peut pas* inventer une ligne de CV.

## Commandes

Flèches ou ZQSD pour avancer · Espace pour sauter, puis à nouveau en l'air pour l'impulsion ·
Maj pour lire les journaux · Échap pour revenir · Maj+D pour le dossier.
Manette et tactile pris en charge, avec deux boutons seulement.

## Structure

```
src/palette.js   les couleurs, et la règle qui réserve le rouge à l'anomalie
src/physics.js   isSolid(flags, trace), la collision, les constantes de saut
src/render.js    le seul fichier qui touche un contexte 2D, plus une police 3x5
src/input.js     clavier, manette, tactile, fusionnés en un masque de bits
src/game.js      la scène de niveau : impulsion, trace, caméra, HUD
src/hub.js       l'échelle chronologique
src/fin.js       l'écran de fin
src/cv.js        les faits, gelés
src/levels/      _contrat.js puis un fichier par niveau
tools/recette.mjs un robot qui joue chaque niveau et vérifie qu'il se termine
```

## Développer

```bash
python -m http.server 8123
```

Avant toute livraison, le seul critère qui compte :

```bash
node tools/recette.mjs
```

Un joueur automatique traverse chaque niveau. S'il n'atteint pas la sortie, le niveau est
à revoir. `tests.html` fait la même chose dans le navigateur.

## Contraintes tenues

Aucune dépendance hors les polices Google. Aucun fichier image ni audio. Le contenu reste
lisible sans JavaScript, via le dossier. Thème sombre, `prefers-reduced-motion` respecté,
focus clavier visible. Site statique servi par GitHub Pages depuis la branche `main`.
