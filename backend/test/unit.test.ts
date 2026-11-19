import { describe, expect, it } from "vitest";
import { OAuth2Client } from "google-auth-library";
import { buildSections, scoreCampaign } from "../src/lib/discovery";
import { levelForXp } from "../src/lib/gamification";
import { parseJarUrl } from "../src/lib/monobank";
import { sniffMime } from "../src/lib/storage";
import { slugify } from "../src/lib/util";

describe("parseJarUrl", () => {
  it("accepts official jar links and normalises them", () => {
    expect(parseJarUrl("https://send.monobank.ua/jar/2ABCdEfGhJ")).toEqual({ ok: true, jarId: "2ABCdEfGhJ", url: "https://send.monobank.ua/jar/2ABCdEfGhJ" });
    expect(parseJarUrl("send.monobank.ua/jar/2ABCdEfGhJ/")).toMatchObject({ ok: true, url: "https://send.monobank.ua/jar/2ABCdEfGhJ" });
    expect(parseJarUrl("https://send.monobank.ua/jar/2ABCdEfGhJ?t=1")).toMatchObject({ ok: true, url: "https://send.monobank.ua/jar/2ABCdEfGhJ" });
  });
  it("rejects look-alike and unsafe links", () => {
    for (const bad of [
      "",
      "https://send.monobank.ua.evil.com/jar/2ABCdEfGhJ",
      "https://evil.com/send.monobank.ua/jar/2ABCdEfGhJ",
      "javascript:alert(1)",
      "https://send.monobank.ua/jar/",
      "https://send.monobank.ua/jar/abc/def",
      "https://user:pass@send.monobank.ua/jar/2ABCdEfGhJ",
      "https://send.monobank.ua/jar/<script>",
    ])
      expect(parseJarUrl(bad).ok).toBe(false);
  });
});

describe("levels", () => {
  it("maps XP to the five levels", () => {
    expect(levelForXp(0).key).toBe("explorer");
    expect(levelForXp(100).key).toBe("supporter");
    expect(levelForXp(299).key).toBe("supporter");
    expect(levelForXp(300).key).toBe("advocate");
    expect(levelForXp(700).key).toBe("community_builder");
    expect(levelForXp(5000).key).toBe("impact_leader");
    expect(levelForXp(5000).next).toBeNull();
    expect(levelForXp(200).progress).toBeCloseTo(0.5);
  });
});

describe("fair discovery", () => {
  const now = Date.UTC(2026, 0, 15);
  const base = { category: "army", goalAmount: 1000, raisedAmount: 0, deadline: null, urgent: false, purposeReviewedAt: 1, destinationVerifiedAt: null, status: "active", organizerVerified: false };
  it("boosts new, low-exposure campaigns over popular old ones", () => {
    const fresh = scoreCampaign({ ...base, id: "a", publishedAt: now - 86400000, viewCount: 3 }, { now, interests: [] });
    const popular = scoreCampaign({ ...base, id: "b", publishedAt: now - 30 * 86400000, viewCount: 5000, raisedAmount: 300 }, { now, interests: [] });
    expect(fresh.score).toBeGreaterThan(popular.score);
  });
  it("builds homepage sections", () => {
    const list = [
      { ...base, id: "n", publishedAt: now - 1000, viewCount: 1 },
      { ...base, id: "x", publishedAt: now - 9e8, viewCount: 400, raisedAmount: 900 },
    ];
    const s = buildSections(list, { now, interests: [] });
    expect(s.fresh[0].id).toBe("n");
    expect(s.attention.map((c) => c.id)).toContain("n");
    expect(s.almost.map((c) => c.id)).toEqual(["x"]);
  });
});

describe("uploads", () => {
  it("sniffs file types by magic bytes", () => {
    expect(sniffMime(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
    expect(sniffMime(new TextEncoder().encode("%PDF-1.7"))).toBe("application/pdf");
    expect(sniffMime(new TextEncoder().encode("<svg onload=alert(1)>"))).toBeNull();
  });
});

describe("slugify", () => {
  it("transliterates Ukrainian", () => {
    expect(slugify("Генератор для лікарні")).toBe("henerator-dlia-likarni");
  });
});

describe("google auth", () => {
  it("verifies and rejects malformed google tokens", async () => {
    const client = new OAuth2Client("994822121085-m28q8e8mlvb1vudambms6ejlr3934l5o.apps.googleusercontent.com");
    await expect(
      client.verifyIdToken({
        idToken: "invalid-token-header.invalid-payload.invalid-sig",
        audience: "994822121085-m28q8e8mlvb1vudambms6ejlr3934l5o.apps.googleusercontent.com",
      })
    ).rejects.toThrow();
  });
});
