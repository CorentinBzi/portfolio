# SecAudit — CV interactif de Corentin Bezille

Portfolio interactif « **The Compliance & Cyber Security Audit** » : un mini-jeu
d'audit cybersécurité (thème cyberpunk / data-center) qui déchiffre progressivement
mon CV de **Cyber & IT Control Compliance Analyst**.

- **Fichier unique** : `index.html` (HTML + CSS + JavaScript Vanilla, aucune dépendance externe).
- **4 zones de sécurité** à résoudre (SLA data-center, DMARC / anti-spoofing, optimisation stockage, examen OWASP Top 10).
- Bouton **Bypass** pour révéler tout le CV instantanément.
- Avatar en **pixel-art SVG** intégré (aucun asset externe requis).

## Lancer en local

Ouvre simplement `index.html` dans un navigateur, ou sers-le :

```bash
python -m http.server 8123
# puis http://localhost:8123/index.html
```

## Hébergement

Site statique — publié via **GitHub Pages** depuis la branche `main` (dossier racine).
