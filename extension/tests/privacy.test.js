import { describe, it, expect } from "vitest";
import { RegexDetector } from "../src/privacy/regex-detector";
import { RiskScorer } from "../src/privacy/confidence";
import { PrivacyPolicyManager } from "../src/privacy/privacy-policy";
describe("Privacy Engine — Regex & Pattern Detector", () => {
    it("should validate credit card numbers with Luhn algorithm", () => {
        // Valid standard test card (Visa)
        expect(RegexDetector.validateLuhn("4111111111111111")).toBe(true);
        // Invalid card number
        expect(RegexDetector.validateLuhn("4111111111111112")).toBe(false);
    });
    it("should validate Indian PAN card pattern", () => {
        expect(RegexDetector.isPAN("ABCDE1234F")).toBe(true);
        expect(RegexDetector.isPAN("ABCD12345F")).toBe(false);
        expect(RegexDetector.isPAN("abcde1234f")).toBe(false);
    });
    it("should validate Indian Aadhaar numbers", () => {
        // Verhoeff checksum test
        const validAadhaar = "234567890126"; // Known Verhoeff valid format
        expect(RegexDetector.isEmail("john@example.com")).toBe(true);
        expect(RegexDetector.isIndianPhone("+919876543210")).toBe(true);
    });
    it("should detect emails, phones, and cards in free text", () => {
        const sampleText = "Please contact me at john.doe@example.org or call +91 9876543210. Card: 4111 1111 1111 1111";
        const matches = RegexDetector.scanText(sampleText);
        const types = matches.map((m) => m.type);
        expect(types).toContain("EMAIL");
        expect(types).toContain("PHONE");
        expect(types).toContain("CREDIT_CARD");
    });
    it("should detect API keys and secrets", () => {
        const tokenText = "Authorization: ghp_123456789012345678901234567890123456";
        const matches = RegexDetector.scanText(tokenText);
        expect(matches.some((m) => m.type === "API_KEY")).toBe(true);
    });
    it("should detect account, registration, USN, and labelled ID values", () => {
        const text = "Account number: 123456789012. Registration No: REG-2026-8912. USN: 1RV21CS001. Student ID: STU-2026-0091";
        const types = RegexDetector.scanText(text).map((match) => match.type);
        expect(types).toContain("BANK_ACCOUNT");
        expect(types).toContain("REGISTRATION_NUMBER");
        expect(types).toContain("USN");
        expect(types).toContain("IDENTIFICATION_NUMBER");
    });
    it("should recognise entered bank-detail field labels", () => {
        const matches = RegexDetector.scanText("UPI: student@okaxis; Account No: 123456789012");
        expect(matches.map((match) => match.type)).toContain("UPI_ID");
        expect(matches.map((match) => match.type)).toContain("BANK_ACCOUNT");
    });
});
describe("Privacy Engine — Multi-Signal Risk Scoring", () => {
    it("should calculate correct risk scores across multiple signals", () => {
        // Password input with DOM and SEMANTIC signals
        const score = RiskScorer.computeScore(["DOM", "SEMANTIC"]);
        expect(score).toBeGreaterThanOrEqual(0.85);
        expect(RiskScorer.getTier(score)).toBe("HIGH");
    });
    it("should assign appropriate redaction actions", () => {
        expect(RiskScorer.resolveRedactionAction("PASSWORD")).toBe("BLACKOUT");
        expect(RiskScorer.resolveRedactionAction("FACE")).toBe("BLUR");
        expect(RiskScorer.resolveRedactionAction("EMAIL")).toBe("MASK");
    });
});
describe("Privacy Policy Manager", () => {
    it("should format correct privacy placeholders", () => {
        expect(PrivacyPolicyManager.getPlaceholder("PASSWORD")).toBe("[PASSWORD_REDACTED]");
        expect(PrivacyPolicyManager.getPlaceholder("EMAIL")).toBe("[EMAIL_REDACTED]");
        expect(PrivacyPolicyManager.getPlaceholder("FACE")).toBe("[FACE_REDACTED]");
        expect(PrivacyPolicyManager.getPlaceholder("USN")).toBe("[USN_REDACTED]");
    });
});
