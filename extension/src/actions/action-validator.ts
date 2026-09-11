import { ActionValidationResult, AgentAction } from "../shared/actions";
import { ALLOWED_ACTIONS } from "./action-schema";

export class ActionValidator {
  /**
   * Validates an incoming agent action against security policies and DOM state.
   */
  public static validate(action: AgentAction): ActionValidationResult {
    // 1. Action type allowed check
    if (!ALLOWED_ACTIONS.includes(action.action)) {
      return {
        valid: false,
        reason: `Disallowed action type: ${action.action}`
      };
    }

    // 2. Reject suspicious injection payloads in typing
    if (action.action === "TYPE") {
      if (
        action.text.includes("<script") ||
        action.text.startsWith("javascript:") ||
        action.text.includes("eval(")
      ) {
        return {
          valid: false,
          reason: "Suspicious script payload detected in typing action"
        };
      }
    }

    // 3. Target element validation if target specified
    if ("target" in action && action.target?.agentId) {
      const el = document.querySelector(`[data-agent-id="${CSS.escape(action.target.agentId)}"]`);
      if (!el) {
        return {
          valid: false,
          reason: `Target element with agentId "${action.target.agentId}" no longer exists in DOM`
        };
      }

      // Check visibility
      const style = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      const isVisible =
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        parseFloat(style.opacity || "1") > 0 &&
        rect.width > 0 &&
        rect.height > 0;

      if (!isVisible) {
        return {
          valid: false,
          reason: `Target element "${action.target.agentId}" is hidden or has 0 dimensions`
        };
      }

      // Check disabled state
      if ((el as HTMLButtonElement | HTMLInputElement).disabled) {
        return {
          valid: false,
          reason: `Target element "${action.target.agentId}" is disabled`
        };
      }
    }

    // 4. Scroll limits check
    if (action.action === "SCROLL") {
      if (action.amount < 0 || action.amount > 5000) {
        return {
          valid: false,
          reason: `Scroll amount out of allowed bounds: ${action.amount}`
        };
      }
    }

    return {
      valid: true,
      action
    };
  }
}
