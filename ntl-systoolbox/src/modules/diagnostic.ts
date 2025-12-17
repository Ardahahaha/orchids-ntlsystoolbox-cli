import { exec } from "child_process";
import { promisify } from "util";
import mysql from "mysql2/promise";
import ora from "ora";
import chalk from "chalk";
import { Status, DiagnosticCheck, OutputResult, ExitCode } from "../types";
import { loadConfig } from "../utils/config";
import { getLogger } from "../utils/logger";
import { generateTimestamp, writeJsonOutput, printHumanOutput, determineExitCode, determineOverallStatus } from "../utils/output";

const execAsync = promisify(exec);

export async function runDiagnostic(action: string, inputs: any): Promise<void> {
  const checks: DiagnosticCheck[] = [];
  const anomalies: string[] = [];
  let spinner = ora("Démarrage du diagnostic...").start();

  try {
    switch (action) {
      case "ad_dns":
        await checkADDNS(checks, anomalies, spinner);
        break;
      case "mysql":
        await checkMySQL(checks, anomalies, spinner);
        break;
      case "windows":
        await checkWindowsServer(inputs.target, checks, anomalies, spinner);
        break;
      case "linux":
        await checkLinuxServer(inputs.target, checks, anomalies, spinner);
        break;
    }

    spinner.succeed(chalk.green("Diagnostic terminé"));

    const statuses = checks.map(c => c.status);
    const overallStatus = determineOverallStatus(statuses);
    const exitCode = determineExitCode(overallStatus);

    const result: OutputResult = {
      timestamp: generateTimestamp(),
      module: "diagnostic",
      status: overallStatus,
      exit_code: exitCode,
      summary: `Diagnostic ${action} completed with status ${overallStatus}`,
      details: { checks },
      anomalies: anomalies.length > 0 ? anomalies : undefined
    };

    writeJsonOutput(result);
    printHumanOutput(result);

    process.exitCode = exitCode;
  } catch (error: any) {
    spinner.fail(chalk.red("Échec du diagnostic"));
    throw error;
  }
}

async function checkADDNS(checks: DiagnosticCheck[], anomalies: string[], spinner: ora.Ora): Promise<void> {
  const config = loadConfig();
  
  for (const dc of config.ad.domain_controllers) {
    spinner.text = `Vérification du contrôleur de domaine: ${dc}`;
    
    try {
      const isWindows = process.platform === "win32";
      const pingCmd = isWindows ? `ping -n 2 ${dc}` : `ping -c 2 ${dc}`;
      await execAsync(pingCmd);
      
      checks.push({
        name: "AD Domain Controller",
        target: dc,
        status: Status.OK,
        message: `Contrôleur de domaine ${dc} accessible`
      });
      getLogger().info(`AD DC ${dc} is reachable`);
    } catch (error) {
      checks.push({
        name: "AD Domain Controller",
        target: dc,
        status: Status.CRIT,
        message: `Contrôleur de domaine ${dc} inaccessible`
      });
      anomalies.push(`DC ${dc} is unreachable`);
      getLogger().error(`AD DC ${dc} is unreachable`);
    }
  }

  for (const dns of config.ad.dns_servers) {
    spinner.text = `Vérification du serveur DNS: ${dns}`;
    
    try {
      const isWindows = process.platform === "win32";
      const dnsCmd = isWindows ? `nslookup ${config.ad.domain} ${dns}` : `dig @${dns} ${config.ad.domain}`;
      await execAsync(dnsCmd);
      
      checks.push({
        name: "DNS Server",
        target: dns,
        status: Status.OK,
        message: `Serveur DNS ${dns} fonctionnel`
      });
      getLogger().info(`DNS ${dns} is working`);
    } catch (error) {
      checks.push({
        name: "DNS Server",
        target: dns,
        status: Status.CRIT,
        message: `Serveur DNS ${dns} ne répond pas`
      });
      anomalies.push(`DNS ${dns} is not responding`);
      getLogger().error(`DNS ${dns} is not responding`);
    }
  }
}

async function checkMySQL(checks: DiagnosticCheck[], anomalies: string[], spinner: ora.Ora): Promise<void> {
  const config = loadConfig();
  spinner.text = `Connexion à MySQL: ${config.mysql.host}:${config.mysql.port}`;

  try {
    const connection = await mysql.createConnection({
      host: config.mysql.host,
      port: config.mysql.port,
      user: config.mysql.user,
      password: config.mysql.password
    });

    const [rows]: any = await connection.query("SELECT VERSION() as version");
    const version = rows[0].version;

    checks.push({
      name: "MySQL Connection",
      target: `${config.mysql.host}:${config.mysql.port}`,
      status: Status.OK,
      message: `MySQL accessible, version: ${version}`,
      metrics: { version }
    });

    const [databases]: any = await connection.query("SHOW DATABASES");
    const dbExists = databases.some((db: any) => db.Database === config.mysql.database);

    if (dbExists) {
      checks.push({
        name: "MySQL Database",
        target: config.mysql.database,
        status: Status.OK,
        message: `Base de données ${config.mysql.database} existe`
      });
    } else {
      checks.push({
        name: "MySQL Database",
        target: config.mysql.database,
        status: Status.WARN,
        message: `Base de données ${config.mysql.database} introuvable`
      });
      anomalies.push(`Database ${config.mysql.database} not found`);
    }

    await connection.end();
    getLogger().info("MySQL check completed successfully");
  } catch (error: any) {
    checks.push({
      name: "MySQL Connection",
      target: `${config.mysql.host}:${config.mysql.port}`,
      status: Status.CRIT,
      message: `Impossible de se connecter à MySQL: ${error.message}`
    });
    anomalies.push(`MySQL connection failed: ${error.message}`);
    getLogger().error("MySQL check failed", { error: error.message });
  }
}

async function checkWindowsServer(target: string, checks: DiagnosticCheck[], anomalies: string[], spinner: ora.Ora): Promise<void> {
  spinner.text = `Diagnostic Windows Server: ${target}`;

  try {
    if (target === "localhost" && process.platform === "win32") {
      const { stdout: osVersion } = await execAsync("ver");
      checks.push({
        name: "OS Version",
        target,
        status: Status.OK,
        message: osVersion.trim(),
        metrics: { os_version: osVersion.trim() }
      });

      const { stdout: uptime } = await execAsync("net statistics workstation | findstr \"since\"");
      checks.push({
        name: "Uptime",
        target,
        status: Status.OK,
        message: uptime.trim(),
        metrics: { uptime: uptime.trim() }
      });

      const { stdout: cpu } = await execAsync("wmic cpu get loadpercentage /value");
      const cpuMatch = cpu.match(/LoadPercentage=(\d+)/);
      const cpuUsage = cpuMatch ? parseInt(cpuMatch[1]) : 0;
      checks.push({
        name: "CPU Usage",
        target,
        status: cpuUsage > 80 ? Status.WARN : Status.OK,
        message: `Utilisation CPU: ${cpuUsage}%`,
        metrics: { cpu_usage_percent: cpuUsage }
      });

      const { stdout: mem } = await execAsync("wmic OS get FreePhysicalMemory,TotalVisibleMemorySize /value");
      const totalMatch = mem.match(/TotalVisibleMemorySize=(\d+)/);
      const freeMatch = mem.match(/FreePhysicalMemory=(\d+)/);
      if (totalMatch && freeMatch) {
        const totalMem = parseInt(totalMatch[1]) / 1024;
        const freeMem = parseInt(freeMatch[1]) / 1024;
        const usedPercent = ((totalMem - freeMem) / totalMem) * 100;
        checks.push({
          name: "Memory Usage",
          target,
          status: usedPercent > 90 ? Status.WARN : Status.OK,
          message: `Mémoire utilisée: ${usedPercent.toFixed(1)}%`,
          metrics: { memory_usage_percent: usedPercent, total_mb: totalMem, free_mb: freeMem }
        });
      }

      const { stdout: disk } = await execAsync("wmic logicaldisk get size,freespace,caption");
      checks.push({
        name: "Disk Space",
        target,
        status: Status.OK,
        message: "Informations disque récupérées",
        metrics: { disk_info: disk.trim() }
      });

      getLogger().info(`Windows Server diagnostic completed for ${target}`);
    } else {
      checks.push({
        name: "Windows Server Check",
        target,
        status: Status.WARN,
        message: "Diagnostic distant non implémenté (nécessite WinRM/PowerShell Remoting)"
      });
      anomalies.push("Remote Windows diagnostics require WinRM configuration");
    }
  } catch (error: any) {
    checks.push({
      name: "Windows Server Check",
      target,
      status: Status.CRIT,
      message: `Erreur: ${error.message}`
    });
    anomalies.push(`Windows check failed: ${error.message}`);
    getLogger().error("Windows check failed", { error: error.message });
  }
}

async function checkLinuxServer(target: string, checks: DiagnosticCheck[], anomalies: string[], spinner: ora.Ora): Promise<void> {
  spinner.text = `Diagnostic Linux: ${target}`;

  try {
    if (target === "localhost" && process.platform !== "win32") {
      const { stdout: osVersion } = await execAsync("cat /etc/os-release | grep PRETTY_NAME");
      checks.push({
        name: "OS Version",
        target,
        status: Status.OK,
        message: osVersion.trim(),
        metrics: { os_version: osVersion.trim() }
      });

      const { stdout: uptime } = await execAsync("uptime -p");
      checks.push({
        name: "Uptime",
        target,
        status: Status.OK,
        message: uptime.trim(),
        metrics: { uptime: uptime.trim() }
      });

      const { stdout: cpu } = await execAsync("top -bn1 | grep \"Cpu(s)\" | awk '{print $2}'");
      const cpuUsage = parseFloat(cpu.trim());
      checks.push({
        name: "CPU Usage",
        target,
        status: cpuUsage > 80 ? Status.WARN : Status.OK,
        message: `Utilisation CPU: ${cpuUsage}%`,
        metrics: { cpu_usage_percent: cpuUsage }
      });

      const { stdout: mem } = await execAsync("free -m | grep Mem");
      const memParts = mem.trim().split(/\s+/);
      const totalMem = parseInt(memParts[1]);
      const usedMem = parseInt(memParts[2]);
      const usedPercent = (usedMem / totalMem) * 100;
      checks.push({
        name: "Memory Usage",
        target,
        status: usedPercent > 90 ? Status.WARN : Status.OK,
        message: `Mémoire utilisée: ${usedPercent.toFixed(1)}%`,
        metrics: { memory_usage_percent: usedPercent, total_mb: totalMem, used_mb: usedMem }
      });

      const { stdout: disk } = await execAsync("df -h /");
      checks.push({
        name: "Disk Space",
        target,
        status: Status.OK,
        message: "Informations disque récupérées",
        metrics: { disk_info: disk.trim() }
      });

      getLogger().info(`Linux diagnostic completed for ${target}`);
    } else {
      checks.push({
        name: "Linux Check",
        target,
        status: Status.WARN,
        message: "Diagnostic distant non implémenté (nécessite SSH)"
      });
      anomalies.push("Remote Linux diagnostics require SSH configuration");
    }
  } catch (error: any) {
    checks.push({
      name: "Linux Check",
      target,
      status: Status.CRIT,
      message: `Erreur: ${error.message}`
    });
    anomalies.push(`Linux check failed: ${error.message}`);
    getLogger().error("Linux check failed", { error: error.message });
  }
}
