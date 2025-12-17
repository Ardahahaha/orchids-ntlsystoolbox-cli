"""Module Audit - Scan réseau et vérification EOL via endoflife.date"""

import csv
import subprocess
import platform
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List
import requests

from ntlsystoolbox.utils.output import (
    display_result, save_json_report, aggregate_status, status_to_exitcode
)


def scan_network(network_range: str, config: Dict[str, Any]) -> int:
    """Scan réseau pour détecter les hôtes et OS"""
    anomalies = []
    details = {"network_range": network_range}
    hosts = []
    
    try:
        if platform.system() == "Windows":
            print("⚠️  Scan nmap non disponible sur Windows, simulation...")
            hosts = [
                {"ip": "192.168.1.10", "hostname": "srv-dc01", "os": "Windows Server 2019"},
                {"ip": "192.168.1.20", "hostname": "srv-wms01", "os": "Ubuntu 20.04"},
            ]
            details["scan_mode"] = "simulated"
        else:
            result = subprocess.run(
                ["nmap", "-sn", network_range],
                capture_output=True, text=True, timeout=120
            )
            output = result.stdout
            ip_list = []
            for line in output.split("\n"):
                if "Nmap scan report for" in line:
                    ip = line.split()[-1].strip("()")
                    ip_list.append(ip)
            
            hosts = [{"ip": ip, "hostname": f"host-{ip}", "os": "Unknown"} for ip in ip_list]
            details["scan_mode"] = "nmap"
        
        details["hosts_found"] = len(hosts)
        details["hosts"] = hosts
        
        status = "OK"
        summary = f"Scan réseau: {len(hosts)} hôtes détectés"
        
    except Exception as e:
        status = "WARN"
        summary = f"Erreur scan réseau: {e}"
        anomalies.append(str(e))
        details["error"] = str(e)
    
    display_result("audit_network_scan", status, summary, details, anomalies)
    save_json_report("audit_network_scan", status, summary, details, anomalies,
                     config.get("reports", {}).get("path", "./reports"))
    
    return status_to_exitcode(status)


def list_eol_versions(os_name: str, config: Dict[str, Any]) -> int:
    """Liste toutes les versions d'un OS avec dates EOL via endoflife.date API"""
    anomalies = []
    details = {"os_name": os_name}
    
    api_base = config.get("audit", {}).get("eol_api", "https://endoflife.date/api")
    
    try:
        url = f"{api_base}/{os_name}.json"
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        
        eol_data = response.json()
        
        versions_info = []
        for version in eol_data:
            versions_info.append({
                "cycle": version.get("cycle"),
                "release_date": version.get("releaseDate"),
                "eol_date": version.get("eol"),
                "support": version.get("support"),
                "lts": version.get("lts", False)
            })
        
        details["api_source"] = "endoflife.date"
        details["api_date"] = datetime.now().strftime("%Y-%m-%d")
        details["versions_count"] = len(versions_info)
        details["versions"] = versions_info
        
        status = "OK"
        summary = f"Récupéré {len(versions_info)} versions de {os_name}"
        
        print(f"\n📋 Versions de {os_name} (source: endoflife.date):")
        for v in versions_info[:10]:
            print(f"  - {v['cycle']}: EOL {v['eol_date']}")
        
    except requests.exceptions.RequestException as e:
        status = "WARN"
        summary = f"Erreur API endoflife.date: {e}"
        anomalies.append(str(e))
        details["error"] = str(e)
    except Exception as e:
        status = "CRIT"
        summary = f"Erreur inattendue: {e}"
        anomalies.append(str(e))
        details["error"] = str(e)
    
    display_result("audit_eol_list", status, summary, details, anomalies)
    save_json_report("audit_eol_list", status, summary, details, anomalies,
                     config.get("reports", {}).get("path", "./reports"))
    
    return status_to_exitcode(status)


def analyze_csv_inventory(csv_path: str, config: Dict[str, Any]) -> int:
    """Analyse un inventaire CSV et génère un rapport EOL HTML"""
    anomalies = []
    details = {"csv_file": csv_path}
    
    api_base = config.get("audit", {}).get("eol_api", "https://endoflife.date/api")
    reports_path = Path(config.get("reports", {}).get("path", "./reports"))
    reports_path.mkdir(parents=True, exist_ok=True)
    
    inventory = []
    try:
        with open(csv_path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            inventory = list(reader)
        
        details["inventory_count"] = len(inventory)
        
    except Exception as e:
        status = "CRIT"
        summary = f"Erreur lecture CSV: {e}"
        anomalies.append(str(e))
        details["error"] = str(e)
        
        display_result("audit_csv_inventory", status, summary, details, anomalies)
        save_json_report("audit_csv_inventory", status, summary, details, anomalies, str(reports_path))
        return status_to_exitcode(status)
    
    eol_results = []
    eol_soon_results = []
    supported_results = []
    statuses = []
    
    for item in inventory:
        os_product = item.get("os", "").lower().replace(" ", "-")
        version = item.get("version", "")
        
        try:
            url = f"{api_base}/{os_product}.json"
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            
            eol_data = response.json()
            
            version_match = None
            for v in eol_data:
                if str(v.get("cycle")) == version:
                    version_match = v
                    break
            
            if version_match:
                eol_date_str = version_match.get("eol")
                if eol_date_str:
                    try:
                        eol_date = datetime.strptime(eol_date_str, "%Y-%m-%d")
                        now = datetime.now()
                        
                        if eol_date < now:
                            item["status"] = "EOL"
                            item["eol_date"] = eol_date_str
                            eol_results.append(item)
                            statuses.append("CRIT")
                        elif (eol_date - now).days < 180:
                            item["status"] = "EOL Soon (<6 mois)"
                            item["eol_date"] = eol_date_str
                            eol_soon_results.append(item)
                            statuses.append("WARN")
                        else:
                            item["status"] = "Supported"
                            item["eol_date"] = eol_date_str
                            supported_results.append(item)
                            statuses.append("OK")
                    except:
                        item["status"] = "Unknown"
                        item["eol_date"] = eol_date_str
                        supported_results.append(item)
                        statuses.append("OK")
                else:
                    item["status"] = "Supported"
                    item["eol_date"] = "N/A"
                    supported_results.append(item)
                    statuses.append("OK")
            else:
                item["status"] = "Version non trouvée"
                item["eol_date"] = "N/A"
                supported_results.append(item)
                statuses.append("WARN")
                
        except Exception as e:
            item["status"] = "Erreur API"
            item["eol_date"] = "N/A"
            item["error"] = str(e)
            supported_results.append(item)
            statuses.append("WARN")
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    html_report = reports_path / f"audit_eol_inventory_{timestamp}.html"
    
    with open(html_report, "w", encoding="utf-8") as f:
        f.write(f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Rapport Audit EOL - {datetime.now().strftime('%Y-%m-%d %H:%M')}</title>
    <style>
        body {{ font-family: Arial, sans-serif; margin: 20px; }}
        h1 {{ color: #333; }}
        table {{ border-collapse: collapse; width: 100%; margin-bottom: 30px; }}
        th, td {{ border: 1px solid #ddd; padding: 8px; text-align: left; }}
        th {{ background-color: #f2f2f2; }}
        .eol {{ background-color: #ffcccc; }}
        .eol-soon {{ background-color: #fff4cc; }}
        .supported {{ background-color: #ccffcc; }}
        .footer {{ margin-top: 30px; font-size: 12px; color: #666; }}
    </style>
</head>
<body>
    <h1>📊 Rapport Audit d'Obsolescence</h1>
    <p><strong>Date:</strong> {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
    <p><strong>Source:</strong> endoflife.date API</p>
    <p><strong>Inventaire:</strong> {len(inventory)} serveurs analysés</p>
    
    <h2>❌ Serveurs en fin de vie (EOL) - {len(eol_results)}</h2>
    <table>
        <tr><th>IP</th><th>Hostname</th><th>OS</th><th>Version</th><th>Date EOL</th></tr>
""")
        for item in eol_results:
            f.write(f"<tr class='eol'><td>{item.get('ip')}</td><td>{item.get('hostname')}</td>" +
                    f"<td>{item.get('os')}</td><td>{item.get('version')}</td><td>{item.get('eol_date')}</td></tr>\n")
        
        f.write(f"""
    </table>
    
    <h2>⚠️  Serveurs bientôt EOL (&lt;6 mois) - {len(eol_soon_results)}</h2>
    <table>
        <tr><th>IP</th><th>Hostname</th><th>OS</th><th>Version</th><th>Date EOL</th></tr>
""")
        for item in eol_soon_results:
            f.write(f"<tr class='eol-soon'><td>{item.get('ip')}</td><td>{item.get('hostname')}</td>" +
                    f"<td>{item.get('os')}</td><td>{item.get('version')}</td><td>{item.get('eol_date')}</td></tr>\n")
        
        f.write(f"""
    </table>
    
    <h2>✅ Serveurs supportés - {len(supported_results)}</h2>
    <table>
        <tr><th>IP</th><th>Hostname</th><th>OS</th><th>Version</th><th>Date EOL</th></tr>
""")
        for item in supported_results:
            f.write(f"<tr class='supported'><td>{item.get('ip')}</td><td>{item.get('hostname')}</td>" +
                    f"<td>{item.get('os')}</td><td>{item.get('version')}</td><td>{item.get('eol_date')}</td></tr>\n")
        
        f.write("""
    </table>
    
    <div class="footer">
        <p><strong>NTL-SysToolbox v1.0</strong> - NordTransit Logistics DSI</p>
        <p>Source: <a href="https://endoflife.date">endoflife.date</a> - Données communautaires</p>
    </div>
</body>
</html>
""")
    
    details["eol_count"] = len(eol_results)
    details["eol_soon_count"] = len(eol_soon_results)
    details["supported_count"] = len(supported_results)
    details["html_report"] = str(html_report)
    
    status = aggregate_status(statuses)
    summary = f"Audit terminé: {len(eol_results)} EOL, {len(eol_soon_results)} EOL Soon, {len(supported_results)} OK"
    
    if eol_results:
        anomalies.append(f"{len(eol_results)} serveurs en fin de vie détectés")
    if eol_soon_results:
        anomalies.append(f"{len(eol_soon_results)} serveurs bientôt EOL (<6 mois)")
    
    print(f"\n📄 Rapport HTML généré: {html_report}")
    
    display_result("audit_csv_inventory", status, summary, details, anomalies)
    save_json_report("audit_csv_inventory", status, summary, details, anomalies, str(reports_path))
    
    return status_to_exitcode(status)
