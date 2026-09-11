import { describe, it, expect } from "vitest";
import { ActionValidator } from "../src/actions/action-validator";
import { sanitizeActionInput } from "../src/actions/action-schema";

describe("Action Validator — Security & Execution Constraints", () => {
  it("should sanitize valid raw input into typed action", () => {
    const raw = {
      action: "click",
      target: { agentId: "el-42" },
      reason: "Submit the form"
    };

    const sanitized = sanitizeActionInput(raw);
    expect(sanitized).not.toBeNull();
    expect(sanitized?.action).toBe("CLICK");
    expect((sanitized as any).target?.agentId).toBe("el-42");
  });

  it("should reject malicious script execution attempts in typing text", () => {
    const maliciousAction: any = {
      action: "TYPE",
      target: { agentId: "el-1" },
      text: "<script>alert('xss')</script>"
    };

    const validation = ActionValidator.validate(maliciousAction);
    expect(validation.valid).toBe(false);
    expect(validation.reason).toContain("Suspicious script payload");
  });

  it("should reject out-of-bounds scroll amounts", () => {
    const excessiveScroll: any = {
      action: "SCROLL",
      direction: "DOWN",
      amount: 999999
    };

    const validation = ActionValidator.validate(excessiveScroll);
    expect(validation.valid).toBe(false);
    expect(validation.reason).toContain("out of allowed bounds");
  });

  it("should reject unknown/disallowed action types", () => {
    const unknownAction: any = {
      action: "EXECUTE_JAVASCRIPT",
      code: "window.location = 'evil.com'"
    };

    const sanitized = sanitizeActionInput(unknownAction);
    expect(sanitized).toBeNull();
  });
});
