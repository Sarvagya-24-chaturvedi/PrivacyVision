import { RiskScorer } from "./confidence";
export class PrivacyPolicyManager {
    policy;
    constructor(policy) {
        this.policy = {
            highThreshold: 0.85,
            mediumThreshold: 0.60,
            defensiveMode: true,
            allowBlurForFaces: true,
            maskString: "[REDACTED]",
            ...policy
        };
    }
    shouldRedact(detection) {
        const tier = RiskScorer.getTier(detection.confidence);
        if (tier === "HIGH") {
            return true;
        }
        if (tier === "MEDIUM") {
            // In defensive mode, redact any credential, financial, identity, or contact field
            if (this.policy.defensiveMode) {
                return true;
            }
            return [
                "PASSWORD",
                "API_KEY",
                "SECRET",
                "ACCESS_TOKEN",
                "BEARER_TOKEN",
                "CREDIT_CARD",
                "CVV",
                "AADHAAR",
                "PAN",
                "BANK_ACCOUNT"
            ].includes(detection.type);
        }
        // LOW tier
        if (this.policy.defensiveMode && (detection.type === "PASSWORD" || detection.type === "CREDIT_CARD")) {
            return true;
        }
        return false;
    }
    static getPlaceholder(type) {
        switch (type) {
            case "PASSWORD":
            case "PIN":
            case "OTP":
                return "[PASSWORD_REDACTED]";
            case "EMAIL":
                return "[EMAIL_REDACTED]";
            case "PHONE":
                return "[PHONE_REDACTED]";
            case "CREDIT_CARD":
            case "CVV":
                return "[CARD_REDACTED]";
            case "AADHAAR":
                return "[AADHAAR_REDACTED]";
            case "PAN":
                return "[PAN_REDACTED]";
            case "BANK_ACCOUNT":
                return "[ACCOUNT_REDACTED]";
            case "USN":
                return "[USN_REDACTED]";
            case "REGISTRATION_NUMBER":
            case "IDENTIFICATION_NUMBER":
                return "[ID_REDACTED]";
            case "FACE":
                return "[FACE_REDACTED]";
            case "API_KEY":
            case "SECRET":
            case "ACCESS_TOKEN":
            case "BEARER_TOKEN":
                return "[SECRET_REDACTED]";
            default:
                return "[PII_REDACTED]";
        }
    }
}
