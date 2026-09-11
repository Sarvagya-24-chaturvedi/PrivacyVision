import { ActionType, AgentAction } from "../shared/actions";

export const ALLOWED_ACTIONS: ActionType[] = [
  "CLICK",
  "SCROLL",
  "FOCUS",
  "TYPE",
  "SELECT",
  "PRESS_KEY",
  "WAIT"
];

export function isAllowedAction(action: string): action is ActionType {
  return ALLOWED_ACTIONS.includes(action as ActionType);
}

export function sanitizeActionInput(raw: any): AgentAction | null {
  if (!raw || typeof raw !== "object") return null;
  const actionType = String(raw.action || "").toUpperCase();

  if (!isAllowedAction(actionType)) return null;

  switch (actionType) {
    case "CLICK":
      return {
        action: "CLICK",
        target: {
          agentId: raw.target?.agentId ? String(raw.target.agentId) : undefined,
          x: typeof raw.target?.x === "number" ? raw.target.x : undefined,
          y: typeof raw.target?.y === "number" ? raw.target.y : undefined
        },
        reason: raw.reason ? String(raw.reason) : undefined
      };

    case "SCROLL":
      return {
        action: "SCROLL",
        direction: ["UP", "DOWN", "LEFT", "RIGHT"].includes(String(raw.direction).toUpperCase())
          ? (String(raw.direction).toUpperCase() as any)
          : "DOWN",
        amount: typeof raw.amount === "number" ? Math.min(2000, Math.max(10, raw.amount)) : 300,
        reason: raw.reason ? String(raw.reason) : undefined
      };

    case "FOCUS":
      return {
        action: "FOCUS",
        target: {
          agentId: raw.target?.agentId ? String(raw.target.agentId) : undefined
        },
        reason: raw.reason ? String(raw.reason) : undefined
      };

    case "TYPE":
      return {
        action: "TYPE",
        target: {
          agentId: raw.target?.agentId ? String(raw.target.agentId) : undefined
        },
        text: String(raw.text || ""),
        reason: raw.reason ? String(raw.reason) : undefined
      };

    case "SELECT":
      return {
        action: "SELECT",
        target: {
          agentId: raw.target?.agentId ? String(raw.target.agentId) : undefined
        },
        value: String(raw.value || ""),
        reason: raw.reason ? String(raw.reason) : undefined
      };

    case "PRESS_KEY":
      return {
        action: "PRESS_KEY",
        key: String(raw.key || "Enter"),
        reason: raw.reason ? String(raw.reason) : undefined
      };

    case "WAIT":
      return {
        action: "WAIT",
        ms: typeof raw.ms === "number" ? Math.min(10000, Math.max(100, raw.ms)) : 1000,
        reason: raw.reason ? String(raw.reason) : undefined
      };

    default:
      return null;
  }
}
