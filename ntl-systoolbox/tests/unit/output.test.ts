import { determineExitCode, determineOverallStatus, generateTimestamp } from "../../src/utils/output";
import { Status, ExitCode } from "../../src/types";

describe("Output Utils", () => {
  describe("determineExitCode", () => {
    it("should return SUCCESS for OK status", () => {
      expect(determineExitCode(Status.OK)).toBe(ExitCode.SUCCESS);
    });

    it("should return WARNING for WARN status", () => {
      expect(determineExitCode(Status.WARN)).toBe(ExitCode.WARNING);
    });

    it("should return CRITICAL for CRIT status", () => {
      expect(determineExitCode(Status.CRIT)).toBe(ExitCode.CRITICAL);
    });
  });

  describe("determineOverallStatus", () => {
    it("should return CRIT if any status is CRIT", () => {
      const statuses = [Status.OK, Status.WARN, Status.CRIT];
      expect(determineOverallStatus(statuses)).toBe(Status.CRIT);
    });

    it("should return WARN if any status is WARN and none CRIT", () => {
      const statuses = [Status.OK, Status.WARN, Status.OK];
      expect(determineOverallStatus(statuses)).toBe(Status.WARN);
    });

    it("should return OK if all statuses are OK", () => {
      const statuses = [Status.OK, Status.OK, Status.OK];
      expect(determineOverallStatus(statuses)).toBe(Status.OK);
    });
  });

  describe("generateTimestamp", () => {
    it("should generate valid ISO timestamp", () => {
      const timestamp = generateTimestamp();
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });
});
