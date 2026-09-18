import { ExtractedDOMContext, PrivacySafeDOMNode, ViewportInfo } from "../shared/dom";
import { UnifiedPrivacyEngine } from "../privacy/detector";
import { SensitiveDetection } from "../shared/privacy";
import { RegexDetector } from "../privacy/regex-detector";
import { PrivacyPolicyManager } from "../privacy/privacy-policy";

export class DOMExtractor {
  private static agentCounter = 1;

  public static async extract(engine: UnifiedPrivacyEngine): Promise<{
    context: ExtractedDOMContext;
    detections: SensitiveDetection[];
  }> {
    // 1. Run local privacy detection
    const detections = await engine.scanDocument();

    // Tag elements with agentId and collect interactive nodes
    const interactiveElements = Array.from(
      document.querySelectorAll(
        "button, a[href], input, textarea, select, [role='button'], [role='link'], [role='textbox'], [contenteditable='true']"
      )
    );

    const safeNodes: PrivacySafeDOMNode[] = [];

    for (const el of interactiveElements) {
      const rect = el.getBoundingClientRect();
      // Skip invisible elements
      if (rect.width <= 0 || rect.height <= 0) continue;

      // Assign stable data-agent-id
      let agentId = el.getAttribute("data-agent-id");
      if (!agentId) {
        agentId = `el-${this.agentCounter++}`;
        el.setAttribute("data-agent-id", agentId);
      }

      // Check if this element matches any sensitive detection by spatial overlap or containment
      let matchedDetection: SensitiveDetection | undefined;
      for (const det of detections) {
        const overlapX =
          (rect.left >= det.bbox.x - 10 && rect.left <= det.bbox.x + det.bbox.width + 10) ||
          Math.abs(rect.left - det.bbox.x) < 25;
        const overlapY =
          (rect.top >= det.bbox.y - 10 && rect.top <= det.bbox.y + det.bbox.height + 10) ||
          Math.abs(rect.top - det.bbox.y) < 25;
        if (overlapX && overlapY) {
          matchedDetection = det;
          break;
        }
      }

      let isSensitive = !!matchedDetection;
      let sensitiveType = matchedDetection?.type;
      const tag = el.tagName.toLowerCase();
      const type = (el.getAttribute("type") || "").toLowerCase();
      const role = el.getAttribute("role") || (tag === "button" ? "button" : tag === "input" ? "textbox" : tag);
      const isInput = tag === "input" || tag === "textarea";

      // Input value: strictly redacted if sensitive
      let val: string | undefined = undefined;
      let placeholder: string | undefined = undefined;

      if (isInput) {
        val = (el as HTMLInputElement).value;
        placeholder = el.getAttribute("placeholder") || undefined;

        if (isSensitive || type === "password") {
          val = "[REDACTED]";
          placeholder = "[REDACTED]";
        } else {
          // Check for any raw PII in value/placeholder
          if (val && RegexDetector.scanText(val).length > 0) {
            val = "[REDACTED]";
            isSensitive = true;
          }
          if (placeholder && RegexDetector.scanText(placeholder).length > 0) {
            placeholder = "[REDACTED]";
            isSensitive = true;
          }
        }
      }

      // Structural text: truncate and thoroughly sanitize
      let text = (el.textContent || "").replace(/\s+/g, " ").trim();
      if (text.length > 80) text = text.slice(0, 77) + "...";

      if (isSensitive && matchedDetection) {
        text = matchedDetection.label || PrivacyPolicyManager.getPlaceholder(matchedDetection.type);
      } else if (text) {
        // Actively scan node text for any raw PII (emails, phones, cards, Aadhaar, PAN)
        const textMatches = RegexDetector.scanText(text);
        if (textMatches.length > 0) {
          isSensitive = true;
          sensitiveType = sensitiveType || textMatches[0].type;
          for (const m of textMatches) {
            if (m.type !== "OCR_TEXT") {
              const ph = PrivacyPolicyManager.getPlaceholder(m.type);
              text = text.split(m.matchedText).join(ph);
            }
          }
        }
      }

      // Sanitize aria-label if present
      let ariaLabel = el.getAttribute("aria-label") || undefined;
      if (ariaLabel) {
        const labelMatches = RegexDetector.scanText(ariaLabel);
        if (labelMatches.length > 0) {
          for (const m of labelMatches) {
            if (m.type !== "OCR_TEXT") {
              ariaLabel = ariaLabel.split(m.matchedText).join(PrivacyPolicyManager.getPlaceholder(m.type));
            }
          }
        }
      }

      safeNodes.push({
        agentId,
        tag,
        role,
        type: type || undefined,
        label: ariaLabel,
        placeholder,
        value: val,
        text,
        bbox: {
          x: Math.round(rect.left),
          y: Math.round(rect.top),
          width: Math.round(rect.width),
          height: Math.round(rect.height)
        },
        sensitive: isSensitive,
        sensitiveType,
        confidence: matchedDetection?.confidence || (isSensitive ? 0.95 : undefined),
        interactable: !(el as HTMLButtonElement).disabled,
        disabled: (el as HTMLButtonElement).disabled
      });
    }

    const viewport: ViewportInfo = {
      width: window.innerWidth,
      height: window.innerHeight,
      dpr: window.devicePixelRatio || 1,
      scrollX: window.scrollX,
      scrollY: window.scrollY
    };

    const context: ExtractedDOMContext = {
      url: window.location.href,
      title: document.title,
      viewport,
      nodes: safeNodes,
      sensitiveDetections: detections,
      timestamp: Date.now()
    };

    return { context, detections };
  }
}
