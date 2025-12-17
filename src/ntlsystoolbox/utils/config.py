"""Gestion de la configuration (YAML + variables d'environnement)"""

import os
import yaml
from pathlib import Path
from typing import Dict, Any
from dotenv import load_dotenv


def load_config() -> Dict[str, Any]:
    """
    Charge la configuration depuis config.yml et surcharge avec .env
    
    Returns:
        Dictionnaire de configuration complet
    """
    load_dotenv()
    
    config_path = Path(__file__).parent.parent / "config" / "config.yml"
    
    if not config_path.exists():
        config_path = Path("config") / "config.yml"
    
    if config_path.exists():
        with open(config_path, "r", encoding="utf-8") as f:
            config = yaml.safe_load(f) or {}
    else:
        config = {}
    
    config.setdefault("mysql", {})
    config["mysql"]["host"] = os.getenv("MYSQL_HOST", config.get("mysql", {}).get("host", "localhost"))
    config["mysql"]["port"] = int(os.getenv("MYSQL_PORT", config.get("mysql", {}).get("port", 3306)))
    config["mysql"]["user"] = os.getenv("MYSQL_USER", config.get("mysql", {}).get("user", "root"))
    config["mysql"]["password"] = os.getenv("MYSQL_PASSWORD", config.get("mysql", {}).get("password", ""))
    config["mysql"]["database"] = os.getenv("MYSQL_DATABASE", config.get("mysql", {}).get("database", "wms"))
    
    config.setdefault("ad", {})
    config["ad"]["domain_controllers"] = os.getenv("AD_DOMAIN_CONTROLLERS", 
                                                    config.get("ad", {}).get("domain_controllers", "")).split(",")
    
    config.setdefault("dns", {})
    config["dns"]["servers"] = os.getenv("DNS_SERVERS", 
                                         config.get("dns", {}).get("servers", "")).split(",")
    
    config.setdefault("backup", {})
    config["backup"]["path"] = os.getenv("BACKUP_PATH", config.get("backup", {}).get("path", "./backups"))
    
    config.setdefault("reports", {})
    config["reports"]["path"] = os.getenv("REPORTS_PATH", config.get("reports", {}).get("path", "./reports"))
    
    config.setdefault("audit", {})
    config["audit"]["eol_api"] = os.getenv("EOL_API_URL", 
                                           config.get("audit", {}).get("eol_api", "https://endoflife.date/api"))
    
    return config
