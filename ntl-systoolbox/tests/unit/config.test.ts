import { loadConfig } from "../../src/utils/config";

describe("Configuration", () => {
  it("should load default configuration", () => {
    const config = loadConfig();
    expect(config).toBeDefined();
    expect(config.mysql).toBeDefined();
    expect(config.ad).toBeDefined();
    expect(config.audit).toBeDefined();
  });

  it("should have valid exit codes", () => {
    const config = loadConfig();
    expect(config.exit_codes.success).toBe(0);
    expect(config.exit_codes.warning).toBe(1);
    expect(config.exit_codes.critical).toBe(2);
  });
});
