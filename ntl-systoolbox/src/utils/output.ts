import * as fs from "fs";
import * as path from "path";
import chalk from "chalk";
import { OutputResult, Status, ExitCode } from "../types";
import { loadConfig } from "./config";
import { getLogger } from "./logger";

export function generateTimestamp(): string {
  return new Date().toISOString();
}

export function writeJsonOutput(result: OutputResult): void {
  const config = loadConfig();
  const jsonDir = config.output.json_path;
  
  if (!fs.existsSync(jsonDir)) {
    fs.mkdirSync(jsonDir, { recursive: true });
  }
  
  const filename = `${result.module}_${result.timestamp.replace(/[:.]/g, "-")}.json`;
  const filepath = path.join(jsonDir, filename);
  
  fs.writeFileSync(filepath, JSON.stringify(result, null, 2));
  getLogger().info(`JSON output written: ${filepath}`);
}

export function printHumanOutput(result: OutputResult): void {
  console.log("\n" + chalk.bold("═".repeat(60)));
  console.log(chalk.bold(`  Module: ${result.module}`));
  console.log(chalk.bold("═".repeat(60)));
  console.log(chalk.gray(`  Timestamp: ${result.timestamp}`));
  
  const statusColor = result.status === Status.OK ? chalk.green :
                     result.status === Status.WARN ? chalk.yellow :
                     chalk.red;
  
  console.log(statusColor(`  Status: ${result.status}`));
  console.log(`  Summary: ${result.summary}`);
  
  if (result.anomalies && result.anomalies.length > 0) {
    console.log(chalk.yellow("\n  Anomalies:"));
    result.anomalies.forEach(anomaly => {
      console.log(chalk.yellow(`    - ${anomaly}`));
    });
  }
  
  console.log(chalk.bold("─".repeat(60)));
  
  if (result.details) {
    console.log(chalk.bold("  Details:"));
    console.log(JSON.stringify(result.details, null, 2).split("\n").map(line => `    ${line}`).join("\n"));
  }
  
  console.log(chalk.bold("═".repeat(60)) + "\n");
}

export function determineExitCode(status: Status): ExitCode {
  switch (status) {
    case Status.OK:
      return ExitCode.SUCCESS;
    case Status.WARN:
      return ExitCode.WARNING;
    case Status.CRIT:
      return ExitCode.CRITICAL;
  }
}

export function determineOverallStatus(statuses: Status[]): Status {
  if (statuses.includes(Status.CRIT)) return Status.CRIT;
  if (statuses.includes(Status.WARN)) return Status.WARN;
  return Status.OK;
}
