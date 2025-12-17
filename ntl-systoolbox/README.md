# NTL-SysToolbox v1.0

**NordTransit Logistics - System Toolbox CLI**

Outil en ligne de commande professionnel pour l'industrialisation des vérifications d'exploitation, la sauvegarde logique de bases de données, et l'audit d'obsolescence des systèmes.

---

## 🎯 Objectif

NTL-SysToolbox est un outil CLI multiplateforme (Windows/Linux) conçu pour la DSI de NordTransit Logistics permettant de:

1. **Diagnostiquer** l'état des composants critiques (AD/DNS, MySQL, serveurs Windows/Linux)
2. **Sauvegarder** la base de données WMS (dumps SQL, exports CSV)
3. **Auditer** l'obsolescence des systèmes avec détection automatique des composants EOL

---

## ✨ Fonctionnalités

### Module 1: Diagnostic
- ✅ Vérification contrôleurs de domaine AD et serveurs DNS
- ✅ Test de connexion et intégrité base MySQL
- ✅ État système Windows Server (OS, CPU, RAM, disques)
- ✅ État système Ubuntu/Linux (OS, CPU, RAM, disques)

### Module 2: Sauvegarde WMS
- ✅ Dump SQL complet horodaté de la base de données
- ✅ Export CSV horodaté de tables spécifiques
- ✅ Traçabilité complète (fichier, taille, durée, statut)

### Module 3: Audit d'Obsolescence
- ✅ Scan réseau et détection OS automatique
- ✅ Consultation API endoflife.date pour statuts EOL
- ✅ Analyse fichiers CSV d'inventaire
- ✅ Rapports HTML professionnels avec classification (EOL/EOL Soon/Supported)

---

## 📋 Prérequis

- **Node.js**: ≥ 18.0
- **MySQL Client** (mysqldump) pour sauvegardes
- **Droits**: Administrateur pour diagnostics système
- **Réseau**: Accès internet pour API endoflife.date

---

## 🚀 Installation Rapide

```bash
# 1. Cloner le dépôt
git clone <url-depot-git>
cd ntl-systoolbox

# 2. Installer les dépendances
npm install

# 3. Compiler le projet
npm run build

# 4. Configurer (copier .env.example vers .env et éditer)
cp .env.example .env

# 5. Lancer l'outil
npm start
```

---

## 📖 Documentation

- **[Manuel d'Installation et d'Utilisation](docs/MANUEL_INSTALLATION.md)**: Guide complet pour DSI
- **[Dossier Technique et Fonctionnel](docs/DOSSIER_TECHNIQUE.md)**: Architecture, choix techniques, compromis

---

## 🎨 Captures d'Écran

### Menu Principal
```
╔════════════════════════════════════════════════════════════╗
║          NTL-SysToolbox - NordTransit Logistics            ║
║                  System Toolbox CLI v1.0                   ║
╚════════════════════════════════════════════════════════════╝

? Sélectionnez un module:
  🔍 Module 1 - Diagnostic
  💾 Module 2 - Sauvegarde WMS
  📊 Module 3 - Audit d'obsolescence
  ❌ Quitter
```

### Exemple de Sortie Diagnostic
```
✓ Diagnostic terminé

════════════════════════════════════════════════════════════
  Module: diagnostic
  Status: OK
  Summary: 5 contrôles effectués, tous OK
════════════════════════════════════════════════════════════
```

---

## 📁 Structure du Projet

```
ntl-systoolbox/
├── src/                     # Code source TypeScript
│   ├── index.ts             # Point d'entrée principal
│   ├── modules/             # Modules fonctionnels (diagnostic, backup, audit)
│   ├── utils/               # Utilitaires (config, logger, output)
│   └── types/               # Définitions TypeScript
├── config/                  # Configuration YAML
├── tests/                   # Tests unitaires et d'intégration
├── docs/                    # Documentation complète
├── examples/                # Fichiers exemples (CSV inventaire)
├── dist/                    # Code compilé JavaScript (généré)
├── backups/                 # Sauvegardes générées (ignoré par Git)
├── reports/                 # Rapports HTML et JSON (ignoré par Git)
└── logs/                    # Logs d'exécution (ignoré par Git)
```

---

## ⚙️ Configuration

### Fichier `.env` (secrets)
```env
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=votre_mot_de_passe
MYSQL_DATABASE=wms
```

### Fichier `config/default.yml` (paramètres)
```yaml
ad:
  domain_controllers: ["dc01.ntl.local", "dc02.ntl.local"]
  dns_servers: ["10.0.0.10", "10.0.0.11"]

audit:
  network_ranges: ["10.0.0.0/24"]
  eol_data_source: "https://endoflife.date/api"
```

---

## 🔍 Sorties Produites

### 1. Logs
- **Emplacement**: `./logs/ntl-systoolbox.log`
- **Format**: JSON structuré avec timestamps

### 2. Rapports JSON (Machine-readable)
- **Emplacement**: `./reports/json/{module}_{timestamp}.json`
- **Schéma**: Standardisé avec `timestamp`, `status`, `exit_code`, `details`, `anomalies`

### 3. Rapports HTML (Human-readable)
- **Emplacement**: `./reports/audit_{type}_{timestamp}.html`
- **Contenu**: Tableaux triés par statut EOL avec statistiques

### 4. Sauvegardes
- **Emplacement**: `./backups/{filename}`
- **Types**: Dumps SQL, Exports CSV horodatés

---

## 📊 Codes de Retour (Supervision)

| Code | Statut   | Signification                           |
|------|----------|-----------------------------------------|
| **0** | SUCCESS  | Opération réussie sans anomalie         |
| **1** | WARNING  | Opération réussie avec avertissements   |
| **2** | CRITICAL | Échec critique ou erreurs majeures      |

**Exemple d'utilisation en script**:
```bash
npm start
EXIT_CODE=$?
if [ $EXIT_CODE -eq 0 ]; then
  echo "✓ Succès"
elif [ $EXIT_CODE -eq 1 ]; then
  echo "⚠ Avertissement"
else
  echo "✗ Erreur critique"
fi
```

---

## 🧪 Tests

### Lancer tous les tests
```bash
npm test
```

### Tests unitaires uniquement
```bash
npm run test:unit
```

### Tests d'intégration uniquement
```bash
npm run test:integration
```

---

## 🔐 Sécurité

- ✅ Aucun secret hardcodé dans le code source
- ✅ `.env` et `config/local.yml` exclus du dépôt Git
- ✅ Permissions restrictives recommandées sur `.env` (`chmod 600`)
- ✅ Logs ne contiennent aucun mot de passe

---

## 📝 Scripts NPM Disponibles

| Script            | Commande                  | Description                         |
|-------------------|---------------------------|-------------------------------------|
| `npm start`       | Lance l'outil compilé     | Mode production                     |
| `npm run dev`     | Lance avec ts-node        | Mode développement                  |
| `npm run build`   | Compile TypeScript        | Génère `dist/`                      |
| `npm test`        | Lance tous les tests      | Jest unitaires + intégration        |
| `npm run lint`    | Vérifie le code           | ESLint                              |
| `npm run format`  | Formate le code           | Prettier                            |

---

## 🌐 Source de Référence EOL

**API utilisée**: [endoflife.date](https://endoflife.date)
- Format: JSON, API REST publique
- Couverture: 300+ produits (OS, bases de données, frameworks)
- Maintenance: Communauté open source
- Date de validité: **17 décembre 2025** (dernière consultation)

**Méthode**:
1. Récupération données via `https://endoflife.date/api/{product}.json`
2. Comparaison date EOL vs date actuelle
3. Classification: EOL / EOL Soon (< 6 mois) / Supported

---

## 🚧 Limitations et Compromis

| Limitation                    | Impact                                  | Mitigation                           |
|-------------------------------|-----------------------------------------|--------------------------------------|
| Diagnostics distants          | Outil doit être local sur chaque serveur | Orchestration Ansible/PowerShell DSC |
| Scan réseau Windows (nmap)    | Données simulées si nmap absent         | Installer nmap ou utiliser CSV       |
| Dépendance API externe        | Échec si endoflife.date indisponible    | Fallback "supported" par défaut      |
| Authentification MySQL        | Mot de passe en clair dans `.env`       | Permissions 600 + coffre-fort Vault  |

---

## 📚 Références

- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [Inquirer.js Documentation](https://github.com/SBoudrias/Inquirer.js)
- [endoflife.date API](https://endoflife.date/docs/api/)

---

## 👤 Auteur

**NordTransit Logistics - DSI**

---

## 📄 Licence

PROPRIETARY - Usage interne NTL uniquement

---

## 📞 Support

Pour toute question ou problème:
- Consulter la documentation: `docs/`
- Examiner les logs: `./logs/ntl-systoolbox.log`
- Contacter la DSI NordTransit Logistics

---

**Version**: 1.0  
**Date de release**: 2025-12-17  
**Statut**: Production-ready
