# Dossier Technique et Fonctionnel
## NTL-SysToolbox v1.0

**NordTransit Logistics - System Toolbox CLI**

---

## 1. Choix Techniques

### 1.1 Stack Technologique

**Langage**: TypeScript + Node.js

**Justification**:
- **Portabilité native**: Fonctionne identiquement sous Windows et Linux sans recompilation
- **Écosystème riche**: Bibliothèques robustes pour CLI, MySQL, CSV, HTTP
- **Typage fort**: TypeScript garantit la fiabilité et la maintenabilité
- **Async/Await natif**: Gestion élégante des opérations asynchrones (réseau, DB, I/O)
- **Faible empreinte**: Node.js runtime léger, installation simple via npm

**Alternatives écartées**:
- **Python**: Problèmes de dépendances et de versions multiples sur Windows
- **Go**: Compilation requise, moins accessible pour maintenance DSI
- **PowerShell/Bash**: Non multiplateforme, limité pour structuration complexe

### 1.2 Bibliothèques Principales

| Bibliothèque    | Usage                                   | Justification                          |
|-----------------|-----------------------------------------|----------------------------------------|
| inquirer        | Menu interactif CLI                     | UX professionnelle, validation intégrée|
| chalk           | Colorisation console                    | Lisibilité immédiate des statuts       |
| ora             | Spinners et indicateurs de progression  | Feedback visuel temps réel             |
| mysql2          | Connexion MySQL                         | Driver officiel, support promises      |
| csv-parse/stringify | Manipulation CSV                    | Parsing robuste, RFC 4180 compliant    |
| yaml            | Configuration YAML                      | Lisibilité, commentaires, types complexes|
| winston         | Logging structuré                       | Multi-transport, JSON, rotation        |
| dotenv          | Variables d'environnement               | Standard industrie, isolation secrets  |

---

## 2. Architecture Logique

### 2.1 Structure du Projet

```
ntl-systoolbox/
├── src/
│   ├── index.ts                 # Point d'entrée, menu principal
│   ├── types/
│   │   └── index.ts             # Définitions TypeScript centralisées
│   ├── utils/
│   │   ├── config.ts            # Chargement configuration YAML + env
│   │   ├── logger.ts            # Logger Winston configuré
│   │   └── output.ts            # Formatage sorties JSON + humain
│   └── modules/
│       ├── diagnostic.ts        # Module 1: Diagnostics
│       ├── backup.ts            # Module 2: Sauvegardes WMS
│       └── audit.ts             # Module 3: Audit EOL
├── config/
│   └── default.yml              # Configuration par défaut
├── tests/
│   ├── unit/                    # Tests unitaires
│   └── integration/             # Tests d'intégration
├── docs/                        # Documentation
├── examples/                    # Fichiers exemples (CSV, etc.)
├── backups/                     # Sauvegardes générées (ignoré par Git)
├── reports/                     # Rapports générés (ignoré par Git)
└── logs/                        # Logs d'exécution (ignoré par Git)
```

### 2.2 Flux d'Exécution

```
┌─────────────┐
│  index.ts   │ ◄─── Point d'entrée
└──────┬──────┘
       │
       ├─► initLogger()         ◄─── Initialisation du logger
       │
       ├─► loadConfig()         ◄─── Chargement config YAML + env vars
       │
       └─► showMainMenu()       ◄─── Menu interactif
              │
              ├─► Diagnostic    ◄─── Module 1
              │      │
              │      ├─► checkADDNS()
              │      ├─► checkMySQL()
              │      ├─► checkWindowsServer()
              │      └─► checkLinuxServer()
              │
              ├─► Backup        ◄─── Module 2
              │      │
              │      ├─► performSQLDump()
              │      └─► performCSVExport()
              │
              └─► Audit         ◄─── Module 3
                     │
                     ├─► performNetworkScan()
                     ├─► performEOLList()
                     └─► performCSVAnalysis()
                            │
                            ├─► fetchEOLData()    ◄─── API endoflife.date
                            ├─► generateAuditReport()
                            └─► writeJsonOutput()
```

---

## 3. Modules Fonctionnels

### 3.1 Module 1: Diagnostic

**Objectif**: Vérifier l'état opérationnel des composants critiques.

**Fonctions**:

1. **checkADDNS()**
   - Ping des contrôleurs de domaine
   - Test résolution DNS via nslookup/dig
   - Statut: OK si accessible, CRIT si échec

2. **checkMySQL()**
   - Connexion MySQL avec credentials configurés
   - SELECT VERSION() pour vérifier disponibilité
   - SHOW DATABASES pour confirmer existence base WMS
   - Statut: OK si connecté, WARN si base manquante, CRIT si échec connexion

3. **checkWindowsServer(target)**
   - Commandes: `ver`, `wmic cpu`, `wmic OS`, `wmic logicaldisk`
   - Métriques: OS version, uptime, CPU%, RAM%, disques
   - Seuils: CPU>80% ou RAM>90% → WARN
   - Limitation: Diagnostic distant nécessite WinRM (non implémenté)

4. **checkLinuxServer(target)**
   - Commandes: `cat /etc/os-release`, `uptime`, `top`, `free`, `df`
   - Métriques: OS version, uptime, CPU%, RAM%, disques
   - Seuils: CPU>80% ou RAM>90% → WARN
   - Limitation: Diagnostic distant nécessite SSH (non implémenté)

**Sorties**:
- Console: Résumé coloré (vert/jaune/rouge)
- JSON: `./reports/json/diagnostic_{timestamp}.json`
- Code retour: 0/1/2 selon statut global

### 3.2 Module 2: Sauvegarde WMS

**Objectif**: Garantir la traçabilité et l'intégrité des backups logiques.

**Fonctions**:

1. **performSQLDump()**
   - Commande: `mysqldump -h {host} -u {user} -p{pass} {db} > file.sql`
   - Horodatage: `wms_dump_{ISO8601}.sql`
   - Métriques: Taille fichier (MB), durée (s)
   - Vérification: `fs.statSync()` pour confirmer création

2. **performCSVExport(tableName)**
   - Requête: `SELECT * FROM {tableName}`
   - Conversion: JSON → CSV via `csv-stringify`
   - Horodatage: `{tableName}_{ISO8601}.csv`
   - Métriques: Nombre lignes, taille fichier (KB), durée (s)
   - Gestion: Table vide → WARN (pas CRIT)

**Sorties**:
- Fichiers: `./backups/{filename}`
- Console: Chemin complet, taille, durée
- JSON: `./reports/json/backup_{timestamp}.json`
- Code retour: 0 si succès, 2 si échec critique

### 3.3 Module 3: Audit d'Obsolescence

**Objectif**: Détecter composants EOL pour planification maintenance.

**Démarche EOL**:

**Source de référence**: [endoflife.date](https://endoflife.date)
- API publique: `https://endoflife.date/api/{product}.json`
- Format: JSON avec cycles, dates release/support/eol
- Validité: **Données communautaires mises à jour en continu**
- Produits supportés: 300+ OS/logiciels (Ubuntu, Windows, Debian, MySQL, etc.)
- Date de validité: **17 décembre 2025** (dernière consultation)

**Méthode**:
1. Récupération données API via HTTPS
2. Parsing cycles et dates EOL
3. Comparaison date actuelle vs date EOL:
   - EOL < aujourd'hui → **EOL** (rouge)
   - EOL < aujourd'hui + 6 mois → **EOL Soon** (orange)
   - Sinon → **Supported** (vert)
4. Génération rapport HTML avec tableaux triés par statut

**Fonctions**:

1. **performNetworkScan(networkRange)**
   - Mode Windows: Données simulées (nmap requis pour scan réel)
   - Mode Linux: `nmap -sn {range}` puis `nmap -O {ip}` pour détection OS
   - Pour chaque host: Appel `getEOLStatus(os, version)`
   - Génération rapport HTML avec tableaux par statut

2. **performEOLList(osName)**
   - Appel API: `https://endoflife.date/api/{osName}.json`
   - Affichage console: Liste toutes versions avec dates et statut
   - Génération rapport HTML: Tableau complet des cycles

3. **performCSVAnalysis(csvPath)**
   - Parsing CSV (colonnes: ip, hostname, os, version)
   - Pour chaque ligne: Appel `getEOLStatus(os, version)`
   - Accumulation anomalies (hosts EOL)
   - Génération rapport HTML avec 3 sections (EOL / EOL Soon / Supported)

**Sorties**:
- Rapports HTML: `./reports/audit_{type}_{timestamp}.html`
- Console: Résumé coloré + anomalies
- JSON: `./reports/json/audit_{timestamp}.json`
- Code retour: 0 si aucun EOL, 1 si EOL soon, 2 si EOL détectés

**Maintenance API EOL**:
- Pas de cache local (données toujours fraîches)
- Timeout HTTP: 30s
- Fallback: Si API indisponible → statut "supported" par défaut + log warning
- Fréquence recommandée audit: Mensuel ou avant changements infrastructure

---

## 4. Configuration et Gestion des Secrets

### 4.1 Fichier de Configuration (YAML)

**Emplacement**: `config/default.yml`

**Structure**:
```yaml
ad:
  domain: "ntl.local"
  domain_controllers: ["dc01.ntl.local", "dc02.ntl.local"]
  dns_servers: ["10.0.0.10", "10.0.0.11"]

mysql:
  host: "${MYSQL_HOST:localhost}"      # ◄─ Surcharge par env var
  port: "${MYSQL_PORT:3306}"
  user: "${MYSQL_USER:root}"
  password: "${MYSQL_PASSWORD:}"
  database: "${MYSQL_DATABASE:wms}"
  backup_path: "./backups"

audit:
  network_ranges: ["10.0.0.0/24", "192.168.1.0/24"]
  eol_data_source: "https://endoflife.date/api"
  eol_data_cache_hours: 24

output:
  json_path: "./reports/json"
  report_path: "./reports"
  log_path: "./logs"

exit_codes:
  success: 0
  warning: 1
  critical: 2

logging:
  level: "info"
  console: true
  file: true
```

**Interpolation**: Syntaxe `${VAR_NAME:default_value}`
- Si `VAR_NAME` définie dans environnement → utilise sa valeur
- Sinon → utilise `default_value`

### 4.2 Variables d'Environnement

**Emplacement**: `.env` (exclu de Git via `.gitignore`)

**Exemple**:
```env
MYSQL_HOST=10.0.0.50
MYSQL_PORT=3306
MYSQL_USER=ntl_backup
MYSQL_PASSWORD=SuperSecretP@ssw0rd!
MYSQL_DATABASE=wms_prod
LOG_LEVEL=debug
```

**Chargement**: `dotenv.config()` au démarrage

**Priorité**: Env vars > Fichier YAML

### 4.3 Gestion des Secrets

**Principes**:
- ✅ **Jamais de secrets hardcodés** dans le code source
- ✅ `.env` et `config/local.yml` exclus du dépôt Git
- ✅ `.env.example` fourni comme template (sans secrets réels)
- ✅ Rotation régulière des mots de passe MySQL
- ✅ Logs: Aucun mot de passe ou secret n'est journalisé

**Recommandations DSI**:
- Stockage secrets dans coffre-fort (ex: HashiCorp Vault, Azure Key Vault)
- Injection env vars via orchestrateur (Kubernetes secrets, systemd EnvironmentFile)
- Permissions restrictives sur `.env`: `chmod 600 .env`

---

## 5. Ergonomie du Menu Interactif

### 5.1 Conception UX

**Objectifs**:
- Navigation intuitive sans formation
- Validation des entrées utilisateur
- Feedback immédiat (spinners, couleurs)
- Possibilité de retour au menu principal

**Bibliothèque**: Inquirer.js
- Listes déroulantes (arrow keys)
- Champs texte avec validation
- Confirmations oui/non

### 5.2 Flux de Navigation

```
Menu Principal
├─► Module Diagnostic
│   ├─► Choix type diagnostic (AD/DNS, MySQL, Windows, Linux)
│   ├─► Saisie paramètres (si requis: hostname/IP)
│   ├─► Exécution avec spinner
│   ├─► Affichage résultats
│   └─► Confirmation retour menu
│
├─► Module Sauvegarde
│   ├─► Choix type backup (SQL dump, CSV export)
│   ├─► Saisie paramètres (si requis: table name)
│   ├─► Exécution avec spinner
│   ├─► Affichage résultats (chemin fichier, taille)
│   └─► Confirmation retour menu
│
└─► Module Audit
    ├─► Choix type audit (Network scan, EOL list, CSV analyze)
    ├─► Saisie paramètres (range réseau, OS name, CSV path)
    ├─► Exécution avec spinner
    ├─► Affichage résultats + chemin rapport HTML
    └─► Confirmation retour menu
```

### 5.3 Validations

- **Champs requis**: `validate: (input) => input.trim().length > 0`
- **Formats réseau**: Validation CIDR (ex: `192.168.1.0/24`)
- **Chemins fichiers**: Vérification existence via `fs.existsSync()`
- **Noms tables**: Caractères alphanumériques + underscore

### 5.4 Feedback Visuel

- **Spinners**: Ora pour opérations longues (scan, backup)
- **Codes couleur**:
  - Vert: Succès, OK
  - Jaune: Warnings, à surveiller
  - Rouge: Erreurs critiques
  - Cyan: Informations, titres
  - Gris: Détails secondaires

---

## 6. Sorties Standard

### 6.1 Format Console (Humain)

**Exemple**:
```
════════════════════════════════════════════════════════════
  Module: diagnostic
════════════════════════════════════════════════════════════
  Timestamp: 2025-12-17T14:30:00.000Z
  Status: OK
  Summary: Diagnostic ad_dns completed with status OK
────────────────────────────────────────────────────────────
  Details:
    {
      "checks": [
        {
          "name": "AD Domain Controller",
          "target": "dc01.ntl.local",
          "status": "OK",
          "message": "Contrôleur de domaine dc01.ntl.local accessible"
        },
        ...
      ]
    }
════════════════════════════════════════════════════════════
```

### 6.2 Format JSON (Machine)

**Emplacement**: `./reports/json/{module}_{timestamp}.json`

**Schéma**:
```json
{
  "timestamp": "2025-12-17T14:30:00.000Z",
  "module": "diagnostic",
  "status": "OK",
  "exit_code": 0,
  "summary": "Diagnostic ad_dns completed with status OK",
  "details": {
    "checks": [
      {
        "name": "AD Domain Controller",
        "target": "dc01.ntl.local",
        "status": "OK",
        "message": "Contrôleur de domaine dc01.ntl.local accessible",
        "metrics": {}
      }
    ]
  },
  "anomalies": []
}
```

**Champs garantis**:
- `timestamp`: ISO 8601 UTC
- `module`: "diagnostic" | "backup" | "audit"
- `status`: "OK" | "WARN" | "CRIT"
- `exit_code`: 0 | 1 | 2
- `summary`: String descriptif
- `details`: Objet structuré (variable selon module)
- `anomalies`: Array de strings (vide si aucune)

### 6.3 Codes de Retour

| Code | Statut   | Condition                                  |
|------|----------|--------------------------------------------|
| 0    | SUCCESS  | Aucune anomalie, tout vert                 |
| 1    | WARNING  | Avertissements (RAM>90%, EOL dans 6 mois)  |
| 2    | CRITICAL | Erreurs bloquantes (connexion échec, EOL)  |

**Mapping**: `Status → ExitCode`
- `Status.OK` → `ExitCode.SUCCESS` (0)
- `Status.WARN` → `ExitCode.WARNING` (1)
- `Status.CRIT` → `ExitCode.CRITICAL` (2)

**Agrégation**: Si plusieurs checks:
- Au moins 1 CRIT → exit code 2
- Au moins 1 WARN (et aucun CRIT) → exit code 1
- Tous OK → exit code 0

---

## 7. Compromis et Limitations

### 7.1 Diagnostics Distants

**Limitation**: Diagnostics Windows/Linux distants non implémentés.

**Compromis**:
- **Actuel**: Diagnostics localhost uniquement
- **Raison**: WinRM (Windows) et SSH (Linux) nécessitent configuration complexe et credentials
- **Impact**: Outil doit être déployé sur chaque machine à diagnostiquer
- **Mitigation**: Orchestration via Ansible/PowerShell DSC pour déploiement multi-serveurs

**Alternative future**:
- Intégration WinRM via `node-powershell`
- SSH via `node-ssh` avec gestion clés

### 7.2 Scan Réseau Windows

**Limitation**: Scan nmap non disponible nativement sous Windows.

**Compromis**:
- **Actuel**: Mode simulation avec données exemple
- **Raison**: nmap requiert installation manuelle sous Windows
- **Impact**: Scan réseau produit données factices
- **Mitigation**: Installation nmap recommandée pour usage production

**Alternative**:
- Utiliser inventaire CSV (fonctionnel) plutôt que scan automatique

### 7.3 API EOL

**Limitation**: Dépendance API externe (endoflife.date).

**Compromis**:
- **Avantage**: Données toujours à jour, maintenance communautaire
- **Risque**: Indisponibilité API bloque audit EOL
- **Mitigation**: Fallback "supported" par défaut si API inaccessible
- **Timeout**: 30s pour éviter blocage infini

**Alternative future**:
- Cache local des données EOL (JSON statique)
- Synchronisation périodique (cron daily)

### 7.4 Sauvegardes MySQL

**Limitation**: Nécessite `mysqldump` en PATH.

**Compromis**:
- **Raison**: `mysqldump` est l'outil standard, fiable et universel
- **Impact**: Échec si mysqldump non installé
- **Mitigation**: Vérification prérequis documentée

**Alternative future**:
- Export via requêtes SQL natives (moins performant pour grosses bases)

### 7.5 Authentification MySQL

**Limitation**: Mot de passe en clair dans `.env`.

**Compromis**:
- **Raison**: Simplicité vs chiffrement
- **Sécurité**: Permissions fichier restrictives + .gitignore
- **Mitigation**: Documentation recommande coffre-fort secrets

**Alternative future**:
- Support MySQL auth plugin (Kerberos, LDAP)
- Intégration gestionnaire secrets (Vault)

---

## 8. Évolutions Futures

**Priorité Haute**:
1. Support diagnostics distants (WinRM/SSH)
2. Installation nmap automatique (Windows)
3. Cache local API EOL avec synchronisation

**Priorité Moyenne**:
4. Export PDF des rapports d'audit
5. Intégration avec outils supervision (Nagios, Zabbix)
6. Notifications email/Slack sur anomalies critiques

**Priorité Basse**:
7. Interface web (dashboard) pour historique
8. Support PostgreSQL et Oracle
9. Compression automatique des backups

---

## 9. Tests

### 9.1 Tests Unitaires

**Emplacement**: `tests/unit/*.test.ts`

**Couverture**:
- Configuration: Chargement YAML, interpolation env vars
- Output: Formatage JSON, codes retour, agrégation statuts
- Typage: Validation interfaces TypeScript

**Exécution**:
```bash
npm run test:unit
```

### 9.2 Tests d'Intégration

**Emplacement**: `tests/integration/*.test.ts`

**Couverture**:
- Compilation TypeScript → JavaScript
- Création automatique dossiers (logs, reports, backups)
- Chargement configuration complète

**Exécution**:
```bash
npm run test:integration
```

### 9.3 Tests Manuels

**Checklist pré-livraison**:
- [ ] Menu interactif affiche correctement
- [ ] Diagnostic AD/DNS détecte ping échec
- [ ] Diagnostic MySQL se connecte et vérifie base
- [ ] Backup SQL crée fichier avec taille > 0
- [ ] Backup CSV exporte données table
- [ ] Audit EOL list Ubuntu affiche versions
- [ ] Audit CSV analysis génère rapport HTML
- [ ] JSON outputs respectent schéma
- [ ] Codes retour corrects (0/1/2)
- [ ] Logs écrits dans `./logs/ntl-systoolbox.log`

---

## 10. Déploiement

### 10.1 Packaging

**Mode standalone**:
```bash
npm run build
# Distribuer: package.json, dist/, config/, .env.example
```

**Mode global**:
```bash
npm link
ntl-systoolbox  # Utilisable partout
```

### 10.2 Intégration CI/CD

**Pipeline recommandé**:
1. `npm install`
2. `npm run lint` (vérification syntaxe)
3. `npm run test` (tests unitaires + intégration)
4. `npm run build` (compilation)
5. Archivage artefacts (dist/, docs/)

**GitLab CI exemple**:
```yaml
stages:
  - test
  - build

test:
  script:
    - npm install
    - npm run test

build:
  script:
    - npm run build
  artifacts:
    paths:
      - dist/
```

---

**Version**: 1.0  
**Date**: 2025-12-17  
**Auteur**: NordTransit Logistics DSI  
**Classification**: PROPRIETARY - Usage interne uniquement
