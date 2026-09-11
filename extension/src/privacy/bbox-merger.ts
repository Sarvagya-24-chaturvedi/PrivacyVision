import { BoundingBox, SensitiveDetection, RedactionAction } from "../shared/privacy";

export class BBoxMerger {
  /**
   * Calculates Intersection over Union (IoU) between two bounding boxes.
   */
  public static computeIoU(b1: BoundingBox, b2: BoundingBox): number {
    const xLeft = Math.max(b1.x, b2.x);
    const yTop = Math.max(b1.y, b2.y);
    const xRight = Math.min(b1.x + b1.width, b2.x + b2.width);
    const yBottom = Math.min(b1.y + b1.height, b2.y + b2.height);

    if (xRight <= xLeft || yBottom <= yTop) {
      return 0.0;
    }

    const intersectionArea = (xRight - xLeft) * (yBottom - yTop);
    const b1Area = b1.width * b1.height;
    const b2Area = b2.width * b2.height;
    const unionArea = b1Area + b2Area - intersectionArea;

    if (unionArea <= 0) return 0.0;
    return intersectionArea / unionArea;
  }

  /**
   * Checks if one box is substantially nested within another (>70% overlap of smaller box)
   * or if they are touching/adjacent within a small padding distance.
   */
  public static isOverlappingOrNested(b1: BoundingBox, b2: BoundingBox, padding = 4): boolean {
    const xLeft = Math.max(b1.x, b2.x);
    const yTop = Math.max(b1.y, b2.y);
    const xRight = Math.min(b1.x + b1.width, b2.x + b2.width);
    const yBottom = Math.min(b1.y + b1.height, b2.y + b2.height);

    if (xRight > xLeft && yBottom > yTop) {
      const intersectionArea = (xRight - xLeft) * (yBottom - yTop);
      const minArea = Math.min(b1.width * b1.height, b2.width * b2.height);
      if (minArea > 0 && intersectionArea / minArea > 0.5) {
        return true;
      }
    }

    // Check adjacent within padding
    const closeX = Math.abs(b1.x - b2.x) < padding || Math.abs(b1.x + b1.width - b2.x) < padding || Math.abs(b2.x + b2.width - b1.x) < padding;
    const closeY = Math.abs(b1.y - b2.y) < padding || Math.abs(b1.y + b1.height - b2.y) < padding || Math.abs(b2.y + b2.height - b1.y) < padding;
    const hasSpatialTouch = (b1.x <= b2.x + b2.width + padding && b1.x + b1.width + padding >= b2.x &&
                             b1.y <= b2.y + b2.height + padding && b1.y + b1.height + padding >= b2.y);

    return (this.computeIoU(b1, b2) > 0.25) || (hasSpatialTouch && (closeX && closeY));
  }

  /**
   * Fuses and deduplicates an array of sensitive detections.
   */
  public static fuseDetections(detections: SensitiveDetection[]): SensitiveDetection[] {
    if (detections.length <= 1) return [...detections];

    const pool = [...detections];
    const fused: SensitiveDetection[] = [];

    while (pool.length > 0) {
      let current = pool.shift()!;
      let mergedAny = true;

      while (mergedAny) {
        mergedAny = false;
        for (let i = 0; i < pool.length; i++) {
          const candidate = pool[i];

          if (this.isOverlappingOrNested(current.bbox, candidate.bbox) || this.computeIoU(current.bbox, candidate.bbox) > 0.2) {
            // Merge candidate into current
            const minX = Math.min(current.bbox.x, candidate.bbox.x);
            const minY = Math.min(current.bbox.y, candidate.bbox.y);
            const maxX = Math.max(current.bbox.x + current.bbox.width, candidate.bbox.x + candidate.bbox.width);
            const maxY = Math.max(current.bbox.y + current.bbox.height, candidate.bbox.y + candidate.bbox.height);

            const mergedBBox: BoundingBox = {
              x: Math.round(minX),
              y: Math.round(minY),
              width: Math.round(maxX - minX),
              height: Math.round(maxY - minY)
            };

            // Strongest action selection
            let mergedAction: RedactionAction = current.action;
            if (candidate.action === "BLACKOUT" || current.action === "BLACKOUT") {
              mergedAction = "BLACKOUT";
            } else if (candidate.action === "MASK" || current.action === "MASK") {
              mergedAction = "MASK";
            }

            // Combine sources
            const mergedSources = Array.from(new Set([...current.sources, ...candidate.sources]));
            const mergedConfidence = Math.max(current.confidence, candidate.confidence);
            const dominantType = current.confidence >= candidate.confidence ? current.type : candidate.type;

            current = {
              ...current,
              id: `${current.id}_${candidate.id}`,
              type: dominantType,
              confidence: mergedConfidence,
              sources: mergedSources,
              bbox: mergedBBox,
              action: mergedAction,
              label: current.label || candidate.label
            };

            // Remove candidate from pool and restart loop
            pool.splice(i, 1);
            mergedAny = true;
            break;
          }
        }
      }

      fused.push(current);
    }

    return fused;
  }
}
