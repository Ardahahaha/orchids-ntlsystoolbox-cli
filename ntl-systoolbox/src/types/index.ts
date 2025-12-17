export interface Config {
  ad: {
    domain: string;
    domain_controllers: string[];
    dns_servers: string[];
  };
  mysql: {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
    backup_path: string;
  };
  audit: {
    network_ranges: string[];
    eol_data_source: string;
    eol_data_cache_hours: number;
  };
  output: {
    json_path: string;
    report_path: string;
    log_path: string;
  };
  exit_codes: {
    success: number;
    warning: number;
    critical: number;
  };
  logging: {
    level: string;
    console: boolean;
    file: boolean;
  };
}

export enum Status {
  OK = "OK",
  WARN = "WARN",
  CRIT = "CRIT"
}

export enum ExitCode {
  SUCCESS = 0,
  WARNING = 1,
  CRITICAL = 2
}

export interface OutputResult {
  timestamp: string;
  module: string;
  status: Status;
  exit_code: ExitCode;
  summary: string;
  details: any;
  anomalies?: string[];
}

export interface DiagnosticCheck {
  name: string;
  target: string;
  status: Status;
  message: string;
  metrics?: Record<string, any>;
}

export interface BackupResult {
  type: "sql_dump" | "csv_export";
  file_path: string;
  size_bytes: number;
  duration_ms: number;
  status: Status;
}

export interface EOLData {
  product: string;
  cycle: string;
  releaseDate?: string;
  eol?: string | boolean;
  support?: string | boolean;
  lts?: boolean;
}

export interface AuditHost {
  ip: string;
  hostname?: string;
  os?: string;
  version?: string;
  eol_status?: "supported" | "eol_soon" | "eol";
  eol_date?: string;
}
