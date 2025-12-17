#!/usr/bin/env node

import inquirer from "inquirer";
import chalk from "chalk";
import { initLogger, getLogger } from "./utils/logger";
import { runDiagnostic } from "./modules/diagnostic";
import { runBackup } from "./modules/backup";
import { runAudit } from "./modules/audit";

async function showMainMenu(): Promise<void> {
  console.clear();
  console.log(chalk.bold.cyan("\n╔════════════════════════════════════════════════════════════╗"));
  console.log(chalk.bold.cyan("║                                                            ║"));
  console.log(chalk.bold.cyan("║          NTL-SysToolbox - NordTransit Logistics            ║"));
  console.log(chalk.bold.cyan("║                  System Toolbox CLI v1.0                   ║"));
  console.log(chalk.bold.cyan("║                                                            ║"));
  console.log(chalk.bold.cyan("╚════════════════════════════════════════════════════════════╝\n"));

  const { action } = await inquirer.prompt([
    {
      type: "list",
      name: "action",
      message: "Sélectionnez un module :",
      choices: [
        { name: "🔍 Module 1 - Diagnostic", value: "diagnostic" },
        { name: "💾 Module 2 - Sauvegarde WMS", value: "backup" },
        { name: "📊 Module 3 - Audit d'obsolescence", value: "audit" },
        new inquirer.Separator(),
        { name: "❌ Quitter", value: "exit" }
      ]
    }
  ]);

  if (action === "exit") {
    console.log(chalk.green("\nAu revoir !\n"));
    process.exit(0);
  }

  switch (action) {
    case "diagnostic":
      await showDiagnosticMenu();
      break;
    case "backup":
      await showBackupMenu();
      break;
    case "audit":
      await showAuditMenu();
      break;
  }
}

async function showDiagnosticMenu(): Promise<void> {
  console.log(chalk.bold.yellow("\n═══ Module Diagnostic ═══\n"));

  const { diagnosticAction } = await inquirer.prompt([
    {
      type: "list",
      name: "diagnosticAction",
      message: "Que souhaitez-vous diagnostiquer ?",
      choices: [
        { name: "Vérifier AD/DNS (contrôleurs de domaine)", value: "ad_dns" },
        { name: "Tester la base MySQL WMS", value: "mysql" },
        { name: "État système Windows Server", value: "windows" },
        { name: "État système Ubuntu/Linux", value: "linux" },
        new inquirer.Separator(),
        { name: "← Retour au menu principal", value: "back" }
      ]
    }
  ]);

  if (diagnosticAction === "back") {
    await showMainMenu();
    return;
  }

  const inputs: any = {};

  if (diagnosticAction === "windows" || diagnosticAction === "linux") {
    const { target } = await inquirer.prompt([
      {
        type: "input",
        name: "target",
        message: "Adresse IP ou nom d'hôte de la machine :",
        default: "localhost"
      }
    ]);
    inputs.target = target;
  }

  try {
    await runDiagnostic(diagnosticAction, inputs);
  } catch (error: any) {
    console.log(chalk.red(`\n❌ Erreur: ${error.message}\n`));
    getLogger().error("Diagnostic error", { error: error.message });
  }

  await promptReturnToMenu();
}

async function showBackupMenu(): Promise<void> {
  console.log(chalk.bold.yellow("\n═══ Module Sauvegarde WMS ═══\n"));

  const { backupAction } = await inquirer.prompt([
    {
      type: "list",
      name: "backupAction",
      message: "Type de sauvegarde :",
      choices: [
        { name: "Dump SQL complet de la base", value: "sql_dump" },
        { name: "Export CSV d'une table", value: "csv_export" },
        new inquirer.Separator(),
        { name: "← Retour au menu principal", value: "back" }
      ]
    }
  ]);

  if (backupAction === "back") {
    await showMainMenu();
    return;
  }

  const inputs: any = {};

  if (backupAction === "csv_export") {
    const { tableName } = await inquirer.prompt([
      {
        type: "input",
        name: "tableName",
        message: "Nom de la table à exporter :",
        validate: (input) => input.trim().length > 0 || "Le nom de table est requis"
      }
    ]);
    inputs.tableName = tableName;
  }

  try {
    await runBackup(backupAction, inputs);
  } catch (error: any) {
    console.log(chalk.red(`\n❌ Erreur: ${error.message}\n`));
    getLogger().error("Backup error", { error: error.message });
  }

  await promptReturnToMenu();
}

async function showAuditMenu(): Promise<void> {
  console.log(chalk.bold.yellow("\n═══ Module Audit d'obsolescence ═══\n"));

  const { auditAction } = await inquirer.prompt([
    {
      type: "list",
      name: "auditAction",
      message: "Type d'audit :",
      choices: [
        { name: "Scanner une plage réseau", value: "network_scan" },
        { name: "Lister les versions EOL d'un OS", value: "eol_list" },
        { name: "Analyser un fichier CSV d'inventaire", value: "csv_analyze" },
        new inquirer.Separator(),
        { name: "← Retour au menu principal", value: "back" }
      ]
    }
  ]);

  if (auditAction === "back") {
    await showMainMenu();
    return;
  }

  const inputs: any = {};

  if (auditAction === "network_scan") {
    const { networkRange } = await inquirer.prompt([
      {
        type: "input",
        name: "networkRange",
        message: "Plage réseau (ex: 192.168.1.0/24) :",
        validate: (input) => input.trim().length > 0 || "La plage réseau est requise"
      }
    ]);
    inputs.networkRange = networkRange;
  } else if (auditAction === "eol_list") {
    const { osName } = await inquirer.prompt([
      {
        type: "input",
        name: "osName",
        message: "Nom de l'OS (ex: ubuntu, windows, debian) :",
        validate: (input) => input.trim().length > 0 || "Le nom de l'OS est requis"
      }
    ]);
    inputs.osName = osName;
  } else if (auditAction === "csv_analyze") {
    const { csvPath } = await inquirer.prompt([
      {
        type: "input",
        name: "csvPath",
        message: "Chemin du fichier CSV :",
        validate: (input) => input.trim().length > 0 || "Le chemin est requis"
      }
    ]);
    inputs.csvPath = csvPath;
  }

  try {
    await runAudit(auditAction, inputs);
  } catch (error: any) {
    console.log(chalk.red(`\n❌ Erreur: ${error.message}\n`));
    getLogger().error("Audit error", { error: error.message });
  }

  await promptReturnToMenu();
}

async function promptReturnToMenu(): Promise<void> {
  const { returnToMenu } = await inquirer.prompt([
    {
      type: "confirm",
      name: "returnToMenu",
      message: "Retourner au menu principal ?",
      default: true
    }
  ]);

  if (returnToMenu) {
    await showMainMenu();
  } else {
    console.log(chalk.green("\nAu revoir !\n"));
    process.exit(0);
  }
}

async function main() {
  try {
    initLogger();
    getLogger().info("NTL-SysToolbox started");
    await showMainMenu();
  } catch (error: any) {
    console.error(chalk.red(`\n❌ Erreur fatale: ${error.message}\n`));
    getLogger().error("Fatal error", { error: error.message, stack: error.stack });
    process.exit(2);
  }
}

if (require.main === module) {
  main();
}
