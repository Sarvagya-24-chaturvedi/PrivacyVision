import { RegexDetector } from "./regex-detector";
import { ExtractedDOMContext } from "../shared/dom";

export interface FirewallValidationResult {
  blocked: boolean;
  reason?: string;
  violations?: string[];
}

export class PrivacyFirewall {
  /**
   * Scans an outbound payload before network transmission.
   * If any raw, unredacted sensitive values are detected, triggers fail-closed.
   */
  public static validateOutboundPayload(payload: {
    task?: string;
    screenshot?: string;
    dom?: ExtractedDOMContext | any;
    [key: string]: any;
  }): FirewallValidationResult {
    const violations: string[] = [];

    // 1. Verify screenshot is present and is a data URL (sanitized)
    if (!payload.screenshot || typeof payload.screenshot !== "string") {
      return {
        blocked: true,
        reason: "Outbound payload missing valid visual context"
      };
    }

    // 2. Validate DOM structural nodes if present
    if (payload.dom && Array.isArray(payload.dom.nodes)) {
      for (const node of payload.dom.nodes) {
        // A sensitive node must NEVER have an unredacted raw value
        if (node.sensitive) {
          if (node.value && !node.value.includes("[REDACTED]")) {
            violations.push(`Unredacted sensitive input value detected on node ${node.agentId || node.tag}`);
          }
          if (node.placeholder && !node.placeholder.includes("[REDACTED]") && node.type === "password") {
            violations.push(`Unredacted password placeholder detected on node ${node.agentId}`);
          }
        }

        // Check text content of nodes for leaked PII
        if (node.text && typeof node.text === "string") {
          const textMatches = RegexDetector.scanText(node.text);
          for (const match of textMatches) {
            // Any locally-recognised PII in an outbound structural node is a
            // leak. The firewall is intentionally stricter than display rules.
            if (match.type !== "OCR_TEXT") {
              violations.push(`Raw ${match.type} pattern detected in node text for ${node.agentId}`);
            }
          }
        }
      }
    }

    // 3. Stringify payload metadata (excluding screenshot base64 data) and perform global leak scan
    const metadataToScan = JSON.stringify({
      task: payload.task,
      dom: payload.dom,
      privacy: payload.privacy
    });

    const globalMatches = RegexDetector.scanText(metadataToScan);
    for (const match of globalMatches) {
      if (match.type !== "OCR_TEXT") {
        violations.push(`Sensitive pattern (${match.type}) detected in payload metadata`);
      }
    }

    if (violations.length > 0) {
      return {
        blocked: true,
        reason: `Potential sensitive data leak blocked before transmission: ${violations[0]}`,
        violations
      };
    }

    return {
      blocked: false
    };
  }
}
