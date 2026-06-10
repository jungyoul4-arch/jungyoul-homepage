import { describe, it, expect } from "vitest";
import {
  THUMB_ASPECTS,
  aspectMatches,
  coverCropRect,
} from "../image-crop";

const R169 = THUMB_ASPECTS["16:9"];

describe("THUMB_ASPECTS", () => {
  it("16:9 비율 값이 정확하다 (화이트리스트 단일 소스)", () => {
    expect(R169).toBeCloseTo(16 / 9, 10);
    expect(Object.keys(THUMB_ASPECTS)).toEqual(["16:9"]);
  });
});

describe("aspectMatches", () => {
  it("정확히 일치하면 true", () => {
    expect(aspectMatches(1920, 1080, R169)).toBe(true);
    expect(aspectMatches(1280, 720, R169)).toBe(true);
  });

  it("1% 이내 오차는 일치로 본다 (epsilon 기본값)", () => {
    // 1921×1080 → 비율 오차 ≈ 0.05%
    expect(aspectMatches(1921, 1080, R169)).toBe(true);
  });

  it("1% 를 넘는 오차는 불일치", () => {
    expect(aspectMatches(1500, 1000, R169)).toBe(false); // 3:2
    expect(aspectMatches(1080, 1920, R169)).toBe(false); // 세로
  });

  it("커스텀 epsilon 을 존중한다", () => {
    expect(aspectMatches(1500, 1000, R169, 0.2)).toBe(true);
  });

  it("0/음수/비유한 치수는 false", () => {
    expect(aspectMatches(0, 1080, R169)).toBe(false);
    expect(aspectMatches(1920, 0, R169)).toBe(false);
    expect(aspectMatches(-100, 100, R169)).toBe(false);
    expect(aspectMatches(Number.NaN, 100, R169)).toBe(false);
    expect(aspectMatches(Infinity, 100, R169)).toBe(false);
  });
});

describe("coverCropRect", () => {
  it("원본이 더 옆으로 길면 좌우를 잘라낸다", () => {
    const r = coverCropRect(4000, 1000, R169);
    expect(r.sh).toBe(1000);
    expect(r.sw).toBe(Math.round(1000 * R169)); // 1778
    expect(r.sx).toBe(Math.round((4000 - r.sw) / 2)); // 1111
    expect(r.sy).toBe(0);
    // 크롭 결과 긴 변 1778 ≤ 1920 → 축소 없음
    expect(r.outW).toBe(r.sw);
    expect(r.outW / r.outH).toBeCloseTo(R169, 2);
  });

  it("원본이 더 세로로 길면 위아래를 잘라낸다", () => {
    const r = coverCropRect(1080, 1920, R169);
    expect(r.sw).toBe(1080);
    expect(r.sh).toBe(Math.round(1080 / R169)); // 608
    expect(r.sx).toBe(0);
    expect(r.sy).toBe(Math.round((1920 - r.sh) / 2)); // 656
    expect(r.outW).toBe(1080);
    expect(r.outH).toBe(Math.round(1080 / R169));
  });

  it("정확히 16:9 원본은 항등 크롭", () => {
    const r = coverCropRect(1920, 1080, R169);
    expect(r).toEqual({ sx: 0, sy: 0, sw: 1920, sh: 1080, outW: 1920, outH: 1080 });
  });

  it("maxEdge 를 넘으면 출력을 캡한다 (16:9 → 1920×1080)", () => {
    const r = coverCropRect(4000, 2250, R169); // 정확히 16:9, 단지 큼
    expect(r.sw).toBe(4000);
    expect(r.sh).toBe(2250);
    expect(r.outW).toBe(1920);
    expect(r.outH).toBe(1080);
  });

  it("크롭 후에도 maxEdge 캡이 적용된다 (초광폭 원본)", () => {
    const r = coverCropRect(3840, 1000, R169);
    expect(r.sh).toBe(1000);
    expect(r.sw).toBe(Math.round(1000 * R169)); // 1778 ≤ 1920 → 캡 미발동
    expect(r.outW).toBe(r.sw);

    const big = coverCropRect(8000, 3000, R169); // 크롭 폭 5333 > 1920
    expect(big.outW).toBe(1920);
    expect(big.outH).toBe(1080);
  });

  it("작은 원본은 업스케일하지 않는다", () => {
    const r = coverCropRect(320, 100, R169);
    expect(r.sh).toBe(100);
    expect(r.sw).toBe(Math.round(100 * R169)); // 178
    expect(r.outW).toBe(r.sw); // 1920 으로 키우지 않음
    expect(r.outW).toBeLessThanOrEqual(320);
  });

  it("커스텀 maxEdge 를 존중한다", () => {
    const r = coverCropRect(4000, 2250, R169, 640);
    expect(r.outW).toBe(640);
    expect(r.outH).toBe(360);
  });

  it("퇴화 입력에서도 출력이 1 이상이고 NaN 이 없다", () => {
    for (const [w, h] of [
      [1, 1],
      [10000, 10],
      [10, 10000],
      [1, 1000],
    ] as const) {
      const r = coverCropRect(w, h, R169);
      for (const v of [r.sw, r.sh, r.outW, r.outH]) {
        expect(Number.isFinite(v)).toBe(true);
        expect(v).toBeGreaterThanOrEqual(1);
      }
      expect(r.sx).toBeGreaterThanOrEqual(0);
      expect(r.sy).toBeGreaterThanOrEqual(0);
      // 소스 사각형이 원본을 벗어나지 않는다
      expect(r.sx + r.sw).toBeLessThanOrEqual(w + 1); // 반올림 1px 여유
      expect(r.sy + r.sh).toBeLessThanOrEqual(h + 1);
    }
  });
});
