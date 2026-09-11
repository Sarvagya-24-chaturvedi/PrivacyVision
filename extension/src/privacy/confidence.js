export class RiskScorer {
    /**
     * Calculates normalized risk score (0.00 to 1.00) based on multiple signals.
     */
    static computeScore(signals) {
        let rawScore = 0;
        for (const source of signals) {
            switch (source) {
                case "DOM":
                    rawScore += 0.30;
                    break;
                case "SEMANTIC":
                    rawScore += 0.35;
                    break;
                case "AUTOCOMPLETE":
                    rawScore += 0.20;
                    break;
                case "REGEX":
                    rawScore += 0.25;
                    break;
                case "OCR":
                    rawScore += 0.20;
                    break;
                case "FACE":
                    rawScore += 0.35;
                    break;
                case "VISION_MODEL":
                    rawScore += 0.25;
                    break;
            }
        }
        // Direct strong indicators can boost confidence
        if (signals.includes("DOM") && signals.includes("SEMANTIC")) {
            rawScore += 0.20;
        }
        if (signals.includes("REGEX") && signals.includes("SEMANTIC")) {
            rawScore += 0.20;
        }
        // Normalize between 0.00 and 1.00
        const clamped = Math.min(1.0, Math.max(0.0, rawScore));
        return Math.round(clamped * 100) / 100;
    }
    static getTier(score) {
        if (score >= 0.85)
            return "HIGH";
        if (score >= 0.60)
            return "MEDIUM";
        return "LOW";
    }
    static resolveRedactionAction(type) {
        switch (type) {
            case "PASSWORD":
            case "API_KEY":
            case "SECRET":
            case "ACCESS_TOKEN":
            case "BEARER_TOKEN":
            case "PIN":
            case "OTP":
                return "BLACKOUT";
            case "FACE":
                return "BLUR";
            case "EMAIL":
            case "PHONE":
            case "AADHAAR":
            case "PAN":
            case "CREDIT_CARD":
            case "CVV":
            case "UPI_ID":
            case "BANK_ACCOUNT":
            case "IFSC":
            case "ADDRESS":
            case "DOB":
            case "NAME":
            case "OCR_TEXT":
            default:
                return "MASK";
        }
    }
}
