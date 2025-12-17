# Manuel d'Installation et d'Utilisation
## NTL-SysToolbox v1.0

**NordTransit Logistics - System Toolbox CLI**

---

## 1. Prérequis

### Systèmes supportés
- **Windows**: Windows 10, Windows Server 2016+
- **Linux**: Ubuntu 18.04+, Debian 10+, RHEL/CentOS 7+

### Logiciels requis
- **Node.js**: Version 18.0 ou supérieure
- **npm**: Inclus avec Node.js
- **MySQL Client** (mysqldump): Pour les sauvegardes SQL
- **Accès réseau**: Connexion internet pour l'API endoflife.date

### Droits d'accès
- Droits administrateur/sudo pour certaines opérations système
- Accès réseau aux serveurs à diagnostiquer
- Permissions lecture/écriture sur les dossiers de travail

---

## 2. Installation

### Étape 1: Récupérer le code source
```bash
git clone <url-du-depot-git>
cd ntl-systoolbox
```

### Étape 2: Installer les dépendances
```bash
npm install
```

### Étape 3: Compiler le projet
```bash
npm run build
```

### Étape 4: Configuration
1. Copier le fichier d'exemple de configuration:
```bash
cp .env.example .env
```

2. Éditer `.env` avec vos paramètres:
```env
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=votre_mot_de_passe_securise
MYSQL_DATABASE=wms
```

3. (Optionnel) Personnaliser `config/default.yml` selon vos besoins

---

## 3. Utilisation

### Lancer l'outil en mode interactif
```bash
npm start
```

### Ou utiliser le binaire compilé
```bash
node dist/index.js
```

### Menu principal
L'outil affiche un menu interactif:
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

---

## 4. Modules disponibles

### Module 1: Diagnostic
Vérifie l'état des composants critiques.

**Options:**
- Vérifier AD/DNS (contrôleurs de domaine)
- Tester la base MySQL WMS
- État système Windows Server
- État système Ubuntu/Linux

**Exemple de sortie:**
```
✓ Diagnostic terminé
Status: OK
Résumé: 5 contrôles effectués, tous OK
```

### Module 2: Sauvegarde WMS
Effectue des sauvegardes de la base de données.

**Options:**
- Dump SQL complet de la base
- Export CSV d'une table

**Exemple de sortie:**
```
✓ Dump SQL créé: ./backups/wms_dump_2025-12-17T10-30-00.sql
  Taille: 45.2 MB
  Durée: 8.5s
```

### Module 3: Audit d'obsolescence
Analyse l'obsolescence des systèmes.

**Options:**
- Scanner une plage réseau
- Lister les versions EOL d'un OS
- Analyser un fichier CSV d'inventaire

**Exemple de sortie:**
```
✓ Rapport HTML généré: ./reports/audit_network_scan_2025-12-17.html
Status: CRIT
3 composants EOL détectés
```

---

## 5. Artefacts produits

### Logs
- **Emplacement**: `./logs/ntl-systoolbox.log`
- **Format**: JSON structuré avec timestamps

### Rapports JSON
- **Emplacement**: `./reports/json/`
- **Nommage**: `{module}_{timestamp}.json`
- **Contenu**: Résultats structurés horodatés

### Rapports HTML
- **Emplacement**: `./reports/`
- **Types**: Rapports d'audit EOL avec tableaux et statuts

### Sauvegardes
- **Emplacement**: `./backups/`
- **Types**: Fichiers SQL et CSV horodatés

---

## 6. Codes de retour

L'outil renvoie des codes de retour exploitables par les outils de supervision:

| Code | Statut   | Signification                           |
|------|----------|-----------------------------------------|
| 0    | SUCCESS  | Opération réussie sans anomalie         |
| 1    | WARNING  | Opération réussie avec avertissements   |
| 2    | CRITICAL | Échec critique ou erreurs majeures      |

**Exemple d'utilisation en script:**
```bash
npm start
EXIT_CODE=$?
if [ $EXIT_CODE -eq 0 ]; then
  echo "Succès"
elif [ $EXIT_CODE -eq 1 ]; then
  echo "Avertissement"
else
  echo "Erreur critique"
fi
```

---

## 7. Dépannage

### Problème: Connexion MySQL échoue
**Solution**: Vérifier les paramètres dans `.env` et tester:
```bash
mysql -h localhost -u root -p
```

### Problème: Commandes système échouent
**Solution**: Exécuter avec droits administrateur:
- Windows: Lancer PowerShell en tant qu'administrateur
- Linux: Utiliser `sudo npm start`

### Problème: API EOL ne répond pas
**Solution**: Vérifier la connexion internet et les proxies

---

## 8. Support

Pour toute question ou problème:
- Consulter les logs: `./logs/ntl-systoolbox.log`
- Examiner les rapports JSON: `./reports/json/`
- Contacter la DSI NordTransit Logistics

---

## 9. Maintenance

### Mise à jour des dépendances
```bash
npm update
npm audit fix
```

### Nettoyage des artefacts
```bash
# Logs anciens
rm -rf ./logs/*

# Rapports anciens
rm -rf ./reports/*

# Sauvegardes anciennes
rm -rf ./backups/*
```

---

**Version**: 1.0  
**Date**: 2025-12-17  
**Auteur**: NordTransit Logistics DSI
