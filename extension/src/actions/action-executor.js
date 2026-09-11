export class ActionExecutor {
    /**
     * Executes a locally validated browser agent action.
     */
    static async execute(action) {
        const startTime = performance.now();
        try {
            switch (action.action) {
                case "CLICK": {
                    let targetEl = null;
                    if (action.target.agentId) {
                        targetEl = document.querySelector(`[data-agent-id="${CSS.escape(action.target.agentId)}"]`);
                    }
                    if (!targetEl && typeof action.target.x === "number" && typeof action.target.y === "number") {
                        targetEl = document.elementFromPoint(action.target.x, action.target.y);
                    }
                    if (!targetEl) {
                        throw new Error(`Click target not found: ${JSON.stringify(action.target)}`);
                    }
                    // Scroll into view smoothly if not visible
                    targetEl.scrollIntoView({ behavior: "smooth", block: "center" });
                    // Dispatch standard event sequence
                    targetEl.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true }));
                    targetEl.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }));
                    targetEl.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, cancelable: true }));
                    targetEl.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, cancelable: true }));
                    targetEl.click();
                    return {
                        success: true,
                        action,
                        message: `Clicked element [${action.target.agentId || targetEl.tagName}]`,
                        executionTimeMs: Math.round(performance.now() - startTime)
                    };
                }
                case "FOCUS": {
                    const el = document.querySelector(`[data-agent-id="${CSS.escape(action.target.agentId || "")}"]`);
                    if (!el) {
                        throw new Error(`Focus target not found: ${action.target.agentId}`);
                    }
                    el.focus();
                    return {
                        success: true,
                        action,
                        message: `Focused element [${action.target.agentId}]`,
                        executionTimeMs: Math.round(performance.now() - startTime)
                    };
                }
                case "TYPE": {
                    const inputEl = document.querySelector(`[data-agent-id="${CSS.escape(action.target.agentId || "")}"]`);
                    if (!inputEl) {
                        throw new Error(`Type target not found: ${action.target.agentId}`);
                    }
                    inputEl.focus();
                    inputEl.value = action.text;
                    inputEl.dispatchEvent(new Event("input", { bubbles: true }));
                    inputEl.dispatchEvent(new Event("change", { bubbles: true }));
                    return {
                        success: true,
                        action,
                        message: `Typed into element [${action.target.agentId}]`,
                        executionTimeMs: Math.round(performance.now() - startTime)
                    };
                }
                case "SCROLL": {
                    let deltaY = 0;
                    let deltaX = 0;
                    if (action.direction === "DOWN")
                        deltaY = action.amount;
                    if (action.direction === "UP")
                        deltaY = -action.amount;
                    if (action.direction === "RIGHT")
                        deltaX = action.amount;
                    if (action.direction === "LEFT")
                        deltaX = -action.amount;
                    window.scrollBy({ top: deltaY, left: deltaX, behavior: "smooth" });
                    return {
                        success: true,
                        action,
                        message: `Scrolled ${action.direction} by ${action.amount}px`,
                        executionTimeMs: Math.round(performance.now() - startTime)
                    };
                }
                case "SELECT": {
                    const selectEl = document.querySelector(`[data-agent-id="${CSS.escape(action.target.agentId || "")}"]`);
                    if (!selectEl) {
                        throw new Error(`Select target not found: ${action.target.agentId}`);
                    }
                    selectEl.value = action.value;
                    selectEl.dispatchEvent(new Event("change", { bubbles: true }));
                    return {
                        success: true,
                        action,
                        message: `Selected value "${action.value}" on [${action.target.agentId}]`,
                        executionTimeMs: Math.round(performance.now() - startTime)
                    };
                }
                case "PRESS_KEY": {
                    const active = document.activeElement || document.body;
                    active.dispatchEvent(new KeyboardEvent("keydown", { key: action.key, bubbles: true }));
                    active.dispatchEvent(new KeyboardEvent("keyup", { key: action.key, bubbles: true }));
                    return {
                        success: true,
                        action,
                        message: `Pressed key "${action.key}"`,
                        executionTimeMs: Math.round(performance.now() - startTime)
                    };
                }
                case "WAIT": {
                    await new Promise((resolve) => setTimeout(resolve, action.ms));
                    return {
                        success: true,
                        action,
                        message: `Waited for ${action.ms}ms`,
                        executionTimeMs: Math.round(performance.now() - startTime)
                    };
                }
                default:
                    throw new Error(`Unsupported action execution: ${action.action}`);
            }
        }
        catch (err) {
            return {
                success: false,
                action,
                message: err.message || "Action execution failed",
                executionTimeMs: Math.round(performance.now() - startTime)
            };
        }
    }
}
