import winston from "winston";
import * as fs from "fs";
import * as path from "path";
import { loadConfig } from "./config";

let logger: winston.Logger;

export function initLogger(): winston.Logger {
  if (logger) return logger;
  
  const config = loadConfig();
  const logDir = config.output.log_path;
  
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  
  const transports: winston.transport[] = [];
  
  if (config.logging.console) {
    transports.push(
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
      })
    );
  }
  
  if (config.logging.file) {
    transports.push(
      new winston.transports.File({
        filename: path.join(logDir, "ntl-systoolbox.log"),
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        )
      })
    );
  }
  
  logger = winston.createLogger({
    level: config.logging.level || "info",
    transports
  });
  
  return logger;
}

export function getLogger(): winston.Logger {
  if (!logger) {
    return initLogger();
  }
  return logger;
}
