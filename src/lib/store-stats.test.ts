import { describe, expect, it } from "vitest";
import { parseStoreStats } from "./store-stats";

describe("real storefront statistics", () => {
  it("displays exact recorded totals without adding invented counts", () => {
    expect(parseStoreStats({ registered_users: 2, approved_orders: 3, stars_packages: 7, premium_plans: 3 })).toEqual({ registered_users: 2, approved_orders: 3, stars_packages: 7, premium_plans: 3 });
  });
  it("keeps real zero totals instead of substituting sample numbers", () => {
    expect(parseStoreStats({ registered_users: 0, approved_orders: 0, stars_packages: 0, premium_plans: 0 }).registered_users).toBe(0);
  });
  it("does not turn missing statistics into fake zeros", () => {
    expect(() => parseStoreStats(null)).toThrow();
    expect(() => parseStoreStats({ registered_users: 12000 })).toThrow();
  });
});