import { BoundingBox, DetectionSource, SensitiveDataType, SensitiveDetection } from "../shared/privacy";
import { DOMDetector } from "./dom-detector";
import { SemanticDetector } from "./semantic-detector";
import { RegexDetector } from "./regex-detector";
import { FaceDetector } from "./face-detector";
import { OCRDetector } from "./ocr-detector";
import { TextNodeDetector } from "./text-node-detector";
import { RiskScorer } from "./confidence";
import { BBoxMerger } from "./bbox-merger";
import { PrivacyPolicyManager } from "./privacy-policy";

export class UnifiedPrivacyEngine {
  private policyManager: PrivacyPolicyManager;

  constructor(policyManager = new PrivacyPolicyManager()) {
    this.policyManager = policyManager;
  }

  /**
   * Runs the full multi-signal privacy detection pipeline on the active DOM.
   */
  public async scanDocument(): Promise<SensitiveDetection[]> {
    const rawDetections: SensitiveDetection[] = [];

    // 1. Scan interactive elements (inputs, textareas, selects, editable regions)
    const elements = Array.from(
      document.querySelectorAll("input, textarea, select, [contenteditable='true'], [role='textbox']")
    );

    for (let i = 0; i < elements.length; i++) {
      const el = elements[i];
      const rect = el.getBoundingClientRect();

      // Skip invisible elements
      if (rect.width <= 0 || rect.height <= 0) continue;

      const signals: DetectionSource[] = [];
      let detectedType: SensitiveDataType | null = null;
      let highestConfidence = 0.0;
      let labelTag = "";

      // Signal A: DOM attribute inspection
      const domResult = DOMDetector.inspectElement(el);
      if (domResult) {
        signals.push(...domResult.sources);
        detectedType = domResult.type;
        highestConfidence = Math.max(highestConfidence, domResult.confidenceBoost);
        labelTag = domResult.reason;
      }

      // Signal B: Semantic surroundings & label inspection
      const semanticResult = SemanticDetector.inspectContext(el);
      if (semanticResult) {
        signals.push(...semanticResult.sources);
        if (!detectedType || semanticResult.confidenceBoost > highestConfidence) {
          detectedType = semanticResult.type;
        }
        highestConfidence = Math.max(highestConfidence, semanticResult.confidenceBoost);
        labelTag = labelTag ? `${labelTag}; ${semanticResult.reason}` : semanticResult.reason;
      }

      // Signal C: Regex pattern scan on current value / placeholder / textContent
      const val = (el as HTMLInputElement).value || el.textContent || el.getAttribute("placeholder") || "";
      const regexMatches = RegexDetector.scanText(val);
      if (regexMatches.length > 0) {
        signals.push("REGEX");
        const topMatch = regexMatches[0];
        if (!detectedType || topMatch.confidence > highestConfidence) {
          detectedType = topMatch.type;
        }
        highestConfidence = Math.max(highestConfidence, topMatch.confidence);
      }

      // If any sensitive signal was detected
      if (detectedType) {
        const calculatedConfidence = RiskScorer.computeScore(signals);
        const finalConfidence = Math.max(highestConfidence, calculatedConfidence);

        const bbox: BoundingBox = {
          x: Math.round(rect.left),
          y: Math.round(rect.top),
          width: Math.round(rect.width),
          height: Math.round(rect.height)
        };

        const detection: SensitiveDetection = {
          id: `dom_${i + 1}`,
          type: detectedType,
          confidence: finalConfidence,
          sources: Array.from(new Set(signals)),
          bbox,
          action: RiskScorer.resolveRedactionAction(detectedType),
          label: PrivacyPolicyManager.getPlaceholder(detectedType)
        };

        if (this.policyManager.shouldRedact(detection)) {
          rawDetections.push(detection);
        }
      }
    }

    // 2. Scan for faces
    const faceDetections = await FaceDetector.detectFacesInDocument();
    rawDetections.push(...faceDetections);

    // 3. Scan ordinary rendered text (cards, receipts, Google Forms summaries,
    // and framework components) before visual-only OCR fallbacks.
    rawDetections.push(...TextNodeDetector.scanRenderedText());

    // 4. Scan for visual-only PII via OCR metadata / canvas paths
    const ocrDetections = await OCRDetector.scanVisualText();
    rawDetections.push(...ocrDetections);

    // 5. Bounding box fusion & IoU overlap deduplication
    const fused = BBoxMerger.fuseDetections(rawDetections);

    return fused;
  }
}
