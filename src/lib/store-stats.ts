export type StoreStats = {
  registered_users: number;
  approved_orders: number;
  stars_packages: number;
  premium_plans: number;
};

export const parseStoreStats = (value: unknown): StoreStats => {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid statistics");
  const record = value as Record<string, unknown>;
  const keys = ["registered_users", "approved_orders", "stars_packages", "premium_plans"] as const;
  for (const key of keys) {
    if (typeof record[key] !== "number" || !Number.isSafeInteger(record[key]) || Number(record[key]) < 0) throw new Error("Invalid statistics");
  }
  return {
    registered_users: Number(record.registered_users),
    approved_orders: Number(record.approved_orders),
    stars_packages: Number(record.stars_packages),
    premium_plans: Number(record.premium_plans),
  };
};