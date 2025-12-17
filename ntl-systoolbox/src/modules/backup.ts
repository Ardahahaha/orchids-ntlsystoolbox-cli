import * as fs from "fs";
import * as path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import mysql from "mysql2/promise";
import { stringify } from "csv-stringify/sync";
import ora from "ora";
import chalk from "chalk";
import { Status, BackupResult, OutputResult, ExitCode } from "../types";
import { loadConfig } from "../utils/config";
import { getLogger } from "../utils/logger";
import { generateTimestamp, writeJsonOutput, printHumanOutput, determineExitCode } from "../utils/output";

const execAsync = promisify(exec);

export async function runBackup(action: string, inputs: any): Promise<void> {
  const backupResults: BackupResult[] = [];
  const anomalies: string[] = [];
  let spinner = ora("Démarrage de la sauvegarde...").start();

  try {
    const config = loadConfig();
    const backupDir = config.mysql.backup_path;

    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const startTime = Date.now();

    switch (action) {
      case "sql_dump":
        await performSQLDump(backupDir, backupResults, anomalies, spinner);
        break;
      case "csv_export":
        await performCSVExport(backupDir, inputs.tableName, backupResults, anomalies, spinner);
        break;
    }

    spinner.succeed(chalk.green("Sauvegarde terminée"));

    const statuses = backupResults.map(r => r.status);
    const overallStatus = statuses.includes(Status.CRIT) ? Status.CRIT :
                         statuses.includes(Status.WARN) ? Status.WARN : Status.OK;
    const exitCode = determineExitCode(overallStatus);

    const result: OutputResult = {
      timestamp: generateTimestamp(),
      module: "backup",
      status: overallStatus,
      exit_code: exitCode,
      summary: `Backup ${action} completed with status ${overallStatus}`,
      details: { backups: backupResults },
      anomalies: anomalies.length > 0 ? anomalies : undefined
    };

    writeJsonOutput(result);
    printHumanOutput(result);

    process.exitCode = exitCode;
  } catch (error: any) {
    spinner.fail(chalk.red("Échec de la sauvegarde"));
    throw error;
  }
}

async function performSQLDump(backupDir: string, backupResults: BackupResult[], anomalies: string[], spinner: ora.Ora): Promise<void> {
  const config = loadConfig();
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `wms_dump_${timestamp}.sql`;
  const filepath = path.join(backupDir, filename);

  spinner.text = `Création du dump SQL: ${filename}`;

  try {
    const isWindows = process.platform === "win32";
    const mysqldumpCmd = isWindows ? "mysqldump" : "mysqldump";
    
    const dumpCommand = `${mysqldumpCmd} -h ${config.mysql.host} -P ${config.mysql.port} -u ${config.mysql.user} ${config.mysql.password ? `-p${config.mysql.password}` : ""} ${config.mysql.database} > "${filepath}"`;

    const startTime = Date.now();
    
    if (isWindows) {
      await execAsync(dumpCommand, { shell: "cmd.exe" });
    } else {
      await execAsync(dumpCommand, { shell: "/bin/bash" });
    }
    
    const endTime = Date.now();
    const duration = endTime - startTime;

    const stats = fs.statSync(filepath);

    backupResults.push({
      type: "sql_dump",
      file_path: filepath,
      size_bytes: stats.size,
      duration_ms: duration,
      status: Status.OK
    });

    getLogger().info(`SQL dump created successfully: ${filepath}`, {
      size: stats.size,
      duration
    });

    console.log(chalk.green(`\n✓ Dump SQL créé: ${filepath}`));
    console.log(chalk.gray(`  Taille: ${(stats.size / 1024 / 1024).toFixed(2)} MB`));
    console.log(chalk.gray(`  Durée: ${(duration / 1000).toFixed(2)}s`));
  } catch (error: any) {
    backupResults.push({
      type: "sql_dump",
      file_path: filepath,
      size_bytes: 0,
      duration_ms: 0,
      status: Status.CRIT
    });
    anomalies.push(`SQL dump failed: ${error.message}`);
    getLogger().error("SQL dump failed", { error: error.message });
    throw new Error(`Échec du dump SQL: ${error.message}`);
  }
}

async function performCSVExport(backupDir: string, tableName: string, backupResults: BackupResult[], anomalies: string[], spinner: ora.Ora): Promise<void> {
  const config = loadConfig();
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `${tableName}_${timestamp}.csv`;
  const filepath = path.join(backupDir, filename);

  spinner.text = `Export CSV de la table: ${tableName}`;

  try {
    const startTime = Date.now();

    const connection = await mysql.createConnection({
      host: config.mysql.host,
      port: config.mysql.port,
      user: config.mysql.user,
      password: config.mysql.password,
      database: config.mysql.database
    });

    const [rows]: any = await connection.query(`SELECT * FROM ${tableName}`);
    await connection.end();

    if (rows.length === 0) {
      console.log(chalk.yellow(`\n⚠ Aucune donnée dans la table ${tableName}`));
      backupResults.push({
        type: "csv_export",
        file_path: filepath,
        size_bytes: 0,
        duration_ms: Date.now() - startTime,
        status: Status.WARN
      });
      anomalies.push(`Table ${tableName} is empty`);
      getLogger().warn(`Table ${tableName} is empty`);
      return;
    }

    const csv = stringify(rows, {
      header: true,
      columns: Object.keys(rows[0])
    });

    fs.writeFileSync(filepath, csv);

    const endTime = Date.now();
    const duration = endTime - startTime;
    const stats = fs.statSync(filepath);

    backupResults.push({
      type: "csv_export",
      file_path: filepath,
      size_bytes: stats.size,
      duration_ms: duration,
      status: Status.OK
    });

    getLogger().info(`CSV export created successfully: ${filepath}`, {
      table: tableName,
      rows: rows.length,
      size: stats.size,
      duration
    });

    console.log(chalk.green(`\n✓ Export CSV créé: ${filepath}`));
    console.log(chalk.gray(`  Table: ${tableName}`));
    console.log(chalk.gray(`  Lignes: ${rows.length}`));
    console.log(chalk.gray(`  Taille: ${(stats.size / 1024).toFixed(2)} KB`));
    console.log(chalk.gray(`  Durée: ${(duration / 1000).toFixed(2)}s`));
  } catch (error: any) {
    backupResults.push({
      type: "csv_export",
      file_path: filepath,
      size_bytes: 0,
      duration_ms: 0,
      status: Status.CRIT
    });
    anomalies.push(`CSV export failed: ${error.message}`);
    getLogger().error("CSV export failed", { error: error.message, table: tableName });
    throw new Error(`Échec de l'export CSV: ${error.message}`);
  }
}
