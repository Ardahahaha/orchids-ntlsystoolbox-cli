"""Gestion des sorties console, JSON et codes retour"""

import json
import sys
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Dict, Any, List


class ExitCode(Enum):
    """Codes de retour standard"""
    SUCCESS = 0
    WARNING = 1
    CRITICAL = 2


def display_banner():
    """Affiche la bannière du programme"""
    print("\n" + "=" * 64)
    print("║          NTL-SysToolbox - NordTransit Logistics            ║")
    print("║                  System Toolbox CLI v1.0                   ║")
    print("=" * 64)


def aggregate_status(statuses: List[str]) -> str:
    """
    Agrège plusieurs statuts en un seul (priorité: CRIT > WARN > OK)
    
    Args:
        statuses: Liste de statuts ("OK", "WARN", "CRIT")
    
    Returns:
        Statut global
    """
    if "CRIT" in statuses:
        return "CRIT"
    if "WARN" in statuses:
        return "WARN"
    return "OK"


def status_to_exitcode(status: str) -> int:
    """Convertit un statut en code retour"""
    mapping = {
        "OK": ExitCode.SUCCESS.value,
        "WARN": ExitCode.WARNING.value,
        "CRIT": ExitCode.CRITICAL.value,
    }
    return mapping.get(status, ExitCode.SUCCESS.value)


def display_result(module: str, status: str, summary: str, details: Dict[str, Any], anomalies: List[str] = None):
    """
    Affiche un résultat formaté en console
    
    Args:
        module: Nom du module
        status: Statut global (OK/WARN/CRIT)
        summary: Résumé lisible
        details: Détails techniques
        anomalies: Liste des anomalies détectées
    """
    status_icons = {
        "OK": "✅",
        "WARN": "⚠️ ",
        "CRIT": "❌",
    }
    
    print("\n" + "=" * 64)
    print(f"  Module: {module}")
    print(f"  Status: {status_icons.get(status, '❓')} {status}")
    print(f"  Summary: {summary}")
    
    if anomalies:
        print(f"  Anomalies:")
        for anomaly in anomalies:
            print(f"    - {anomaly}")
    
    if details:
        print(f"  Details:")
        for key, value in details.items():
            print(f"    {key}: {value}")
    
    print("=" * 64 + "\n")


def save_json_report(module: str, status: str, summary: str, details: Dict[str, Any], 
                     anomalies: List[str], reports_path: str = "./reports") -> str:
    """
    Sauvegarde un rapport au format JSON horodaté
    
    Args:
        module: Nom du module
        status: Statut global
        summary: Résumé
        details: Détails
        anomalies: Liste anomalies
        reports_path: Chemin du dossier de rapports
    
    Returns:
        Chemin du fichier JSON créé
    """
    Path(reports_path).mkdir(parents=True, exist_ok=True)
    
    timestamp = datetime.now().isoformat()
    filename = f"{module}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    filepath = Path(reports_path) / filename
    
    report = {
        "timestamp": timestamp,
        "module": module,
        "status": status,
        "exit_code": status_to_exitcode(status),
        "summary": summary,
        "details": details,
        "anomalies": anomalies or []
    }
    
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)
    
    print(f"📄 Rapport JSON sauvegardé: {filepath}")
    return str(filepath)
