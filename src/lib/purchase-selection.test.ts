import { describe, expect, it } from "vitest";
import { readStarsAmount, safeReturnPath, signInUrl, starsPurchaseUrl } from "./purchase-selection";

describe("chosen Stars packages", () => {
  it("preserves the homepage 50 Stars choice instead of changing it to 100", () => {
    const url = new URL(starsPurchaseUrl(50), "https://store.invalid");
    expect(readStarsAmount(url.searchParams.get("amount"))).toBe(50);
  });
  it("preserves each available homepage amount", () => {
    for (const amount of [50, 100, 250, 500, 1000]) {
      expect(readStarsAmount(String(amount))).toBe(amount);
    }
  });
  it("preserves a selected package through sign-in", () => {
    const auth = new URL(signInUrl(starsPurchaseUrl(50)), "https://store.invalid");
    expect(safeReturnPath(auth.searchParams.get("next"))).toBe("/stars?amount=50");
  });
  it("rejects external or unsafe return addresses", () => {
    for (const path of ["https://example.org", "//example.org", "/\\example.org", "/auth", "/admin", "/\nexample.org"]) expect(safeReturnPath(path)).toBe("/profile");
  });
  it("rejects malformed, fractional and below-minimum selections", () => {
    for (const amount of ["49", "-50", "50.5", "Infinity", "1e3", "9007199254740992"]) expect(readStarsAmount(amount)).toBe(100);
  });
});