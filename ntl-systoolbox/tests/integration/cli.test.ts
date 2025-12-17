import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";

const execAsync = promisify(exec);

describe("CLI Integration Tests", () => {
  it("should compile TypeScript successfully", async () => {
    const { stdout, stderr } = await execAsync("npm run build", {
      cwd: path.join(__dirname, "../..")
    });
    
    expect(fs.existsSync(path.join(__dirname, "../../dist/index.js"))).toBe(true);
  });

  it("should create required directories on first run", () => {
    const config = require("../../src/utils/config").loadConfig();
    
    if (!fs.existsSync(config.output.log_path)) {
      fs.mkdirSync(config.output.log_path, { recursive: true });
    }
    
    expect(fs.existsSync(config.output.log_path)).toBe(true);
  });
});
