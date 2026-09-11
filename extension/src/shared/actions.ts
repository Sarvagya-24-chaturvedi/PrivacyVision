export type ActionType =
  | "CLICK"
  | "SCROLL"
  | "FOCUS"
  | "TYPE"
  | "SELECT"
  | "PRESS_KEY"
  | "WAIT";

export interface ActionTarget {
  agentId?: string;
  x?: number;
  y?: number;
}

export type ScrollDirection = "UP" | "DOWN" | "LEFT" | "RIGHT";

export interface BaseAction {
  action: ActionType;
  reason?: string;
}

export interface ClickAction extends BaseAction {
  action: "CLICK";
  target: ActionTarget;
}

export interface ScrollAction extends BaseAction {
  action: "SCROLL";
  direction: ScrollDirection;
  amount: number;
}

export interface FocusAction extends BaseAction {
  action: "FOCUS";
  target: ActionTarget;
}

export interface TypeAction extends BaseAction {
  action: "TYPE";
  target: ActionTarget;
  text: string;
}

export interface SelectAction extends BaseAction {
  action: "SELECT";
  target: ActionTarget;
  value: string;
}

export interface PressKeyAction extends BaseAction {
  action: "PRESS_KEY";
  key: string;
}

export interface WaitAction extends BaseAction {
  action: "WAIT";
  ms: number;
}

export type AgentAction =
  | ClickAction
  | ScrollAction
  | FocusAction
  | TypeAction
  | SelectAction
  | PressKeyAction
  | WaitAction;

export interface ActionValidationResult {
  valid: boolean;
  reason?: string;
  action?: AgentAction;
}

export interface ActionExecutionResult {
  success: boolean;
  action: AgentAction;
  message: string;
  executionTimeMs: number;
}
