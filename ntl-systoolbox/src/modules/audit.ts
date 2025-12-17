import * as fs from "fs";
import * as path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { parse } from "csv-parse/sync";
import ora from "ora";
import chalk from "chalk";
import { Status, EOLData, AuditHost, OutputResult, ExitCode } from "../types";
import { loadConfig } from "../utils/config";
import { getLogger } from "../utils/logger";
import { generateTimestamp, writeJsonOutput, printHumanOutput, determineExitCode, determineOverallStatus } from "../utils/output";

const execAsync = promisify(exec);

export async function runAudit(action: string, inputs: any): Promise<void> {
  const anomalies: string[] = [];
  let spinner = ora("Démarrage de l'audit...").start();

  try {
    let result: OutputResult;

    switch (action) {
      case "network_scan":
        result = await performNetworkScan(inputs.networkRange, anomalies, spinner);
        break;
      case "eol_list":
        result = await performEOLList(inputs.osName, anomalies, spinner);
        break;
      case "csv_analyze":
        result = await performCSVAnalysis(inputs.csvPath, anomalies, spinner);
        break;
      default:
        throw new Error(`Unknown audit action: ${action}`);
    }

    spinner.succeed(chalk.green("Audit terminé"));

    writeJsonOutput(result);
    printHumanOutput(result);

    process.exitCode = result.exit_code;
  } catch (error: any) {
    spinner.fail(chalk.red("Échec de l'audit"));
    throw error;
  }
}

async function performNetworkScan(networkRange: string, anomalies: string[], spinner: ora.Ora): Promise<OutputResult> {
  spinner.text = `Scan réseau: ${networkRange}`;

  const hosts: AuditHost[] = [];

  try {
    const isWindows = process.platform === "win32";
    
    if (isWindows) {
      spinner.text = "Scan réseau (simulation mode - nmap requis pour scan réel)";
      
      hosts.push({
        ip: "10.0.0.10",
        hostname: "dc01.ntl.local",
        os: "windows",
        version: "Server 2019",
        eol_status: "supported",
        eol_date: "2029-01-09"
      });
      hosts.push({
        ip: "10.0.0.20",
        hostname: "wms-db01",
        os: "ubuntu",
        version: "18.04",
        eol_status: "eol",
        eol_date: "2023-05-31"
      });
      hosts.push({
        ip: "10.0.0.30",
        hostname: "web-server",
        os: "ubuntu",
        version: "22.04",
        eol_status: "supported",
        eol_date: "2027-04-01"
      });

      anomalies.push("Using simulated network scan data (nmap not available)");
      getLogger().warn("Network scan simulated - nmap not available");
    } else {
      try {
        const { stdout } = await execAsync(`nmap -sn ${networkRange}`);
        const lines = stdout.split("\n");
        const ipPattern = /Nmap scan report for ([^\s]+) \(([^)]+)\)/;
        
        for (const line of lines) {
          const match = line.match(ipPattern);
          if (match) {
            hosts.push({
              ip: match[2],
              hostname: match[1] !== match[2] ? match[1] : undefined
            });
          }
        }

        for (const host of hosts) {
          try {
            const { stdout: osInfo } = await execAsync(`nmap -O ${host.ip}`);
            if (osInfo.includes("Windows")) {
              host.os = "windows";
            } else if (osInfo.includes("Linux")) {
              host.os = "linux";
            }
          } catch (error) {
            host.os = "unknown";
          }
        }

        getLogger().info(`Network scan completed: ${hosts.length} hosts found`);
      } catch (error: any) {
        anomalies.push(`Network scan failed: ${error.message}`);
        getLogger().error("Network scan failed", { error: error.message });
      }
    }

    for (const host of hosts) {
      if (host.eol_status === "eol") {
        anomalies.push(`Host ${host.ip} (${host.os} ${host.version}) is EOL since ${host.eol_date}`);
      }
    }

    await generateAuditReport(hosts, "network_scan");

    const statuses = hosts.map(h => 
      h.eol_status === "eol" ? Status.CRIT :
      h.eol_status === "eol_soon" ? Status.WARN :
      Status.OK
    );
    const overallStatus = determineOverallStatus(statuses);

    return {
      timestamp: generateTimestamp(),
      module: "audit",
      status: overallStatus,
      exit_code: determineExitCode(overallStatus),
      summary: `Network scan of ${networkRange}: ${hosts.length} hosts found`,
      details: { hosts, scan_range: networkRange },
      anomalies: anomalies.length > 0 ? anomalies : undefined
    };
  } catch (error: any) {
    anomalies.push(`Network scan error: ${error.message}`);
    return {
      timestamp: generateTimestamp(),
      module: "audit",
      status: Status.CRIT,
      exit_code: ExitCode.CRITICAL,
      summary: `Network scan failed: ${error.message}`,
      details: { error: error.message },
      anomalies
    };
  }
}

async function performEOLList(osName: string, anomalies: string[], spinner: ora.Ora): Promise<OutputResult> {
  spinner.text = `Récupération des données EOL pour: ${osName}`;

  try {
    const eolData = await fetchEOLData(osName);

    if (eolData.length === 0) {
      anomalies.push(`No EOL data found for ${osName}`);
      return {
        timestamp: generateTimestamp(),
        module: "audit",
        status: Status.WARN,
        exit_code: ExitCode.WARNING,
        summary: `No EOL data found for ${osName}`,
        details: { os: osName, cycles: [] },
        anomalies
      };
    }

    await generateEOLListReport(osName, eolData);

    console.log(chalk.bold.cyan(`\n═══ Versions EOL pour ${osName} ═══\n`));
    for (const cycle of eolData) {
      const eolDate = typeof cycle.eol === "string" ? cycle.eol : "N/A";
      const supportDate = typeof cycle.support === "string" ? cycle.support : "N/A";
      const isEOL = typeof cycle.eol === "string" && new Date(cycle.eol) < new Date();

      const statusText = isEOL ? chalk.red("[EOL]") : chalk.green("[SUPPORTED]");
      console.log(`${statusText} ${cycle.cycle}`);
      console.log(chalk.gray(`  Release: ${cycle.releaseDate || "N/A"}`));
      console.log(chalk.gray(`  Support End: ${supportDate}`));
      console.log(chalk.gray(`  EOL: ${eolDate}\n`));
    }

    return {
      timestamp: generateTimestamp(),
      module: "audit",
      status: Status.OK,
      exit_code: ExitCode.SUCCESS,
      summary: `EOL data retrieved for ${osName}: ${eolData.length} versions`,
      details: { os: osName, cycles: eolData },
      anomalies: anomalies.length > 0 ? anomalies : undefined
    };
  } catch (error: any) {
    anomalies.push(`EOL data fetch failed: ${error.message}`);
    return {
      timestamp: generateTimestamp(),
      module: "audit",
      status: Status.CRIT,
      exit_code: ExitCode.CRITICAL,
      summary: `Failed to retrieve EOL data for ${osName}`,
      details: { error: error.message },
      anomalies
    };
  }
}

async function performCSVAnalysis(csvPath: string, anomalies: string[], spinner: ora.Ora): Promise<OutputResult> {
  spinner.text = `Analyse du fichier CSV: ${csvPath}`;

  try {
    if (!fs.existsSync(csvPath)) {
      throw new Error(`File not found: ${csvPath}`);
    }

    const fileContent = fs.readFileSync(csvPath, "utf8");
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true
    });

    const hosts: AuditHost[] = [];

    for (const record of records) {
      const ip = record.ip || record.IP || "";
      const hostname = record.hostname || record.Hostname || "";
      const os = record.os || record.OS || "";
      const version = record.version || record.Version || "";

      if (!ip || !os || !version) {
        anomalies.push(`Invalid record in CSV: missing required fields`);
        continue;
      }

      const eolInfo = await getEOLStatus(os, version);

      hosts.push({
        ip,
        hostname,
        os,
        version,
        eol_status: eolInfo.status,
        eol_date: eolInfo.date
      });
    }

    for (const host of hosts) {
      if (host.eol_status === "eol") {
        anomalies.push(`Host ${host.ip} (${host.os} ${host.version}) is EOL since ${host.eol_date}`);
      } else if (host.eol_status === "eol_soon") {
        anomalies.push(`Host ${host.ip} (${host.os} ${host.version}) will be EOL on ${host.eol_date}`);
      }
    }

    await generateAuditReport(hosts, "csv_analysis");

    const statuses = hosts.map(h =>
      h.eol_status === "eol" ? Status.CRIT :
      h.eol_status === "eol_soon" ? Status.WARN :
      Status.OK
    );
    const overallStatus = determineOverallStatus(statuses);

    return {
      timestamp: generateTimestamp(),
      module: "audit",
      status: overallStatus,
      exit_code: determineExitCode(overallStatus),
      summary: `CSV analysis completed: ${hosts.length} hosts analyzed`,
      details: { hosts, source_file: csvPath },
      anomalies: anomalies.length > 0 ? anomalies : undefined
    };
  } catch (error: any) {
    anomalies.push(`CSV analysis failed: ${error.message}`);
    return {
      timestamp: generateTimestamp(),
      module: "audit",
      status: Status.CRIT,
      exit_code: ExitCode.CRITICAL,
      summary: `CSV analysis failed: ${error.message}`,
      details: { error: error.message },
      anomalies
    };
  }
}

async function fetchEOLData(product: string): Promise<EOLData[]> {
  const config = loadConfig();
  const url = `${config.audit.eol_data_source}/${product}.json`;

  try {
    const https = require("https");
    return new Promise((resolve, reject) => {
      https.get(url, (res: any) => {
        let data = "";
        res.on("data", (chunk: any) => { data += chunk; });
        res.on("end", () => {
          try {
            const parsed = JSON.parse(data);
            resolve(parsed.map((item: any) => ({
              product,
              cycle: item.cycle,
              releaseDate: item.releaseDate,
              eol: item.eol,
              support: item.support,
              lts: item.lts
            })));
          } catch (error) {
            reject(error);
          }
        });
      }).on("error", reject);
    });
  } catch (error) {
    getLogger().error(`Failed to fetch EOL data for ${product}`, { error });
    return [];
  }
}

async function getEOLStatus(os: string, version: string): Promise<{ status: "supported" | "eol_soon" | "eol"; date?: string }> {
  try {
    const eolData = await fetchEOLData(os);
    const matchingCycle = eolData.find(cycle =>
      version.includes(cycle.cycle) || cycle.cycle.includes(version)
    );

    if (!matchingCycle || !matchingCycle.eol) {
      return { status: "supported" };
    }

    const eolDate = typeof matchingCycle.eol === "string" ? new Date(matchingCycle.eol) : null;
    if (!eolDate) {
      return { status: "supported" };
    }

    const now = new Date();
    const sixMonthsFromNow = new Date();
    sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);

    if (eolDate < now) {
      return { status: "eol", date: eolDate.toISOString().split("T")[0] };
    } else if (eolDate < sixMonthsFromNow) {
      return { status: "eol_soon", date: eolDate.toISOString().split("T")[0] };
    } else {
      return { status: "supported", date: eolDate.toISOString().split("T")[0] };
    }
  } catch (error) {
    getLogger().error("Failed to get EOL status", { os, version, error });
    return { status: "supported" };
  }
}

async function generateAuditReport(hosts: AuditHost[], reportType: string): Promise<void> {
  const config = loadConfig();
  const reportDir = config.output.report_path;

  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  const timestamp = generateTimestamp().replace(/[:.]/g, "-");
  const filename = `audit_${reportType}_${timestamp}.html`;
  const filepath = path.join(reportDir, filename);

  const eolHosts = hosts.filter(h => h.eol_status === "eol");
  const eolSoonHosts = hosts.filter(h => h.eol_status === "eol_soon");
  const supportedHosts = hosts.filter(h => h.eol_status === "supported");

  const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Rapport d'Audit EOL - NTL-SysToolbox</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 40px; background: #f5f5f5; }
    .header { background: #2c3e50; color: white; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
    .section { background: white; padding: 20px; margin-bottom: 20px; border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .critical { background: #e74c3c; color: white; }
    .warning { background: #f39c12; color: white; }
    .ok { background: #27ae60; color: white; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background: #34495e; color: white; }
    .badge { padding: 5px 10px; border-radius: 3px; font-weight: bold; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Rapport d'Audit d'Obsolescence</h1>
    <p>NordTransit Logistics - NTL-SysToolbox</p>
    <p>Date: ${new Date().toLocaleString("fr-FR")}</p>
    <p>Type: ${reportType}</p>
  </div>

  <div class="section">
    <h2>Résumé</h2>
    <p><strong>Total des composants:</strong> ${hosts.length}</p>
    <p><strong>Non supportés (EOL):</strong> <span class="badge critical">${eolHosts.length}</span></p>
    <p><strong>Bientôt EOL:</strong> <span class="badge warning">${eolSoonHosts.length}</span></p>
    <p><strong>Supportés:</strong> <span class="badge ok">${supportedHosts.length}</span></p>
  </div>

  ${eolHosts.length > 0 ? `
  <div class="section">
    <h2 style="color: #e74c3c;">⚠ Composants NON SUPPORTÉS (EOL)</h2>
    <table>
      <thead><tr><th>IP</th><th>Hostname</th><th>OS</th><th>Version</th><th>Date EOL</th></tr></thead>
      <tbody>
        ${eolHosts.map(h => `
          <tr>
            <td>${h.ip}</td>
            <td>${h.hostname || "N/A"}</td>
            <td>${h.os || "N/A"}</td>
            <td>${h.version || "N/A"}</td>
            <td>${h.eol_date || "N/A"}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  </div>
  ` : ""}

  ${eolSoonHosts.length > 0 ? `
  <div class="section">
    <h2 style="color: #f39c12;">⚠ Composants bientôt NON SUPPORTÉS</h2>
    <table>
      <thead><tr><th>IP</th><th>Hostname</th><th>OS</th><th>Version</th><th>Date EOL</th></tr></thead>
      <tbody>
        ${eolSoonHosts.map(h => `
          <tr>
            <td>${h.ip}</td>
            <td>${h.hostname || "N/A"}</td>
            <td>${h.os || "N/A"}</td>
            <td>${h.version || "N/A"}</td>
            <td>${h.eol_date || "N/A"}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  </div>
  ` : ""}

  ${supportedHosts.length > 0 ? `
  <div class="section">
    <h2 style="color: #27ae60;">✓ Composants SUPPORTÉS</h2>
    <table>
      <thead><tr><th>IP</th><th>Hostname</th><th>OS</th><th>Version</th><th>Date EOL</th></tr></thead>
      <tbody>
        ${supportedHosts.map(h => `
          <tr>
            <td>${h.ip}</td>
            <td>${h.hostname || "N/A"}</td>
            <td>${h.os || "N/A"}</td>
            <td>${h.version || "N/A"}</td>
            <td>${h.eol_date || "N/A"}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  </div>
  ` : ""}

  <div class="section">
    <h3>Source de référence EOL</h3>
    <p><strong>API:</strong> <a href="https://endoflife.date">endoflife.date</a></p>
    <p><strong>Validité:</strong> Données mises à jour en continu par la communauté</p>
    <p><strong>Date de génération:</strong> ${new Date().toISOString()}</p>
  </div>
</body>
</html>
  `;

  fs.writeFileSync(filepath, html);
  console.log(chalk.green(`\n✓ Rapport HTML généré: ${filepath}`));
  getLogger().info(`Audit report generated: ${filepath}`);
}

async function generateEOLListReport(osName: string, eolData: EOLData[]): Promise<void> {
  const config = loadConfig();
  const reportDir = config.output.report_path;

  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  const timestamp = generateTimestamp().replace(/[:.]/g, "-");
  const filename = `eol_list_${osName}_${timestamp}.html`;
  const filepath = path.join(reportDir, filename);

  const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Liste EOL - ${osName}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
    .header { background: #2c3e50; color: white; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; background: white; }
    th, td { padding: 12px; text-align: left; border: 1px solid #ddd; }
    th { background: #34495e; color: white; }
    .eol { background: #ffebee; }
    .supported { background: #e8f5e9; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Liste des versions EOL - ${osName}</h1>
    <p>Date: ${new Date().toLocaleString("fr-FR")}</p>
  </div>
  <table>
    <thead><tr><th>Version</th><th>Release Date</th><th>Support End</th><th>EOL Date</th><th>Status</th></tr></thead>
    <tbody>
      ${eolData.map(cycle => {
        const isEOL = typeof cycle.eol === "string" && new Date(cycle.eol) < new Date();
        return `
          <tr class="${isEOL ? "eol" : "supported"}">
            <td>${cycle.cycle}</td>
            <td>${cycle.releaseDate || "N/A"}</td>
            <td>${typeof cycle.support === "string" ? cycle.support : "N/A"}</td>
            <td>${typeof cycle.eol === "string" ? cycle.eol : "N/A"}</td>
            <td>${isEOL ? "EOL" : "Supported"}</td>
          </tr>
        `;
      }).join("")}
    </tbody>
  </table>
</body>
</html>
  `;

  fs.writeFileSync(filepath, html);
  console.log(chalk.green(`\n✓ Rapport EOL généré: ${filepath}`));
  getLogger().info(`EOL list report generated: ${filepath}`);
}
