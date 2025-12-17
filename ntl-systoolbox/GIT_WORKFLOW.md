# Workflow Git et Conventions
## NTL-SysToolbox v1.0

---

## 1. Structure de Branches

### Branches Principales

**main** (production)
- Code stable, prêt pour déploiement
- Tags de version (v1.0.0, v1.1.0, etc.)
- Protégée: Merge uniquement via Pull Requests

**develop** (développement)
- Intégration continue des fonctionnalités
- Base pour nouvelles branches de feature
- Tests CI/CD passent avant merge

### Branches de Travail

**feature/{nom-feature}**
- Nouvelles fonctionnalités
- Exemple: `feature/remote-diagnostics`, `feature/pdf-reports`

**fix/{nom-bug}**
- Corrections de bugs
- Exemple: `fix/mysql-connection-timeout`, `fix/eol-api-parsing`

**hotfix/{nom-hotfix}**
- Corrections critiques en production
- Merge direct vers `main` ET `develop`
- Exemple: `hotfix/security-credentials-leak`

---

## 2. Conventions de Commits

### Format Standard

```
<type>(<scope>): <description courte>

<description détaillée optionnelle>

<footer optionnel>
```

### Types de Commits

| Type       | Description                                    | Exemple                                      |
|------------|------------------------------------------------|----------------------------------------------|
| `feat`     | Nouvelle fonctionnalité                        | `feat(audit): add PDF report generation`     |
| `fix`      | Correction de bug                              | `fix(backup): handle empty table gracefully` |
| `docs`     | Modification documentation                     | `docs(readme): update installation steps`    |
| `style`    | Formatage code (sans changement fonctionnel)   | `style(diagnostic): apply prettier format`   |
| `refactor` | Refactoring code                               | `refactor(config): simplify env var loading` |
| `test`     | Ajout ou modification tests                    | `test(output): add unit tests for exitCode`  |
| `chore`    | Tâches maintenance (deps, build, etc.)         | `chore(deps): update inquirer to 9.2.13`     |
| `perf`     | Amélioration performance                       | `perf(audit): cache EOL API responses`       |

### Exemples de Commits

```bash
# Feature
git commit -m "feat(diagnostic): add Windows remote diagnostics via WinRM"

# Fix
git commit -m "fix(backup): resolve mysqldump PATH issue on Windows"

# Documentation
git commit -m "docs(technical): add compromises section for API EOL dependency"

# Refactor
git commit -m "refactor(modules): extract common spinner logic to utils"

# Test
git commit -m "test(integration): add end-to-end test for CSV analysis"
```

---

## 3. Workflow de Développement

### Créer une Nouvelle Feature

```bash
# 1. Se placer sur develop
git checkout develop
git pull origin develop

# 2. Créer une branche feature
git checkout -b feature/remote-ssh-diagnostics

# 3. Développer et commiter régulièrement
git add src/modules/diagnostic.ts
git commit -m "feat(diagnostic): add SSH connection for remote Linux"

# 4. Pousser la branche
git push -u origin feature/remote-ssh-diagnostics

# 5. Créer une Pull Request vers develop
# (via interface GitLab/GitHub)
```

### Workflow Complet

```
develop ──┬─► feature/A ──┐
          │                ├─► merge to develop
          ├─► feature/B ──┘
          │
          └─► (tests pass) ─► merge to main ─► tag v1.1.0
```

---

## 4. Gestion des Versions (Tags)

### Format de Version (Semantic Versioning)

**v{MAJOR}.{MINOR}.{PATCH}**

- **MAJOR**: Changements incompatibles API (breaking changes)
- **MINOR**: Nouvelles fonctionnalités (backward compatible)
- **PATCH**: Corrections bugs (backward compatible)

### Créer un Tag de Release

```bash
# 1. Se placer sur main
git checkout main
git pull origin main

# 2. Créer le tag annoté
git tag -a v1.0.0 -m "Release v1.0.0: Initial production release"

# 3. Pousser le tag
git push origin v1.0.0

# 4. Ou pousser tous les tags
git push --tags
```

### Exemples de Versions

| Version | Description                                        |
|---------|----------------------------------------------------|
| v1.0.0  | Release initiale production                        |
| v1.1.0  | Ajout diagnostics distants (WinRM/SSH)             |
| v1.1.1  | Fix bug connexion MySQL timeout                    |
| v1.2.0  | Ajout export PDF rapports + cache EOL API          |
| v2.0.0  | Refonte architecture modules (breaking change)     |

---

## 5. Pull Requests (PR)

### Checklist PR

Avant de soumettre une Pull Request, vérifier:

- [ ] Code compile sans erreur (`npm run build`)
- [ ] Tests passent (`npm test`)
- [ ] Linter OK (`npm run lint`)
- [ ] Documentation à jour (README, DOSSIER_TECHNIQUE)
- [ ] Commits suivent les conventions
- [ ] Pas de secrets ou credentials hardcodés
- [ ] Branch à jour avec develop (`git rebase develop`)

### Template de Description PR

```markdown
## Description
Brève description des changements apportés.

## Type de changement
- [ ] Nouvelle fonctionnalité (feature)
- [ ] Correction de bug (fix)
- [ ] Documentation
- [ ] Refactoring

## Tests effectués
- [ ] Tests unitaires ajoutés/modifiés
- [ ] Tests d'intégration ajoutés/modifiés
- [ ] Tests manuels effectués (décrire)

## Checklist
- [ ] Code compile sans erreur
- [ ] Tests passent
- [ ] Linter OK
- [ ] Documentation à jour

## Captures d'écran (si applicable)
```

---

## 6. Hotfixes

### Workflow Hotfix (Urgence Production)

```bash
# 1. Créer branche depuis main
git checkout main
git pull origin main
git checkout -b hotfix/critical-security-fix

# 2. Corriger le problème
git add src/utils/config.ts
git commit -m "fix(security): remove hardcoded credentials"

# 3. Tester rapidement
npm run build
npm test

# 4. Merge vers main
git checkout main
git merge hotfix/critical-security-fix

# 5. Tag de patch
git tag -a v1.0.1 -m "Hotfix v1.0.1: Critical security fix"
git push origin main --tags

# 6. Merge vers develop aussi
git checkout develop
git merge hotfix/critical-security-fix
git push origin develop

# 7. Supprimer la branche hotfix
git branch -d hotfix/critical-security-fix
git push origin --delete hotfix/critical-security-fix
```

---

## 7. .gitignore

Le fichier `.gitignore` exclut:

```gitignore
# Dependencies
node_modules/

# Compiled output
dist/

# Environment variables (secrets)
*.env
.env.local

# Configuration locale (peut contenir secrets)
config/local.yml

# Generated artifacts
backups/
reports/
logs/
coverage/

# OS files
.DS_Store
Thumbs.db
*.swp
*.bak

# IDE files
.vscode/
.idea/
*.iml
```

**IMPORTANT**: Ne **JAMAIS** committer de secrets (mots de passe, API keys, tokens)

---

## 8. CI/CD Pipeline (Recommandé)

### GitLab CI Exemple (.gitlab-ci.yml)

```yaml
stages:
  - lint
  - test
  - build
  - deploy

lint:
  stage: lint
  image: node:18
  script:
    - npm install
    - npm run lint

test:
  stage: test
  image: node:18
  script:
    - npm install
    - npm run test
  coverage: '/Lines\s*:\s*(\d+\.\d+)%/'
  artifacts:
    reports:
      junit: coverage/junit.xml

build:
  stage: build
  image: node:18
  script:
    - npm install
    - npm run build
  artifacts:
    paths:
      - dist/
      - package.json
    expire_in: 1 week

deploy:
  stage: deploy
  only:
    - main
    - tags
  script:
    - echo "Deploying to production server..."
    # Commandes déploiement spécifiques DSI
```

---

## 9. Historique Git Propre

### Bonnes Pratiques

**✅ À FAIRE**:
- Commits atomiques (une fonctionnalité/fix = un commit)
- Messages descriptifs et clairs
- Rebase avant merge pour historique linéaire
- Squash commits trivials avant PR

**❌ À ÉVITER**:
- Commits "WIP", "fix", "test" sans description
- Commits géants avec multiples changements
- Merge commits inutiles (préférer rebase)
- Force push sur branches partagées

### Nettoyer l'Historique Avant PR

```bash
# Rebase interactif pour squash/reword commits
git rebase -i develop

# Exemple:
pick abc1234 feat(audit): add CSV parsing
squash def5678 fix typo
squash ghi9012 add tests
reword jkl3456 refactor: simplify logic
```

---

## 10. Collaborateurs et Reviews

### Rôles

| Rôle          | Permissions                                  |
|---------------|----------------------------------------------|
| Maintainer    | Merge vers main, création tags               |
| Developer     | Création branches, PR vers develop           |
| Reviewer      | Review code, approbation PR                  |
| Guest         | Lecture seule                                |

### Review Code (Checklist)

**Pour le reviewer**:
- [ ] Code respecte conventions projet
- [ ] Pas de secrets ou credentials
- [ ] Tests adéquats fournis
- [ ] Documentation mise à jour
- [ ] Performance acceptable
- [ ] Sécurité: pas de failles évidentes

---

## 11. Exemples de Workflow Complets

### Exemple 1: Feature Simple

```bash
git checkout develop
git pull origin develop
git checkout -b feature/add-email-notifications

# Développement
npm run dev  # Tests locaux

git add src/modules/notifications.ts
git commit -m "feat(notifications): add email alerts on critical audit"

git push -u origin feature/add-email-notifications

# PR vers develop via interface web
# Après merge et tests OK sur develop:

git checkout main
git merge develop
git tag -a v1.2.0 -m "Release v1.2.0: Email notifications"
git push origin main --tags
```

### Exemple 2: Fix Bug Urgent

```bash
git checkout develop
git pull origin develop
git checkout -b fix/mysql-timeout

# Correction
git add src/modules/backup.ts
git commit -m "fix(backup): increase MySQL connection timeout to 30s"

npm test  # Vérifier que tests passent

git push -u origin fix/mysql-timeout

# PR vers develop → merge → patch release
```

---

**Version**: 1.0  
**Date**: 2025-12-17  
**Auteur**: NordTransit Logistics DSI
