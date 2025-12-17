Outil **CLI multiplateforme (Windows / Linux)** destiné aux équipes IT de **NordTransit Logistics (NTL)**.  
NTL-SysToolbox permet d’industrialiser les contrôles d’exploitation, de sécuriser les sauvegardes logiques de la base WMS et de produire un audit d’obsolescence exploitable.

Projet réalisé dans le cadre d’une **MSPR (Bloc E6.1)**.

---

## Objectifs du projet

- Fournir **un seul outil CLI** (sans interface graphique)
- Utilisable par un **technicien / administrateur**
- Fonctionnel sous **Windows Server** et **Linux (Ubuntu)**
- Exploitable en **supervision** (codes retour, JSON)

L’outil est découpé en **3 modules indépendants** :

1. Diagnostic  
2. Sauvegarde WMS  
3. Audit d’obsolescence  

---

## Fonctionnalités principales

### 1. Module Diagnostic
Vérifie l’état des briques critiques d’un serveur.

Fonctionnalités :
- Vérification des services **AD / DNS**
- Test de connectivité **MySQL**
- Informations système :
  - Version OS
  - Uptime
  - CPU / RAM / Disques
- Compatible **Windows Server** et **Ubuntu**

Sorties :
- Résumé humain `OK / WARN / CRIT`
- Fichier **JSON horodaté**
- Code retour supervision

---

### 2. Module Sauvegarde WMS
Garantit la traçabilité et l’intégrité des sauvegardes logiques.

Fonctionnalités :
- Dump complet de la base **MySQL** au format SQL
- Export d’une table au format CSV

Sorties :
- Fichier SQL horodaté
- Fichier CSV horodaté
- Logs console + JSON
- Code retour supervision

---

### 3. Module Audit d’obsolescence
Produit un inventaire minimal et qualifie le statut de support des systèmes.

Fonctionnalités :
- Scan d’une **plage réseau**
- Tentative de détection de l’OS
- Analyse des versions et statuts **EOL**
- Lecture d’un inventaire CSV
- Classement :
  - Non supporté (EOL)
  - Bientôt obsolète
  - Supporté

Sorties :
- Rapport exploitable (document généré)
- Fichier JSON horodaté
- Code retour supervision

---

## Menu interactif

L’outil se lance via un **menu CLI interactif** permettant :
- Le choix du module
- La saisie guidée des paramètres
- Une exécution sécurisée sans erreur de syntaxe

---

## Installation

### Prérequis
- Windows ou Linux
- Python **≥ 3.10** *(si distribution Python)*
- Accès réseau aux équipements ciblés
- Droits suffisants pour les contrôles système
