"""Module Diagnostic - Vérifications AD/DNS/MySQL/OS"""

import subprocess
import platform
from typing import Dict, Any
import pymysql

from ntlsystoolbox.utils.output import (
    display_result, save_json_report, aggregate_status, status_to_exitcode
)


def check_ad_dns(config: Dict[str, Any]) -> int:
    """Vérifie la disponibilité des contrôleurs AD et serveurs DNS"""
    anomalies = []
    details = {}
    statuses = []
    
    domain_controllers = config.get("ad", {}).get("domain_controllers", [])
    dns_servers = config.get("dns", {}).get("servers", [])
    
    for dc in domain_controllers:
        if not dc:
            continue
        try:
            result = subprocess.run(
                ["ping", "-n" if platform.system() == "Windows" else "-c", "1", dc],
                capture_output=True,
                timeout=5
            )
            if result.returncode == 0:
                details[f"AD_{dc}"] = "OK"
                statuses.append("OK")
            else:
                details[f"AD_{dc}"] = "UNREACHABLE"
                anomalies.append(f"Contrôleur AD {dc} injoignable")
                statuses.append("CRIT")
        except Exception as e:
            details[f"AD_{dc}"] = f"ERROR: {e}"
            anomalies.append(f"Erreur AD {dc}: {e}")
            statuses.append("CRIT")
    
    for dns in dns_servers:
        if not dns:
            continue
        try:
            result = subprocess.run(
                ["nslookup", "google.com", dns] if platform.system() == "Windows" 
                else ["dig", "@" + dns, "google.com"],
                capture_output=True,
                timeout=5
            )
            if result.returncode == 0:
                details[f"DNS_{dns}"] = "OK"
                statuses.append("OK")
            else:
                details[f"DNS_{dns}"] = "FAIL"
                anomalies.append(f"Serveur DNS {dns} ne répond pas")
                statuses.append("WARN")
        except Exception as e:
            details[f"DNS_{dns}"] = f"ERROR: {e}"
            anomalies.append(f"Erreur DNS {dns}: {e}")
            statuses.append("WARN")
    
    status = aggregate_status(statuses) if statuses else "OK"
    summary = f"Vérifications AD/DNS: {len([s for s in statuses if s == 'OK'])}/{len(statuses)} OK"
    
    display_result("diagnostic_ad_dns", status, summary, details, anomalies)
    save_json_report("diagnostic_ad_dns", status, summary, details, anomalies, 
                     config.get("reports", {}).get("path", "./reports"))
    
    return status_to_exitcode(status)


def check_mysql(config: Dict[str, Any]) -> int:
    """Teste la connexion et l'état de la base MySQL"""
    anomalies = []
    details = {}
    
    mysql_cfg = config.get("mysql", {})
    
    try:
        conn = pymysql.connect(
            host=mysql_cfg.get("host", "localhost"),
            port=mysql_cfg.get("port", 3306),
            user=mysql_cfg.get("user", "root"),
            password=mysql_cfg.get("password", ""),
            database=mysql_cfg.get("database", "wms"),
            connect_timeout=10
        )
        
        cursor = conn.cursor()
        
        cursor.execute("SELECT VERSION()")
        version = cursor.fetchone()[0]
        details["version"] = version
        
        cursor.execute("SHOW DATABASES")
        databases = [row[0] for row in cursor.fetchall()]
        details["databases_count"] = len(databases)
        details["databases"] = databases
        
        cursor.close()
        conn.close()
        
        status = "OK"
        summary = f"MySQL {mysql_cfg.get('host')} accessible, version {version}"
        
    except Exception as e:
        status = "CRIT"
        summary = f"Erreur connexion MySQL: {e}"
        anomalies.append(str(e))
        details["error"] = str(e)
    
    display_result("diagnostic_mysql", status, summary, details, anomalies)
    save_json_report("diagnostic_mysql", status, summary, details, anomalies,
                     config.get("reports", {}).get("path", "./reports"))
    
    return status_to_exitcode(status)


def check_windows_server(hostname: str, config: Dict[str, Any]) -> int:
    """Diagnostic d'un serveur Windows"""
    anomalies = []
    details = {"hostname": hostname}
    statuses = []
    
    try:
        result = subprocess.run(["systeminfo"], capture_output=True, text=True, timeout=30)
        output = result.stdout
        
        for line in output.split("\n"):
            if "OS Name" in line:
                details["os_name"] = line.split(":", 1)[1].strip()
            elif "OS Version" in line:
                details["os_version"] = line.split(":", 1)[1].strip()
            elif "System Up Time" in line:
                details["uptime"] = line.split(":", 1)[1].strip()
        
        statuses.append("OK")
        
    except Exception as e:
        anomalies.append(f"Erreur systeminfo: {e}")
        details["systeminfo_error"] = str(e)
        statuses.append("WARN")
    
    try:
        result = subprocess.run(
            ["wmic", "cpu", "get", "loadpercentage"],
            capture_output=True, text=True, timeout=10
        )
        cpu_lines = [l.strip() for l in result.stdout.split("\n") if l.strip().isdigit()]
        if cpu_lines:
            cpu_usage = int(cpu_lines[0])
            details["cpu_usage_percent"] = cpu_usage
            if cpu_usage > 90:
                anomalies.append(f"CPU élevé: {cpu_usage}%")
                statuses.append("WARN")
            else:
                statuses.append("OK")
    except Exception as e:
        details["cpu_error"] = str(e)
        statuses.append("WARN")
    
    status = aggregate_status(statuses)
    summary = f"Diagnostic Windows {hostname}: {details.get('os_name', 'N/A')}"
    
    display_result("diagnostic_windows", status, summary, details, anomalies)
    save_json_report("diagnostic_windows", status, summary, details, anomalies,
                     config.get("reports", {}).get("path", "./reports"))
    
    return status_to_exitcode(status)


def check_linux_server(hostname: str, config: Dict[str, Any]) -> int:
    """Diagnostic d'un serveur Linux"""
    anomalies = []
    details = {"hostname": hostname}
    statuses = []
    
    try:
        with open("/etc/os-release", "r") as f:
            for line in f:
                if line.startswith("PRETTY_NAME"):
                    details["os_name"] = line.split("=")[1].strip().strip('"')
        statuses.append("OK")
    except Exception as e:
        details["os_error"] = str(e)
        statuses.append("WARN")
    
    try:
        result = subprocess.run(["uptime"], capture_output=True, text=True, timeout=5)
        details["uptime"] = result.stdout.strip()
        statuses.append("OK")
    except Exception as e:
        details["uptime_error"] = str(e)
        statuses.append("WARN")
    
    try:
        result = subprocess.run(
            ["top", "-bn1"], capture_output=True, text=True, timeout=5
        )
        for line in result.stdout.split("\n"):
            if "Cpu(s)" in line:
                details["cpu_info"] = line.strip()
                break
        statuses.append("OK")
    except Exception as e:
        details["cpu_error"] = str(e)
        statuses.append("WARN")
    
    status = aggregate_status(statuses)
    summary = f"Diagnostic Linux {hostname}: {details.get('os_name', 'N/A')}"
    
    display_result("diagnostic_linux", status, summary, details, anomalies)
    save_json_report("diagnostic_linux", status, summary, details, anomalies,
                     config.get("reports", {}).get("path", "./reports"))
    
    return status_to_exitcode(status)
