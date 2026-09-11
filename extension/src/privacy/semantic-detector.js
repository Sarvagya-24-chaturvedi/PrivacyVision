export class SemanticDetector {
    static LABEL_PATTERNS = [
        { regex: /\b(?:password|enter password|new password|confirm password)\b/i, type: "PASSWORD" },
        { regex: /\b(?:pin|mpin|atm pin)\b/i, type: "PIN" },
        { regex: /\b(?:otp|one time password|verification code)\b/i, type: "OTP" },
        { regex: /\b(?:aadhaar|aadhaar number|uidai|unique identification)\b/i, type: "AADHAAR" },
        { regex: /\b(?:pan|pan number|permanent account number)\b/i, type: "PAN" },
        { regex: /\b(?:ifsc|ifsc code)\b/i, type: "IFSC" },
        { regex: /\b(?:upi id|vpa|virtual payment address)\b/i, type: "UPI_ID" },
        { regex: /\b(?:card number|credit card|debit card)\b/i, type: "CREDIT_CARD" },
        { regex: /\b(?:cvv|cvc|security code)\b/i, type: "CVV" },
        { regex: /\b(?:bank account|account number)\b/i, type: "BANK_ACCOUNT" },
        { regex: /\b(?:account holder|account name|beneficiary name)\b/i, type: "NAME" },
        { regex: /\b(?:registration number|registration no|reg no)\b/i, type: "REGISTRATION_NUMBER" },
        { regex: /\b(?:usn|university serial number)\b/i, type: "USN" },
        { regex: /\b(?:identification number|identity number|student id|employee id)\b/i, type: "IDENTIFICATION_NUMBER" },
        { regex: /\b(?:email|email address|e-mail)\b/i, type: "EMAIL" },
        { regex: /\b(?:phone|mobile number|phone number)\b/i, type: "PHONE" },
        { regex: /\b(?:date of birth|dob|birth date)\b/i, type: "DOB" },
        { regex: /\b(?:api key|secret key|token)\b/i, type: "API_KEY" }
    ];
    /**
     * Inspects labels, surrounding text, and form context for an element.
     */
    static inspectContext(el) {
        // Collect associated label text
        let labelText = "";
        // 1. Explicit <label for="id">
        if (el.id) {
            const explicitLabel = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
            if (explicitLabel) {
                labelText += " " + (explicitLabel.textContent || "");
            }
        }
        // 2. Parent <label>
        const parentLabel = el.closest("label");
        if (parentLabel) {
            labelText += " " + (parentLabel.textContent || "");
        }
        // 3. aria-labelledby
        const labelledby = el.getAttribute("aria-labelledby");
        if (labelledby) {
            const ids = labelledby.split(/\s+/);
            for (const id of ids) {
                const refEl = document.getElementById(id);
                if (refEl) {
                    labelText += " " + (refEl.textContent || "");
                }
            }
        }
        // 4. Preceding sibling element or table cell
        if (el.previousElementSibling) {
            labelText += " " + (el.previousElementSibling.textContent || "");
        }
        const cell = el.closest("td");
        if (cell && cell.previousElementSibling) {
            labelText += " " + (cell.previousElementSibling.textContent || "");
        }
        // Google Forms and many design-system forms use an ARIA list item as the
        // question container rather than a native <label> element.
        const questionContainer = el.closest("[role='listitem'], [role='group'], fieldset, .freebirdFormviewerViewItemsItemItem");
        if (questionContainer) {
            labelText += " " + (questionContainer.textContent || "").slice(0, 500);
        }
        labelText = labelText.toLowerCase().trim();
        if (!labelText)
            return null;
        // Check against patterns
        for (const pattern of this.LABEL_PATTERNS) {
            if (pattern.regex.test(labelText)) {
                return {
                    type: pattern.type,
                    sources: ["SEMANTIC"],
                    confidenceBoost: 0.35,
                    reason: `Associated label/text contains "${pattern.type.toLowerCase()}" context`
                };
            }
        }
        return null;
    }
}
