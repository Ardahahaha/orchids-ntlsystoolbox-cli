# Guide Packaging Python - NTL-SysToolbox

## 📦 Structure finale du projet

```
ntl-systoolbox/
├── src/
│   └── ntlsystoolbox/
│       ├── __init__.py
│       ├── cli.py                    # Point d'entrée avec main()
│       ├── config/
│       │   └── config.yml            # Configuration par défaut
│       ├── modules/
│       │   ├── __init__.py
│       │   ├── diagnostic.py         # Module 1: AD/DNS/MySQL/OS
│       │   ├── backup.py             # Module 2: SQL dump + CSV export
│       │   └── audit.py              # Module 3: Scan réseau + EOL
│       └── utils/
│           ├── __init__.py
│           ├── config.py             # Chargement YAML + env vars
│           └── output.py             # Formatage sorties + JSON + codes retour
├── examples/
│   └── inventory_servers.csv        # Exemple inventaire
├── pyproject.toml                    # Configuration packaging
├── MANIFEST.in                       # Fichiers à inclure dans le package
├── .env.example                      # Template variables d'environnement
├── README.md                         # Documentation principale
└── GUIDE_PACKAGING.md                # Ce guide

```

---

## ✅ pyproject.toml COMPLET

Le fichier `pyproject.toml` contient toute la configuration nécessaire :

### Métadonnées du projet
- **Nom** : `ntl-systoolbox`
- **Version** : `1.0.0`
- **Description** : Outil CLI multiplateforme
- **Auteur** : NordTransit Logistics DSI
- **Python minimum** : 3.8+

### Dépendances
- `pyyaml>=6.0` : Configuration YAML
- `pymysql>=1.1.0` : Connexion MySQL
- `python-dotenv>=1.0.0` : Variables d'environnement
- `requests>=2.31.0` : API EOL endoflife.date

### Point d'entrée CLI
```toml
[project.scripts]
ntl-systoolbox = "ntlsystoolbox.cli:main"
```

Cette ligne crée automatiquement la commande `ntl-systoolbox` qui appelle `main()` dans `cli.py`.

### Backend de build
```toml
[build-system]
requires = ["setuptools>=61.0"]
build-backend = "setuptools.build_meta"
```

Utilise **setuptools** (simple, standard, fiable).

---

## 🎯 cli.py : Point d'entrée

### Fonction main()
```python
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
        print(f"\n❌ ERREUR: {e}")
        sys.exit(ExitCode.CRITICAL.value)
```

### Caractéristiques
- ✅ **Pas de code exécuté hors main()** : Tout est dans des fonctions
- ✅ **Menu interactif** : Navigation clavier, sous-menus
- ✅ **Codes retour propres** : 0 (succès), 1 (warning), 2 (critique)
- ✅ **Gestion erreurs** : try/except avec messages clairs

---

## 🚀 Commandes de packaging

### 1. Installation des outils de build

```bash
# Windows
py -m pip install --upgrade pip
py -m pip install build twine

# Linux
python3 -m pip install --upgrade pip
python3 -m pip install build twine
```

### 2. Génération des distributions

```bash
# Depuis la racine du projet (où se trouve pyproject.toml)
python -m build
```

**Résultat** : Création du dossier `dist/` avec :
- `ntl-systoolbox-1.0.0.tar.gz` (source distribution)
- `ntl-systoolbox-1.0.0-py3-none-any.whl` (wheel, installable rapide)

### 3. Vérification du contenu

```bash
# Lister le contenu du wheel
python -m zipfile -l dist/ntl-systoolbox-1.0.0-py3-none-any.whl

# Lister le contenu du tarball
tar -tzf dist/ntl-systoolbox-1.0.0.tar.gz
```

**Vérifier la présence de** :
- `ntlsystoolbox/cli.py`
- `ntlsystoolbox/modules/diagnostic.py`, `backup.py`, `audit.py`
- `ntlsystoolbox/utils/config.py`, `output.py`
- `ntlsystoolbox/config/config.yml`

---

## 🧪 Test installation locale

### Installation en mode éditable (développement)

```bash
# Depuis la racine du projet
pip install -e .
```

Permet de modifier le code sans réinstaller.

### Installation depuis le wheel

```bash
pip install dist/ntl-systoolbox-1.0.0-py3-none-any.whl
```

### Vérification

```bash
# Vérifier que le package est installé
pip show ntl-systoolbox

# Tester la commande CLI
ntl-systoolbox

# Vérifier le code retour
ntl-systoolbox
echo $?  # Linux
echo %ERRORLEVEL%  # Windows
```

### Test dans un environnement propre

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

# Désactiver
deactivate
```

---

## 🌐 Publication sur PyPI

### 1. Créer un compte PyPI
- Production : https://pypi.org/account/register/
- Test : https://test.pypi.org/account/register/

### 2. Configuration credentials

Créer `~/.pypirc` (Linux) ou `%USERPROFILE%\.pypirc` (Windows) :

```ini
[distutils]
index-servers =
    pypi
    testpypi

[pypi]
username = __token__
password = pypi-AgENdGVzdC...  # Votre token API

[testpypi]
repository = https://test.pypi.org/legacy/
username = __token__
password = pypi-AgENdGVzdC...
```

### 3. Vérification avant upload

```bash
# Vérifier les métadonnées
python -m twine check dist/*
```

**Résultat attendu** : `PASSED` pour tous les fichiers

### 4. Upload sur TestPyPI (recommandé d'abord)

```bash
python -m twine upload --repository testpypi dist/*
```

**Test d'installation** :
```bash
pip install --index-url https://test.pypi.org/simple/ ntl-systoolbox
```

### 5. Upload sur PyPI production

```bash
python -m twine upload dist/*
```

### 6. Installation finale

```bash
pip install ntl-systoolbox
```

---

## ✅ Checklist de vérification

### Avant le build
- [ ] `pyproject.toml` complet (nom, version, dépendances, scripts)
- [ ] `src/ntlsystoolbox/__init__.py` existe avec `__version__`
- [ ] `cli.py` a une fonction `main()` sans code hors fonction
- [ ] Tous les modules Python ont `__init__.py`
- [ ] `MANIFEST.in` inclut les fichiers non-Python (YAML, etc.)
- [ ] `.gitignore` exclut `dist/`, `build/`, `*.egg-info`

### Après le build
- [ ] `dist/` contient `.whl` et `.tar.gz`
- [ ] `python -m zipfile -l dist/*.whl` montre tous les fichiers
- [ ] `twine check dist/*` retourne PASSED

### Test installation
- [ ] `pip install dist/*.whl` réussit
- [ ] `pip show ntl-systoolbox` affiche les infos
- [ ] `ntl-systoolbox` lance le CLI
- [ ] Menu interactif fonctionne
- [ ] Configuration chargée correctement
- [ ] Codes retour corrects (0, 1, 2)

### Publication PyPI
- [ ] Compte PyPI créé
- [ ] Token API configuré dans `.pypirc`
- [ ] Test sur TestPyPI réussi
- [ ] Upload PyPI production réussi
- [ ] `pip install ntl-systoolbox` fonctionne

---

## 🐛 Dépannage

### Erreur : "Module ntlsystoolbox not found"
**Cause** : Structure `src/` non détectée  
**Solution** : Vérifier `[tool.setuptools.packages.find]` dans `pyproject.toml`

```toml
[tool.setuptools.packages.find]
where = ["src"]
```

### Erreur : "Commande ntl-systoolbox introuvable"
**Cause** : Point d'entrée non configuré  
**Solution** : Vérifier `[project.scripts]` dans `pyproject.toml`

```toml
[project.scripts]
ntl-systoolbox = "ntlsystoolbox.cli:main"
```

Puis réinstaller : `pip install --force-reinstall dist/*.whl`

### Erreur : "config.yml not found"
**Cause** : Fichier YAML non inclus dans le package  
**Solution** : Vérifier `MANIFEST.in` et `[tool.setuptools.package-data]`

```toml
[tool.setuptools.package-data]
ntlsystoolbox = ["config/*.yml"]
```

Puis rebuild : `python -m build --no-isolation`

### Erreur : Dépendances manquantes
**Cause** : `dependencies` dans `pyproject.toml` incomplet  
**Solution** : Ajouter toutes les libs utilisées

```toml
dependencies = [
    "pyyaml>=6.0",
    "pymysql>=1.1.0",
    "python-dotenv>=1.0.0",
    "requests>=2.31.0",
]
```

---

## 📚 Ressources

### Documentation officielle
- **Packaging Python** : https://packaging.python.org/
- **pyproject.toml** : https://peps.python.org/pep-0621/
- **setuptools** : https://setuptools.pypa.io/
- **build** : https://pypa-build.readthedocs.io/
- **twine** : https://twine.readthedocs.io/

### Bonnes pratiques
- **PEP 517** (build backend) : https://peps.python.org/pep-0517/
- **PEP 621** (métadonnées) : https://peps.python.org/pep-0621/
- **Semantic Versioning** : https://semver.org/

---

## 🎓 Workflow complet (résumé)

```bash
# 1. Structure créée
src/ntlsystoolbox/
    cli.py (avec main())
    modules/, utils/, config/

# 2. pyproject.toml configuré
[project.scripts]
ntl-systoolbox = "ntlsystoolbox.cli:main"

# 3. Build
python -m build

# 4. Vérification
python -m twine check dist/*
python -m zipfile -l dist/*.whl

# 5. Test local
pip install dist/*.whl
ntl-systoolbox
echo $?

# 6. Test environnement propre
python -m venv test_env
test_env\Scripts\activate
pip install dist/*.whl
ntl-systoolbox
deactivate

# 7. Publication TestPyPI
python -m twine upload --repository testpypi dist/*
pip install --index-url https://test.pypi.org/simple/ ntl-systoolbox

# 8. Publication PyPI
python -m twine upload dist/*

# 9. Installation finale
pip install ntl-systoolbox
ntl-systoolbox
```

---

**Version** : 1.0  
**Date** : 17 décembre 2025  
**Auteur** : NordTransit Logistics DSI  
**Classification** : PROPRIETARY - Usage interne
