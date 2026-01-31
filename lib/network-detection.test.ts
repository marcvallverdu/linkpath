import { describe, expect, it } from "vitest";
import { detectNetwork } from "./network-detection";

describe("detectNetwork", () => {
  it("detects Awin", () => {
    expect(detectNetwork("https://www.awin1.com/cread.php?awinmid=123"))
      .toBe("awin");
    expect(detectNetwork("https://www.awltovhc.com/clk/12345"))
      .toBe("awin");
    expect(detectNetwork("https://zenaps.com/track?mid=123"))
      .toBe("awin");
  });

  it("detects CJ", () => {
    expect(detectNetwork("https://www.dpbolvw.net/click-123"))
      .toBe("cj");
    expect(detectNetwork("https://jdoqocy.com/track?sid=abc"))
      .toBe("cj");
    expect(detectNetwork("https://kqzyfj.com/click-456"))
      .toBe("cj");
  });

  it("detects Rakuten", () => {
    expect(detectNetwork("https://click.linksynergy.com/deeplink?id=123"))
      .toBe("rakuten");
    expect(detectNetwork("https://linksynergy.walmart.com/track?u=1"))
      .toBe("rakuten");
    expect(detectNetwork("https://click.linksynergy.com/fs-bin/click?id=abc"))
      .toBe("rakuten");
  });

  it("detects Impact", () => {
    expect(detectNetwork("https://impact.com/track?id=123"))
      .toBe("impact");
    expect(detectNetwork("https://mybrand.sjv.io/c/123"))
      .toBe("impact");
    expect(detectNetwork("https://partner.evyy.net/c/456"))
      .toBe("impact");
  });

  it("detects ShareASale", () => {
    expect(detectNetwork("https://www.shareasale.com/r.cfm?b=123"))
      .toBe("shareasale");
    expect(detectNetwork("https://shrsl.com/abcd"))
      .toBe("shareasale");
    expect(detectNetwork("https://shareasale.com/track?ref=1"))
      .toBe("shareasale");
  });

  it("detects Amazon", () => {
    expect(
      detectNetwork("https://www.amazon.com/dp/B000?tag=affiliate-20"),
    ).toBe("amazon");
    expect(
      detectNetwork("https://www.amazon.co.uk/product?tag=affiliate-21"),
    ).toBe("amazon");
    expect(detectNetwork("https://amzn.to/3xyz"))
      .toBe("amazon");
  });

  it("returns unknown when no pattern matches", () => {
    expect(detectNetwork("https://example.com/landing"))
      .toBe("unknown");
    expect(detectNetwork("https://tracking.example.net/click"))
      .toBe("unknown");
    expect(detectNetwork("https://news.site/path?param=1"))
      .toBe("unknown");
  });
});
