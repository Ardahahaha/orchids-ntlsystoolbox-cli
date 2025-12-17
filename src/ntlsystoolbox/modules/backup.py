"""Module Backup - Sauvegardes SQL et exports CSV"""

import subprocess
import csv
from datetime import datetime
from pathlib import Path
from typing import Dict, Any
import pymysql

from ntlsystoolbox.utils.output import (
    display_result, save_json_report, status_to_exitcode
)


def sql_dump(config: Dict[str, Any]) -> int:
    """Effectue un dump complet de la base MySQL"""
    anomalies = []
    details = {}
    
    mysql_cfg = config.get("mysql", {})
    backup_path = Path(config.get("backup", {}).get("path", "./backups"))
    backup_path.mkdir(parents=True, exist_ok=True)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    dump_file = backup_path / f"wms_dump_{timestamp}.sql"
    
    try:
        cmd = [
            "mysqldump",
            f"--host={mysql_cfg.get('host', 'localhost')}",
            f"--port={mysql_cfg.get('port', 3306)}",
            f"--user={mysql_cfg.get('user', 'root')}",
            f"--password={mysql_cfg.get('password', '')}",
            mysql_cfg.get("database", "wms")
        ]
        
        with open(dump_file, "w") as f:
            result = subprocess.run(cmd, stdout=f, stderr=subprocess.PIPE, timeout=300)
        
        if result.returncode == 0:
            file_size = dump_file.stat().st_size
            details["dump_file"] = str(dump_file)
            details["file_size_bytes"] = file_size
            details["file_size_mb"] = round(file_size / (1024 * 1024), 2)
            status = "OK"
            summary = f"Dump SQL réussi: {details['file_size_mb']} MB"
        else:
            status = "CRIT"
            summary = f"Échec dump SQL"
            anomalies.append(result.stderr.decode())
            details["error"] = result.stderr.decode()
            
    except Exception as e:
        status = "CRIT"
        summary = f"Erreur dump SQL: {e}"
        anomalies.append(str(e))
        details["error"] = str(e)
    
    display_result("backup_sql_dump", status, summary, details, anomalies)
    save_json_report("backup_sql_dump", status, summary, details, anomalies,
                     config.get("reports", {}).get("path", "./reports"))
    
    return status_to_exitcode(status)


def export_table_csv(table_name: str, config: Dict[str, Any]) -> int:
    """Exporte une table MySQL en CSV"""
    anomalies = []
    details = {"table": table_name}
    
    mysql_cfg = config.get("mysql", {})
    backup_path = Path(config.get("backup", {}).get("path", "./backups"))
    backup_path.mkdir(parents=True, exist_ok=True)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    csv_file = backup_path / f"{table_name}_{timestamp}.csv"
    
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
        cursor.execute(f"SELECT * FROM {table_name}")
        
        rows = cursor.fetchall()
        columns = [desc[0] for desc in cursor.description]
        
        with open(csv_file, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(columns)
            writer.writerows(rows)
        
        cursor.close()
        conn.close()
        
        file_size = csv_file.stat().st_size
        details["csv_file"] = str(csv_file)
        details["rows_exported"] = len(rows)
        details["file_size_bytes"] = file_size
        details["file_size_kb"] = round(file_size / 1024, 2)
        
        status = "OK"
        summary = f"Export CSV réussi: {len(rows)} lignes, {details['file_size_kb']} KB"
        
    except Exception as e:
        status = "CRIT"
        summary = f"Erreur export CSV: {e}"
        anomalies.append(str(e))
        details["error"] = str(e)
    
    display_result("backup_export_csv", status, summary, details, anomalies)
    save_json_report("backup_export_csv", status, summary, details, anomalies,
                     config.get("reports", {}).get("path", "./reports"))
    
    return status_to_exitcode(status)
