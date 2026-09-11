import { describe, it, expect } from "vitest";
import { BBoxMerger } from "../src/privacy/bbox-merger";
describe("Bounding Box Merger & IoU Fusion Layer", () => {
    it("should calculate correct IoU for disjoint boxes", () => {
        const b1 = { x: 0, y: 0, width: 100, height: 50 };
        const b2 = { x: 200, y: 200, width: 100, height: 50 };
        expect(BBoxMerger.computeIoU(b1, b2)).toBe(0.0);
    });
    it("should calculate correct IoU for identical boxes", () => {
        const b1 = { x: 50, y: 50, width: 100, height: 100 };
        const b2 = { x: 50, y: 50, width: 100, height: 100 };
        expect(BBoxMerger.computeIoU(b1, b2)).toBe(1.0);
    });
    it("should calculate correct IoU for partially overlapping boxes", () => {
        const b1 = { x: 0, y: 0, width: 100, height: 100 };
        const b2 = { x: 50, y: 0, width: 100, height: 100 };
        // Intersection = 50 * 100 = 5000. Union = 10000 + 10000 - 5000 = 15000. IoU = 1/3 ~ 0.333
        const iou = BBoxMerger.computeIoU(b1, b2);
        expect(iou).toBeCloseTo(0.333, 2);
    });
    it("should merge overlapping sensitive detections into a single bounding envelope", () => {
        const d1 = {
            id: "det_1",
            type: "PASSWORD",
            confidence: 0.95,
            sources: ["DOM"],
            bbox: { x: 100, y: 100, width: 150, height: 40 },
            action: "BLACKOUT"
        };
        const d2 = {
            id: "det_2",
            type: "PASSWORD",
            confidence: 0.88,
            sources: ["SEMANTIC"],
            bbox: { x: 120, y: 105, width: 160, height: 38 },
            action: "BLACKOUT"
        };
        const merged = BBoxMerger.fuseDetections([d1, d2]);
        expect(merged.length).toBe(1);
        expect(merged[0].bbox.x).toBe(100);
        expect(merged[0].bbox.width).toBe(180); // 100 to 280
        expect(merged[0].sources).toContain("DOM");
        expect(merged[0].sources).toContain("SEMANTIC");
    });
    it("should preserve strongest redaction action during fusion", () => {
        const maskDet = {
            id: "mask_1",
            type: "EMAIL",
            confidence: 0.75,
            sources: ["DOM"],
            bbox: { x: 50, y: 50, width: 100, height: 30 },
            action: "MASK"
        };
        const blackoutDet = {
            id: "blackout_1",
            type: "PASSWORD",
            confidence: 0.98,
            sources: ["REGEX"],
            bbox: { x: 60, y: 50, width: 100, height: 30 },
            action: "BLACKOUT"
        };
        const merged = BBoxMerger.fuseDetections([maskDet, blackoutDet]);
        expect(merged.length).toBe(1);
        expect(merged[0].action).toBe("BLACKOUT"); // Strongest action wins
    });
    it("should handle nested boxes gracefully", () => {
        const outer = {
            id: "outer",
            type: "CREDIT_CARD",
            confidence: 0.9,
            sources: ["DOM"],
            bbox: { x: 0, y: 0, width: 300, height: 200 },
            action: "MASK"
        };
        const inner = {
            id: "inner",
            type: "CVV",
            confidence: 0.95,
            sources: ["REGEX"],
            bbox: { x: 50, y: 50, width: 50, height: 30 },
            action: "MASK"
        };
        const merged = BBoxMerger.fuseDetections([outer, inner]);
        expect(merged.length).toBe(1);
        expect(merged[0].bbox.width).toBe(300);
        expect(merged[0].bbox.height).toBe(200);
    });
});
