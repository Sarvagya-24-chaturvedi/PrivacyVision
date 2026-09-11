import { SensitiveDetection } from "../shared/privacy";
import { PrivacyPolicyManager } from "./privacy-policy";
import { RegexDetector } from "./regex-detector";

/**
 * Finds sensitive values that are rendered as ordinary page text.  This is
 * deliberately DOM-native: it works on arbitrary sites (including Google
 * Forms and SPAs) without sending text or pixels to a remote OCR service.
 */
export class TextNodeDetector {
  private static readonly MAX_NODES = 2_000;
  private static readonly MAX_DETECTIONS = 150;

  public static scanRenderedText(): SensitiveDetection[] {
    const detections: SensitiveDetection[] = [];
    const roots: Array<Document | ShadowRoot> = [document];
    const seenRoots = new Set<Document | ShadowRoot>(roots);

    // Discover open shadow roots so component-based forms are covered too.
    for (let i = 0; i < roots.length; i++) {
      roots[i].querySelectorAll("*").forEach((element) => {
        if (element.shadowRoot && !seenRoots.has(element.shadowRoot)) {
          roots.push(element.shadowRoot);
          seenRoots.add(element.shadowRoot);
        }
      });
    }

    let visited = 0;
    for (const root of roots) {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let node: Text | null;
      while ((node = walker.nextNode() as Text | null) && visited++ < this.MAX_NODES) {
        const parent = node.parentElement;
        const text = node.nodeValue || "";
        if (!parent || !text.trim() || /^(SCRIPT|STYLE|NOSCRIPT|TEXTAREA|OPTION)$/i.test(parent.tagName)) continue;

        const style = window.getComputedStyle(parent);
        if (style.display === "none" || style.visibility === "hidden") continue;

        for (const match of RegexDetector.scanText(text)) {
          const start = text.indexOf(match.matchedText);
          if (start < 0) continue;
          const range = document.createRange();
          range.setStart(node, start);
          range.setEnd(node, start + match.matchedText.length);
          const rect = Array.from(range.getClientRects()).find((candidate) => candidate.width > 0 && candidate.height > 0);
          range.detach();
          if (!rect) continue;

          detections.push({
            id: `text_${detections.length + 1}_${match.type}`,
            type: match.type,
            confidence: match.confidence,
            sources: ["REGEX"],
            bbox: { x: Math.round(rect.left), y: Math.round(rect.top), width: Math.round(rect.width), height: Math.round(rect.height) },
            action: match.type === "API_KEY" ? "BLACKOUT" : "MASK",
            label: PrivacyPolicyManager.getPlaceholder(match.type)
          });
          if (detections.length >= this.MAX_DETECTIONS) return detections;
        }
      }
    }
    return detections;
  }
}
