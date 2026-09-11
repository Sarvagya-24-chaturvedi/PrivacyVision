import { DetectionSource, SensitiveDataType } from "../shared/privacy";

export interface DOMDetectionResult {
  type: SensitiveDataType;
  sources: DetectionSource[];
  confidenceBoost: number;
  reason: string;
}

export class DOMDetector {
  private static readonly PASSWORD_TYPES = new Set(["password"]);
  
  private static readonly SENSITIVE_INPUT_TYPES = new Map<string, SensitiveDataType>([
    ["password", "PASSWORD"],
    ["email", "EMAIL"],
    ["tel", "PHONE"]
  ]);

  private static readonly AUTOCOMPLETE_MAP = new Map<string, SensitiveDataType>([
    ["current-password", "PASSWORD"],
    ["new-password", "PASSWORD"],
    ["one-time-code", "OTP"],
    ["cc-number", "CREDIT_CARD"],
    ["cc-csc", "CVV"],
    ["cc-exp", "CREDIT_CARD"],
    ["tel", "PHONE"],
    ["tel-national", "PHONE"],
    ["email", "EMAIL"],
    ["address-line1", "ADDRESS"],
    ["bday", "DOB"]
  ]);

  private static readonly NAME_KEYWORDS: Array<{ regex: RegExp; type: SensitiveDataType }> = [
    { regex: /password|passwd|pwd|passcode/i, type: "PASSWORD" },
    { regex: /pin|mpin|security[_-]?code/i, type: "PIN" },
    { regex: /otp|one[_-]?time[_-]?pass/i, type: "OTP" },
    { regex: /api[_-]?key|secret|access[_-]?token|bearer/i, type: "API_KEY" },
    { regex: /aadhaar|uidai|adhar/i, type: "AADHAAR" },
    { regex: /\bpan\b|pan[_-]?card|pan[_-]?number/i, type: "PAN" },
    { regex: /ifsc|ifsc[_-]?code/i, type: "IFSC" },
    { regex: /upi|vpa|upi[_-]?id/i, type: "UPI_ID" },
    { regex: /card[_-]?number|cc[_-]?num|credit[_-]?card|debit[_-]?card/i, type: "CREDIT_CARD" },
    { regex: /cvv|cvc|security[_-]?code/i, type: "CVV" },
    { regex: /account[_-]?number|bank[_-]?acc|acc[_-]?no/i, type: "BANK_ACCOUNT" },
    { regex: /account[_-]?(?:holder|name)|beneficiary[_-]?name/i, type: "NAME" },
    { regex: /registration[_-]?(?:no|number|id)|reg[_-]?(?:no|number)/i, type: "REGISTRATION_NUMBER" },
    { regex: /\busn\b|university[_-]?(?:serial|student)[_-]?(?:no|number|id)/i, type: "USN" },
    { regex: /identification[_-]?(?:no|number|id)|identity[_-]?(?:no|number|id)|student[_-]?id|employee[_-]?id/i, type: "IDENTIFICATION_NUMBER" },
    { regex: /email|e[_-]?mail/i, type: "EMAIL" },
    { regex: /phone|mobile|cell|contact[_-]?num/i, type: "PHONE" },
    { regex: /dob|birth[_-]?date|date[_-]?of[_-]?birth/i, type: "DOB" },
    { regex: /address|street|zipcode|postal/i, type: "ADDRESS" }
  ];

  /**
   * Inspects element attributes for direct DOM signals.
   */
  public static inspectElement(el: Element): DOMDetectionResult | null {
    const tag = el.tagName.toLowerCase();
    const type = (el.getAttribute("type") || "").toLowerCase();
    const autocomplete = (el.getAttribute("autocomplete") || "").toLowerCase();
    const name = (el.getAttribute("name") || "").toLowerCase();
    const id = (el.id || "").toLowerCase();
    const placeholder = (el.getAttribute("placeholder") || "").toLowerCase();
    const ariaLabel = (el.getAttribute("aria-label") || "").toLowerCase();
    const combinedDescriptor = `${name} ${id} ${placeholder} ${ariaLabel}`;

    const sources: DetectionSource[] = [];

    // 1. Password input type (100% direct signal)
    if (this.PASSWORD_TYPES.has(type)) {
      sources.push("DOM");
      return {
        type: "PASSWORD",
        sources,
        confidenceBoost: 0.95,
        reason: "Input type is password"
      };
    }

    // 2. Autocomplete attributes
    for (const [key, sensitiveType] of this.AUTOCOMPLETE_MAP.entries()) {
      if (autocomplete.includes(key)) {
        sources.push("AUTOCOMPLETE");
        return {
          type: sensitiveType,
          sources,
          confidenceBoost: 0.85,
          reason: `Autocomplete matches ${key}`
        };
      }
    }

    // 3. Keyword matching on name/id/placeholder/aria
    for (const entry of this.NAME_KEYWORDS) {
      if (entry.regex.test(combinedDescriptor)) {
        sources.push("DOM");
        return {
          type: entry.type,
          sources,
          confidenceBoost: 0.75,
          reason: `Attributes match sensitive keyword for ${entry.type}`
        };
      }
    }

    // 4. Other input types like email/tel
    if (this.SENSITIVE_INPUT_TYPES.has(type)) {
      const mapped = this.SENSITIVE_INPUT_TYPES.get(type)!;
      sources.push("DOM");
      return {
        type: mapped,
        sources,
        confidenceBoost: 0.70,
        reason: `Input type matches ${type}`
      };
    }

    return null;
  }
}
