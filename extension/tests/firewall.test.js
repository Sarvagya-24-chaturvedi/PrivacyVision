import { describe, it, expect } from "vitest";
import { PrivacyFirewall } from "../src/privacy/firewall";
describe("Privacy Firewall — Pre-Flight Outbound Leak Prevention", () => {
    it("should permit a properly sanitized payload to pass", () => {
        const safePayload = {
            task: "Click the continue button",
            screenshot: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
            dom: {
                nodes: [
                    {
                        agentId: "el-1",
                        tag: "button",
                        role: "button",
                        text: "Continue",
                        sensitive: false
                    },
                    {
                        agentId: "el-2",
                        tag: "input",
                        role: "textbox",
                        type: "password",
                        value: "[REDACTED]",
                        placeholder: "[REDACTED]",
                        sensitive: true
                    }
                ]
            }
        };
        const result = PrivacyFirewall.validateOutboundPayload(safePayload);
        expect(result.blocked).toBe(false);
    });
    it("should BLOCK outbound payload if raw unredacted password exists", () => {
        const leakyPayload = {
            task: "Login user",
            screenshot: "data:image/png;base64,sample",
            dom: {
                nodes: [
                    {
                        agentId: "el-2",
                        tag: "input",
                        role: "textbox",
                        type: "password",
                        value: "superSecretPassword123", // RAW VALUE LEAK
                        sensitive: true
                    }
                ]
            }
        };
        const result = PrivacyFirewall.validateOutboundPayload(leakyPayload);
        expect(result.blocked).toBe(true);
        expect(result.reason).toContain("Unredacted sensitive input value detected");
    });
    it("should BLOCK outbound payload if a raw valid credit card is in metadata", () => {
        const leakyPayload = {
            task: "Processing payment with card 4111 1111 1111 1111", // RAW CARD LEAK
            screenshot: "data:image/png;base64,sample",
            dom: { nodes: [] }
        };
        const result = PrivacyFirewall.validateOutboundPayload(leakyPayload);
        expect(result.blocked).toBe(true);
        expect(result.violations?.length).toBeGreaterThan(0);
    });
    it("should permit sanitized email placeholders in link node text", () => {
        const sanitizedEmailPayload = {
            task: "Contact the department",
            screenshot: "data:image/png;base64,sample",
            dom: {
                nodes: [
                    {
                        agentId: "el-29",
                        tag: "a",
                        role: "link",
                        text: "[EMAIL_REDACTED]",
                        sensitive: true
                    }
                ]
            }
        };
        const result = PrivacyFirewall.validateOutboundPayload(sanitizedEmailPayload);
        expect(result.blocked).toBe(false);
    });
});
