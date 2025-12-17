#!/usr/bin/env python3
"""
Point d'entrée CLI principal de NTL-SysToolbox
"""

import sys
import os
from typing import Optional

from ntlsystoolbox.utils.config import load_config
from ntlsystoolbox.utils.output import display_banner, display_result, ExitCode
from ntlsystoolbox.modules import diagnostic, backup, audit


def display_menu():
    """Affiche le menu principal interactif"""
    print("\n" + "=" * 60)
    print("║          NTL-SysToolbox - Menu Principal                  ║")
    print("=" * 60)
    print("\n[1] 🔍 Module Diagnostic")
    print("    ├── Vérifier AD/DNS")
    print("    ├── Tester MySQL")
    print("    ├── Diagnostic Windows Server")
    print("    └── Diagnostic Linux")
    print("\n[2] 💾 Module Sauvegarde WMS")
    print("    ├── Dump SQL complet")
    print("    └── Export table CSV")
    print("\n[3] 📊 Module Audit d'obsolescence")
    print("    ├── Scan réseau")
    print("    ├── Liste EOL d'un OS")
    print("    └── Analyse CSV d'inventaire")
    print("\n[0] ❌ Quitter")
    print("\n" + "=" * 60)


def menu_diagnostic(config: dict) -> int:
    """Sous-menu diagnostic"""
    print("\n=== MODULE DIAGNOSTIC ===")
    print("[1] Vérifier AD/DNS")
    print("[2] Tester MySQL")
    print("[3] Diagnostic Windows Server")
    print("[4] Diagnostic Linux")
    print("[0] Retour")
    
    choice = input("\nVotre choix: ").strip()
    
    if choice == "1":
        return diagnostic.check_ad_dns(config)
    elif choice == "2":
        return diagnostic.check_mysql(config)
    elif choice == "3":
        hostname = input("Hostname Windows Server: ").strip()
        return diagnostic.check_windows_server(hostname, config)
    elif choice == "4":
        hostname = input("Hostname Linux: ").strip()
        return diagnostic.check_linux_server(hostname, config)
    elif choice == "0":
        return ExitCode.SUCCESS.value
    else:
        print("❌ Choix invalide")
        return ExitCode.WARNING.value


def menu_backup(config: dict) -> int:
    """Sous-menu sauvegarde"""
    print("\n=== MODULE SAUVEGARDE WMS ===")
    print("[1] Dump SQL complet")
    print("[2] Export table CSV")
    print("[0] Retour")
    
    choice = input("\nVotre choix: ").strip()
    
    if choice == "1":
        return backup.sql_dump(config)
    elif choice == "2":
        table_name = input("Nom de la table à exporter: ").strip()
        return backup.export_table_csv(table_name, config)
    elif choice == "0":
        return ExitCode.SUCCESS.value
    else:
        print("❌ Choix invalide")
        return ExitCode.WARNING.value


def menu_audit(config: dict) -> int:
    """Sous-menu audit"""
    print("\n=== MODULE AUDIT D'OBSOLESCENCE ===")
    print("[1] Scan réseau (détection OS)")
    print("[2] Liste EOL d'un OS")
    print("[3] Analyse CSV d'inventaire")
    print("[0] Retour")
    
    choice = input("\nVotre choix: ").strip()
    
    if choice == "1":
        network_range = input("Plage réseau (ex: 192.168.1.0/24): ").strip()
        return audit.scan_network(network_range, config)
    elif choice == "2":
        os_name = input("Nom OS (ex: ubuntu, windows-server): ").strip()
        return audit.list_eol_versions(os_name, config)
    elif choice == "3":
        csv_path = input("Chemin fichier CSV: ").strip()
        return audit.analyze_csv_inventory(csv_path, config)
    elif choice == "0":
        return ExitCode.SUCCESS.value
    else:
        print("❌ Choix invalide")
        return ExitCode.WARNING.value


def main():
    """Fonction principale du CLI"""
    try:
        display_banner()
        
        config = load_config()
        
        while True:
            display_menu()
            choice = input("\nVotre choix: ").strip()
            
            exit_code = ExitCode.SUCCESS.value
            
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
                print("\n❌ Choix invalide, réessayez.")
                continue
            
            if exit_code != ExitCode.SUCCESS.value:
                print(f"\n⚠️  Module terminé avec code: {exit_code}")
                
    except KeyboardInterrupt:
        print("\n\n⚠️  Interruption utilisateur")
        sys.exit(ExitCode.WARNING.value)
    except Exception as e:
        print(f"\n❌ ERREUR CRITIQUE: {e}")
        sys.exit(ExitCode.CRITICAL.value)


if __name__ == "__main__":
    main()
