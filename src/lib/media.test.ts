import { describe, expect, it } from "vitest";
import { calculateCoverCrop, normalizePhone, whatsappLink } from "./media";
describe("Nigerian contact helpers", () => {
  it("normalizes a local Nigerian mobile number", () =>
    expect(normalizePhone("0801 234 5678")).toBe("2348012345678"));
  it("preserves an international Nigerian number", () =>
    expect(normalizePhone("+234 801 234 5678")).toBe("2348012345678"));
  it("encodes the visitor and gift in the WhatsApp handoff", () => {
    const link = whatsappLink("08012345678", "Sarah", "AirPods Pro");
    expect(link).toContain("https://wa.me/2348012345678");
    expect(decodeURIComponent(link)).toContain("Sarah");
    expect(decodeURIComponent(link)).toContain("AirPods Pro");
  });
});

describe("photo framing", () => {
  it("moves a landscape photo across a portrait cover without exposing gaps", () => {
    const left = calculateCoverCrop(2000, 1000, 1200, 1500, {
      x: 0,
      y: 50,
      zoom: 1,
    });
    const right = calculateCoverCrop(2000, 1000, 1200, 1500, {
      x: 100,
      y: 50,
      zoom: 1,
    });
    expect(left).toEqual({ x: 0, y: 0, width: 800, height: 1000 });
    expect(right.x).toBe(1200);
  });

  it("uses zoom to tighten the crop around a face", () => {
    const crop = calculateCoverCrop(2000, 1000, 1200, 1500, {
      x: 50,
      y: 100,
      zoom: 2,
    });
    expect(crop).toEqual({ x: 800, y: 500, width: 400, height: 500 });
  });
});
