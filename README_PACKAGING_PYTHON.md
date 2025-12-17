# NTL-SysToolbox - Projet Python packaging complet

## 🎯 Résumé exécutif

Projet **NTL-SysToolbox** transformé en package Python professionnel, installable via `pip install ntl-systoolbox` et exécutable via la commande `ntl-systoolbox`.

---

## ✅ LIVRABLE COMPLET

### 📁 Structure Python finale

```
Racine projet/
├── src/
│   └── ntlsystoolbox/          # Package Python principal
│       ├── __init__.py         # Version + métadonnées
│       ├── cli.py              # Point d'entrée avec main()
│       ├── config/
│       │   └── config.yml      # Configuration par défaut
│       ├── modules/
│       │   ├── __init__.py
│       │   ├── diagnostic.py   # Module 1: AD/DNS/MySQL/Windows/Linux
│       │   ├── backup.py       # Module 2: SQL dump + CSV export
│       │   └── audit.py        # Module 3: Scan réseau + EOL (endoflife.date)
│       └── utils/
│           ├── __init__.py
│           ├── config.py       # Chargement YAML + variables env
│           └── output.py       # Sorties console/JSON + codes retour
├── examples/
│   └── inventory_servers.csv  # Exemple inventaire pour audit
├── pyproject.toml              # ⭐ Configuration packaging complète
├── MANIFEST.in                 # Inclusion fichiers non-Python
├── .env.example                # Template variables d'environnement
├── GUIDE_PACKAGING.md          # ⭐ Guide complet packaging
└── README_PACKAGING_PYTHON.md  # Ce fichier
```

---

## 🔧 pyproject.toml : Configuration complète

### Métadonnées

```toml
[project]
name = "ntl-systoolbox"
version = "1.0.0"
description = "Outil CLI multiplateforme pour diagnostic, sauvegarde et audit d'obsolescence"
readme = "README.md"
authors = [{name = "NordTransit Logistics DSI", email = "dsi@nordtransit.local"}]
license = {text = "Proprietary"}
requires-python = ">=3.8"
```

### Dépendances

```toml
dependencies = [
    "pyyaml>=6.0",           # Configuration YAML
    "pymysql>=1.1.0",        # Connexion MySQL
    "python-dotenv>=1.0.0",  # Variables d'environnement
    "requests>=2.31.0",      # API endoflife.date
]
```

### Point d'entrée CLI (CRITIQUE)

```toml
[project.scripts]
ntl-systoolbox = "ntlsystoolbox.cli:main"
```

**Crée automatiquement la commande `ntl-systoolbox` après installation pip.**

### Backend de build

```toml
[build-system]
requires = ["setuptools>=61.0"]
build-backend = "setuptools.build_meta"
```

**Utilise setuptools** : simple, standard, fiable, compatible Python 3.8+.

---

## 🎯 cli.py : Point d'entrée conforme

### Fonction main()

```python
#!/usr/bin/env python3
"""Point d'entrée CLI principal de NTL-SysToolbox"""

import sys
from ntlsystoolbox.utils.config import load_config
from ntlsystoolbox.utils.output import display_banner, ExitCode
from ntlsystoolbox.modules import diagnostic, backup, audit

def main():
    """Fonction principale du CLI"""
    try:
        display_banner()
        config = load_config()
        
        while True:
            display_menu()
            choice = input("\nVotre choix: ").strip()
            
            if choice == "1":
                exit_code = menu_diagnostic(config)
            elif choice == "2":
                exit_code = menu_backup(config)
            elif choice == "3":
                exit_code = menu_audit(config)
            elif choice == "0":
                print("\n👋 Au revoir!")
                sys.exit(0)
            else:
                print("\n❌ Choix invalide")
                
    except KeyboardInterrupt:
        sys.exit(ExitCode.WARNING.value)
    except Exception as e:
        print(f"\n❌ ERREUR CRITIQUE: {e}")
        sys.exit(ExitCode.CRITICAL.value)

if __name__ == "__main__":
    main()
```

### Caractéristiques conformes

✅ **Fonction `main()` présente**  
✅ **Pas de code exécuté hors main()** (sauf `if __name__`)  
✅ **Menu interactif** avec navigation clavier  
✅ **Codes retour propres** : 0 (succès), 1 (warning), 2 (critique)  
✅ **Point d'entrée vers modules métier** (diagnostic/backup/audit)

---

## 🚀 Commandes packaging (étape par étape)

### 1️⃣ Installation des outils

```bash
# Windows
py -m pip install --upgrade pip build twine

# Linux
python3 -m pip install --upgrade pip build twine
```

### 2️⃣ Génération des distributions

```bash
# Depuis la racine (où se trouve pyproject.toml)
python -m build
```

**Résultat** : Dossier `dist/` créé avec :
- `ntl-systoolbox-1.0.0.tar.gz` (source distribution)
- `ntl-systoolbox-1.0.0-py3-none-any.whl` (wheel, installable rapide)

### 3️⃣ Vérification du contenu du package

```bash
# Lister le contenu du wheel
python -m zipfile -l dist/ntl-systoolbox-1.0.0-py3-none-any.whl

# Sur Linux, vérifier le tarball
tar -tzf dist/ntl-systoolbox-1.0.0.tar.gz
```

**Vérifier la présence de** :
- `ntlsystoolbox/cli.py`
- `ntlsystoolbox/modules/diagnostic.py`, `backup.py`, `audit.py`
- `ntlsystoolbox/utils/config.py`, `output.py`
- `ntlsystoolbox/config/config.yml`

### 4️⃣ Test installation locale

```bash
# Installation
pip install dist/ntl-systoolbox-1.0.0-py3-none-any.whl

# Vérification
pip show ntl-systoolbox

# Test commande
ntl-systoolbox
```

**Résultat attendu** : Menu interactif s'affiche, navigation fonctionne.

### 5️⃣ Test dans un environnement propre (recommandé)

```bash
# Créer un virtualenv isolé
python -m venv test_env

# Activer
test_env\Scripts\activate  # Windows
source test_env/bin/activate  # Linux

# Installer
pip install dist/ntl-systoolbox-1.0.0-py3-none-any.whl

# Tester
ntl-systoolbox

# Vérifier code retour
ntl-systoolbox
echo $?  # Linux (doit retourner 0, 1 ou 2)
echo %ERRORLEVEL%  # Windows

# Désactiver
deactivate
```

### 6️⃣ Publication sur PyPI (optionnel)

```bash
# Vérifier les métadonnées
python -m twine check dist/*

# Upload sur TestPyPI (recommandé d'abord)
python -m twine upload --repository testpypi dist/*

# Test installation depuis TestPyPI
pip install --index-url https://test.pypi.org/simple/ ntl-systoolbox

# Upload sur PyPI production
python -m twine upload dist/*
```

---

## 📋 Résultat final attendu

### Installation utilisateur final

```bash
pip install ntl-systoolbox
```

### Exécution

```bash
ntl-systoolbox
```

**Sortie attendue** :

```
================================================================
║          NTL-SysToolbox - NordTransit Logistics            ║
║                  System Toolbox CLI v1.0                   ║
================================================================

============================================================
║          NTL-SysToolbox - Menu Principal                  ║
============================================================

[1] 🔍 Module Diagnostic
    ├── Vérifier AD/DNS
    ├── Tester MySQL
    ├── Diagnostic Windows Server
    └── Diagnostic Linux

[2] 💾 Module Sauvegarde WMS
    ├── Dump SQL complet
    └── Export table CSV

[3] 📊 Module Audit d'obsolescence
    ├── Scan réseau
    ├── Liste EOL d'un OS
    └── Analyse CSV d'inventaire

[0] ❌ Quitter

============================================================

Votre choix: 
```

---

## 🔍 Modules fonctionnels

### Module 1 - Diagnostic

**Fonctions** :
- Vérification AD/DNS (ping DCs + nslookup/dig)
- Test MySQL (connexion + VERSION + SHOW DATABASES)
- Diagnostic Windows Server (systeminfo, wmic CPU/RAM)
- Diagnostic Linux (/etc/os-release, uptime, top)

**Sorties** :
- Console formatée (OK/WARN/CRIT + détails)
- JSON horodaté (`reports/diagnostic_*.json`)
- Code retour 0/1/2

### Module 2 - Sauvegarde WMS

**Fonctions** :
- Dump SQL complet (`mysqldump > wms_dump_{timestamp}.sql`)
- Export table CSV (`SELECT * FROM table → CSV`)

**Sorties** :
- Fichiers horodatés dans `backups/`
- JSON horodaté (`reports/backup_*.json`)
- Code retour 0/1/2

### Module 3 - Audit d'obsolescence

**Source EOL** : **endoflife.date API** (https://endoflife.date)
- 300+ produits (Ubuntu, Windows Server, Debian, MySQL...)
- Données communautaires, mises à jour continues
- **Date de validité** : 17 décembre 2025

**Fonctions** :
- Scan réseau (nmap -sn sur Linux, simulé sur Windows)
- Liste EOL d'un OS (appel API + affichage versions + dates)
- Analyse CSV d'inventaire → rapport HTML

**Rapport HTML** :
- 3 sections : EOL (rouge) / EOL Soon <6 mois (orange) / Supported (vert)
- Source API + timestamp
- Fichier : `reports/audit_eol_inventory_{timestamp}.html`

**Sorties** :
- Rapport HTML dans `reports/`
- JSON horodaté (`reports/audit_*.json`)
- Code retour 0/1/2

---

## 🔐 Configuration

### Fichier YAML (`src/ntlsystoolbox/config/config.yml`)

```yaml
mysql:
  host: localhost
  port: 3306
  user: root
  password: ""
  database: wms

ad:
  domain_controllers: 
    - dc01.nordtransit.local

dns:
  servers:
    - 192.168.1.10

backup:
  path: ./backups

reports:
  path: ./reports

audit:
  eol_api: https://endoflife.date/api
```

### Surcharge par variables d'environnement (`.env`)

```bash
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=votre_mot_de_passe
MYSQL_DATABASE=wms

AD_DOMAIN_CONTROLLERS=dc01.local,dc02.local
DNS_SERVERS=192.168.1.10,192.168.1.11

BACKUP_PATH=./backups
REPORTS_PATH=./reports
EOL_API_URL=https://endoflife.date/api
```

**Gestion secrets** :
- Jamais hardcodés dans le code
- Fichier `.env` exclu de Git (dans `.gitignore`)
- Permissions 600 recommandées sur Linux

---

## 📤 Sorties standard

### 1. Console (humain)

```
================================================================
  Module: diagnostic_mysql
  Status: ✅ OK
  Summary: MySQL localhost accessible, version 8.0.32
  Details:
    version: 8.0.32
    databases_count: 5
    databases: ['information_schema', 'wms', 'mysql', 'performance_schema', 'sys']
================================================================
```

### 2. JSON (machine)

Fichier : `reports/diagnostic_mysql_20251217_143000.json`

```json
{
  "timestamp": "2025-12-17T14:30:00.000000",
  "module": "diagnostic_mysql",
  "status": "OK",
  "exit_code": 0,
  "summary": "MySQL localhost accessible, version 8.0.32",
  "details": {
    "version": "8.0.32",
    "databases_count": 5,
    "databases": ["information_schema", "wms", "mysql", "performance_schema", "sys"]
  },
  "anomalies": []
}
```

### 3. Codes retour (supervision)

| Code | Statut   | Condition                                  |
|------|----------|--------------------------------------------|
| **0** | SUCCESS  | Aucune anomalie                            |
| **1** | WARNING  | Avertissements non bloquants               |
| **2** | CRITICAL | Erreurs bloquantes (connexion KO, EOL...)  |

---

## ✅ Conformité cahier des charges

| Exigence | Statut | Implémentation |
|----------|--------|----------------|
| Commande CLI `ntl-systoolbox` | ✅ | `[project.scripts]` dans `pyproject.toml` |
| Fonction `main()` dans `cli.py` | ✅ | Point d'entrée vers menu interactif |
| Pas de code hors `main()` | ✅ | Tout dans fonctions, sauf `if __name__` |
| Génération `.whl` et `.tar.gz` | ✅ | `python -m build` |
| Installation via `pip install` | ✅ | Wheel compatible pip |
| Publication PyPI possible | ✅ | `twine upload` prêt |
| Structure `src/ntlsystoolbox/` | ✅ | Organisation par modules |
| Dépendances déclarées | ✅ | `dependencies` dans `pyproject.toml` |
| Configuration YAML + env vars | ✅ | `config.py` + `python-dotenv` |
| 3 modules indépendants | ✅ | `diagnostic.py`, `backup.py`, `audit.py` |
| Sorties humain + JSON + codes retour | ✅ | `output.py` + exit codes 0/1/2 |
| Menu interactif | ✅ | `cli.py` avec `input()` + navigation |
| Multiplateforme Windows/Linux | ✅ | Python natif + détection `platform.system()` |

---

## 📚 Documentation livrée

1. **`pyproject.toml`** : Configuration packaging complète
2. **`GUIDE_PACKAGING.md`** : Guide complet packaging (structure, commandes, dépannage, publication PyPI)
3. **`README_PACKAGING_PYTHON.md`** : Ce fichier (résumé exécutif)
4. **`.env.example`** : Template variables d'environnement
5. **`examples/inventory_servers.csv`** : Exemple inventaire pour audit EOL
6. **Code source Python complet** : Tous les modules fonctionnels

---

## 🎓 Commandes essentielles (résumé)

```bash
# 1. Installer outils
python -m pip install build twine

# 2. Générer distributions
python -m build

# 3. Vérifier contenu
python -m zipfile -l dist/*.whl
python -m twine check dist/*

# 4. Installer localement
pip install dist/ntl-systoolbox-1.0.0-py3-none-any.whl

# 5. Tester
ntl-systoolbox
echo $?  # Linux
echo %ERRORLEVEL%  # Windows

# 6. Publier (optionnel)
python -m twine upload --repository testpypi dist/*
python -m twine upload dist/*
```

---

## 🐛 Dépannage rapide

### ❌ "Commande ntl-systoolbox introuvable"
**Solution** : Vérifier `[project.scripts]` dans `pyproject.toml`, puis :
```bash
pip install --force-reinstall dist/*.whl
```

### ❌ "Module ntlsystoolbox not found"
**Solution** : Vérifier `[tool.setuptools.packages.find]` dans `pyproject.toml` :
```toml
[tool.setuptools.packages.find]
where = ["src"]
```

### ❌ "config.yml not found"
**Solution** : Vérifier `MANIFEST.in` et rebuild :
```bash
python -m build --no-isolation
```

---

## 🎯 Résultat final

Après `pip install ntl-systoolbox` :

```bash
$ ntl-systoolbox
```

→ Menu interactif s'affiche  
→ Navigation fonctionnelle  
→ Modules exécutables  
→ Sorties JSON + codes retour  
→ Outil pro prêt livraison DSI

---

**Version** : 1.0  
**Date** : 17 décembre 2025  
**Auteur** : NordTransit Logistics DSI  
**Classification** : PROPRIETARY - Usage interne
