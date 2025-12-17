import * as fs from "fs";
import * as path from "path";
import * as YAML from "yaml";
import * as dotenv from "dotenv";
import { Config } from "../types";

dotenv.config();

function interpolateEnvVars(obj: any): any {
  if (typeof obj === "string") {
    const match = obj.match(/^\$\{([^:}]+)(?::([^}]*))?\}$/);
    if (match) {
      const [, envVar, defaultValue] = match;
      return process.env[envVar] || defaultValue || "";
    }
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(interpolateEnvVars);
  }
  
  if (obj && typeof obj === "object") {
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = interpolateEnvVars(value);
    }
    return result;
  }
  
  return obj;
}

export function loadConfig(): Config {
  const configPath = process.env.NTL_CONFIG_PATH || path.join(__dirname, "../../config/default.yml");
  
  if (!fs.existsSync(configPath)) {
    throw new Error(`Configuration file not found: ${configPath}`);
  }
  
  const fileContent = fs.readFileSync(configPath, "utf8");
  const rawConfig = YAML.parse(fileContent);
  const config = interpolateEnvVars(rawConfig);
  
  if (process.env.MYSQL_HOST) config.mysql.host = process.env.MYSQL_HOST;
  if (process.env.MYSQL_PORT) config.mysql.port = parseInt(process.env.MYSQL_PORT);
  if (process.env.MYSQL_USER) config.mysql.user = process.env.MYSQL_USER;
  if (process.env.MYSQL_PASSWORD) config.mysql.password = process.env.MYSQL_PASSWORD;
  if (process.env.MYSQL_DATABASE) config.mysql.database = process.env.MYSQL_DATABASE;
  
  if (process.env.AD_DOMAIN) config.ad.domain = process.env.AD_DOMAIN;
  if (process.env.LOG_LEVEL) config.logging.level = process.env.LOG_LEVEL;
  
  return config as Config;
}
