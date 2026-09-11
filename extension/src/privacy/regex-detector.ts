import { SensitiveDataType } from "../shared/privacy";

export interface RegexMatchResult {
  type: SensitiveDataType;
  confidence: number;
  matchedText: string;
  patternName: string;
}

export class RegexDetector {
  // Luhn algorithm for credit card numbers
  public static validateLuhn(cardNumber: string): boolean {
    const digits = cardNumber.replace(/\D/g, "");
    if (digits.length < 13 || digits.length > 19) return false;

    let sum = 0;
    let shouldDouble = false;
    for (let i = digits.length - 1; i >= 0; i--) {
      let digit = parseInt(digits.charAt(i), 10);
      if (shouldDouble) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
      shouldDouble = !shouldDouble;
    }
    return sum % 10 === 0;
  }

  // Verhoeff algorithm for Aadhaar numbers
  public static validateVerhoeff(aadhaar: string): boolean {
    const digits = aadhaar.replace(/\D/g, "");
    if (digits.length !== 12) return false;
    if (["0", "1"].includes(digits[0])) return false; // Aadhaar cannot start with 0 or 1

    const d = [
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
      [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
      [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
      [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
      [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
      [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
      [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
      [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
      [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
      [9, 8, 7, 6, 5, 4, 3, 2, 1, 0]
    ];

    const p = [
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
      [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
      [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
      [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
      [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
      [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
      [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
      [7, 0, 4, 6, 9, 1, 3, 2, 5, 8]
    ];

    let c = 0;
    const reversed = digits.split("").reverse();
    for (let i = 0; i < reversed.length; i++) {
      c = d[c][p[i % 8][parseInt(reversed[i], 10)]];
    }
    return c === 0;
  }

  // PAN validator: 5 letters + 4 digits + 1 letter
  public static isPAN(text: string): boolean {
    return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(text.trim());
  }

  // IFSC validator: 4 letters + 0 + 6 alphanumeric
  public static isIFSC(text: string): boolean {
    return /^[A-Z]{4}0[A-Z0-9]{6}$/.test(text.trim());
  }

  // UPI ID: user@bank
  public static isUPI(text: string): boolean {
    return /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(text.trim());
  }

  // Email validator
  public static isEmail(text: string): boolean {
    return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(text.trim());
  }

  // Indian phone: 10 digits starting with 6-9, optional +91 or 0
  public static isIndianPhone(text: string): boolean {
    const cleaned = text.replace(/[\s-]/g, "");
    return /^(?:\+91|91|0)?[6-9]\d{9}$/.test(cleaned);
  }

  /**
   * Scans an arbitrary string and returns all matches.
   */
  public static scanText(text: string): RegexMatchResult[] {
    if (!text || text.length < 3) return [];
    const results: RegexMatchResult[] = [];

    // 1. Email pattern
    const emailRegex = /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g;
    let match;
    while ((match = emailRegex.exec(text)) !== null) {
      results.push({
        type: "EMAIL",
        confidence: 0.95,
        matchedText: match[0],
        patternName: "email"
      });
    }

    // 2. PAN Card pattern
    const panRegex = /\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b/g;
    while ((match = panRegex.exec(text)) !== null) {
      results.push({
        type: "PAN",
        confidence: 0.96,
        matchedText: match[0],
        patternName: "pan"
      });
    }

    // 3. Aadhaar pattern (12 digits, optional spaces)
    const aadhaarRegex = /\b[2-9]{1}[0-9]{3}[\s-]?[0-9]{4}[\s-]?[0-9]{4}\b/g;
    while ((match = aadhaarRegex.exec(text)) !== null) {
      const cleanDigits = match[0].replace(/[\s-]/g, "");
      if (cleanDigits.length === 12) {
        // High confidence if Verhoeff passes, medium if format matches
        const isValid = RegexDetector.validateVerhoeff(cleanDigits);
        results.push({
          type: "AADHAAR",
          confidence: isValid ? 0.98 : 0.85,
          matchedText: match[0],
          patternName: "aadhaar"
        });
      }
    }

    // 4. Indian Phone
    const phoneRegex = /(?:\+91[\s-]?)?[6-9]\d{9}\b/g;
    while ((match = phoneRegex.exec(text)) !== null) {
      results.push({
        type: "PHONE",
        confidence: 0.90,
        matchedText: match[0],
        patternName: "indian_phone"
      });
    }

    // 5. Credit Card numbers (13-19 digits with Luhn)
    const cardRegex = /\b(?:\d{4}[-\s]?){3}\d{1,4}\b|\b\d{13,19}\b/g;
    while ((match = cardRegex.exec(text)) !== null) {
      const clean = match[0].replace(/[\s-]/g, "");
      if (RegexDetector.validateLuhn(clean)) {
        results.push({
          type: "CREDIT_CARD",
          confidence: 0.98,
          matchedText: match[0],
          patternName: "credit_card"
        });
      }
    }

    // 6. UPI ID
    const upiRegex = /\b[a-zA-Z0-9.\-_]{2,64}@(okaxis|okhdfcbank|okicici|oksbi|paytm|ybl|ibl|upi|axl|apl)\b/gi;
    while ((match = upiRegex.exec(text)) !== null) {
      results.push({
        type: "UPI_ID",
        confidence: 0.94,
        matchedText: match[0],
        patternName: "upi"
      });
    }

    // 7. IFSC Code
    const ifscRegex = /\b[A-Z]{4}0[A-Z0-9]{6}\b/g;
    while ((match = ifscRegex.exec(text)) !== null) {
      results.push({
        type: "IFSC",
        confidence: 0.92,
        matchedText: match[0],
        patternName: "ifsc"
      });
    }

    // 8. API Keys and Tokens
    const tokenRegex = /\b(?:ghp_[a-zA-Z0-9]{36}|sk-[a-zA-Z0-9]{32,}|AKIA[0-9A-Z]{16}|ey[A-Za-z0-9-_]+\.ey[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+)\b/g;
    while ((match = tokenRegex.exec(text)) !== null) {
      results.push({
        type: "API_KEY",
        confidence: 0.99,
        matchedText: match[0],
        patternName: "api_key_or_token"
      });
    }

    // Account numbers require a nearby account label, avoiding broad numeric false positives.
    const accountRegex = /(?:bank\s*)?(?:a\/?c|acc(?:ount)?)(?:\s*(?:no\.?|number|#|id))?\s*[:#-]?\s*([0-9]{6,18})\b/gi;
    while ((match = accountRegex.exec(text)) !== null) {
      results.push({ type: "BANK_ACCOUNT", confidence: 0.94, matchedText: match[1], patternName: "bank_account" });
    }

    // Common Indian university serial-number format, e.g. 1RV21CS001.
    const usnRegex = /\b(?:[1-9][A-Z]{2}\d{2}[A-Z]{2}\d{3}|USN\s*[:#-]?\s*[A-Z0-9-]{6,20})\b/gi;
    while ((match = usnRegex.exec(text)) !== null) {
      results.push({ type: "USN", confidence: 0.95, matchedText: match[0].replace(/^USN\s*[:#-]?\s*/i, ""), patternName: "university_serial_number" });
    }

    // Registration and ID values are only redacted when their label establishes their meaning.
    const labelledIdRegex = /\b(?:registration|reg(?:istration)?\s*(?:no\.?|number|id)|identification|identity|student\s*id|employee\s*id|roll\s*(?:no\.?|number))\s*[:#-]?\s*([A-Z0-9][A-Z0-9/-]{5,23})\b/gi;
    while ((match = labelledIdRegex.exec(text)) !== null) {
      const type = /reg(?:istration)?/i.test(match[0]) ? "REGISTRATION_NUMBER" : "IDENTIFICATION_NUMBER";
      results.push({ type, confidence: 0.92, matchedText: match[1], patternName: "labelled_identification_number" });
    }

    return results;
  }
}
